"use client";

import { useMemo } from "react";
import {
  AlarmClock,
  BellRing,
  FileWarning,
  PlugZap,
  RefreshCw,
  Ship,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import {
  CaseStateBadge,
  EmptyState,
  ErrorState,
  FreshnessBadge,
  KpiTile,
  LoadingState,
  ScrollTable,
  SectionCard,
  SeverityBadge,
  StatusPill,
  fmtDate,
  fmtDateTime,
  fmtRelative,
} from "@/components/app/shared";

/* ── Payload types (mirror /api/overview) ─────────────────────────────────── */
interface ShipmentRow {
  ref: string;
  status: string;
  mode: string;
  freshness: string;
  carrierEtaFreshness: string;
  displayEta: string | null;
  supplierPromisedEta: string | null;
  etaSlipped: boolean;
  lastEventAt: string | null;
}
interface ExceptionRow {
  id: string;
  ref: string;
  state: string;
  severity: string;
  category: string;
  title: string;
  dueDate: string | null;
}
interface RiskSignalRow {
  id: string;
  signalCode: string;
  entityType: string | null;
  entityRef: string | null;
  fact: string;
  interpretation: string | null;
  severity: string;
  calculatedAt: string;
  supplier?: { code: string; name: string } | null;
}
interface OverviewPayload {
  kpis: {
    activeShipments: number;
    freshness: { fresh: number; aging: number; stale: number; unavailable: number };
    openExceptions: number;
    overdueCases: { ref: string; title: string; dueDate: string | null }[];
    prPipeline: Record<string, number>;
    exceptionsByState: Record<string, number>;
    connectorHealth: { healthy: number; degraded: number; outage: number; total: number };
    bolStats: {
      verified: number;
      needsReview: number;
      reconciliationFailed: number;
      parsed: number;
      unmatched: number;
    };
    assetsFault: number;
    assetsTelemetryStale: number;
  };
  shipments: ShipmentRow[];
  exceptions: ExceptionRow[];
  riskSignals: RiskSignalRow[];
  stockSummary: Record<string, { lots: number; quantity: number }>;
}

const num = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
const isPast = (iso: string | null | undefined) => !!iso && new Date(iso).getTime() < Date.now();

/* ── Stacked freshness bar (fresh / aging / stale / unavailable) ──────────── */
function FreshnessBar({ counts }: { counts: OverviewPayload["kpis"]["freshness"] }) {
  const segs = [
    { key: "fresh", label: "Fresh", n: counts.fresh, dot: "bg-emerald-500" },
    { key: "aging", label: "Aging", n: counts.aging, dot: "bg-amber-400" },
    { key: "stale", label: "Stale", n: counts.stale, dot: "bg-orange-500" },
    { key: "unavailable", label: "Unavailable", n: counts.unavailable, dot: "bg-zinc-400" },
  ];
  const total = segs.reduce((a, s) => a + s.n, 0);
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Freshness distribution: ${segs.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(", ")}`}
      >
        {total > 0
          ? segs.map((s) =>
              s.n > 0 ? (
                <div
                  key={s.key}
                  className={s.dot}
                  style={{ width: `${(s.n / total) * 100}%` }}
                  title={`${s.label}: ${s.n}`}
                />
              ) : null
            )
          : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
            {s.label}
            <span className="font-semibold tabular-nums text-foreground">{s.n}</span>
          </span>
        ))}
        <span className="ml-auto tabular-nums">{total} shipments</span>
      </div>
    </div>
  );
}

/* ── View ─────────────────────────────────────────────────────────────────── */
export function ControlTowerView({ drillRef }: { drillRef?: string | null }) {
  const { data, loading, error, asOf, refresh } = useApi<OverviewPayload>("/api/overview", [], 60_000);
  const drillTo = useAppStore((s) => s.drillTo);

  const stockOrder = useMemo(
    () => ["available", "reserved", "quarantined", "damaged", "inTransit", "inspectionPending"],
    []
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-wide">Control Tower</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Data as of <span className="font-medium text-foreground">{fmtDateTime(asOf)}</span> · every figure drills to
            row-level records
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {data ? (
        <>
          {/* KPI tiles — M21: every tile drills to row-level records */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiTile
              label="Active shipments"
              value={data.kpis.activeShipments}
              icon={<Ship className="h-4 w-4 text-muted-foreground" />}
              onClick={() => drillTo("import-tracking")}
            />
            <KpiTile
              label="Open exceptions"
              value={data.kpis.openExceptions}
              tone={data.kpis.openExceptions > 0 ? "bad" : "good"}
              sub={`${Object.keys(data.kpis.exceptionsByState).length} distinct states`}
              icon={<BellRing className="h-4 w-4 text-muted-foreground" />}
              onClick={() => drillTo("exceptions")}
            />
            <KpiTile
              label="Overdue cases"
              value={data.kpis.overdueCases.length}
              tone={data.kpis.overdueCases.length > 0 ? "bad" : "good"}
              sub={data.kpis.overdueCases[0] ? `e.g. ${data.kpis.overdueCases[0].ref}` : "none past due date"}
              icon={<AlarmClock className="h-4 w-4 text-muted-foreground" />}
              onClick={() => drillTo("exceptions")}
            />
            <KpiTile
              label="Connector health"
              value={`${data.kpis.connectorHealth.healthy}/${data.kpis.connectorHealth.total}`}
              tone={data.kpis.connectorHealth.outage > 0 ? "warn" : data.kpis.connectorHealth.total > 0 ? "good" : "default"}
              sub={`${data.kpis.connectorHealth.degraded} degraded · ${data.kpis.connectorHealth.outage} outage`}
              icon={<PlugZap className="h-4 w-4 text-muted-foreground" />}
              onClick={() => drillTo("governance")}
            />
            <KpiTile
              label="BOL needs review"
              value={data.kpis.bolStats.needsReview}
              tone={data.kpis.bolStats.needsReview > 0 ? "warn" : "good"}
              sub={`${data.kpis.bolStats.reconciliationFailed} recon failed · ${data.kpis.bolStats.unmatched} unmatched`}
              icon={<FileWarning className="h-4 w-4 text-muted-foreground" />}
              onClick={() => drillTo("bol-intelligence")}
            />
            <KpiTile
              label="Asset faults"
              value={data.kpis.assetsFault}
              tone={data.kpis.assetsFault > 0 ? "bad" : "good"}
              sub={`${data.kpis.assetsTelemetryStale} telemetry stale`}
              icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
              onClick={() => drillTo("assets")}
            />
          </div>

          {/* Shipment freshness + register */}
          <SectionCard
            title="Shipment freshness"
            subtitle="Freshness classes are never merged — stale and unavailable are never shown as current"
            bodyClass="space-y-4"
          >
            <FreshnessBar counts={data.kpis.freshness} />
            {data.shipments.length === 0 ? (
              <EmptyState message="No shipments recorded" />
            ) : (
              <ScrollTable maxHeight="max-h-[360px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Freshness</TableHead>
                      <TableHead>Carrier ETA</TableHead>
                      <TableHead>ETA vs supplier promise</TableHead>
                      <TableHead>Last event</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.shipments.map((s) => (
                      <TableRow
                        key={s.ref}
                        className={drillRef === s.ref ? "cursor-pointer bg-primary/10 outline outline-1 outline-primary/25" : "cursor-pointer"}
                        onClick={() => drillTo("import-tracking", s.ref)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && drillTo("import-tracking", s.ref)}
                        aria-label={`Open shipment ${s.ref}`}
                      >
                        <TableCell className="font-mono text-xs font-semibold">{s.ref}</TableCell>
                        <TableCell>
                          <StatusPill value={s.status} />
                        </TableCell>
                        <TableCell className="text-xs uppercase text-muted-foreground">{s.mode}</TableCell>
                        <TableCell>
                          <FreshnessBadge value={s.freshness} />
                        </TableCell>
                        <TableCell>
                          <FreshnessBadge value={s.carrierEtaFreshness} />
                        </TableCell>
                        <TableCell className="whitespace-normal align-top">
                          <div className="flex flex-col gap-1">
                            {s.etaSlipped ? (
                              <span className="inline-flex w-fit items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
                                SLIPPED vs supplier promise
                              </span>
                            ) : null}
                            <span className="text-xs tabular-nums">
                              display <span className="font-medium">{fmtDate(s.displayEta)}</span>
                            </span>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              promised {fmtDate(s.supplierPromisedEta)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {fmtRelative(s.lastEventAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollTable>
            )}
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            {/* Open exception queue */}
            <SectionCard
              title="Open exception queue"
              subtitle="Closed-loop cases — DETECTED to RESOLVED, never auto-closed silently"
              bodyClass="p-0"
            >
              {data.exceptions.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState message="No open exceptions" hint="All cases resolved or cancelled" />
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto px-4 pb-4">
                  <div className="flex flex-col gap-2 pt-1">
                    {data.exceptions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => drillTo("exceptions", c.ref)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${
                          drillRef === c.ref ? "border-primary/50 bg-primary/10" : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{c.ref}</span>
                          <CaseStateBadge state={c.state} />
                          <SeverityBadge value={c.severity} />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {c.category}
                          </span>
                          <span
                            className={`ml-auto text-[11px] tabular-nums ${
                              isPast(c.dueDate) ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                            }`}
                          >
                            due {fmtRelative(c.dueDate)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{c.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Risk signals — fact vs interpretation kept visually separate (M16) */}
            <SectionCard
              title="Risk signals (fact vs interpretation)"
              subtitle="The observed fact and the derived interpretation are never conflated"
            >
              {data.riskSignals.length === 0 ? (
                <EmptyState message="No active risk signals" />
              ) : (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {data.riskSignals.map((r, i) => (
                    <div key={r.id}>
                      {i > 0 ? <Separator className="mb-3" /> : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge value={r.severity} />
                        <span className="font-mono text-xs font-semibold">{r.signalCode}</span>
                        {r.entityType && r.entityRef ? (
                          <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {r.entityType} {r.entityRef}
                          </span>
                        ) : null}
                        {r.supplier ? (
                          <span className="text-[10px] text-muted-foreground">
                            supplier <span className="font-medium text-foreground">{r.supplier.code}</span>
                          </span>
                        ) : null}
                        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                          calculated {fmtRelative(r.calculatedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium leading-snug">{r.fact}</p>
                      {r.interpretation ? (
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">
                          <span className="font-semibold uppercase tracking-wide">Interpretation:</span> {r.interpretation}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* PR pipeline + stock summary */}
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="PR pipeline"
              subtitle="Purchase requests by state — counts only, drill to Procurement for records"
            >
              <div className="flex flex-wrap items-center gap-2">
                {Object.keys(data.kpis.prPipeline).length === 0 ? (
                  <EmptyState message="No purchase requests" />
                ) : (
                  Object.entries(data.kpis.prPipeline).map(([status, count]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => drillTo("procurement")}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 transition-colors hover:bg-muted"
                    >
                      <StatusPill value={status} />
                      <span className="text-xs font-bold tabular-nums">{count}</span>
                    </button>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Stock summary"
              subtitle="On-site inventory by lot status — quantities in stock UoM"
              right={
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {Object.values(data.stockSummary).reduce((a, s) => a + s.lots, 0)} lots total
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {stockOrder.map((k) => {
                  const v = data.stockSummary[k] ?? { lots: 0, quantity: 0 };
                  const label =
                    k === "inTransit" ? "IN_TRANSIT" : k === "inspectionPending" ? "INSPECTION_PENDING" : k.toUpperCase();
                  return (
                    <div key={k} className="rounded-lg border p-2">
                      <StatusPill value={label} />
                      <p className="mt-1.5 text-sm font-semibold tabular-nums">{num(v.quantity)}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{v.lots} lots</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] italic text-muted-foreground">in-transit is never on-site stock</p>
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
