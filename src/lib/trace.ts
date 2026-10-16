import { db } from "@/lib/db";
import { lookupPort, portCountry } from "@/lib/geo";
import { resolveMaritimeRoute, viaFromLegs, isBahrainDestination } from "@/lib/maritime-routes";
import { toUsd, FX_RATES_AS_OF, FX_SOURCE } from "@/lib/fx";
import type { LiveStatus, TraceShip, TraceSnapshot, TraceTotals, TraceMilestone } from "@/lib/trace-types";

/* Live Traceability snapshot builder (server-side).
 * ONE authoritative calculation drives header counters, table, map markers,
 * legend, filters and the selected-shipment panel (Phase 4).
 * - Destination is Bahrain-only; nothing silently substitutes another country.
 * - Import values are normalized to USD with documented FX (Phase 9).
 * - Quantities keep dispatched / in-transit / received separate (Phase 5/9).  */

const HOUR = 3_600_000;

function nextTopOfHour(now: Date): Date {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  return new Date(d.getTime() + HOUR);
}

function deriveLiveStatus(s: {
  status: string;
  customsStatus: string | null;
  carrierEta: Date | null;
  supplierPromisedEta: Date | null;
  actualArrival: Date | null;
  freshness: string;
}): LiveStatus {
  if (s.actualArrival || ["ARRIVED", "DELIVERED", "PARTIALLY_DELIVERED"].includes(s.status)) return "ARRIVED";
  if (s.status === "CUSTOMS_HOLD" || (s.customsStatus ?? "").toLowerCase().startsWith("held")) return "CUSTOMS_HOLD";
  if (s.carrierEta && s.supplierPromisedEta && +s.carrierEta - +s.supplierPromisedEta > 36 * HOUR) return "DELAYED";
  if (["PLANNED", "BOOKED", "READY"].includes(s.status)) return "BOOKED";
  if (s.status === "AT_TRANSIT_POINT") return "AT_PORT";
  if (s.status === "UNKNOWN" || s.freshness === "unavailable") return "UNKNOWN";
  return "IN_TRANSIT";
}

function deriveDeliveryState(s: { status: string }, receivedQty: number, dispatchedQty: number): TraceShip["deliveryState"] {
  if (dispatchedQty <= 0) return "UNKNOWN";
  if (receivedQty >= dispatchedQty) return "RECEIVED";
  if (receivedQty > 0 || s.status === "PARTIALLY_DELIVERED") return "PARTIALLY_RECEIVED";
  return "NOT_DELIVERED";
}

export async function buildTraceSnapshot(): Promise<TraceSnapshot> {
  const now = new Date();

  const [shipments, lots, evidences, receipts] = await Promise.all([
    db.shipment.findMany({
      orderBy: { ref: "asc" },
      include: {
        po: { include: { lines: { include: { material: true } }, contracts: true, project: true, supplier: true } },
        supplier: true,
        project: true,
        bols: { include: { reconciliations: true } },
        exceptionCases: true,
        milestones: { orderBy: { eventTime: "asc" } },
        legs: { orderBy: { seq: "asc" } },
        poLines: { include: { material: true } },
        containers: true,
      },
    }),
    db.inventoryLot.findMany({
      where: { shipmentId: { not: null } },
      include: { warehouse: true, material: true },
    }),
    db.sourceEvidence.findMany({ orderBy: { receivedAt: "desc" }, take: 200 }),
    db.goodsReceipt.findMany({ where: { shipmentId: { not: null } }, include: { material: true } }),
  ]);

  // material requirements for "where to use" (per project + material)
  const projectIds = [...new Set(shipments.map((s) => s.projectId).filter(Boolean))] as string[];
  const reqs = projectIds.length
    ? await db.materialRequirement.findMany({ where: { projectId: { in: projectIds } }, include: { material: true, project: true } })
    : [];
  const reqKey = (projectId: string, materialId: string) => `${projectId}:${materialId}`;
  const reqMap = new Map(reqs.map((r) => [reqKey(r.projectId, r.materialId), r]));

  // risk signals on shipments + related suppliers
  const refs = shipments.map((s) => s.ref);
  const supplierIds = [...new Set(shipments.map((s) => s.supplierId).filter(Boolean))] as string[];
  const risks = await db.riskSignal.findMany({
    where: {
      suppressed: false,
      OR: [
        { entityType: "shipment", entityRef: { in: refs } },
        { supplierId: { in: supplierIds }, entityType: { not: "shipment" } },
      ],
    },
    orderBy: { calculatedAt: "desc" },
  });

  const evByRef = new Map<string, (typeof evidences)[number] & { entityRef: string }>();
  for (const e of evidences) {
    const r = e.entityRef;
    if (r && !evByRef.has(r)) evByRef.set(r, { ...e, entityRef: r });
  }

  const ships: TraceShip[] = shipments.map((s) => {
    const liveStatus = deriveLiveStatus(s);
    const from = lookupPort(s.originPort);
    // Phase 1.2/1.3: NO fallback substitution. Unknown destination stays unknown.
    const to = lookupPort(s.destinationPort);
    const destLabel = s.destinationPort ?? "—";

    /* ── Route resolution: mode-aware maritime corridor, never interpolation ── */
    const via = viaFromLegs(s.legs.map((l) => ({ mode: l.mode, fromPoint: l.fromPoint, toPoint: l.toPoint })));
    const resolved = resolveMaritimeRoute(s.originPort, s.destinationPort, s.mode, via);

    // voyage window: first milestone (or created) → actual arrival or display ETA
    const ms = s.milestones;
    const start = ms.length ? +new Date(ms[0].eventTime) : +s.created;
    const end = s.actualArrival ? +s.actualArrival : s.displayEta ? +s.displayEta : null;
    let progress = 0;
    if (liveStatus === "ARRIVED") progress = 1;
    else if (liveStatus === "BOOKED" || !end) progress = 0;
    else progress = Math.min(1, Math.max(0, (+now - start) / Math.max(1, end - start)));

    // distance-based speed along the validated corridor (not a chord guess)
    const voyageHours = end ? Math.max(1, (end - start) / HOUR) : 0;
    let speedKn: number | null = null;
    if (resolved.route && voyageHours > 0 && liveStatus !== "ARRIVED" && liveStatus !== "BOOKED") {
      speedKn = Math.round((resolved.route.distanceNm / voyageHours) * 10) / 10;
    }

    // materials + import value from THE SHIPMENT'S ALLOCATED PO LINES (Phase 9:
    // no double counting when several shipments share one PO)
    const allocatedLines = s.poLines; // Phase 9: shipment-allocated lines only — no whole-PO fallback
    const currency = s.po?.currency ?? "USD";
    const materials = allocatedLines.map((l) => {
      const mr = s.projectId && l.materialId ? reqMap.get(reqKey(s.projectId!, l.materialId)) : undefined;
      return {
        sku: l.material.sku,
        name: l.material.name,
        category: l.material.category,
        criticality: l.material.criticality,
        quantity: l.quantity,
        uom: l.uom,
        unitPrice: l.unitPrice,
        extended: Math.round(l.quantity * l.unitPrice * 100) / 100,
        countryOfOrigin: s.supplier?.country ?? portCountry(s.originPort),
        workPackage: mr?.workPackage ?? null,
      };
    });
    const importValue = Math.round(materials.reduce((a, m) => a + m.extended, 0) * 100) / 100;
    const importValueUsd = toUsd(importValue, currency);

    /* ── Quantities: dispatched / in-transit / received / outstanding (Phase 5/6/9) ── */
    const dispatched = allocatedLines.map((l) => ({ material: l.material.name, uom: l.uom, quantity: l.quantity }));
    const lotRows = lots.filter((l) => l.shipmentId === s.id && l.status === "IN_TRANSIT");
    const inTransit = lotRows.map((l) => ({ material: l.material.name, uom: l.uom, quantity: l.quantity }));
    const grnRows = receipts.filter((g) => g.shipmentId === s.id);
    const received = grnRows.map((g) => ({ material: g.material.name, uom: g.uom, quantity: g.receivedQty, ref: g.ref ?? g.grnNo ?? null, status: g.status }));
    const receivedByMaterial = new Map<string, number>();
    for (const g of grnRows) receivedByMaterial.set(g.materialId, (receivedByMaterial.get(g.materialId) ?? 0) + g.receivedQty);
    const outstanding = allocatedLines.map((l) => ({
      material: l.material.name,
      uom: l.uom,
      quantity: Math.max(0, Math.round((l.quantity - (l.receivedQty ?? (receivedByMaterial.get(l.materialId) ?? 0))) * 100) / 100),
    }));
    const totalDispatched = allocatedLines.reduce((a, l) => a + l.quantity, 0);
    const totalReceived = allocatedLines.reduce((a, l) => a + (l.receivedQty ?? (receivedByMaterial.get(l.materialId) ?? 0)), 0);
    const deliveryState = deriveDeliveryState(s, totalReceived, totalDispatched);

    /* ── Destination validation (Phase 1.3) ─────────────────────────────── */
    const destVerified = Boolean(to) && isBahrainDestination(s.destinationPort);
    const destNote = destVerified
      ? null
      : s.destinationPort
        ? "Destination not verified — no validated Bahrain destination in the record"
        : "Destination not verified — missing destinationPort field";

    // compliance bundle
    const rec = { PASS: 0, WARN: 0, FAIL: 0, NOT_CHECKED: 0 };
    for (const b of s.bols) for (const r of b.reconciliations) rec[r.result as keyof typeof rec] = (rec[r.result as keyof typeof rec] ?? 0) + 1;
    const overallReconciliation = rec.FAIL > 0 ? "FAIL" : rec.WARN > 0 ? "WARN" : rec.PASS > 0 ? "PASS" : "NOT_CHECKED";

    const shipmentRisks = risks.filter(
      (r) => (r.entityType === "shipment" && r.entityRef === s.ref) || (s.supplierId && r.supplierId === s.supplierId && r.entityType !== "shipment")
    );

    const evidence = [
      evByRef.get(s.ref),
      ...s.bols.map((b) => evByRef.get(b.bolNo)),
    ]
      .filter(Boolean)
      .slice(0, 4)
      .map((e) => ({ entityRef: e!.entityRef, sourceSystem: e!.sourceSystem, issuer: e!.issuer ?? "—", label: e!.label }));

    const lot = lots.find((l) => l.shipmentId === s.id);

    const milestones: TraceMilestone[] = ms.map((m) => ({
      code: m.code,
      label: m.label,
      location: m.location,
      eventTime: new Date(m.eventTime).toISOString(),
      receivedAt: new Date(m.receivedAt).toISOString(),
      source: m.source,
      isEstimated: m.isEstimated,
      freshness: m.freshness,
      correctedByEventId: m.correctedByEventId,
      note: m.note,
      quantity: m.quantity,
      uom: m.uom,
    }));

    return {
      ref: s.ref,
      status: s.status,
      liveStatus,
      deliveryState,
      mode: s.mode,
      carrier: s.carrier,
      forwarder: s.forwarder,
      vesselName: s.vesselName,
      vesselVoyage: s.vesselVoyage,
      originPort: s.originPort ?? "—",
      destPort: destLabel,
      originCountry: portCountry(s.originPort),
      destCountry: s.podCountry ?? portCountry(s.destinationPort),
      from: from ? { lat: from.lat, lng: from.lng, label: from.label } : null,
      to: to ? { lat: to.lat, lng: to.lng, label: to.label } : null,
      departure: ms.length ? new Date(ms[0].eventTime).toISOString() : s.created.toISOString(),
      eta: s.displayEta ? s.displayEta.toISOString() : null,
      etaType: s.displayEtaType,
      etaSource: s.displayEtaSource,
      supplierPromisedEta: s.supplierPromisedEta ? s.supplierPromisedEta.toISOString() : null,
      carrierEta: s.carrierEta ? s.carrierEta.toISOString() : null,
      actualArrival: s.actualArrival ? s.actualArrival.toISOString() : null,
      progress: Math.round(progress * 1000) / 1000,
      voyageHours: Math.round(voyageHours),
      speedKn,
      freshness: s.freshness,
      lastEventAt: s.lastEventAt ? s.lastEventAt.toISOString() : null,
      lastEventSource: s.lastEventSource,
      importValue,
      currency,
      importValueUsd,
      materials,
      quantities: { dispatched, inTransit, received, outstanding },
      legs: s.legs.map((l) => ({ seq: l.seq, mode: l.mode, fromPoint: l.fromPoint, toPoint: l.toPoint, status: l.status, carrier: l.carrier })),
      supplier: s.supplier
        ? {
            code: s.supplier.code,
            name: s.supplier.name,
            country: s.supplier.country,
            city: s.supplier.city,
            status: s.supplier.status,
            incoterms: s.supplier.incoterms,
          }
        : null,
      po: s.po
        ? {
            ref: s.po.ref,
            status: s.po.status,
            currency: s.po.currency,
            totalAmount: s.po.totalAmount,
            deliveryTerms: s.po.deliveryTerms,
            deliveryLocation: s.po.deliveryLocation,
            promisedDate: s.po.promisedDate ? s.po.promisedDate.toISOString() : null,
            contracts: s.po.contracts.map((c) => c.ref),
          }
        : null,
      project: s.project ? { code: s.project.code, name: s.project.name, site: s.project.site } : null,
      destinationWarehouse: lot ? { code: lot.warehouse.code, name: lot.warehouse.name, site: lot.warehouse.site } : null,
      compliance: {
        customsStatus: s.customsStatus,
        customsHold: liveStatus === "CUSTOMS_HOLD",
        importFileRef: s.importFileRef,
        bol: s.bols.map((b) => ({ bolNo: b.bolNo, status: b.status, version: b.version, matchStatus: b.matchStatus, active: b.isActive })),
        reconciliation: rec,
        overallReconciliation,
        exceptions: s.exceptionCases.map((c) => ({ ref: c.ref, title: c.title, category: c.category, severity: c.severity, state: c.state })),
        risks: shipmentRisks.slice(0, 5).map((r) => ({ signalCode: r.signalCode, severity: r.severity, fact: r.fact, interpretation: r.interpretation })),
        evidence,
      },
      milestones,
      destVerified,
      destNote,
      routeProvenance: resolved.provenance,
      routeVia: resolved.viaNames.slice(0, 6),
      routeDistanceNm: resolved.route ? resolved.route.distanceNm : null,
    };
  });

  const staleCount = ships.filter((s) => s.freshness === "stale" || s.freshness === "aging").length;

  const totals: TraceTotals = {
    ships: ships.length,
    inTransit: ships.filter((s) => s.liveStatus === "IN_TRANSIT").length,
    atPort: ships.filter((s) => s.liveStatus === "AT_PORT").length,
    customsHold: ships.filter((s) => s.liveStatus === "CUSTOMS_HOLD").length,
    delayed: ships.filter((s) => s.liveStatus === "DELAYED").length,
    arrived: ships.filter((s) => s.liveStatus === "ARRIVED").length,
    booked: ships.filter((s) => s.liveStatus === "BOOKED").length,
    unknown: ships.filter((s) => s.liveStatus === "UNKNOWN").length,
    stale: staleCount,
    importValueUsd: Math.round(ships.reduce((a, s) => a + s.importValueUsd, 0) * 100) / 100,
    currency: "USD",
  };

  return {
    serverTime: now.toISOString(),
    nextUpdateAt: nextTopOfHour(now).toISOString(),
    snapshotHourLabel: `${String(now.getHours()).padStart(2, "0")}:00 block`,
    ships,
    totals,
    destination: {
      country: "Bahrain",
      port: "Khalifa Bin Salman Port (KBSP), Hidd",
      portVerified: true,
      warehouse: "NASS Askar Yard (WH-ASKAR)",
    },
    fx: { asOf: FX_RATES_AS_OF, source: FX_SOURCE },
  };
}
