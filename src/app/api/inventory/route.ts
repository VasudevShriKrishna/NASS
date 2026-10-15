import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /inventory — warehouses + stock positions (M12).
 *  "available" = on-hand minus reservations and quarantined. In-transit NEVER available. */
export async function GET() {
  const [warehouses, lots, requirements] = await Promise.all([
    db.warehouse.findMany(),
    db.inventoryLot.findMany({
      include: {
        material: { select: { sku: true, name: true, uom: true, criticality: true } },
        warehouse: { select: { code: true, name: true } },
        project: { select: { code: true, name: true } },
      },
      orderBy: [{ materialId: "asc" }, { status: "asc" }],
    }),
    db.materialRequirement.findMany({
      include: {
        project: { select: { code: true, name: true, site: true } },
        material: { select: { sku: true, name: true, uom: true } },
      },
      orderBy: { requiredOnSite: "asc" },
    }),
  ]);
  // Aggregate per material+warehouse: available excludes RESERVED/QUARANTINED/DAMAGED/IN_TRANSIT
  const byMaterial: Record<string, { sku: string; name: string; uom: string; available: number; reserved: number; quarantined: number; damaged: number; inTransit: number; inspectionPending: number }> = {};
  for (const l of lots) {
    const key = `${l.material.sku}`;
    byMaterial[key] ??= { sku: l.material.sku, name: l.material.name, uom: l.material.uom, available: 0, reserved: 0, quarantined: 0, damaged: 0, inTransit: 0, inspectionPending: 0 };
    const bucket =
      l.status === "AVAILABLE" ? "available"
      : l.status === "RESERVED" ? "reserved"
      : l.status === "QUARANTINED" ? "quarantined"
      : l.status === "DAMAGED" ? "damaged"
      : l.status === "IN_TRANSIT" ? "inTransit"
      : "inspectionPending";
    byMaterial[key][bucket] += l.quantity;
  }
  return ok({ warehouses, lots, requirements, byMaterial: Object.values(byMaterial) });
}
