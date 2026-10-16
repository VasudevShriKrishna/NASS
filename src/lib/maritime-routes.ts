/* Maritime corridor routing engine (Phase 2 of the Control-Tower correction spec).
 *
 * Sea routes are NEVER interpolated between two ports. Every main ocean leg
 * resolves to a validated port-to-port waypoint corridor that follows
 * navigable water: appropriate straits, canals and approaches. Corridors are
 * sampled by cumulative great-circle distance so that vessel positions,
 * traveled/remaining slicing and speed are all distance-based — vessels can
 * only ever sit ON their route polyline.
 *
 * Route provenance is explicit: corridors are ESTIMATED (illustrative)
 * waypoint geometry, clearly labeled in the UI — never presented as verified
 * AIS tracks.
 */

import type { TraceShip } from "@/lib/trace-types";

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;
const EARTH_R_KM = 6371;
const NM_PER_KM = 1 / 1.852;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * D2R;
  const dLng = (lng2 - lng1) * D2R;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.sqrt(a));
}

/** Web-mercator y so heading math matches the on-screen projection. */
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (Math.min(84.9, Math.max(-84.9, lat)) * D2R) / 2));

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

/* ── Named sea nodes (verified navigable-water positions) ────────────────── */
export const SEA_NODES: Record<string, { lng: number; lat: number; name: string }> = {
  // Gulf approach to NASS Bahrain destination
  KBSP: { lng: 50.535, lat: 26.177, name: "Khalifa Bin Salman Port" },
  KBSP_APPROACH: { lng: 50.66, lat: 26.34, name: "KBSP approach channel" },
  BAHRAIN_CHANNEL: { lng: 50.85, lat: 26.55, name: "Bahrain shipping channel" },
  GULF_MID_W: { lng: 51.4, lat: 26.8, name: "Central Persian Gulf" },
  GULF_MID: { lng: 53.0, lat: 26.3, name: "Persian Gulf" },
  GULF_INNER: { lng: 55.0, lat: 25.8, name: "Southern Persian Gulf" },
  JEBEL_ALI: { lng: 55.06, lat: 25.01, name: "Jebel Ali (transshipment)" },
  HORMUZ_S: { lng: 56.45, lat: 26.35, name: "Strait of Hormuz" },
  OMAN_CAPE: { lng: 59.8, lat: 22.7, name: "Ras al Hadd offshore" },
  OMAN_COAST: { lng: 59.7, lat: 20.8, name: "Oman offshore" },
  ARABIAN_SEA_N: { lng: 60.5, lat: 17.5, name: "Arabian Sea" },
  ARABIAN_SEA_W: { lng: 66.0, lat: 13.5, name: "Arabian Sea" },
  ARABIAN_SEA_SW: { lng: 72.0, lat: 10.5, name: "Arabian Sea" },
  LACCADIVE: { lng: 78.0, lat: 8.0, name: "Laccadive Sea" },
  CEYLON_SE: { lng: 82.3, lat: 6.2, name: "South of Sri Lanka" },
  CEYLON_S: { lng: 80.6, lat: 5.75, name: "Dondra offshore" },
  COLOMBO: { lng: 79.85, lat: 6.95, name: "Colombo (transshipment)" },
  COLOMBO_S: { lng: 79.6, lat: 5.9, name: "Colombo approach" },
  BAY_OF_BENGAL_S: { lng: 88.0, lat: 5.8, name: "Bay of Bengal" },
  SUMATRA_W: { lng: 97.5, lat: 5.2, name: "West of Sumatra" },
  MALACCA_N: { lng: 100.3, lat: 3.8, name: "Malacca Strait" },
  MALACCA_S: { lng: 102.3, lat: 2.2, name: "Malacca Strait" },
  SINGAPORE_STRAIT: { lng: 104.1, lat: 1.25, name: "Singapore Strait" },
  NATUNA_W: { lng: 105.5, lat: 3.5, name: "Natuna offshore" },
  BORNEO_W: { lng: 107.5, lat: 6.5, name: "West of Borneo" },
  VIETNAM_COAST: { lng: 109.5, lat: 10.5, name: "South China Sea" },
  SCS_CENTRAL: { lng: 112.0, lat: 15.5, name: "South China Sea" },
  SCS_WEST: { lng: 116.0, lat: 20.5, name: "South China Sea" },
  TAIWAN_STRAIT: { lng: 119.7, lat: 24.3, name: "Taiwan Strait" },
  EAST_CHINA_SEA: { lng: 122.6, lat: 29.5, name: "East China Sea" },
  SHANGHAI: { lng: 121.49, lat: 31.23, name: "Shanghai" },
  NINGBO: { lng: 121.85, lat: 29.87, name: "Ningbo" },
  // Suez corridor
  PORT_SAID_APPROACH: { lng: 32.15, lat: 31.55, name: "Port Said approach" },
  PORT_SAID: { lng: 32.32, lat: 31.42, name: "Port Said (Suez Canal N)" },
  SUEZ_CANAL: { lng: 32.35, lat: 30.4, name: "Suez Canal (Great Bitter Lake)" },
  GULF_OF_SUEZ: { lng: 32.75, lat: 29.2, name: "Gulf of Suez" },
  RED_SEA_N: { lng: 34.3, lat: 27.3, name: "Red Sea" },
  RED_SEA_MID: { lng: 37.5, lat: 22.5, name: "Red Sea" },
  RED_SEA_MID2: { lng: 39.3, lat: 19.5, name: "Red Sea" },
  RED_SEA_S: { lng: 41.5, lat: 15.0, name: "Southern Red Sea" },
  RED_SEA_MOUTH: { lng: 42.2, lat: 14.5, name: "Red Sea mouth" },
  BAB_EL_MANDEB: { lng: 43.35, lat: 12.65, name: "Bab el-Mandeb" },
  ADEN_W: { lng: 46.0, lat: 12.9, name: "Gulf of Aden" },
  ADEN_E: { lng: 49.5, lat: 13.3, name: "Gulf of Aden" },
  // Mediterranean
  MED_EAST: { lng: 29.5, lat: 32.9, name: "Eastern Mediterranean" },
  S_OF_CRETE_E: { lng: 26.5, lat: 34.0, name: "South of Crete" },
  S_OF_CRETE: { lng: 24.5, lat: 34.2, name: "South of Crete" },
  MED_SEA_E: { lng: 21.5, lat: 34.4, name: "Mediterranean" },
  S_OF_MALTA: { lng: 18.0, lat: 35.2, name: "South of Malta" },
  MALTA_S: { lng: 14.5, lat: 35.8, name: "Malta offshore" },
  SICILY_STRAIT: { lng: 12.8, lat: 37.0, name: "Strait of Sicily" },
  SICILY_STRAIT_W: { lng: 11.5, lat: 37.4, name: "Strait of Sicily" },
  S_OF_SARDINIA: { lng: 9.8, lat: 37.6, name: "South of Sardinia" },
  W_SARDINIA_S: { lng: 8.0, lat: 38.0, name: "West of Sardinia" },
  W_SARDINIA: { lng: 6.5, lat: 39.5, name: "Sardinian Sea" },
  W_CORSA_SARD: { lng: 6.0, lat: 41.5, name: "Corsica Channel offshore" },
  LIGURIAN_W: { lng: 7.0, lat: 43.2, name: "Ligurian Sea" },
  GENOA: { lng: 8.92, lat: 44.4, name: "Genoa" },
  IZMIR: { lng: 27.14, lat: 38.42, name: "Izmir" },
  AEGEAN_S: { lng: 26.3, lat: 37.5, name: "Southern Aegean" },
  DODECANESE: { lng: 25.6, lat: 35.8, name: "Dodecanese offshore" },
  RHODES_S: { lng: 25.0, lat: 34.5, name: "Rhodes offshore" },
  // Atlantic / NW Europe
  DOVER: { lng: 1.35, lat: 50.95, name: "Dover Strait" },
  CHANNEL_MID: { lng: 0.0, lat: 50.05, name: "English Channel" },
  CHANNEL_W: { lng: -2.2, lat: 49.6, name: "English Channel" },
  BISCAY_N: { lng: -4.8, lat: 48.2, name: "Bay of Biscay" },
  BISCAY_W: { lng: -6.5, lat: 45.0, name: "Bay of Biscay" },
  GALICIA: { lng: -9.5, lat: 42.5, name: "Galicia offshore" },
  PORTUGAL: { lng: -9.8, lat: 38.0, name: "Portugal offshore" },
  GIBRALTAR_W: { lng: -6.5, lat: 36.1, name: "Gibraltar approach" },
  GIBRALTAR: { lng: -5.45, lat: 36.05, name: "Strait of Gibraltar" },
  ALBORAN: { lng: -3.0, lat: 36.35, name: "Alboran Sea" },
  ALBORAN_E: { lng: 0.5, lat: 37.4, name: "Alboran Sea" },
  BALEARIC_S: { lng: 5.5, lat: 38.2, name: "South of Balearics" },
  ANTWERP: { lng: 4.37, lat: 51.28, name: "Antwerp" },
  ANTWERP_OUT: { lng: 3.4, lat: 51.7, name: "Antwerp approach" },
  DUTCH_COAST: { lng: 1.9, lat: 51.3, name: "Dutch coast" },
  NORTH_SEA: { lng: 3.5, lat: 54.5, name: "North Sea" },
  NORTH_SEA_DK: { lng: 8.0, lat: 57.0, name: "North Sea" },
  SKAGEN: { lng: 10.5, lat: 57.9, name: "Skagen offshore" },
  KATTEGAT: { lng: 11.3, lat: 57.5, name: "Kattegat" },
  GOTHENBURG: { lng: 11.97, lat: 57.71, name: "Gothenburg" },
  // Land nodes (quarry/yard — ROAD mode, straight leg)
  ASKAR_QUARRY: { lng: 50.515, lat: 26.1, name: "Askar Quarry" },
  ASKAR_YARD: { lng: 50.575, lat: 26.075, name: "NASS Askar Yard" },
};

/* ── Corridor lanes: ordered waypoint keys from each registered origin to
 *    the NASS Bahrain destination. Every list stays in navigable water. ── */
const KBS_APPROACH: string[] = ["HORMUZ_S", "GULF_INNER", "GULF_MID", "GULF_MID_W", "BAHRAIN_CHANNEL", "KBSP_APPROACH", "KBSP"];

const LANES_TO_KBSP: Record<string, string[]> = {
  SHANGHAI: ["SHANGHAI", "EAST_CHINA_SEA", "TAIWAN_STRAIT", "SCS_WEST", "SCS_CENTRAL", "VIETNAM_COAST", "BORNEO_W", "NATUNA_W", "SINGAPORE_STRAIT", "MALACCA_S", "MALACCA_N", "SUMATRA_W", "BAY_OF_BENGAL_S", "CEYLON_SE", "CEYLON_S", "COLOMBO_S", "LACCADIVE", "ARABIAN_SEA_SW", "ARABIAN_SEA_W", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  NINGBO: ["NINGBO", "EAST_CHINA_SEA", "TAIWAN_STRAIT", "SCS_WEST", "SCS_CENTRAL", "VIETNAM_COAST", "BORNEO_W", "NATUNA_W", "SINGAPORE_STRAIT", "MALACCA_S", "MALACCA_N", "SUMATRA_W", "BAY_OF_BENGAL_S", "CEYLON_SE", "CEYLON_S", "COLOMBO_S", "LACCADIVE", "ARABIAN_SEA_SW", "ARABIAN_SEA_W", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  GENOA: ["GENOA", "LIGURIAN_W", "W_CORSA_SARD", "W_SARDINIA", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  ANTWERP: ["ANTWERP", "ANTWERP_OUT", "DUTCH_COAST", "DOVER", "CHANNEL_MID", "CHANNEL_W", "BISCAY_N", "BISCAY_W", "GALICIA", "PORTUGAL", "GIBRALTAR_W", "GIBRALTAR", "ALBORAN", "ALBORAN_E", "BALEARIC_S", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  GOTHENBURG: ["GOTHENBURG", "KATTEGAT", "SKAGEN", "NORTH_SEA_DK", "NORTH_SEA", "DOVER", "CHANNEL_MID", "CHANNEL_W", "BISCAY_N", "BISCAY_W", "GALICIA", "PORTUGAL", "GIBRALTAR_W", "GIBRALTAR", "ALBORAN", "ALBORAN_E", "BALEARIC_S", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  IZMIR: ["IZMIR", "AEGEAN_S", "DODECANESE", "RHODES_S", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
};

/** Transshipment insertions — only when a shipment's legs document the call. */
const VIA_INSERTIONS: Record<string, Record<string, string[]>> = {
  JEBEL_ALI: {
    // after GULF_INNER, call at Jebel Ali, then rejoin the gulf lane
    GULF_INNER: ["GULF_INNER", "JEBEL_ALI", "GULF_MID", "GULF_MID_W", "BAHRAIN_CHANNEL", "KBSP_APPROACH", "KBSP"],
  },
  COLOMBO: {
    // replace the Ceylon bypass with a documented Colombo call
    CEYLON_SE: ["CEYLON_SE", "COLOMBO_S", "COLOMBO", "CEYLON_SE", "LACCADIVE"],
  },
};

export type RouteKind = "corridor" | "road" | "unavailable";

export interface ResolvedRoute {
  route: MaritimeRoute | null;
  kind: RouteKind;
  /** named waypoints passed through (strait/canal/transshipment nodes) */
  viaNames: string[];
  /** corridor is estimated waypoint geometry, not a verified AIS track */
  provenance: "estimated-corridor" | "land-leg" | "none";
}

const PORT_KEY_ALIASES: Record<string, string> = {
  shanghai: "SHANGHAI",
  ningbo: "NINGBO",
  genoa: "GENOA",
  genova: "GENOA",
  antwerp: "ANTWERP",
  gothenburg: "GOTHENBURG",
  izmir: "IZMIR",
  "khalifa bin salman": "KBSP",
  kbsp: "KBSP",
  "askar quarry": "ASKAR_QUARRY",
  "nass askar yard": "ASKAR_YARD",
  "askar yard": "ASKAR_YARD",
};

/** Map a free-text port string to a lane/node key. Bahrain-only destination. */
export function laneKeyFor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  for (const k of Object.keys(PORT_KEY_ALIASES)) if (s.includes(k)) return PORT_KEY_ALIASES[k];
  return null;
}

export function isBahrainDestination(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = raw.toLowerCase();
  return s.includes("bahrain") || s.includes("khalifa bin salman") || s.includes("kbsp") || s.includes("askar") || s.includes(", bh");
}

/* ── Distance-based polyline: vessels only ever exist ON the route ───────── */
export class MaritimeRoute {
  readonly samples: [number, number][]; // [lng, lat]
  private cumKm: number[]; // cumulative distance at each sample
  private totalKm: number;
  readonly nodeCount: number;
  readonly viaNames: string[];

  constructor(nodeKeys: string[], sampleStepKm = 45) {
    const nodes = nodeKeys.map((k) => {
      const n = SEA_NODES[k];
      if (!n) throw new Error(`Unknown maritime node: ${k}`);
      return [n.lng, n.lat] as [number, number];
    });
    this.nodeCount = nodes.length;
    this.viaNames = nodeKeys
      .filter((k) => !k.startsWith("KBSP") && !LANES_TERMINAL.has(k))
      .map((k) => SEA_NODES[k]?.name)
      .filter((n, i, a) => n && a.indexOf(n) === i);

    // dense-sample each leg, then resample by cumulative distance
    const dense: [number, number][] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const [lng0, lat0] = nodes[i];
      const [lng1, lat1] = nodes[i + 1];
      const d = haversineKm(lat0, lng0, lat1, lng1);
      const steps = Math.max(2, Math.round(d / Math.max(8, sampleStepKm / 3)));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        dense.push([lng0 + (lng1 - lng0) * t, lat0 + (lat1 - lat0) * t]);
      }
    }
    dense.push(nodes[nodes.length - 1]);

    // cumulative distance + distance-uniform resample
    const cum: number[] = [0];
    for (let i = 1; i < dense.length; i++) {
      cum.push(cum[i - 1] + haversineKm(dense[i - 1][1], dense[i - 1][0], dense[i][1], dense[i][0]));
    }
    this.totalKm = cum[cum.length - 1];
    const nSamples = Math.max(48, Math.min(240, Math.round(this.totalKm / sampleStepKm)));
    const samples: [number, number][] = [];
    const cumS: number[] = [];
    let j = 0;
    for (let s = 0; s <= nSamples; s++) {
      const target = (s / nSamples) * this.totalKm;
      while (j < cum.length - 2 && cum[j + 1] < target) j++;
      const segLen = Math.max(1e-9, cum[j + 1] - cum[j]);
      const f = Math.min(1, Math.max(0, (target - cum[j]) / segLen));
      samples.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
      cumS.push(target);
    }
    this.samples = samples;
    this.cumKm = cumS;
  }

  get distanceNm(): number {
    return Math.round(this.totalKm * NM_PER_KM);
  }

  pointAt(p: number): GcPos {
    const t = clamp01(p) * (this.samples.length - 1);
    const i = Math.min(this.samples.length - 2, Math.floor(t));
    const f = t - i;
    const a = this.samples[i];
    const b = this.samples[i + 1];
    return {
      lng: a[0] + (b[0] - a[0]) * f,
      lat: a[1] + (b[1] - a[1]) * f,
      angle: Math.atan2(mercY(b[1]) - mercY(a[1]), b[0] - a[0]) * R2D,
    };
  }

  /** Angle in degrees at sample index (for headings). */
  angleAt(i: number): number {
    const a = this.samples[Math.min(i, this.samples.length - 2)];
    const b = this.samples[Math.min(i + 1, this.samples.length - 1)];
    return Math.atan2(mercY(b[1]) - mercY(a[1]), b[0] - a[0]) * R2D;
  }

  traveledCoords(p: number): [number, number][] {
    const t = clamp01(p) * (this.samples.length - 1);
    const i = Math.min(this.samples.length - 2, Math.floor(t));
    const pos = this.pointAt(p);
    return [...this.samples.slice(0, i + 1).map((s) => [s[0], s[1]] as [number, number]), [pos.lng, pos.lat]];
  }

  remainingCoords(p: number): [number, number][] {
    const t = clamp01(p) * (this.samples.length - 1);
    const i = Math.min(this.samples.length - 2, Math.floor(t));
    const pos = this.pointAt(p);
    return [[pos.lng, pos.lat], ...this.samples.slice(i + 1).map((s) => [s[0], s[1]] as [number, number])];
  }
}

const LANES_TERMINAL = new Set(["KBSP", "ASKAR_YARD", "ASKAR_QUARRY", "SHANGHAI", "NINGBO", "GENOA", "ANTWERP", "GOTHENBURG", "IZMIR"]);

/* ── Route resolution: mode-aware, destination-Bahrain-only ──────────────── */
export function resolveMaritimeRoute(
  originPort: string | null | undefined,
  destPort: string | null | undefined,
  mode: string,
  via: string[] = []
): ResolvedRoute {
  const fromKey = laneKeyFor(originPort);
  const toKey = laneKeyFor(destPort);

  // Land legs (ROAD etc.): short straight leg between registered land nodes.
  if (mode === "ROAD" || mode === "BARGE" || fromKey?.startsWith("ASKAR")) {
    if (fromKey && toKey && fromKey.startsWith("ASKAR") && toKey.startsWith("ASKAR")) {
      const route = new MaritimeRoute([fromKey, toKey], 10);
      return { route, kind: "road", viaNames: [], provenance: "land-leg" };
    }
    return { route: null, kind: "unavailable", viaNames: [], provenance: "none" };
  }

  if (!fromKey || !toKey || toKey !== "KBSP") {
    // Unknown origin/destination: no validated corridor exists — never fabricate one.
    return { route: null, kind: "unavailable", viaNames: [], provenance: "none" };
  }
  const lane = LANES_TO_KBSP[fromKey];
  if (!lane) return { route: null, kind: "unavailable", viaNames: [], provenance: "none" };

  // apply documented transshipment calls
  let keys = [...lane];
  for (const v of via) {
    const vk = Object.keys(VIA_INSERTIONS).find((k) => v.toLowerCase().includes(k.toLowerCase().replace("_", " ")) || k.toLowerCase() === v.toLowerCase());
    if (!vk) continue;
    const ins = VIA_INSERTIONS[vk];
    const anchor = Object.keys(ins).find((a) => keys.includes(a));
    if (anchor) {
      const idx = keys.indexOf(anchor);
      keys = [...keys.slice(0, idx), ...ins[anchor], ...keys.slice(idx + 1)];
    }
  }

  const route = new MaritimeRoute(keys);
  return { route, kind: "corridor", viaNames: route.viaNames, provenance: "estimated-corridor" };
}

/** Extract documented transshipment ports from shipment legs (sea legs only). */
export function viaFromLegs(legs: { mode: string; fromPoint: string | null; toPoint: string | null }[]): string[] {
  const via: string[] = [];
  for (const l of legs) {
    if (l.mode !== "OCEAN") continue;
    for (const pt of [l.fromPoint, l.toPoint]) {
      if (!pt) continue;
      const s = pt.toLowerCase();
      if (s.includes("jebel ali")) via.push("JEBEL_ALI");
      else if (s.includes("colombo")) via.push("COLOMBO");
    }
  }
  return [...new Set(via)];
}

/* ── shared sim-clock progress (same formula the overlay UI uses) ─────────── */
export function liveProgressAt(ship: TraceShip, simNow: number): number {
  if (ship.liveStatus === "ARRIVED") return 1;
  if (ship.liveStatus === "BOOKED") return 0;
  const end = ship.actualArrival ? +new Date(ship.actualArrival) : ship.eta ? +new Date(ship.eta) : null;
  const start = ship.departure ? +new Date(ship.departure) : 0;
  if (!end) return 0;
  return clamp01((simNow - start) / Math.max(1, end - start));
}

/** Cargo-import-value weight normalizer → 0.35..1 (route glow/width). */
export function valueNorms(ships: TraceShip[]): Map<string, number> {
  const vals = ships.map((s) => s.importValueUsd ?? s.importValue);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  return new Map(ships.map((s) => [s.ref, 0.35 + 0.65 * (((s.importValueUsd ?? s.importValue) - min) / span)]));
}
