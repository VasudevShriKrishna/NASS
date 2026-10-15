import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /receipts — inbound receiving + QC + discrepancies (M13) incl. dedupe evidence. */
export async function GET() {
  const receipts = await db.goodsReceipt.findMany({
    orderBy: { receivedAt: "desc" },
    include: {
      poLine: { include: { po: { select: { ref: true, supplierId: true } }, material: { select: { sku: true, name: true } } } },
      shipment: { select: { ref: true, status: true } },
      warehouse: { select: { code: true, name: true } },
      material: { select: { sku: true, name: true, uom: true } },
    },
  });
  return ok(receipts);
}
