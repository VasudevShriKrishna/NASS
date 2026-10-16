import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /purchase-orders — PO register (M07) with lines, receipts progress, linked shipments. */
export async function GET() {
  const pos = await db.purchaseOrder.findMany({
    orderBy: { ref: "asc" },
    include: {
      supplier: { select: { code: true, name: true, status: true } },
      project: { select: { code: true, name: true } },
      legalEntity: { select: { code: true, name: true } },
      lines: {
        include: {
          material: { select: { sku: true, name: true, uom: true } },
          receipts: { select: { ref: true, receivedQty: true, status: true, receivedAt: true } },
        },
      },
      contracts: { select: { ref: true, title: true, status: true } },
      shipments: { select: { ref: true, status: true, freshness: true } },
    },
  });
  return ok(pos);
}
