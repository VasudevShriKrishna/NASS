import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Control-tower aggregates (M21). Every tile drills to row-level records. */
export async function GET() {
  const [shipments, exceptions, prs, lots, signals, connectors, bols, assets] = await Promise.all([
    db.shipment.findMany({ select: { id: true, ref: true, status: true, freshness: true, displayEta: true, supplierPromisedEta: true, mode: true, lastEventAt: true, carrierEtaFreshness: true } }),
    db.exceptionCase.findMany({ select: { id: true, ref: true, state: true, severity: true, category: true, title: true, dueDate: true, createdAt: true } }),
    db.purchaseRequest.findMany({ select: { id: true, ref: true, status: true, priority: true } }),
    db.inventoryLot.findMany({ select: { id: true, status: true, quantity: true, uom: true, materialId: true } }),
    db.riskSignal.findMany({ where: { suppressed: false }, orderBy: { calculatedAt: "desc" }, include: { supplier: { select: { code: true, name: true } } } }),
    db.connector.findMany(),
    db.billOfLading.findMany({ select: { id: true, status: true, matchStatus: true, isActive: true } }),
    db.asset.findMany({ select: { id: true, tag: true, condition: true, telemetryStale: true, assetClass: true } }),
  ]);

  const now = Date.now();
  const freshnessCount = {
    fresh: shipments.filter((s) => s.freshness === "fresh").length,
    aging: shipments.filter((s) => s.freshness === "aging").length,
    stale: shipments.filter((s) => s.freshness === "stale").length,
    unavailable: shipments.filter((s) => s.freshness === "unavailable").length,
  };
  const exceptionsByState: Record<string, number> = {};
  for (const e of exceptions) exceptionsByState[e.state] = (exceptionsByState[e.state] ?? 0) + 1;
  const overdueCases = exceptions.filter((e) => !["RESOLVED", "CANCELLED"].includes(e.state) && e.dueDate && e.dueDate.getTime() < now);
  const prByStatus: Record<string, number> = {};
  for (const p of prs) prByStatus[p.status] = (prByStatus[p.status] ?? 0) + 1;
  const stock = {
    available: lots.filter((l) => l.status === "AVAILABLE"),
    reserved: lots.filter((l) => l.status === "RESERVED"),
    quarantined: lots.filter((l) => l.status === "QUARANTINED"),
    damaged: lots.filter((l) => l.status === "DAMAGED"),
    inTransit: lots.filter((l) => l.status === "IN_TRANSIT"),
    inspectionPending: lots.filter((l) => l.status === "INSPECTION_PENDING"),
  };
  const connectorHealth = {
    healthy: connectors.filter((c) => c.status === "HEALTHY").length,
    degraded: connectors.filter((c) => c.status === "DEGRADED").length,
    outage: connectors.filter((c) => c.status === "OUTAGE").length,
    total: connectors.length,
  };
  const bolStats = {
    verified: bols.filter((b) => b.status === "VERIFIED").length,
    needsReview: bols.filter((b) => b.status === "NEEDS_REVIEW").length,
    reconciliationFailed: bols.filter((b) => b.status === "RECONCILIATION_FAILED").length,
    parsed: bols.filter((b) => b.status === "PARSED").length,
    unmatched: bols.filter((b) => b.matchStatus === "UNMATCHED" && b.isActive).length,
  };

  return ok({
    kpis: {
      activeShipments: shipments.filter((s) => !["DELIVERED", "CANCELLED"].includes(s.status)).length,
      freshness: freshnessCount,
      openExceptions: exceptions.filter((e) => !["RESOLVED", "CANCELLED"].includes(e.state)).length,
      overdueCases: overdueCases.map((e) => ({ ref: e.ref, title: e.title, dueDate: e.dueDate })),
      prPipeline: prByStatus,
      exceptionsByState,
      connectorHealth,
      bolStats,
      assetsFault: assets.filter((a) => a.condition === "FAULT").length,
      assetsTelemetryStale: assets.filter((a) => a.telemetryStale).length,
    },
    shipments: shipments.map((s) => ({
      ref: s.ref,
      status: s.status,
      mode: s.mode,
      freshness: s.freshness,
      carrierEtaFreshness: s.carrierEtaFreshness,
      displayEta: s.displayEta,
      supplierPromisedEta: s.supplierPromisedEta,
      etaSlipped: !!(s.displayEta && s.supplierPromisedEta && s.displayEta > s.supplierPromisedEta),
      lastEventAt: s.lastEventAt,
    })),
    exceptions: exceptions
      .filter((e) => !["RESOLVED", "CANCELLED"].includes(e.state))
      .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity)),
    riskSignals: signals,
    stockSummary: Object.fromEntries(
      Object.entries(stock).map(([k, v]) => [k, { lots: v.length, quantity: v.reduce((a, l) => a + l.quantity, 0) }])
    ),
  });
}
