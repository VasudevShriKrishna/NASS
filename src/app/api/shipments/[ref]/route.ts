import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /shipments/[ref] — full tracking detail (correction spec Phase 3/5/10).
 *
 * Detail payload contract (extends the M11 route — nothing removed):
 * - containers: containerNo, sizeType, sealNo, packageCount, grossWeightKg,
 *   identityStatus (RESOLVED | UNRESOLVED | MISSING), identitySource, note.
 *   May legitimately be empty (bulk/ROAD consignments — "not applicable",
 *   never fabricated container numbers, Phase 3).
 * - legs: ordered multimodal chain (seq, mode, fromPoint, toPoint, status, carrier).
 * - milestones: ordered by eventTime asc, each carrying eventTime AND receivedAt
 *   (event time ≠ ingestion time, M11 acceptance), source, isEstimated, freshness,
 *   confidence, correctedByEventId, note, quantity + uom when the event carries cargo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const shipment = await db.shipment.findUnique({
    where: { ref },
    include: {
      supplier: true,
      po: { include: { lines: { include: { material: true } } } },
      legs: { orderBy: { seq: "asc" } },
      containers: { orderBy: { containerNo: "asc" } },
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
