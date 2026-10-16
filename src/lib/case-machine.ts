import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err, corrId } from "@/lib/api";
import { CASE_STATES, canTransition, type CaseState } from "@/lib/case-states";

/**
 * Closed-loop exception state machine (M17):
 * DETECTED → TRIAGED → ASSIGNED → INVESTIGATING → ACTION_PROPOSED →
 * AWAITING_APPROVAL → ACTION_SUBMITTED → OUTCOME_PENDING_VERIFICATION → RESOLVED | CANCELLED
 * Reopen allowed from RESOLVED on regression. Every transition is logged (CaseEvent + AuditEvent).
 *
 * The pure constants (CASE_STATES / TRANSITIONS / canTransition / CaseState) live in
 * src/lib/case-states.ts so client components can import them without pulling in db.
 */
export { CASE_STATES, TRANSITIONS, canTransition } from "@/lib/case-states";
export type { CaseState } from "@/lib/case-states";

export async function transitionCase(
  caseId: string,
  toState: CaseState,
  actor: string,
  actorType: string,
  note: string | null
) {
  const kase = await db.exceptionCase.findUnique({ where: { id: caseId } });
  if (!kase) return err("CASE_NOT_FOUND", "Case not found", 404);
  const from = kase.state as CaseState;
  if (from === toState) return err("INVALID_TRANSITION", `Case already in state ${toState}`, 409);
  if (!canTransition(from, toState)) {
    return err(
      "INVALID_TRANSITION",
      `Transition ${from} → ${toState} is not permitted by the closed-loop state machine (M17).`,
      422
    );
  }
  const isReopen = from === "RESOLVED" && toState === "INVESTIGATING";
  const closing = toState === "RESOLVED" || toState === "CANCELLED";
  if (toState === "RESOLVED" && !note) {
    return err("CLOSURE_EVIDENCE_REQUIRED", "A case can only reach RESOLVED with verified closure evidence/proof (M17).", 422);
  }
  const corr = corrId();
  const updated = await db.exceptionCase.update({
    where: { id: caseId },
    data: {
      state: toState,
      reopenReason: isReopen ? note : kase.reopenReason,
      closedAt: toState === "RESOLVED" || toState === "CANCELLED" ? new Date() : null,
      closureProof: toState === "RESOLVED" ? note : kase.closureProof,
      resolutionCode:
        toState === "CANCELLED"
          ? kase.resolutionCode ?? "CANCELLED_MANUAL"
          : kase.resolutionCode,
    },
  });
  await db.caseEvent.create({
    data: {
      caseId,
      type: isReopen ? "STATE_TRANSITION" : "STATE_TRANSITION",
      fromState: from,
      toState,
      actor,
      actorType,
      note: isReopen ? `REOPENED: ${note}` : note,
    },
  });
  await db.auditEvent.create({
    data: {
      actor,
      actorType,
      action: isReopen ? "CASE_REOPENED" : closing ? "CASE_CLOSED" : "CASE_TRANSITION",
      entityType: "exception_case",
      entityId: caseId,
      entityRef: kase.ref,
      previousState: from,
      newState: toState,
      diff: JSON.stringify({ from, to: toState }),
      reason: note,
      correlationId: corr,
      ruleVersion: kase.ruleVersion,
    },
  });
  return ok({ case: updated, transition: { from, to: toState }, correlation_id: corr });
}

/** Helper for route handlers that mutate cases from a NextRequest. */
export async function readTransitionBody(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { toState?: CaseState; actor?: string; note?: string }
    | null;
  if (!body?.toState || !body.actor) {
    return { error: err("BAD_REQUEST", "toState and actor are required", 400) } as const;
  }
  if (!(CASE_STATES as readonly string[]).includes(body.toState)) {
    return { error: err("BAD_REQUEST", `Unknown state ${body.toState}`, 400) } as const;
  }
  return { body: { ...body, toState: body.toState as CaseState } } as const;
}
