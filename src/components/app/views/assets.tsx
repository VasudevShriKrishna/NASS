"use client";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  ClipboardList,
  FileCheck2,
  Gauge,
  MapPin,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApi } from "@/lib/client";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SeverityBadge,
  StatusPill,
  daysUntil,
  fmtDate,
  fmtDateTime,
  fmtRelative,
  parseArr,
  parseObj,
} from "@/components/app/shared";

/* ── /api/assets payload shapes ── */
interface TelemetryReading {
  id: string;
  metric: string;
  value: number;
  unit: string;
  eventTime: string;
  receivedAt: string;
  quality: string;
}
interface InspectionRow {
  id: string;
  type: string;
  dueDate: string | null;
  status: string;
  checklist: string | null;
  findings: string | null;
  evidence: string | null;
  completedAt: string | null;
  completedBy: string | null;
}
interface WorkOrderRow {
  id: string;
  ref: string;
  type: string;
  status: string;
  priority: string;
  dueDate: string | null;
  findings: string | null;
  partsRequired: string | null;
  owner: string | null;
  closeoutEvidence: string | null;
  rootCause: string | null;
  createdAt: string;
  closedAt: string | null;
}
interface SensorDef {
  type: string;
  unit: string;
  threshold: number;
}
interface CertDef {
  name: string;
  expiresAt: string;
}
interface PartReq {
  materialId?: string;
  description?: string;
  qty?: number;
  stockAvailable?: number;
}
interface AssetRow {
  id: string;
  tag: string;
  name: string;
  assetClass: string;
  site: string;
  location: string | null;
  owner: string | null;
  criticality: string;
  make: string | null;
  model: string | null;
  serialNo: string | null;
  condition: string;
  meterReading: number | null;
  meterUnit: string | null;
  warrantyTo: string | null;
  certificates: string | null;
  lastTelemetryAt: string | null;
  telemetryStale: boolean;
  sensors: string | null;
  spareParts: string | null;
  note: string | null;
  telemetry: TelemetryReading[];
  inspections: InspectionRow[];
  workOrders: WorkOrderRow[];
}

/* Monitoring class badge — distinct colors, class is exposed clearly (M15). */
const CLASS_STYLE: Record<string, string> = {
  TELEMETRY_CONNECTED:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
  INSPECTION_MONITORED: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  REGISTRY_ONLY: "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400",
  LOCATION_TRACKED: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300",
};

function AssetClassBadge({ value }: { value: string }) {
  const cls = CLASS_STYLE[value] ?? CLASS_STYLE.REGISTRY_ONLY;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex cursor-default items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}
        >
          {value.replaceAll("_", " ")}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">
        Monitoring class is exposed clearly — a registry-only asset is not &quot;real-time monitored&quot; (M15).
      </TooltipContent>
    </Tooltip>
  );
}

/* Condition: FAULT rose, MAINTENANCE_DUE amber, DEGRADED orange, HEALTHY emerald, UNKNOWN zinc. */
function ConditionPill({ value }: { value: string }) {
  let cls = "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300";
  if (value === "FAULT") cls = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
  else if (value === "MAINTENANCE_DUE") cls = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
  else if (value === "DEGRADED") cls = "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300";
  else if (value === "HEALTHY") cls = "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${cls}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

/* Work-order status: PARTS_PENDING rendered rose (blocked on spare parts). */
function WoStatusPill({ status }: { status: string }) {
  if (status === "PARTS_PENDING")
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
        PARTS PENDING
      </span>
    );
  return <StatusPill value={status} />;
}

function QualityChip({ quality }: { quality: string }) {
  const cls =
    quality === "BAD"
      ? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
      : "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return (
    <span className={`inline-flex items-center rounded-md border px-1 py-0.5 text-[9px] font-bold tracking-wide ${cls}`}>
      {quality}
    </span>
  );
}

function EvidenceChips({ refs }: { refs: string[] }) {
  return (
    <>
      {refs.map((e) => (
        <span key={e} className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 font-mono text-[10px]">
          <FileCheck2 className="h-3 w-3 text-emerald-600" /> {e}
        </span>
      ))}
    </>
  );
}

/* Telemetry block per asset card (M15 / Workflow D). */
function TelemetryBlock({ asset }: { asset: AssetRow }) {
  if (asset.telemetryStale) {
    return (
      <div className="flex items-start gap-1.5 rounded-md border border-rose-300 bg-rose-50 p-2 text-[11px] leading-relaxed text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="font-bold">TELEMETRY STALE</span> — last reading {fmtRelative(asset.lastTelemetryAt)}. Data-quality issue
          opened; condition is NOT asserted from missing data (M15/Workflow D).
        </span>
      </div>
    );
  }
  if (asset.telemetry.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        No telemetry observations — {asset.assetClass.replaceAll("_", " ").toLowerCase()} monitoring only; condition not asserted from
        live data.
      </p>
    );
  }
  const sensors = parseObj<SensorDef[]>(asset.sensors) ?? [];
  return (
    <div className="space-y-1">
      {asset.telemetry.slice(0, 3).map((t) => {
        const sensor = sensors.find((s) => s.type === t.metric);
        const over = sensor ? t.value > sensor.threshold : false;
        return (
          <div key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-muted-foreground">{t.metric.replaceAll("_", " ")}</span>
            <span className="flex flex-wrap items-center justify-end gap-1.5 tabular-nums">
              <span className={over ? "font-bold text-rose-600 dark:text-rose-400" : "font-semibold"}>
                {t.value} {t.unit}
              </span>
              {sensor && (
                <span className="text-[10px] text-muted-foreground">
                  max {sensor.threshold} {sensor.unit}
                </span>
              )}
              {t.quality !== "GOOD" && <QualityChip quality={t.quality} />}
              <span className="text-[10px] text-muted-foreground">{fmtRelative(t.eventTime)}</span>
            </span>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">
        Latest {Math.min(3, asset.telemetry.length)} of {asset.telemetry.length} observations · last received{" "}
        {fmtRelative(asset.telemetry[0]?.receivedAt)}
      </p>
    </div>
  );
}

export function AssetsView() {
  const { data, loading, error, asOf } = useApi<AssetRow[]>("/api/assets");

  const classCounts = (() => {
    const m = new Map<string, number>();
    for (const a of data ?? []) m.set(a.assetClass, (m.get(a.assetClass) ?? 0) + 1);
    return [...m.entries()];
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Assets &amp; condition monitoring</h2>
          <p className="text-xs text-muted-foreground">
            Registry, telemetry, inspections and maintenance work orders — monitoring class exposed clearly, never mislabeled (M15).
          </p>
        </div>
        <p className="text-[10px] tabular-nums text-muted-foreground">as of {fmtDateTime(asOf)}</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <EmptyState message="No assets available." />
      ) : (
        <>
          {/* Class legend with counts */}
          <div className="flex flex-wrap items-center gap-2">
            {classCounts.map(([cls, n]) => (
              <span key={cls} className="flex items-center gap-1">
                <AssetClassBadge value={cls} />
                <span className="text-[10px] tabular-nums text-muted-foreground">× {n}</span>
              </span>
            ))}
          </div>

          {/* Asset cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((a) => {
              const certs = parseObj<CertDef[]>(a.certificates) ?? [];
              const spares = parseObj<{ materialId: string; qty: number }[]>(a.spareParts) ?? [];
              return (
                <Card key={a.id} className="gap-0 p-4">
                  <CardContent className="space-y-3 p-0">
                    {/* header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold">{a.tag}</p>
                        <p className="text-sm font-medium leading-tight">{a.name}</p>
                      </div>
                      <AssetClassBadge value={a.assetClass} />
                    </div>

                    {/* meta */}
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {a.site}
                        {a.location ? ` · ${a.location}` : ""}
                      </p>
                      <p>Owner: {a.owner ?? "—"}</p>
                      <p>
                        {a.make ?? "?"} {a.model ?? ""} · S/N {a.serialNo ?? "—"}
                      </p>
                    </div>

                    {/* status row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SeverityBadge value={a.criticality} />
                      <ConditionPill value={a.condition} />
                      {a.meterReading != null && (
                        <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] tabular-nums">
                          <Gauge className="h-3 w-3 text-muted-foreground" /> {a.meterReading.toLocaleString()} {a.meterUnit}
                        </span>
                      )}
                      {a.warrantyTo && (
                        <span className="text-[10px] tabular-nums text-muted-foreground">warranty to {fmtDate(a.warrantyTo)}</span>
                      )}
                    </div>

                    {/* certificates */}
                    {certs.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {certs.map((c) => {
                          const d = daysUntil(c.expiresAt);
                          const expired = d !== null && d < 0;
                          const soon = d !== null && d >= 0 && d < 90;
                          const cls = expired
                            ? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : soon
                              ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
                          return (
                            <span key={c.name} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${cls}`}>
                              {c.name} · {fmtDate(c.expiresAt)}
                              {expired ? " · EXPIRED" : soon && d !== null ? ` · ${d}d` : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <Separator />

                    {/* telemetry */}
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <Activity className="h-3 w-3" /> Telemetry
                      </p>
                      <TelemetryBlock asset={a} />
                    </div>

                    <Separator />

                    {/* inspections */}
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <ClipboardList className="h-3 w-3" /> Inspections
                      </p>
                      {a.inspections.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No inspections recorded.</p>
                      ) : (
                        <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                          {a.inspections.map((ins) => {
                            const overdue =
                              !!ins.dueDate &&
                              (daysUntil(ins.dueDate) ?? 0) < 0 &&
                              ins.status !== "COMPLETED" &&
                              ins.status !== "REJECTED";
                            const evidence = parseArr(ins.evidence);
                            return (
                              <div key={ins.id} className="space-y-1 rounded-md border p-2 text-[11px]">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="font-semibold">{ins.type.replaceAll("_", " ")}</span>
                                  <span className="flex items-center gap-1.5">
                                    <span className={`tabular-nums ${overdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                                      due {fmtDate(ins.dueDate)}
                                    </span>
                                    <StatusPill value={ins.status} />
                                  </span>
                                </div>
                                {ins.status === "AWAITING_EVIDENCE" && (
                                  <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400">
                                    Completion without required evidence stays pending/rejected (M15).
                                  </p>
                                )}
                                {ins.findings && (
                                  <p className="truncate text-muted-foreground" title={ins.findings}>
                                    {ins.findings}
                                  </p>
                                )}
                                {evidence.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <EvidenceChips refs={evidence} />
                                  </div>
                                )}
                                {ins.completedAt && (
                                  <p className="tabular-nums text-[10px] text-muted-foreground">
                                    Completed {fmtDateTime(ins.completedAt)} by {ins.completedBy ?? "—"}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* work orders */}
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        <Wrench className="h-3 w-3" /> Work orders
                      </p>
                      {a.workOrders.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No work orders recorded.</p>
                      ) : (
                        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                          {a.workOrders.map((wo) => {
                            const parts = parseObj<PartReq[]>(wo.partsRequired);
                            const partList = parts && Array.isArray(parts) ? parts : [];
                            const closeout = parseArr(wo.closeoutEvidence);
                            const overdue =
                              !!wo.dueDate &&
                              (daysUntil(wo.dueDate) ?? 0) < 0 &&
                              !["CLOSED", "CANCELLED"].includes(wo.status);
                            return (
                              <div key={wo.id} className="space-y-1.5 rounded-md border p-2 text-[11px]">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="flex items-center gap-1 font-mono font-bold">
                                    <Wrench className="h-3 w-3 text-muted-foreground" /> {wo.ref}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <SeverityBadge value={wo.priority} />
                                    <WoStatusPill status={wo.status} />
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                  <span>{wo.type.replaceAll("_", " ")}</span>
                                  {wo.dueDate && (
                                    <span className={`tabular-nums ${overdue ? "font-bold text-rose-600 dark:text-rose-400" : ""}`}>
                                      due {fmtDate(wo.dueDate)}
                                    </span>
                                  )}
                                  <span>owner {wo.owner ?? "—"}</span>
                                </div>
                                {wo.findings && (
                                  <p className="truncate text-muted-foreground" title={wo.findings}>
                                    {wo.findings}
                                  </p>
                                )}
                                {partList.length > 0 && (
                                  <div className="space-y-1 rounded-md border bg-zinc-50/70 p-1.5 dark:bg-zinc-900/40">
                                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Parts required</p>
                                    {partList.map((p, i) => {
                                      const have = p.stockAvailable ?? 0;
                                      const need = p.qty ?? 0;
                                      const covered = have >= need;
                                      const partial = have > 0 && have < need;
                                      return (
                                        <div key={`${p.materialId ?? "part"}-${i}`} className="space-y-0.5">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="min-w-0 truncate" title={p.description ?? p.materialId}>
                                              {p.description ?? p.materialId}
                                            </span>
                                            <span className="shrink-0 tabular-nums text-muted-foreground">
                                              qty {need}
                                              {p.materialId ? <span className="ml-1 font-mono">({p.materialId})</span> : null}
                                            </span>
                                          </div>
                                          {covered ? (
                                            <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                              in stock ({have}/{need})
                                            </span>
                                          ) : partial ? (
                                            <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                              SHORT {need - have} — {have} on hand vs {need} required; replenishment via procurement approvals (no autonomous PO)
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                              NOT in stock — replenishment via procurement approvals (no autonomous PO)
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {closeout.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                      Closeout evidence
                                    </span>
                                    <EvidenceChips refs={closeout} />
                                  </div>
                                )}
                                {wo.rootCause && <p className="text-[10px] text-muted-foreground">Root cause: {wo.rootCause}</p>}
                                {wo.status === "CLOSED" && (
                                  <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    <BadgeCheck className="h-3 w-3" /> Closed {fmtDate(wo.closedAt)} — post-repair verification recorded
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* spare parts BOM + note */}
                    {(spares.length > 0 || a.note) && <Separator />}
                    {spares.length > 0 && (
                      <p className="text-[10px] tabular-nums text-muted-foreground">
                        BOM spare parts: {spares.map((s) => `${s.materialId} ×${s.qty}`).join(", ")}
                      </p>
                    )}
                    {a.note && (
                      <p className="rounded-md bg-zinc-50 p-2 text-[11px] italic leading-relaxed text-muted-foreground dark:bg-zinc-900/50">
                        {a.note}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
