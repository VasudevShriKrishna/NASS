import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /sourcing — RFQs + quotes (M06): ranks, criteria, deviations, extraction confidence. */
export async function GET() {
  const rfqs = await db.rFQ.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pr: { select: { ref: true, status: true, requester: true } },
      quotes: {
        orderBy: { rank: "asc" },
        include: { supplier: { select: { code: true, name: true, status: true, country: true } } },
      },
    },
  });
  return ok(rfqs);
}
