"use client";

import { useMemo } from "react";
import { CalendarClock, Info, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApi } from "@/lib/client";
import {
  EmptyState,
  ErrorState,
  FreshnessBadge,
  LoadingState,
  ScrollTable,
  SectionCard,
  StatusPill,
  daysUntil,
  fmtDate,
  fmtDateTime,
} from "@/components/app/shared";

/* ── /api/projects payload shapes ── */
interface ProjectRow {
  id: string;
  code: string;
  name: string;
  site: string;
  workPackage: string | null;
  costCode: string | null;
  status: string;
  purchaseRequests: { ref: string; status: string }[];
}
interface LinkedShipment {
  ref: string;
  status: string;
  displayEta: string | null;
  freshness: string;
  poId: string | null;
}
interface RequirementRow {
  id: string;
  workPackage: string | null;
  quantity: number;
  uom: string;
  requiredOnSite: string;
  leadTimeDays: number | null;
  criticality: string;
  demandType: string;
  status: string;
  note: string | null;
  project: { code: string; name: string; site: string };
  material: { sku: string; name: string; uom: string };
  stockAvailable: number;
  inTransit: number;
  gap: number;
  linkedShipment: LinkedShipment | null;
}
interface ProjectsPayload {
  projects: ProjectRow[];
  requirements: RequirementRow[];
}

/* Countdown chip: overdue rose, <7d amber, else emerald. */
function CountdownChip({ iso }: { iso: string }) {
  const d = daysUntil(iso);
  if (d === null) return <span className="text-[10px] text-muted-foreground">no date</span>;
  if (d < 0)
    return (
      <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
        overdue {Math.abs(d)}d
      </span>
    );
  if (d < 7)
    return (
      <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        in {d}d
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
      in {d}d
    </span>
  );
}

/* Demand type: PLANNED zinc vs APPROVED teal — never conflated (M14). */
function DemandTypeBadge({ value }: { value: string }) {
  const cls =
    value === "APPROVED"
      ? "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300"
      : value === "CONSUMED"
        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
        : "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex cursor-default items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${cls}`}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">
        Planned requirement ≠ approved ≠ consumed (M14) — demand type is shown as recorded, never conflated with stock facts.
      </TooltipContent>
    </Tooltip>
  );
}

/* Requirement status: AT_RISK/SHORT rose, ALLOCATED amber, SATISFIED emerald, else standard pill. */
function ReqStatusPill({ value }: { value: string }) {
  if (value === "AT_RISK" || value === "SHORT")
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
        {value.replaceAll("_", " ")}
      </span>
    );
  if (value === "ALLOCATED")
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        ALLOCATED
      </span>
    );
  if (value === "SATISFIED")
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        SATISFIED
      </span>
    );
  return <StatusPill value={value} />;
}

function GapChip({ gap, uom }: { gap: number; uom: string }) {
  if (gap < 0)
    return (
      <span className="ml-1.5 inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
        shortfall {Math.abs(gap)} {uom}
      </span>
    );
  return (
    <span className="ml-1.5 inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
      covered +{gap}
    </span>
  );
}

export function ProjectsView() {
  const { data, loading, error, asOf } = useApi<ProjectsPayload>("/api/projects");

  const byProject = useMemo(() => {
    const m = new Map<string, RequirementRow[]>();
    for (const r of data?.requirements ?? []) {
      const arr = m.get(r.project.code) ?? [];
      arr.push(r);
      m.set(r.project.code, arr);
    }
    return m;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Projects &amp; material demand</h2>
          <p className="text-xs text-muted-foreground">
            Site demand vs on-hand stock vs in-transit supply — planned requirement ≠ approved ≠ consumed (M14).
          </p>
        </div>
        <p className="text-[10px] tabular-nums text-muted-foreground">as of {fmtDateTime(asOf)}</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <EmptyState message="No project records available." />
      ) : (
        <>
          {/* Project header cards */}
          <div className="grid gap-3 md:grid-cols-3">
            {data.projects.map((p) => (
              <Card key={p.id} className="gap-0 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold">{p.code}</p>
                  <StatusPill value={p.status} />
                </div>
                <p className="mt-1 text-sm font-medium leading-tight">{p.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.site}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {p.workPackage && (
                    <Badge variant="outline" className="text-[10px]">
                      {p.workPackage}
                    </Badge>
                  )}
                  {p.costCode && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {p.costCode}
                    </Badge>
                  )}
                  <span className="text-[10px] tabular-nums text-muted-foreground">{p.purchaseRequests.length} PR(s)</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Requirements per project */}
          {data.projects.map((p) => {
            const reqs = byProject.get(p.code) ?? [];
            return (
              <SectionCard
                key={p.id}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono">{p.code}</span>
                    <span className="text-muted-foreground">{p.name}</span>
                  </span>
                }
                subtitle={`${p.site}${p.workPackage ? ` · ${p.workPackage}` : ""}`}
                right={
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {reqs.length} requirement{reqs.length === 1 ? "" : "s"}
                  </span>
                }
              >
                {reqs.length === 0 ? (
                  <EmptyState message="No material requirements recorded for this project." />
                ) : (
                  <ScrollTable maxHeight="max-h-[380px]">
                    <Table className="min-w-[980px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Work package</TableHead>
                          <TableHead>Demand</TableHead>
                          <TableHead>Required on site</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Qty required</TableHead>
                          <TableHead>Stock vs required</TableHead>
                          <TableHead className="text-right">In transit</TableHead>
                          <TableHead>Linked shipment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reqs.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold">{r.material.sku}</span>
                              <span
                                className="block max-w-[180px] truncate text-[11px] text-muted-foreground"
                                title={`${r.material.name} · criticality ${r.criticality}`}
                              >
                                {r.material.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.workPackage ?? "—"}
                              {r.note && (
                                <span className="mt-0.5 block max-w-[190px] truncate text-[10px] text-muted-foreground" title={r.note}>
                                  {r.note}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DemandTypeBadge value={r.demandType} />
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1.5 text-xs">
                                <CalendarClock className="h-3 w-3 text-muted-foreground" />
                                <span className="tabular-nums">{fmtDate(r.requiredOnSite)}</span>
                              </span>
                              <span className="mt-0.5 block">
                                <CountdownChip iso={r.requiredOnSite} />
                              </span>
                            </TableCell>
                            <TableCell>
                              <ReqStatusPill value={r.status} />
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {r.quantity} <span className="text-[10px] font-normal text-muted-foreground">{r.uom}</span>
                              {r.leadTimeDays != null && (
                                <span className="block text-[10px] font-normal text-muted-foreground">lead {r.leadTimeDays}d</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              <span className="text-sm font-semibold">
                                {r.stockAvailable} <span className="text-[10px] font-normal text-muted-foreground">available</span>
                              </span>
                              <GapChip gap={r.gap} uom={r.uom} />
                            </TableCell>
                            <TableCell
                              className={
                                r.inTransit > 0
                                  ? "bg-violet-50/80 text-right tabular-nums dark:bg-violet-950/40"
                                  : "text-right tabular-nums"
                              }
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-flex cursor-default items-center gap-1 ${
                                      r.inTransit > 0 ? "font-semibold text-violet-700 dark:text-violet-300" : "text-muted-foreground"
                                    }`}
                                  >
                                    {r.inTransit} {r.uom}
                                    {r.inTransit > 0 && <Info className="h-3 w-3" />}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-56 text-xs">
                                  In-transit ≠ on-site — arriving supply is not project inventory yet (M12/M14).
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              {r.linkedShipment ? (
                                <div className="text-xs">
                                  <p className="flex items-center gap-1 font-mono font-semibold">
                                    <Ship className="h-3 w-3 text-teal-600" /> {r.linkedShipment.ref}
                                  </p>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                                    ETA {fmtDate(r.linkedShipment.displayEta)} <FreshnessBadge value={r.linkedShipment.freshness} />
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollTable>
                )}
              </SectionCard>
            );
          })}

          {/* M14 callout */}
          <Card className="border-teal-300/70 bg-teal-50/60 dark:border-teal-900/60 dark:bg-teal-950/20">
            <CardContent className="flex items-start gap-2 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <p className="text-xs leading-relaxed text-teal-900 dark:text-teal-200">
                Material delays put work packages at risk only when the relationship is evidenced by source records (M14).
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
