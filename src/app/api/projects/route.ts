import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 * Project/site materials planning (M14): demand vs stock vs in-transit.
 * Supports optional ?code=PRJ-ALBA-06 or ?projectId=... filtering.
 * Returns consistent JSON response contract with projects, requirements/boqItems, stock, and business units.
 */
export async function GET(req?: Request) {
  try {
    let projectFilter: string | null = null;
    if (req?.url) {
      try {
        const url = new URL(req.url);
        projectFilter =
          url.searchParams.get("code")?.trim() ||
          url.searchParams.get("projectId")?.trim() ||
          url.searchParams.get("project")?.trim() ||
          null;
      } catch {
        projectFilter = null;
      }
    }

    const [projects, requirements, legalEntities, evidences] = await Promise.all([
      db.project.findMany({
        where: projectFilter
          ? {
              OR: [
                { code: projectFilter.toUpperCase() },
                { id: projectFilter },
                { name: { contains: projectFilter } },
              ],
            }
          : undefined,
        include: {
          purchaseRequests: { select: { ref: true, status: true } },
          purchaseOrders: { select: { ref: true, status: true, totalAmount: true, currency: true } },
          workPackages: true,
        },
        orderBy: { code: "asc" },
      }),
      db.materialRequirement.findMany({
        where: projectFilter
          ? {
              project: {
                OR: [
                  { code: projectFilter.toUpperCase() },
                  { id: projectFilter },
                  { name: { contains: projectFilter } },
                ],
              },
            }
          : undefined,
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

    // Build legal entity lookup map by ID and by code
    const legalEntityMap = new Map(legalEntities.map((e) => [e.id, { code: e.code, name: e.name, role: e.role }]));
    const legalEntityCodeMap = new Map(legalEntities.map((e) => [e.code, { code: e.code, name: e.name, role: e.role }]));

    const lots = await db.inventoryLot.findMany({
      include: {
        material: { select: { sku: true, name: true, uom: true, criticality: true } },
        warehouse: { select: { code: true, name: true } },
        project: { select: { code: true, name: true } },
      },
    });

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

    // Attach legalEntity & evidence to projects
    const projectsWithEvidence = projects.map((p) => {
      const ev = evidences.filter((e) => e.entityId === p.id || e.entityRef === p.code);
      const le = p.legalEntityId
        ? legalEntityMap.get(p.legalEntityId) || legalEntityCodeMap.get(p.legalEntityId) || null
        : null;
      return { ...p, legalEntity: le, evidences: ev };
    });

    // If a specific project was requested via query parameter but not found
    if (projectFilter && projects.length === 0) {
      return err("NOT_FOUND", `Project '${projectFilter}' not found in authoritative records`, 404);
    }

    // Filter stock records if a specific project was requested
    const filteredLots = projectFilter
      ? lots.filter((l) => l.project?.code === projectFilter.toUpperCase() || l.projectId === projects[0]?.id)
      : lots;

    return ok({
      success: true,
      projectId: projectFilter || (projectsWithEvidence.length === 1 ? projectsWithEvidence[0].code : undefined),
      projects: projectsWithEvidence,
      requirements: enriched,
      boqItems: enriched, // Alias for BOQ & Stock contract compatibility
      materialDemands: enriched, // Alias for BOQ & Stock contract compatibility
      stockRecords: filteredLots,
      businessUnits: legalEntities,
      metadata: {
        totalProjects: projectsWithEvidence.length,
        totalRequirements: enriched.length,
        boqCount: enriched.length,
        materialDemandCount: enriched.length,
        stockRecordCount: filteredLots.length,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/projects error]", error);
    return err("INTERNAL_SERVER_ERROR", error?.message || "Failed to load project records", 500);
  }
}
