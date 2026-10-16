import { db } from "@/lib/db";
import { lookupPort, portCountry, haversineKm, clamp01 } from "@/lib/geo";
import type { LiveStatus, TraceShip, TraceSnapshot, TraceTotals } from "@/lib/trace-types";

/* Live Traceability snapshot builder (server-side).
 * One query pass over shipments + procurement + compliance relations,
 * projected into the client-facing TraceSnapshot shape.               */

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
}): LiveStatus {
  if (s.actualArrival || ["ARRIVED", "DELIVERED", "PARTIALLY_DELIVERED"].includes(s.status)) return "ARRIVED";
  if (s.status === "CUSTOMS_HOLD" || (s.customsStatus ?? "").toLowerCase().startsWith("held")) return "CUSTOMS_HOLD";
  if (s.carrierEta && s.supplierPromisedEta && +s.carrierEta - +s.supplierPromisedEta > 36 * HOUR) return "DELAYED";
  if (["PLANNED", "BOOKED", "READY"].includes(s.status)) return "BOOKED";
  if (s.status === "AT_TRANSIT_POINT") return "AT_PORT";
  return "IN_TRANSIT";
}

export async function buildTraceSnapshot(): Promise<TraceSnapshot> {
  const now = new Date();

  const [shipments, lots, evidences] = await Promise.all([
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
      },
    }),
    db.inventoryLot.findMany({
      where: { shipmentId: { not: null } },
      include: { warehouse: true },
    }),
    db.sourceEvidence.findMany({ orderBy: { receivedAt: "desc" }, take: 200 }),
  ]);

  const lotByShipment = new Map<string, (typeof lots)[number]>();
  for (const l of lots) if (l.shipmentId && !lotByShipment.has(l.shipmentId)) lotByShipment.set(l.shipmentId, l);

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
    const to = lookupPort(s.destinationPort) ?? lookupPort("Jebel Ali") /* WH-DIP etc. */;
    const destLabel = s.destinationPort ?? "—";

    // voyage window: first milestone (or created) → actual arrival or display ETA
    const ms = s.milestones;
    const start = ms.length ? +new Date(ms[0].eventTime) : +s.created;
    const end = s.actualArrival ? +s.actualArrival : s.displayEta ? +s.displayEta : null;
    let progress = 0;
    if (liveStatus === "ARRIVED") progress = 1;
    else if (liveStatus === "BOOKED" || !end) progress = 0;
    else progress = clamp01((+now - start) / Math.max(1, end - start));

    const voyageHours = end ? Math.max(1, (end - start) / HOUR) : 0;
    let speedKn: number | null = null;
    if (from && to && voyageHours > 0 && liveStatus !== "ARRIVED") {
      speedKn = Math.round(((haversineKm(from.lat, from.lng, to.lat, to.lng) / voyageHours) * 0.539957 + 8) * 10) / 10;
    }

    // materials + import value from PO lines
    const currency = s.po?.currency ?? "USD";
    const materials = (s.po?.lines ?? []).map((l) => {
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

    const lot = lotByShipment.get(s.id);

    return {
      ref: s.ref,
      status: s.status,
      liveStatus,
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
      to: to ? { lat: to.lat, lng: to.lng, label: s.destinationPort?.startsWith("WH") ? "WH-DIP (Dubai)" : to.label } : null,
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
      materials,
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
      milestones: ms.map((m) => ({ code: m.code, label: m.label, location: m.location, eventTime: new Date(m.eventTime).toISOString(), isEstimated: m.isEstimated })),
    };
  });

  const totals: TraceTotals = {
    ships: ships.length,
    inTransit: ships.filter((s) => s.liveStatus === "IN_TRANSIT").length,
    atPort: ships.filter((s) => s.liveStatus === "AT_PORT").length,
    customsHold: ships.filter((s) => s.liveStatus === "CUSTOMS_HOLD").length,
    delayed: ships.filter((s) => s.liveStatus === "DELAYED").length,
    arrived: ships.filter((s) => s.liveStatus === "ARRIVED").length,
    booked: ships.filter((s) => s.liveStatus === "BOOKED").length,
    importValue: Math.round(ships.reduce((a, s) => a + s.importValue, 0) * 100) / 100,
    currency: "USD",
  };

  return {
    serverTime: now.toISOString(),
    nextUpdateAt: nextTopOfHour(now).toISOString(),
    snapshotHourLabel: `${String(now.getHours()).padStart(2, "0")}:00 block`,
    ships,
    totals,
  };
}
