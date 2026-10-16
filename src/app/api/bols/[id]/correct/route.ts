import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, err, corrId } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /bols/[id]/correct — human correction of a critical BOL field (Workflow A step 9).
 * Stores the correction SEPARATELY; extracted value + provenance retained (M09).
 * Records user, timestamp, reason, old/new value + audit event.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { fieldName?: string; correctedValue?: string; correctedBy?: string; reason?: string }
    | null;
  if (!body?.fieldName || body.correctedValue === undefined || !body.correctedBy || !body.reason) {
    return err("BAD_REQUEST", "fieldName, correctedValue, correctedBy and reason are required", 400);
  }
  const field = await db.bOLField.findUnique({ where: { bolId_fieldName: { bolId: id, fieldName: body.fieldName } } });
  if (!field) return err("NOT_FOUND", `Field ${body.fieldName} not found on BOL`, 404);
  const corr = corrId();
  const oldValue = field.correctedValue ?? field.rawValue;
  const updated = await db.bOLField.update({
    where: { id: field.id },
    data: {
      correctedValue: body.correctedValue,
      correctedBy: body.correctedBy,
      correctedAt: new Date(),
      correctionReason: body.reason,
      validationStatus: "PASS",
      validationNote: `Human correction recorded (was: ${field.rawValue ?? "empty"}). Reconciliation re-run required.`,
    },
  });
  await db.auditEvent.create({
    data: {
      actor: body.correctedBy,
      actorType: "USER",
      action: "BOL_FIELD_CORRECTION",
      entityType: "bol_field",
      entityId: field.id,
      entityRef: `${body.fieldName}`,
      previousState: oldValue,
      newState: body.correctedValue,
      diff: JSON.stringify({ from: oldValue, to: body.correctedValue }),
      reason: body.reason,
      correlationId: corr,
      ruleVersion: "BOL_AMENDMENT v1.1",
    },
  });
  await db.caseEvent.create({
    data: {
      caseId: (await db.billOfLading.findUnique({ where: { id }, select: { exceptionCases: { take: 1 } } }))?.exceptionCases[0]?.id ?? "unknown",
      type: "EVIDENCE",
      actor: body.correctedBy,
      actorType: "USER",
      note: `Field ${body.fieldName} corrected: "${oldValue ?? "empty"}" → "${body.correctedValue}". Reason: ${body.reason}`,
    },
  }).catch(() => {});
  return ok({ field: updated, correlation_id: corr });
}
