"use client";

import { Fragment, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleAlert,
  FileText,
  Gavel,
  ScrollText,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  fmtRelative,
  parseArr,
  parseObj,
} from "@/components/app/shared";

/* ── shared helpers ───────────────────────────────────────────────────────── */
const qty = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const money = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });

function PriorityChip({ value }: { value: string }) {
  const map: Record<string, string> = {
    CRITICAL: "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
    HIGH: "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
        map[value] ?? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      {value}
    </span>
  );
}

function DeviationChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
      <CircleAlert className="h-3 w-3" /> {text}
    </span>
  );
}

/* ── Payload types (mirror /api/purchase-requests | /sourcing | /purchase-orders | /contracts) ── */
interface PrRecord {
  id: string;
  ref: string;
  requester: string;
  status: string;
  priority: string;
  channel: string;
  requiredOnSite: string | null;
  justification: string | null;
  duplicateOfId: string | null;
  sourceRef: string | null;
  project: { code: string; name: string } | null;
  lines: { quantity: number; uom: string; material: { sku: string; name: string; uom: string; criticality: string } }[];
  rfqs: { ref: string; status: string }[];
}
interface QuoteRecord {
  id: string;
  currency: string;
  unitPrice: number;
  leadTimeDays: number;
  incoterms: string | null;
  validity: string | null;
  deviations: string | null;
  landedCost: number | null;
  rank: number | null;
  recommendation: string | null;
  extractionConfidence: number | null;
  status: string;
  supplier: { code: string; name: string; status: string; country: string };
}
interface RfqRecord {
  id: string;
  ref: string;
  status: string;
  dueDate: string | null;
  criteria: string | null;
  pr: { ref: string; status: string; requester: string };
  quotes: QuoteRecord[];
}
interface PoLineRecord {
  id: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  promisedDate: string | null;
  receivedQty: number;
  lineStatus: string;
  material: { sku: string; name: string; uom: string };
  receipts: { ref: string; receivedQty: number; status: string; receivedAt: string }[];
}
interface PoRecord {
  id: string;
  ref: string;
  status: string;
  currency: string;
  totalAmount: number;
  deliveryTerms: string | null;
  deliveryLocation: string | null;
  promisedDate: string | null;
  amendmentNo: number;
  baselineRef: string | null;
  supplier: { code: string; name: string; status: string };
  project?: { code: string; name: string } | null;
  legalEntity?: { code: string; name: string } | null;
  lines: PoLineRecord[];
  contracts: { ref: string; title: string; status: string }[];
  shipments: { ref: string; status: string; freshness: string }[];
}
interface ContractRecord {
  id: string;
  ref: string;
  title: string;
  version: number;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  obligations: string | null;
  summary: string | null;
  approvedBy: string | null;
  supplier: { code: string; name: string; status: string };
  po?: { ref: string } | null;
}

/* ════════════════════════════ Purchase Requests ═══════════════════════════ */
function PurchaseRequestsTab() {
  const { data, loading, error } = useApi<PrRecord[]>("/api/purchase-requests");

  return (
    <SectionCard
      title="Purchase requests"
      subtitle="M05 — intake from FORM / ERP / EMAIL / SPREADSHEET with duplicate detection and completeness gate"
    >
      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data && data.length === 0 ? <EmptyState message="No purchase requests" /> : null}
      {data && data.length > 0 ? (
        <ScrollTable maxHeight="max-h-[520px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="hidden md:table-cell">Channel</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead className="hidden sm:table-cell">Required on site</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead className="hidden lg:table-cell">Justification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <Fragment key={p.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs font-semibold">{p.ref}</span>
                        {p.duplicateOfId ? (
                          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            DUPLICATE of {p.duplicateOfId}
                          </span>
                        ) : null}
                        {p.sourceRef ? (
                          <span className="max-w-40 truncate font-mono text-[10px] text-muted-foreground" title={p.sourceRef}>
                            src: {p.sourceRef}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusPill value={p.status} />
                        {p.rfqs.length > 0 ? (
                          <span className="text-[10px] text-muted-foreground">
                            {p.rfqs.map((r) => `${r.ref} (${r.status})`).join(", ")}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityChip value={p.priority} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px] font-medium">
                        {p.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.project ? (
                        <span className="text-xs" title={p.project.name}>
                          <span className="font-mono font-medium">{p.project.code}</span>
                          <span className="block text-[10px] text-muted-foreground">{p.project.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs tabular-nums">
                      {fmtRelative(p.requiredOnSite)}
                      <span className="block text-[10px] text-muted-foreground">{fmtDate(p.requiredOnSite)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {p.lines.map((l, i) => (
                          <span key={i} className="text-xs tabular-nums">
                            {qty(l.quantity)} {l.uom} {l.material.name}
                            {l.material.criticality === "CRITICAL" || l.material.criticality === "HIGH" ? (
                              <span
                                className={`ml-1 rounded border px-1 text-[9px] font-bold uppercase ${
                                  l.material.criticality === "CRITICAL"
                                    ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300"
                                    : "border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300"
                                }`}
                              >
                                {l.material.criticality}
                              </span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-56">
                      <span className="block truncate text-xs text-muted-foreground" title={p.justification ?? undefined}>
                        {p.justification ?? "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                  {p.status === "NEEDS_INFO" ? (
                    <TableRow key={`${p.id}-note`} className="hover:bg-transparent">
                      <TableCell colSpan={8} className="bg-amber-50 py-2 dark:bg-amber-950/30">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                          <CircleAlert className="h-3.5 w-3.5" />
                          Returned for missing fields — incomplete request must not silently create a PO (M05)
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </ScrollTable>
      ) : null}
    </SectionCard>
  );
}

/* ════════════════════════════ Sourcing (RFQ) ══════════════════════════════ */
function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null)
    return (
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-xs font-bold text-zinc-500 dark:border-zinc-700">
        ?
      </span>
    );
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        rank === 1
          ? "bg-emerald-600 text-white"
          : "border border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

function SourcingTab() {
  const { data, loading, error } = useApi<RfqRecord[]>("/api/sourcing");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <Gavel className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-semibold">No autonomous supplier award</span> — every rank and criterion is explained (M06).
          Award decisions pass the human approval gateway.
        </span>
      </div>

      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data && data.length === 0 ? <EmptyState message="No RFQs issued" /> : null}

      {data
        ? data.map((rfq) => {
            const criteria = parseArr(rfq.criteria);
            return (
              <SectionCard
                key={rfq.id}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono">{rfq.ref}</span>
                    <StatusPill value={rfq.status} />
                    <span className="text-xs font-normal text-muted-foreground">
                      from <span className="font-mono font-medium text-foreground">{rfq.pr.ref}</span> · {rfq.pr.requester}
                    </span>
                  </span>
                }
                subtitle={`Quote deadline ${fmtRelative(rfq.dueDate)} (${fmtDate(rfq.dueDate)})`}
                right={<Badge variant="outline" className="text-[10px]">{rfq.quotes.length} quotes</Badge>}
                bodyClass="space-y-3"
              >
                {criteria.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Approved criteria:
                    </span>
                    {criteria.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}

                {rfq.quotes.length === 0 ? (
                  <EmptyState message="No quotes received yet" />
                ) : (
                  <div className="flex flex-col gap-2">
                    {rfq.quotes.map((q) => {
                      const devs = parseArr(q.deviations);
                      return (
                        <div key={q.id} className="rounded-lg border p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <RankBadge rank={q.rank} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-tight">
                                <span className="font-mono text-xs">{q.supplier.code}</span> {q.supplier.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {q.supplier.country} · supplier status: {q.supplier.status.replaceAll("_", " ")}
                              </p>
                            </div>
                            <StatusPill value={q.status} className="ml-auto" />
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-5">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit price</p>
                              <p className="font-semibold tabular-nums">
                                {q.currency} {money(q.unitPrice)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lead time</p>
                              <p className="font-semibold tabular-nums">{q.leadTimeDays} days</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Landed cost</p>
                              <p className="font-semibold tabular-nums">
                                {q.landedCost != null ? `${q.currency} ${money(q.landedCost)}` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Incoterms</p>
                              <p className="font-medium">{q.incoterms ?? "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Valid until</p>
                              <p className="font-medium tabular-nums">{fmtDate(q.validity)}</p>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {devs.length > 0 ? (
                              devs.map((d, i) => <DeviationChip key={i} text={d} />)
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CircleCheck className="h-3 w-3" /> no deviations
                              </span>
                            )}
                          </div>

                          {q.recommendation ? (
                            <p className="mt-2 border-l-2 border-muted-foreground/30 pl-2 text-xs leading-relaxed text-muted-foreground">
                              {q.recommendation}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                            extraction confidence {q.extractionConfidence != null ? q.extractionConfidence.toFixed(2) : "—"}
                            {q.extractionConfidence != null && q.extractionConfidence < 0.9
                              ? " — low confidence: verify against source document"
                              : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            );
          })
        : null}
    </div>
  );
}

/* ════════════════════════════ Purchase Orders ═════════════════════════════ */
function PurchaseOrdersTab() {
  const { data, loading, error } = useApi<PoRecord[]>("/api/purchase-orders");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <SectionCard
      title="Purchase orders"
      subtitle="M07 — register with amendment lineage, receipt progress and linked shipments"
    >
      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data && data.length === 0 ? <EmptyState message="No purchase orders" /> : null}
      {data && data.length > 0 ? (
        <ScrollTable maxHeight="max-h-[560px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" aria-label="Expand" />
                <TableHead>Ref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="hidden md:table-cell">Project / Entity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Promised</TableHead>
                <TableHead>Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((po) => (
                <Fragment key={po.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggle(po.id)}
                        aria-expanded={expanded.has(po.id)}
                        aria-label={`${expanded.has(po.id) ? "Collapse" : "Expand"} ${po.ref}`}
                      >
                        {expanded.has(po.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold">{po.ref}</span>
                      {po.amendmentNo > 0 ? (
                        <span className="ml-1.5 rounded border border-orange-300 px-1 text-[9px] font-bold text-orange-700 dark:border-orange-800 dark:text-orange-300">
                          AMENDMENT {po.amendmentNo}
                        </span>
                      ) : null}
                      {po.baselineRef ? (
                        <span className="block text-[10px] text-muted-foreground">baseline {po.baselineRef}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusPill value={po.status} />
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium leading-tight">
                        <span className="font-mono">{po.supplier.code}</span> {po.supplier.name}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs">{po.project?.code ?? "—"}</span>
                      {po.legalEntity ? (
                        <span className="block text-[10px] text-muted-foreground">{po.legalEntity.code}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs font-semibold tabular-nums">
                      {po.currency} {money(po.totalAmount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs tabular-nums">
                      {fmtRelative(po.promisedDate)}
                      <span className="block text-[10px] text-muted-foreground">{fmtDate(po.promisedDate)}</span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {po.lines.length} lines · {po.shipments.length} shipments
                    </TableCell>
                  </TableRow>
                  {expanded.has(po.id) ? (
                    <TableRow key={`${po.id}-detail`} className="hover:bg-transparent">
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <div className="space-y-3 p-4">
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
                            {po.deliveryTerms ? (
                              <span>
                                Delivery terms: <span className="font-medium text-foreground">{po.deliveryTerms}</span>
                              </span>
                            ) : null}
                            {po.deliveryLocation ? (
                              <span>
                                Location: <span className="font-medium text-foreground">{po.deliveryLocation}</span>
                              </span>
                            ) : null}
                            {po.contracts.length > 0 ? (
                              <span>
                                Contracts:{" "}
                                {po.contracts.map((c) => (
                                  <StatusPill key={c.ref} value={c.ref} className="mr-1" />
                                ))}
                              </span>
                            ) : null}
                          </div>

                          {/* Lines with receipt progress — M12 partial receipt rule */}
                          <div className="flex flex-col gap-2">
                            {po.lines.map((l) => {
                              const pct = l.quantity > 0 ? Math.min(100, (l.receivedQty / l.quantity) * 100) : 0;
                              return (
                                <div key={l.id} className="rounded-lg border bg-background p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold">
                                      <span className="font-mono text-muted-foreground">{l.material.sku}</span>{" "}
                                      {l.material.name}
                                    </span>
                                    <StatusPill value={l.lineStatus} className="ml-auto" />
                                  </div>
                                  <div className="mt-2 flex items-center gap-3">
                                    <Progress value={pct} className="h-2 max-w-60 flex-1" aria-label="Received progress" />
                                    <span className="text-xs font-medium tabular-nums">
                                      {qty(l.receivedQty)}/{qty(l.quantity)} {l.uom}
                                    </span>
                                  </div>
                                  {l.lineStatus === "PARTIAL" ? (
                                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                      <CircleAlert className="h-3.5 w-3.5" />
                                      Partial receipt — remaining quantity stays open (M12)
                                    </p>
                                  ) : null}
                                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                                    <span className="tabular-nums">
                                      unit price {po.currency} {money(l.unitPrice)}
                                    </span>
                                    <span className="tabular-nums">line promised {fmtDate(l.promisedDate)}</span>
                                  </div>
                                  {l.receipts.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {l.receipts.map((r) => (
                                        <span
                                          key={r.ref}
                                          className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground"
                                        >
                                          <span className="font-mono font-semibold text-foreground">{r.ref}</span>
                                          {qty(r.receivedQty)} {l.uom} · <StatusPill value={r.status} /> ·{" "}
                                          {fmtRelative(r.receivedAt)}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>

                          {/* Linked shipments */}
                          {po.shipments.length > 0 ? (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Linked shipments
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {po.shipments.map((s) => (
                                  <span
                                    key={s.ref}
                                    className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
                                  >
                                    <span className="font-mono font-semibold">{s.ref}</span>
                                    <StatusPill value={s.status} />
                                    <FreshnessBadge value={s.freshness} />
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </ScrollTable>
      ) : null}
    </SectionCard>
  );
}

/* ════════════════════════════ Contracts ═══════════════════════════════════ */
const OBLIGATION_STYLE: Record<string, string> = {
  delivery: "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300",
  penalty: "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
  insurance: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  certification:
    "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300",
};

function ContractsTab() {
  const { data, loading, error } = useApi<ContractRecord[]>("/api/contracts");

  return (
    <div className="space-y-4">
      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data && data.length === 0 ? <EmptyState message="No contracts registered" /> : null}

      {data ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {data.map((c) => {
              /* obligations JSON: [{type, text}] — parse via parseArr then re-parse each entry */
              const obligations = parseArr(c.obligations)
                .map((s) => parseObj<{ type: string; text: string }>(s))
                .filter((o): o is { type: string; text: string } => !!o && !!o.type && !!o.text);
              return (
                <Card key={c.id} className="p-0">
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{c.ref}</span>
                      <Badge variant="outline" className="text-[10px]">v{c.version}</Badge>
                      <StatusPill value={c.status} />
                      {c.po ? (
                        <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          PO {c.po.ref}
                        </span>
                      ) : null}
                      {c.status === "EXPIRING" ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <CircleAlert className="h-3 w-3" /> expires {fmtDate(c.validTo)} — renewal decision required
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-sm font-semibold leading-snug">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono font-medium text-foreground">{c.supplier.code}</span> {c.supplier.name}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        valid {fmtDate(c.validFrom)} → {fmtDate(c.validTo)}
                      </span>
                      {c.approvedBy ? <span>approved by {c.approvedBy}</span> : null}
                    </div>

                    {c.summary ? (
                      <p className="text-xs italic leading-relaxed text-muted-foreground">{c.summary}</p>
                    ) : null}

                    {obligations.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Parsed obligations
                        </p>
                        <ul className="mt-1 space-y-1.5">
                          {obligations.map((o, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                  OBLIGATION_STYLE[o.type] ?? OBLIGATION_STYLE.delivery
                                }`}
                              >
                                {o.type}
                              </span>
                              <span className="text-xs leading-snug">{o.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <Separator />
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Summaries are navigational aids, not legal advice — signed documents are authoritative (M07).
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Every contract version is retained; superseded versions remain auditable in the contract register.
          </p>
        </>
      ) : null}
    </div>
  );
}

/* ════════════════════════════ View root ═══════════════════════════════════ */
export function ProcurementView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Procurement &amp; Sourcing</h2>
        <p className="text-xs text-muted-foreground">
          PR → RFQ → PO → contract chain with human-approved awards and receipt-based progress
        </p>
      </div>
      <Tabs defaultValue="requests">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="requests" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Purchase Requests
          </TabsTrigger>
          <TabsTrigger value="sourcing" className="gap-1.5">
            <Gavel className="h-3.5 w-3.5" /> Sourcing (RFQ)
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Contracts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-4">
          <PurchaseRequestsTab />
        </TabsContent>
        <TabsContent value="sourcing" className="mt-4">
          <SourcingTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <PurchaseOrdersTab />
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <ContractsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
