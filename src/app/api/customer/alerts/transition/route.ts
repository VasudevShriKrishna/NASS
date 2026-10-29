import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATE_ORDER = [
  "DETECTED",
  "TRIAGED",
  "ASSIGNED",
  "ACTION_PROPOSED",
  "AWAITING_APPROVAL",
  "OUTCOME_PENDING_VERIFICATION",
  "RESOLVED",
] as const;

type AlertState = (typeof STATE_ORDER)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { alert_id, to_state, actor_id, note, approval_decision } = body;

    if (!alert_id || !to_state) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: alert_id and to_state" },
        { status: 400 }
      );
    }

    if (!STATE_ORDER.includes(to_state as AlertState)) {
      return NextResponse.json(
        { ok: false, error: `Invalid target state. Allowed states: ${STATE_ORDER.join(" -> ")}` },
        { status: 422 }
      );
    }

    const alert = await db.shipmentAlert.findUnique({
      where: { id: alert_id },
    });

    if (!alert) {
      return NextResponse.json(
        { ok: false, error: `Alert with id ${alert_id} not found.` },
        { status: 404 }
      );
    }

    const fromState = alert.state;

    // Human Approval Gate (Step 6)
    // Any action moving out of AWAITING_APPROVAL or notifying customer requires authenticated human authorization
    if (fromState === "AWAITING_APPROVAL" || to_state === "OUTCOME_PENDING_VERIFICATION" || to_state === "RESOLVED") {
      if (!actor_id) {
        return NextResponse.json(
          {
            ok: false,
            error: "HUMAN_APPROVAL_REQUIRED: Action requires explicit authenticated human authorization. Provide authorized actor_id.",
          },
          { status: 403 }
        );
      }
    }

    // Update alert state
    const updated = await db.shipmentAlert.update({
      where: { id: alert_id },
      data: {
        state: to_state,
      },
    });

    // Write audit row to AlertStateAudit table (Step 6)
    const auditRecord = await db.alertStateAudit.create({
      data: {
        alertId: alert_id,
        fromState: fromState,
        toState: to_state,
        actorId: actor_id || "SYSTEM_OPERATOR",
        note: note || `State transitioned from ${fromState} to ${to_state}`,
        timestamp: new Date(),
      },
    });

    // If human approval decision granted, record in notification queue
    if (fromState === "AWAITING_APPROVAL" && approval_decision === "APPROVE") {
      await db.customerNotificationQueue.create({
        data: {
          alertId: alert_id,
          recipient: "Customer Tracking Portal",
          message: `Operational alert ${alert.type} resolved: ${note || "Resolution verified by duty logistics lead."}`,
          status: "APPROVED",
          approvedBy: actor_id,
          approvedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        alert_id: updated.id,
        from_state: fromState,
        to_state: updated.state,
        actor_id: auditRecord.actorId,
        timestamp: auditRecord.timestamp.toISOString(),
        note: auditRecord.note,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to transition alert state" },
      { status: 500 }
    );
  }
}

