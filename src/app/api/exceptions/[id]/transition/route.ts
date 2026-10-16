import { NextRequest } from "next/server";
import { readTransitionBody, transitionCase } from "@/lib/case-machine";

export const dynamic = "force-dynamic";

/** POST /exceptions/[id]/transition — advance the closed-loop state machine (M17). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await readTransitionBody(req);
  if ("error" in parsed) return parsed.error;
  const { toState, actor, note } = parsed.body;
  return transitionCase(id, toState, actor ?? "unknown", "USER", note ?? null);
}
