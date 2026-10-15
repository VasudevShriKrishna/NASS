"use client";

import { useMemo, useState } from "react";
import { ArrowRight, FileText, History, Link2, Mail, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useApi, postJson } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import {
  CaseStateBadge,
  EmptyState,
  ErrorState,
  EvidenceBadge,
  LoadingState,
  ScrollTable,
  SectionCard,
  SeverityBadge,
  StatusPill,
  fmtDateTime,
  fmtRelative,
  parseArr,
} from "@/components/app/shared";

/* ── M17 closed-loop state machine — client mirror of src/lib/case-machine.ts ── */
const CASE_STATES_LINEAR = [
  "DETECTED",
  "TRIAGED",
  "ASSIGNED",
  "INVESTIGATING",
  "ACTION_PROPOSED",
  "AWAITING_APPROVAL",
  "ACTION_SUBMITTED",
  "OUTCOME_PENDING_VERIFICATION",
  "RESOLVED",
] as const;
const ALL_CASE_STATES: string[] = [...CASE_STATES_LINEAR, "CANCELLED"];

interface TransitionOption {
  to: string;
  reopen?: boolean;
}
function allowedTransitions(state: string): TransitionOption[] {
  const out: TransitionOption[] = [];
  if (state === "RESOLVED") {
    out.push({ to: "INVESTIGATING", reopen: true });
  } else if (state !== "CANCELLED") {
    const idx = CASE_STATES_LINEAR.indexOf(state as (typeof CASE_STATES_LINEAR)[number]);
    if (idx >= 0 && idx < CASE_STATES_LINEAR.length - 1) out.push({ to: CASE_STATES_LINEAR[idx + 1] });
    out.push({ to: "CANCELLED" });
  }
  return out;
}

/* ── Types (mirror API payloads) ── */
interface CaseRow {
  id: string;
  ref: string;
  title: string;
  category: string;
  severity: string;
  state: string;
  trigger: string | null;
  ruleVersion: string | null;
  entityType: string | null;
  entityId: string | null;
  entityRef: string | null;
  ownerTeam: string | null;
  ownerUser: string | null;
  slaHours: number | null;
  dueDate: string | null;
  evidenceRefs: string | null;
  recommendedAction: string | null;
  resolutionCode: string | null;
  closureProof: string | null;
  reopenReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  actions?: { id: string; ref: string; state: string; commandType: string }[];
}
interface CaseEventRow {
  id: string;
  type: string;
  fromState: string | null;
  toState: string | null;
  actor: string;
  actorType: string;
  note: string | null;
  at: string;
}
interface ApprovalRow {
  id: string;
  approver: string;
  role: string;
  decision: string;
  comment: string | null;
  at: string;
}
interface DetailAction {
  id: string;
  ref: string;
  commandType: string;
  riskLevel: string;
  state: string;
  targetType: string | null;
  targetRef: string | null;
  approvals: ApprovalRow[];
}
interface NotificationRow {
  id: string;
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
interface EvidenceRow {
  id: string;
  sourceSystem: string;
  sourceRef: string | null;
  contentHash: string | null;
  issuer: string | null;
  receivedAt: string;
  label: string;
  originalOrDerived: string;
}
interface CaseDetail extends CaseRow {
  events: CaseEventRow[];
  actions: DetailAction[];
  notifications: NotificationRow[];
  supplier?: { code: string; name: string; status: string } | null;
  shipment?: { ref: string; status: string; freshness: string; displayEta: string | null; supplierPromisedEta: string | null; vesselName: string | null } | null;
  bol?: { id: string; bolNo: string; version: number; status: string; matchStatus: string; isActive: boolean } | null;
}

/* ── Chip palettes (allowed palette only: emerald/teal/amber/orange/rose/violet/zinc) ── */
const EVENT_TYPE_CLS: Record<string, string> = {
  STATE_TRANSITION: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300",
  COMMENT: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300",
  EVIDENCE: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300",
  ASSIGNMENT: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  COMMUNICATION: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-400/10 dark:text-orange-300",
};
const NTF_STATE_CLS: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300",
  SENT: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  QUEUED: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400",
  FAILED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300",
  BOUNCED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300",
};
const CHANNEL_CLS: Record<string, string> = {
  IN_APP: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300",
  EMAIL: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300",
  SMS_WHATSAPP: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  SUPPLIER_PORTAL: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300",
};
const RISK_CLS: Record<string, string> = {
  SAFE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300",
  HIGH_RISK: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300",
};

function chipCls(cls: string | undefined) {
  return cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", cls ?? "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300");
}
function isOverdue(c: { dueDate: string | null; state: string }) {
  return !!c.dueDate && new Date(c.dueDate).getTime() < Date.now() && !["RESOLVED", "CANCELLED"].includes(c.state);
}
function hash12(h: string | null | undefined) {
  if (!h) return "—";
  return h.length > 14 ? `${h.slice(0, 14)}…` : h;
}

/* ── Inline mini state-flow of the case's own journey ── */
function MiniFlow({ state, visited }: { state: string; visited: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
      {ALL_CASE_STATES.map((s, i) => {
        const isCurrent = s === state;
        const seen = visited.includes(s);
        return (
          <span key={s} className="inline-flex items-center gap-1">
            {i > 0 ? <ArrowRight className="h-3 w-3 text-muted-foreground/50" /> : null}
            <CaseStateBadge state={s} className={cn(isCurrent && "ring-2 ring-foreground/30 ring-offset-1", !isCurrent && !seen && "opacity-35")} />
          </span>
        );
      })}
    </div>
  );
}

/* ── Transition control (interactive core) ── */
function TransitionPanel({ kase, events, onSuccess }: { kase: CaseDetail; events: CaseEventRow[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const options = useMemo(() => allowedTransitions(kase.state), [kase.state]);
  const [toState, setToState] = useState<string>(options[0]?.to ?? "");
  const [actor, setActor] = useState("Ops Supervisor");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const isReopen = kase.state === "RESOLVED" && toState === "INVESTIGATING";
  const noteRequired = toState === "RESOLVED" || isReopen;
  const visited = useMemo(() => {
    const set = new Set<string>([kase.state]);
    for (const e of events) {
      if (e.fromState) set.add(e.fromState);
      if (e.toState) set.add(e.toState);
    }
    return Array.from(set);
  }, [events, kase.state]);

  async function submit() {
    if (!toState || busy) return;
    if (!actor.trim()) {
      toast({ title: "Actor required", description: "The audit trail (M22) must record who performed this transition.", variant: "destructive" });
      return;
    }
    if (noteRequired && !note.trim()) {
      toast({
        title: "Closure evidence / reason required",
        description: isReopen ? "Reopening a resolved case requires the regression reason." : "A case can only reach RESOLVED with verified closure evidence (M17).",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const res = await postJson<{ case: CaseRow; transition: { from: string; to: string } }>(`/api/exceptions/${kase.id}/transition`, {
      toState,
      actor: actor.trim(),
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (res.ok) {
      toast({
        title: `Case ${kase.ref} advanced`,
        description: `${res.data?.transition.from ?? kase.state} → ${toState}${isReopen ? " (REOPEN)" : ""} recorded by ${actor.trim()}.`,
      });
      setNote("");
      setToState("");
      onSuccess();
    } else {
      toast({ title: "Transition rejected", description: res.error?.message ?? "Invalid transition.", variant: "destructive" });
    }
  }

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" /> Advance closed loop (M17)
        </span>
      }
      subtitle="Linear order with CANCELLED exit; RESOLVED may reopen to INVESTIGATING on regression. Server validates every transition."
    >
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Case journey</p>
        <MiniFlow state={kase.state} visited={visited} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="next-state">
            Next state (allowed from {kase.state})
          </label>
          <Select value={toState} onValueChange={setToState}>
            <SelectTrigger id="next-state" aria-label="Next state">
              <SelectValue placeholder="Select next state" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.to} value={o.to}>
                  {o.reopen ? "INVESTIGATING — REOPEN: condition regressed" : o.to.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="actor">
            Actor (recorded in audit trail)
          </label>
          <Input id="actor" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Ops Supervisor" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="transition-note">
            Note {noteRequired ? <span className="font-semibold text-rose-600 dark:text-rose-400">— closure evidence / reason (required)</span> : "(optional)"}
          </label>
          <Textarea
            id="transition-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={noteRequired ? "e.g. GRN-5003 read-back confirms full receipt; ledger reconciled" : "Context for the case timeline"}
            rows={3}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Every transition writes a CaseEvent and an append-only AuditEvent with a correlation id.
        </p>
        <Button type="button" onClick={submit} disabled={busy || !toState} className="min-h-9 shrink-0">
          {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          Submit transition
        </Button>
      </div>
    </SectionCard>
  );
}

/* ── Main view ── */
export function ExceptionsView({ drillRef }: { drillRef?: string | null }) {
  const drillTo = useAppStore((s) => s.drillTo);
  const list = useApi<{ cases: CaseRow[]; stateCounts: Record<string, number> }>("/api/exceptions");
  const [manualId, setManualId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const cases = useMemo(() => list.data?.cases ?? [], [list.data]);
  const counts = list.data?.stateCounts ?? {};
  const filtered = useMemo(() => (filter === "ALL" ? cases : cases.filter((c) => c.state === filter)), [cases, filter]);

  /* drillRef preselection is derived (no effect needed) — manual selection wins once the user clicks */
  const drillId = useMemo(() => (drillRef ? cases.find((c) => c.ref === drillRef)?.id ?? null : null), [drillRef, cases]);
  const selectedId = manualId ?? drillId;

  const detail = useApi<{ case: CaseDetail; evidence: EvidenceRow[] }>(selectedId ? `/api/exceptions/${selectedId}` : null);

  const kase = detail.data?.case ?? null;
  const evidence = detail.data?.evidence ?? [];

  return (
    <div className="space-y-4">
      {/* State machine strip */}
      <SectionCard
        title="Closed-loop state machine (M17)"
        subtitle="DETECTED → … → RESOLVED, CANCELLED exit at any non-terminal state, REOPEN on regression. Click a state to filter the queue."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            aria-pressed={filter === "ALL"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 transition",
              filter === "ALL" ? "border-foreground/30 bg-accent shadow-sm" : "border-transparent hover:bg-accent/50"
            )}
          >
            <span className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300">
              ALL
            </span>
            <span className="text-xs font-semibold tabular-nums">{cases.length}</span>
          </button>
          {ALL_CASE_STATES.map((s) => {
            const n = counts[s] ?? 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                aria-pressed={filter === s}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 transition",
                  filter === s ? "border-foreground/30 bg-accent shadow-sm" : "border-transparent hover:bg-accent/50"
                )}
              >
                <CaseStateBadge state={s} className={n === 0 && filter !== s ? "opacity-40" : undefined} />
                <span className="text-xs font-semibold tabular-nums">{n}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Master-detail */}
      <div className="grid items-start gap-4 xl:grid-cols-[420px_1fr]">
        {/* Master: case queue */}
        <SectionCard
          title={`Exception queue${filter !== "ALL" ? ` — ${filter.replaceAll("_", " ")}` : ""}`}
          subtitle={`${filtered.length} case${filtered.length === 1 ? "" : "s"} · SLA overdue highlighted`}
          bodyClass="pt-0"
        >
          {list.loading ? (
            <LoadingState />
          ) : list.error ? (
            <ErrorState message={list.error} />
          ) : filtered.length === 0 ? (
            <EmptyState message="No cases in this state" hint="Switch state chips above or advance a case through the loop." />
          ) : (
            <ScrollTable maxHeight="max-h-[560px]">
              <table className="w-full text-sm tabular-nums">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Ref</th>
                    <th className="py-2 pr-2 font-medium">Sev</th>
                    <th className="py-2 pr-2 font-medium">Category</th>
                    <th className="py-2 pr-2 font-medium">State</th>
                    <th className="py-2 pr-2 font-medium">Title</th>
                    <th className="py-2 pr-2 font-medium">Owner</th>
                    <th className="py-2 pr-2 font-medium">SLA due</th>
                    <th className="py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setManualId(c.id)}
                      onKeyDown={(e) => e.key === "Enter" && setManualId(c.id)}
                      tabIndex={0}
                      aria-selected={selectedId === c.id}
                      className={cn(
                        "cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/50",
                        selectedId === c.id && "bg-accent"
                      )}
                    >
                      <td className="py-2 pr-2 font-mono text-xs font-semibold">{c.ref}</td>
                      <td className="py-2 pr-2">
                        <SeverityBadge value={c.severity} />
                      </td>
                      <td className="py-2 pr-2">{chipClsChip(c.category)}</td>
                      <td className="py-2 pr-2">
                        <CaseStateBadge state={c.state} />
                      </td>
                      <td className="max-w-[220px] truncate py-2 pr-2" title={c.title}>
                        {c.title}
                      </td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">{c.ownerTeam ?? "—"}</td>
                      <td className={cn("py-2 pr-2 text-xs", isOverdue(c) ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                        {c.dueDate ? fmtRelative(c.dueDate) : "—"}
                        {isOverdue(c) ? " · overdue" : ""}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{fmtRelative(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTable>
          )}
        </SectionCard>

        {/* Detail panel */}
        <div className="space-y-4">
          {!selectedId ? (
            <Card>
              <CardContent className="py-2">
                <EmptyState message="Select a case from the queue" hint="The dossier shows evidence, actions, communications and the transition control." />
              </CardContent>
            </Card>
          ) : detail.loading && !kase ? (
            <Card>
              <CardContent>
                <LoadingState label="Loading case dossier…" />
              </CardContent>
            </Card>
          ) : detail.error ? (
            <Card>
              <CardContent>
                <ErrorState message={detail.error} />
              </CardContent>
            </Card>
          ) : kase ? (
            <>
              {/* a) Header */}
              <SectionCard
                title={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-bold">{kase.ref}</span>
                    <SeverityBadge value={kase.severity} />
                    <CaseStateBadge state={kase.state} />
                    {chipClsChip(kase.category)}
                  </span>
                }
                subtitle={kase.title}
              >
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Trigger / rule</dt>
                    <dd className="font-medium">
                      {kase.trigger ?? "—"} {kase.ruleVersion ? <span className="ml-1 font-mono text-xs text-muted-foreground">{kase.ruleVersion}</span> : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Entity</dt>
                    <dd className="flex flex-wrap items-center gap-1.5 font-medium">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{kase.entityType ?? "—"}</span>
                      <span className="font-mono text-xs">{kase.entityRef ?? kase.entityId ?? "—"}</span>
                      {kase.entityType === "shipment" && kase.entityRef ? (
                        <button type="button" className="inline-flex items-center gap-1 text-xs text-teal-700 underline-offset-2 hover:underline dark:text-teal-400" onClick={() => drillTo("import-tracking", kase.entityRef ?? undefined)}>
                          <Link2 className="h-3 w-3" /> open in Import Tracking
                        </button>
                      ) : null}
                      {kase.entityType === "bol" && kase.entityRef ? (
                        <button type="button" className="inline-flex items-center gap-1 text-xs text-teal-700 underline-offset-2 hover:underline dark:text-teal-400" onClick={() => drillTo("bol-intelligence", kase.entityRef ?? undefined)}>
                          <Link2 className="h-3 w-3" /> open in BOL Intelligence
                        </button>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Owner</dt>
                    <dd className="font-medium">
                      {kase.ownerTeam ?? "—"} {kase.ownerUser ? <span className="text-muted-foreground">/ {kase.ownerUser}</span> : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">SLA</dt>
                    <dd className={cn("font-medium", isOverdue(kase) && "text-rose-600 dark:text-rose-400")}>
                      {kase.slaHours ? `${kase.slaHours}h · ` : ""}
                      {kase.dueDate ? `due ${fmtDateTime(kase.dueDate)} (${fmtRelative(kase.dueDate)})` : "—"}
                      {isOverdue(kase) ? " · OVERDUE" : ""}
                    </dd>
                  </div>
                  {kase.supplier ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Linked supplier</dt>
                      <dd className="font-medium">
                        <span className="font-mono text-xs">{kase.supplier.code}</span> {kase.supplier.name}
                      </dd>
                    </div>
                  ) : null}
                  {kase.shipment ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Linked shipment</dt>
                      <dd className="font-medium">
                        <span className="font-mono text-xs">{kase.shipment.ref}</span> · {kase.shipment.status} · {kase.shipment.freshness}
                        {kase.shipment.displayEta ? ` · display ETA ${fmtDateTime(kase.shipment.displayEta)}` : ""}
                      </dd>
                    </div>
                  ) : null}
                  {kase.bol ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Linked BOL</dt>
                      <dd className="font-medium">
                        <span className="font-mono text-xs">{kase.bol.bolNo}</span> v{kase.bol.version} · {kase.bol.status} · {kase.bol.matchStatus}
                        {kase.bol.isActive ? " · active" : " · superseded"}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-muted-foreground">Timestamps</dt>
                    <dd className="text-xs text-muted-foreground">
                      created {fmtDateTime(kase.createdAt)} · updated {fmtDateTime(kase.updatedAt)}
                      {kase.closedAt ? ` · closed ${fmtDateTime(kase.closedAt)}` : ""}
                    </dd>
                  </div>
                  {kase.closureProof ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Closure proof</dt>
                      <dd className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{kase.closureProof}</dd>
                    </div>
                  ) : null}
                  {kase.reopenReason ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Reopen reason</dt>
                      <dd className="text-xs font-medium text-orange-700 dark:text-orange-400">{kase.reopenReason}</dd>
                    </div>
                  ) : null}
                </dl>
              </SectionCard>

              {/* b) Recommended action */}
              {kase.recommendedAction ? (
                <div className="rounded-lg border border-teal-300 bg-teal-50 p-4 dark:border-teal-400/25 dark:bg-teal-400/10">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> Recommended action (proposal — requires approval gateway M18)
                  </p>
                  <p className="mt-1 text-sm text-teal-900 dark:text-teal-200">{kase.recommendedAction}</p>
                </div>
              ) : null}

              {/* c) Evidence bundle */}
              <SectionCard
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-violet-700 dark:text-violet-400" /> Evidence bundle
                  </span>
                }
                subtitle="Every assertion traces to source evidence with content hash and issuer."
              >
                {parseArr(kase.evidenceRefs).length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {parseArr(kase.evidenceRefs).map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300">
                        <FileText className="h-3 w-3" /> {r}
                      </span>
                    ))}
                  </div>
                ) : null}
                {evidence.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No fetched source evidence rows linked to this entity.</p>
                ) : (
                  <ul className="space-y-2">
                    {evidence.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 px-2.5 py-2 text-xs">
                        <EvidenceBadge label={e.label} />
                        <span className="font-semibold">{e.sourceSystem}</span>
                        {e.issuer ? <span className="text-muted-foreground">issuer: {e.issuer}</span> : null}
                        {e.sourceRef ? <span className="font-mono text-muted-foreground">{e.sourceRef}</span> : null}
                        <span className="font-mono text-muted-foreground" title={e.contentHash ?? undefined}>
                          sha:{hash12(e.contentHash)}
                        </span>
                        <span className="ml-auto text-muted-foreground">received {fmtDateTime(e.receivedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* d) Transition control */}
              <TransitionPanel key={`${kase.id}-${kase.state}`} kase={kase} events={kase.events} onSuccess={() => { list.refresh(); detail.refresh(); }} />

              {/* e) Event history timeline */}
              <SectionCard
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <History className="h-4 w-4 text-teal-700 dark:text-teal-400" /> Event history
                  </span>
                }
                subtitle={`${kase.events.length} events, oldest first — append-only.`}
                bodyClass="pt-0"
              >
                {kase.events.length === 0 ? (
                  <EmptyState message="No events recorded" />
                ) : (
                  <ScrollTable maxHeight="max-h-80">
                    <ol className="space-y-2.5">
                      {kase.events.map((ev) => (
                        <li key={ev.id} className="flex flex-wrap items-start gap-2 text-xs">
                          <span className={chipCls(EVENT_TYPE_CLS[ev.type])}>{ev.type.replaceAll("_", " ")}</span>
                          {ev.fromState && ev.toState ? (
                            <span className="inline-flex items-center gap-1">
                              <CaseStateBadge state={ev.fromState} />
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <CaseStateBadge state={ev.toState} />
                            </span>
                          ) : null}
                          <span className="font-semibold">{ev.actor}</span>
                          <span className={chipCls("bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400")}>{ev.actorType}</span>
                          <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{fmtDateTime(ev.at)}</span>
                          {ev.note ? <p className="w-full whitespace-pre-wrap text-muted-foreground">{ev.note}</p> : null}
                        </li>
                      ))}
                    </ol>
                  </ScrollTable>
                )}
              </SectionCard>

              {/* f) Linked actions */}
              <SectionCard
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <Link2 className="h-4 w-4 text-orange-700 dark:text-orange-400" /> Linked actions
                  </span>
                }
                subtitle="Commands executed only through the action gateway (M18) after approval."
                bodyClass="pt-0"
              >
                {(kase.actions ?? []).length === 0 ? (
                  <EmptyState message="No action commands linked to this case" hint="Proposed actions appear here once investigation proposes one." />
                ) : (
                  <ul className="space-y-2">
                    {(kase.actions ?? []).map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 px-2.5 py-2 text-xs">
                        <span className="font-mono text-xs font-semibold">{a.ref}</span>
                        <span className="font-medium">{a.commandType.replaceAll("_", " ")}</span>
                        <span className={chipCls(RISK_CLS[a.riskLevel])}>{a.riskLevel === "HIGH_RISK" ? "HIGH RISK" : "SAFE"}</span>
                        <StatusPill value={a.state} />
                        {a.approvals?.length ? <span className="text-muted-foreground">{a.approvals.length} approval{a.approvals.length === 1 ? "" : "s"} recorded</span> : null}
                        <button
                          type="button"
                          className="ml-auto inline-flex items-center gap-1 text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                          onClick={() => drillTo("actions", a.ref)}
                        >
                          manage in Actions view <ArrowRight className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* g) Communications */}
              <SectionCard
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-violet-700 dark:text-violet-400" /> Communications (M19)
                  </span>
                }
                subtitle="Internal notes and external comms are separated; delivery evidence required before 'supplier contacted'."
                bodyClass="pt-0"
              >
                {kase.notifications.length === 0 ? (
                  <EmptyState message="No communications recorded for this case" />
                ) : (
                  <ScrollTable maxHeight="max-h-72">
                    <ul className="space-y-2">
                      {kase.notifications.map((n) => (
                        <li key={n.id} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={chipCls(CHANNEL_CLS[n.channel])}>{n.channel.replaceAll("_", " ")}</span>
                          <span className="font-medium">
                            {n.template} <span className="font-mono text-muted-foreground">{n.templateVersion}</span>
                          </span>
                          <span className="text-muted-foreground">to {n.recipient}</span>
                          <span className={chipCls(n.audienceType === "EXTERNAL" ? "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300" : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300")}>
                            {n.audienceType}
                          </span>
                          <span className={chipCls(NTF_STATE_CLS[n.state])}>{n.state}</span>
                          <span className="ml-auto tabular-nums text-muted-foreground">{fmtDateTime(n.at)}</span>
                          {n.note ? <p className="w-full whitespace-pre-wrap text-muted-foreground">{n.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </ScrollTable>
                )}
              </SectionCard>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* small local chip for category values */
function chipClsChip(v: string | null | undefined) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300">
      {v ?? "—"}
    </span>
  );
}
