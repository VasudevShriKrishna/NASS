"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Anchor,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Container,
  Crosshair,
  ExternalLink,
  Eye,
  Factory,
  FileDown,
  FileText,
  Gauge,
  Globe,
  Home,
  MapPin,
  MoreHorizontal,
  Package,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Siren,
  SlidersHorizontal,
  StepBack,
  StepForward,
  Timer,
  Warehouse,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/lib/client";
import { useAppStore } from "@/lib/app-state";
import { liveProgressAt } from "@/lib/maritime-routes";
import {
  VERIFIED_PORTS,
  VERIFIED_COUNTRIES,
  searchGeoAndFleet,
  type PortIntelligence,
  type CountryIntelligence,
} from "@/lib/geo-intelligence";
import { lookupPort } from "@/lib/geo";
import { fmtBahrainDateTime, fmtBahrainTime } from "@/lib/bahrain-time";
import type { TraceShip, TraceSnapshot } from "@/lib/trace-types";
import type { MapCameraAction } from "@/components/app/map/operation-map";
import { ShipmentDetailsModal } from "./shipment-details-modal";
import { AlertsResolutionModal } from "./alerts-resolution-modal";
import {
  CaseStateBadge,
  EmptyState,
  ErrorState,
  EvidenceBadge,
  FreshnessBadge,
  LoadingState,
  ReconciliationBadge,
  SeverityBadge,
  StatusPill,
  ScrollTable,
  fmtDate,
  fmtDateTime,
} from "@/components/app/shared";
import { LiveClock, fmtCountdown, useNow } from "@/components/app/live-clock";
import { PulsingDot } from "@/components/app/motion";
import { MapLegend, STATUS_COLOR, STATUS_LABEL } from "@/components/app/world-map";
import { cn } from "@/lib/utils";

const OperationMap = dynamic(() => import("@/components/app/map/operation-map").then((m) => m.OperationMap), {
  ssr: false,
  loading: () => <LoadingState label="Rendering interactive operation map…" />,
});

type SitePick = { type: "supplier" | "warehouse"; code: string };

const SIM_PRESETS = [1, 60, 600] as const;

/* Phase 10: fleet-rail status filters (same authoritative status set) */
const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "all" },
  { key: "IN_TRANSIT", label: "in transit" },
  { key: "AT_PORT", label: "at port" },
  { key: "CUSTOMS_HOLD", label: "hold" },
  { key: "DELAYED", label: "delayed" },
  { key: "ARRIVED", label: "arrived" },
  { key: "BOOKED", label: "booked" },
];

const fmtMoney = (v: number, ccy: string) => `${ccy} ${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmtPct = (p: number) => `${(p * 100).toFixed(1)}%`;

/* ── small dossier building blocks ─────────────────────────────────────── */
function MiniTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="inline-block h-3.5 w-0.5 rounded-full bg-primary/70" aria-hidden />
      <span className="text-primary/70">{icon}</span>
      {children}
    </p>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{k}</span>
      <span className="min-w-0 text-right text-[12px] font-medium">{v}</span>
    </div>
  );
}

function LiveStatusChip({ ship }: { ship: TraceShip }) {
  const c = STATUS_COLOR[ship.liveStatus];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
      style={{ borderColor: `${c}55`, background: `${c}14`, color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
      {STATUS_LABEL[ship.liveStatus].toUpperCase()}
    </span>
  );
}

/* ── journey progress bar (drawer) ─────────────────────────────────────── */
function RouteBar({ ship, p }: { ship: TraceShip; p: number }) {
  const c = STATUS_COLOR[ship.liveStatus];
  return (
    <div className="pt-1">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate font-semibold">
          {ship.from?.label ?? ship.originPort}
          <span className="ml-1 font-normal text-muted-foreground">{ship.originCountry}</span>
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-gold-grad">{fmtPct(p)}</span>
        <span className="min-w-0 truncate text-right font-semibold">
          <span className="mr-1 font-normal text-muted-foreground">{ship.destCountry}</span>
          {ship.to?.label ?? ship.destPort}
        </span>
      </div>
      <div className="relative h-2.5">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full border-b border-dashed border-zinc-500/40 dark:border-zinc-400/20" />
        <div
          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full shadow-[0_0_12px_oklch(0.79_0.135_88/45%)]"
          style={{ width: `${p * 100}%`, background: `linear-gradient(90deg, #8a6a1f, ${c}, #f3dc8e)` }}
        />
        <div
          className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
          style={{ left: `${p * 100}%`, background: `linear-gradient(135deg, #f3dc8e, #b8860b)`, boxShadow: `0 0 14px ${c}aa` }}
        />
      </div>
    </div>
  );
}

/* ── Part 4: Contextual Next-Action Controls & Status-Based Actions ── */
function DossierActions({
  ship,
  onTrackRoute,
  onOpenDetails,
  onViewOriginPort,
  onViewDestPort,
}: {
  ship: TraceShip;
  onTrackRoute: (ref: string) => void;
  onOpenDetails: (ship: TraceShip) => void;
  onViewOriginPort: (portName: string) => void;
  onViewDestPort: (portName: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = ship.liveStatus;

  const scrollToAdvisory = () => {
    const el = document.getElementById("advisory-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else onOpenDetails(ship);
  };

  const scrollToTimeline = () => {
    const el = document.getElementById("event-timeline-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToCountdown = () => {
    const el = document.getElementById("arrival-countdown-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  /* Primary Action by Status (Part 4 Section 3) */
  const renderPrimaryAction = () => {
    switch (status) {
      case "IN_TRANSIT":
        return (
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-primary to-[#b8860b] text-primary-foreground font-semibold shadow-[0_0_12px_rgba(212,175,55,0.35)] hover:brightness-110"
            onClick={() => onTrackRoute(ship.ref)}
            title="Focus the map camera on shipment route"
          >
            <Crosshair className="h-3.5 w-3.5" /> Track Route
          </Button>
        );
      case "DELAYED":
        return (
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 font-semibold shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            onClick={scrollToAdvisory}
            title="Investigate delay exception and timeline deviation"
          >
            <Siren className="h-3.5 w-3.5 animate-pulse text-rose-400" /> Investigate Delay
          </Button>
        );
      case "CUSTOMS_HOLD":
        return (
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.3)]"
            onClick={scrollToAdvisory}
            title="Inspect customs hold details and regulatory compliance requirements"
          >
            <ShieldAlert className="h-3.5 w-3.5 animate-pulse text-amber-400" /> View Hold Details
          </Button>
        );
      case "AT_PORT":
        return (
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.25)]"
            onClick={() => onViewDestPort(ship.destPort)}
            title="Inspect destination port specifications and logistics facilities"
          >
            <Anchor className="h-3.5 w-3.5 text-sky-300" /> View Port Details
          </Button>
        );
      case "ARRIVED":
        return (
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 font-semibold shadow-[0_0_12px_rgba(52,211,153,0.25)]"
            onClick={() => onOpenDetails(ship)}
            title="Inspect confirmed delivery status and receipt documentation"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> View Delivery Status
          </Button>
        );
      case "BOOKED":
      default:
        return (
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 font-semibold shadow-[0_0_12px_rgba(212,175,55,0.2)]"
            onClick={() => onTrackRoute(ship.ref)}
            title="Display planned sea corridor on map"
          >
            <Compass className="h-3.5 w-3.5 text-primary" /> View Planned Route
          </Button>
        );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Primary Action Button */}
      {renderPrimaryAction()}

      {/* Secondary Action: Complete 10-Section Structured Dossier Modal */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 border-primary/35 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-semibold"
        onClick={() => onOpenDetails(ship)}
        title="Open structured 10-section shipment information modal"
      >
        <FileText className="h-3.5 w-3.5" /> View Details
      </Button>

      {/* Compact Secondary Menu for contextual status & port actions */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Secondary shipment actions"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {menuOpen && (
          <div className="absolute left-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-primary/30 bg-[#0d131f]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
            <div className="px-2 py-1 border-b border-border/40 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Actions · {ship.ref}
            </div>

            {/* Contextual actions based on status & selection */}
            <div className="py-1 space-y-0.5 text-xs">
              {status === "IN_TRANSIT" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToCountdown();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  >
                    <Clock className="h-3.5 w-3.5 text-primary" /> View ETA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToTimeline();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  >
                    <Timer className="h-3.5 w-3.5 text-primary" /> View Event History
                  </button>
                </>
              )}

              {status === "DELAYED" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onTrackRoute(ship.ref);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  >
                    <Compass className="h-3.5 w-3.5 text-primary" /> View Route
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToCountdown();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  >
                    <Clock className="h-3.5 w-3.5 text-rose-300" /> View Updated ETA
                  </button>
                </>
              )}

              {status === "CUSTOMS_HOLD" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDetails(ship);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 text-amber-300" /> Review Available Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onViewDestPort(ship.destPort);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                  >
                    <Anchor className="h-3.5 w-3.5 text-amber-300" /> View Port
                  </button>
                </>
              )}

              {status === "AT_PORT" && (
                <button
                  type="button"
                  onClick={() => {
                    scrollToTimeline();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                >
                  <Timer className="h-3.5 w-3.5 text-sky-300" /> Review Arrival Events
                </button>
              )}

              {status === "ARRIVED" && (
                <button
                  type="button"
                  onClick={() => {
                    scrollToTimeline();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                >
                  <Timer className="h-3.5 w-3.5 text-emerald-300" /> View Shipment History
                </button>
              )}

              {status === "BOOKED" && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenDetails(ship);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" /> Review Booking Details
                </button>
              )}

              {/* Geo Port Shortcuts */}
              <div className="border-t border-border/40 my-1" />
              <button
                type="button"
                onClick={() => {
                  onViewOriginPort(ship.originPort);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              >
                <Anchor className="h-3.5 w-3.5 text-primary/70" />
                <span className="truncate">Origin: {ship.originPort}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewDestPort(ship.destPort);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              >
                <Anchor className="h-3.5 w-3.5 text-primary/70" />
                <span className="truncate">Destination: {ship.destPort}</span>
              </button>

              <div className="border-t border-border/40 my-1" />
              <button
                type="button"
                onClick={() => {
                  window.open(`/?view=trace&ship=${ship.ref}`, "_blank", "noopener");
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
              </button>
              <a
                href={`/api/live-trace/report?ref=${ship.ref}`}
                download
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                <FileDown className="h-3.5 w-3.5 text-primary" /> Download PDF Report
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── event timeline (Phase 5): observed time vs platform ingestion time ── */
function EventTimeline({ ship }: { ship: TraceShip }) {
  const ms = ship.milestones;
  if (ms.length === 0) {
    return <EmptyState message="No milestone events recorded — no history is invented" />;
  }
  return (
    <ol className="relative space-y-2 border-l border-primary/25 pl-3.5">
      {ms.map((m, i) => {
        const corrected = Boolean(m.correctedByEventId);
        const fresh = m.freshness === "stale" || m.freshness === "aging";
        return (
          <li key={`${m.code}-${i}`} className="relative">
            <span
              className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full ring-2 ring-background"
              style={{ background: corrected ? "#34d399" : fresh ? "#fbbf24" : "#d4af37" }}
              aria-hidden
            />
            <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold">{m.label}</span>
                {m.location ? <span className="text-[10px] text-muted-foreground">· {m.location}</span> : null}
                {m.isEstimated ? <span className="rounded border border-border/70 bg-muted/50 px-1 py-px text-[8px] font-bold uppercase text-muted-foreground">estimated</span> : null}
                {corrected ? <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-1 py-px text-[8px] font-bold uppercase text-emerald-300">corrected</span> : null}
                {m.freshness === "stale" || m.freshness === "aging" ? (
                  <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1 py-px text-[8px] font-bold uppercase text-amber-300">{m.freshness}</span>
                ) : null}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">observed</span> {fmtBahrainDateTime(m.eventTime)}
                <span className="mx-1">·</span>
                <span className="font-semibold text-foreground">received</span> {fmtBahrainDateTime(m.receivedAt)}
                <span className="mx-1">·</span>
                <span className="font-mono">src: {m.source}</span>
              </p>
              {m.quantity !== null ? (
                <p className="text-[10px] text-muted-foreground">
                  cargo at event: <span className="font-semibold tabular-nums text-foreground">{m.quantity.toLocaleString()} {m.uom}</span>
                </p>
              ) : null}
              {m.note ? <p className="mt-0.5 text-[10px] italic text-muted-foreground/80">{m.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── quantities (Phase 5/6/9): dispatched / in-transit / received / outstanding ── */
function QuantityBlock({ ship }: { ship: TraceShip }) {
  const q = ship.quantities;
  const has = q.dispatched.length || q.inTransit.length || q.received.length || q.outstanding.length;
  if (!has) return <EmptyState message="No allocated cargo lines — quantity not derivable from records" />;
  const row = (label: string, rows: { material: string; uom: string; quantity: number }[], tone: string) => (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-[11px] font-medium tabular-nums">
        {rows.length === 0
          ? "—"
          : rows.map((r, i) => (
              <span key={`${r.material}-${i}`} className={tone}>
                {r.quantity.toLocaleString()} {r.uom} <span className="font-normal text-muted-foreground">{r.material}</span>
                {i < rows.length - 1 ? " · " : ""}
              </span>
            ))}
      </span>
    </div>
  );
  return (
    <div>
      {row("Dispatched (PO-allocated)", q.dispatched, "")}
      {row("Recorded in transit", q.inTransit, "")}
      {row("Received (GRN)", q.received.map((r) => ({ material: `${r.material}${r.ref ? ` (${r.ref})` : ""}`, uom: r.uom, quantity: r.quantity })), "")}
      {row("Outstanding", q.outstanding, "text-amber-300")}
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        Quantities stay in their recorded unit of measure — no conversion without a documented basis.
      </p>
    </div>
  );
}

/* ── THE DOSSIER — full ship picture on click ──────────────────────────── */
function Dossier({
  ship,
  p,
  now,
  onClose,
  onTrackRoute,
  onOpenDetails,
  onViewOriginPort,
  onViewDestPort,
}: {
  ship: TraceShip;
  p: number;
  now: number | null;
  onClose: () => void;
  onTrackRoute: (ref: string) => void;
  onOpenDetails: (ship: TraceShip) => void;
  onViewOriginPort: (portName: string) => void;
  onViewDestPort: (portName: string) => void;
}) {
  const comp = ship.compliance;
  const slipped = !!(ship.carrierEta && ship.supplierPromisedEta && +new Date(ship.carrierEta) > +new Date(ship.supplierPromisedEta));
  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="border-b border-primary/15 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Ship className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-mono text-sm font-bold">{ship.ref}</span>
              <LiveStatusChip ship={ship} />
              {ship.status && ship.status.replace(/_/g, " ").toLowerCase() !== ship.liveStatus.replace(/_/g, " ").toLowerCase() && (
                <StatusPill value={ship.status} />
              )}
              <FreshnessBadge value={ship.freshness} />
            </div>
            <p className="mt-1 truncate font-display text-lg font-semibold leading-tight">
              {ship.vesselName ?? ship.carrier ?? "Vessel unlinked"}
              {ship.vesselVoyage ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">Voyage {ship.vesselVoyage}</span> : null}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Close dossier">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2.5">
          <DossierActions
            ship={ship}
            onTrackRoute={onTrackRoute}
            onOpenDetails={onOpenDetails}
            onViewOriginPort={onViewOriginPort}
            onViewDestPort={onViewDestPort}
          />
        </div>
      </div>

      {/* scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {/* Issue Resolution & Operational Advisory (Part 2: Understand and Resolve Issues) */}
        {(ship.liveStatus === "DELAYED" || ship.liveStatus === "CUSTOMS_HOLD") && (
          <section id="advisory-section" className="mb-4 rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/12 via-background/40 to-transparent p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2 text-amber-400">
              <div className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider">
                <Siren className="h-3.5 w-3.5 animate-pulse text-amber-400" />
                <span>Operational Issue &amp; Action Advisory</span>
              </div>
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wide text-amber-300">
                Action Required
              </span>
            </div>

            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-baseline border-b border-border/40 pb-1">
                <span className="text-muted-foreground text-[10px]">Primary Exception</span>
                <span className="font-semibold text-amber-300">
                  {ship.liveStatus === "DELAYED" ? "Maritime Voyage Transit Delay" : "Customs Inspection & Regulatory Hold"}
                </span>
              </div>

              {slipped ? (
                <div className="flex justify-between items-baseline border-b border-border/40 pb-1 text-[10px]">
                  <span className="text-muted-foreground">Carrier ETA Slippage</span>
                  <span className="font-mono font-bold text-rose-300">
                    Delayed vs Supplier Promised ({fmtBahrainDateTime(ship.supplierPromisedEta)})
                  </span>
                </div>
              ) : null}

              {comp.exceptions.length > 0 ? (
                <div className="border-b border-border/40 pb-1 text-[10px]">
                  <span className="text-muted-foreground">Logged Audit Exceptions:</span>
                  <div className="mt-1 space-y-0.5">
                    {comp.exceptions.map((ex, i) => (
                      <p key={i} className="text-rose-300 flex items-start gap-1">
                        <span className="shrink-0">•</span>
                        <span>{ex.rule} — {ex.fact}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-between items-baseline pt-0.5 text-[10px]">
                <span className="text-muted-foreground">Affected Sea Corridor</span>
                <span className="font-medium text-foreground">{ship.from?.label ?? ship.originPort} → {ship.to?.label ?? ship.destPort}</span>
              </div>

              <div className="pt-0.5 text-[9px] text-muted-foreground/80 leading-tight">
                Data Notice: Recorded timestamps are verified from platform audit events. Operational actions initiate simulation scenarios.
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20"
                onClick={() => alert(`Operational Alert: Priority clearance expedited for ${ship.ref} at destination port.`)}
              >
                <ShieldCheck className="mr-1 h-3 w-3" /> Priority Expedite Request
              </Button>
              <a href={`/api/live-trace/report?ref=${ship.ref}`} download>
                <Button variant="outline" size="sm" className="h-7 border-primary/40 text-[10px] font-semibold text-primary hover:bg-primary/20">
                  <FileDown className="mr-1 h-3 w-3" /> Incident Dossier PDF
                </Button>
              </a>
            </div>
          </section>
        )}

        {/* vessel & route */}
        <section className="mb-4">
          <MiniTitle icon={<Anchor className="h-3 w-3" />}>Vessel &amp; route</MiniTitle>
          <RouteBar ship={ship} p={p} />
          <div className="mt-2 grid grid-cols-2 gap-x-4">
            <KV
              k="Mode"
              v={
                <span>
                  {ship.mode}
                  {ship.mode === "ROAD" ? <span className="ml-1 text-[9px] text-muted-foreground">(bulk — containers n/a)</span> : null}
                </span>
              }
            />
            <KV k="Carrier" v={ship.carrier ?? "—"} />
            <KV k="Forwarder" v={ship.forwarder ?? "—"} />
            <KV k="Speed" v={ship.speedKn ? <span className="tabular-nums">≈ {ship.speedKn} kn</span> : "—"} />
            <KV k="Departed" v={<span className="tabular-nums">{fmtBahrainDateTime(ship.departure)}</span>} />
            <KV
              k="Live position"
              v={
                ship.vesselName ? (
                  <span className="tabular-nums">{Math.round(p * 100)}% of voyage</span>
                ) : (
                  "position unlinked"
                )
              }
            />
          </div>
          {/* destination validation + route provenance (Phase 1.3 / 2.4) */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {ship.destVerified ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> destination verified · {ship.destPort}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300" title={ship.destNote ?? undefined}>
                ⚠ {ship.destNote ?? "Destination not verified"}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              {ship.routeProvenance === "estimated-corridor" ? "estimated corridor (waypoint geometry)" : ship.routeProvenance === "land-leg" ? "land leg" : "no validated route"}
              {ship.routeDistanceNm ? ` · ${ship.routeDistanceNm.toLocaleString("en-US")} nm` : ""}
            </span>
            {ship.routeVia.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                via {ship.routeVia.join(" · ")}
              </span>
            ) : null}
          </div>
          {ship.legs.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ship.legs.map((l) => (
                <span key={l.seq} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium" title={`${l.carrier ?? ""} · ${l.status}`}>
                  <span className="font-mono font-bold text-primary/80">L{l.seq}</span>
                  <span className="uppercase text-muted-foreground">{l.mode}</span>
                  <span className="min-w-0 truncate">{l.fromPoint} → {l.toPoint}</span>
                </span>
              ))}
            </div>
          ) : null}
          <div id="arrival-countdown-section" className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Arrival countdown</span>
              <span className="font-display text-xl font-bold tabular-nums text-gold-grad">
                {ship.eta && now ? fmtCountdown(+new Date(ship.eta) - now) : "no carrier ETA"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ETA {fmtDateTime(ship.eta)}
              {ship.etaType ? <span className="ml-1.5 rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase text-primary">{ship.etaType}</span> : null}
              {ship.etaSource ? <span className="ml-1">· {ship.etaSource}</span> : null}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span className="text-muted-foreground">
                supplier promise <span className="tabular-nums text-foreground">{fmtDate(ship.supplierPromisedEta)}</span>
              </span>
              <span className="text-muted-foreground">
                carrier <span className="tabular-nums text-foreground">{fmtDate(ship.carrierEta)}</span>
              </span>
              {slipped ? <span className="rounded border border-rose-400/25 bg-rose-400/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">ETA SLIPPED vs PROMISE</span> : null}
            </div>
          </div>
        </section>

        {/* materials & import value */}
        <section className="mb-4">
          <MiniTitle icon={<Package className="h-3 w-3" />}>Material · country · cost</MiniTitle>
          {ship.materials.length === 0 ? (
            <EmptyState message="No PO lines linked to this shipment" />
          ) : (
            <>
              <ScrollTable maxHeight="max-h-[240px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-8 text-[10px]">SKU / Material</TableHead>
                      <TableHead className="h-8 text-[10px]">Origin</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Qty</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Unit</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Line value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ship.materials.map((m) => (
                      <TableRow key={m.sku}>
                        <TableCell className="py-1.5">
                          <p className="font-mono text-[11px] font-semibold">{m.sku}</p>
                          <p className="max-w-[180px] truncate text-[11px] text-muted-foreground" title={`${m.name}${m.workPackage ? ` — ${m.workPackage}` : ""}`}>
                            {m.name}
                            {m.criticality === "CRITICAL" ? <span className="ml-1 text-[9px] font-bold text-rose-400">CRITICAL</span> : null}
                          </p>
                        </TableCell>
                        <TableCell className="py-1.5 text-[11px]">{m.countryOfOrigin}</TableCell>
                        <TableCell className="py-1.5 text-right text-[11px] tabular-nums">
                          {m.quantity.toLocaleString()} {m.uom}
                        </TableCell>
                        <TableCell className="py-1.5 text-right text-[11px] tabular-nums">{fmtMoney(m.unitPrice, ship.currency)}</TableCell>
                        <TableCell className="py-1.5 text-right text-[11px] font-semibold tabular-nums">{fmtMoney(m.extended, ship.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollTable>
              <div className="mt-2 flex items-baseline justify-between rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total import value</span>
                <span className="text-right">
                  <span className="block font-display text-2xl font-bold tabular-nums text-gold-grad">{fmtMoney(ship.importValue, ship.currency)}</span>
                  {ship.currency !== "USD" ? <span className="block text-[9px] text-muted-foreground">≈ USD {ship.importValueUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} · FX documented</span> : null}
                </span>
              </div>
            </>
          )}
        </section>

        {/* quantities (Phase 5/6/9) */}
        <section className="mb-4">
          <MiniTitle icon={<Package className="h-3 w-3" />}>Cargo quantities — dispatched · in transit · received</MiniTitle>
          <QuantityBlock ship={ship} />
        </section>

        {/* where to use */}
        <section className="mb-4">
          <MiniTitle icon={<Factory className="h-3 w-3" />}>Where to use</MiniTitle>
          <div className="grid grid-cols-2 gap-x-4">
            <KV
              k="Project"
              v={ship.project ? (
                <span>
                  <span className="font-mono text-[11px] font-semibold">{ship.project.code}</span> · {ship.project.name}
                  <span className="block text-[10px] text-muted-foreground">site: {ship.project.site}</span>
                </span>
              ) : "—"}
            />
            <KV
              k="Warehouse"
              v={ship.destinationWarehouse ? (
                <span>
                  <span className="font-mono text-[11px] font-semibold">{ship.destinationWarehouse.code}</span> · {ship.destinationWarehouse.name}
                  <span className="block text-[10px] text-muted-foreground">{ship.destinationWarehouse.site}</span>
                </span>
              ) : "not yet assigned"}
            />
            <KV k="Delivery location" v={ship.po?.deliveryLocation ?? "—"} />
            <KV k="Incoterms" v={ship.po?.deliveryTerms ?? ship.supplier?.incoterms ?? "—"} />
          </div>
          {ship.materials.some((m) => m.workPackage) ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ship.materials
                .filter((m) => m.workPackage)
                .map((m) => (
                  <span key={m.sku} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px]" title={`${m.name} → ${m.workPackage}`}>
                    <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                    <span className="truncate">{m.workPackage}</span>
                  </span>
                ))}
            </div>
          ) : null}
        </section>

        {/* procurement */}
        <section className="mb-4">
          <MiniTitle icon={<Building2 className="h-3 w-3" />}>Procurement chain</MiniTitle>
          <div className="grid grid-cols-2 gap-x-4">
            <KV
              k="Supplier"
              v={ship.supplier ? (
                <span>
                  {ship.supplier.name} <StatusPill value={ship.supplier.status} className="ml-1" />
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {ship.supplier.code} · {ship.supplier.city ? `${ship.supplier.city}, ` : ""}
                    {ship.supplier.country}
                  </span>
                </span>
              ) : "—"}
            />
            <KV
              k="Purchase order"
              v={ship.po ? (
                <span>
                  <span className="font-mono text-[11px] font-semibold">{ship.po.ref}</span> <StatusPill value={ship.po.status} className="ml-1" />
                  <span className="block text-[10px] tabular-nums text-muted-foreground">
                    {fmtMoney(ship.po.totalAmount, ship.po.currency)} · promised {fmtDate(ship.po.promisedDate)}
                  </span>
                </span>
              ) : "—"}
            />
          </div>
          {ship.po?.contracts.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Contracts:</span>
              {ship.po.contracts.map((c) => (
                <span key={c} className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {c}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* event timeline (Phase 5) */}
        <section id="event-timeline-section" className="mb-4">
          <MiniTitle icon={<Timer className="h-3 w-3" />}>Event timeline — Asia/Bahrain time (AST, UTC+3)</MiniTitle>
          <EventTimeline ship={ship} />
        </section>

        {/* compliance */}
        <section>
          <MiniTitle icon={<ShieldCheck className="h-3 w-3" />}>Compliance &amp; risk</MiniTitle>
          <div className="grid grid-cols-2 gap-x-4">
            <KV
              k="Customs"
              v={comp.customsHold ? (
                <span className="font-semibold text-rose-400">HOLD — {comp.customsStatus}</span>
              ) : (
                <span className="capitalize">{comp.customsStatus ?? "not reported"}</span>
              )}
            />
            <KV k="Import dossier" v={comp.importFileRef ? <span className="font-mono text-[11px] font-semibold">{comp.importFileRef}</span> : "—"} />
            <KV k="Reconciliation" v={<span className="inline-flex items-center gap-1.5"><ReconciliationBadge result={comp.overallReconciliation} /><span className="text-[10px] tabular-nums text-muted-foreground">{comp.reconciliation.PASS}✓ {comp.reconciliation.WARN}! {comp.reconciliation.FAIL}✗</span></span>} />
            <KV k="Evidence" v={comp.evidence.length ? <span className="text-[10px]">{comp.evidence.length} source record{comp.evidence.length > 1 ? "s" : ""}</span> : "—"} />
          </div>

          {comp.bol.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {comp.bol.map((b) => (
                <span key={`${b.bolNo}-${b.version}`} className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px]">
                  <FileText className="h-3 w-3 text-primary/70" />
                  <span className="font-mono font-semibold">{b.bolNo}</span>
                  <span className="text-muted-foreground">v{b.version}</span>
                  <StatusPill value={b.status} />
                </span>
              ))}
            </div>
          ) : null}

          {comp.exceptions.length > 0 ? (
            <div className="mt-2.5 space-y-1.5">
              {comp.exceptions.map((x) => (
                <div key={x.ref} className="flex flex-wrap items-center gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/5 px-2 py-1.5 text-[11px]">
                  <SeverityBadge value={x.severity} />
                  <Siren className="h-3 w-3 shrink-0 text-rose-400" />
                  <span className="font-mono font-semibold">{x.ref}</span>
                  <span className="min-w-0 flex-1 truncate">{x.title}</span>
                  <CaseStateBadge state={x.state} />
                </div>
              ))}
            </div>
          ) : null}

          {comp.risks.length > 0 ? (
            <div className="mt-2.5 space-y-1.5">
              {comp.risks.map((r, i) => (
                <div key={`${r.signalCode}-${i}`} className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge value={r.severity} />
                    <span className="font-mono text-[10px] font-bold">{r.signalCode}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{r.fact}</p>
                </div>
              ))}
            </div>
          ) : null}

          {comp.evidence.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {comp.evidence.map((e, i) => (
                <EvidenceBadge key={`${e.entityRef}-${i}`} label={`${e.sourceSystem} · ${e.label}`} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

/* ── fleet rail chip ───────────────────────────────────────────────────── */
function FleetChip({ ship, p, active, onClick }: { ship: TraceShip; p: number; active: boolean; onClick: () => void }) {
  const c = STATUS_COLOR[ship.liveStatus];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative w-[220px] shrink-0 rounded-xl border p-2.5 text-left transition-all duration-300",
        active
          ? "border-primary/60 bg-primary/10 shadow-[0_0_24px_oklch(0.79_0.135_88/15%)]"
          : "border-border/70 bg-card/70 hover:border-primary/35 hover:bg-card"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
          <span className="truncate font-mono text-xs font-bold">{ship.ref}</span>
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: c }}>
          {STATUS_LABEL[ship.liveStatus]}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {ship.from?.label ?? ship.originPort} → {ship.to?.label ?? ship.destPort}
        {ship.vesselName ? <span className="ml-1 text-primary/70">· {ship.vesselName}</span> : null}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: `linear-gradient(90deg, #8a6a1f, ${c}, #f3dc8e)` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px]">
        <span className="tabular-nums text-primary">{fmtPct(p)}</span>
        <span className="tabular-nums text-muted-foreground">{fmtMoney(ship.importValue, ship.currency)}</span>
      </div>
    </button>
  );
}

/* ── supplier / warehouse panel (freight-chain context) ────────────────── */
function SitePanel({
  pick,
  snap,
  progress,
  onPickShip,
  onClose,
  railExpanded = true,
}: {
  pick: SitePick;
  snap: TraceSnapshot;
  progress: Map<string, number>;
  onPickShip: (ref: string) => void;
  onClose: () => void;
  railExpanded?: boolean;
}) {
  const isSupplier = pick.type === "supplier";
  const ships = snap.ships.filter((s) =>
    isSupplier
      ? s.supplier?.code === pick.code
      : s.destinationWarehouse?.code === pick.code || (s.to?.label ?? "").toUpperCase().includes(pick.code),
  );
  if (ships.length === 0) return null;
  const name = isSupplier
    ? (ships.find((s) => s.supplier)?.supplier?.name ?? pick.code)
    : (ships.find((s) => s.destinationWarehouse)?.destinationWarehouse?.name ?? pick.code);
  const meta = isSupplier
    ? `${ships.find((s) => s.supplier)?.supplier?.city ?? ""}${ships.find((s) => s.supplier)?.supplier?.city ? ", " : ""}${ships.find((s) => s.supplier)?.supplier?.country ?? ""}`
    : (ships.find((s) => s.destinationWarehouse)?.destinationWarehouse?.site ?? "");
  const status = isSupplier ? (ships.find((s) => s.supplier)?.supplier?.status ?? null) : null;
  const risks: { signalCode: string; severity: string; fact: string }[] = [];
  const seen = new Set<string>();
  let exceptions = 0;
  for (const s of ships) {
    exceptions += s.compliance.exceptions.length;
    for (const r of s.compliance.risks) {
      if (!seen.has(r.signalCode)) {
        seen.add(r.signalCode);
        risks.push(r);
      }
    }
  }
  const Icon = isSupplier ? Factory : Warehouse;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "absolute left-3 z-20 w-[302px] max-w-[calc(100%-24px)] overflow-hidden rounded-xl border border-primary/25 bg-card/95 shadow-[0_18px_50px_oklch(0_0_0/50%)] backdrop-blur-xl transition-all duration-200",
        railExpanded ? "bottom-[140px]" : "bottom-[48px]"
      )}
      data-testid={isSupplier ? "supplier-panel" : "warehouse-panel"}
    >
      <div className="flex items-start gap-2.5 border-b border-primary/15 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-bold leading-tight">{name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            {pick.code}
            {meta ? <span>· {meta}</span> : null}
            {status ? <StatusPill value={status} /> : null}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label={`Close ${isSupplier ? "supplier" : "warehouse"} panel`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="max-h-[46vh] overflow-y-auto px-3 py-2.5">
        {risks.length > 0 || exceptions > 0 ? (
          <div className="mb-2.5 space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Active risk signals</p>
            {risks.slice(0, 3).map((r) => (
              <div key={r.signalCode} className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <SeverityBadge value={r.severity} />
                  <span className="font-mono text-[10px] font-bold">{r.signalCode}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-muted-foreground">{r.fact}</p>
              </div>
            ))}
            {exceptions > 0 ? (
              <p className="text-[10px] text-rose-300/90">
                {exceptions} linked exception{exceptions > 1 ? "s" : ""} across its shipments
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mb-2.5 text-[10px] text-muted-foreground">No active risk signals on its shipments.</p>
        )}

        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {isSupplier ? "Outbound shipments" : "Inbound shipments"} — {ships.length}
        </p>
        <div className="space-y-1.5">
          {ships.map((s) => {
            const p = progress.get(s.ref) ?? s.progress;
            const c = STATUS_COLOR[s.liveStatus];
            return (
              <button
                key={s.ref}
                type="button"
                onClick={() => onPickShip(s.ref)}
                className="w-full rounded-lg border border-border/70 bg-background/40 p-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                aria-label={`Open dossier for ${s.ref}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c, boxShadow: `0 0 5px ${c}` }} />
                    <span className="truncate font-mono text-[11px] font-bold">{s.ref}</span>
                  </span>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide" style={{ color: c }}>
                    {STATUS_LABEL[s.liveStatus]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {s.from?.label ?? s.originPort} → {s.to?.label ?? s.destPort}
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: `linear-gradient(90deg, #8a6a1f, ${c}, #f3dc8e)` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="tabular-nums text-primary">{fmtPct(p)}</span>
                  <span className="tabular-nums text-muted-foreground">{fmtMoney(s.importValue, s.currency)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Port Intelligence Panel (Part 1 & 2: verified port operations) ───── */
function PortPanel({
  port,
  ships,
  onPickShip,
  onClose,
  onFocusMap,
  onFilterShipments,
  onShowConnectedRoutes,
  railExpanded = true,
}: {
  port: PortIntelligence;
  ships: TraceShip[];
  onPickShip: (ref: string) => void;
  onClose: () => void;
  onFocusMap: (coords: [number, number]) => void;
  onFilterShipments: (portName: string) => void;
  onShowConnectedRoutes: (port: PortIntelligence) => void;
  railExpanded?: boolean;
}) {
  const callingShips = ships.filter(
    (s) =>
      s.originPort === port.code ||
      s.destPort === port.code ||
      s.from?.code === port.code ||
      s.to?.code === port.code ||
      (s.milestones && s.milestones.some((m) => m.location?.includes(port.name) || m.location?.includes(port.code)))
  );

  const statusBg =
    port.operationalStatus === "NORMAL_OPERATIONS"
      ? "#34d399"
      : port.operationalStatus === "OPTIMAL_FLOW"
      ? "#38bdf8"
      : port.operationalStatus === "CONGESTION_WATCH"
      ? "#fbbf24"
      : "#f87171";

  const scrollToSpecs = () => {
    const el = document.getElementById("port-specs-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "absolute left-3 z-20 w-[340px] max-w-[calc(100%-24px)] overflow-hidden rounded-xl border border-primary/30 bg-card/95 shadow-[0_20px_50px_oklch(0_0_0/55%)] backdrop-blur-xl transition-all duration-200",
        railExpanded ? "bottom-[140px]" : "bottom-[48px]"
      )}
      data-testid="port-panel"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 border-b border-primary/15 bg-gradient-to-br from-primary/15 via-transparent to-transparent px-3.5 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-[0_0_12px_oklch(0.79_0.135_88/25%)]">
          <Anchor className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-primary">{port.unlocode}</span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider"
              style={{ background: `${statusBg}1a`, color: statusBg, border: `1px solid ${statusBg}4d` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusBg }} />
              {port.operationalStatus.replace(/_/g, " ")}
            </span>
          </div>
          <p className="truncate font-display text-sm font-bold text-foreground leading-snug">{port.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {port.city}, {port.stateOrRegion ? `${port.stateOrRegion}, ` : ""}{port.country}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close port panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Part 4 Section 4: Port Contextual Action Controls */}
      <div className="grid grid-cols-2 gap-1.5 px-3 py-2 border-b border-border/40 bg-card/60">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-primary/35 bg-primary/10 text-primary hover:bg-primary/20 gap-1"
          onClick={() => onFocusMap(port.coordinates)}
          title="Zoom and focus map camera on this port"
        >
          <Crosshair className="h-3 w-3" /> Focus on Map
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-border/70 text-foreground hover:bg-muted gap-1"
          onClick={() => onFilterShipments(port.name)}
          title="Filter fleet search to shipments calling this port"
        >
          <Ship className="h-3 w-3 text-primary" /> Shipments ({callingShips.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-border/70 text-foreground hover:bg-muted gap-1"
          onClick={() => onShowConnectedRoutes(port)}
          title="Inspect connected ocean corridors"
        >
          <Compass className="h-3 w-3 text-sky-400" /> Routes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-border/70 text-foreground hover:bg-muted gap-1"
          onClick={scrollToSpecs}
          title="Review port specs, draft, and handling facilities"
        >
          <FileText className="h-3 w-3 text-amber-400" /> Port Details
        </Button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-3.5 py-3 space-y-3">
        {/* Specifications */}
        <div id="port-specs-section" className="rounded-lg border border-border/70 bg-background/50 p-2.5 text-[11px] space-y-1.5">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Port Type</span>
            <span className="font-medium text-foreground text-right">{port.portType}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Operator</span>
            <span className="font-medium text-foreground text-right">{port.operator}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Max Draft / Quay</span>
            <span className="font-mono text-primary font-bold">{port.maxDraftM}m / {port.quayLengthM}m</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Capacity</span>
            <span className="font-mono text-foreground font-bold">{port.annualCapacity}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Security</span>
            <span className="text-[10px] text-emerald-300 font-semibold">{port.securityLevel}</span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground text-[10px] uppercase font-semibold">Hours</span>
            <span className="text-[10px] text-muted-foreground text-right">{port.operatingHours}</span>
          </div>
        </div>

        {/* Facilities Chips */}
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Verified Facilities &amp; Logistics</p>
          <div className="flex flex-wrap gap-1">
            {port.facilities.map((f, i) => (
              <span key={i} className="rounded border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Port Notes */}
        {port.notes ? (
          <p className="text-[10px] text-muted-foreground/90 italic leading-relaxed border-l-2 border-primary/30 pl-2">
            {port.notes}
          </p>
        ) : null}

        {/* Calling Fleet Consignments */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Calling Consignments ({callingShips.length})
            </p>
            <span className="text-[9px] text-primary">Active in snapshot</span>
          </div>
          {callingShips.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-1">No active consignments calling this port in current snapshot.</p>
          ) : (
            <div className="space-y-1.5">
              {callingShips.map((s) => {
                const c = STATUS_COLOR[s.liveStatus];
                return (
                  <button
                    key={s.ref}
                    type="button"
                    onClick={() => onPickShip(s.ref)}
                    className="w-full rounded-lg border border-border/70 bg-background/60 p-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                        {s.ref}
                      </span>
                      <span className="text-[9px] font-bold uppercase" style={{ color: c }}>
                        {STATUS_LABEL[s.liveStatus]}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.from?.label ?? s.originPort} → {s.to?.label ?? s.destPort}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Country / Regional Panel (Part 1 & 2: geographic hierarchy) ─────── */
function CountryPanel({
  country,
  onPickPort,
  onClose,
  onFocusMap,
  onFilterShipments,
  railExpanded = true,
}: {
  country: CountryIntelligence;
  onPickPort: (port: PortIntelligence) => void;
  onClose: () => void;
  onFocusMap: (coords: [number, number]) => void;
  onFilterShipments: (countryName: string) => void;
  railExpanded?: boolean;
}) {
  const scrollToPorts = () => {
    const el = document.getElementById("country-ports-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToRegions = () => {
    const el = document.getElementById("country-regions-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "absolute left-3 z-20 w-[340px] max-w-[calc(100%-24px)] overflow-hidden rounded-xl border border-primary/30 bg-card/95 shadow-[0_20px_50px_oklch(0_0_0/55%)] backdrop-blur-xl transition-all duration-200",
        railExpanded ? "bottom-[140px]" : "bottom-[48px]"
      )}
      data-testid="country-panel"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 border-b border-primary/15 bg-gradient-to-br from-primary/15 via-transparent to-transparent px-3.5 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-xl shadow-[0_0_12px_oklch(0.79_0.135_88/25%)]">
          {country.flag}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-primary">{country.code}</span>
            <span className="rounded bg-primary/10 px-1 py-0.2 text-[8px] font-bold uppercase text-primary border border-primary/20">
              Sovereign Territory
            </span>
          </div>
          <p className="truncate font-display text-sm font-bold text-foreground leading-snug">{country.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            Capital: {country.capital} · Customs: {country.customsAuthority}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close country panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Part 4 Section 4: Country Contextual Action Controls */}
      <div className="grid grid-cols-2 gap-1.5 px-3 py-2 border-b border-border/40 bg-card/60">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-primary/35 bg-primary/10 text-primary hover:bg-primary/20 gap-1"
          onClick={() => onFocusMap(country.coordinates)}
          title="Zoom and focus map on country territory"
        >
          <Crosshair className="h-3 w-3" /> Focus on Map
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-border/70 text-foreground hover:bg-muted gap-1"
          onClick={() => onFilterShipments(country.name)}
          title="Filter fleet search to shipments from or to this country"
        >
          <Ship className="h-3 w-3 text-primary" /> View Shipments
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-border/70 text-foreground hover:bg-muted gap-1"
          onClick={scrollToPorts}
          title="Inspect major commercial ports"
        >
          <Anchor className="h-3 w-3 text-sky-400" /> View Ports ({country.majorPorts.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] font-semibold border-border/70 text-foreground hover:bg-muted gap-1"
          onClick={scrollToRegions}
          title="Explore regional commercial hubs and subdivisions"
        >
          <Globe className="h-3 w-3 text-emerald-400" /> Explore Regions
        </Button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto px-3.5 py-3 space-y-3">
        {/* Economic Role */}
        <div className="rounded-lg border border-border/70 bg-background/50 p-2.5 text-[11px] space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Economic &amp; Maritime Role</p>
          <p className="text-[11px] text-foreground leading-relaxed">{country.economicRole}</p>
        </div>

        {/* Maritime Logistics Corridors */}
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Maritime Logistics Corridors</p>
          <div className="space-y-1">
            {country.logisticsCorridors.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Major Verified Commercial Ports */}
        <div id="country-ports-section">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Major Verified Commercial Ports</p>
          <div className="flex flex-wrap gap-1.5">
            {country.majorPorts.map((pCode) => {
              const port = VERIFIED_PORTS[pCode];
              return (
                <button
                  key={pCode}
                  type="button"
                  onClick={() => port && onPickPort(port)}
                  className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-medium text-foreground hover:border-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                >
                  <Anchor className="h-3 w-3 text-primary" />
                  <span>{port ? port.name : pCode}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subdivisions / Provinces / States */}
        <div id="country-regions-section">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Subdivisions &amp; Commercial Hubs ({country.regions.length})
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {country.regions.map((reg, i) => (
              <div key={i} className="flex items-center justify-between rounded border border-border/50 bg-background/40 px-2 py-1.5 text-[10px]">
                <span className="font-medium text-foreground">{reg.name}</span>
                <div className="flex items-center gap-1.5">
                  {reg.commercialHub ? (
                    <span className="text-[9px] text-muted-foreground">Hub: {reg.commercialHub}</span>
                  ) : null}
                  <span className="rounded bg-muted/60 px-1 py-0.2 text-[8px] font-semibold text-muted-foreground uppercase">
                    {reg.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══ LIVE TRACEABILITY COMMAND VIEW (full-screen overlay) ════════════════ */
export function LiveTraceabilityView({ drillRef }: { drillRef?: string | null }) {
  const setView = useAppStore((s) => s.setView);
  const clearDrill = useAppStore((s) => s.clearDrill);
  const traceShip = useAppStore((s) => s.traceShip);
  const clearTraceShip = useAppStore((s) => s.clearTraceShip);
  const { data: snap, loading, error, refresh, syncedAt } = useApi<TraceSnapshot>("/api/live-trace", [], 0);
  const [picked, setPicked] = useState<string | null>(null);
  const [pickedSite, setPickedSite] = useState<SitePick | null>(null);
  const [pickedPort, setPickedPort] = useState<PortIntelligence | null>(null);
  const [pickedCountry, setPickedCountry] = useState<CountryIntelligence | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [factor, setFactor] = useState<number>(600);
  const [simBase, setSimBase] = useState<{ server: number; wall: number } | null>(null);
  const [fleetQuery, setFleetQuery] = useState("");
  const [fleetFilter, setFleetFilter] = useState<string>("all");
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [telemetryExpanded, setTelemetryExpanded] = useState(false);
  const [railExpanded, setRailExpanded] = useState(true);
  const [cameraAction, setCameraAction] = useState<MapCameraAction | null>(null);
  const [detailsModalShip, setDetailsModalShip] = useState<TraceShip | null>(null);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [isSimPaused, setIsSimPaused] = useState(false);
  const [simSnapshotOffsetHours, setSimSnapshotOffsetHours] = useState(0);
  const now = useNow(1000);

  const activeRef = picked ?? traceShip ?? drillRef ?? null;

  /* Helper to resolve coordinates for origin/destination ports */
  const findPortCoords = (nameOrCode: string): [number, number] | null => {
    if (!nameOrCode) return null;
    const key = nameOrCode.toLowerCase();
    const vPort = Object.values(VERIFIED_PORTS).find(
      (vp) => vp.name.toLowerCase().includes(key) || vp.code.toLowerCase() === key || key.includes(vp.code.toLowerCase())
    );
    if (vPort) return vPort.coordinates;
    const reg = lookupPort(nameOrCode);
    if (reg) return [reg.lng, reg.lat];
    return null;
  };

  /* Active operational alerts count (Part 4 Section 1 & 5) */
  const alertCount = useMemo(() => {
    if (!snap) return 0;
    return snap.ships.filter(
      (s) => s.liveStatus === "DELAYED" || s.liveStatus === "CUSTOMS_HOLD" || s.compliance.exceptions.length > 0
    ).length;
  }, [snap]);

  /* multi-entity search results across shipments, ports, countries, and states */
  const searchResults = useMemo(() => {
    if (!fleetQuery || fleetQuery.trim().length < 2) return [];
    return searchGeoAndFleet(fleetQuery, snap?.ships ?? []);
  }, [fleetQuery, snap]);

  /* sim clock: server snapshot + real elapsed × time-lapse factor */
  const baseRef = useRef<{ server: number; wall: number } | null>(null);
  const pausedWallRef = useRef<number | null>(null);

  useEffect(() => {
    if (snap) {
      baseRef.current = { server: +new Date(snap.serverTime), wall: Date.now() };
      setSimBase(baseRef.current);
    }
  }, [snap]);

  /* Smooth pause/resume without timeline jumping */
  useEffect(() => {
    if (isSimPaused) {
      pausedWallRef.current = Date.now();
    } else if (pausedWallRef.current && baseRef.current) {
      const elapsedPaused = Date.now() - pausedWallRef.current;
      baseRef.current.wall += elapsedPaused;
      pausedWallRef.current = null;
    }
  }, [isSimPaused]);

  const [simNow, setSimNow] = useState<number | null>(null);
  useEffect(() => {
    if (isSimPaused) return;
    const id = setInterval(() => {
      const b = baseRef.current;
      if (b) setSimNow(b.server + (Date.now() - b.wall) * factor);
    }, 150);
    return () => clearInterval(id);
  }, [factor, isSimPaused]);

  /* hourly cadence: refetch exactly at the next top-of-hour + pulse */
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (!snap) return;
    const delay = Math.max(1500, +new Date(snap.nextUpdateAt) - Date.now());
    const id = setTimeout(() => {
      refresh();
      setFlash((f) => f + 1);
    }, delay);
    return () => clearTimeout(id);
  }, [snap, refresh]);
  const syncPulse = now !== null && syncedAt > 0 && now - syncedAt < 1600;

  /* per-ship live progress at simNow */
  const progress = useMemo(() => {
    const m = new Map<string, number>();
    if (!snap || simNow === null) return m;
    for (const s of snap.ships) m.set(s.ref, liveProgressAt(s, simNow));
    return m;
  }, [snap, simNow]);

  const byRef = useMemo(() => new Map((snap?.ships ?? []).map((s) => [s.ref, s])), [snap]);
  const sel = activeRef ? byRef.get(activeRef) ?? null : null;

  /* Phase 10: searchable, status-filtered fleet rail */
  const filteredShips = useMemo(() => {
    const ships = snap?.ships ?? [];
    const q = fleetQuery.trim().toLowerCase();
    return ships.filter((s) => {
      if (fleetFilter !== "all" && s.liveStatus !== fleetFilter) return false;
      if (!q) return true;
      return [s.ref, s.vesselName, s.carrier, s.originPort, s.destPort, s.supplier?.name, s.supplier?.code]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [snap, fleetQuery, fleetFilter]);

  /* deep-link URL sync: /?view=trace&ship=SHP-8801 */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set("view", "trace");
    if (activeRef) q.set("ship", activeRef);
    else q.delete("ship");
    window.history.replaceState(null, "", `/?${q.toString()}`);
  }, [activeRef]);

  const closeOverlay = () => {
    const q = new URLSearchParams(window.location.search);
    q.delete("view");
    q.delete("ship");
    window.history.replaceState(null, "", q.size ? `/?${q.toString()}` : "/");
    setView("control-tower");
  };
  const closeDrawer = () => {
    setPicked(null);
    setPickedPort(null);
    setPickedCountry(null);
    setPickedSite(null);
    clearTraceShip();
    if (drillRef) clearDrill();
  };

  /* Esc: drawer first, then overlay */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sel || pickedPort || pickedCountry || pickedSite) closeDrawer();
      else closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, pickedPort, pickedCountry, pickedSite, drillRef]);

  const countdown = snap && now !== null ? +new Date(snap.nextUpdateAt) - now : null;
  const totals = snap?.totals;

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="NASS Freight Traceability Map"
    >
      {/* ambient gold + hourly pulse */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_480px_at_50%_-12%,oklch(0.79_0.135_88/9%),transparent_62%)]" />
      {flash > 0 ? (
        <div
          key={flash}
          aria-hidden
          className="map-flash-layer pointer-events-none absolute inset-0 bg-[radial-gradient(900px_430px_at_50%_42%,oklch(0.79_0.135_88/11%),transparent_66%)] [animation:map-flash_1.5s_ease-out_1]"
        />
      ) : null}

      {/* ── top bar ── */}
      <header className="relative z-10 border-b border-primary/15 bg-background/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f3dc8e] via-[#d4af37] to-[#8a6a1f] text-[#1a1408] shadow-[0_0_16px_oklch(0.79_0.135_88/30%)]">
              <RadioTower className="h-4 w-4" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-sm font-bold tracking-wide">
                NASS Freight <span className="text-gold-grad">Traceability</span>
              </p>
              <p className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <PulsingDot /> Bahrain destination · every ship · same picture · hourly snapshot
              </p>
            </div>
          </div>

          {/* live counters — essential fleet KPIs (Part 2: fleet overview) */}
          {totals ? (
            <div className="hidden items-center gap-2.5 rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 md:flex">
              {(
                [
                  ["total", snap.ships.length, "#d4af37"],
                  ["in transit", totals.inTransit, STATUS_COLOR.IN_TRANSIT],
                  ["delayed", totals.delayed, STATUS_COLOR.DELAYED],
                  ["customs hold", totals.customsHold, STATUS_COLOR.CUSTOMS_HOLD],
                  ["arrived", totals.arrived, STATUS_COLOR.ARRIVED],
                ] as const
              ).map(([label, value, color]) => (
                <span key={label} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
                  {label} <span className="font-display text-[13px] font-bold tabular-nums text-foreground">{value}</span>
                </span>
              ))}
              <span className="border-l border-border/60 pl-2.5 text-[10px] font-semibold text-muted-foreground" title="Sum of shipment import values normalized to USD with documented FX — global fleet totals, unfiltered">
                fleet value <span className="font-display text-[13px] font-bold tabular-nums text-gold-grad">{fmtMoney(totals.importValueUsd, "USD")}</span>
                <span className="ml-1 text-[9px]">eq.</span>
              </span>
            </div>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {/* Part 4 Section 1 & 5: View Alerts Button */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 font-semibold text-xs transition-all",
                alertCount > 0
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "border-border/70 text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setAlertsModalOpen(true)}
              title="Review delayed shipments, customs holds, and active exceptions"
            >
              <Siren className={cn("h-3.5 w-3.5", alertCount > 0 && "animate-pulse text-amber-400")} />
              <span>View Alerts</span>
              {alertCount > 0 && (
                <span className="rounded-full bg-amber-500/25 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                  {alertCount}
                </span>
              )}
            </Button>

            {/* Part 4 Section 1: Reset Map to Bahrain operations center */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border/70 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground text-xs font-semibold"
              onClick={() => setCameraAction({ type: "reset-home" })}
              title="Reset map view to default Bahrain operations center"
            >
              <Home className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Reset Map</span>
            </Button>

            {/* Fit Fleet — Frame all active vessels */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border/70 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground text-xs font-semibold"
              onClick={() => setCameraAction({ type: "fit-fleet" })}
              title="Frame every active shipment across the globe"
            >
              <Crosshair className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Fit Fleet</span>
            </Button>

            {/* Part 4 Section 6: Simulation Playback Controls */}
            <div
              className="flex items-center gap-1 rounded-md border border-primary/25 bg-card/70 px-1.5 py-1 text-xs"
              role="group"
              aria-label="Simulation Controls"
            >
              <span className="hidden xl:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1 border-r border-border/50">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse" /> Sim
              </span>

              {/* Play / Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-foreground hover:bg-primary/20"
                onClick={() => setIsSimPaused(!isSimPaused)}
                title={isSimPaused ? "Resume simulation movement" : "Pause simulation movement"}
                aria-label={isSimPaused ? "Play" : "Pause"}
              >
                {isSimPaused ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5 text-amber-300" />}
              </Button>

              {/* Previous Snapshot (-1 hour) */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-primary/20"
                onClick={() => {
                  setSimSnapshotOffsetHours((prev) => prev - 1);
                  if (baseRef.current) {
                    baseRef.current = { ...baseRef.current, server: baseRef.current.server - 3600 * 1000 };
                  }
                }}
                title="Previous Snapshot (-1h)"
                aria-label="Previous Snapshot"
              >
                <StepBack className="h-3 w-3" />
              </Button>

              {/* Next Snapshot (+1 hour) */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-primary/20"
                onClick={() => {
                  setSimSnapshotOffsetHours((prev) => prev + 1);
                  if (baseRef.current) {
                    baseRef.current = { ...baseRef.current, server: baseRef.current.server + 3600 * 1000 };
                  }
                }}
                title="Next Snapshot (+1h)"
                aria-label="Next Snapshot"
              >
                <StepForward className="h-3 w-3" />
              </Button>

              {/* Speed Presets */}
              <div className="flex items-center overflow-hidden rounded border border-border/60 bg-background/50">
                {SIM_PRESETS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFactor(f)}
                    aria-pressed={factor === f}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-bold tabular-nums transition-colors",
                      factor === f ? "bg-primary/20 text-primary font-extrabold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f}×
                  </button>
                ))}
              </div>

              {/* Reset Simulation */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-primary/20"
                onClick={() => {
                  setIsSimPaused(false);
                  setFactor(1);
                  setSimSnapshotOffsetHours(0);
                  if (snap) {
                    baseRef.current = { server: +new Date(snap.serverTime), wall: Date.now() };
                    setSimBase(baseRef.current);
                  }
                }}
                title="Reset simulation to current snapshot"
                aria-label="Reset Simulation"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            {/* Hourly cadence chip */}
            <span
              className={cn(
                "hidden md:inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-colors duration-700",
                syncPulse ? "border-primary/60 bg-primary/15 text-primary" : "border-border/70 bg-card/60 text-muted-foreground"
              )}
              title={snap ? `Snapshot recomputed every hour (${snap.snapshotHourLabel})` : undefined}
            >
              <Timer className="h-3 w-3" />
              <span>{snap?.snapshotHourLabel ?? "Hourly sync"}</span>
              {countdown !== null ? <span className="tabular-nums text-primary font-mono">{fmtCountdown(countdown)}</span> : null}
            </span>

            {/* Part 4 Section 1: Export PDF Report */}
            <a href="/api/live-trace/report" download aria-label="Export full live scenario PDF report">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary text-xs font-semibold">
                <FileDown className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export Report</span>
              </Button>
            </a>

            {/* CLOSE — pinned top-right */}
            <Button
              size="sm"
              className="h-8 gap-1.5 border border-primary/40 bg-primary/10 px-3 font-semibold text-primary hover:bg-primary/20 hover:text-primary text-xs"
              onClick={closeOverlay}
              aria-label="Close live traceability view"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </div>
        <div className="hairline-gold h-px w-full" aria-hidden />
      </header>

      {/* ── map ── */}
      <div className="relative min-h-0 flex-1">
        {!snap ? (
          <div className="flex h-full items-center justify-center">
            {error ? (
              <div className="space-y-3 text-center">
                <ErrorState message={error} />
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
              </div>
            ) : (
              <LoadingState label="Establishing live feed — plotting every vessel…" />
            )}
          </div>
        ) : (
          <>
            <OperationMap
              ships={snap.ships}
              simBase={simBase}
              factor={isSimPaused ? 0 : factor}
              selectedRef={activeRef}
              cameraAction={cameraAction}
              onPick={(ref) => {
                setPicked(ref);
                setPickedPort(null);
                setPickedCountry(null);
                setPickedSite(null);
              }}
              onBackgroundClick={closeDrawer}
              onSitePick={(site) => {
                setPickedSite(site);
                setPicked(null);
                setPickedPort(null);
                setPickedCountry(null);
              }}
              onPortPick={(port) => {
                setPickedPort(port);
                setPicked(null);
                setPickedCountry(null);
                setPickedSite(null);
              }}
              onCountryPick={(c) => {
                setPickedCountry(c);
                setPicked(null);
                setPickedPort(null);
                setPickedSite(null);
              }}
              railExpanded={railExpanded}
            />

            {/* legend — essential symbols visible; secondary definitions in collapsible legend */}
            <div className="absolute left-3 top-3 z-10 max-w-[280px] rounded-lg border border-border/70 bg-card/85 p-2.5 shadow-lg backdrop-blur-md transition-all">
              {/* Header with Title and Collapsible Toggle */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/90">Fleet status</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLegendExpanded((prev) => !prev)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  aria-expanded={legendExpanded}
                  title="Toggle secondary symbols and definitions"
                >
                  <span>{legendExpanded ? "Less" : "Details"}</span>
                  {legendExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Essential active statuses (always visible) */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {(["IN_TRANSIT", "AT_PORT", "CUSTOMS_HOLD", "DELAYED"] as const).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-foreground/85">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: STATUS_COLOR[s], boxShadow: `0 0 6px ${STATUS_COLOR[s]}66` }}
                    />
                    {STATUS_LABEL[s]}
                  </span>
                ))}
              </div>

              {/* Essential symbol: Vessel (always visible) */}
              <div className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                <svg width="15" height="9" viewBox="-11 -6 22 12" aria-hidden className="shrink-0">
                  <path d="M 8 0 L 2.2 2.9 L -6.5 2.9 L -6.5 -2.9 L 2.2 -2.9 Z" fill="#d4af37" stroke="oklch(0.1 0.01 80)" strokeWidth="1" strokeLinejoin="round" />
                </svg>
                <span>Vessel · Freight Movement</span>
              </div>

              {/* Collapsible secondary definitions */}
              <AnimatePresence>
                {legendExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5 text-[10px] text-muted-foreground">
                      {/* Secondary statuses */}
                      <div>
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">Secondary Statuses</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {(["ARRIVED", "BOOKED", "UNKNOWN"] as const).map((s) => (
                            <span key={s} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ background: STATUS_COLOR[s], boxShadow: `0 0 5px ${STATUS_COLOR[s]}44` }}
                              />
                              {STATUS_LABEL[s]}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Secondary route and site symbols */}
                      <div className="space-y-1.5 border-t border-border/40 pt-2">
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">Route & Site Symbols</p>
                        <p className="flex items-center gap-2">
                          <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden className="shrink-0">
                            <line x1="0" y1="4" x2="16" y2="4" stroke="#d4af37" strokeWidth="2" />
                          </svg>
                          <span>Solid gold = Traveled corridor</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden className="shrink-0">
                            <line x1="0" y1="4" x2="16" y2="4" stroke="#f3dc8e" strokeWidth="1.8" strokeDasharray="3 2" opacity="0.6" />
                          </svg>
                          <span>Dashed line = Remaining voyage</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden className="shrink-0">
                            <line x1="0" y1="4" x2="16" y2="4" stroke="#34d399" strokeWidth="1.4" strokeDasharray="1.5 2" opacity="0.75" />
                          </svg>
                          <span>Dotted green = Land feeder leg</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Factory className="h-3.5 w-3.5 shrink-0 text-[#e9c765]" />
                          <span>Supplier site · Origin factory</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Warehouse className="h-3.5 w-3.5 shrink-0 text-[#34d399]" />
                          <span>NASS warehouse · Destination storage</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
                            <circle cx="6" cy="6" r="5" fill="none" stroke="#fbbf24" strokeWidth="1.2" />
                            <circle cx="6" cy="6" r="2" fill="#fbbf24" />
                          </svg>
                          <span>Port / Customs checkpoint</span>
                        </p>
                      </div>

                      {/* Technical & Attribution Note */}
                      <p className="border-t border-border/40 pt-1.5 text-[9px] text-muted-foreground/75 leading-tight">
                        Basemap © Esri &middot; Estimated corridors based on waypoint geometry.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* sim note + data-source honesty (Phase 8) — collapsible informational panel */}
            <div
              className={cn(
                "absolute top-3 z-10 hidden sm:block transition-all duration-300",
                sel ? "sm:right-[496px]" : "right-3"
              )}
            >
              {!telemetryExpanded ? (
                <button
                  type="button"
                  onClick={() => setTelemetryExpanded(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/85 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:border-primary/50 hover:text-foreground cursor-pointer"
                  aria-expanded={false}
                  title="Expand simulation cadence & data source transparency"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse" />
                  <span className="font-semibold text-foreground">
                    {factor !== 1 ? `sim ×${factor}` : "live ×1"}
                  </span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>Next: {fmtBahrainTime(snap.nextUpdateAt)}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-[280px] rounded-lg border border-border/70 bg-card/90 p-2.5 text-[10px] text-muted-foreground shadow-xl backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse" />
                      <span className="font-bold uppercase tracking-[0.16em] text-foreground/90 text-[9px]">Cadence & Source</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTelemetryExpanded(false)}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                      aria-expanded={true}
                      title="Minimize telemetry panel"
                    >
                      <span>Hide</span>
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  </div>
                  {factor !== 1 ? (
                    <p>
                      <span className="font-semibold text-primary">sim ×{factor} — simulated playback</span> · marker motion is animated between hourly snapshots; recorded event timestamps are never altered
                    </p>
                  ) : (
                    <p><span className="font-semibold text-primary">live cadence ×1</span> · markers glide continuously, data recomputed hourly</p>
                  )}
                  <p className="mt-1 leading-relaxed">
                    source: <span className="font-semibold">scenario snapshot</span> (demo dataset — no live AIS/carrier feed connected)
                    {snap.ships.length === 0 ? <span className="mt-1 block"><EmptyState message="No shipments to trace" /></span> : null}
                  </p>
                  <p className="mt-1 border-t border-border/40 pt-1 text-[9px]">
                    last refresh <span className="tabular-nums text-foreground">{fmtBahrainTime(syncedAt ? new Date(syncedAt) : null)}</span>
                    {" · "}next <span className="tabular-nums text-foreground">{fmtBahrainTime(snap.nextUpdateAt)}</span>
                  </p>
                </motion.div>
              )}
            </div>

            {/* supplier / warehouse panel */}
            <AnimatePresence>
              {pickedSite && snap ? (
                <SitePanel
                  key={`${pickedSite.type}:${pickedSite.code}`}
                  pick={pickedSite}
                  snap={snap}
                  progress={progress}
                  onPickShip={(ref) => {
                    setPicked(ref);
                    setPickedSite(null);
                  }}
                  onClose={() => setPickedSite(null)}
                  railExpanded={railExpanded}
                />
              ) : null}
            </AnimatePresence>

            {/* port intelligence panel (Part 1 & 2: verified port details) */}
            <AnimatePresence>
              {pickedPort && snap ? (
                <PortPanel
                  key={pickedPort.code}
                  port={pickedPort}
                  ships={snap.ships}
                  onPickShip={(ref) => {
                    setPicked(ref);
                    setPickedPort(null);
                  }}
                  onClose={() => setPickedPort(null)}
                  onFocusMap={(coords) => setCameraAction({ type: "focus-port", coords, zoom: 6.2 })}
                  onFilterShipments={(portName) => {
                    setFleetQuery(portName);
                    setSearchFocused(false);
                  }}
                  onShowConnectedRoutes={(port) => {
                    setCameraAction({ type: "focus-port", coords: port.coordinates, zoom: 5.2 });
                  }}
                  railExpanded={railExpanded}
                />
              ) : null}
            </AnimatePresence>

            {/* country & regional panel (Part 1 & 2: country/region exploration) */}
            <AnimatePresence>
              {pickedCountry ? (
                <CountryPanel
                  key={pickedCountry.code}
                  country={pickedCountry}
                  onPickPort={(port) => {
                    setPickedPort(port);
                    setPickedCountry(null);
                  }}
                  onClose={() => setPickedCountry(null)}
                  onFocusMap={(coords) => setCameraAction({ type: "focus-country", coords, zoom: 4.8 })}
                  onFilterShipments={(countryName) => {
                    setFleetQuery(countryName);
                    setSearchFocused(false);
                  }}
                  railExpanded={railExpanded}
                />
              ) : null}
            </AnimatePresence>

            {/* fleet rail — searchable + status-filtered (Phase 10) — collapsible strip */}
            {snap.ships.length > 0 ? (
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 z-10 border-t border-primary/10 bg-background/85 backdrop-blur transition-all duration-200",
                  railExpanded ? "px-3 py-2" : "px-3 py-1.5"
                )}
              >
                {railExpanded ? (
                  <>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Container className="h-3 w-3 text-primary" /> Fleet — {filteredShips.length}/{snap.ships.length} consignments · click any ship on map or below
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">{fmtMoney(totals?.importValueUsd ?? 0, "USD")} fleet total (USD eq., FX documented)</span>
                        <button
                          type="button"
                          onClick={() => setRailExpanded(false)}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium tracking-normal text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          aria-expanded={true}
                          title="Minimize fleet rail to expand map view"
                        >
                          <span>Minimize</span>
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="relative">
                        <Input
                          value={fleetQuery}
                          onFocus={() => setSearchFocused(true)}
                          onChange={(e) => {
                            setFleetQuery(e.target.value);
                            setSearchFocused(true);
                          }}
                          placeholder="Search ref / vessel / port / country / state…"
                          aria-label="Search fleet and geography"
                          className="h-7 w-[280px] border-border/60 bg-card/60 text-[11px]"
                        />
                        {/* Unified Search Dropdown */}
                        {searchFocused && searchResults.length > 0 && (
                          <div className="absolute left-0 bottom-full mb-1 w-[330px] max-h-[290px] overflow-y-auto rounded-lg border border-primary/30 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl z-50">
                            <div className="flex items-center justify-between px-2 py-1 border-b border-border/40 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              <span>Intelligence Matches ({searchResults.length})</span>
                              <button
                                type="button"
                                onClick={() => setSearchFocused(false)}
                                className="text-muted-foreground hover:text-foreground text-[10px]"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="py-1 space-y-0.5">
                              {searchResults.map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => {
                                    if (r.kind === "shipment") {
                                      setPicked(r.refData.ref);
                                      setPickedPort(null);
                                      setPickedCountry(null);
                                      setPickedSite(null);
                                    } else if (r.kind === "port") {
                                      setPickedPort(r.refData);
                                      setPicked(null);
                                      setPickedCountry(null);
                                      setPickedSite(null);
                                    } else if (r.kind === "country") {
                                      setPickedCountry(r.refData);
                                      setPicked(null);
                                      setPickedPort(null);
                                      setPickedSite(null);
                                    } else if (r.kind === "region") {
                                      setPickedCountry(r.refData.country);
                                      setPicked(null);
                                      setPickedPort(null);
                                      setPickedSite(null);
                                    }
                                    setSearchFocused(false);
                                  }}
                                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-primary/10 text-left transition-colors cursor-pointer"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                      {r.kind === "shipment" ? <Ship className="h-3 w-3 text-primary shrink-0" /> : null}
                                      {r.kind === "port" ? <Anchor className="h-3 w-3 text-amber-400 shrink-0" /> : null}
                                      {r.kind === "country" ? <Globe className="h-3 w-3 text-emerald-400 shrink-0" /> : null}
                                      {r.kind === "region" ? <MapPin className="h-3 w-3 text-sky-400 shrink-0" /> : null}
                                      <span className="truncate">{r.title}</span>
                                    </p>
                                    <p className="truncate text-[9px] text-muted-foreground">{r.subtitle}</p>
                                  </div>
                                  <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground">
                                    {r.badge}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 gap-1 overflow-x-auto">
                        {STATUS_FILTERS.map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            aria-pressed={fleetFilter === f.key}
                            onClick={() => setFleetFilter(f.key)}
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors",
                              fleetFilter === f.key
                                ? "border-primary/60 bg-primary/15 text-primary"
                                : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {filteredShips.map((s) => (
                        <FleetChip key={s.ref} ship={s} p={progress.get(s.ref) ?? s.progress} active={s.ref === activeRef} onClick={() => setPicked(s.ref)} />
                      ))}
                      {filteredShips.length === 0 ? <p className="py-3 text-[11px] text-muted-foreground">No consignments match this search/filter.</p> : null}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      <Container className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-foreground">Fleet Consignments</span>
                      <span className="text-muted-foreground">({filteredShips.length}/{snap.ships.length} active)</span>
                      <span className="hidden sm:inline text-muted-foreground/60">·</span>
                      <span className="hidden sm:inline text-gold-grad font-bold">{fmtMoney(totals?.importValueUsd ?? 0, "USD")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRailExpanded(true)}
                      className="flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      aria-expanded={false}
                      title="Expand fleet rail to search and view shipment cards"
                    >
                      <span>Expand Fleet Cards</span>
                      <ChevronUp className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* ── dossier drawer ── */}
            <AnimatePresence>
              {sel ? (
                <motion.aside
                  key={sel.ref}
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 280, damping: 32 }}
                  className="absolute right-0 top-0 z-20 h-full w-full border-l border-primary/20 bg-card/95 shadow-[-30px_0_60px_oklch(0_0_0/35%)] backdrop-blur-xl sm:w-[480px]"
                  role="complementary"
                  aria-label={`Dossier — ${sel.ref}`}
                >
                  <Dossier
                    ship={sel}
                    p={progress.get(sel.ref) ?? sel.progress}
                    now={now}
                    onClose={closeDrawer}
                    onTrackRoute={(ref) => setCameraAction({ type: "track-route", ref })}
                    onOpenDetails={(ship) => setDetailsModalShip(ship)}
                    onViewOriginPort={(portName) => {
                      const coords = findPortCoords(portName);
                      if (coords) setCameraAction({ type: "focus-port", coords, zoom: 6.2 });
                    }}
                    onViewDestPort={(portName) => {
                      const coords = findPortCoords(portName);
                      if (coords) setCameraAction({ type: "focus-port", coords, zoom: 6.2 });
                    }}
                  />
                </motion.aside>
              ) : null}
            </AnimatePresence>

            {/* Part 5: Complete 10-Section Structured Shipment Details Modal */}
            {detailsModalShip && (
              <ShipmentDetailsModal
                ship={detailsModalShip}
                isOpen={Boolean(detailsModalShip)}
                onClose={() => setDetailsModalShip(null)}
                onTrackRoute={(ref) => {
                  setCameraAction({ type: "track-route", ref });
                  setDetailsModalShip(null);
                }}
                onViewOriginPort={(portName) => {
                  const coords = findPortCoords(portName);
                  if (coords) setCameraAction({ type: "focus-port", coords, zoom: 6.2 });
                  setDetailsModalShip(null);
                }}
                onViewDestPort={(portName) => {
                  const coords = findPortCoords(portName);
                  if (coords) setCameraAction({ type: "focus-port", coords, zoom: 6.2 });
                  setDetailsModalShip(null);
                }}
              />
            )}

            {/* Part 4 Section 5: Active Fleet Alerts & Operational Issue Resolution Modal */}
            <AlertsResolutionModal
              isOpen={alertsModalOpen}
              ships={snap?.ships ?? []}
              onClose={() => setAlertsModalOpen(false)}
              onInvestigateShipment={(ref) => {
                setPicked(ref);
                setPickedPort(null);
                setPickedCountry(null);
                setPickedSite(null);
                setAlertsModalOpen(false);
                setCameraAction({ type: "track-route", ref });
              }}
              onViewShipmentDetails={(ship) => {
                setAlertsModalOpen(false);
                setDetailsModalShip(ship);
              }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
