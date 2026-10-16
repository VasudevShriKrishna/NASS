import { db } from "@/lib/db";
import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** /exceptions — closed-loop case queue (M17) with SLA + state distribution. */
export async function GET() {
  const cases = await db.exceptionCase.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      events: { orderBy: { at: "desc" }, take: 1 },
      actions: { select: { id: true, ref: true, state: true, commandType: true } },
    },
  });
  const states: Record<string, number> = {};
  for (const c of cases) states[c.state] = (states[c.state] ?? 0) + 1;
  return ok({ cases, stateCounts: states });
}
