"use client";

import { useMemo, useState } from "react";
import { WORLD_COUNTRIES, WORLD_VIEWBOX } from "@/lib/world-map-paths";
import { WORLD_W, WORLD_H, buildArc, arcAt, projectPoint, type Arc } from "@/lib/geo";
import type { LiveStatus, TraceShip } from "@/lib/trace-types";
import { cn } from "@/lib/utils";

/* ── Status color system (map + fleet + dossier chips) ─────────────────── */
export const STATUS_COLOR: Record<LiveStatus, string> = {
  IN_TRANSIT: "#d4af37",
  AT_PORT: "#34d399",
  CUSTOMS_HOLD: "#fbbf24",
  DELAYED: "#fb7185",
  ARRIVED: "#34d399",
  BOOKED: "#a8a29e",
};

export const STATUS_LABEL: Record<LiveStatus, string> = {
  IN_TRANSIT: "In transit",
  AT_PORT: "At port",
  CUSTOMS_HOLD: "Customs hold",
  DELAYED: "Delayed",
  ARRIVED: "Arrived",
  BOOKED: "Booked",
};

const SHIP_GLYPH = "M 8 0 L 2.2 2.9 L -6.5 2.9 L -6.5 -2.9 L 2.2 -2.9 Z";

interface Plotted {
  ship: TraceShip;
  arc: Arc;
  p: number;
}

/* ── The live world map — every ship gliding at once ───────────────────── */
export function WorldMap({
  ships,
  progress,
  selectedRef,
  onPick,
  onBackgroundClick,
}: {
  ships: TraceShip[];
  progress: Map<string, number>;
  selectedRef: string | null;
  onPick: (ref: string) => void;
  onBackgroundClick?: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const arcs = useMemo<Plotted[]>(() => {
    return ships
      .filter((s) => s.from && s.to)
      .map((ship) => ({
        ship,
        arc: buildArc(ship.from!.lng, ship.from!.lat, ship.to!.lng, ship.to!.lat),
        p: progress.get(ship.ref) ?? ship.progress,
      }));
  }, [ships, progress]);

  const ports = useMemo(() => {
    const seen = new Map<string, { label: string; x: number; y: number }>();
    for (const s of ships) {
      for (const end of [s.from, s.to]) {
        if (!end) continue;
        const pt = projectPoint(end.lng, end.lat);
        const key = `${end.label}`;
        if (!seen.has(key)) seen.set(key, { label: end.label, x: pt.x, y: pt.y });
      }
    }
    return [...seen.values()];
  }, [ships]);

  const graticule = useMemo(() => {
    const v: number[] = [];
    for (let lng = -160; lng <= 160; lng += 20) v.push(projectPoint(lng, 0).x);
    const h: number[] = [];
    for (let lat = -40; lat <= 80; lat += 20) h.push(projectPoint(0, lat).y);
    return { v, h };
  }, []);

  return (
    <svg
      viewBox={`0 0 ${WORLD_VIEWBOX.w} ${WORLD_VIEWBOX.h}`}
      className="h-full w-full select-none"
      role="group"
      aria-label="Live world map — every ship in the fleet at the same time"
    >
      <defs>
        <radialGradient id="mapOcean" cx="50%" cy="18%" r="90%">
          <stop offset="0%" stopColor="var(--map-ocean-b)" />
          <stop offset="55%" stopColor="var(--map-ocean-a)" />
          <stop offset="100%" stopColor="var(--map-ocean-b)" />
        </radialGradient>
      </defs>

      {/* ocean + graticule + click-to-dismiss layer */}
      <rect
        x={0}
        y={0}
        width={WORLD_W}
        height={WORLD_H}
        fill="url(#mapOcean)"
        onClick={onBackgroundClick}
        data-testid="map-ocean"
      />
      {graticule.v.map((x) => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={WORLD_H} stroke="var(--map-graticule)" strokeWidth={0.7} />
      ))}
      {graticule.h.map((y) => (
        <line key={`h${y}`} x1={0} y1={y} x2={WORLD_W} y2={y} stroke="var(--map-graticule)" strokeWidth={0.7} />
      ))}

      {/* land */}
      <g>
        {WORLD_COUNTRIES.map((c) => (
          <path key={`${c.id}-${c.name}`} d={c.d} fill="var(--map-land)" stroke="var(--map-land-stroke)" strokeWidth={0.5} />
        ))}
      </g>

      {/* routes: remaining = dashed/dim · traveled = solid status gold */}
      <g fill="none" strokeLinecap="round">
        {arcs.map(({ ship, arc, p }) => {
          const active = ship.ref === selectedRef;
          const color = STATUS_COLOR[ship.liveStatus];
          return (
            <g key={ship.ref} opacity={active ? 1 : 0.62}>
              {/* base (remaining) */}
              <path d={arc.d} pathLength={1} stroke="var(--map-land-stroke)" strokeWidth={1.4} strokeDasharray="0.012 0.011" />
              {/* glow underlay for traveled */}
              <path
                d={arc.d}
                pathLength={1}
                stroke={color}
                strokeOpacity={active ? 0.3 : 0.16}
                strokeWidth={5}
                strokeDasharray={`${Math.max(0.001, p)} 1`}
              />
              {/* traveled */}
              <path
                d={arc.d}
                pathLength={1}
                stroke={color}
                strokeWidth={active ? 2.4 : 1.8}
                strokeDasharray={`${Math.max(0.001, p)} 1`}
              />
            </g>
          );
        })}
      </g>

      {/* ports with gentle SMIL pulse */}
      <g>
        {ports.map((pt) => (
          <g key={pt.label}>
            <circle cx={pt.x} cy={pt.y} r={3.2} fill="#d4af37" stroke="var(--map-land)" strokeWidth={1} />
            <circle cx={pt.x} cy={pt.y} r={3.2} fill="none" stroke="#d4af37" strokeWidth={1} pointerEvents="none">
              <animate attributeName="r" values="3.5;11" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0" dur="2.6s" repeatCount="indefinite" />
            </circle>
            <text
              x={pt.x}
              y={pt.y - 8}
              textAnchor="middle"
              fontSize={9.5}
              fill="var(--foreground)"
              opacity={0.75}
              style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 3 }}
            >
              {pt.label}
            </text>
          </g>
        ))}
      </g>

      {/* ships — continuously gliding markers */}
      <g>
        {arcs.map(({ ship, arc, p }) => {
          const pos = arcAt(arc, Math.min(1, Math.max(0, p)));
          const active = ship.ref === selectedRef || hovered === ship.ref;
          const color = STATUS_COLOR[ship.liveStatus];
          return (
            <g
              key={ship.ref}
              style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, willChange: "transform" }}
              data-testid={`ship-${ship.ref}`}
            >
              {/* rotated ship layer */}
              <g style={{ transform: `rotate(${pos.angle}deg)` }}>
                {active && <path d={SHIP_GLYPH} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={5} strokeLinejoin="round" />}
                <path d={SHIP_GLYPH} fill={color} stroke="var(--background)" strokeWidth={1.1} strokeLinejoin="round" />
              </g>
              {/* halo */}
              <circle r={active ? 11 : 8.5} fill="none" stroke={color} strokeOpacity={active ? 0.55 : 0.28} strokeWidth={1.2} pointerEvents="none" />
              <circle r={active ? 16 : 12} fill={color} opacity={active ? 0.14 : 0.07} pointerEvents="none" />
              {/* selected/hovered marker pulse */}
              {active && (
                <circle r={11} fill="none" stroke={color} strokeWidth={1.4} pointerEvents="none">
                  <animate attributeName="r" values="9;18" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              {/* ref chip */}
              {(active || ship.liveStatus === "CUSTOMS_HOLD") && (
                <g transform="translate(0, -20)" pointerEvents="none">
                  <rect
                    x={-(ship.ref.length * 3.4 + 9)}
                    y={-9}
                    width={ship.ref.length * 6.8 + 18}
                    height={15}
                    rx={4}
                    fill="var(--background)"
                    stroke={color}
                    strokeOpacity={0.6}
                  />
                  <text textAnchor="middle" y={2} fontSize={9.5} fontFamily="var(--font-geist-mono), monospace" fill={color} fontWeight={700}>
                    {ship.ref}
                  </text>
                </g>
              )}
              {/* hit area */}
              <circle
                r={14}
                fill="transparent"
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Open dossier for ${ship.ref} — ${ship.vesselName ?? ship.carrier ?? "vessel"} (${STATUS_LABEL[ship.liveStatus]})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPick(ship.ref);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPick(ship.ref);
                  }
                }}
                onMouseEnter={() => setHovered(ship.ref)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${ship.ref} · ${ship.vesselName ?? ship.carrier ?? "vessel"} · ${STATUS_LABEL[ship.liveStatus]} · ${(p * 100).toFixed(0)}%`}</title>
              </circle>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/* ── Legend chip row (status colors) ───────────────────────────────────── */
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
    </div>
  );
}
