/* Great-circle route engine for the MapLibre operation map.
 * True spherical interpolation (slerp) between ports, sampled into a
 * polyline ships glide along; slicing into traveled / remaining parts;
 * and the shared sim-clock progress formula.                        */
import type { TraceShip } from "@/lib/trace-types";

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

/** Web-mercator y for angle math (visually correct heading on screen). */
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.min(84.9, Math.max(-84.9, lat)) * D2R) / 2));

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Shortest-path angle lerp in degrees (handles ±180 wrap). */
function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d === -180) d = 180;
  return a + d * t;
}

export interface GcPos {
  lng: number;
  lat: number;
  angle: number; // degrees, screen-space heading
}

export class GcRoute {
  readonly pts: [number, number][]; // [lng, lat] samples
  private angles: number[];
  private steps: number;

  constructor(fromLng: number, fromLat: number, toLng: number, toLat: number, steps = 84) {
    this.steps = steps;
    const toVec = (lng: number, lat: number): [number, number, number] => {
      const φ = lat * D2R;
      const λ = lng * D2R;
      return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
    };
    const A = toVec(fromLng, fromLat);
    const B = toVec(toLng, toLat);
    const dot = Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
    const ω = Math.acos(dot);
    const s = Math.sin(ω);
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let x: number, y: number, z: number;
      if (ω < 1e-6) {
        [x, y, z] = A;
      } else {
        const k1 = Math.sin((1 - t) * ω) / s;
        const k2 = Math.sin(t * ω) / s;
        x = A[0] * k1 + B[0] * k2;
        y = A[1] * k1 + B[1] * k2;
        z = A[2] * k1 + B[2] * k2;
      }
      const lat = Math.atan2(z, Math.hypot(x, y)) * R2D;
      const lng = Math.atan2(y, x) * R2D;
      pts.push([lng, lat]);
    }
    this.pts = pts;
    // screen-space heading per sample (mercator-correct)
    const angles = pts.map((p, i) => {
      if (i === pts.length - 1) return 0;
      const q = pts[i + 1];
      return Math.atan2(mercY(q[1]) - mercY(p[1]), q[0] - p[0]) * R2D;
    });
    if (angles.length > 1) angles[angles.length - 1] = angles[angles.length - 2];
    this.angles = angles;
  }

  pointAt(p: number): GcPos {
    const t = clamp01(p) * this.steps;
    const i = Math.min(this.steps - 1, Math.floor(t));
    const f = t - i;
    const a = this.pts[i];
    const b = this.pts[i + 1];
    return {
      lng: a[0] + (b[0] - a[0]) * f,
      lat: a[1] + (b[1] - a[1]) * f,
      angle: lerpAngle(this.angles[i], this.angles[i + 1], f),
    };
  }

  traveledCoords(p: number): [number, number][] {
    const t = clamp01(p) * this.steps;
    const i = Math.min(this.steps - 1, Math.floor(t));
    const pos = this.pointAt(p);
    return [...this.pts.slice(0, i + 1), [pos.lng, pos.lat]];
  }

  remainingCoords(p: number): [number, number][] {
    const t = clamp01(p) * this.steps;
    const i = Math.min(this.steps - 1, Math.floor(t));
    const pos = this.pointAt(p);
    return [[pos.lng, pos.lat], ...this.pts.slice(i + 1)];
  }
}

/* ── shared sim-clock progress (same formula the overlay UI uses) ─────── */
export function liveProgressAt(ship: TraceShip, simNow: number): number {
  if (ship.liveStatus === "ARRIVED") return 1;
  if (ship.liveStatus === "BOOKED") return 0;
  const end = ship.actualArrival ? +new Date(ship.actualArrival) : ship.eta ? +new Date(ship.eta) : null;
  const start = ship.departure ? +new Date(ship.departure) : 0;
  if (!end) return 0;
  return clamp01((simNow - start) / Math.max(1, end - start));
}

/** Cargo-import-value weight normalizer → 0.35..1 (arc glow/width). */
export function valueNorms(ships: TraceShip[]): Map<string, number> {
  const vals = ships.map((s) => s.importValue);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  return new Map(ships.map((s) => [s.ref, 0.35 + 0.65 * ((s.importValue - min) / span)]));
}
