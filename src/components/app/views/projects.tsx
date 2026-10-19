"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/app-state";
import {
  AlertTriangle,
  Building,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileCheck,
  FolderGit2,
  HardHat,
  Info,
  Layers,
  MapPin,
  Package,
  ShieldCheck,
  Ship,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApi } from "@/lib/client";
import {
  EmptyState,
  ErrorState,
  EvidenceBadge,
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
interface LegalEntityRow {
  id: string;
  code: string;
  name: string;
  country: string;
  role: string;
}
interface ProjectRow {
  id: string;
  code: string;
  name: string;
  site: string;
  workPackage: string | null;
  costCode: string | null;
  status: string;
  purchaseRequests: { ref: string; status: string }[];
  purchaseOrders?: { ref: string; status: string; totalAmount: number; currency: string }[];
  legalEntity?: { code: string; name: string; role: string } | null;
  evidences?: { id: string; sourceSystem: string; sourceRef: string | null; label: string; note: string | null }[];
}
interface LinkedShipment {
  ref: string;
  status: string;
  displayEta: string | null;
  freshness: string;
  poId: string | null;
  vesselName?: string | null;
  carrier?: string | null;
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
  material: { sku: string; name: string; uom: string; criticality?: string; category?: string };
  stockAvailable: number;
  inTransit: number;
  gap: number;
  linkedShipment: LinkedShipment | null;
}
interface ProjectsPayload {
  projects: ProjectRow[];
  requirements: RequirementRow[];
  businessUnits?: LegalEntityRow[];
}

/* Countdown chip: overdue rose, <7d amber, else emerald. */
function CountdownChip({ iso }: { iso: string }) {
  const d = daysUntil(iso);
  if (d === null) return <span className="text-[10px] text-muted-foreground">no date</span>;
  if (d < 0)
    return (
      <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
        overdue {Math.abs(d)}d
      </span>
    );
  if (d < 7)
    return (
      <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
        in {d}d
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300">
      in {d}d
    </span>
  );
}

/* Demand type: PLANNED zinc vs APPROVED teal — never conflated (M14). */
function DemandTypeBadge({ value }: { value: string }) {
  const cls =
    value === "APPROVED"
      ? "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-400/10 dark:text-teal-300"
      : value === "CONSUMED"
        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-400/10 dark:text-emerald-300"
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
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
        {value.replaceAll("_", " ")}
      </span>
    );
  if (value === "ALLOCATED")
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300">
        ALLOCATED
      </span>
    );
  if (value === "SATISFIED")
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300">
        SATISFIED
      </span>
    );
  return <StatusPill value={value} />;
}

function GapChip({ gap, uom }: { gap: number; uom: string }) {
  if (gap < 0)
    return (
      <span className="ml-1.5 inline-flex items-center rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
        shortfall {Math.abs(gap).toLocaleString()} {uom}
      </span>
    );
  return (
    <span className="ml-1.5 inline-flex items-center rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300">
      covered +{gap.toLocaleString()}
    </span>
  );
}

export function ProjectsView() {
  const { data, loading, error, asOf } = useApi<ProjectsPayload>("/api/projects");
  const { drill } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>("portfolio");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>("ALL");

  // React to cross-view navigation requests (e.g. CEO Tower "View BOQ & Stock")
  useEffect(() => {
    if (drill?.view === "projects" && drill.ref) {
      setSelectedProjectCode(drill.ref);
      setActiveTab("boq-demands");
    }
  }, [drill]);

  const selectedProject = useMemo(() => {
    if (!data?.projects || selectedProjectCode === "ALL") return null;
    return data.projects.find((p) => p.code === selectedProjectCode) || null;
  }, [data?.projects, selectedProjectCode]);

  const filteredRequirements = useMemo(() => {
    if (!data?.requirements) return [];
    if (selectedProjectCode === "ALL") return data.requirements;
    return data.requirements.filter((r) => r.project.code === selectedProjectCode);
  }, [data?.requirements, selectedProjectCode]);

  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    if (projectFilter === "ALL") return data.projects;
    if (projectFilter === "ACTIVE") return data.projects.filter((p) => p.status === "ACTIVE" || p.status === "CONFIRMED ACTIVE");
    if (projectFilter === "HISTORICAL") return data.projects.filter((p) => p.status.includes("HISTORICAL"));
    return data.projects;
  }, [data, projectFilter]);

  const byProject = useMemo(() => {
    const m = new Map<string, RequirementRow[]>();
    for (const r of data?.requirements ?? []) {
      const arr = m.get(r.project.code) ?? [];
      arr.push(r);
      m.set(r.project.code, arr);
    }
    return m;
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, historical: 0, totalReqs: 0, atRiskReqs: 0 };
    const total = data.projects.length;
    const active = data.projects.filter((p) => p.status === "ACTIVE" || p.status === "CONFIRMED ACTIVE").length;
    const historical = data.projects.filter((p) => p.status.includes("HISTORICAL")).length;
    const totalReqs = data.requirements.length;
    const atRiskReqs = data.requirements.filter((r) => r.status === "AT_RISK" || r.status === "SHORT").length;
    return { total, active, historical, totalReqs, atRiskReqs };
  }, [data]);

  const clientNameMap: Record<string, string> = {
    "PRJ-BIA-01": "Ministry of Works, Municipalities Affairs & Urban Planning",
    "PRJ-ARL-02": "Bahrain Real Estate Investment Co. (Edamah) / Govt of Bahrain",
    "PRJ-KAMC-03": "Arabian Gulf University (AGU) / Saudi Fund for Development",
    "PRJ-MAR-04": "Bahrain Marina Development Company",
    "PRJ-RCSI-05": "Royal College of Surgeons in Ireland (Bahrain)",
    "PRJ-ALBA-06": "Aluminium Bahrain B.S.C. (Alba)",
    "PRJ-BBA-07": "NASS Bulk Aggregate Logistics Corridor",
    "PRJ-2201": "Bahrain Marina Development Company",
    "PRJ-2204": "Ministry of Industry & Commerce / Askar Industrial",
    "PRJ-2210": "Bahrain Airport Company / Electricity & Water Authority",
  };

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">NASS Project Intelligence &amp; Material Control</h2>
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px]">
              Executive Tower
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Operational register across confirmed active projects, candidate scopes, BOQ material demands, and NASS Group subsidiaries.
          </p>
        </div>
        <p className="text-[10px] tabular-nums text-muted-foreground">As of {fmtDateTime(asOf)}</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <EmptyState message="No project records available." />
      ) : (
        <>
          {/* Executive KPI Summary Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Card className="p-3 bg-card/60 backdrop-blur-sm border-border/60">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Projects</span>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats.total}</p>
              <span className="text-[10px] text-muted-foreground">Across Bahrain &amp; Gulf</span>
            </Card>
            <Card className="p-3 bg-card/60 backdrop-blur-sm border-emerald-500/30">
              <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Confirmed Active</span>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">{stats.active}</p>
              <span className="text-[10px] text-muted-foreground">Projects A–E + Corridor</span>
            </Card>
            <Card className="p-3 bg-card/60 backdrop-blur-sm border-zinc-500/30">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Historical Archive</span>
              <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-300">{stats.historical}</p>
              <span className="text-[10px] text-muted-foreground">Alba Potline 6 Scope</span>
            </Card>
            <Card className="p-3 bg-card/60 backdrop-blur-sm border-border/60">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">BOQ Demands</span>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats.totalReqs}</p>
              <span className="text-[10px] text-muted-foreground">Approved work packages</span>
            </Card>
            <Card className="p-3 bg-card/60 backdrop-blur-sm border-rose-500/30">
              <span className="text-[10px] font-medium text-rose-400 uppercase tracking-wider">Critical Exposure</span>
              <p className="mt-1 text-2xl font-bold tabular-nums text-rose-400">{stats.atRiskReqs}</p>
              <span className="text-[10px] text-rose-400/80">Stockout / ETA risk</span>
            </Card>
          </div>

          {/* Main Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/60 p-1 border border-border/40">
              <TabsTrigger value="portfolio" className="text-xs gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                Projects Portfolio
              </TabsTrigger>
              <TabsTrigger value="boq-demands" className="text-xs gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                BOQ Material Demands ({data.requirements.length})
              </TabsTrigger>
              <TabsTrigger value="business-units" className="text-xs gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                NASS Corporate Footprint ({data.businessUnits?.length ?? 18})
              </TabsTrigger>
              <TabsTrigger value="unprocured-risk" className="text-xs gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                Exposure &amp; Shortages ({stats.atRiskReqs})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Projects Portfolio */}
            <TabsContent value="portfolio" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Filter:</span>
                  <Button
                    size="sm"
                    variant={projectFilter === "ALL" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setProjectFilter("ALL")}
                  >
                    All ({data.projects.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={projectFilter === "ACTIVE" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setProjectFilter("ACTIVE")}
                  >
                    Active ({stats.active})
                  </Button>
                  <Button
                    size="sm"
                    variant={projectFilter === "HISTORICAL" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setProjectFilter("HISTORICAL")}
                  >
                    Historical ({stats.historical})
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Publicly Evidenced Tenders &amp; Execution Scopes</span>
                </div>
              </div>

              {/* Projects Grid */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => {
                  const reqs = byProject.get(p.code) ?? [];
                  const isHistorical = p.status.includes("HISTORICAL");
                  const clientName = clientNameMap[p.code] || "Public Authority / Client";

                  return (
                    <Card
                      key={p.id}
                      className={`relative flex flex-col justify-between overflow-hidden border transition-all duration-200 hover:border-amber-500/40 ${
                        isHistorical
                          ? "bg-zinc-950/40 border-zinc-800 opacity-80"
                          : "bg-card/90 border-border/60 hover:shadow-md"
                      }`}
                    >
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                              {p.code}
                            </span>
                            <h3 className="mt-1.5 text-sm font-semibold leading-snug tracking-tight text-foreground">
                              {p.name}
                            </h3>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                              isHistorical
                                ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>

                        {/* Client & Contracting Unit */}
                        <div className="space-y-1 text-xs border-t border-border/40 pt-2">
                          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span>Client / Authority:</span>
                            <span className="font-medium text-foreground text-right max-w-[200px] truncate" title={clientName}>
                              {clientName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span>Contracting Entity:</span>
                            <span className="font-mono font-medium text-foreground">
                              {p.legalEntity?.code ?? "NASS-CON"} ({p.legalEntity?.name?.split(" ")[1] ?? "Contracting"})
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span>Location:</span>
                            <span className="text-right max-w-[210px] truncate" title={p.site}>
                              {p.site}
                            </span>
                          </div>
                        </div>

                        {/* Work Package Scope */}
                        {p.workPackage && (
                          <div className="rounded bg-muted/40 p-2 text-[11px] border border-border/30">
                            <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">
                              Approved Scope / Packages:
                            </span>
                            <p className="mt-0.5 text-foreground leading-relaxed line-clamp-2" title={p.workPackage}>
                              {p.workPackage}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Metrics */}
                      <div className="bg-muted/30 px-4 py-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {p.costCode || "CC-GENERAL"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] tabular-nums font-semibold text-foreground">
                            {reqs.length} BOQ line{reqs.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300"
                          onClick={() => {
                            setSelectedProjectCode(p.code);
                            setActiveTab("boq-demands");
                          }}
                        >
                          View Demands <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 2: BOQ Material Demands */}
            <TabsContent value="boq-demands" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Project Filter:</span>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                    value={selectedProjectCode}
                    onChange={(e) => setSelectedProjectCode(e.target.value)}
                  >
                    <option value="ALL">All Projects ({data.requirements.length} demands)</option>
                    {data.projects.map((p) => {
                      const count = byProject.get(p.code)?.length ?? 0;
                      return (
                        <option key={p.code} value={p.code}>
                          {p.code} — {p.name.slice(0, 40)}... ({count} demands{p.status.includes("HISTORICAL") ? " · Historical" : ""})
                        </option>
                      );
                    })}
                  </select>
                  {selectedProject && (
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-amber-400/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400 border border-amber-400/20">
                        {selectedProject.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                          selectedProject.status.includes("HISTORICAL")
                            ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {selectedProject.status}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Planned requirement ≠ approved ≠ consumed (M14 rule). Stock strictly separates on-hand from in-transit.
                </div>
              </div>

              {filteredRequirements.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-card/60 p-8 text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div className="max-w-xl mx-auto space-y-2">
                    <h4 className="text-base font-bold text-foreground">
                      {selectedProject ? `Project Register: ${selectedProject.code}` : "No Material Demands Recorded"}
                    </h4>
                    {selectedProject ? (
                      <div className="space-y-3 text-xs text-muted-foreground text-left bg-muted/30 p-4 rounded-lg border border-border/40">
                        <div className="flex justify-between items-start border-b border-border/30 pb-2">
                          <span className="font-semibold text-foreground">{selectedProject.name}</span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                            {selectedProject.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Client / Authority:</span>
                            <span className="font-medium text-foreground">
                              {clientNameMap[selectedProject.code] || "Public Authority / Client"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Site Location:</span>
                            <span className="font-medium text-foreground">{selectedProject.site}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Work Packages:</span>
                            <span className="font-mono text-amber-400">{selectedProject.workPackage || "WP-ALBA-FS, WP-ALBA-STL"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Contracting Entity:</span>
                            <span className="font-medium text-foreground">
                              {selectedProject.legalEntity?.code ?? "NASS-CON"} ({selectedProject.legalEntity?.name ?? "NASS Contracting"})
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-border/30 pt-2 space-y-1 text-[11px] text-zinc-300">
                          <p className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <Info className="h-3.5 w-3.5" />
                            <span>Historical Archive Status: 0 Active Demands</span>
                          </p>
                          <p>
                            • <strong>No BOQ records:</strong> No active BOQ lines are currently open for this project scope.
                          </p>
                          <p>
                            • <strong>No material demands:</strong> No material demands are recorded for this project.
                          </p>
                          <p>
                            • <strong>No linked stock records:</strong> No active on-hand warehouse reservations or inbound shipments are allocated.
                          </p>
                          <p className="text-[10px] text-muted-foreground pt-1 italic">
                            All smelter reduction potlines, civil works foundations, and structural steel packages were historically closed out and finalized.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No BOQ material demand records match the selected filter.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => setSelectedProjectCode("ALL")}
                    >
                      View All Project Demands ({data.requirements.length})
                    </Button>
                  </div>
                </div>
              ) : (
                /* Requirements Table */
                <Card className="border border-border/60">
                  <ScrollTable maxHeight="max-h-[550px]">
                    <Table className="min-w-[1080px]">
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Project</TableHead>
                          <TableHead>Material / SKU</TableHead>
                          <TableHead>Work Package</TableHead>
                          <TableHead>Demand</TableHead>
                          <TableHead>Required on site</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Qty Required</TableHead>
                          <TableHead>Stock Coverage vs Required</TableHead>
                          <TableHead className="text-right">In Transit</TableHead>
                          <TableHead>Linked Inbound Logistics</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequirements.map((r) => (
                          <TableRow key={r.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono text-xs font-semibold">
                              <span className="text-amber-400">{r.project.code}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-foreground">{r.material.sku}</span>
                              <span
                                className="block max-w-[200px] truncate text-[11px] text-muted-foreground"
                                title={r.material.name}
                              >
                                {r.material.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-medium text-foreground">{r.workPackage ?? "General Site"}</span>
                              {r.note && (
                                <span className="mt-0.5 block max-w-[210px] truncate text-[10px] text-muted-foreground" title={r.note}>
                                  {r.note}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DemandTypeBadge value={r.demandType} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              <div className="flex items-center gap-1.5">
                                <span>{fmtDate(r.requiredOnSite)}</span>
                                <CountdownChip iso={r.requiredOnSite} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <ReqStatusPill value={r.status} />
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold tabular-nums">
                              {r.quantity.toLocaleString()} {r.uom}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-xs">
                                <span className="font-mono text-[11px] tabular-nums text-foreground">
                                  {r.stockAvailable.toLocaleString()} {r.uom}
                                </span>
                                <GapChip gap={r.gap} uom={r.uom} />
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                              {r.inTransit > 0 ? (
                                <span className="font-medium text-amber-400">
                                  {r.inTransit.toLocaleString()} {r.uom}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.linkedShipment ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Ship className="h-3 w-3 text-amber-400" />
                                    <span className="font-mono font-semibold text-foreground">
                                      {r.linkedShipment.ref}
                                    </span>
                                    <FreshnessBadge value={r.linkedShipment.freshness} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground block">
                                    ETA: {fmtDate(r.linkedShipment.displayEta)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Dispatch pending</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollTable>
                </Card>
              )}
            </TabsContent>

            {/* TAB 3: NASS Corporate Footprint */}
            <TabsContent value="business-units" className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Nass Group Corporate Footprint &amp; Divisions</h3>
                  <p className="text-xs text-muted-foreground">
                    Integrated operating divisions, specialized industrial subsidiaries, joint ventures, and material supply arms.
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                  18 Entities Registered
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.businessUnits || []).map((bu) => (
                  <Card key={bu.code} className="p-3.5 bg-card/70 border-border/60 hover:border-amber-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        {bu.code}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {bu.country === "BH" ? "Bahrain" : bu.country}
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-xs font-semibold text-foreground leading-snug">{bu.name}</h4>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{bu.role}</p>
                    <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Publicly Evidenced
                      </span>
                      <span>Verified Operating Entity</span>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: Unprocured Exposure & Shortages */}
            <TabsContent value="unprocured-risk" className="space-y-4">
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Executive Procurement Exposure &amp; Delivery Criticalities</span>
                </div>
                <p className="mt-1 text-rose-300/90 leading-relaxed">
                  The following requirements carry projected on-site stockouts, delayed ETA slips, or critical girder/waterproofing approval dependencies requiring CEO or Procurement Director action.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {data.requirements
                  .filter((r) => r.status === "AT_RISK" || r.status === "SHORT")
                  .map((r) => (
                    <Card key={r.id} className="p-4 border-rose-500/40 bg-card/90 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-amber-400">{r.project.code}</span>
                          <h4 className="text-sm font-semibold text-foreground">{r.material.name}</h4>
                          <span className="text-[11px] font-mono text-muted-foreground">SKU: {r.material.sku}</span>
                        </div>
                        <span className="inline-flex items-center rounded-md border border-rose-400/40 bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                          {r.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded border border-border/40">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Required on site:</span>
                          <span className="font-semibold text-foreground">{fmtDate(r.requiredOnSite)}</span>
                          <span className="block mt-0.5"><CountdownChip iso={r.requiredOnSite} /></span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Lead Time:</span>
                          <span className="font-semibold text-foreground">{r.leadTimeDays ?? "—"} days</span>
                          <span className="text-[10px] text-rose-400 block mt-0.5">Critical path</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Required Quantity:</span>
                          <span className="font-mono font-bold text-foreground">{r.quantity.toLocaleString()} {r.uom}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>On-Hand Available:</span>
                          <span className="font-mono text-foreground">{r.stockAvailable.toLocaleString()} {r.uom}</span>
                        </div>
                        <div className="flex justify-between text-rose-400 font-semibold border-t border-border/40 pt-1">
                          <span>Projected Shortfall:</span>
                          <span className="font-mono">{Math.abs(r.gap).toLocaleString()} {r.uom}</span>
                        </div>
                      </div>

                      {r.note && (
                        <p className="text-[11px] text-muted-foreground italic border-l-2 border-amber-400 pl-2">
                          {r.note}
                        </p>
                      )}
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
