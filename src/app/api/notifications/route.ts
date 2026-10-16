import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /notifications — communication orchestration (M19) with delivery states + idempotency. */
export async function GET() {
  const notifications = await db.notification.findMany({
    orderBy: { at: "desc" },
    include: { case: { select: { ref: true, title: true } } },
  });
  return ok(notifications);
}
