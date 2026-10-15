import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /shipments/[ref] — full tracking detail: milestones (event time vs received time),
 *  ETA provenance (all observations retained), vessel ≠ container separation. */
export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const shipment = await db.shipment.findUnique({
    where: { ref },
    include: {
      supplier: true,
      po: { include: { lines: { include: { material: true } } } },
      legs: true,
      containers: true,
      bols: true,
      etaObservations: { orderBy: { calculatedAt: "desc" } },
      milestones: { orderBy: { eventTime: "asc" }, include: { container: true } },
      documents: true,
      exceptionCases: true,
    },
  });
  if (!shipment) return err("NOT_FOUND", `Shipment ${ref} not found`, 404);
  return ok(shipment);
}
