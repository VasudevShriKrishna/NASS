import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /suppliers — supplier network + published scorecards (M04) + open risk signals. */
export async function GET() {
  const suppliers = await db.supplier.findMany({
    orderBy: { code: "asc" },
    include: {
      scoreSnapshots: { orderBy: { metric: "asc" } },
      riskSignals: { where: { suppressed: false } },
      pos: { select: { ref: true, status: true, promisedDate: true } },
      contracts: { select: { ref: true, status: true, validTo: true } },
      shipments: { select: { ref: true, status: true } },
      exceptionCases: { select: { ref: true, state: true, severity: true, title: true } },
      quotes: { select: { id: true, rank: true, status: true } },
    },
  });
  return ok(suppliers);
}
