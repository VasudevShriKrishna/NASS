import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err, corrId } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /actions/[id]/decide — approval gateway (M18).
 * APPROVED → AUTHORIZED → ACTION_SUBMITTED (idempotency key; ack + pending verification).
 * REJECTED → CANCELLED with reason. LLM output is a proposal; only this gateway executes.
 * High-risk actions require the approval record — no approval, no execution.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { decision?: "APPROVED" | "REJECTED"; approver?: string; role?: string; comment?: string }
    | null;
  if (!body?.decision || !body.approver) return err("BAD_REQUEST", "decision and approver are required", 400);
  const action = await db.actionCommand.findUnique({ where: { id }, include: { case: true } });
  if (!action) return err("NOT_FOUND", "Action not found", 404);
  if (action.state !== "AWAITING_APPROVAL") {
    return err("INVALID_STATE", `Action is ${action.state}; only AWAITING_APPROVAL actions can be decided`, 409);
  }
  const corr = corrId();
  await db.approval.create({
    data: { actionId: id, approver: body.approver, role: body.role ?? "Approver", decision: body.decision, comment: body.comment ?? null },
  });

  if (body.decision === "REJECTED") {
    const updated = await db.actionCommand.update({
      where: { id },
      data: { state: "CANCELLED", failureReason: body.comment ?? "Rejected by approver" },
    });
    await db.auditEvent.create({
      data: { actor: body.approver, actorType: "USER", action: "APPROVAL_REJECTED", entityType: "action", entityId: id, entityRef: action.ref, previousState: "AWAITING_APPROVAL", newState: "CANCELLED", reason: body.comment ?? null, correlationId: corr, approvalId: id },
    });
    if (action.caseId) {
      await db.caseEvent.create({ data: { caseId: action.caseId, type: "STATE_TRANSITION", fromState: "AWAITING_APPROVAL", toState: "ACTION_PROPOSED", actor: body.approver, actorType: "USER", note: `Action ${action.ref} rejected: ${body.comment ?? "no reason given"}. Back to ACTION_PROPOSED for rework.` } });
    }
    return ok({ action: updated, decision: body.decision, correlation_id: corr });
  }

  // APPROVED — authorized, then submitted through the gateway with idempotency key.
  // Postcondition is PENDING_VERIFICATION: a successful HTTP submission is not completion.
  const updated = await db.actionCommand.update({
    where: { id },
    data: {
      state: "SUBMITTED",
      approvalId: id,
      submittedAt: new Date(),
      ackAt: new Date(),
      result: JSON.stringify({
        gateway: "action-gateway v1.0",
        idempotency_key: action.idempotencyKey,
        submission: "accepted (simulated connector for demo)",
        postcondition: action.postcondition ?? "Target-system read-back scheduled",
      }),
      postcondition: action.postcondition ?? "Target-system read-back scheduled",
    },
  });
  await db.auditEvent.create({
    data: { actor: body.approver, actorType: "USER", action: "APPROVAL_GRANTED", entityType: "action", entityId: id, entityRef: action.ref, previousState: "AWAITING_APPROVAL", newState: "SUBMITTED", reason: body.comment ?? null, correlationId: corr, approvalId: id },
  });
  if (action.caseId) {
    await db.caseEvent.create({ data: { caseId: action.caseId, type: "STATE_TRANSITION", fromState: "AWAITING_APPROVAL", toState: "ACTION_SUBMITTED", actor: body.approver, actorType: "USER", note: `Action ${action.ref} approved and submitted via action gateway (idempotency key ${action.idempotencyKey}). Outcome pending verification.` } });
    await db.exceptionCase.update({ where: { id: action.caseId }, data: { state: "ACTION_SUBMITTED" } }).catch(() => {});
  }
  await db.notification.create({
    data: {
      caseId: action.caseId,
      channel: "IN_APP",
      template: "action_submitted",
      recipient: action.requestedBy,
      audienceType: "INTERNAL",
      state: "DELIVERED",
      idempotencyKey: `ntf-action-${id}-${corr}`,
      urgency: "HIGH",
      note: `${action.ref} submitted; outcome pending verification.`,
    },
  }).catch(() => {});
  return ok({ action: updated, decision: body.decision, correlation_id: corr });
}
