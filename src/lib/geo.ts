/* Live-trace geometry: equirectangular projection (must match
 * scripts/generate-world-map.mjs), port coordinate registry and the
 * quadratic "great-circle style" route arcs ships glide along.        */

export const WORLD_W = 1000;
export const WORLD_H = 420;
const K = 500 / 180; // deg → viewBox units

export interface Pt {
  x: number;
  y: number;
}

export function projectPoint(lng: number, lat: number): Pt {
  return { x: 500 + lng * K, y: 250 - lat * K };
}

/* ── Port registry (seeded fleet + hub ports) ─────────────────────────── */
export interface PortInfo {
  lat: number;
  lng: number;
  country: string;
  label: string;
}

export const PORTS: Record<string, PortInfo> = {
  // NASS destination (Bahrain) — the only configured POD country
  KBSP: { lat: 26.177, lng: 50.535, country: "Bahrain", label: "Khalifa Bin Salman Port" },
  ASKAR: { lat: 26.085, lng: 50.56, country: "Bahrain", label: "Askar" },
  // Export / origin ports
  SHANGHAI: { lat: 31.23, lng: 121.49, country: "China", label: "Shanghai" },
  NINGBO: { lat: 29.87, lng: 121.85, country: "China", label: "Ningbo" },
  IZMIR: { lat: 38.42, lng: 27.14, country: "Türkiye", label: "Izmir" },
  GENOA: { lat: 44.4, lng: 8.92, country: "Italy", label: "Genoa" },
  ANTWERP: { lat: 51.28, lng: 4.37, country: "Belgium", label: "Antwerp" },
  GOTHENBURG: { lat: 57.71, lng: 11.97, country: "Sweden", label: "Gothenburg" },
  COLOMBO: { lat: 6.95, lng: 79.85, country: "Sri Lanka", label: "Colombo" },
  // UAE ports remain visible as geographic context / documented transshipment —
  // they are NEVER the NASS destination (destination country is Bahrain).
  FUJAIRAH: { lat: 25.12, lng: 56.34, country: "UAE", label: "Fujairah" },
  JEBEL_ALI: { lat: 25.01, lng: 55.06, country: "UAE", label: "Jebel Ali" },
};

/** Fuzzy-match a free-text port string ("Shanghai, CN", "Fujairah Quarry",
 *  "Khalifa Bin Salman Port, BH") to a registry port. Returns null when
 *  unknown — callers must NOT substitute a guessed destination.              */
export function lookupPort(raw: string | null | undefined): PortInfo | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => s.includes(k));
  if (has("khalifa bin salman", "kbsp")) return PORTS.KBSP;
  if (has("askar")) return PORTS.ASKAR;
  if (has("shanghai")) return PORTS.SHANGHAI;
  if (has("ningbo")) return PORTS.NINGBO;
  if (has("izmir")) return PORTS.IZMIR;
  if (has("genoa", "genova")) return PORTS.GENOA;
  if (has("antwerp", "anvers")) return PORTS.ANTWERP;
  if (has("gothenburg", "göteborg", "goteborg")) return PORTS.GOTHENBURG;
  if (has("colombo")) return PORTS.COLOMBO;
  if (has("fujairah")) return PORTS.FUJAIRAH;
  if (has("jebel ali", "jebel ali, ae", "jebelali")) return PORTS.JEBEL_ALI;
  return null;
}

/** Country for a free-text port via registry; falls back to the 2-letter
 *  code after the comma ("Shanghai, CN" → CN) or the raw text.           */
export function portCountry(raw: string | null | undefined): string {
  const p = lookupPort(raw);
  if (p) return p.country;
  if (!raw) return "—";
  const m = raw.match(/,\s*([A-Z]{2})\s*$/);
  if (m) return m[1];
  return raw;
}

/* ── Route arcs: quadratic Bézier lifted toward the pole for the classic
 *    "great-circle look". Ships sample the same curve so motion is exact. */
export interface Arc {
  p0: Pt; // origin
  c: Pt; // control point
  p1: Pt; // destination
  d: string; // SVG path
  len: number; // approx chord length (for lift scaling)
}

export function buildArc(fromLng: number, fromLat: number, toLng: number, toLat: number): Arc {
  const p0 = projectPoint(fromLng, fromLat);
  const p1 = projectPoint(toLng, toLat);
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  // lift = 18% of length upward (never below destination for short hops)
  const lift = Math.min(95, Math.max(18, len * 0.18));
  const c = { x: mx, y: my - lift };
  return { p0, c, p1, d: `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`, len };
}

/** De Casteljau point + tangent angle (deg) at t ∈ [0,1] on the arc. */
export function arcAt(arc: Arc, t: number): { x: number; y: number; angle: number } {
  const u = 1 - t;
  const x = u * u * arc.p0.x + 2 * u * t * arc.c.x + t * t * arc.p1.x;
  const y = u * u * arc.p0.y + 2 * u * t * arc.c.y + t * t * arc.p1.y;
  const dx = 2 * u * (arc.c.x - arc.p0.x) + 2 * t * (arc.p1.x - arc.c.x);
  const dy = 2 * u * (arc.c.y - arc.p0.y) + 2 * t * (arc.p1.y - arc.c.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** Haversine distance (km) — used for cosmetic speedkn readouts. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
