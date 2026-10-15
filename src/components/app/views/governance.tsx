"use client";

import { useMemo } from "react";
import { Activity, Fingerprint, PlugZap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/client";
import {
  EvidenceBadge,
  FreshnessBadge,
  LoadingState,
  ScrollTable,
  SectionCard,
  StatusPill,
  fmtDateTime,
  fmtRelative,
} from "@/components/app/shared";

/* ── Types (mirror API payloads) ── */
interface ConnectorRow {
  id: string;
  name: string;
  category: string;
  mode: string;
  status: string;
  freshnessClass: string;
  lastSyncAt: string | null;
  latencyMs: number | null;
  failedRecords: number;
  retryQueue: number;
  deadLetter: number;
  apiQuotaPct: number | null;
  coverageNote: string | null;
  evidenceLabel: string;
}
interface AuditRow {
  id: string;
  at: string;
  actor: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  entityRef: string | null;
  previousState: string | null;
  newState: string | null;
  diff: string | null;
  reason: string | null;
  correlationId: string | null;
  sourceRecord: string | null;
  ruleVersion: string | null;
  approvalId: string | null;
}
interface EvidenceRow {
  id: string;
  entityType: string;
  entityId: string;
  entityRef: string | null;
  sourceSystem: string;
  sourceRef: string | null;
  contentHash: string | null;
  issuer: string | null;
  receivedAt: string;
  label: string;
  extractionVersion: string | null;
  fieldConfidence: string | null;
  originalOrDerived: string;
  retentionClass: string;
  note: string | null;
}

function chipCls(cls: string) {
  return cn("inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", cls);
}
const ZINC_CHIP = "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300";
const ROSE_CHIP = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-400/10 dark:text-rose-300";
const CAT_CLS: Record<string, string> = {
  ERP: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300",
  WMS: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300",
  CARRIER: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  AIS: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-400/10 dark:text-orange-300",
  PORT: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-400/10 dark:text-violet-300",
  EMAIL: "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300",
  IOT: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300",
  CUSTOMS: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-400/10 dark:text-orange-300",
  FORWARDER: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300",
  CMMS: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300",
};
function hash12(h: string | null | undefined) {
  if (!h) return "—";
  return h.length > 14 ? `${h.slice(0, 14)}…` : h;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
      {children}
    </p>
  );
}

/* ── Integration health tab ── */
function IntegrationHealth() {
  const api = useApi<ConnectorRow[]>("/api/connectors");
  const connectors = api.data ?? [];
  const health = useMemo(() => {
    const counts = { HEALTHY: 0, DEGRADED: 0, OUTAGE: 0, DISABLED: 0 } as Record<string, number>;
    for (const c of connectors) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [connectors]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className={chipCls("bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300")}>
          <span className="font-bold">HEALTHY</span>&nbsp;<span className="tabular-nums">{health.HEALTHY ?? 0}</span>
        </span>
        <span className={chipCls("bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-400/10 dark:text-amber-300")}>
          <span className="font-bold">DEGRADED</span>&nbsp;<span className="tabular-nums">{health.DEGRADED ?? 0}</span>
        </span>
        <span className={chipCls(ROSE_CHIP)}>
          <span className="font-bold">OUTAGE</span>&nbsp;<span className="tabular-nums">{health.OUTAGE ?? 0}</span>
        </span>
        <span className={chipCls(ZINC_CHIP)}>
          <span className="font-bold">DISABLED</span>&nbsp;<span className="tabular-nums">{health.DISABLED ?? 0}</span>
        </span>
      </div>

      {api.loading ? (
        <LoadingState />
      ) : api.error ? (
        <p className="text-sm text-destructive">{api.error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {connectors.map((c) => (
            <SectionCard
              key={c.id}
              title={c.name}
              subtitle={
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className={chipCls(CAT_CLS[c.category] ?? ZINC_CHIP)}>{c.category}</span>
                  <span className={chipCls(ZINC_CHIP)}>{c.mode}</span>
                </span>
              }
              right={<StatusPill value={c.status} />}
            >
              <div className="space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <FreshnessBadge value={c.freshnessClass} />
                  <span className="text-muted-foreground">
                    last sync {c.lastSyncAt ? fmtRelative(c.lastSyncAt) : "never"}
                    {c.lastSyncAt ? ` (${fmtDateTime(c.lastSyncAt)})` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 tabular-nums">
                  <span>
                    latency <span className="font-semibold">{c.latencyMs != null ? `${c.latencyMs} ms` : "—"}</span>
                  </span>
                  <span className={c.failedRecords > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                    failed <span className="font-semibold">{c.failedRecords}</span>
                  </span>
                  <span className={c.retryQueue > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                    retry <span className="font-semibold">{c.retryQueue}</span>
                  </span>
                  <span className={c.deadLetter > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                    DLQ <span className="font-semibold">{c.deadLetter}</span>
                  </span>
                </div>
                {c.apiQuotaPct != null ? (
                  <div>
                    <div className="mb-1 flex justify-between text-muted-foreground">
                      <span>API quota</span>
                      <span className={cn("font-semibold tabular-nums", c.apiQuotaPct >= 90 && "text-rose-600 dark:text-rose-400")}>{c.apiQuotaPct}%</span>
                    </div>
                    <Progress value={c.apiQuotaPct} aria-label={`${c.name} API quota ${c.apiQuotaPct}%`} />
                  </div>
                ) : null}
                {c.coverageNote ? <p className="text-muted-foreground">{c.coverageNote}</p> : null}
                <EvidenceBadge label={c.evidenceLabel} />
              </div>
            </SectionCard>
          ))}
        </div>
      )}
      <Callout>
        <span className="inline-flex items-center gap-1.5">
          <PlugZap className="inline h-3.5 w-3.5" /> Connector isolation — one source cannot stall all ingest (circuit breaker §12.2).
        </span>
      </Callout>
    </div>
  );
}

/* ── Audit trail tab ── */
function AuditTrail() {
  const api = useApi<AuditRow[]>("/api/audit");
  const events = api.data ?? [];
  return (
    <SectionCard title={`Append-only audit trail — ${events.length} events`} subtitle="Actor, action, entity, prior/new state, reason, correlation id, rule version (§8.1 #24)." bodyClass="pt-0">
      {api.loading ? (
        <LoadingState />
      ) : api.error ? (
        <p className="text-sm text-destructive">{api.error}</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">No audit events recorded.</p>
      ) : (
        <ScrollTable maxHeight="max-h-[560px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-medium">At</th>
                <th className="py-2 pr-2 font-medium">Actor</th>
                <th className="py-2 pr-2 font-medium">Action</th>
                <th className="py-2 pr-2 font-medium">Entity</th>
                <th className="py-2 pr-2 font-medium">Prev → New</th>
                <th className="py-2 pr-2 font-medium">Reason</th>
                <th className="py-2 pr-2 font-medium">Correlation</th>
                <th className="py-2 font-medium">Rule</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border/60 align-top">
                  <td className="whitespace-nowrap py-2 pr-2 text-muted-foreground">{fmtDateTime(e.at)}</td>
                  <td className="py-2 pr-2">
                    <span className="font-semibold">{e.actor}</span>{" "}
                    <span className={chipCls(ZINC_CHIP)}>{e.actorType}</span>
                  </td>
                  <td className="py-2 pr-2 font-mono font-bold">{e.action}</td>
                  <td className="py-2 pr-2">
                    {e.entityType} {e.entityRef ? <span className="font-mono">{e.entityRef}</span> : null}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2">
                    {e.previousState || e.newState ? (
                      <>
                        <span className="text-rose-600 dark:text-rose-400">{e.previousState ?? "—"}</span>
                        <span className="mx-1">→</span>
                        <span className="text-emerald-700 dark:text-emerald-400">{e.newState ?? "—"}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[220px] py-2 pr-2 text-muted-foreground">{e.reason ?? "—"}</td>
                  <td className="py-2 pr-2 font-mono text-muted-foreground">{e.correlationId ?? "—"}</td>
                  <td className="py-2 font-mono text-muted-foreground">{e.ruleVersion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
      )}
      <Callout>
        <span className="inline-flex items-center gap-1.5">
          <Fingerprint className="inline h-3.5 w-3.5" /> Append-only audit trail (M22) — minimum fields per §8.1 #24.
        </span>
      </Callout>
    </SectionCard>
  );
}

/* ── Evidence registry tab ── */
function EvidenceRegistry() {
  const api = useApi<EvidenceRow[]>("/api/evidence");
  const rows = api.data ?? [];
  return (
    <SectionCard title={`Source evidence registry — ${rows.length} records`} subtitle="Provenance, content hash, issuer, extraction version and retention class (§8.1 #21)." bodyClass="pt-0">
      {api.loading ? (
        <LoadingState />
      ) : api.error ? (
        <p className="text-sm text-destructive">{api.error}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No evidence records.</p>
      ) : (
        <ScrollTable maxHeight="max-h-[560px]">
          <table className="w-full text-xs tabular-nums">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Entity</th>
                <th className="py-2 pr-2 font-medium">Source system</th>
                <th className="py-2 pr-2 font-medium">Issuer</th>
                <th className="py-2 pr-2 font-medium">Received</th>
                <th className="py-2 pr-2 font-medium">Label</th>
                <th className="py-2 pr-2 font-medium">Orig/Derived</th>
                <th className="py-2 pr-2 font-medium">Retention</th>
                <th className="py-2 pr-2 font-medium">Hash</th>
                <th className="py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-2">
                    {r.entityType} {r.entityRef ? <span className="font-mono">{r.entityRef}</span> : null}
                  </td>
                  <td className="py-2 pr-2 font-semibold">{r.sourceSystem}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{r.issuer ?? "—"}</td>
                  <td className="whitespace-nowrap py-2 pr-2 text-muted-foreground">{fmtDateTime(r.receivedAt)}</td>
                  <td className="py-2 pr-2">
                    <EvidenceBadge label={r.label} />
                  </td>
                  <td className="py-2 pr-2">
                    <span className={chipCls(r.originalOrDerived === "ORIGINAL" ? "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300" : ZINC_CHIP)}>
                      {r.originalOrDerived}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <span className={chipCls(r.retentionClass === "LEGAL_HOLD" ? ROSE_CHIP : ZINC_CHIP)}>{r.retentionClass}</span>
                  </td>
                  <td className="py-2 pr-2 font-mono text-muted-foreground" title={r.contentHash ?? undefined}>
                    {hash12(r.contentHash)}
                  </td>
                  <td className="max-w-[240px] py-2 text-muted-foreground">{r.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
      )}
    </SectionCard>
  );
}

/* ── Governance view ── */
export function GovernanceView() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="health">
        <TabsList aria-label="Governance sections">
          <TabsTrigger value="health">
            <Activity className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Integration Health
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Registry</TabsTrigger>
        </TabsList>
        <TabsContent value="health" className="mt-4">
          <IntegrationHealth />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditTrail />
        </TabsContent>
        <TabsContent value="evidence" className="mt-4">
          <EvidenceRegistry />
        </TabsContent>
      </Tabs>
    </div>
  );
}
