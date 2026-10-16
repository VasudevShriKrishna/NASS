import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /audit — append-only audit trail (M22/M24) with minimum audit event fields. */
export async function GET() {
  const events = await db.auditEvent.findMany({ orderBy: { at: "desc" }, take: 200 });
  return ok(events);
}
