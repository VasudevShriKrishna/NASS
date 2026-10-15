"use client";

import { ChevronDown, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useApi } from "@/lib/client";
import { useAppStore, type ViewId } from "@/lib/app-state";
import {
  EvidenceBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SeverityBadge,
  StatusPill,
  daysUntil,
  fmtDate,
  fmtDateTime,
  parseArr,
  parseObj,
} from "@/components/app/shared";

/* ── Payload types (mirror /api/suppliers) ────────────────────────────────── */
interface ScoreSnapshotRecord {
  id: string;
  metric: string;
  definition: string;
  version: string;
  period: string;
  value: number;
  unit: string;
  sampleSize: number | null;
  exclusions: string | null;
  sourceLineage: string | null;
  calculatedAt: string;
}
interface SupplierRiskRecord {
  id: string;
  signalCode: string;
  fact: string;
  interpretation: string | null;
  severity: string;
  entityRef: string | null;
}
interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  aliases: string | null;
  country: string;
  city: string | null;
  status: string;
  categories: string | null;
  incoterms: string | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  certifications: string | null;
  contacts: string | null;
  evidenceLabel: string;
  scoreSnapshots: ScoreSnapshotRecord[];
  riskSignals: SupplierRiskRecord[];
  pos: { ref: string; status: string; promisedDate: string | null }[];
  contracts: { ref: string; status: string; validTo: string | null }[];
  shipments: { ref: string; status: string }[];
  exceptionCases: { ref: string; state: string; severity: string; title: string }[];
  quotes: { id: string; rank: number | null; status: string }[];
}

/* ── Certification parsing: JSON array of {name, expiresAt} ───────────────── */
interface Certification {
  name: string;
  expiresAt?: string;
}
function parseCertifications(raw: string | null | undefined): Certification[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .map((x): Certification | null => {
        if (typeof x === "string") return { name: x };
        if (x && typeof x === "object" && typeof (x as Certification).name === "string")
          return x as Certification;
        return null;
      })
      .filter((c): c is Certification => !!c);
  } catch {
    return [];
  }
}

const fmtScore = (v: number, unit: string) =>
  `${Number.isInteger(v) ? v : v.toFixed(1)}${unit === "%" ? "%" : ` ${unit}`}`;

/* ── Certification chip with expiry urgency ───────────────────────────────── */
function CertChip({ cert }: { cert: Certification }) {
  const d = daysUntil(cert.expiresAt);
  const cls =
    d == null
      ? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      : d < 0
        ? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
        : d < 90
          ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
          : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {cert.name}
      {cert.expiresAt ? (
        <span className="tabular-nums">
          · expires {fmtDate(cert.expiresAt)}
          {d != null && d < 0 ? " (EXPIRED)" : ""}
        </span>
      ) : null}
    </span>
  );
}

/* ── Single supplier card ─────────────────────────────────────────────────── */
function SupplierCard({ s }: { s: SupplierRecord }) {
  const drillTo = useAppStore((st) => st.drillTo);
  const aliases = parseArr(s.aliases);
  const categories = parseArr(s.categories);
  const certs = parseCertifications(s.certifications);
  const contacts = parseObj<{ name: string; role?: string; email?: string }[]>(s.contacts) ?? [];
  const openCases = s.exceptionCases.filter((c) => !["RESOLVED", "CANCELLED"].includes(c.state));

  const counts: { label: string; n: number; view: ViewId }[] = [
    { label: "POs", n: s.pos.length, view: "procurement" },
    { label: "Contracts", n: s.contracts.length, view: "procurement" },
    { label: "Shipments", n: s.shipments.length, view: "import-tracking" },
    { label: "Open cases", n: openCases.length, view: "exceptions" },
  ];

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Identity */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold">{s.code}</span>
            <StatusPill value={s.status} />
            <EvidenceBadge label={s.evidenceLabel} />
          </div>
          <p className="mt-0.5 text-sm font-semibold leading-snug">{s.name}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {s.country}
            {s.city ? ` · ${s.city}` : ""}
          </p>
          {s.status === "PENDING" ? (
            <span className="mt-1.5 inline-flex items-center rounded-md border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
              approval required before award
            </span>
          ) : null}
          {contacts.length > 0 ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              {contacts[0]?.name}
              {contacts[0]?.role ? ` (${contacts[0].role})` : ""}
            </p>
          ) : null}
        </div>

        {/* Aliases + categories */}
        {aliases.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">aka</span>
            {aliases.map((a, i) => (
              <span
                key={i}
                className="rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:border-zinc-700"
              >
                {a}
              </span>
            ))}
          </div>
        ) : null}
        {categories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-medium">
                {c}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Commercial terms */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-2 text-center">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Incoterms</p>
            <p className="text-xs font-semibold">{s.incoterms ?? "—"}</p>
          </div>
          <div className="border-x border-border/60">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Lead time</p>
            <p className="text-xs font-semibold tabular-nums">{s.leadTimeDays != null ? `${s.leadTimeDays} d` : "—"}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Payment</p>
            <p className="text-xs font-semibold">{s.paymentTerms ?? "—"}</p>
          </div>
        </div>

        {/* Certifications */}
        {certs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {certs.map((c, i) => (
              <CertChip key={i} cert={c} />
            ))}
          </div>
        ) : null}

        {/* Counts row — drills to row-level records */}
        <div className="grid grid-cols-4 gap-2">
          {counts.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => drillTo(c.view)}
              className="rounded-lg border p-1.5 text-center transition-colors hover:bg-muted"
              aria-label={`${c.n} ${c.label} for ${s.code} — open ${c.label}`}
            >
              <p className="text-sm font-bold tabular-nums">{c.n}</p>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
            </button>
          ))}
        </div>

        {/* Open exception cases */}
        {openCases.length > 0 ? (
          <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50/50 p-2 dark:border-rose-900 dark:bg-rose-950/20">
            {openCases.map((c) => (
              <div key={c.ref} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold">{c.ref}</span>
                <SeverityBadge value={c.severity} />
                <span className="text-[11px] leading-snug">{c.title}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Risk signals — fact vs interpretation (M16) */}
        {s.riskSignals.length > 0 ? (
          <div className="space-y-2">
            <Separator />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Risk signals</p>
            {s.riskSignals.map((r) => (
              <div key={r.id} className="rounded-lg border p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SeverityBadge value={r.severity} />
                  <span className="font-mono text-[11px] font-semibold">{r.signalCode}</span>
                  {r.entityRef ? (
                    <span className="font-mono text-[10px] text-muted-foreground">{r.entityRef}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-medium leading-snug">{r.fact}</p>
                {r.interpretation ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wide">Interpretation:</span> {r.interpretation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* Scorecard — published formulas, sample size, exclusions, lineage (M04) */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              Scorecard ({s.scoreSnapshots.length} metrics)
              <ChevronDown className="h-4 w-4 transition-transform" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {s.scoreSnapshots.length === 0 ? (
              <div className="mt-2">
                <EmptyState
                  message="No score snapshots published for this supplier yet"
                  hint="Metrics appear here once the scoring job runs"
                />
              </div>
            ) : (
              <>
                <div className="mt-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Metric</TableHead>
                        <TableHead className="text-[10px]">Value</TableHead>
                        <TableHead className="text-[10px]">Period</TableHead>
                        <TableHead className="text-[10px]">Definition</TableHead>
                        <TableHead className="text-[10px]">n</TableHead>
                        <TableHead className="text-[10px]">Exclusions</TableHead>
                        <TableHead className="text-[10px]">Ver</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.scoreSnapshots.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap text-[11px] font-medium">{m.metric}</TableCell>
                          <TableCell className="whitespace-nowrap text-[11px] font-bold tabular-nums">
                            {fmtScore(m.value, m.unit)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-[11px] tabular-nums">{m.period}</TableCell>
                          <TableCell className="max-w-44">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate text-[11px] text-muted-foreground">{m.definition}</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-72 text-[11px] leading-snug">
                                <p>{m.definition}</p>
                                {m.sourceLineage ? (
                                  <p className="mt-1 text-[10px] text-muted-foreground">lineage: {m.sourceLineage}</p>
                                ) : null}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-[11px] tabular-nums">
                            {m.sampleSize ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-32">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {m.exclusions ?? "none"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-64 text-[11px] leading-snug">
                                {m.exclusions ?? "No exclusions applied"}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-[10px] text-muted-foreground">
                            {m.version}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2 text-[10px] italic leading-relaxed text-muted-foreground">
                  Formulas, sample size, period, exclusions and source lineage are published with every score (M04).
                </p>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}

/* ── View root ────────────────────────────────────────────────────────────── */
export function SuppliersView() {
  const { data, loading, error, asOf } = useApi<SupplierRecord[]>("/api/suppliers");
  const pending = data?.filter((s) => s.status === "PENDING").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Supplier Network</h2>
          <p className="text-xs text-muted-foreground">
            Data as of <span className="font-medium text-foreground">{fmtDateTime(asOf)}</span> · scorecards publish
            formula, sample and lineage per metric
          </p>
        </div>
        {pending > 0 ? (
          <span className="inline-flex items-center rounded-md border border-violet-300 bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
            {pending} supplier{pending > 1 ? "s" : ""} pending approval — award blocked until approved
          </span>
        ) : null}
      </div>

      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}
      {data && data.length === 0 ? (
        <SectionCard title="Suppliers">
          <EmptyState message="No suppliers registered" />
        </SectionCard>
      ) : null}

      {data && data.length > 0 ? (
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((s) => (
              <SupplierCard key={s.id} s={s} />
            ))}
          </div>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
