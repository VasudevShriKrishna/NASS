import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /actions — action gateway queue (M18): every command with policy decision + approvals. */
export async function GET() {
  const actions = await db.actionCommand.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      approvals: { orderBy: { at: "desc" } },
      case: { select: { ref: true, title: true, state: true, severity: true } },
    },
  });
  return ok(actions);
}
