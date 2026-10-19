"use client";

import React, { useEffect, useState } from "react";
import {
  Crown,
  Building2,
  Compass,
  TrendingUp,
  Scale,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileText,
  Clock,
  DollarSign,
  Layers,
  Ship,
  Sparkles,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/app-state";
import { safeParseResponse } from "@/lib/client";

type TabId = "portfolio" | "pricing" | "weights" | "fleet" | "partners" | "decisions";

export function CeoTowerView({ drillRef }: { drillRef?: string }) {
  const { drillTo } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>(
    drillRef?.startsWith("DEC-") ? "decisions" : "portfolio"
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ceo-control-tower");
      const parsed = await safeParseResponse<any>(res);
      if (!parsed.ok) throw new Error(parsed.error?.message || "Failed to load CEO Control Tower data");
      const json = parsed.data || parsed;
      if (json?.success === false) throw new Error(json?.error || "Failed to load CEO Control Tower data");
      setData(json.data || json);
    } catch (err: any) {
      setError(err.message || "Network error loading control tower.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecisionAction = async (decisionRef: string, action: "APPROVE" | "REJECT" | "EXECUTE") => {
    try {
      setActionLoading(`${decisionRef}-${action}`);
      setFeedback(null);
      const res = await fetch("/api/ceo-control-tower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionRef,
          action,
          actor: "NASS Executive Committee",
          notes: `Action ${action} formally confirmed via CEO Decision Tower UI.`,
        }),
      });
      const parsed = await safeParseResponse<any>(res);
      if (!parsed.ok) throw new Error(parsed.error?.message || "Action failed");
      const json = parsed.data || parsed;
      if (json?.success === false) throw new Error(json?.error || "Action failed");
      setFeedback({ msg: json.message || `Decision ${decisionRef} updated to ${action}.`, type: "success" });
      await fetchData();
    } catch (err: any) {
      setFeedback({ msg: err.message || "Failed to execute decision.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading NASS Group Executive Project Intelligence &amp; Decision Tower…
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
        <h3 className="mt-2 text-base font-semibold text-foreground">Error Loading Executive Layer</h3>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded border border-primary/30 bg-primary/20 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/30"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { portfolio, priceIntelligence, shipmentWeightAudit, partnerDirectory, equipmentFleet, ceoDecisions } =
    data || {};

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Executive Banner ── */}
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-card/95 via-card/80 to-primary/10 p-5 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                <Crown className="h-3 w-3" /> EXECUTIVE GOVERNANCE TOWER
              </span>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                LIVE SECURE RECONCILIATION
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              NASS Group <span className="text-gold-grad">Live Project &amp; Procurement Intelligence</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Authoritative operational control tower across 18 corporate divisions, 5 active EPC projects, international supply routes, and executive decision workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/60 hover:bg-primary/10"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" /> Refresh Feeds
            </button>
            <div className="rounded-lg border border-primary/20 bg-background/50 px-3 py-1.5 text-right">
              <div className="text-[10px] text-muted-foreground">Portfolio Scope</div>
              <div className="text-xs font-bold text-primary">BHD 178.6M Committed</div>
            </div>
          </div>
        </div>

        {/* Executive KPI Bar */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-primary/15 bg-background/40 p-3">
            <div className="text-[11px] text-muted-foreground">Active Projects</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">{portfolio?.confirmedActiveCount || 5}</span>
              <span className="text-[10px] text-emerald-400 font-medium">Verified Active</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">1 Historical Ref</div>
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/40 p-3">
            <div className="text-[11px] text-muted-foreground">Corporate Units</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">18</span>
              <span className="text-[10px] text-primary font-medium">Operating Divisions</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">Nass Corp B.S.C.</div>
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/40 p-3">
            <div className="text-[11px] text-muted-foreground">Price Benchmarks</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">{priceIntelligence?.totalBenchmarks || 4}</span>
              <span className="text-[10px] text-sky-400 font-medium">LME / MEED Active</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">Landed Cost Formula</div>
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/40 p-3">
            <div className="text-[11px] text-muted-foreground">Weight Variance</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-amber-400">
                {shipmentWeightAudit?.discrepanciesFlagged || 1}
              </span>
              <span className="text-[10px] text-amber-400/90 font-medium">&gt; ±2.5% Tol</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">SHP-8804 (+2.99%)</div>
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/40 p-3">
            <div className="text-[11px] text-muted-foreground">Heavy Machinery</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">{equipmentFleet?.length || 5}</span>
              <span className="text-[10px] text-primary font-medium">Assets Tracked</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">500t/600t Cranes &amp; SPMT</div>
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/40 p-3">
            <div className="text-[11px] text-muted-foreground">Decisions Pending</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-amber-400">
                {ceoDecisions?.pendingReviewCount || 4}
              </span>
              <span className="text-[10px] text-amber-400 font-medium">CEO Attention</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground/70">10-Point Briefs</div>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rounded-lg border p-3 text-xs font-medium transition-all ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-primary/20 overflow-x-auto gap-2 pb-1">
        <button
          onClick={() => setActiveTab("portfolio")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "portfolio"
              ? "border-b-2 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" /> Executive Portfolio (5 Active + 1 Ref)
        </button>

        <button
          onClick={() => setActiveTab("pricing")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "pricing"
              ? "border-b-2 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Price Benchmarks &amp; Landed Cost
        </button>

        <button
          onClick={() => setActiveTab("weights")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "weights"
              ? "border-b-2 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
          }`}
        >
          <Scale className="h-3.5 w-3.5" /> Weight Hierarchy &amp; Variance Audit
        </button>

        <button
          onClick={() => setActiveTab("fleet")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "fleet"
              ? "border-b-2 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
          }`}
        >
          <Truck className="h-3.5 w-3.5" /> Heavy Equipment Fleet
        </button>

        <button
          onClick={() => setActiveTab("partners")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "partners"
              ? "border-b-2 border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
          }`}
        >
          <Compass className="h-3.5 w-3.5" /> NASS Units &amp; Partner Brands (18+5)
        </button>

        <button
          onClick={() => setActiveTab("decisions")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === "decisions"
              ? "border-b-2 border-amber-400 bg-amber-400/10 text-amber-400 font-bold"
              : "text-muted-foreground hover:bg-card/40 hover:text-foreground"
          }`}
        >
          <Crown className="h-3.5 w-3.5 text-amber-400" /> 10-Point CEO Decisions ({ceoDecisions?.pendingReviewCount || 4})
        </button>
      </div>

      {/* ── TAB 1: EXECUTIVE PORTFOLIO ── */}
      {activeTab === "portfolio" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              NASS Public Project Portfolio &amp; Contractual Commitments
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Rule: Historical completed works are marked HISTORICAL_REFERENCE and segregated from live spending.
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {portfolio?.projects?.map((proj: any) => {
              const isHistorical = proj.statusClassification === "HISTORICAL_REFERENCE";
              return (
                <div
                  key={proj.code}
                  className={`relative flex flex-col justify-between rounded-xl border p-4 shadow-lg transition-all ${
                    isHistorical
                      ? "border-slate-800 bg-slate-900/30 opacity-80"
                      : "border-primary/25 bg-card/70 hover:border-primary/50"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{proj.code}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isHistorical
                            ? "bg-slate-700/50 text-slate-300"
                            : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {isHistorical ? "HISTORICAL ARCHIVE" : "CONFIRMED ACTIVE"}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-foreground">{proj.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Client: {proj.client}</p>

                    <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-3">
                      {proj.scopeDescription}
                    </p>

                    <div className="mt-3 rounded-lg border border-primary/10 bg-background/50 p-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Contract Value:</span>
                        <span className="font-bold text-foreground">
                          {proj.contractValue.amountBhd
                            ? `BHD ${proj.contractValue.amountBhd.toLocaleString()} (≈ $${proj.contractValue.amountUsd.toLocaleString()})`
                            : "Contract value confidential / historical"}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">Milestone:</span>
                        <span className="text-foreground">{proj.completionDate}</span>
                      </div>
                    </div>

                    {!isHistorical && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Progress:</span>
                          <span className="font-semibold text-foreground">
                            {proj.actualProgressPct}% / {proj.plannedProgressPct}% planned
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${
                              proj.variancePct < 0 ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${Math.min(proj.actualProgressPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {proj.workPackages?.length > 0 && (
                      <div className="mt-3 border-t border-primary/10 pt-2.5">
                        <div className="text-[11px] font-medium text-foreground">Work Packages:</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {proj.workPackages.map((wp: any) => (
                            <span
                              key={wp.code}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary"
                              title={`${wp.name} (${wp.scope})`}
                            >
                              {wp.code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2 border-t border-primary/10 flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">
                      {proj.materialRequirementsSummary?.length || 0} Material Demands
                    </span>
                    <button
                      onClick={() => drillTo("projects", proj.code)}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      View BOQ &amp; Stock <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: PRICING & LANDED COST ── */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-card/60 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> GCC Landed Cost Intelligence Engine
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Standard GCC landed cost formulation applied: <span className="font-mono text-primary">FOB + Ocean Freight + 0.35% Marine Insurance + 5% GCC Customs Tariff + Port Handling / Stevedoring</span>. Market benchmarks are refreshed every 14 days and clearly separated from actual purchase orders.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card/70 shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-primary/20 bg-background/60 font-semibold text-foreground">
                <tr>
                  <th className="p-3">Material &amp; SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Benchmark Price</th>
                  <th className="p-3">Source &amp; Region</th>
                  <th className="p-3">Active PO Comparison</th>
                  <th className="p-3">Landed Cost Est (USD)</th>
                  <th className="p-3">Freshness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 text-muted-foreground">
                {priceIntelligence?.benchmarks?.map((b: any) => {
                  const po = b.purchaseOrders?.[0];
                  return (
                    <tr key={b.materialSku} className="hover:bg-primary/5 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-foreground">{b.materialName}</div>
                        <div className="font-mono text-[10px] text-primary">{b.materialSku}</div>
                      </td>
                      <td className="p-3">{b.category}</td>
                      <td className="p-3">
                        <span className="font-bold text-foreground">
                          {b.currency} {b.benchmarkPrice.toLocaleString()}
                        </span>{" "}
                        / {b.uom}
                        <div className="text-[10px] text-muted-foreground/70">{b.priceBasis}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{b.sourceName}</div>
                        <div className="text-[10px]">{b.marketRegion}</div>
                      </td>
                      <td className="p-3">
                        {po ? (
                          <div>
                            <span className="font-mono font-bold text-foreground">{po.poRef}</span>:{" "}
                            {po.currency} {po.poUnitPrice} / {b.uom}
                            <div
                              className={`text-[10px] font-semibold ${
                                po.varianceVsBenchmarkPct > 0 ? "text-amber-400" : "text-emerald-400"
                              }`}
                            >
                              {po.varianceVsBenchmarkPct > 0 ? `+${po.varianceVsBenchmarkPct}%` : `${po.varianceVsBenchmarkPct}%`} vs Benchmark
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] italic">No active PO line</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-primary">
                          ${b.estimatedLandedCost.totalLandedCostUsd.toLocaleString()}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          FOB ${b.estimatedLandedCost.fobUnitPriceUsd} + Frt ${b.estimatedLandedCost.oceanFreightEst} + Ins ${b.estimatedLandedCost.marineInsuranceEst} + Duty ${b.estimatedLandedCost.customsDutyEst} + Port ${b.estimatedLandedCost.portHandlingEst}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          {b.freshnessDays}d ago
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: WEIGHT HIERARCHY & VARIANCE AUDIT ── */}
      {activeTab === "weights" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-card/60 p-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Cargo Weight Hierarchy &amp; Discrepancy Policy
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {shipmentWeightAudit?.tolerancePolicy}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">1. Scale Weighbridge (Highest)</span>
              <span className="text-muted-foreground">&gt;</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">2. Packing List / BOL Manifest</span>
              <span className="text-muted-foreground">&gt;</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">3. Manufacturer TDS</span>
              <span className="text-muted-foreground">&gt;</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">4. Engineering Density Calc</span>
              <span className="text-muted-foreground">&gt;</span>
              <span className="rounded bg-primary/10 px-2 py-1 text-primary">5. Planning Estimate (Lowest)</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-primary/20 bg-card/70 shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-primary/20 bg-background/60 font-semibold text-foreground">
                <tr>
                  <th className="p-3">Shipment Ref</th>
                  <th className="p-3">Vessel &amp; Route</th>
                  <th className="p-3">Net Material Weight</th>
                  <th className="p-3">Manifest Gross Weight</th>
                  <th className="p-3">Weighbridge Measured</th>
                  <th className="p-3">Variance %</th>
                  <th className="p-3">Tolerance Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 text-muted-foreground">
                {shipmentWeightAudit?.shipments?.map((s: any) => {
                  const isFlagged = s.audit.toleranceStatus === "DISCREPANCY_FLAGGED";
                  return (
                    <tr
                      key={s.shipmentRef}
                      className={`hover:bg-primary/5 transition-colors ${
                        isFlagged ? "bg-amber-500/5 font-medium" : ""
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-foreground">{s.shipmentRef}</td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{s.vesselName || "Carrier Assigned"}</div>
                        <div className="text-[10px]">{s.tradeRoute}</div>
                      </td>
                      <td className="p-3">
                        {s.weights.netWeightKg ? `${s.weights.netWeightKg.toLocaleString()} kg` : "N/A"}
                      </td>
                      <td className="p-3">
                        {s.weights.grossWeightKg ? `${s.weights.grossWeightKg.toLocaleString()} kg` : "N/A"}
                        <div className="text-[10px] text-muted-foreground/70">{s.weights.weightDataSource}</div>
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {s.weights.measuredWeighbridgeKg ? `${s.weights.measuredWeighbridgeKg.toLocaleString()} kg` : "Pending scale"}
                      </td>
                      <td className="p-3">
                        {s.audit.variancePct != null ? (
                          <span
                            className={`font-bold ${
                              isFlagged ? "text-amber-400" : "text-emerald-400"
                            }`}
                          >
                            {s.audit.variancePct > 0 ? `+${s.audit.variancePct}%` : `${s.audit.variancePct}%`}
                          </span>
                        ) : (
                          "0.00%"
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isFlagged
                              ? "border border-amber-500/40 bg-amber-500/10 text-amber-400"
                              : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {s.audit.toleranceStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => drillTo("import-tracking", s.shipmentRef)}
                          className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20"
                        >
                          Audit Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: HEAVY EQUIPMENT FLEET ── */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Heavy Construction Equipment &amp; Machinery Register
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Distinguishes Owned, Joint-Venture (Sarens Nass), Leased, and Mobilizing assets.
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {equipmentFleet?.map((eq: any) => (
              <div
                key={eq.tag}
                className="rounded-xl border border-primary/25 bg-card/70 p-4 shadow-lg hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{eq.tag}</span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {eq.ownershipStatus}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-bold text-foreground">{eq.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {eq.make} · Model: {eq.model}
                </p>

                <div className="mt-3 rounded-lg border border-primary/10 bg-background/50 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rated Capacity:</span>
                    <span className="font-bold text-foreground">
                      {eq.capacity} {eq.capacityUnit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condition:</span>
                    <span className="font-semibold text-emerald-400">{eq.operatingCondition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project Allocation:</span>
                    <span className="font-mono font-medium text-foreground">
                      {eq.currentProjectCode || "Central Yard Reserve"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned Operator:</span>
                    <span className="text-foreground">{eq.assignedOperator || "Crew Pool"}</span>
                  </div>
                </div>

                {eq.mobilizationRoute && (
                  <div className="mt-2 text-[10px] text-muted-foreground/80">
                    <span className="font-semibold text-foreground">Mobilization:</span> {eq.mobilizationRoute}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: NASS CORPORATE UNITS & PARTNERS ── */}
      {activeTab === "partners" && (
        <div className="space-y-6">
          {/* NASS Corporate Footprint */}
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> NASS Group 18 Operating Entities &amp; Divisions
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Corporate structure under Nass Corporation B.S.C. (Closed) &amp; NASS The Group.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partnerDirectory?.nassCorporateUnits?.map((unit: any) => (
                <div key={unit.code} className="rounded-lg border border-primary/20 bg-card/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{unit.code}</span>
                    <span className="text-[10px] text-muted-foreground">{unit.division}</span>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-foreground">{unit.name}</h4>
                  <p className="text-[11px] text-muted-foreground">{unit.role}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {unit.capabilities?.map((cap: string, idx: number) => (
                      <span key={idx} className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Partner Brands */}
          <div className="border-t border-primary/20 pt-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" /> Verified Partner Brands &amp; Joint Ventures
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partnerDirectory?.verifiedPartnerBrands?.map((brand: any) => (
                <div key={brand.supplierRef} className="rounded-lg border border-primary/25 bg-card/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{brand.supplierRef}</span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                      {brand.relationshipType}
                    </span>
                  </div>
                  <h4 className="mt-1 text-xs font-bold text-foreground">{brand.name}</h4>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Brand: <span className="text-foreground font-semibold">{brand.brandRepresented}</span> ({brand.country})
                  </div>
                  {brand.tradeRoute && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Route: {brand.tradeRoute}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Documented Trade Routes */}
          <div className="border-t border-primary/20 pt-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" /> Strategic Maritime Supply Routes
            </h2>
            <div className="mt-3 space-y-2">
              {partnerDirectory?.documentedTradeRoutes?.map((route: any, i: number) => (
                <div key={i} className="rounded-lg border border-primary/15 bg-background/50 p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-foreground">{route.routeName}</span>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Origin: {route.origin} → Destination: {route.destination}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {route.primaryCargo}
                    </span>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Vessel: {route.vesselType} ({route.operatingDivision})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: 10-POINT STRUCTURED CEO DECISION BRIEFS ── */}
      {activeTab === "decisions" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Closed-Loop CEO Decision Briefs (Mandatory 10-Point Protocol)
                </h3>
                <p className="mt-0.5 text-xs text-amber-200/80">
                  Every recommendation follows the strict 10-point governance framework. The AI Copilot provides comparative analysis, but NEVER executes contractual or financial commitments autonomously. Formal human sign-off transitions the record to <span className="font-semibold text-white">APPROVED</span> or <span className="font-semibold text-white">EXECUTED</span> with an immutable audit event.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {ceoDecisions?.decisions?.map((dec: any) => {
              const p = dec.structured10Points;
              const isApproved = dec.governance.status === "APPROVED";
              const isExecuted = dec.governance.status === "EXECUTED";
              const isRejected = dec.governance.status === "REJECTED";

              return (
                <div
                  key={dec.ref}
                  className="rounded-xl border border-primary/30 bg-card/80 p-5 shadow-xl backdrop-blur-md transition-all hover:border-primary/60"
                >
                  {/* Decision Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/15 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{dec.ref}</span>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          {dec.category}
                        </span>
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
                          {dec.projectCode || "Portfolio-wide"}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-foreground">{dec.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isExecuted
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : isApproved
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                            : isRejected
                            ? "bg-destructive/20 text-destructive border border-destructive/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {dec.governance.status}
                      </span>
                    </div>
                  </div>

                  {/* 10-Point Structured Grid */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
                    {/* 1 & 2: Decision Required & Affected */}
                    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        1. Decision Required &amp; 2. Affected Item
                      </span>
                      <p className="mt-1 font-bold text-foreground">{p["1_decisionRequired"]}</p>
                      <p className="mt-1 text-muted-foreground">{p["2_affectedItem"]}</p>
                    </div>

                    {/* 3: Verified Situation */}
                    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        3. Current Verified Situation
                      </span>
                      <p className="mt-1 text-foreground">{p["3_verifiedSituation"]}</p>
                    </div>

                    {/* 4: Impact */}
                    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        4. Financial &amp; Schedule Impact
                      </span>
                      <div className="mt-1 text-foreground">
                        <span className="font-semibold text-amber-400">Financial:</span> {p["4_impact"].financial}
                      </div>
                      <div className="mt-1 text-foreground">
                        <span className="font-semibold text-amber-400">Schedule:</span> {p["4_impact"].schedule}
                      </div>
                    </div>

                    {/* 5: Options Evaluated */}
                    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        5. Options Evaluated
                      </span>
                      <div className="mt-1 space-y-1">
                        {p["5_optionsEvaluated"]?.map((opt: any, idx: number) => (
                          <div key={idx} className="text-muted-foreground">
                            • <span className="font-semibold text-foreground">{opt.option}:</span> {opt.cost || opt.pros || ""} {opt.timeline ? `(${opt.timeline})` : ""}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 6: Trade-offs & Assumptions */}
                    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        6. Trade-offs &amp; Key Assumptions
                      </span>
                      <p className="mt-1 text-muted-foreground">{p["6_tradeoffsAndAssumptions"]}</p>
                    </div>

                    {/* 7: Recommended Action & Rationale */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase">
                        7. Recommended Action &amp; Why
                      </span>
                      <p className="mt-1 font-bold text-foreground">
                        {p["7_recommendationAndWhy"].action}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {p["7_recommendationAndWhy"].rationale}
                      </p>
                    </div>

                    {/* 8: Accountable Owner */}
                    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        8. Accountable Function / Owner
                      </span>
                      <p className="mt-1 font-semibold text-foreground">{p["8_accountableOwner"]}</p>
                    </div>

                    {/* 9: Next Operational Step */}
                    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        9. Next Operational Step
                      </span>
                      <p className="mt-1 text-foreground">{p["9_nextOperationalStep"]}</p>
                    </div>

                    {/* 10: Conditions to Revisit */}
                    <div className="col-span-1 md:col-span-2 rounded-lg border border-primary/10 bg-background/50 p-3">
                      <span className="text-[10px] font-semibold text-primary uppercase">
                        10. Conditions Under Which Recommendation Should Be Revisited
                      </span>
                      <p className="mt-1 text-muted-foreground">{p["10_conditionsToRevisit"]}</p>
                    </div>
                  </div>

                  {/* Governance Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-primary/15 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-muted-foreground">
                      {dec.governance.approvedBy ? (
                        <span>
                          Approved by <strong className="text-foreground">{dec.governance.approvedBy}</strong> at {dec.governance.approvedAt}
                        </span>
                      ) : (
                        <span>Awaiting formal executive action.</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isApproved && !isExecuted && (
                        <button
                          disabled={actionLoading === `${dec.ref}-APPROVE`}
                          onClick={() => handleDecisionAction(dec.ref, "APPROVE")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve Recommendation
                        </button>
                      )}

                      {isApproved && !isExecuted && (
                        <button
                          disabled={actionLoading === `${dec.ref}-EXECUTE`}
                          onClick={() => handleDecisionAction(dec.ref, "EXECUTE")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/30 disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Execute Next Step
                        </button>
                      )}

                      {!isRejected && (
                        <button
                          disabled={actionLoading === `${dec.ref}-REJECT`}
                          onClick={() => handleDecisionAction(dec.ref, "REJECT")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
