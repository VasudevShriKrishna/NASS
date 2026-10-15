import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /shipments — import control tower list (M11). Includes ETA provenance and freshness. */
export async function GET() {
  const shipments = await db.shipment.findMany({
    orderBy: { ref: "asc" },
    include: {
      supplier: { select: { code: true, name: true } },
      po: { select: { ref: true } },
      legs: true,
      containers: true,
      documents: true,
      bols: { select: { id: true, bolNo: true, version: true, isActive: true, status: true } },
      etaObservations: { orderBy: { calculatedAt: "desc" } },
      milestones: { orderBy: { eventTime: "asc" } },
      exceptionCases: { select: { id: true, ref: true, state: true, severity: true, title: true } },
    },
  });
  return ok(shipments);
}
