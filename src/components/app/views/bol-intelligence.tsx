"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Package, PencilLine, Ship } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useApi, postJson } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import { BOL_EXCEPTION_CATALOGUE } from "@/lib/spec-data";
import { useToast } from "@/hooks/use-toast";
import {
  CaseStateBadge,
  EmptyState,
  ErrorState,
  FreshnessBadge,
  LoadingState,
  ReconciliationBadge,
  SectionCard,
  SeverityBadge,
  StatusPill,
  fmtDate,
  fmtDateTime,
  parseObj,
} from "@/components/app/shared";

/* ── payload types (mirror /api/bols include) ──────────────────────────────── */
interface BolFieldRow {
  id: string;
  fieldName: string;
  rawValue: string | null;
  normalizedValue: string | null;
  sourcePage: number | null;
  sourceCoords: string | null;
  extractionEngine: string | null;
  confidence: number | null;
  validationStatus: string;
  validationNote: string | null;
  correctedValue: string | null;
  correctedBy: string | null;
  correctedAt: string | null;
  correctionReason: string | null;
}
interface BolRecRow {
  id: string;
  ruleCode: string;
  ruleVersion: string;
  result: string;
  recordsCompared: string | null;
  differences: string | null;
  nextAction: string | null;
  checkedAt: string | null;
}
interface BolContainerRow {
  id: string;
  containerNo: string | null;
  sizeType: string | null;
  sealNo: string | null;
  identityStatus: string;
  identitySource: string | null;
  note: string | null;
}
interface BolDocRow {
  id: string;
  docType: string;
  refNo: string | null;
  fileName: string;
  issuer: string | null;
  ocrStatus: string;
  note: string | null;
}
interface BolExceptionRow {
  id: string;
  ref: string;
  state: string;
  severity: string;
  title: string;
}
interface BolRow {
  id: string;
  bolNo: string;
  docType: string;
  issuer: string | null;
  version: number;
  isActive: boolean;
  status: string;
  issueDate: string | null;
  shipper: string | null;
  consignee: string | null;
  notifyParty: string | null;
  vesselName: string | null;
  voyage: string | null;
  portOfReceipt: string | null;
  portOfLoading: string | null;
  transshipPort: string | null;
  portOfDischarge: string | null;
  finalDelivery: string | null;
  packageCount: number | null;
  packageType: string | null;
  grossWeightKg: number | null;
  goodsDescription: string | null;
  freightTerms: string | null;
  contentHash: string;
  fileName: string | null;
  matchStatus: string;
  shipmentId: string | null;
  shipment?: { ref: string; status: string; freshness: string } | null;
  poRefs: string | null;
  amendmentIndicator: boolean;
  supersedes?: { bolNo: string; version: number; status: string } | null;
  supersededBy?: { bolNo: string; version: number; status: string }[] | null;
  fields: BolFieldRow[];
  reconciliations: BolRecRow[];
  containers: BolContainerRow[];
  documents: BolDocRow[];
  exceptionCases: BolExceptionRow[];
}

/* ── local atoms ───────────────────────────────────────────────────────────── */
const CHIP =
  "inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide";
const ZINC_CHIP = `${CHIP} border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300`;
const SCROLL =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700";

function MatchBadge({ v }: { v: string }) {
  const cls =
    v === "MATCHED"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
      : v === "PARTIAL"
        ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
        : "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300";
  return <span className={`${CHIP} ${cls}`}>{v}</span>;
}

function identityPillCls(status: string): string {
  if (status === "RESOLVED")
    return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300";
  return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300";
}

function ConfidenceBar({ v }: { v: number | null }) {
  if (v == null) return <span className="text-[10px] italic text-muted-foreground">n/a</span>;
  const pct = Math.round(v * 100);
  const tone = v >= 0.9 ? "bg-emerald-500" : v >= 0.7 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="flex items-center gap-1.5" title={`Extraction confidence ${pct}%`}>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[10px] tabular-nums text-muted-foreground">{v.toFixed(2)}</span>
    </span>
  );
}

function trunc(s: string | null | undefined, n: number): string {
  if (!s) return "—";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function JsonLines({ raw, tone }: { raw: string | null; tone: "muted" | "rose" }) {
  const obj = parseObj<Record<string, unknown>>(raw);
  if (!obj) return <span className="text-[10px] italic text-muted-foreground">—</span>;
  return (
    <div className={`whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed ${tone === "rose" ? "text-rose-700 dark:text-rose-400" : "text-zinc-600 dark:text-zinc-400"}`}>
      {Object.entries(obj)
        .map(([k, v]) => `${k}: ${typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}`)
        .join("\n")}
    </div>
  );
}

const M09_ACCEPTANCE: string[] = [
  "BOL with no container number becomes MISSING_IDENTIFIER + discrepancy case — the number is never fabricated from an unrelated document or inferred from vessel AIS.",
  "BOL with a container number but no matching shipment stays UNMATCHED — not force-linked on name similarity.",
  "Container disagreement across BOL and packing list produces a field-level conflict case carrying both document references.",
  "Amended BOL keeps the previous version; the new active version is marked only after policy validation and reconciliations are recomputed.",
  "Human correction records user, timestamp, reason, old/new value and approval policy.",
  "Retried upload with the same content hash does not create a second active BOL.",
];

/* ── view ──────────────────────────────────────────────────────────────────── */
export function BolIntelligenceView({ drillRef }: { drillRef?: string | null }) {
  const { data, loading, error, refresh } = useApi<BolRow[]>("/api/bols");
  const drillTo = useAppStore((s) => s.drillTo);
  /** user pick tagged with the drill context it was made in — a NEW drillRef supersedes it */
  const [pick, setPick] = useState<{ id: string; atDrill: string | null } | null>(null);

  const bols = useMemo(() => {
    const arr = [...(data ?? [])];
    arr.sort(
      (a, b) =>
        (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1) || a.bolNo.localeCompare(b.bolNo) || b.version - a.version
    );
    return arr;
  }, [data]);

  // Fully derived selection (no effects): drill ref (active version preferred) > valid user pick > first active BOL.
  const selected = useMemo(() => {
    if (pick && pick.atDrill === (drillRef ?? null)) {
      const picked = bols.find((b) => b.id === pick.id);
      if (picked) return picked;
    }
    const byDrill = drillRef
      ? (bols.find((b) => b.bolNo === drillRef && b.isActive) ?? bols.find((b) => b.bolNo === drillRef))
      : undefined;
    return byDrill ?? bols.find((b) => b.isActive) ?? bols[0] ?? null;
  }, [bols, drillRef, pick]);

  if (loading) return <LoadingState label="Loading BOLs, field provenance and reconciliations…" />;
  if (error) return <ErrorState message={`Failed to load BOLs: ${error}`} />;

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[380px_1fr]">
        {/* ── master list ── */}
        <section aria-label="BOL list" className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Bills of lading</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{bols.length} documents</span>
          </div>
          <div className={`max-h-[460px] overflow-y-auto p-2 xl:max-h-[calc(100vh-140px)] ${SCROLL}`}>
            {bols.length === 0 ? (
              <EmptyState message="No BOLs ingested" />
            ) : (
              <ul className="space-y-1.5">
                {bols.map((b) => {
                  const isSel = b.id === selected?.id;
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setPick({ id: b.id, atDrill: drillRef ?? null })}
                        aria-current={isSel ? "true" : undefined}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          isSel
                            ? "border-zinc-500 bg-muted/70 dark:border-zinc-300"
                            : "border-transparent hover:border-zinc-300 hover:bg-muted/40 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-sm font-bold">{b.bolNo}</span>
                          <span className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono dark:border-zinc-400/25 dark:bg-zinc-900`}>v{b.version}</span>
                          <span className={ZINC_CHIP}>{b.docType}</span>
                          <span className="ml-auto">
                            <StatusPill value={b.status} />
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <MatchBadge v={b.matchStatus} />
                          <span className={`${CHIP} ${b.isActive ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300" : ZINC_CHIP}`}>
                            {b.isActive ? "ACTIVE" : "SUPERSEDED"}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                          linked shipment:{" "}
                          {b.shipment ? (
                            <span className="flex items-center gap-1">
                              <span className="font-mono font-medium text-foreground">{b.shipment.ref}</span>
                              <FreshnessBadge value={b.shipment.freshness} />
                            </span>
                          ) : (
                            <span className="italic">—</span>
                          )}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* ── detail ── */}
        <section aria-label="BOL detail" className="space-y-4">
          {!selected ? (
            <EmptyState message="Select a BOL" hint="Choose a document to inspect extraction provenance, reconciliations and version chain." />
          ) : (
            <BolDetail b={selected} onDrill={(v, ref) => drillTo(v, ref)} onCorrected={refresh} />
          )}
        </section>
      </div>

      {/* ── exception catalogue (full width, M09) ── */}
      <SectionCard
        title="BOL exception catalogue (M09)"
        subtitle="Detectable discrepancy classes — each maps to a case with severity, owner, evidence and SLA"
      >
        <div className="flex flex-wrap gap-1.5">
          {BOL_EXCEPTION_CATALOGUE.map((c) => (
            <span key={c} className={ZINC_CHIP}>
              {c}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="M09 acceptance tests" subtitle="Behavioral contract verified against the seeded scenarios">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              Show acceptance tests ({M09_ACCEPTANCE.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-3 space-y-2">
              {M09_ACCEPTANCE.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </SectionCard>
    </div>
  );
}

/* ── detail panel ──────────────────────────────────────────────────────────── */
type ViewName = Parameters<ReturnType<typeof useAppStore.getState>["drillTo"]>[0];

interface CorrTarget {
  bolId: string;
  field: BolFieldRow;
}

function BolDetail({ b, onDrill, onCorrected }: { b: BolRow; onDrill: (v: ViewName, ref?: string) => void; onCorrected: () => void }) {
  const { toast } = useToast();
  const [corrTarget, setCorrTarget] = useState<CorrTarget | null>(null);
  const [corrForm, setCorrForm] = useState({ correctedValue: "", correctedBy: "L. Fonseca (Logistics)", reason: "" });
  const [saving, setSaving] = useState(false);

  const poRefs = useMemo<string[]>(() => {
    try {
      const v = JSON.parse(b.poRefs ?? "[]");
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  }, [b.poRefs]);

  const anyFail = b.reconciliations.some((r) => r.result === "FAIL");
  const anyNotChecked = b.reconciliations.some((r) => r.result === "NOT_CHECKED");
  const openCorrections = b.fields.filter((f) => (f.validationStatus === "FAIL" || f.validationStatus === "WARN") && !f.correctedValue);

  const openCorrection = (field: BolFieldRow) => {
    setCorrTarget({ bolId: b.id, field });
    setCorrForm({
      correctedValue: field.correctedValue ?? field.normalizedValue ?? field.rawValue ?? "",
      correctedBy: "L. Fonseca (Logistics)",
      reason: "",
    });
  };

  const submitCorrection = async () => {
    if (!corrTarget) return;
    setSaving(true);
    const res = await postJson<{ field: BolFieldRow; correlation_id: string }>(`/api/bols/${corrTarget.bolId}/correct`, {
      fieldName: corrTarget.field.fieldName,
      correctedValue: corrForm.correctedValue,
      correctedBy: corrForm.correctedBy,
      reason: corrForm.reason,
    });
    setSaving(false);
    if (res.ok) {
      toast({
        title: "Correction recorded",
        description: `${corrTarget.field.fieldName} corrected — extracted value and provenance retained; audit event ${trunc(res.data?.correlation_id, 20)}.`,
      });
      setCorrTarget(null);
      onCorrected();
    } else {
      toast({ title: "Correction failed", description: res.error?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  return (
    <>
      {/* a) header */}
      <SectionCard
        title={
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono">{b.bolNo}</span>
            <span className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono dark:border-zinc-400/25 dark:bg-zinc-900`}>v{b.version}</span>
            <span className={ZINC_CHIP}>{b.docType}</span>
            {b.amendmentIndicator && (
              <span className={`${CHIP} border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300`}>
                AMENDMENT
              </span>
            )}
            {b.supersedes && (
              <span className={`${CHIP} border-teal-300 bg-teal-100 font-mono text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-300`}>
                supersedes {b.supersedes.bolNo} v{b.supersedes.version}
              </span>
            )}
            {b.supersededBy && b.supersededBy.length > 0 && (
              <span className={`${CHIP} border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300`}>
                SUPERSEDED BY v{b.supersededBy.map((v) => v.version).join(", v")}
              </span>
            )}
          </span>
        }
        subtitle={`${b.issuer ?? "Issuer —"} · immutable document ID (content hash) — duplicates rejected`}
        right={
          <span className="flex flex-wrap items-center justify-end gap-1.5">
            <StatusPill value={b.status} />
            <MatchBadge v={b.matchStatus} />
            <span className={`${CHIP} ${b.isActive ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300" : ZINC_CHIP}`}>
              {b.isActive ? "ACTIVE" : "SUPERSEDED"}
            </span>
          </span>
        }
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Issuer</dt>
            <dd className="text-sm">{b.issuer ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Issue date</dt>
            <dd className="text-sm tabular-nums">{fmtDate(b.issueDate)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vessel / Voyage</dt>
            <dd className="flex items-center gap-1.5 text-sm">
              <Ship className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
              {b.vesselName ?? "—"}
              {b.voyage ? <span className="font-mono text-xs text-muted-foreground">/ {b.voyage}</span> : null}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Shipper</dt>
            <dd className="text-sm">{b.shipper ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Consignee</dt>
            <dd className="text-sm">{b.consignee ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notify party</dt>
            <dd className="text-sm">{b.notifyParty ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Route</dt>
            <dd className="text-sm">
              {b.portOfLoading ?? "—"} <span className="text-zinc-400">→</span> {b.portOfDischarge ?? "—"}
              {(b.portOfReceipt || b.transshipPort || b.finalDelivery) && (
                <span className="block text-[11px] text-muted-foreground">
                  {b.portOfReceipt ? `receipt: ${b.portOfReceipt}` : null}
                  {b.transshipPort ? `${b.portOfReceipt ? " · " : ""}transship: ${b.transshipPort}` : null}
                  {b.finalDelivery ? `${b.portOfReceipt || b.transshipPort ? " · " : ""}final delivery: ${b.finalDelivery}` : null}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Packages</dt>
            <dd className="flex items-center gap-1.5 text-sm tabular-nums">
              <Package className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
              {b.packageCount != null ? `${b.packageCount} × ${b.packageType ?? "—"}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gross weight</dt>
            <dd className="text-sm tabular-nums">{b.grossWeightKg != null ? `${b.grossWeightKg.toLocaleString("en-US")} kg` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Freight terms</dt>
            <dd className="text-sm">{b.freightTerms ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Goods description</dt>
            <dd className="text-sm">{b.goodsDescription ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">PO references</dt>
            <dd className="flex flex-wrap gap-1.5">
              {poRefs.length === 0 ? (
                <span className="text-sm text-muted-foreground">none</span>
              ) : (
                poRefs.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onDrill("procurement", p)}
                    className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono text-zinc-700 hover:bg-zinc-200 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800`}
                  >
                    {p}
                  </button>
                ))
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Linked shipment</dt>
            <dd className="text-sm">
              {b.shipment ? (
                <button
                  type="button"
                  onClick={() => onDrill("import-tracking", b.shipment?.ref)}
                  className="flex flex-wrap items-center gap-1.5 font-mono font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                >
                  {b.shipment.ref}
                  <FreshnessBadge value={b.shipment.freshness} />
                </button>
              ) : (
                <span className="italic text-muted-foreground">— unmatched (not force-linked)</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Source file / hash</dt>
            <dd className="text-xs">
              {b.fileName ?? "—"}
              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground" title={b.contentHash}>
                {trunc(b.contentHash, 26)}
              </span>
            </dd>
          </div>
        </dl>
      </SectionCard>

      {/* b) extracted fields with provenance (M08/M09) */}
      <SectionCard
        title="Extracted fields — provenance (M08/M09)"
        subtitle="Value + normalized value + page + engine + confidence + validation for every field"
        right={
          openCorrections.length > 0 ? (
            <span className={`${CHIP} border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10/60 dark:text-rose-300`}>
              {openCorrections.length} field{openCorrections.length > 1 ? "s" : ""} awaiting correction
            </span>
          ) : undefined
        }
      >
        <div className={`max-h-[520px] overflow-y-auto ${SCROLL}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 text-[10px] uppercase">Field</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Raw value</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Normalized</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Conf.</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Page</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Engine</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Validation</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Correction</TableHead>
                <TableHead className="h-8 text-[10px] uppercase" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState message="No fields extracted" />
                  </TableCell>
                </TableRow>
              ) : (
                b.fields.map((f) => {
                  const fail = f.validationStatus === "FAIL";
                  const editable = f.validationStatus === "FAIL" || f.validationStatus === "WARN";
                  return (
                    <TableRow key={f.id} className={fail ? "bg-rose-50/80 dark:bg-rose-400/10" : undefined}>
                      <TableCell className="py-1.5 font-mono text-xs font-semibold">{f.fieldName}</TableCell>
                      <TableCell className="whitespace-normal py-1.5 font-mono text-xs">{f.rawValue ?? <span className="italic text-rose-700 dark:text-rose-400">MISSING</span>}</TableCell>
                      <TableCell className="whitespace-normal py-1.5 font-mono text-xs">{f.normalizedValue ?? "—"}</TableCell>
                      <TableCell className="py-1.5">
                        <ConfidenceBar v={f.confidence} />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className={`${CHIP} ${ZINC_CHIP}`} title={f.sourceCoords ?? undefined}>
                          {f.sourcePage != null ? `src p.${f.sourcePage}` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5 text-[10px] text-muted-foreground" title={f.extractionEngine ?? undefined}>
                        {trunc(f.extractionEngine, 18)}
                      </TableCell>
                      <TableCell className="whitespace-normal py-1.5">
                        <ReconciliationBadge result={f.validationStatus} />
                        {f.validationNote && <p className="mt-1 max-w-[220px] text-[10px] leading-snug text-muted-foreground">{f.validationNote}</p>}
                      </TableCell>
                      <TableCell className="whitespace-normal py-1.5">
                        {f.correctedValue ? (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            corrected: {f.correctedValue} by {f.correctedBy ?? "—"}
                            {f.correctedAt ? <span className="block text-[10px] text-muted-foreground tabular-nums">at {fmtDateTime(f.correctedAt)}</span> : null}
                          </span>
                        ) : (
                          <span className="text-[10px] italic text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        {editable && (
                          <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[10px]" onClick={() => openCorrection(f)}>
                            <PencilLine className="h-3 w-3" aria-hidden /> Correct
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Corrections are stored separately; extracted value and provenance retained (M09 step 8).
        </p>
      </SectionCard>

      {/* c) reconciliation results */}
      <SectionCard title="Reconciliation results" subtitle="Cross-document rules with versions — PASS / WARN / FAIL / NOT_CHECKED">
        {anyFail && (
          <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 p-2.5 text-xs leading-relaxed text-rose-900 dark:border-rose-400/25 dark:bg-rose-400/10/50 dark:text-rose-300">
            Reconciliation FAIL present — discrepancies require human review before this BOL can be published as verified (M09).
          </div>
        )}
        <div className={`max-h-[380px] overflow-y-auto ${SCROLL}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 text-[10px] uppercase">Rule</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Ver</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Result</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Records compared</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Differences</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Next action</TableHead>
                <TableHead className="h-8 text-[10px] uppercase">Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.reconciliations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState message="No reconciliation rules executed" />
                  </TableCell>
                </TableRow>
              ) : (
                b.reconciliations.map((r) => (
                  <TableRow key={r.id} className={r.result === "FAIL" ? "bg-rose-50/80 dark:bg-rose-400/10" : undefined}>
                    <TableCell className="py-1.5 font-mono text-xs font-semibold">{r.ruleCode}</TableCell>
                    <TableCell className="py-1.5">
                      <span className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono dark:border-zinc-400/25 dark:bg-zinc-900`}>{r.ruleVersion}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <ReconciliationBadge result={r.result} />
                    </TableCell>
                    <TableCell className="whitespace-normal py-1.5">
                      <JsonLines raw={r.recordsCompared} tone="muted" />
                    </TableCell>
                    <TableCell className="whitespace-normal py-1.5">
                      <JsonLines raw={r.differences} tone="rose" />
                    </TableCell>
                    <TableCell className="whitespace-normal py-1.5 text-xs">{r.nextAction ?? "—"}</TableCell>
                    <TableCell className="py-1.5 text-[11px] tabular-nums">{r.checkedAt ? fmtDateTime(r.checkedAt) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {anyNotChecked && (
          <p className="mt-3 rounded-md border border-zinc-300 bg-muted/50 p-2 text-[11px] text-muted-foreground dark:border-zinc-400/25">
            NOT_CHECKED must not be treated as PASS.
          </p>
        )}
      </SectionCard>

      {/* d) containers on this BOL */}
      <SectionCard title="Containers on this BOL" subtitle="Identity status explicit — absent numbers are never fabricated (M09)">
        {b.containers.length === 0 ? (
          <p className="py-2 text-xs italic text-muted-foreground">No containers recorded on this document.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {b.containers.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`font-mono text-sm font-bold ${c.containerNo ? "" : "text-rose-700 dark:text-rose-400"}`}>
                    {c.containerNo ?? "MISSING"}
                  </span>
                  <StatusPill value={c.identityStatus} className={identityPillCls(c.identityStatus)} />
                </div>
                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  {c.sizeType ?? "size/type —"} · seal {c.sealNo ?? "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">identity source: {c.identitySource ?? "none — unresolved"}</p>
                {c.note && <p className="mt-1 text-[11px] italic text-muted-foreground">{c.note}</p>}
                {c.identityStatus !== "RESOLVED" && (
                  <div className="mt-2 rounded-md border border-rose-300 bg-rose-50 p-2 text-[11px] leading-relaxed text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10/50 dark:text-rose-300">
                    Container location unresolved — tracking starts only when a valid provider identifier/feed is available (M09/M11).
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* e) linked documents + exceptions */}
      <SectionCard title="Linked documents & exceptions" subtitle="Dossier artifacts and closed-loop cases — click an exception to open it">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Documents</h3>
            {b.documents.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No documents linked to this BOL.</p>
            ) : (
              <ul className="space-y-1.5">
                {b.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                    <span className={`${CHIP} border-zinc-300 bg-zinc-100 font-mono uppercase text-zinc-600 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-400`}>
                      {d.docType}
                    </span>
                    <span className="font-mono font-medium">{d.refNo ?? "—"}</span>
                    <span className="ml-auto">
                      <StatusPill value={d.ocrStatus} />
                    </span>
                    {d.issuer && <span className="w-full text-[11px] text-muted-foreground">issued by {d.issuer}</span>}
                    {d.note && <span className="w-full text-[11px] italic text-muted-foreground">{d.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exceptions</h3>
            {b.exceptionCases.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No discrepancy cases linked to this BOL.</p>
            ) : (
              <ul className="space-y-1.5">
                {b.exceptionCases.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => onDrill("exceptions", ex.ref)}
                      className="flex w-full flex-wrap items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors hover:bg-muted/50"
                    >
                      <span className="font-mono font-bold">{ex.ref}</span>
                      <CaseStateBadge state={ex.state} />
                      <SeverityBadge value={ex.severity} />
                      <span>{ex.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Separator className="my-3" />
        <p className="text-[11px] text-muted-foreground">
          An absent container number must never be fabricated from an unrelated document or inferred from vessel AIS (M09 decision boundary).
        </p>
      </SectionCard>

      {/* correction dialog */}
      <Dialog open={!!corrTarget} onOpenChange={(o) => !o && setCorrTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Correct field — {corrTarget?.field.fieldName}</DialogTitle>
            <DialogDescription>
              Human correction stored separately; the extracted value and its provenance are retained (M09 step 8). An audit event records actor,
              timestamp, reason and old/new value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Field (read-only)</p>
              <Input value={corrTarget?.field.fieldName ?? ""} readOnly disabled className="font-mono text-xs" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Current value {corrTarget?.field.validationStatus === "FAIL" ? "(extraction FAILED validation)" : "(WARN — reviewer confirmation requested)"}
              </p>
              <Input
                value={corrTarget ? (corrTarget.field.correctedValue ?? corrTarget.field.normalizedValue ?? corrTarget.field.rawValue ?? "") : ""}
                readOnly
                disabled
                className="font-mono text-xs"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Corrected value</p>
              <Input
                value={corrForm.correctedValue}
                onChange={(e) => setCorrForm((f) => ({ ...f, correctedValue: e.target.value }))}
                placeholder="Verified value (e.g. TEMU9911911)"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Corrected by</p>
              <Input
                value={corrForm.correctedBy}
                onChange={(e) => setCorrForm((f) => ({ ...f, correctedBy: e.target.value }))}
                placeholder="Name and team"
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reason (required)</p>
              <Textarea
                rows={3}
                value={corrForm.reason}
                onChange={(e) => setCorrForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Why is this correction required? Reference the authoritative source (packing list, booking, carrier confirmation…)."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={submitCorrection}
              disabled={saving || !corrForm.correctedValue.trim() || !corrForm.correctedBy.trim() || !corrForm.reason.trim()}
            >
              {saving ? "Recording…" : "Record correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
