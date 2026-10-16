import { db } from "@/lib/db";
import { ok, err } from "@/lib/api";
import { OPEN_CASE_STATES } from "@/lib/case-states";

export const dynamic = "force-dynamic";

/**
 * GET /decisions — NASS Decision Management payload (PHASE 7 closed loop):
 * Detect → Verify → Assess → Recommend → Assign → Approve → Execute → Verify outcome → Close.
 *
 * One call returns the full decision picture:
 *   queue            — decisions awaiting approval: ActionCommands in AWAITING_APPROVAL
 *                      plus exception cases in AWAITING_APPROVAL whose recommended action
 *                      has no action command currently awaiting approval (deduped).
 *   overdue          — action commands not yet verified/closed whose linked case dueDate
 *                      has passed, plus open exception cases past their dueDate.
 *   openExceptions   — every ExceptionCase not RESOLVED/CANCELLED (owner, due, severity,
 *                      shipment/entity refs, recommendedAction, evidence).
 *   verifiedClosures — RESOLVED cases with closureProof + closedAt + resolutionCode,
 *                      and ActionCommands VERIFIED with postcondition/result.
 *   blockers         — CRITICAL-severity open cases.
 *   stats            — all counts derived from the arrays above (never hard-coded).
 */

/* ── Payload types (mirrored by the Decision Management view) ── */
interface DecisionQueueItem {
  kind: "action" | "case";
  id: string;
  ref: string;
  title: string;
  command: string | null;
  caseRef: string | null;
  caseTitle: string | null;
  severity: string | null;
  state: string;
  riskLevel: string | null;
  policyDecision: string | null;
  owner: string | null;
  due: string | null;
  dueSource: "case" | "none";
  targetRef: string | null;
  entityRef: string | null;
  shipmentRef: string | null;
  recommendation: string | null;
  approvals: { approver: string; role: string; decision: string; at: string }[];
}

interface OverdueItem {
  kind: "action" | "case";
  id: string;
  ref: string;
  title: string;
  state: string;
  severity: string | null;
  owner: string | null;
  due: string;
  overdueByHours: number;
  caseRef: string | null;
  entityRef: string | null;
}

interface OpenExceptionItem {
  id: string;
  ref: string;
  title: string;
  category: string;
  severity: string;
  state: string;
  trigger: string | null;
  entityType: string | null;
  entityRef: string | null;
  shipmentRef: string | null;
  ownerTeam: string | null;
  ownerUser: string | null;
  slaHours: number | null;
  dueDate: string | null;
  recommendedAction: string | null;
  evidenceRefs: string[];
  createdAt: string;
  actions: { ref: string; state: string }[];
}

interface VerifiedClosureItem {
  kind: "case" | "action";
  id: string;
  ref: string;
  title: string;
  resolutionCode: string | null;
  closureProof: string | null;
  closedAt: string | null;
  postcondition: string | null;
  result: string | null;
  verifiedAt: string | null;
  severity: string | null;
  owner: string | null;
  caseRef: string | null;
  shipmentRef: string | null;
}

interface BlockerItem {
  id: string;
  ref: string;
  title: string;
  category: string;
  state: string;
  severity: string;
  ownerTeam: string | null;
  ownerUser: string | null;
  dueDate: string | null;
  entityRef: string | null;
  shipmentRef: string | null;
  recommendedAction: string | null;
}

interface DecisionsPayload {
  queue: DecisionQueueItem[];
  overdue: OverdueItem[];
  openExceptions: OpenExceptionItem[];
  verifiedClosures: VerifiedClosureItem[];
  blockers: BlockerItem[];
  stats: {
    open: number;
    awaitingApproval: number;
    overdue: number;
    verifiedClosures: number;
    blockers: number;
  };
}

/** Pull the human recommendation text out of an action command payload JSON. */
function extractRecommendation(payload: string | null): string | null {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      const preferred = rec.draft ?? rec.proposal ?? rec.message;
      if (typeof preferred === "string") return preferred;
      const firstString = Object.values(rec).find((v): v is string => typeof v === "string");
      return firstString ?? null;
    }
    return null;
  } catch {
    return payload; // plain text payload — show as-is
  }
}

function parseEvidence(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function overdueHours(now: Date, due: Date): number {
  return Math.round(((now.getTime() - due.getTime()) / 3_600_000) * 10) / 10;
}

export async function GET() {
  try {
    const now = new Date();

    const [queueActions, awaitingCases, openCases, resolvedCases, verifiedActions, openActions] =
      await Promise.all([
        db.actionCommand.findMany({
          where: { state: "AWAITING_APPROVAL" },
          orderBy: { createdAt: "asc" },
          include: {
            approvals: { orderBy: { at: "desc" } },
            case: {
              select: {
                ref: true,
                title: true,
                severity: true,
                dueDate: true,
                ownerTeam: true,
                ownerUser: true,
                entityRef: true,
                shipment: { select: { ref: true } },
              },
            },
          },
        }),
        // Cases awaiting approval of their recommended action — only surfaced as a
        // queue entry when no action command for the case is already awaiting approval.
        db.exceptionCase.findMany({
          where: { state: "AWAITING_APPROVAL", recommendedAction: { not: null } },
          orderBy: { createdAt: "asc" },
          include: {
            actions: { select: { state: true } },
            shipment: { select: { ref: true } },
          },
        }),
        db.exceptionCase.findMany({
          where: { state: { in: OPEN_CASE_STATES } },
          orderBy: { createdAt: "desc" },
          include: {
            actions: { select: { ref: true, state: true } },
            shipment: { select: { ref: true } },
          },
        }),
        db.exceptionCase.findMany({
          where: { state: "RESOLVED" },
          orderBy: { closedAt: "desc" },
          include: { shipment: { select: { ref: true } } },
        }),
        db.actionCommand.findMany({
          where: { state: "VERIFIED" },
          orderBy: { verifiedAt: "desc" },
          include: { case: { select: { ref: true, title: true, shipment: { select: { ref: true } } } } },
        }),
        // Open action commands — overdue ones are derived via the linked case due date
        // (ActionCommand carries no own due-date column; the case owns the SLA clock).
        db.actionCommand.findMany({
          where: { state: { notIn: ["VERIFIED", "CANCELLED"] } },
          include: {
            case: {
              select: {
                ref: true,
                title: true,
                severity: true,
                state: true,
                dueDate: true,
                ownerTeam: true,
                ownerUser: true,
                entityRef: true,
              },
            },
          },
        }),
      ]);

    /* ── Decision queue ── */
    const queue: DecisionQueueItem[] = [];
    for (const a of queueActions) {
      queue.push({
        kind: "action",
        id: a.id,
        ref: a.ref,
        title: a.case?.title ?? a.commandType.replaceAll("_", " "),
        command: a.commandType,
        caseRef: a.case?.ref ?? null,
        caseTitle: a.case?.title ?? null,
        severity: a.case?.severity ?? null,
        state: a.state,
        riskLevel: a.riskLevel,
        policyDecision: a.policyDecision,
        owner: a.requestedBy,
        due: a.case?.dueDate ? a.case.dueDate.toISOString() : null,
        dueSource: a.case?.dueDate ? "case" : "none",
        targetRef: a.targetRef,
        entityRef: a.case?.entityRef ?? null,
        shipmentRef: a.case?.shipment?.ref ?? null,
        recommendation: extractRecommendation(a.payload),
        approvals: a.approvals.map((ap) => ({
          approver: ap.approver,
          role: ap.role,
          decision: ap.decision,
          at: ap.at.toISOString(),
        })),
      });
    }
    for (const c of awaitingCases) {
      const hasActionAwaiting = c.actions.some((a) => a.state === "AWAITING_APPROVAL");
      if (hasActionAwaiting) continue; // already represented by its action command entry
      queue.push({
        kind: "case",
        id: c.id,
        ref: c.ref,
        title: c.title,
        command: null,
        caseRef: c.ref,
        caseTitle: c.title,
        severity: c.severity,
        state: c.state,
        riskLevel: null,
        policyDecision: null,
        owner: c.ownerUser ?? c.ownerTeam ?? null,
        due: c.dueDate ? c.dueDate.toISOString() : null,
        dueSource: c.dueDate ? "case" : "none",
        targetRef: null,
        entityRef: c.entityRef,
        shipmentRef: c.shipment?.ref ?? null,
        recommendation: c.recommendedAction,
        approvals: [],
      });
    }

    /* ── Overdue (derived, never hard-coded) ── */
    const overdue: OverdueItem[] = [];
    for (const a of openActions) {
      const due = a.case?.dueDate ?? null;
      if (!due || due.getTime() >= now.getTime()) continue;
      overdue.push({
        kind: "action",
        id: a.id,
        ref: a.ref,
        title: a.case?.title ?? a.commandType.replaceAll("_", " "),
        state: a.state,
        severity: a.case?.severity ?? null,
        owner: a.requestedBy,
        due: due.toISOString(),
        overdueByHours: overdueHours(now, due),
        caseRef: a.case?.ref ?? null,
        entityRef: a.case?.entityRef ?? null,
      });
    }
    for (const c of openCases) {
      if (!c.dueDate || c.dueDate.getTime() >= now.getTime()) continue;
      overdue.push({
        kind: "case",
        id: c.id,
        ref: c.ref,
        title: c.title,
        state: c.state,
        severity: c.severity,
        owner: c.ownerUser ?? c.ownerTeam ?? null,
        due: c.dueDate.toISOString(),
        overdueByHours: overdueHours(now, c.dueDate),
        caseRef: c.ref,
        entityRef: c.entityRef,
      });
    }
    overdue.sort((x, y) => y.overdueByHours - x.overdueByHours);

    /* ── Open exceptions (with closed-loop lifecycle inputs) ── */
    const openExceptions: OpenExceptionItem[] = openCases.map((c) => ({
      id: c.id,
      ref: c.ref,
      title: c.title,
      category: c.category,
      severity: c.severity,
      state: c.state,
      trigger: c.trigger,
      entityType: c.entityType,
      entityRef: c.entityRef,
      shipmentRef: c.shipment?.ref ?? null,
      ownerTeam: c.ownerTeam,
      ownerUser: c.ownerUser,
      slaHours: c.slaHours,
      dueDate: c.dueDate ? c.dueDate.toISOString() : null,
      recommendedAction: c.recommendedAction,
      evidenceRefs: parseEvidence(c.evidenceRefs),
      createdAt: c.createdAt.toISOString(),
      actions: c.actions.map((a) => ({ ref: a.ref, state: a.state })),
    }));

    /* ── Verified closures: RESOLVED cases with evidence + VERIFIED action read-backs ── */
    const verifiedClosures: VerifiedClosureItem[] = [];
    for (const c of resolvedCases) {
      verifiedClosures.push({
        kind: "case",
        id: c.id,
        ref: c.ref,
        title: c.title,
        resolutionCode: c.resolutionCode,
        closureProof: c.closureProof,
        closedAt: c.closedAt ? c.closedAt.toISOString() : null,
        postcondition: null,
        result: null,
        verifiedAt: null,
        severity: c.severity,
        owner: c.ownerUser ?? c.ownerTeam ?? null,
        caseRef: c.ref,
        shipmentRef: c.shipment?.ref ?? null,
      });
    }
    for (const a of verifiedActions) {
      verifiedClosures.push({
        kind: "action",
        id: a.id,
        ref: a.ref,
        title: a.case?.title ?? a.commandType.replaceAll("_", " "),
        resolutionCode: null,
        closureProof: null,
        closedAt: null,
        postcondition: a.postcondition,
        result: a.result,
        verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
        severity: null,
        owner: a.requestedBy,
        caseRef: a.case?.ref ?? null,
        shipmentRef: a.case?.shipment?.ref ?? null,
      });
    }
    verifiedClosures.sort((x, y) => {
      const tx = new Date(x.closedAt ?? x.verifiedAt ?? 0).getTime();
      const ty = new Date(y.closedAt ?? y.verifiedAt ?? 0).getTime();
      return ty - tx;
    });

    /* ── Blockers: CRITICAL open cases ── */
    const blockers: BlockerItem[] = openExceptions
      .filter((c) => c.severity === "CRITICAL")
      .map((c) => ({
        id: c.id,
        ref: c.ref,
        title: c.title,
        category: c.category,
        state: c.state,
        severity: c.severity,
        ownerTeam: c.ownerTeam,
        ownerUser: c.ownerUser,
        dueDate: c.dueDate,
        entityRef: c.entityRef,
        shipmentRef: c.shipmentRef,
        recommendedAction: c.recommendedAction,
      }));

    const payload: DecisionsPayload = {
      queue,
      overdue,
      openExceptions,
      verifiedClosures,
      blockers,
      stats: {
        open: openExceptions.length,
        awaitingApproval: queue.length,
        overdue: overdue.length,
        verifiedClosures: verifiedClosures.length,
        blockers: blockers.length,
      },
    };

    return ok(payload);
  } catch (e) {
    return err("DECISIONS_FAILED", `Failed to build decision payload: ${String(e)}`, 500);
  }
}
