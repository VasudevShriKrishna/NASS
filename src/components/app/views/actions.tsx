"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  FolderOpen,
  KeyRound,
  ListChecks,
  Route,
  Scale,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useApi, postJson } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import { CASE_STATES, LIFECYCLE_STEP, type CaseState } from "@/lib/case-states";
import { fmtBahrainDateTime } from "@/lib/bahrain-time";
import {
  CaseStateBadge,
  EmptyState,
  ErrorState,
  KpiTile,
  LoadingState,
  ScrollTable,
  SectionCard,
  SeverityBadge,
  StatusPill,
  fmtDateTime,
  fmtRelative,
  parseObj,
} from "@/components/app/shared";

/* ── Types (mirror API payloads) ── */
interface ApprovalRow {
  id: string;
  approver: string;
  role: string;
  decision: string;
  comment: string | null;
  at: string;
}
interface ActionRow {
  id: string;
  ref: string;
  caseId: string | null;
  case?: { ref: string; title: string; state: string; severity: string } | null;
  commandType: string;
  riskLevel: string;
  targetType: string | null;
  targetRef: string | null;
  payload: string | null;
  state: string;
  policyDecision: string | null;
  policyRule: string | null;
  idempotencyKey: string;
  requestedBy: string;
  approvalId: string | null;
  submittedAt: string | null;
  ackAt: string | null;
  postcondition: string | null;
  verifiedAt: string | null;
  result: string | null;
  failureReason: string | null;
  compensation: string | null;
  createdAt: string;
  approvals: ApprovalRow[];
}
interface NotificationRow {
  id: string;
  caseId: string | null;
  case?: { ref: string; title: string } | null;
  channel: string;
  template: string;
  templateVersion: string;
  recipient: string;
  audienceType: string;
  state: string;
  urgency: string;
  at: string;
  note: string | null;
}

/* ── /api/decisions payload (mirror of src/app/api/decisions/route.ts) ── */
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

/* ── Action state machine ── */
const ACTION_MAIN = ["DRAFT", "POLICY_CHECK", "AWAITING_APPROVAL", "AUTHORIZED", "SUBMITTED", "ACKNOWLEDGED", "PENDING_VERIFICATION", "VERIFIED"];
const ACTION_SIDE = ["FAILED", "COMPENSATION_REQUIRED", "CANCELLED"];

/* ── Closed-loop lifecycle strip inputs (single source: src/lib/case-states.ts) ── */
const LIFECYCLE_LINEAR: readonly CaseState[] = CASE_STATES.filter((s) => s !== "CANCELLED");

/* ── Chip palettes ── */
const RISK_CLS: Record<string, string> = {
  SAFE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300",
  HIGH_RISK: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300",
};
const POLICY_CLS: Record<string, string> = {
  ALLOW: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300",
  REVIEW: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  DENY: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300",
};
const CHANNEL_CLS: Record<string, string> = {
  IN_APP: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300",
  EMAIL: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300",
  SMS_WHATSAPP: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  SUPPLIER_PORTAL: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300",
};
const NTF_STATE_CLS: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300",
  SENT: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  QUEUED: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400",
  FAILED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300",
  BOUNCED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300",
};
const EMERALD_CLS = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/25";
const ROSE_CLS = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/25";

function chipCls(cls: string | undefined) {
  return cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", cls ?? "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300");
}

function humanize(v: string | null | undefined) {
  return (v ?? "").replaceAll("_", " ");
}

function fmtOverdue(h: number): string {
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── DETECT → CLOSE lifecycle strip (current state highlighted) ── */
function LifecycleStrip({ state }: { state: string }) {
  const idx = LIFECYCLE_LINEAR.indexOf(state as CaseState);
  return (
    <div className="flex flex-wrap items-start gap-x-1 gap-y-2">
      {LIFECYCLE_LINEAR.map((s, i) => {
        const reached = idx >= 0 && i <= idx;
        return (
          <span key={s} className="inline-flex items-start gap-1">
            {i > 0 ? <ArrowRight className="mt-1.5 h-3 w-3 shrink-0 text-muted-foreground/50" /> : null}
            <span className="inline-flex flex-col items-center gap-0.5">
              <CaseStateBadge
                state={s}
                className={cn(!reached && "opacity-40", s === state && "ring-2 ring-primary/50")}
              />
              <span className={cn("text-[8.5px] uppercase tracking-wider text-muted-foreground", !reached && "opacity-50")}>
                {LIFECYCLE_STEP[s]}
              </span>
            </span>
          </span>
        );
      })}
      <span className="ml-1 inline-flex items-start gap-1">
        <span className="mt-1.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">exit:</span>
        <span className="inline-flex flex-col items-center gap-0.5">
          <CaseStateBadge
            state="CANCELLED"
            className={cn(state !== "CANCELLED" && "opacity-40", state === "CANCELLED" && "ring-2 ring-primary/50")}
          />
          <span className={cn("text-[8.5px] uppercase tracking-wider text-muted-foreground", state !== "CANCELLED" && "opacity-50")}>
            {LIFECYCLE_STEP.CANCELLED}
          </span>
        </span>
      </span>
    </div>
  );
}

/* ── Decision queue row (awaiting approval) ── */
function QueueRow({ item, onOpenInActions }: { item: DecisionQueueItem; onOpenInActions: (filterRef: string, actionId?: string) => void }) {
  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        item.kind === "action"
          ? "border-teal-300 bg-teal-50/50 dark:border-teal-400/25 dark:bg-teal-400/10"
          : "border-amber-300 bg-amber-50/50 dark:border-amber-400/25 dark:bg-amber-400/10"
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-bold">{item.ref}</span>
        {item.kind === "action" && item.riskLevel ? (
          <span className={chipCls(RISK_CLS[item.riskLevel])}>{item.riskLevel === "HIGH_RISK" ? "HIGH RISK" : "SAFE"}</span>
        ) : null}
        <StatusPill value={item.state} />
        {item.severity ? <SeverityBadge value={item.severity} /> : null}
        {item.policyDecision ? <span className={chipCls(POLICY_CLS[item.policyDecision])}>POLICY {item.policyDecision}</span> : null}
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          {item.kind === "action" ? "action command" : "case-level decision"}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium">{item.title}</p>
      {item.recommendation ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Recommendation:</span> {item.recommendation}
        </p>
      ) : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        {item.owner ? <span>owner: <span className="font-medium text-foreground">{item.owner}</span></span> : null}
        {item.due ? (
          <span>
            due <span className="font-medium text-foreground">{fmtBahrainDateTime(item.due)}</span> · {fmtRelative(item.due)}
            {item.dueSource === "case" ? " (case SLA)" : ""}
          </span>
        ) : (
          <span>no due date recorded</span>
        )}
        {item.shipmentRef ? <span>shipment <span className="font-mono">{item.shipmentRef}</span></span> : null}
        {item.targetRef ? <span>target <span className="font-mono">{item.targetRef}</span></span> : null}
        {item.approvals.length > 0 ? (
          <span>
            {item.approvals.length} approval record{item.approvals.length === 1 ? "" : "s"} on file — latest {item.approvals[0].approver} ({item.approvals[0].decision})
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto min-h-9 gap-1.5"
          onClick={() => onOpenInActions(item.kind === "action" ? item.ref : item.caseRef ?? item.ref, item.kind === "action" ? item.id : undefined)}
        >
          Open in Actions <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

/* ── Overdue row (rose) ── */
function OverdueRow({ o, onOpenInActions }: { o: OverdueItem; onOpenInActions: (filterRef: string, actionId?: string) => void }) {
  return (
    <li className="rounded-lg border border-rose-300 bg-rose-50/60 p-3 dark:border-rose-400/25 dark:bg-rose-400/10">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-bold">{o.ref}</span>
        <span className={chipCls(ROSE_CLS)}>{o.kind === "action" ? "ACTION OVERDUE" : "CASE OVERDUE"}</span>
        <StatusPill value={o.state} />
        {o.severity ? <SeverityBadge value={o.severity} /> : null}
        <span className="ml-auto text-xs font-semibold text-rose-700 dark:text-rose-300">
          {fmtOverdue(o.overdueByHours)} past due
        </span>
      </div>
      <p className="mt-1 text-sm font-medium">{o.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {o.owner ? <span>owner: {o.owner}</span> : null}
        <span>due {fmtBahrainDateTime(o.due)} · {fmtRelative(o.due)}</span>
        {o.entityRef ? <span>entity <span className="font-mono">{o.entityRef}</span></span> : null}
        {o.kind === "action" ? (
          <Button type="button" size="sm" variant="outline" className="ml-auto min-h-9 gap-1.5" onClick={() => onOpenInActions(o.ref, o.id)}>
            Open in Actions <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        ) : (
          <span className="ml-auto font-mono">{o.caseRef}</span>
        )}
      </div>
    </li>
  );
}

/* ── Verified closure row (emerald — evidence-backed) ── */
function ClosureRow({ v }: { v: VerifiedClosureItem }) {
  return (
    <li className="rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-400/25 dark:bg-emerald-400/10">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-bold">{v.ref}</span>
        <span className={chipCls(EMERALD_CLS)}>{v.kind === "case" ? v.resolutionCode ?? "RESOLVED" : "VERIFIED"}</span>
        {v.severity ? <SeverityBadge value={v.severity} /> : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {v.kind === "case" ? `closed ${fmtBahrainDateTime(v.closedAt)}` : `verified ${fmtBahrainDateTime(v.verifiedAt)}`}
        </span>
      </div>
      <p className="mt-1 text-sm font-medium">{v.title}</p>
      {v.closureProof ? (
        <p className="mt-1 line-clamp-2 text-xs text-emerald-900 dark:text-emerald-200">
          <span className="font-semibold">Closure proof:</span> {v.closureProof}
        </p>
      ) : null}
      {v.postcondition ? (
        <p className="mt-1 line-clamp-2 text-xs text-emerald-900 dark:text-emerald-200">
          <span className="font-semibold">Postcondition (read-back):</span> {v.postcondition}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
        {v.owner ? <span>owner: {v.owner}</span> : null}
        {v.shipmentRef ? <span>shipment <span className="font-mono">{v.shipmentRef}</span></span> : null}
        {v.kind === "action" && v.caseRef ? <span>case <span className="font-mono">{v.caseRef}</span></span> : null}
      </div>
    </li>
  );
}

/* ── Open exception row with expandable closed-loop lifecycle ── */
function OpenExceptionRow({ c }: { c: OpenExceptionItem }) {
  const [open, setOpen] = useState(false);
  const overdue = c.dueDate ? new Date(c.dueDate).getTime() < Date.now() : false;
  const owner = [c.ownerUser, c.ownerTeam].filter(Boolean).join(" · ");
  return (
    <li className="rounded-lg border border-border/70 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-bold">{c.ref}</span>
        <SeverityBadge value={c.severity} />
        <CaseStateBadge state={c.state} />
        {c.dueDate ? (
          <span className={cn("text-xs", overdue ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
            due {fmtBahrainDateTime(c.dueDate)} · {fmtRelative(c.dueDate)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">no due date</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`lifecycle-${c.id}`}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Route className="h-3.5 w-3.5" aria-hidden /> lifecycle {open ? <ChevronDown className="h-3 w-3" aria-hidden /> : <ChevronRight className="h-3 w-3" aria-hidden />}
        </button>
      </div>
      <p className="mt-1 text-sm font-medium">{c.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {owner ? <span>owner: {owner}</span> : <span>unassigned</span>}
        {c.entityRef ? <span>{humanize(c.entityType ?? "entity")}: <span className="font-mono">{c.entityRef}</span></span> : null}
        {c.shipmentRef ? <span>shipment <span className="font-mono">{c.shipmentRef}</span></span> : null}
        {c.slaHours != null ? <span>SLA {c.slaHours}h</span> : null}
        <span>detected {fmtRelative(c.createdAt)}</span>
        {c.actions.length > 0 ? <span>{c.actions.length} linked action{c.actions.length === 1 ? "" : "s"}</span> : null}
      </div>
      {open ? (
        <div id={`lifecycle-${c.id}`} className="mt-3 space-y-2.5 rounded-md border bg-muted/30 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Closed-loop lifecycle — Detect → Close · current state highlighted
          </p>
          <LifecycleStrip state={c.state} />
          {c.recommendedAction ? (
            <p className="text-xs"><span className="font-medium">Recommendation:</span> {c.recommendedAction}</p>
          ) : null}
          {c.trigger ? <p className="text-xs text-muted-foreground"><span className="font-medium">Detected by:</span> {c.trigger}</p> : null}
          {c.evidenceRefs.length > 0 ? (
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">evidence: {c.evidenceRefs.join(" · ")}</p>
          ) : null}
          {c.actions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {c.actions.map((a) => (
                <span key={a.ref} className={chipCls(undefined)}>
                  {a.ref} · {a.state.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/* ── Blocker row (CRITICAL open case) ── */
function BlockerRow({ b }: { b: BlockerItem }) {
  const owner = [b.ownerUser, b.ownerTeam].filter(Boolean).join(" · ");
  return (
    <li className="rounded-lg border border-rose-300 bg-rose-50/60 p-3 dark:border-rose-400/25 dark:bg-rose-400/10">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs font-bold">{b.ref}</span>
        <SeverityBadge value={b.severity} />
        <CaseStateBadge state={b.state} />
        {b.dueDate ? (
          <span className={cn("text-xs", new Date(b.dueDate).getTime() < Date.now() ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
            due {fmtBahrainDateTime(b.dueDate)} · {fmtRelative(b.dueDate)}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">owner: {owner || "—"}</span>
      </div>
      <p className="mt-1 text-sm font-medium">{b.title}</p>
      {b.recommendedAction ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Next step:</span> {b.recommendedAction}</p>
      ) : null}
    </li>
  );
}

/* ── Approval gateway (interactive) ── */
function DecisionPanel({ action, onDone }: { action: ActionRow; onDone: () => void }) {
  const { toast } = useToast();
  const [approver, setApprover] = useState("Procurement Lead");
  const [role, setRole] = useState("Approver");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (busy) return;
    if (!approver.trim()) {
      toast({ title: "Approver required", description: "The approval record must identify the accountable approver (M18).", variant: "destructive" });
      return;
    }
    setBusy(decision);
    const res = await postJson<{ action: ActionRow; decision: string; correlation_id: string }>(`/api/actions/${action.id}/decide`, {
      decision,
      approver: approver.trim(),
      role: role.trim() || "Approver",
      comment: comment.trim() || undefined,
    });
    setBusy(null);
    if (res.ok) {
      toast({
        title: decision === "APPROVED" ? `${action.ref} approved and submitted` : `${action.ref} rejected`,
        description:
          decision === "APPROVED"
            ? "Gateway submitted the command with its idempotency key; outcome is PENDING_VERIFICATION until target read-back."
            : "Command cancelled with reason; the linked case returns to ACTION_PROPOSED for rework.",
      });
      setComment("");
      onDone();
    } else {
      toast({ title: "Gateway decision failed", description: res.error?.message ?? "Unknown gateway error.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-teal-300 bg-teal-50/60 p-3 dark:border-teal-400/25 dark:bg-teal-400/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">Approval gateway — decide this action</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="approver">
            Approver
          </label>
          <Input id="approver" value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Procurement Lead" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="approver-role">
            Role
          </label>
          <Input id="approver-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Approver" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="approval-comment">
            Comment (recorded on the approval)
          </label>
          <Textarea id="approval-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Rationale, conditions or rejection reason" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={busy !== null} onClick={() => decide("APPROVED")} className="bg-emerald-600 text-white hover:bg-emerald-700">
          {busy === "APPROVED" ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
          Approve
        </Button>
        <Button type="button" disabled={busy !== null} onClick={() => decide("REJECTED")} variant="outline" className="border-rose-400 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-400/25 dark:text-rose-400 dark:hover:bg-rose-400/10">
          {busy === "REJECTED" ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
          Reject
        </Button>
      </div>
      <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
        LLM output is a proposal, not an action authorization — only the action gateway executes after policy, authorization and approval checks (M18).
      </p>
    </div>
  );
}

/* ── Main view ── */
export function ActionsView({ drillRef }: { drillRef?: string | null }) {
  const drillTo = useAppStore((s) => s.drillTo);
  const actionsApi = useApi<ActionRow[]>("/api/actions");
  const notificationsApi = useApi<NotificationRow[]>("/api/notifications");
  const decisionsApi = useApi<DecisionsPayload>("/api/decisions", [], 60_000);
  const [manualId, setManualId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const actionsCardRef = useRef<HTMLDivElement | null>(null);

  const actions = useMemo(() => actionsApi.data ?? [], [actionsApi.data]);
  const decisions = decisionsApi.data;

  /* Master-list filter — also driven by the "Open in Actions" affordance */
  const filteredActions = useMemo(() => {
    const q = actionFilter.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.ref.toLowerCase().includes(q) ||
        a.commandType.toLowerCase().includes(q) ||
        a.state.toLowerCase().includes(q) ||
        a.requestedBy.toLowerCase().includes(q) ||
        (a.case?.ref ?? "").toLowerCase().includes(q) ||
        (a.case?.title ?? "").toLowerCase().includes(q) ||
        (a.targetRef ?? "").toLowerCase().includes(q)
    );
  }, [actions, actionFilter]);

  /** Queue/overdue affordance: filter the master table, preselect the command, scroll to it. */
  function openInActions(filterRef: string, actionId?: string) {
    setActionFilter(filterRef);
    if (actionId) setManualId(actionId);
    actionsCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* drillRef preselection is derived (no effect needed) — manual selection wins once the user clicks */
  const drillId = useMemo(() => (drillRef ? actions.find((a) => a.ref === drillRef)?.id ?? null : null), [drillRef, actions]);
  const selectedId = manualId ?? drillId;

  const selected = actions.find((a) => a.id === selectedId) ?? null;
  const mainIdx = selected ? ACTION_MAIN.indexOf(selected.state) : -1;
  const notifications = notificationsApi.data ?? [];

  const stats = decisions?.stats;
  const queue = decisions?.queue ?? [];
  const overdue = decisions?.overdue ?? [];
  const openExceptions = decisions?.openExceptions ?? [];
  const verifiedClosures = decisions?.verifiedClosures ?? [];
  const blockers = decisions?.blockers ?? [];

  return (
    <div className="space-y-4">
      {/* View header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          NASS <span className="text-gold-grad">Decision Management</span>
        </h1>
        <p className="text-xs text-muted-foreground">exception → verified closure · evidence required</p>
      </div>

      {/* Decision dashboard — 5 derived KPI tiles */}
      {decisionsApi.loading ? (
        <LoadingState label="Building decision payload…" />
      ) : decisionsApi.error ? (
        <ErrorState message={decisionsApi.error} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiTile
            label="Open exceptions"
            value={stats?.open ?? 0}
            sub="cases not yet RESOLVED / CANCELLED"
            icon={<FolderOpen className="h-4 w-4" aria-hidden />}
            onClick={() => scrollToSection("decisions-open")}
            index={0}
          />
          <KpiTile
            label="Awaiting approval"
            value={stats?.awaitingApproval ?? 0}
            tone="warn"
            sub="decisions in the approval queue"
            icon={<BadgeCheck className="h-4 w-4" aria-hidden />}
            onClick={() => scrollToSection("decisions-queue")}
            index={1}
          />
          <KpiTile
            label="Overdue"
            value={stats?.overdue ?? 0}
            tone="bad"
            sub="past due · still unresolved"
            icon={<AlarmClock className="h-4 w-4" aria-hidden />}
            onClick={() => scrollToSection("decisions-overdue")}
            index={2}
          />
          <KpiTile
            label="Verified closures"
            value={stats?.verifiedClosures ?? 0}
            tone="good"
            sub="closed with evidence"
            icon={<CircleCheck className="h-4 w-4" aria-hidden />}
            onClick={() => scrollToSection("decisions-closures")}
            index={3}
          />
          <KpiTile
            label="Critical blockers"
            value={stats?.blockers ?? 0}
            tone="bad"
            sub="CRITICAL-severity open cases"
            icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
            onClick={() => scrollToSection("decisions-blockers")}
            index={4}
          />
        </div>
      )}

      {/* Decision queue — everything awaiting an authorized approval */}
      <div id="decisions-queue" className="scroll-mt-16">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-teal-700 dark:text-teal-400" /> Decision queue
            </span>
          }
          subtitle={`${queue.length} decision${queue.length === 1 ? "" : "s"} awaiting approval — nothing executes without an authorized approver (M18)`}
          bodyClass="pt-0"
        >
          {decisionsApi.loading ? (
            <LoadingState />
          ) : decisionsApi.error ? (
            <ErrorState message={decisionsApi.error} />
          ) : queue.length === 0 ? (
            <EmptyState message="Nothing awaiting approval" hint="The approval queue is clear — no action commands or case decisions are pending." />
          ) : (
            <ScrollTable maxHeight="max-h-[480px]">
              <ul className="space-y-2">
                {queue.map((item) => (
                  <QueueRow key={item.id} item={item} onOpenInActions={openInActions} />
                ))}
              </ul>
            </ScrollTable>
          )}
        </SectionCard>
      </div>

      {/* Overdue decisions & cases (rose) */}
      <div id="decisions-overdue" className="scroll-mt-16">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <AlarmClock className="h-4 w-4 text-rose-700 dark:text-rose-400" /> Overdue
            </span>
          }
          subtitle={`${overdue.length} item${overdue.length === 1 ? "" : "s"} past their case SLA clock and not yet verified/closed`}
          bodyClass="pt-0"
        >
          {decisionsApi.loading ? (
            <LoadingState />
          ) : decisionsApi.error ? (
            <ErrorState message={decisionsApi.error} />
          ) : overdue.length === 0 ? (
            <EmptyState message="No overdue work" hint="No open action command or exception case has slipped past its due date." />
          ) : (
            <ScrollTable maxHeight="max-h-[420px]">
              <ul className="space-y-2">
                {overdue.map((o) => (
                  <OverdueRow key={`${o.kind}-${o.id}`} o={o} onOpenInActions={openInActions} />
                ))}
              </ul>
            </ScrollTable>
          )}
        </SectionCard>
      </div>

      {/* Critical blockers */}
      <div id="decisions-blockers" className="scroll-mt-16">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-700 dark:text-rose-400" /> Critical blockers
            </span>
          }
          subtitle={`${blockers.length} CRITICAL open case${blockers.length === 1 ? "" : "s"} blocking smooth operations`}
          bodyClass="pt-0"
        >
          {decisionsApi.loading ? (
            <LoadingState />
          ) : decisionsApi.error ? (
            <ErrorState message={decisionsApi.error} />
          ) : blockers.length === 0 ? (
            <EmptyState message="No critical blockers" hint="No open case is at CRITICAL severity." />
          ) : (
            <ScrollTable maxHeight="max-h-[360px]">
              <ul className="space-y-2">
                {blockers.map((b) => (
                  <BlockerRow key={b.id} b={b} />
                ))}
              </ul>
            </ScrollTable>
          )}
        </SectionCard>
      </div>

      {/* Open exceptions with closed-loop lifecycle strips */}
      <div id="decisions-open" className="scroll-mt-16">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4 text-primary" /> Outstanding exceptions
            </span>
          }
          subtitle={`${openExceptions.length} open case${openExceptions.length === 1 ? "" : "s"} · expand a row to trace its Detect → Close lifecycle`}
          bodyClass="pt-0"
        >
          {decisionsApi.loading ? (
            <LoadingState />
          ) : decisionsApi.error ? (
            <ErrorState message={decisionsApi.error} />
          ) : openExceptions.length === 0 ? (
            <EmptyState message="No open exceptions" hint="Every case is RESOLVED or CANCELLED — with evidence on file." />
          ) : (
            <ScrollTable maxHeight="max-h-[560px]">
              <ul className="space-y-2">
                {openExceptions.map((c) => (
                  <OpenExceptionRow key={c.id} c={c} />
                ))}
              </ul>
            </ScrollTable>
          )}
        </SectionCard>
      </div>

      {/* Verified closures (emerald — evidence on file) */}
      <div id="decisions-closures" className="scroll-mt-16">
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Verified closures
            </span>
          }
          subtitle={`${verifiedClosures.length} closure${verifiedClosures.length === 1 ? "" : "s"} with evidence · a case reaches RESOLVED only with closure proof (M17) — dismissing an alert is not closure`}
          bodyClass="pt-0"
        >
          {decisionsApi.loading ? (
            <LoadingState />
          ) : decisionsApi.error ? (
            <ErrorState message={decisionsApi.error} />
          ) : verifiedClosures.length === 0 ? (
            <EmptyState message="No verified closures yet" hint="Closures appear here once a case reaches RESOLVED with evidence, or an action passes read-back verification." />
          ) : (
            <ScrollTable maxHeight="max-h-[420px]">
              <ul className="space-y-2">
                {verifiedClosures.map((v) => (
                  <ClosureRow key={`${v.kind}-${v.id}`} v={v} />
                ))}
              </ul>
            </ScrollTable>
          )}
        </SectionCard>
      </div>

      {/* Action gateway — master/detail (existing flows, now filterable from the queue) */}
      <div id="decisions-actions" ref={actionsCardRef} className="scroll-mt-16">
        <div className="grid items-start gap-4 xl:grid-cols-[420px_1fr]">
          {/* Master: action cards */}
          <SectionCard
            title="Action gateway queue (M18)"
            subtitle={
              actionFilter.trim()
                ? `${filteredActions.length} of ${actions.length} commands match “${actionFilter.trim()}”`
                : `${actions.length} command${actions.length === 1 ? "" : "s"} · every external write flows through here`
            }
            bodyClass="pt-0"
            right={
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    placeholder="Filter actions…"
                    aria-label="Filter action commands"
                    className="h-9 w-32 pl-8 text-xs sm:w-44"
                  />
                </div>
                {actionFilter ? (
                  <Button type="button" size="sm" variant="ghost" className="min-h-9 px-2" onClick={() => setActionFilter("")}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only">Clear filter</span>
                  </Button>
                ) : null}
              </div>
            }
          >
            {actionsApi.loading ? (
              <LoadingState />
            ) : actionsApi.error ? (
              <ErrorState message={actionsApi.error} />
            ) : filteredActions.length === 0 ? (
              <EmptyState
                message={actionFilter ? "No action commands match the filter" : "No action commands recorded"}
                hint={actionFilter ? "Clear the filter to see every command in the gateway." : "Commands appear here as decisions are proposed."}
              />
            ) : (
              <ScrollTable maxHeight="max-h-[620px]">
                <ul className="space-y-2">
                  {filteredActions.map((a) => (
                    <li key={a.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setManualId(a.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setManualId(a.id);
                          }
                        }}
                        aria-pressed={selectedId === a.id}
                        className={cn(
                          "w-full cursor-pointer rounded-lg border p-3 text-left transition-colors",
                          selectedId === a.id ? "border-foreground/30 bg-accent shadow-sm" : "border-border/70 hover:bg-accent/50"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold">{a.ref}</span>
                          <span className={chipCls(RISK_CLS[a.riskLevel])}>{a.riskLevel === "HIGH_RISK" ? "HIGH RISK" : "SAFE"}</span>
                          <StatusPill value={a.state} />
                        </div>
                        <p className="mt-1 text-sm font-medium capitalize">{humanize(a.commandType)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          target: {a.targetType ?? "—"} <span className="font-mono">{a.targetRef ?? ""}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                          <span>
                            by {a.requestedBy} · {fmtRelative(a.createdAt)}
                          </span>
                          {a.case ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                drillTo("exceptions", a.case?.ref);
                              }}
                            >
                              case {a.case.ref} <ArrowRight className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollTable>
            )}
          </SectionCard>

          {/* Detail */}
          <div className="space-y-4">
            {!selected ? (
              <Card>
                <CardContent className="py-2">
                  <EmptyState message="Select an action command" hint="Policy decision, idempotency, payload, approvals and verification are shown per command." />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Header */}
                <SectionCard
                  title={
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold">{selected.ref}</span>
                      <span className={chipCls(RISK_CLS[selected.riskLevel])}>{selected.riskLevel === "HIGH_RISK" ? "HIGH RISK" : "SAFE"}</span>
                      <StatusPill value={selected.state} />
                    </span>
                  }
                  subtitle={selected.case ? `${selected.case.title} — case ${selected.case.ref}` : humanize(selected.commandType)}
                >
                  {/* Action state mini strip */}
                  <div className="mb-4">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Action state machine</p>
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
                      {ACTION_MAIN.map((s, i) => (
                        <span key={s} className="inline-flex items-center gap-1">
                          {i > 0 ? <ArrowRight className="h-3 w-3 text-muted-foreground/50" /> : null}
                          <StatusPill
                            value={s}
                            className={cn(
                              (mainIdx < 0 || i > mainIdx) && "opacity-40",
                              s === selected.state && "ring-2 ring-foreground/30"
                            )}
                          />
                        </span>
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">side exits:</span>
                      {ACTION_SIDE.map((s) => (
                        <StatusPill key={s} value={s} className={cn(s !== selected.state && "opacity-40", s === selected.state && "ring-2 ring-foreground/30")} />
                      ))}
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Command</dt>
                      <dd className="font-medium capitalize">{humanize(selected.commandType)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Target</dt>
                      <dd className="font-medium">
                        {selected.targetType ?? "—"} <span className="font-mono text-xs">{selected.targetRef ?? ""}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Requested by</dt>
                      <dd className="font-medium">{selected.requestedBy}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Timeline</dt>
                      <dd className="text-xs text-muted-foreground">
                        created {fmtDateTime(selected.createdAt)}
                        {selected.submittedAt ? ` · submitted ${fmtDateTime(selected.submittedAt)}` : ""}
                        {selected.ackAt ? ` · ack ${fmtDateTime(selected.ackAt)}` : ""}
                        {selected.verifiedAt ? ` · verified ${fmtDateTime(selected.verifiedAt)}` : ""}
                      </dd>
                    </div>
                    {selected.case ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Linked case</dt>
                        <dd>
                          <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400" onClick={() => drillTo("exceptions", selected.case?.ref)}>
                            {selected.case.ref} <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </SectionCard>

                {/* a) Policy & idempotency */}
                <SectionCard
                  title={
                    <span className="inline-flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-amber-700 dark:text-amber-400" /> Policy &amp; idempotency
                    </span>
                  }
                  subtitle="No external write proceeds without a policy decision and a stable idempotency key (Rule 7)."
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.policyDecision ? <span className={chipCls(POLICY_CLS[selected.policyDecision])}>POLICY {selected.policyDecision}</span> : <span className="text-xs text-muted-foreground">no policy decision recorded</span>}
                    {selected.policyRule ? <span className="text-xs text-muted-foreground">{selected.policyRule}</span> : null}
                  </div>
                  <div className="mt-2">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-help items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300">
                            <KeyRound className="h-3 w-3" /> {selected.idempotencyKey}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          Reprocessing the same command cannot duplicate effects (Rule 7).
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </SectionCard>

                {/* b) Payload preview */}
                <SectionCard title="Payload preview" subtitle="The exact request body the gateway will submit to the target system.">
                  {selected.payload ? (
                    <pre className="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                      {(() => {
                        const parsed = parseObj(selected.payload);
                        return parsed ? JSON.stringify(parsed, null, 2) : selected.payload;
                      })()}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No payload recorded.</p>
                  )}
                </SectionCard>

                {/* c) Approvals */}
                <SectionCard
                  title={
                    <span className="inline-flex items-center gap-1.5">
                      <BadgeCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Approvals
                    </span>
                  }
                  subtitle={selected.riskLevel === "HIGH_RISK" ? "High-risk command — no approval, no execution." : "Approval records for this command."}
                  bodyClass="pt-0"
                >
                  {selected.approvals.length === 0 ? (
                    <EmptyState message="No approvals recorded yet" />
                  ) : (
                    <ScrollTable maxHeight="max-h-56">
                      <ul className="space-y-2">
                        {selected.approvals.map((ap) => (
                          <li key={ap.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 px-2.5 py-2 text-xs">
                            <StatusPill value={ap.decision} />
                            <span className="font-semibold">{ap.approver}</span>
                            <span className="text-muted-foreground">{ap.role}</span>
                            <span className="ml-auto tabular-nums text-muted-foreground">{fmtDateTime(ap.at)}</span>
                            {ap.comment ? <p className="w-full whitespace-pre-wrap text-muted-foreground">{ap.comment}</p> : null}
                          </li>
                        ))}
                      </ul>
                    </ScrollTable>
                  )}
                </SectionCard>

                {/* d) Approval gateway */}
                {selected.state === "AWAITING_APPROVAL" ? (
                  <DecisionPanel key={`${selected.id}-${selected.state}-${selected.approvals.length}`} action={selected} onDone={() => { actionsApi.refresh(); decisionsApi.refresh(); }} />
                ) : null}

                {/* e) Result & verification */}
                {(selected.result || selected.failureReason || selected.compensation || selected.postcondition) ? (
                  <SectionCard title="Result &amp; verification" subtitle="A successful HTTP submission is not completion — postconditions are verified by read-back.">
                    {selected.result ? (
                      <div className="mb-3 overflow-hidden rounded-md border">
                        {(() => {
                          const parsed = parseObj<Record<string, unknown>>(selected.result);
                          if (!parsed) return <p className="p-3 font-mono text-xs">{selected.result}</p>;
                          const rows = ["gateway", "idempotency_key", "submission", "postcondition"].filter((k) => k in parsed);
                          return (
                            <table className="w-full text-xs">
                              <tbody>
                                {rows.map((k, i) => (
                                  <tr key={k} className={cn(i % 2 === 1 && "bg-muted/40")}>
                                    <td className="w-40 border-r border-border/60 px-2.5 py-1.5 font-mono text-muted-foreground">{k}</td>
                                    <td className="px-2.5 py-1.5">{String(parsed[k])}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {selected.postcondition ? (
                        <span className="rounded-md border border-border/70 px-2 py-1">
                          postcondition: <span className="font-medium">{selected.postcondition}</span>
                        </span>
                      ) : null}
                      <StatusPill value={selected.verifiedAt ? "VERIFIED" : "PENDING_VERIFICATION"} />
                      {selected.verifiedAt ? <span className="text-muted-foreground">verified {fmtDateTime(selected.verifiedAt)}</span> : null}
                    </div>
                    {selected.failureReason ? (
                      <p className="mt-2 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
                        Failure reason: {selected.failureReason}
                      </p>
                    ) : null}
                    {selected.compensation ? (
                      <p className="mt-2 rounded-md border border-orange-300 bg-orange-50 px-2.5 py-2 text-xs text-orange-900 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-300">
                        Compensation: {selected.compensation}
                      </p>
                    ) : null}
                  </SectionCard>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom full-width: Notifications (M19) */}
      <SectionCard
        title="Notifications (M19)"
        subtitle={`${notifications.length} messages · internal notes and external comms are separated by audience`}
        bodyClass="pt-0"
      >
        {notificationsApi.loading ? (
          <LoadingState />
        ) : notificationsApi.error ? (
          <ErrorState message={notificationsApi.error} />
        ) : notifications.length === 0 ? (
          <EmptyState message="No notifications recorded" />
        ) : (
          <ScrollTable maxHeight="max-h-80">
            <table className="w-full text-xs tabular-nums">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Case</th>
                  <th className="py-2 pr-2 font-medium">Channel</th>
                  <th className="py-2 pr-2 font-medium">Template</th>
                  <th className="py-2 pr-2 font-medium">Recipient</th>
                  <th className="py-2 pr-2 font-medium">Audience</th>
                  <th className="py-2 pr-2 font-medium">State</th>
                  <th className="py-2 pr-2 font-medium">At</th>
                  <th className="py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      {n.case ? (
                        <button type="button" className="font-mono text-teal-700 underline-offset-2 hover:underline dark:text-teal-400" onClick={() => drillTo("exceptions", n.case?.ref)}>
                          {n.case.ref}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <span className={chipCls(CHANNEL_CLS[n.channel])}>{n.channel.replaceAll("_", " ")}</span>
                    </td>
                    <td className="py-2 pr-2">
                      {n.template} <span className="font-mono text-muted-foreground">{n.templateVersion}</span>
                    </td>
                    <td className="py-2 pr-2">{n.recipient}</td>
                    <td className="py-2 pr-2">
                      <span className={chipCls(n.audienceType === "EXTERNAL" ? "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300" : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300")}>
                        {n.audienceType}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <span className={chipCls(NTF_STATE_CLS[n.state])}>{n.state}</span>
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">{fmtDateTime(n.at)}</td>
                    <td className="max-w-[280px] py-2 text-muted-foreground">
                      <span className="line-clamp-2">{n.note ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
        )}
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
          Delivery evidence is required before &quot;supplier contacted&quot;; retries are idempotent (M19).
        </p>
      </SectionCard>
    </div>
  );
}
