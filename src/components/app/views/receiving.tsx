"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Camera,
  ChevronDown,
  CircleCheck,
  ClipboardCheck,
  FileImage,
  FolderKanban,
  FolderOpen,
  Inbox,
  ScanSearch,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import {
  EmptyState,
  ErrorState,
  KpiTile,
  LoadingState,
  ScrollTable,
  SectionCard,
  StatusPill,
  fmtDateTime,
  parseArr,
} from "@/components/app/shared";

/* ── /api/receipts payload shape ── */
interface Receipt {
  id: string;
  ref: string;
  status: string;
  expectedQty: number;
  receivedQty: number;
  uom: string;
  qcResult: string | null;
  discrepancyType: string | null;
  discrepancyQty: number | null;
  photos: string | null;
  receivedBy: string | null;
  receivedAt: string;
  note: string | null;
  grnNo: string | null;
  poLine: { po: { ref: string }; material: { sku: string; name: string } } | null;
  shipment: { ref: string; status: string } | null;
  warehouse: { code: string; name: string };
  material: { sku: string; name: string; uom: string };
}

/* Workflow C — Detect → Evidence capture → Owner assigned → Supplier case →
   Approved claim/adjustment → Verified correction → Close with proof (M13). */
const WORKFLOW_C_STEPS = [
  { label: "Detect", icon: Search },
  { label: "Evidence capture", icon: Camera },
  { label: "Owner assigned", icon: UserCheck },
  { label: "Supplier case", icon: FolderKanban },
  { label: "Approved claim / adjustment", icon: ClipboardCheck },
  { label: "Verified correction", icon: BadgeCheck },
  { label: "Close with proof", icon: CircleCheck },
];

export function ReceivingView() {
  const { data, loading, error, asOf } = useApi<Receipt[]>("/api/receipts");
  const drillTo = useAppStore((s) => s.drillTo);
  const [openId, setOpenId] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const receipts = data ?? [];
    return {
      total: receipts.length,
      discrepancies: receipts.filter((r) => r.discrepancyType && r.discrepancyType !== "NONE").length,
      pendingQc: receipts.filter((r) => r.qcResult === "PENDING" || r.status === "RECEIVED_PENDING_QC").length,
      closed: receipts.filter((r) => r.status === "CLOSED").length,
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Receiving &amp; QC</h2>
          <p className="text-xs text-muted-foreground">
            Goods receipts, discrepancies and the closed loop from detection to verified correction (M13 / Workflow C).
          </p>
        </div>
        <p className="text-[10px] tabular-nums text-muted-foreground">as of {fmtDateTime(asOf)}</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <EmptyState message="No receipts available." />
      ) : (
        <>
          {/* KPI chips */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile label="Total receipts" value={kpis.total} icon={<Inbox className="h-4 w-4 text-zinc-500" />} sub="all GRNs incl. deduped webhooks" />
            <KpiTile
              label="Discrepancies"
              value={kpis.discrepancies}
              tone={kpis.discrepancies > 0 ? "bad" : "good"}
              icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
              sub="short / damaged / wrong item vs packing list"
            />
            <KpiTile
              label="Pending QC"
              value={kpis.pendingQc}
              tone={kpis.pendingQc > 0 ? "warn" : "default"}
              icon={<ScanSearch className="h-4 w-4 text-amber-600" />}
              sub="received but not yet dispositioned"
            />
            <KpiTile
              label="Closed loop"
              value={kpis.closed}
              tone="good"
              icon={<CircleCheck className="h-4 w-4 text-emerald-600" />}
              sub="status CLOSED with reconciliation proof"
            />
          </div>

          {/* Workflow C — closed-loop strip */}
          <SectionCard
            title="Closed-loop receiving — Workflow C"
            subtitle="Every discrepancy follows the same loop; closure requires a verified postcondition, not an assumption."
            right={
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => drillTo("exceptions", "EX-9007")}>
                <FolderOpen className="h-3.5 w-3.5" /> Open case EX-9007
              </Button>
            }
          >
            <ol className="flex flex-wrap items-start justify-center gap-x-1 gap-y-3 md:justify-between">
              {WORKFLOW_C_STEPS.map((s, i) => {
                const pending = i === 5; // EX-9007 sits at ACTION_SUBMITTED — outcome pending verification
                const Icon = s.icon;
                return (
                  <li key={s.label} className="flex items-start gap-1">
                    <div className="flex w-[92px] flex-col items-center gap-1 text-center">
                      <span
                        className={
                          pending
                            ? "flex h-9 w-9 items-center justify-center rounded-full border border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-200 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25"
                            : "flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-400"
                        }
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-medium leading-tight text-muted-foreground">{s.label}</span>
                      {pending && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          EX-9007 pending here
                        </span>
                      )}
                    </div>
                    {i < WORKFLOW_C_STEPS.length - 1 && <ArrowRight className="mt-2.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />}
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 rounded-md border border-amber-300/70 bg-amber-50/60 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
              EX-9007 (GRN-5003) is at ACTION_SUBMITTED — outcome pending verification; closure requires verified postcondition (M13).
            </p>
          </SectionCard>

          {/* Receipts table with expandable detail */}
          <SectionCard title="Goods receipts" subtitle="Expected vs received, QC result and discrepancy type — expand a row for evidence and notes.">
            {data.length === 0 ? (
              <EmptyState message="No goods receipts recorded." />
            ) : (
              <ScrollTable maxHeight="max-h-[560px]">
                <Table className="min-w-[1020px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" aria-label="Expand row" />
                      <TableHead>GRN</TableHead>
                      <TableHead>PO</TableHead>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Expected vs received</TableHead>
                      <TableHead>QC</TableHead>
                      <TableHead>Discrepancy</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((r) => {
                      const open = openId === r.id;
                      const hasDisc = !!r.discrepancyType && r.discrepancyType !== "NONE";
                      const short = r.discrepancyType === "SHORT";
                      const deduped = !!r.note && r.note.toLowerCase().includes("deduplicat");
                      const photos = parseArr(r.photos);
                      return (
                        <Fragment key={r.id}>
                          <TableRow>
                            <TableCell>
                              <Collapsible open={open} onOpenChange={(o) => setOpenId(o ? r.id : null)}>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    aria-label={open ? `Collapse detail for ${r.ref}` : `Expand detail for ${r.ref}`}
                                  >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            </TableCell>
                            <TableCell>
                              <p className="font-mono text-xs font-bold">{r.ref}</p>
                              <p className="text-[10px] text-muted-foreground">{r.grnNo ? `GRN ${r.grnNo}` : "no GRN number (deduped)"}</p>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{r.poLine?.po.ref ?? "—"}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {r.shipment ? (
                                <>
                                  {r.shipment.ref}
                                  <span className="block text-[10px] text-muted-foreground">{r.shipment.status.replaceAll("_", " ")}</span>
                                </>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs font-semibold">{r.material.sku}</span>
                              <span className="block max-w-[170px] truncate text-[11px] text-muted-foreground" title={r.material.name}>
                                {r.material.name}
                              </span>
                            </TableCell>
                            <TableCell className="tabular-nums">
                              <span className={`text-sm font-semibold ${short ? "text-rose-600 dark:text-rose-400" : ""}`}>
                                {r.receivedQty} / {r.expectedQty} {r.uom}
                              </span>
                              {hasDisc && (
                                <StatusPill
                                  value={`${r.discrepancyType}${r.discrepancyQty != null ? ` ${r.discrepancyQty}` : ""}`}
                                  className="ml-1.5"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {r.qcResult === "NOT_APPLICABLE" || (r.expectedQty === 0 && r.receivedQty === 0) ? (
                                <span className="inline-flex items-center whitespace-nowrap rounded-md border border-zinc-400/30 bg-zinc-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-400" title="Deduplicated webhook event: No physical QC inspection performed.">
                                  NOT APPLICABLE (DEDUPE)
                                </span>
                              ) : r.qcResult ? (
                                <StatusPill value={r.qcResult} />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusPill value={r.discrepancyType ?? "NONE"} />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{r.warehouse.code}</TableCell>
                            <TableCell className="text-xs">
                              {r.receivedBy ?? "—"}
                              <span className="block text-[10px] tabular-nums text-muted-foreground">{fmtDateTime(r.receivedAt)}</span>
                            </TableCell>
                          </TableRow>
                          {open && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={10} className="bg-zinc-50/70 p-0 dark:bg-zinc-900/40">
                                <Collapsible open={open}>
                                  <CollapsibleContent>
                                    <div className="space-y-2 px-4 py-3 text-xs">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <StatusPill value={r.status} />
                                        <span className="text-muted-foreground">
                                          Received by <span className="font-medium text-foreground">{r.receivedBy ?? "unknown"}</span> ·{" "}
                                          <span className="tabular-nums">{fmtDateTime(r.receivedAt)}</span>
                                        </span>
                                      </div>
                                      {photos.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Evidence photos
                                          </span>
                                          {photos.map((p) => (
                                            <span
                                              key={p}
                                              className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 font-mono text-[10px]"
                                            >
                                              <FileImage className="h-3 w-3 text-rose-500" /> {p}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {r.note && <p className="leading-relaxed text-muted-foreground">{r.note}</p>}
                                      {deduped && (
                                        <span className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300">
                                          <ShieldCheck className="h-3 w-3" /> IDEMPOTENT — duplicate webhook ignored (Rule 7)
                                        </span>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollTable>
            )}
          </SectionCard>

          <Card className="border-zinc-300/70 bg-zinc-50/60 dark:border-zinc-400/25/60 dark:bg-zinc-900/30">
            <CardContent className="flex items-start gap-2 p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Webhook ingestion is idempotent by provider event id — a replayed GRN webhook updates nothing and no stock is doubled
                (Rule 7). Every quantity change above is traceable to a source record with its own provenance.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
