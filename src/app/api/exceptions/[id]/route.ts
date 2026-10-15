import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /exceptions/[id] — full case dossier: events, actions, evidence, linked entities (M22 export). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kase = await db.exceptionCase.findUnique({
    where: { id },
    include: {
      events: { orderBy: { at: "asc" } },
      actions: {
        include: { approvals: { orderBy: { at: "desc" } } },
        orderBy: { createdAt: "asc" },
      },
      supplier: { select: { code: true, name: true, status: true } },
      shipment: { select: { ref: true, status: true, freshness: true, displayEta: true, supplierPromisedEta: true, vesselName: true } },
      bol: { select: { id: true, bolNo: true, version: true, status: true, matchStatus: true, isActive: true } },
      notifications: { orderBy: { at: "desc" } },
    },
  });
  if (!kase) return err("NOT_FOUND", "Case not found", 404);
  const evidence = await db.sourceEvidence.findMany({
    where: { entityId: { in: [kase.entityId ?? "", kase.bolId ?? "", kase.shipmentId ?? ""].filter(Boolean) } },
  });
  return ok({ case: kase, evidence });
}
