import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /contracts — contract register (M07/M08): versions, obligations, expiry alerts.
 *  Summaries are navigational aids — signed documents remain authoritative. */
export async function GET() {
  const contracts = await db.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { code: true, name: true, status: true } },
      po: { select: { ref: true } },
    },
  });
  return ok(contracts);
}
