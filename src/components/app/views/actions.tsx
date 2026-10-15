"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Check, KeyRound, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useApi, postJson } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScrollTable,
  SectionCard,
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

/* ── Action state machine (§13.1) ── */
const ACTION_MAIN = ["DRAFT", "POLICY_CHECK", "AWAITING_APPROVAL", "AUTHORIZED", "SUBMITTED", "ACKNOWLEDGED", "PENDING_VERIFICATION", "VERIFIED"];
const ACTION_SIDE = ["FAILED", "COMPENSATION_REQUIRED", "CANCELLED"];

/* ── Chip palettes ── */
const RISK_CLS: Record<string, string> = {
  SAFE: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
  HIGH_RISK: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
};
const POLICY_CLS: Record<string, string> = {
  ALLOW: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
  REVIEW: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  DENY: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
};
const CHANNEL_CLS: Record<string, string> = {
  IN_APP: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300",
  EMAIL: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300",
  SMS_WHATSAPP: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  SUPPLIER_PORTAL: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300",
};
const NTF_STATE_CLS: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
  SENT: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  QUEUED: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400",
  FAILED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
  BOUNCED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
};

function chipCls(cls: string | undefined) {
  return cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", cls ?? "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300");
}

function humanize(v: string | null | undefined) {
  return (v ?? "").replaceAll("_", " ");
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
    <div className="space-y-3 rounded-lg border border-teal-300 bg-teal-50/60 p-3 dark:border-teal-800 dark:bg-teal-950/40">
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
        <Button type="button" disabled={busy !== null} onClick={() => decide("REJECTED")} variant="outline" className="border-rose-400 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950">
          {busy === "REJECTED" ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
          Reject
        </Button>
      </div>
      <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
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
  const [manualId, setManualId] = useState<string | null>(null);

  const actions = useMemo(() => actionsApi.data ?? [], [actionsApi.data]);

  /* drillRef preselection is derived (no effect needed) — manual selection wins once the user clicks */
  const drillId = useMemo(() => (drillRef ? actions.find((a) => a.ref === drillRef)?.id ?? null : null), [drillRef, actions]);
  const selectedId = manualId ?? drillId;

  const selected = actions.find((a) => a.id === selectedId) ?? null;
  const mainIdx = selected ? ACTION_MAIN.indexOf(selected.state) : -1;
  const notifications = notificationsApi.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[420px_1fr]">
        {/* Master: action cards */}
        <SectionCard
          title="Action gateway queue (M18)"
          subtitle={`${actions.length} command${actions.length === 1 ? "" : "s"} · every external write flows through here`}
          bodyClass="pt-0"
        >
          {actionsApi.loading ? (
            <LoadingState />
          ) : actionsApi.error ? (
            <ErrorState message={actionsApi.error} />
          ) : actions.length === 0 ? (
            <EmptyState message="No action commands recorded" />
          ) : (
            <ScrollTable maxHeight="max-h-[620px]">
              <ul className="space-y-2">
                {actions.map((a) => (
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
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Action state machine (§13.1)</p>
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
                        <span className="inline-flex cursor-help items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
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
                <DecisionPanel key={`${selected.id}-${selected.state}-${selected.approvals.length}`} action={selected} onDone={() => actionsApi.refresh()} />
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
                    <p className="mt-2 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Failure reason: {selected.failureReason}
                    </p>
                  ) : null}
                  {selected.compensation ? (
                    <p className="mt-2 rounded-md border border-orange-300 bg-orange-50 px-2.5 py-2 text-xs text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300">
                      Compensation: {selected.compensation}
                    </p>
                  ) : null}
                </SectionCard>
              ) : null}
            </>
          )}
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
                      <span className={chipCls(n.audienceType === "EXTERNAL" ? "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300" : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300")}>
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
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Delivery evidence is required before &quot;supplier contacted&quot;; retries are idempotent (M19).
        </p>
      </SectionCard>
    </div>
  );
}
