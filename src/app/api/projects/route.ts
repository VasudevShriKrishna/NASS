import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /projects — project/site materials planning (M14): demand vs stock vs in-transit.
 *  Planned requirement ≠ stock fact; in-transit ≠ on-site inventory. */
export async function GET() {
  const [projects, requirements, legalEntities, evidences] = await Promise.all([
    db.project.findMany({
      include: {
        purchaseRequests: { select: { ref: true, status: true } },
        purchaseOrders: { select: { ref: true, status: true, totalAmount: true, currency: true } },
        legalEntity: { select: { code: true, name: true, role: true } },
      },
      orderBy: { code: "asc" },
    }),
    db.materialRequirement.findMany({
      include: {
        project: { select: { code: true, name: true, site: true } },
        material: {
          select: { sku: true, name: true, uom: true, criticality: true, category: true },
        },
      },
      orderBy: { requiredOnSite: "asc" },
    }),
    db.legalEntity.findMany({ orderBy: { code: "asc" } }),
    db.sourceEvidence.findMany({ where: { entityType: "project" } }),
  ]);

  const lots = await db.inventoryLot.findMany({ include: { material: { select: { sku: true } } } });
  const shipments = await db.shipment.findMany({
    select: { ref: true, status: true, displayEta: true, freshness: true, poId: true, vesselName: true, carrier: true },
  });
  const pos = await db.purchaseOrder.findMany({ select: { id: true, ref: true, projectId: true } });

  const enriched = requirements.map((r) => {
    const stockAvailable = lots
      .filter((l) => l.material.sku === r.material.sku && l.status === "AVAILABLE")
      .reduce((a, l) => a + l.quantity, 0);
    const inTransit = lots
      .filter((l) => l.material.sku === r.material.sku && l.status === "IN_TRANSIT")
      .reduce((a, l) => a + l.quantity, 0);
    const projectPo = pos.find((p) => p.projectId === r.projectId);
    const linkedShipment = projectPo ? shipments.find((s) => s.poId === projectPo.id) ?? null : null;
    const gap = stockAvailable - r.quantity;
    return { ...r, stockAvailable, inTransit, gap, linkedShipment };
  });

  // Attach evidence to projects
  const projectsWithEvidence = projects.map((p) => {
    const ev = evidences.filter((e) => e.entityId === p.id || e.entityRef === p.code);
    return { ...p, evidences: ev };
  });

  return ok({
    projects: projectsWithEvidence,
    requirements: enriched,
    businessUnits: legalEntities,
  });
}
