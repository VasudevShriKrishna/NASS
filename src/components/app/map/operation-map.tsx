"use client";

/* ═══════════════════════════════════════════════════════════════════════
 * OPERATION MAP — Google-Maps-style interactive live operations map.
 * Engine: MapLibre GL JS (bundled world GeoJSON, zero external tiles)
 *   • drag-pan with inertia · wheel/pinch/double-click/buttons/keys zoom
 *   • eased flyTo camera · world-clamped panning · 60fps GPU rendering
 * Hero layer: shipment & freight movement — vessels gliding along true
 *   great-circle routes (interpolated between hourly snapshots), status
 *   halos, wake trails, flowing traveled arcs, spiderfy for overlaps.
 * Context layer: supplier sites → feeder → ports → ocean arc → dest
 *   port → feeder → NASS warehouse.
 * Labels: DOM labels driven by a greedy collision engine (priority +
 *   zoom-gated reveal + leader lines) — two labels never overlap.
 * All data comes from the /api/live-trace snapshot only. No mocks.
 * ═══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { config as maplibreConfig, GeoJSONSource, LngLatBounds, Map as MlMap, Marker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Crosshair, Globe2, Minus, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_COLOR } from "@/components/app/world-map";
import { fmtCountdown } from "@/components/app/live-clock";
import { lookupPort } from "@/lib/geo";
import { GcRoute, liveProgressAt, valueNorms } from "@/lib/gc-route";
import { SUPPLIER_SITES, WAREHOUSE_SITES } from "@/lib/geo-sites";
import type { TraceShip } from "@/lib/trace-types";
import { cn } from "@/lib/utils";
import styles from "./operation-map.module.css";

/* self-hosted worker (works under any bundler — see public/maplibre/) */
maplibreConfig.WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

type LngLat = [number, number];
type SitePick = { type: "supplier" | "warehouse"; code: string };

interface LineFeature {
  type: "Feature";
  properties: Record<string, number | string>;
  geometry: { type: "LineString"; coordinates: LngLat[] };
}
type FC = { type: "FeatureCollection"; features: LineFeature[] };
type WorldBundle = {
  fill?: { geometry: { coordinates: number[][][] | number[][][][] } & object; type: string };
  coast?: { geometry: object };
  borders?: { geometry: object };
  graticule?: { geometry: object };
};

const EMPTY_FC: FC = { type: "FeatureCollection", features: [] };
const WORLD_BOUNDS: [LngLat, LngLat] = [
  [-171, -57],
  [179, 73],
];

/* marching-ants dash sequence (MapLibre "animate a line" pattern) */
const DASH_SEQ: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];

const SHIP_SVG = `<svg class="vessel-glyph" width="21" height="13" viewBox="-11.5 -6.5 23 13" aria-hidden="true"><path d="M 8 0 L 2.2 2.9 L -6.5 2.9 L -6.5 -2.9 L 2.2 -2.9 Z" fill="currentColor" stroke="oklch(0.1 0.01 80 / 90%)" stroke-width="1" stroke-linejoin="round"/></svg>`;
const FACTORY_SVG = `<svg class="siteSvg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`;
const WAREHOUSE_SVG = `<svg class="siteSvg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/></svg>`;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
const fmtMoney = (v: number, ccy: string) => `${ccy} ${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const elFromHTML = (html: string): HTMLElement => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

interface VesselEntry {
  ship: TraceShip;
  arc: GcRoute;
  marker: Marker;
  el: HTMLButtonElement;
  rotEl: HTMLElement;
  chipEl: HTMLElement;
  pos: { lng: number; lat: number; angle: number };
  p: number;
  px: number;
  py: number;
  clusterSize: number;
}
interface DotEntry {
  marker: Marker;
  el: HTMLElement;
  px: number;
  py: number;
}
interface LabelEntry {
  id: string;
  kind: "vessel" | "port" | "supplier" | "warehouse";
  text: string;
  priority: number;
  baseMinZoom: number;
  color: string | null;
  anchor: () => LngLat;
  el: HTMLDivElement;
  leaderEl: HTMLDivElement;
}

function baseStyle(world: FC): StyleSpecification {
  return {
    version: 8,
    sources: { world: { type: "geojson", data: world } },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#080706" } },
      {
        id: "grat",
        type: "line",
        source: "world",
        filter: ["==", ["get", "kind"], "grat"],
        paint: { "line-color": "#d4af37", "line-opacity": 0.055, "line-width": 0.6 },
      },
      {
        id: "land",
        type: "fill",
        source: "world",
        filter: ["==", ["get", "kind"], "fill"],
        paint: { "fill-color": "#1a1610", "fill-opacity": 1 },
      },
      {
        id: "borders",
        type: "line",
        source: "world",
        filter: ["==", ["get", "kind"], "borders"],
        paint: { "line-color": "#d4af37", "line-opacity": 0.09, "line-width": 0.5 },
      },
      {
        id: "coast",
        type: "line",
        source: "world",
        filter: ["==", ["get", "kind"], "coast"],
        paint: { "line-color": "#d4af37", "line-opacity": 0.28, "line-width": 0.9 },
      },
    ],
  };
}

const line = (coordinates: LngLat[], properties: Record<string, number | string>): LineFeature => ({
  type: "Feature",
  properties,
  geometry: { type: "LineString", coordinates },
});

export function OperationMap({
  ships,
  simBase,
  factor,
  selectedRef,
  onPick,
  onBackgroundClick,
  onSitePick,
}: {
  ships: TraceShip[];
  simBase: { server: number; wall: number } | null;
  factor: number;
  selectedRef: string | null;
  onPick: (ref: string) => void;
  onBackgroundClick?: () => void;
  onSitePick: (pick: SitePick) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [noWebGL, setNoWebGL] = useState(false);

  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  const disposedRef = useRef(false);
  const rafRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const shipsRef = useRef<TraceShip[]>(ships);
  const simBaseRef = useRef(simBase);
  const factorRef = useRef(factor);
  const selectedRefRef = useRef<string | null>(selectedRef);
  const normRef = useRef<Map<string, number>>(new Map());
  const reducedRef = useRef(false);
  const cbRef = useRef({ onPick, onBackgroundClick, onSitePick });
  const dashPhaseRef = useRef(0);

  const vesselsRef = useRef<Map<string, VesselEntry>>(new Map());
  const arcsRef = useRef<Map<string, GcRoute>>(new Map());
  const portsRef = useRef<Map<string, DotEntry>>(new Map());
  const sitesRef = useRef<Map<string, { kind: "supplier" | "warehouse"; code: string; entry: DotEntry }>>(new Map());
  const labelsRef = useRef<Map<string, LabelEntry>>(new Map());
  const tipRef = useRef<{ ref: string | null; lastBuild: number }>({ ref: null, lastBuild: 0 });

  /* mirror latest props into refs (after commit, before any effect work) */
  useEffect(() => {
    shipsRef.current = ships;
    simBaseRef.current = simBase;
    factorRef.current = factor;
    selectedRefRef.current = selectedRef;
    cbRef.current = { onPick, onBackgroundClick, onSitePick };
    normRef.current = valueNorms(ships);
  });
  const computeSimNow = () => {
    const b = simBaseRef.current;
    return b ? b.server + (Date.now() - b.wall) * factorRef.current : Date.now();
  };

  /* ── route + feeder GeoJSON refresh ────────────────────────────────── */
  const refreshRoutes = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const simNow = computeSimNow();
    const sel = selectedRefRef.current;

    const traveled: LineFeature[] = [];
    const remaining: LineFeature[] = [];
    for (const [ref, v] of vesselsRef.current) {
      const p = reducedRef.current ? v.ship.progress : liveProgressAt(v.ship, simNow);
      v.p = p;
      const c = STATUS_COLOR[v.ship.liveStatus];
      const w = (normRef.current.get(ref) ?? 0.6) * 1.5 + 0.75;
      const o = !sel ? 0.9 : ref === sel ? 1 : 0.12;
      const or = !sel ? 0.3 : ref === sel ? 0.45 : 0.05;
      const of = !sel ? 0.5 : ref === sel ? 0.8 : 0.06;
      if (p > 0.004) traveled.push(line(v.arc.traveledCoords(p), { ref, color: c, o, w, of }));
      if (p < 0.996) remaining.push(line(v.arc.remainingCoords(p), { ref, color: c, w: w * 0.9, or }));
    }
    const tSrc = map.getSource("src-traveled") as GeoJSONSource | undefined;
    const rSrc = map.getSource("src-remaining") as GeoJSONSource | undefined;
    tSrc?.setData({ type: "FeatureCollection", features: traveled });
    rSrc?.setData({ type: "FeatureCollection", features: remaining });

    const feeders: LineFeature[] = [];
    for (const ship of shipsRef.current) {
      const oFor = (mine: boolean) => (!sel ? 0.5 : mine ? 0.9 : 0.06);
      const sSite = ship.supplier ? SUPPLIER_SITES[ship.supplier.code] : null;
      if (sSite && ship.from) {
        feeders.push(
          line(
            [
              [sSite.lng, sSite.lat],
              [ship.from.lng, ship.from.lat],
            ],
            { color: "#d4af37", o: oFor(ship.ref === sel) },
          ),
        );
      }
      const wSite = ship.destinationWarehouse ? WAREHOUSE_SITES[ship.destinationWarehouse.code] : null;
      if (wSite && ship.to) {
        feeders.push(
          line(
            [
              [ship.to.lng, ship.to.lat],
              [wSite.lng, wSite.lat],
            ],
            { color: "#34d399", o: oFor(ship.ref === sel) },
          ),
        );
      }
    }
    const fSrc = map.getSource("src-feeders") as GeoJSONSource | undefined;
    fSrc?.setData({ type: "FeatureCollection", features: feeders });
  };

  /* ── labels: greedy collision engine ───────────────────────────────── */
  const updateLabels = () => {
    const map = mapRef.current;
    const layer = labelLayerRef.current;
    if (!map || !layer) return;
    const zoom = map.getZoom();
    const w = layer.clientWidth || map.getContainer().clientWidth;
    const h = layer.clientHeight || map.getContainer().clientHeight;
    const sel = selectedRefRef.current;

    const rects: { x: number; y: number; w: number; h: number; id: string }[] = [];
    const push = (cx: number, cy: number, rw: number, rh: number, id: string) =>
      rects.push({ x: cx - rw / 2, y: cy - rh / 2, w: rw, h: rh, id });
    for (const v of vesselsRef.current.values()) push(v.px, v.py, 26, 26, `ship:${v.ship.ref}`);
    for (const [key, p] of portsRef.current) push(p.px, p.py, 13, 13, `port:${key}`);
    for (const [id, s] of sitesRef.current) push(s.entry.px, s.entry.py, 24, 24, id);

    const items = [...labelsRef.current.values()].sort((a, b) => a.priority - b.priority);
    for (const it of items) {
      let minZoom = it.baseMinZoom;
      if (sel && it.id !== `ship:${sel}`) minZoom += 0.9;
      const [lng, lat] = it.anchor();
      const proj = map.project([lng, lat]);
      /* clustered vessels: anchor to the spiderfy-offset screen position */
      let pt: { x: number; y: number } = { x: proj.x, y: proj.y };
      if (it.kind === "vessel") {
        const v = vesselsRef.current.get(it.id.slice(5));
        if (v && (v.px || v.py)) pt = { x: v.px, y: v.py };
      }
      const off = pt.x < 34 || pt.y < 26 || pt.x > w - 34 || pt.y > h - 58;
      if (!Number.isFinite(pt.x) || off || zoom < minZoom) {
        it.el.classList.remove(styles.labelVisible);
        it.leaderEl.style.opacity = "0";
        continue;
      }
      const charW = it.kind === "vessel" ? 6.5 : 5.7;
      const bw = it.text.length * charW + 10;
      const bh = 14;
      const cands = [
        { x: pt.x - bw / 2, y: pt.y - bh - 12, side: 0 },
        { x: pt.x + 13, y: pt.y - bh / 2, side: 1 },
        { x: pt.x - bw / 2, y: pt.y + 11, side: 2 },
        { x: pt.x - bw - 13, y: pt.y - bh / 2, side: 3 },
      ];
      let placed: { x: number; y: number; box: { x: number; y: number; w: number; h: number } } | null = null;
      for (const c of cands) {
        const box = { x: c.x - 3, y: c.y - 2, w: bw + 6, h: bh + 4 };
        if (!rects.some((r) => r.id !== it.id && r.x < box.x + box.w && r.x + r.w > box.x && r.y < box.y + box.h && r.y + r.h > box.y)) {
          placed = { x: c.x, y: c.y, box };
          break;
        }
      }
      if (!placed) {
        it.el.classList.remove(styles.labelVisible);
        it.leaderEl.style.opacity = "0";
        continue;
      }
      rects.push({ ...placed.box, id: it.id });
      it.el.style.transform = `translate3d(${placed.x.toFixed(1)}px, ${placed.y.toFixed(1)}px, 0)`;
      it.el.classList.add(styles.labelVisible);
      /* leader line from anchor toward the label when displaced */
      const ex = placed.x + bw / 2;
      const ey = placed.y + bh / 2;
      const dx = ex - pt.x;
      const dy = ey - pt.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 15) {
        it.leaderEl.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) rotate(${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)}deg)`;
        it.leaderEl.style.width = `${Math.min(dist - 6, 30).toFixed(0)}px`;
        it.leaderEl.style.opacity = "0.8";
      } else {
        it.leaderEl.style.opacity = "0";
      }
    }
  };

  /* ── vessels: glide + spiderfy + cluster chips ─────────────────────── */
  const updateVessels = (simNow: number) => {
    const map = mapRef.current;
    if (!map) return;
    const entries = [...vesselsRef.current.values()];
    const pts: { x: number; y: number }[] = [];
    for (const v of entries) {
      v.p = reducedRef.current ? v.ship.progress : liveProgressAt(v.ship, simNow);
      v.pos = v.arc.pointAt(v.p);
      v.marker.setLngLat([v.pos.lng, v.pos.lat]);
      const pt = map.project([v.pos.lng, v.pos.lat]);
      pts.push(pt);
      v.rotEl.style.transform = `rotate(${v.pos.angle.toFixed(1)}deg)`;
    }
    /* spiderfy overlapping vessels (same corridor at low zoom) */
    const parent = entries.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < 26) parent[find(i)] = find(j);
      }
    }
    const groups = new Map<number, number[]>();
    entries.forEach((_, i) => {
      const root = find(i);
      const g = groups.get(root);
      if (g) g.push(i);
      else groups.set(root, [i]);
    });
    for (const g of groups.values()) {
      const n = g.length;
      if (n < 2) {
        const v = entries[g[0]];
        v.marker.setOffset([0, 0]);
        v.clusterSize = 1;
        v.px = pts[g[0]].x;
        v.py = pts[g[0]].y;
        v.el.classList.remove(styles.clustered);
        continue;
      }
      const cx = g.reduce((s, i) => s + pts[i].x, 0) / n;
      const cy = g.reduce((s, i) => s + pts[i].y, 0) / n;
      const radius = 15 + n * 3.2;
      const ordered = [...g].sort(
        (a, b) => Math.atan2(pts[a].y - cy, pts[a].x - cx) - Math.atan2(pts[b].y - cy, pts[b].x - cx),
      );
      ordered.forEach((idx, k) => {
        const a = (2 * Math.PI * k) / n - Math.PI / 2 + Math.atan2(pts[ordered[0]].y - cy, pts[ordered[0]].x - cx);
        const tx = cx + radius * Math.cos(a);
        const ty = cy + radius * Math.sin(a);
        const v = entries[idx];
        v.marker.setOffset([tx - pts[idx].x, ty - pts[idx].y]);
        v.px = tx;
        v.py = ty;
        v.clusterSize = n;
        v.el.classList.add(styles.clustered);
        v.chipEl.textContent = `×${n}`;
      });
    }
  };

  /* ── tooltip ───────────────────────────────────────────────────────── */
  const tipHTML = (ship: TraceShip, p: number) => {
    const c = STATUS_COLOR[ship.liveStatus];
    const eta = ship.eta ? fmtCountdown(+new Date(ship.eta) - Date.now()) : "no carrier ETA";
    return `
      <div class="${styles.tipRef}">
        <span style="display:inline-block;width:7px;height:7px;border-radius:999px;background:${c};box-shadow:0 0 6px ${c}"></span>
        <span style="color:${c}">${esc(ship.ref)}</span>
        <span style="color:oklch(0.6 0.02 90);font-weight:600">${esc(ship.vesselName ?? ship.carrier ?? "vessel unlinked")}</span>
      </div>
      <div class="${styles.tipRoute}">${esc(ship.from?.label ?? ship.originPort)} → ${esc(ship.to?.label ?? ship.destPort)}</div>
      <div class="${styles.tipGrid}">
        <span class="${styles.tipK}">Carrier</span><span class="${styles.tipV}">${esc(ship.carrier ?? "—")}</span>
        <span class="${styles.tipK}">Progress</span><span class="${styles.tipV}">${(p * 100).toFixed(1)}%</span>
        <span class="${styles.tipK}">Speed</span><span class="${styles.tipV}">${ship.speedKn ? `≈ ${ship.speedKn} kn` : "—"}</span>
        <span class="${styles.tipK}">ETA</span><span class="${styles.tipV}">${eta}</span>
        <span class="${styles.tipK}">Cargo value</span><span class="${styles.tipV}" style="color:#e9c765">${fmtMoney(ship.importValue, ship.currency)}</span>
      </div>
      <div class="${styles.tipBar}"><div class="${styles.tipBarFill}" style="width:${(p * 100).toFixed(1)}%;color:${c}"></div></div>`;
  };

  const updateTooltip = () => {
    const tip = tooltipRef.current;
    const map = mapRef.current;
    const layer = labelLayerRef.current;
    if (!tip || !map || !layer) return;
    const ref = tipRef.current.ref;
    if (!ref) {
      tip.classList.remove(styles.tooltipVisible);
      return;
    }
    const v = vesselsRef.current.get(ref);
    if (!v) {
      tipRef.current.ref = null;
      tip.classList.remove(styles.tooltipVisible);
      return;
    }
    const now = Date.now();
    if (now - tipRef.current.lastBuild > 500) {
      tipRef.current.lastBuild = now;
      tip.innerHTML = tipHTML(v.ship, v.p);
    }
    const w = layer.clientWidth;
    const px = Math.min(Math.max(v.px, 122), Math.max(122, w - 122));
    tip.style.transform = `translate3d(${px.toFixed(0)}px, ${(v.py - 30).toFixed(0)}px, 0) translate(-50%, -100%)`;
    tip.classList.add(styles.tooltipVisible);
  };

  /* ── rAF loop ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (!mapRef.current || !readyRef.current) return;
      updateVessels(computeSimNow());
      const map = mapRef.current;
      for (const p of portsRef.current.values()) {
        const ll = p.marker.getLngLat();
        const pt = map.project([ll.lng, ll.lat]);
        p.px = pt.x;
        p.py = pt.y;
      }
      for (const s of sitesRef.current.values()) {
        const ll = s.entry.marker.getLngLat();
        const pt = map.project([ll.lng, ll.lat]);
        s.entry.px = pt.x;
        s.entry.py = pt.y;
      }
      updateLabels();
      updateTooltip();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── registry sync: markers, ports, sites, labels ──────────────────── */
  const syncAll = () => {
    const map = mapRef.current;
    const layer = labelLayerRef.current;
    if (!map || !layer || !readyRef.current) return;

    /* vessels (diff by ref so gliding markers survive hourly snapshots) */
    const next = shipsRef.current.filter((s) => s.from && s.to);
    for (const ship of next) {
      let v = vesselsRef.current.get(ship.ref);
      const old = arcsRef.current.get(ship.ref);
      if (!v || !old) {
        const arc = new GcRoute(ship.from!.lng, ship.from!.lat, ship.to!.lng, ship.to!.lat);
        arcsRef.current.set(ship.ref, arc);
        const c = STATUS_COLOR[ship.liveStatus];
        const el = elFromHTML(`
          <button type="button" class="${styles.vessel}" style="color:${c}"
            aria-label="Open dossier for ${esc(ship.ref)} — ${esc(ship.vesselName ?? ship.carrier ?? "vessel")} (${ship.liveStatus})"
            data-ref="${esc(ship.ref)}">
            <span class="${styles.vesselHalo}"></span>
            <span class="${styles.vesselRot}">
              <span class="${styles.vesselWake}"></span>
              ${SHIP_SVG}
            </span>
            <span class="${styles.clusterChip}"></span>
          </button>`) as HTMLButtonElement;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const zoom = mapRef.current?.getZoom() ?? 0;
          const entry = vesselsRef.current.get(el.dataset.ref ?? "");
          if (!entry) return;
          if (entry.clusterSize >= 2 && zoom < 4.6) {
            mapRef.current?.flyTo({
              center: [entry.pos.lng, entry.pos.lat],
              zoom: Math.min(7, zoom + 2.2),
              duration: reducedRef.current ? 0 : 750,
              essential: true,
            });
            return;
          }
          cbRef.current.onPick?.(entry.ship.ref);
        });
        el.addEventListener("mouseenter", () => (tipRef.current.ref = ship.ref));
        el.addEventListener("mouseleave", () => {
          if (tipRef.current.ref === ship.ref) tipRef.current.ref = null;
        });
        el.addEventListener("focus", () => (tipRef.current.ref = ship.ref));
        el.addEventListener("blur", () => {
          if (tipRef.current.ref === ship.ref) tipRef.current.ref = null;
        });
        const marker = new Marker({ element: el, anchor: "center" })
          .setLngLat([ship.from!.lng, ship.from!.lat])
          .addTo(map);
        v = {
          ship,
          arc,
          marker,
          el,
          rotEl: el.querySelector(`.${styles.vesselRot}`) as HTMLElement,
          chipEl: el.querySelector(`.${styles.clusterChip}`) as HTMLElement,
          pos: { lng: ship.from!.lng, lat: ship.from!.lat, angle: 0 },
          p: ship.progress,
          px: 0,
          py: 0,
          clusterSize: 1,
        };
        vesselsRef.current.set(ship.ref, v);
      } else {
        /* status may have flipped on the hourly snapshot */
        v.ship = ship;
        v.el.style.color = STATUS_COLOR[ship.liveStatus];
      }
    }
    for (const [ref, v] of vesselsRef.current) {
      if (!next.some((s) => s.ref === ref)) {
        v.marker.remove();
        vesselsRef.current.delete(ref);
        arcsRef.current.delete(ref);
      }
    }

    /* ports (from real route endpoints, registry-cleaned labels) */
    for (const p of portsRef.current.values()) p.marker.remove();
    portsRef.current.clear();
    interface PortAcc {
      label: string;
      lng: number;
      lat: number;
      count: number;
      hold: boolean;
    }
    const portAcc = new Map<string, PortAcc>();
    for (const s of shipsRef.current) {
      for (const end of [s.from, s.to]) {
        if (!end) continue;
        const reg = lookupPort(end.label);
        const label = reg?.label ?? end.label.split(",")[0].trim();
        const key = label.toUpperCase();
        const acc = portAcc.get(key) ?? { label, lng: end.lng, lat: end.lat, count: 0, hold: false };
        acc.count += 1;
        acc.hold = acc.hold || s.liveStatus === "CUSTOMS_HOLD";
        portAcc.set(key, acc);
      }
    }
    for (const [key, p] of portAcc) {
      const el = elFromHTML(`<div class="${cn(styles.port, p.hold && styles.portHold)}" aria-hidden="true"><i class="${styles.portRing}"></i><i class="${styles.portDot}"></i></div>`);
      const marker = new Marker({ element: el, anchor: "center" })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      portsRef.current.set(key, { marker, el, px: 0, py: 0 });
    }

    /* supplier + warehouse sites */
    for (const s of sitesRef.current.values()) s.entry.marker.remove();
    sitesRef.current.clear();
    const supCodes = new Set(shipsRef.current.map((s) => s.supplier?.code).filter(Boolean) as string[]);
    for (const code of supCodes) {
      const site = SUPPLIER_SITES[code];
      if (!site || sitesRef.current.has(`sup:${code}`)) continue;
      const name = shipsRef.current.find((s) => s.supplier?.code === code)?.supplier?.name ?? code;
      const el = elFromHTML(`
        <button type="button" class="${cn(styles.site, styles.supplier)}" title="${esc(name)} — ${esc(site.city ?? "")}, ${esc(site.country)}"
          aria-label="Open supplier panel for ${esc(code)} — ${esc(name)}" data-code="${esc(code)}">
          ${FACTORY_SVG}
        </button>`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        cbRef.current.onSitePick?.({ type: "supplier", code });
      });
      const marker = new Marker({ element: el, anchor: "center" }).setLngLat([site.lng, site.lat]).addTo(map);
      sitesRef.current.set(`sup:${code}`, { kind: "supplier", code, entry: { marker, el, px: 0, py: 0 } });
    }
    const whCodes = new Set(shipsRef.current.map((s) => s.destinationWarehouse?.code).filter(Boolean) as string[]);
    for (const code of whCodes) {
      const site = WAREHOUSE_SITES[code];
      if (!site || sitesRef.current.has(`wh:${code}`)) continue;
      const name = shipsRef.current.find((s) => s.destinationWarehouse?.code === code)?.destinationWarehouse?.name ?? code;
      const el = elFromHTML(`
        <button type="button" class="${cn(styles.site, styles.warehouse)}" title="${esc(name)} — ${esc(site.city ?? "")}"
          aria-label="Open warehouse panel for ${esc(code)} — ${esc(name)}" data-code="${esc(code)}">
          ${WAREHOUSE_SVG}
        </button>`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        cbRef.current.onSitePick?.({ type: "warehouse", code });
      });
      const marker = new Marker({ element: el, anchor: "center" }).setLngLat([site.lng, site.lat]).addTo(map);
      sitesRef.current.set(`wh:${code}`, { kind: "warehouse", code, entry: { marker, el, px: 0, py: 0 } });
    }

    /* labels — rebuilt each sync; vessel anchors are live */
    labelsRef.current.clear();
    layer.textContent = "";
    const addLabel = (l: Omit<LabelEntry, "el" | "leaderEl">) => {
      const el = elFromHTML(`<div class="${cn(styles.label, l.kind === "port" && (l.priority <= 3.5 ? styles.labelPort : styles.labelPortMinor), l.kind === "vessel" && styles.labelVessel, l.kind !== "port" && styles.labelSite)}"></div>`) as HTMLDivElement;
      el.textContent = l.text;
      if (l.color) el.style.color = l.color;
      const leaderEl = elFromHTML(`<div class="${styles.labelLeader}"></div>`) as HTMLDivElement;
      leaderEl.style.opacity = "0";
      layer.append(leaderEl, el);
      labelsRef.current.set(l.id, { ...l, el, leaderEl });
    };
    for (const p of portAcc) {
      const [key, acc] = p;
      const major = acc.count >= 2;
      addLabel({
        id: `port:${key}`,
        kind: "port",
        text: acc.label,
        priority: major ? 3 : acc.hold ? 3.4 : 4,
        baseMinZoom: major ? 0.9 : acc.hold ? 1.2 : 2.15,
        color: acc.hold ? "#fbbf24" : null,
        anchor: () => {
          const dot = portsRef.current.get(key);
          const ll = dot?.marker.getLngLat();
          return ll ? [ll.lng, ll.lat] : [acc.lng, acc.lat];
        },
      });
    }
    for (const [id, s] of sitesRef.current) {
      const site = s.kind === "supplier" ? SUPPLIER_SITES[s.code] : WAREHOUSE_SITES[s.code];
      if (!site) continue;
      addLabel({
        id,
        kind: s.kind,
        text: s.kind === "supplier" ? `${s.code} · ${site.label}` : s.code,
        priority: s.kind === "warehouse" ? 5 : 6,
        baseMinZoom: s.kind === "warehouse" ? 1.9 : 2.35,
        color: s.kind === "supplier" ? "#e9c765" : "#34d399",
        anchor: () => {
          const ll = s.entry.marker.getLngLat();
          return ll ? [ll.lng, ll.lat] : [site.lng, site.lat];
        },
      });
    }
    for (const [ref, v] of vesselsRef.current) {
      const hold = v.ship.liveStatus === "CUSTOMS_HOLD";
      const sel = ref === selectedRefRef.current;
      addLabel({
        id: `ship:${ref}`,
        kind: "vessel",
        text: ref,
        priority: sel ? 0 : hold ? 1 : 2,
        baseMinZoom: sel || hold ? -1 : 1.75,
        color: STATUS_COLOR[v.ship.liveStatus],
        anchor: () => {
          const e = vesselsRef.current.get(ref);
          return e ? [e.pos.lng, e.pos.lat] : [0, 0];
        },
      });
    }

    applySelectionClasses();
    refreshRoutes();
  };

  /* ── selection visuals + camera ────────────────────────────────────── */
  const applySelectionClasses = () => {
    const sel = selectedRefRef.current;
    for (const [ref, v] of vesselsRef.current) {
      v.el.classList.toggle(styles.vesselSelected, ref === sel);
      v.el.classList.toggle(styles.vesselDim, !!sel && ref !== sel);
    }
    for (const s of sitesRef.current.values()) s.entry.el.classList.toggle(styles.siteDim, !!sel);
  };

  const flyToSelected = () => {
    const map = mapRef.current;
    const sel = selectedRefRef.current;
    if (!map || !sel) return;
    const v = vesselsRef.current.get(sel);
    if (!v) return;
    const isMobile = window.innerWidth < 640;
    const zoom = Math.min(6.5, Math.max(map.getZoom(), 3.4));
    /* shift the target center east so the vessel sits left of the dossier drawer */
    const shiftPx = isMobile ? 0 : 240;
    const lngPerPx = 360 / (512 * 2 ** zoom);
    map.flyTo({
      center: [v.pos.lng + shiftPx * lngPerPx, v.pos.lat],
      zoom,
      duration: reducedRef.current ? 0 : 950,
      essential: true,
    });
  };

  const fitWorld = (duration = 950) => {
    const map = mapRef.current;
    if (!map) return;
    const cam = map.cameraForBounds(WORLD_BOUNDS, { padding: 24 });
    if (!cam) return;
    map.flyTo({
      center: cam.center,
      zoom: Math.min(2.1, Math.max(cam.zoom ?? 1.55, 1.35)),
      duration: reducedRef.current ? 0 : duration,
      essential: true,
    });
  };

  const fitFleet = () => {
    const map = mapRef.current;
    if (!map || vesselsRef.current.size === 0) return;
    const bounds = new LngLatBounds();
    for (const v of vesselsRef.current.values()) {
      bounds.extend([v.pos.lng, v.pos.lat]);
      bounds.extend(v.arc.pts[0]);
      bounds.extend(v.arc.pts[v.arc.pts.length - 1]);
    }
    if (bounds.isEmpty()) return;
    const isDesktop = window.innerWidth >= 640;
    const cam = map.cameraForBounds(bounds, {
      padding: { top: 70, bottom: 150, left: 70, right: isDesktop ? (selectedRefRef.current ? 460 : 70) : 60 },
    });
    if (!cam) return;
    map.flyTo({
      center: cam.center,
      zoom: Math.min(4.4, Math.max(cam.zoom ?? 2.2, map.getMinZoom())),
      duration: reducedRef.current ? 0 : 950,
      essential: true,
    });
  };

  /* ── map init ──────────────────────────────────────────────────────── */
  useEffect(() => {
    disposedRef.current = false;
    let disposed = false;

    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = reducedMq.matches;
    const onMq = (e: MediaQueryListEvent) => (reducedRef.current = e.matches);
    reducedMq.addEventListener("change", onMq);

    const boot = async () => {
      /* WebGL probe — graceful fallback */
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      if (!gl) {
        setNoWebGL(true);
        return;
      }
      /* bundled world (no external tiles) */
      let world: FC = EMPTY_FC;
      try {
        const res = await fetch("/geo/world-land-110m.json");
        if (res.ok) {
          const j = (await res.json()) as WorldBundle;
          const feats: LineFeature[] = [];
          const geo = (kind: string, geometry: object | undefined) =>
            geometry ? feats.push({ type: "Feature", properties: { kind }, geometry: geometry as LineFeature["geometry"] }) : null;
          geo("fill", j.fill?.geometry);
          geo("coast", j.coast?.geometry);
          geo("borders", j.borders?.geometry);
          geo("grat", j.graticule?.geometry);
          world = { type: "FeatureCollection", features: feats };
        }
      } catch {
        /* ocean-only fallback */
      }
      if (disposed || !containerRef.current) return;

      const map = new MlMap({
        container: containerRef.current,
        style: baseStyle(world),
        center: [32, 25],
        zoom: 1.55,
        minZoom: 1.05,
        maxZoom: 12,
        /* NB: lng must stay within ±180 — beyond that MapLibre wraps the
         * antimeridian and its constrain logic corrupts the camera */
        maxBounds: [
          [-179.9, -84],
          [179.9, 84],
        ],
        attributionControl: false,
        renderWorldCopies: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        fadeDuration: 0,
      });
      mapRef.current = map;
      /* debug/test hook — read-only introspection for E2E verification */
      (window as unknown as Record<string, unknown>).__nassMap = map;

      map.on("click", () => cbRef.current.onBackgroundClick?.());
      map.on("error", (e) => console.warn("[operation-map]", e.error?.message ?? e));

      map.on("load", () => {
        if (disposed) return;
        /* route + feeder layers */
        map.addSource("src-traveled", { type: "geojson", data: EMPTY_FC });
        map.addSource("src-remaining", { type: "geojson", data: EMPTY_FC });
        map.addSource("src-feeders", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "arc-feeders",
          type: "line",
          source: "src-feeders",
          paint: {
            "line-color": ["get", "color"],
            "line-opacity": ["get", "o"],
            "line-width": 1,
            "line-dasharray": [0.4, 1.4],
          },
        });
        map.addLayer({
          id: "arc-glow",
          type: "line",
          source: "src-traveled",
          paint: {
            "line-color": ["get", "color"],
            "line-opacity": ["*", ["get", "o"], 0.22],
            "line-width": ["*", ["get", "w"], 3.6],
            "line-blur": 4,
          },
        });
        map.addLayer({
          id: "arc-remaining",
          type: "line",
          source: "src-remaining",
          paint: {
            "line-color": ["get", "color"],
            "line-opacity": ["get", "or"],
            "line-width": ["get", "w"],
            "line-dasharray": [1.2, 1.6],
          },
        });
        map.addLayer({
          id: "arc-traveled",
          type: "line",
          source: "src-traveled",
          paint: {
            "line-color": ["get", "color"],
            "line-opacity": ["get", "o"],
            "line-width": ["get", "w"],
          },
        });
        map.addLayer({
          id: "arc-flow",
          type: "line",
          source: "src-traveled",
          paint: {
            "line-color": "#fff3d6",
            "line-opacity": ["*", ["get", "of"], 0.75],
            "line-width": ["*", ["get", "w"], 0.5],
            "line-dasharray": DASH_SEQ[0],
          },
        });
        readyRef.current = true;
        syncAll();
        refreshRoutes();
        /* initial camera */
        if (selectedRefRef.current) flyToSelected();
        else fitWorld(0);
      });

      /* flowing dash animation */
      const dashTimer = window.setInterval(() => {
        if (!readyRef.current || reducedRef.current) return;
        dashPhaseRef.current = (dashPhaseRef.current + 1) % DASH_SEQ.length;
        mapRef.current?.setPaintProperty("arc-flow", "line-dasharray", DASH_SEQ[dashPhaseRef.current]);
      }, 90);
      /* route split follows progress */
      const routeTimer = window.setInterval(() => {
        if (readyRef.current && !reducedRef.current) refreshRoutes();
      }, 700);
      timersRef.current.push(dashTimer, routeTimer);
    };

    boot();
    return () => {
      disposed = true;
      disposedRef.current = true;
      reducedMq.removeEventListener("change", onMq);
      timersRef.current.forEach((t) => {
        clearInterval(t);
        clearTimeout(t);
      });
      timersRef.current = [];
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);


  useEffect(() => {
    syncAll();
    applySelectionClasses();
    if (readyRef.current) {
      refreshRoutes();
      if (selectedRefRef.current) flyToSelected();
    }
  }, [ships]);

  useEffect(() => {
    if (!readyRef.current) return;
    applySelectionClasses();
    refreshRoutes();
    if (selectedRefRef.current) flyToSelected();
  }, [selectedRef]);

  /* keyboard: arrows pan, +/- zoom (works even if canvas focus quirks) */
  const onWrapperKeyDown = (e: ReactKeyboardEvent) => {
    const map = mapRef.current;
    if (!map || e.defaultPrevented) return;
    const step = e.shiftKey ? 260 : 120;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (pan[e.key]) {
      e.preventDefault();
      map.panBy(pan[e.key], { duration: reducedRef.current ? 0 : 180 });
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      map.zoomIn();
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      map.zoomOut();
    }
  };

  if (noWebGL) {
    return (
      <div className={styles.fallback} role="alert">
        The interactive operation map needs WebGL, which this browser/device does not expose.
        Fleet status and dossiers remain available from the fleet rail below.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(styles.mapWrap, "h-full w-full")}
      onKeyDown={onWrapperKeyDown}
      role="group"
      aria-label="Interactive live operations map — drag to pan, scroll or pinch to zoom, click a vessel for its dossier"
      data-testid="operation-map"
    >
      {/* DOM label collision layer */}
      <div ref={labelLayerRef} className={styles.labelLayer} aria-hidden />

      {/* hover tooltip */}
      <div ref={tooltipRef} className={styles.tooltip} role="tooltip" />

      {/* hint */}
      <div className={styles.hint} aria-hidden>
        drag · scroll · pinch · dbl-click
      </div>

      {/* control stack — bottom-right, above fleet rail */}
      <TooltipProvider delayDuration={250}>
        <div className={styles.controls} role="group" aria-label="Map camera controls">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={styles.ctrlBtn}
                aria-label="Zoom in"
                onClick={(e) => {
                  e.stopPropagation();
                  mapRef.current?.zoomIn({ duration: reducedRef.current ? 0 : 260 });
                }}
              >
                <Plus className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom in</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={styles.ctrlBtn}
                aria-label="Zoom out"
                onClick={(e) => {
                  e.stopPropagation();
                  mapRef.current?.zoomOut({ duration: reducedRef.current ? 0 : 260 });
                }}
              >
                <Minus className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={styles.ctrlBtn}
                aria-label="Fit fleet — frame every active shipment"
                data-testid="fit-fleet"
                onClick={(e) => {
                  e.stopPropagation();
                  fitFleet();
                }}
              >
                <Crosshair className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Fit fleet</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={styles.ctrlBtn}
                aria-label="Reset view — zoom back to the world"
                onClick={(e) => {
                  e.stopPropagation();
                  fitWorld();
                }}
              >
                <Globe2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset view</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
