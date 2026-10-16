import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /purchase-requests — PR pipeline (M05) with lines + duplicate linkage. */
export async function GET() {
  const prs = await db.purchaseRequest.findMany({
    orderBy: { ref: "asc" },
    include: {
      project: { select: { code: true, name: true } },
      lines: { include: { material: { select: { sku: true, name: true, uom: true, criticality: true } } } },
      rfqs: { select: { ref: true, status: true } },
    },
  });
  return ok(prs);
}
