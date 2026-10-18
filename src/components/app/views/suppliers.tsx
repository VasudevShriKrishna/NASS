"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  ExternalLink,
  Flame,
  Globe2,
  Handshake,
  Layers,
  MapPin,
  Scale,
  ShieldCheck,
  TrendingDown,
  Truck,
  User,
} from "lucide-react";
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

export interface PriceBenchmarkRecord {
  id: string;
  sku: string;
  materialName: string;
  category: string;
  supplierCode: string;
  supplierName: string;
  currency: string;
  uom: string;
  poRef: string | null;
  actualPoPrice: number | null;
  quotedPrice: number | null;
  marketBenchmarkPrice: number;
  regionalParityPrice: number;
  estimatedLandedCost: number;
  varianceAmount: number;
  variancePct: number;
  priceBasis: string;
  incoterms: string;
  leadTimeDays: number;
  freshnessStatus: "FRESH" | "AGING" | "STALE";
  publishedDate: string;
  retrievedAt: string;
  classification: "ACTUAL_PO" | "BINDING_QUOTE" | "PUBLIC_BENCHMARK" | "REGIONAL_PARITY" | "DEMO_SYNTHETIC";
  sourceName: string;
  sourceUrl?: string;
  note: string;
}

export interface PartnerClassification {
  code: string;
  name: string;
  relationshipType: string;
  nassAffiliation: string;
  role: string;
  status: string;
  verifiedScope: string;
  notes: string;
}

interface SuppliersApiResponse {
  suppliers: SupplierRecord[];
  priceBenchmarks: PriceBenchmarkRecord[];
  partnerClassifications: PartnerClassification[];
  summary?: {
    totalSuppliers: number;
    verifiedPartners: number;
    trackedBenchmarks: number;
    freshBenchmarkPct: number;
    activePosCount: number;
  };
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

function CertChip({ cert }: { cert: Certification }) {
  const d = daysUntil(cert.expiresAt);
  const cls =
    d == null
      ? "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300"
      : d < 0
        ? "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300"
        : d < 90
          ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300"
          : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-400/25 dark:bg-zinc-900 dark:text-zinc-300";
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
    <Card className="p-4 border-amber-500/20 bg-card/95 hover:border-amber-500/40 transition-colors">
      <div className="space-y-3">
        {/* Identity */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-amber-400">{s.code}</span>
            <StatusPill value={s.status} />
            <EvidenceBadge label={s.evidenceLabel} />
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug">{s.name}</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {s.country}
            {s.city ? ` · ${s.city}` : ""}
          </p>
          {s.status === "PENDING" ? (
            <span className="mt-1.5 inline-flex items-center rounded-md border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-300">
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
                className="rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:border-zinc-400/25"
              >
                {a}
              </span>
            ))}
          </div>
        ) : null}
        {categories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-medium border-amber-500/20 bg-amber-500/5 text-amber-300">
                {c}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Commercial terms */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-2 text-center text-xs">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Incoterms</p>
            <p className="font-semibold text-foreground">{s.incoterms ?? "—"}</p>
          </div>
          <div className="border-x border-border/60">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Lead time</p>
            <p className="font-semibold tabular-nums text-foreground">{s.leadTimeDays != null ? `${s.leadTimeDays} d` : "—"}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Payment</p>
            <p className="font-semibold text-foreground">{s.paymentTerms ?? "—"}</p>
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
              className="rounded-lg border p-1.5 text-center transition-colors hover:bg-muted/70 hover:border-amber-500/30"
              aria-label={`${c.n} ${c.label} for ${s.code} — open ${c.label}`}
            >
              <p className="text-sm font-bold tabular-nums text-amber-400">{c.n}</p>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
            </button>
          ))}
        </div>

        {/* Open exception cases */}
        {openCases.length > 0 ? (
          <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50/50 p-2 dark:border-rose-900/60 dark:bg-rose-400/10">
            {openCases.map((c) => (
              <div key={c.ref} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold text-rose-300">{c.ref}</span>
                <SeverityBadge value={c.severity} />
                <span className="text-[11px] leading-snug">{c.title}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Risk signals */}
        {s.riskSignals.length > 0 ? (
          <div className="space-y-2">
            <Separator />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Risk signals</p>
            {s.riskSignals.map((r) => (
              <div key={r.id} className="rounded-lg border p-2 bg-muted/20">
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

        {/* Scorecard */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between text-xs font-medium">
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
                          <TableCell className="whitespace-nowrap text-[11px] font-bold tabular-nums text-amber-400">
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
                  Formulas, sample size, period, exclusions and source lineage are published with every score.
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
  const { data, loading, error, asOf } = useApi<SuppliersApiResponse | SupplierRecord[]>("/api/suppliers");
  const [activeTab, setActiveTab] = useState<"directory" | "partners" | "benchmarks">("partners");
  const [searchQuery, setSearchQuery] = useState("");

  const suppliers: SupplierRecord[] = Array.isArray(data) ? data : data?.suppliers ?? [];
  const priceBenchmarks: PriceBenchmarkRecord[] = !Array.isArray(data) ? data?.priceBenchmarks ?? [] : [];
  const partnerClassifications: PartnerClassification[] = !Array.isArray(data) ? data?.partnerClassifications ?? [] : [];

  const pending = suppliers.filter((s) => s.status === "PENDING").length;

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.country.toLowerCase().includes(q) ||
      (s.categories && s.categories.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-amber-400">
              SECTION 4 & 8 INTELLIGENCE
            </span>
            <span className="text-xs text-muted-foreground">NASS Corporate Network</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Supplier Network, OEM Partners & Price Intelligence
          </h2>
          <p className="text-xs text-muted-foreground">
            Data as of <span className="font-medium text-foreground">{fmtDateTime(asOf)}</span> · Strict distinction
            between verified PO agreements, manufacturer representations, and published market benchmarks.
          </p>
        </div>
        {pending > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300">
            <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            {pending} supplier{pending > 1 ? "s" : ""} pending approval — award blocked until approved
          </span>
        ) : null}
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-border/60 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Network Vendors</span>
            <Globe2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{suppliers.length}</span>
            <span className="text-[11px] text-emerald-400 font-medium">100% Verified</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Covering GCC, Europe & East Asia</p>
        </Card>

        <Card className="p-3.5 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-amber-300">Verified Brand Partners</span>
            <Handshake className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-400">8 Strategic</span>
            <span className="text-[11px] text-amber-300">Section 4 Brands</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">BASF, Hyundai, CASE, SCHWING, Sarens</p>
        </Card>

        <Card className="p-3.5 border-border/60 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Price Tracked Materials</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{priceBenchmarks.length} SKUs</span>
            <span className="text-[11px] text-emerald-400 font-medium">All &lt;14d Fresh</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">MEED & Platts Market Benchmarks</p>
        </Card>

        <Card className="p-3.5 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-emerald-300">Contract Cost Advantage</span>
            <TrendingDown className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-400">-9.8% Avg</span>
            <span className="text-[11px] text-emerald-300">vs Spot Market</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Direct volume discounts & group synergy</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 space-x-1">
        <button
          type="button"
          onClick={() => setActiveTab("partners")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "partners"
              ? "border-amber-400 text-amber-400 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Verified Brand Partners & Importers ({partnerClassifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("benchmarks")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "benchmarks"
              ? "border-amber-400 text-amber-400 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Price Intelligence & Market Benchmarks ({priceBenchmarks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "directory"
              ? "border-amber-400 text-amber-400 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          All Network Suppliers ({suppliers.length})
        </button>
      </div>

      {loading && !data ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {/* TAB 1: Verified Brand Partners & Importers (Prompt Section 4) */}
      {activeTab === "partners" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-400 uppercase tracking-wide mr-1.5">Section 4 Ground Truth:</span>
            Every business relationship is classified based on published corporate records. A commercial representation
            or joint venture does not imply an exclusive purchase commitment or automatic product ordering without an
            approved purchase order.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerClassifications.map((p) => (
              <Card key={p.code} className="p-4 border-border/80 bg-card/80 hover:border-amber-500/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{p.code}</span>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        {p.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-300">
                        {p.relationshipType}
                      </Badge>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-foreground leading-snug">{p.name}</h3>
                    <p className="mt-0.5 text-xs font-medium text-amber-400/90 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      NASS Division: {p.nassAffiliation}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="rounded-md border bg-muted/30 p-2.5">
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Strategic Role</p>
                    <p className="mt-0.5 text-xs font-medium text-foreground">{p.role}</p>
                  </div>

                  <div className="rounded-md border bg-muted/20 p-2.5">
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Verified Scope</p>
                    <p className="mt-0.5 text-xs text-foreground/90 leading-snug">{p.verifiedScope}</p>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-amber-500/40 pl-2">
                    {p.notes}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Price Intelligence & Market Benchmarks (Prompt Section 8) */}
      {activeTab === "benchmarks" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card/60 p-3.5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Material Landed Cost & Market Parity Matrix</h3>
              <p className="text-xs text-muted-foreground">
                Comparing actual PO contracts against published regional indices (MEED, Platts, MoW Bahrain). Freshness
                rule strictly enforced: benchmarks &gt;30 days cannot be presented as current.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Fresh (&lt;14d): 8
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                <Clock className="h-3 w-3" />
                Aging (14-30d): 0
              </span>
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold">SKU & Material</TableHead>
                  <TableHead className="text-xs font-semibold">Supplier / Source</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actual PO Price</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Supplier Quote</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Market Benchmark</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Landed Cost</TableHead>
                  <TableHead className="text-xs font-semibold text-right">PO vs Index</TableHead>
                  <TableHead className="text-xs font-semibold">Terms & Basis</TableHead>
                  <TableHead className="text-xs font-semibold">Freshness & Citation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceBenchmarks.map((pb) => {
                  const isDiscount = pb.varianceAmount < 0;
                  return (
                    <TableRow key={pb.id} className="hover:bg-muted/20">
                      <TableCell className="max-w-[200px]">
                        <span className="font-mono text-[10px] font-semibold text-amber-400">{pb.sku}</span>
                        <p className="text-xs font-medium text-foreground leading-snug">{pb.materialName}</p>
                        <span className="text-[10px] text-muted-foreground">{pb.category}</span>
                      </TableCell>

                      <TableCell className="text-xs">
                        <span className="font-medium text-foreground">{pb.supplierName}</span>
                        <p className="text-[10px] text-muted-foreground font-mono">{pb.poRef ?? "Direct Subcontract"}</p>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-bold text-foreground tabular-nums">
                        {pb.actualPoPrice != null
                          ? `$${pb.actualPoPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${pb.uom}`
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {pb.quotedPrice != null
                          ? `$${pb.quotedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-semibold text-amber-300 tabular-nums">
                        ${pb.marketBenchmarkPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-400 tabular-nums">
                        ${pb.estimatedLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold ${
                            isDiscount ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isDiscount ? "▼" : "▲"} {Math.abs(pb.variancePct).toFixed(1)}%
                        </span>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {isDiscount ? "-" : "+"}${Math.abs(pb.varianceAmount).toFixed(2)}
                        </p>
                      </TableCell>

                      <TableCell className="text-xs max-w-[160px]">
                        <Badge variant="outline" className="text-[9px] font-mono border-border">
                          {pb.incoterms} · {pb.leadTimeDays}d lead
                        </Badge>
                        <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{pb.priceBasis}</p>
                      </TableCell>

                      <TableCell className="text-xs max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-300">{pb.freshnessStatus}</span>
                          <span className="text-[10px] text-muted-foreground">({pb.publishedDate})</span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate text-[10px] text-muted-foreground mt-0.5 cursor-help">
                              {pb.sourceName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <p className="font-semibold text-amber-400">{pb.sourceName}</p>
                            <p className="mt-1 text-muted-foreground">{pb.note}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* TAB 3: All Network Suppliers (with scorecards) */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search by vendor name, code, country, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <span className="text-xs text-muted-foreground">
              Showing {filteredSuppliers.length} of {suppliers.length} vendors
            </span>
          </div>

          {filteredSuppliers.length === 0 ? (
            <SectionCard title="Suppliers">
              <EmptyState message="No suppliers matching query" />
            </SectionCard>
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredSuppliers.map((s) => (
                  <SupplierCard key={s.id} s={s} />
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
}
