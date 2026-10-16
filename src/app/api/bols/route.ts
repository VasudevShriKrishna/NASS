import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /bols — BOL workbench (M09): all BOLs with field provenance, reconciliations, versions. */
export async function GET() {
  const bols = await db.billOfLading.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      fields: { orderBy: { fieldName: "asc" } },
      reconciliations: true,
      containers: true,
      documents: true,
      shipment: { select: { ref: true, status: true, freshness: true } },
      exceptionCases: { select: { id: true, ref: true, state: true, severity: true, title: true } },
      supersedes: { select: { bolNo: true, version: true, status: true } },
      supersededBy: { select: { bolNo: true, version: true, status: true } },
    },
  });
  return ok(bols);
}
