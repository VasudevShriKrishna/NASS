"use client";

import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/lib/trace-types";

/* ── Status color system (map + fleet + dossier chips) ───────────────────
 * ONE authoritative palette — every view (counters, map markers, legend,
 * filters, dossier) reads the same status → color mapping (Phase 4).     */
export const STATUS_COLOR: Record<LiveStatus, string> = {
  IN_TRANSIT: "#d4af37",
  AT_PORT: "#34d399",
  CUSTOMS_HOLD: "#fbbf24",
  DELAYED: "#fb7185",
  ARRIVED: "#34d399",
  BOOKED: "#a8a29e",
  UNKNOWN: "#78716c",
};

export const STATUS_LABEL: Record<LiveStatus, string> = {
  IN_TRANSIT: "In transit",
  AT_PORT: "At port",
  CUSTOMS_HOLD: "Customs hold",
  DELAYED: "Delayed",
  ARRIVED: "Arrived",
  BOOKED: "Booked",
  UNKNOWN: "Stale / unknown",
};

/* ── Legend chip row — statuses + freight-chain symbols (Phase 2.3) ────── */
export function MapLegend({ className }: { className?: string }) {
  const items: LiveStatus[] = ["IN_TRANSIT", "AT_PORT", "CUSTOMS_HOLD", "DELAYED", "ARRIVED", "BOOKED"];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {items.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s], boxShadow: `0 0 6px ${STATUS_COLOR[s]}66` }} />
          {STATUS_LABEL[s]}
        </span>
      ))}
      <span className="mx-1 hidden h-3 w-px bg-border sm:block" aria-hidden />
      {/* freight-chain symbols */}
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <svg width="16" height="6" viewBox="0 0 16 6" aria-hidden>
          <line x1="0" y1="3" x2="16" y2="3" stroke="#f3dc8e" strokeWidth="1.6" />
        </svg>
        maritime route — solid travelled
      </span>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <svg width="16" height="6" viewBox="0 0 16 6" aria-hidden>
          <line x1="0" y1="3" x2="16" y2="3" stroke="#f3dc8e" strokeWidth="1.6" strokeDasharray="3 2.4" opacity="0.55" />
        </svg>
        dashed remaining
      </span>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <svg width="16" height="6" viewBox="0 0 16 6" aria-hidden>
          <line x1="0" y1="3" x2="16" y2="3" stroke="#d4af37" strokeWidth="1.1" strokeDasharray="0.8 2.6" opacity="0.7" />
        </svg>
        land feeder
      </span>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <circle cx="6" cy="6" r="5.2" fill="none" stroke="#fbbf24" strokeWidth="1.2" />
          <circle cx="6" cy="6" r="2" fill="#fbbf24" />
        </svg>
        port / customs checkpoint
      </span>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.4" aria-hidden>
          <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
        </svg>
        NASS warehouse
      </span>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e9c765" strokeWidth="2.4" aria-hidden>
          <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        </svg>
        supplier / delivery site
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        · routes are estimated corridors (waypoint geometry, no AIS track)
      </span>
    </div>
  );
}
