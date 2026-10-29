"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Compass,
  Container,
  ExternalLink,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  Ship,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ContainerItem {
  container_number: string;
  container_type: string;
  seal_number?: string;
  resolved: boolean;
  unresolved_reason?: string;
}

interface BlLookupData {
  bl_number: string;
  shipment_ref: string;
  carrier: string;
  vessel_name: string;
  voyage: string;
  container_count: number;
  containers: ContainerItem[];
}

interface TrackingData {
  header: {
    bl_number: string;
    container_number: string;
    carrier: string;
    current_status: string;
    eta: string;
  };
  kpis: {
    current_status: string;
    eta_display: string;
    eta_timezone: string;
    days_remaining: number | null;
    is_overdue: boolean;
    transit_time_elapsed_days: number;
    transit_time_total_days: number;
    location_updates_count: number;
    open_alerts_count: number;
  };
  container_position: {
    location: string;
    source: string;
    timestamp: string;
    movement_state: string;
    confirmed_display: string;
  } | null;
  vessel_position: {
    vessel_name: string;
    voyage?: string;
    last_location: string;
    timestamp: string;
    source: string;
  };
  unconfirmed_message?: string;
  has_location_conflict: boolean;
  conflicting_reports?: Array<{ carrier: string; location: string; timestamp: string }>;
  carrier_statuses: Array<{
    carrier: string;
    carrier_code: string;
    status: string;
    fetched_at: string;
    is_mock: boolean;
    error?: string;
  }>;
  transit_time: {
    legs: Array<{
      leg_number: number;
      mode: "ROAD" | "OCEAN";
      origin: string;
      destination: string;
      duration: string;
      status: string;
      start_date: string;
      end_date: string;
    }>;
    total_transit_days: number;
    carrier_eta?: string;
    promised_date?: string;
    slip_days: number;
    slip_status: string;
  };
  timeline: Array<{
    timestamp: string;
    event: string;
    source: string;
    status: string;
  }>;
  alerts: Array<{
    id: string;
    container_number: string;
    type: string;
    severity: string;
    message: string;
    state: string;
    created_at: string;
    updated_at: string;
  }>;
}

export function CustomerShipmentTrackingView() {
  // Step 1 State: Empty by default, nothing pre-populated
  const [blInput, setBlInput] = useState("");
  const [blError, setBlError] = useState<string | null>(null);
  const [isSearchingBl, setIsSearchingBl] = useState(false);

  // Step 2 State: Resolved Containers under B/L
  const [blData, setBlData] = useState<BlLookupData | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<ContainerItem | null>(null);

  // Step 3-6 State: Full Customer Dashboard Tracking
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Human Approval Modal State (Step 6)
  const [approvalModalAlert, setApprovalModalAlert] = useState<any | null>(null);
  const [approverName, setApproverName] = useState("L. Fonseca (Logistics Lead)");
  const [approvalDecision, setApprovalDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [approvalNote, setApprovalNote] = useState("Customer notification authorized. Transit delay acknowledged.");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Step 1: Validate & Submit B/L
  const handleBlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlError(null);
    const trimmed = blInput.trim().toUpperCase();

    if (!trimmed) {
      setBlError("Please enter a Bill of Lading (B/L) number.");
      return;
    }

    const blRegex = /^[A-Z0-9-]{6,20}$/;
    if (!blRegex.test(trimmed)) {
      setBlError("Invalid format: B/L must be 6–20 characters containing letters, numbers, or hyphens (e.g. MSCU-198273, BHR-88219).");
      return;
    }

    setIsSearchingBl(true);
    setBlData(null);
    setSelectedContainer(null);
    setTrackingData(null);
    setTrackingError(null);

    try {
      const res = await fetch("/api/customer/bl-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bl_number: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to locate Bill of Lading");
      }

      setBlData(data.data);
      // If exactly one container, select it automatically for seamless tracking
      if (data.data.containers?.length === 1) {
        loadContainerTracking(data.data.containers[0], data.data.bl_number);
      }
    } catch (err: any) {
      setBlError(err.message || "Unable to lookup Bill of Lading. Please try again.");
    } finally {
      setIsSearchingBl(false);
    }
  };

  // Step 2 to Step 3-6: Load selected container tracking
  const loadContainerTracking = async (container: ContainerItem, blNum?: string) => {
    setSelectedContainer(container);
    setIsLoadingTracking(true);
    setTrackingError(null);

    try {
      const res = await fetch("/api/customer/container-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          container_number: container.container_number,
          bl_number: blNum || blData?.bl_number,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load container tracking details");
      }
      setTrackingData(data.data);
    } catch (err: any) {
      setTrackingError(err.message || "Failed to retrieve carrier data");
    } finally {
      setIsLoadingTracking(false);
    }
  };

  // Step 6: Human Approval Gate Transition
  const handleExecuteApproval = async () => {
    if (!approvalModalAlert) return;
    setIsSubmittingApproval(true);
    try {
      const targetState = approvalDecision === "APPROVE" ? "OUTCOME_PENDING_VERIFICATION" : "RESOLVED";
      const res = await fetch("/api/customer/alerts/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: approvalModalAlert.id,
          to_state: targetState,
          actor_id: approverName,
          note: approvalNote,
          approval_decision: approvalDecision,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Approval transition rejected");
      }

      // Refresh tracking data
      if (selectedContainer) {
        await loadContainerTracking(selectedContainer, blData?.bl_number);
      }
      setApprovalModalAlert(null);
    } catch (err: any) {
      alert(`Approval Gate Error: ${err.message}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Title & Customer Mandate */}
      <div className="border-b border-border/70 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wider text-amber-400">
            NASS CUSTOMER SHIPMENT TRACKING
          </span>
          <span className="text-xs text-muted-foreground">Direct Container &amp; ETA Verification</span>
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Where is my shipment, and when will it arrive?
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your Bill of Lading (B/L) to verify physical container location, carrier updates, and expected port arrival.
        </p>
      </div>

      {/* ─── STEP 1 — B/L INPUT STARTS THE SEARCH ───────────────────────── */}
      <Card className="p-6 border-border/80 bg-card/80 shadow-md">
        <form onSubmit={handleBlSubmit} className="space-y-3">
          <label htmlFor="blInput" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bill of Lading (B/L) Number
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="blInput"
                type="text"
                placeholder="Enter B/L Number (e.g. MSCU-198273, BHR-88219, ONEY-4490)"
                value={blInput}
                onChange={(e) => {
                  setBlInput(e.target.value.toUpperCase());
                  if (blError) setBlError(null);
                }}
                className={`w-full rounded-lg border bg-background px-4 py-3 text-sm font-mono font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                  blError ? "border-rose-500 focus:ring-rose-500/30" : "border-border/80 focus:ring-amber-400/50"
                }`}
              />
              {blInput && (
                <button
                  type="button"
                  onClick={() => {
                    setBlInput("");
                    setBlData(null);
                    setSelectedContainer(null);
                    setTrackingData(null);
                  }}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSearchingBl}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-3 h-auto cursor-pointer"
            >
              {isSearchingBl ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Verifying B/L...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Track Shipment
                </>
              )}
            </Button>
          </div>

          {/* Inline Error (Step 1 requirement) */}
          {blError && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{blError}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <span>Sample reference B/Ls:</span>
            <button
              type="button"
              onClick={() => { setBlInput("BHR-88219"); setBlError(null); }}
              className="font-mono text-amber-400 underline hover:text-amber-300"
            >
              BHR-88219 (Multi-container)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => { setBlInput("MSCU-198273"); setBlError(null); }}
              className="font-mono text-amber-400 underline hover:text-amber-300"
            >
              MSCU-198273 (Standard Ocean)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => { setBlInput("MSC-4471"); setBlError(null); }}
              className="font-mono text-rose-400 underline hover:text-rose-300"
            >
              MSC-4471 (Unresolved Container Test)
            </button>
          </div>
        </form>
      </Card>

      {/* ─── STEP 2 — B/L TO CONTAINER IDENTIFICATION ────────────────────── */}
      {blData && (
        <Card className="p-5 border-border/80 bg-card/60 space-y-4 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                B/L IDENTIFICATION RESOLVED
              </span>
              <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
                <span>{blData.bl_number}</span>
                <Badge variant="outline" className="border-amber-400/40 text-amber-400">
                  {blData.carrier}
                </Badge>
              </h2>
            </div>
            <div className="text-right text-xs">
              <span className="text-muted-foreground">Vessel / Voyage:</span>
              <p className="font-semibold text-foreground">
                {blData.vessel_name} {blData.voyage ? `(${blData.voyage})` : ""}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Container className="h-4 w-4 text-amber-400" />
                Containers under this B/L ({blData.container_count})
              </span>
              <span className="text-[11px] text-muted-foreground">
                Select a container below to view real-time location &amp; ETA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {blData.containers.map((c, i) => {
                const isSelected = selectedContainer?.container_number === c.container_number;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => loadContainerTracking(c, blData.bl_number)}
                    className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/50"
                        : "border-border/70 bg-card hover:border-amber-400/40 hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {c.container_number}
                      </span>
                      {c.resolved ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                          Resolved
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px]">
                          Unresolved
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Type: {c.container_type}</p>
                    {c.seal_number && (
                      <p className="text-[10px] font-mono text-muted-foreground">Seal: {c.seal_number}</p>
                    )}
                    {/* Unresolved container reason display */}
                    {!c.resolved && c.unresolved_reason && (
                      <div className="mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/25 text-[10px] text-rose-300">
                        <p className="font-semibold">B/L found, container number not yet resolved</p>
                        <p className="text-muted-foreground mt-0.5">{c.unresolved_reason}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Loading State for Tracking */}
      {isLoadingTracking && (
        <div className="p-12 text-center rounded-xl border border-border/60 bg-card/30 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-400" />
          <p className="text-sm font-semibold text-foreground">
            Retrieving live tracking across 5 carrier networks...
          </p>
          <p className="text-xs text-muted-foreground">
            Executing parallel adapters: MAERSK, MSC, CMA CGM, ONE, and Hapag-Lloyd with conflict detection.
          </p>
        </div>
      )}

      {/* Tracking Load Error */}
      {trackingError && (
        <div className="p-4 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{trackingError}</span>
        </div>
      )}

      {/* ─── STEP 3, 4, 5, 6 — CUSTOMER DASHBOARD & TRACKING RESULTS ────── */}
      {trackingData && !isLoadingTracking && (
        <div className="space-y-6 animate-in fade-in">
          {/* STEP 4: Conflict Warning Badge (if carriers report different locations) */}
          {trackingData.has_location_conflict && (
            <div className="rounded-xl border border-amber-500/60 bg-amber-500/15 p-4 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <span>LOCATION CONFLICT BETWEEN CARRIERS DETECTED (MARKED FOR REVIEW)</span>
              </div>
              <p className="text-xs">
                Multiple carrier tracking portals returned conflicting physical coordinates for container{" "}
                <span className="font-mono font-bold text-foreground">
                  {trackingData.header.container_number}
                </span>
                . Both reported values are documented below:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs font-mono">
                {trackingData.conflicting_reports?.map((rep, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-black/40 border border-amber-500/30">
                    <p className="font-bold text-amber-300">{rep.carrier}:</p>
                    <p className="text-foreground">{rep.location}</p>
                    <p className="text-[10px] text-muted-foreground">Timestamp: {new Date(rep.timestamp).toLocaleString("en-GB")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Clear Distinction: Container Location vs Vessel Position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Container Location Card */}
            <Card className="p-4 border-border/80 bg-card/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Container className="h-4 w-4 text-amber-400" /> Physical Container Location
                </span>
                {trackingData.container_position ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                    Confirmed
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px]">
                    Unconfirmed
                  </Badge>
                )}
              </div>
              {trackingData.container_position ? (
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{trackingData.container_position.location}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {trackingData.container_position.confirmed_display}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Source: <strong className="text-foreground">{trackingData.container_position.source}</strong></span>
                    <span>·</span>
                    <span>Movement: <strong className="text-foreground uppercase">{trackingData.container_position.movement_state}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <p className="font-semibold">{trackingData.unconfirmed_message}</p>
                </div>
              )}
            </Card>

            {/* Vessel Position Card (Separated from Container per Step 4) */}
            <Card className="p-4 border-border/80 bg-card/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Ship className="h-4 w-4 text-sky-400" /> Ocean Vessel Position (Separate from Container)
                </span>
                <Badge variant="outline" className="border-sky-400/40 text-sky-400 text-[10px]">
                  AIS Feed
                </Badge>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <Compass className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>{trackingData.vessel_position.vessel_name}</span>
                </p>
                <p className="text-xs text-foreground font-mono mt-0.5">
                  {trackingData.vessel_position.last_location}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Reported at {new Date(trackingData.vessel_position.timestamp).toLocaleString("en-GB", { timeZone: "Asia/Bahrain" })} AST via {trackingData.vessel_position.source}
                </p>
              </div>
            </Card>
          </div>

          {/* ─── STEP 5 — CUSTOMER DASHBOARD + KPIs ───────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Card className="p-3.5 border-border/70 bg-card/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current Status</span>
              <p className="text-lg font-bold text-foreground mt-1">
                {trackingData.kpis.current_status}
              </p>
              <p className="text-[10px] text-muted-foreground">Physical transit state</p>
            </Card>

            <Card className="p-3.5 border-border/70 bg-card/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estimated Port Arrival</span>
              <p className="text-sm font-bold text-amber-400 mt-1 font-mono">
                {trackingData.kpis.eta_display}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {trackingData.kpis.days_remaining !== null ? `${trackingData.kpis.days_remaining} days remaining` : "Schedule pending"}
              </p>
            </Card>

            <Card className="p-3.5 border-border/70 bg-card/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transit Elapsed</span>
              <p className="text-lg font-bold text-foreground mt-1">
                {trackingData.kpis.transit_time_elapsed_days} / {trackingData.kpis.transit_time_total_days} d
              </p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-amber-400 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (trackingData.kpis.transit_time_elapsed_days / trackingData.kpis.transit_time_total_days) * 100)}%` }}
                />
              </div>
            </Card>

            <Card className="p-3.5 border-border/70 bg-card/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Location Updates</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {trackingData.kpis.location_updates_count}
              </p>
              <p className="text-[10px] text-muted-foreground">Multi-carrier telemetry</p>
            </Card>

            <Card className="p-3.5 border-border/70 bg-card/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Open Alerts</span>
              <p className="text-lg font-bold text-amber-400 mt-1">
                {trackingData.kpis.open_alerts_count}
              </p>
              <p className="text-[10px] text-muted-foreground">Customer-scoped issues</p>
            </Card>
          </div>

          {/* ─── STEP 3 — PER-CARRIER RPA PORTAL STATUSES ─────────────────── */}
          <Card className="p-4 border-border/70 bg-card/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                Carrier RPA Integration Status (5 Carrier Portals)
              </span>
              <span className="text-[10px] text-muted-foreground">
                Executed in parallel with 1 automatic retry
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {trackingData.carrier_statuses.map((c, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{c.carrier}</span>
                    <Badge
                      className={`text-[9px] px-1.5 py-0 ${
                        c.status === "OK"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Fetched: {new Date(c.fetched_at).toLocaleTimeString()}
                  </p>
                  {c.is_mock && (
                    <span className="inline-block rounded px-1 py-0.2 bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono text-amber-300">
                      [MOCK RPA]
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* ─── STEP 5 — TRANSIT TIME & LEGS BREAKDOWN ───────────────────── */}
          <Card className="p-5 border-border/80 bg-card/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Transit Route &amp; Schedule Breakdown</h3>
                <p className="text-xs text-muted-foreground">Origin to destination legs with mode &amp; duration</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Promised vs ETA Slip:</span>
                <p className={`text-xs font-bold ${trackingData.transit_time.slip_days > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {trackingData.transit_time.slip_status}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {trackingData.transit_time.legs.map((leg, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border/60 bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-mono text-xs font-bold text-amber-400">
                      {leg.leg_number}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-border/80">
                          {leg.mode === "OCEAN" ? <Ship className="h-3 w-3 mr-1" /> : <Truck className="h-3 w-3 mr-1" />}
                          {leg.mode}
                        </Badge>
                        <span className="font-semibold text-foreground">{leg.origin}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{leg.destination}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Dates: {leg.start_date} → {leg.end_date} (Duration: {leg.duration})
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] ${
                      leg.status === "COMPLETED"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : leg.status === "IN_TRANSIT"
                        ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {leg.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── STEP 5 — EVENT TIMELINE (TRANSIT HISTORY) ───────────────── */}
          <Card className="p-5 border-border/80 bg-card/60 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Transit History Timeline (Newest First)</h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
              {trackingData.timeline.map((evt, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-4 ring-background" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-foreground">{evt.event}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Source: <strong className="text-foreground">{evt.source}</strong> · {new Date(evt.timestamp).toLocaleString("en-GB", { timeZone: "Asia/Bahrain" })} AST
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── STEP 6 — ALERTS & HUMAN APPROVAL GATE ────────────────────── */}
          {trackingData.alerts.length > 0 && (
            <Card className="p-5 border-amber-500/40 bg-amber-500/5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-foreground">Shipment Alerts &amp; Governance Gates</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  Closed-Loop State: DETECTED → TRIAGED → ASSIGNED → ACTION_PROPOSED → AWAITING_APPROVAL → OUTCOME_PENDING_VERIFICATION → RESOLVED
                </span>
              </div>

              <div className="space-y-3">
                {trackingData.alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-lg border border-border/70 bg-card/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[10px] ${
                            alt.severity === "CRITICAL"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {alt.severity}
                        </Badge>
                        <span className="font-semibold text-foreground">{alt.type}</span>
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                          State: {alt.state}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{alt.message}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Reported: {new Date(alt.created_at).toLocaleString("en-GB")}
                      </p>
                    </div>

                    {/* Human Approval Action */}
                    <div className="shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setApprovalModalAlert(alt)}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs h-8"
                      >
                        <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Human Approval Gate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Human Approval Gate Modal (Step 6) */}
      {approvalModalAlert && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[#0d111a] p-5 shadow-2xl text-foreground space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-display text-sm font-bold">
                <Shield className="h-5 w-5" />
                <span>Human-in-the-Loop Approval Gate</span>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalAlert(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-1">
                <p className="text-muted-foreground">Alert Type: <strong className="text-foreground">{approvalModalAlert.type}</strong></p>
                <p className="text-muted-foreground">Container: <strong className="font-mono text-foreground">{approvalModalAlert.container_number}</strong></p>
                <p className="text-muted-foreground">Current State: <Badge variant="outline" className="text-[10px]">{approvalModalAlert.state}</Badge></p>
                <p className="text-muted-foreground mt-1">{approvalModalAlert.message}</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Authenticated Approver ID / Name:
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full rounded-md border border-border bg-muted/40 p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Approval Decision:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalDecision("APPROVE")}
                    className={`p-2 rounded border font-semibold text-xs transition-colors cursor-pointer ${
                      approvalDecision === "APPROVE"
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    ✓ Authorize Notification &amp; Action
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision("REJECT")}
                    className={`p-2 rounded border font-semibold text-xs transition-colors cursor-pointer ${
                      approvalDecision === "REJECT"
                        ? "border-rose-400 bg-rose-500/20 text-rose-300"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    ✕ Reject Proposal &amp; Close
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Audit Sign-Off Note:
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-border bg-muted/40 p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => setApprovalModalAlert(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSubmittingApproval || !approverName}
                onClick={handleExecuteApproval}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {isSubmittingApproval ? "Logging Audit Record..." : "Confirm & Sign Audit Row"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

