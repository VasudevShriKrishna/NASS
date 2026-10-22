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
  HORMUZ_W: { lng: 55.95, lat: 26.45, name: "Hormuz westward track" },
  OMAN_CAPE: { lng: 59.95, lat: 22.75, name: "Ras al Hadd offshore" },
  RAS_AL_HADD_W: { lng: 60.0, lat: 21.8, name: "Ras al Hadd westward track" },
  OMAN_COAST: { lng: 59.7, lat: 20.8, name: "Oman offshore" },
  ARABIAN_SEA_N: { lng: 60.5, lat: 17.5, name: "Arabian Sea" },
  ARABIAN_SEA_W: { lng: 66.0, lat: 13.5, name: "Arabian Sea" },
  ARABIAN_SEA_SW: { lng: 72.0, lat: 10.5, name: "Arabian Sea" },
  LACCADIVE: { lng: 78.0, lat: 8.0, name: "Laccadive Sea" },
  INDIA_TIP_W: { lng: 76.3, lat: 7.6, name: "South of India offshore" },
  CEYLON_SE: { lng: 82.3, lat: 6.2, name: "South of Sri Lanka" },
  CEYLON_S: { lng: 80.6, lat: 5.75, name: "Dondra offshore" },
  COLOMBO: { lng: 79.85, lat: 6.95, name: "Colombo (transshipment)" },
  COLOMBO_S: { lng: 79.6, lat: 5.9, name: "Colombo approach" },
  BAY_OF_BENGAL_S: { lng: 88.0, lat: 5.8, name: "Bay of Bengal" },
  ANDAMAN_APPROACH: { lng: 97.9, lat: 5.3, name: "Andaman Sea approach" },
  ACEH_NW: { lng: 94.3, lat: 6.5, name: "NW of Banda Aceh" },
  MALACCA_N: { lng: 100.3, lat: 3.8, name: "Malacca Strait" },
  MALACCA_MID: { lng: 101.45, lat: 2.2, name: "Malacca Strait mid" },
  MALACCA_S: { lng: 102.35, lat: 1.7, name: "Malacca Strait" },
  PHILLIP_CHANNEL: { lng: 103.6, lat: 1.15, name: "Phillip Channel" },
  SINGAPORE_STRAIT: { lng: 104.1, lat: 1.25, name: "Singapore Strait" },
  NATUNA_S: { lng: 104.8, lat: 1.7, name: "Natuna southward track" },
  NATUNA_W: { lng: 105.5, lat: 3.5, name: "Natuna offshore" },
  BORNEO_W: { lng: 107.5, lat: 6.5, name: "West of Borneo" },
  VIETNAM_COAST: { lng: 109.5, lat: 10.5, name: "South China Sea" },
  SCS_CENTRAL: { lng: 112.0, lat: 15.5, name: "South China Sea" },
  SCS_WEST: { lng: 116.0, lat: 20.5, name: "South China Sea" },
  TAIWAN_STRAIT: { lng: 119.7, lat: 24.3, name: "Taiwan Strait" },
  EAST_CHINA_SEA: { lng: 122.6, lat: 29.5, name: "East China Sea" },
  SHANGHAI_OUT: { lng: 122.15, lat: 30.4, name: "Yangtze mouth offshore" },
  NINGBO_OUT: { lng: 122.35, lat: 29.6, name: "Zhoushan offshore" },
  SHANGHAI: { lng: 121.49, lat: 31.23, name: "Shanghai" },
  NINGBO: { lng: 121.85, lat: 29.87, name: "Ningbo" },
  BUSAN: { lng: 129.04, lat: 35.10, name: "Busan" },
  BUSAN_OUT: { lng: 129.3, lat: 34.8, name: "Korea Strait" },
  RAK_QUARRY: { lng: 56.03, lat: 25.86, name: "Ras Al Khaimah Stevin Rock" },
  RAK_OUT: { lng: 55.95, lat: 26.05, name: "RAK coastal approach" },
  HIDD_JETTY: { lng: 50.68, lat: 26.22, name: "NASS Hidd Aggregate Jetty" },
  // Suez corridor
  PORT_SAID_APPROACH: { lng: 32.15, lat: 31.55, name: "Port Said approach" },
  PORT_SAID: { lng: 32.32, lat: 31.42, name: "Port Said (Suez Canal N)" },
  SUEZ_CANAL: { lng: 32.35, lat: 30.4, name: "Suez Canal (Great Bitter Lake)" },
  GULF_OF_SUEZ: { lng: 32.75, lat: 29.2, name: "Gulf of Suez" },
  GUBAL: { lng: 33.65, lat: 27.9, name: "Strait of Gubal" },
  RED_SEA_N: { lng: 34.3, lat: 27.3, name: "Red Sea" },
  RED_SEA_MID: { lng: 37.5, lat: 22.5, name: "Red Sea" },
  RED_SEA_MID2: { lng: 39.3, lat: 19.5, name: "Red Sea" },
  RED_SEA_S: { lng: 41.5, lat: 15.0, name: "Southern Red Sea" },
  RED_SEA_MOUTH: { lng: 42.2, lat: 14.5, name: "Red Sea mouth" },
  BAB_EL_MANDEB: { lng: 43.35, lat: 12.65, name: "Bab el-Mandeb" },
  ADEN_M: { lng: 44.9, lat: 12.2, name: "Gulf of Aden mid" },
  ADEN_W: { lng: 46.0, lat: 12.7, name: "Gulf of Aden" },
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
  IZMIR_OUT: { lng: 27.0, lat: 38.32, name: "Gulf of Izmir exit" },
  AEGEAN_M: { lng: 26.55, lat: 38.1, name: "Chios–Karaburun strait" },
  AEGEAN_S: { lng: 26.3, lat: 37.5, name: "Southern Aegean" },
  KASOS_E: { lng: 26.9, lat: 35.3, name: "Kasos Strait (east of Crete)" },
  DODECANESE: { lng: 25.6, lat: 35.8, name: "Dodecanese offshore" },
  RHODES_S: { lng: 25.0, lat: 34.5, name: "Rhodes offshore" },
  // Atlantic / NW Europe
  DOVER: { lng: 1.35, lat: 50.95, name: "Dover Strait" },
  CHANNEL_MID: { lng: 0.0, lat: 50.05, name: "English Channel" },
  CHANNEL_W: { lng: -2.8, lat: 49.75, name: "English Channel" },
  USHANT_W: { lng: -5.4, lat: 48.55, name: "Ushant offshore" },
  BISCAY_N: { lng: -4.8, lat: 48.2, name: "Bay of Biscay" },
  BISCAY_W: { lng: -6.5, lat: 45.0, name: "Bay of Biscay" },
  FINISTERRE_W: { lng: -9.9, lat: 43.2, name: "Finisterre offshore" },
  GALICIA: { lng: -9.5, lat: 42.5, name: "Galicia offshore" },
  PORTUGAL: { lng: -9.8, lat: 38.0, name: "Portugal offshore" },
  ST_VINCENT_W: { lng: -9.2, lat: 36.9, name: "Cape St Vincent offshore" },
  GIBRALTAR_W: { lng: -6.55, lat: 35.95, name: "Gibraltar approach" },
  GIBRALTAR: { lng: -5.5, lat: 35.92, name: "Strait of Gibraltar" },
  ALBORAN: { lng: -3.0, lat: 36.35, name: "Alboran Sea" },
  ALBORAN_E: { lng: 0.5, lat: 37.4, name: "Alboran Sea" },
  BALEARIC_S: { lng: 5.5, lat: 38.2, name: "South of Balearics" },
  ANTWERP: { lng: 4.37, lat: 51.28, name: "Antwerp" },
  SCHELDT_MID: { lng: 3.8, lat: 51.6, name: "Westerschelde mid" },
  ANTWERP_OUT: { lng: 3.45, lat: 51.95, name: "Antwerp approach" },
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
const KBS_APPROACH: string[] = ["HORMUZ_S", "HORMUZ_W", "GULF_INNER", "GULF_MID", "GULF_MID_W", "BAHRAIN_CHANNEL", "KBSP_APPROACH", "KBSP"];

export const LANES_TO_KBSP: Record<string, string[]> = {
  SHANGHAI: ["SHANGHAI", "SHANGHAI_OUT", "EAST_CHINA_SEA", "TAIWAN_STRAIT", "SCS_WEST", "SCS_CENTRAL", "VIETNAM_COAST", "BORNEO_W", "NATUNA_W", "NATUNA_S", "SINGAPORE_STRAIT", "PHILLIP_CHANNEL", "MALACCA_S", "MALACCA_MID", "MALACCA_N", "ANDAMAN_APPROACH", "ACEH_NW", "BAY_OF_BENGAL_S", "CEYLON_SE", "CEYLON_S", "COLOMBO_S", "LACCADIVE", "INDIA_TIP_W", "ARABIAN_SEA_SW", "ARABIAN_SEA_W", "ARABIAN_SEA_N", "OMAN_COAST", "RAS_AL_HADD_W", "OMAN_CAPE", ...KBS_APPROACH],
  NINGBO: ["NINGBO", "NINGBO_OUT", "EAST_CHINA_SEA", "TAIWAN_STRAIT", "SCS_WEST", "SCS_CENTRAL", "VIETNAM_COAST", "BORNEO_W", "NATUNA_W", "NATUNA_S", "SINGAPORE_STRAIT", "PHILLIP_CHANNEL", "MALACCA_S", "MALACCA_MID", "MALACCA_N", "ANDAMAN_APPROACH", "ACEH_NW", "BAY_OF_BENGAL_S", "CEYLON_SE", "CEYLON_S", "COLOMBO_S", "LACCADIVE", "INDIA_TIP_W", "ARABIAN_SEA_SW", "ARABIAN_SEA_W", "ARABIAN_SEA_N", "OMAN_COAST", "RAS_AL_HADD_W", "OMAN_CAPE", ...KBS_APPROACH],
  GENOA: ["GENOA", "LIGURIAN_W", "W_CORSA_SARD", "W_SARDINIA", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "GUBAL", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_M", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "RAS_AL_HADD_W", "OMAN_CAPE", ...KBS_APPROACH],
  ANTWERP: ["ANTWERP", "SCHELDT_MID", "ANTWERP_OUT", "DUTCH_COAST", "DOVER", "CHANNEL_MID", "CHANNEL_W", "USHANT_W", "BISCAY_N", "BISCAY_W", "FINISTERRE_W", "GALICIA", "PORTUGAL", "ST_VINCENT_W", "GIBRALTAR_W", "GIBRALTAR", "ALBORAN", "ALBORAN_E", "BALEARIC_S", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "GUBAL", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_M", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "RAS_AL_HADD_W", "OMAN_CAPE", ...KBS_APPROACH],
  GOTHENBURG: ["GOTHENBURG", "KATTEGAT", "SKAGEN", "NORTH_SEA_DK", "NORTH_SEA", "DOVER", "CHANNEL_MID", "CHANNEL_W", "USHANT_W", "BISCAY_N", "BISCAY_W", "FINISTERRE_W", "GALICIA", "PORTUGAL", "ST_VINCENT_W", "GIBRALTAR_W", "GIBRALTAR", "ALBORAN", "ALBORAN_E", "BALEARIC_S", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "GUBAL", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_M", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "RAS_AL_HADD_W", "OMAN_CAPE", ...KBS_APPROACH],
  IZMIR: ["IZMIR", "IZMIR_OUT", "AEGEAN_M", "AEGEAN_S", "KASOS_E", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "GUBAL", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_M", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "RAS_AL_HADD_W", "OMAN_CAPE", ...KBS_APPROACH],
  BUSAN: ["BUSAN", "BUSAN_OUT", "EAST_CHINA_SEA", "TAIWAN_STRAIT", "SCS_WEST", "SCS_CENTRAL", "VIETNAM_COAST", "BORNEO_W", "NATUNA_W", "NATUNA_S", "SINGAPORE_STRAIT", "PHILLIP_CHANNEL", "MALACCA_S", "MALACCA_MID", "MALACCA_N", "ANDAMAN_APPROACH", "ACEH_NW", "BAY_OF_BENGAL_S", "CEYLON_SE", "CEYLON_S", "COLOMBO_S", "LACCADIVE", "INDIA_TIP_W", "ARABIAN_SEA_SW", "ARABIAN_SEA_W", "ARABIAN_SEA_N", "OMAN_COAST", "RAS_AL_HADD_W", "OMAN_CAPE", ...KBS_APPROACH],
  RAK: ["RAK_QUARRY", "RAK_OUT", "HORMUZ_W", "GULF_INNER", "GULF_MID", "GULF_MID_W", "BAHRAIN_CHANNEL", "KBSP_APPROACH", "KBSP"],
};

/** Transshipment insertions — only when a shipment's legs document the call. */
export const VIA_INSERTIONS: Record<string, Record<string, string[]>> = {
  JEBEL_ALI: {
    // after GULF_INNER, call at Jebel Ali, then rejoin the gulf lane
    GULF_INNER: ["GULF_INNER", "JEBEL_ALI", "GULF_MID", "GULF_MID_W", "BAHRAIN_CHANNEL", "KBSP_APPROACH", "KBSP"],
  },
  COLOMBO: {
    // replace the Ceylon bypass with a documented Colombo call — out and back
    // along the offshore Dondra track (never cutting across the island)
    CEYLON_SE: ["CEYLON_SE", "CEYLON_S", "COLOMBO_S", "COLOMBO", "COLOMBO_S", "CEYLON_S"],
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
  busan: "BUSAN",
  "ras al khaimah": "RAK",
  "stevin rock": "RAK",
  rak: "RAK",
  "hidd jetty": "KBSP",
  "nass hidd aggregate jetty": "KBSP",
  hidd: "KBSP",
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
  return s.includes("bahrain") || s.includes("khalifa bin salman") || s.includes("kbsp") || s.includes("askar") || s.includes("hidd") || s.includes(", bh");
}

/* ── Distance-based polyline: vessels only ever exist ON the route ───────── */
export class MaritimeRoute {
  readonly samples: [number, number][]; // [lng, lat]
  readonly angles: number[]; // continuous tangent angles (screen-space heading in degrees)
  private cumKm: number[]; // cumulative distance at each sample
  private totalKm: number;
  readonly nodeCount: number;
  readonly viaNames: string[];

  constructor(nodeKeys: string[], sampleStepKm = 12) {
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

    // ── Centripetal Catmull-Rom Spline (alpha = 0.5) ──
    // Eliminates overshoots, cusps, loops, and self-intersections.
    // Produces Google-Maps-grade smooth curves through realistic sea corridors.
    const n = nodes.length;
    const dense: [number, number][] = [];
    const denseDeriv: [number, number][] = [];

    if (n < 2) {
      this.samples = nodes.length ? [[nodes[0][0], nodes[0][1]]] : [];
      this.angles = [0];
      this.cumKm = [0];
      this.totalKm = 0;
      return;
    }

    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? nodes[i - 1] : [2 * nodes[0][0] - nodes[1][0], 2 * nodes[0][1] - nodes[1][1]];
      const p1 = nodes[i];
      const p2 = nodes[i + 1];
      const p3 = i < n - 2 ? nodes[i + 2] : [2 * nodes[n - 1][0] - nodes[n - 2][0], 2 * nodes[n - 1][1] - nodes[n - 2][1]];

      // Chord distances in km
      const d01 = Math.max(0.1, haversineKm(p0[1], p0[0], p1[1], p1[0]));
      const d12 = Math.max(0.1, haversineKm(p1[1], p1[0], p2[1], p2[0]));
      const d23 = Math.max(0.1, haversineKm(p2[1], p2[0], p3[1], p3[0]));

      // Centripetal parameterization (alpha = 0.5)
      const dt0 = Math.sqrt(d01);
      const dt1 = Math.sqrt(d12);
      const dt2 = Math.sqrt(d23);

      // Centripetal tangent vectors at p1 and p2 scaled to segment parameter [0, 1]
      let tx1 = ((p2[0] - p1[0]) / dt1 + (p1[0] - p0[0]) / dt0 - (p2[0] - p0[0]) / (dt0 + dt1)) * dt1;
      let ty1 = ((p2[1] - p1[1]) / dt1 + (p1[1] - p0[1]) / dt0 - (p2[1] - p0[1]) / (dt0 + dt1)) * dt1;
      let tx2 = ((p3[0] - p2[0]) / dt2 + (p2[0] - p1[0]) / dt1 - (p3[0] - p1[0]) / (dt1 + dt2)) * dt1;
      let ty2 = ((p3[1] - p2[1]) / dt2 + (p2[1] - p1[1]) / dt1 - (p3[1] - p1[1]) / (dt1 + dt2)) * dt1;

      // Tight-turn damping: prevents overshooting beyond segment bounding region
      const chordDist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const maxT = 1.35 * chordDist;
      const mag1 = Math.hypot(tx1, ty1);
      const mag2 = Math.hypot(tx2, ty2);
      if (mag1 > maxT && mag1 > 1e-6) {
        tx1 = (tx1 / mag1) * maxT;
        ty1 = (ty1 / mag1) * maxT;
      }
      if (mag2 > maxT && mag2 > 1e-6) {
        tx2 = (tx2 / mag2) * maxT;
        ty2 = (ty2 / mag2) * maxT;
      }

      // Adaptive sampling steps proportional to distance
      const steps = Math.max(8, Math.min(80, Math.round(d12 / 10)));

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const t2 = t * t;
        const t3 = t2 * t;

        // Cubic Hermite basis functions
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        const lng = h00 * p1[0] + h10 * tx1 + h01 * p2[0] + h11 * tx2;
        const lat = h00 * p1[1] + h10 * ty1 + h01 * p2[1] + h11 * ty2;

        // Exact analytical derivative of the cubic spline
        const dh00 = 6 * t2 - 6 * t;
        const dh10 = 3 * t2 - 4 * t + 1;
        const dh01 = -6 * t2 + 6 * t;
        const dh11 = 3 * t2 - 2 * t;

        const dlng = dh00 * p1[0] + dh10 * tx1 + dh01 * p2[0] + dh11 * tx2;
        const dlat = dh00 * p1[1] + dh10 * ty1 + dh01 * p2[1] + dh11 * ty2;

        dense.push([lng, lat]);
        denseDeriv.push([dlng, dlat]);
      }
    }
    dense.push([nodes[n - 1][0], nodes[n - 1][1]]);
    denseDeriv.push(denseDeriv.length ? denseDeriv[denseDeriv.length - 1] : [1, 0]);

    // Cumulative distance along the dense spline
    const cum: number[] = [0];
    for (let i = 1; i < dense.length; i++) {
      cum.push(cum[i - 1] + haversineKm(dense[i - 1][1], dense[i - 1][0], dense[i][1], dense[i][0]));
    }
    this.totalKm = cum[cum.length - 1];

    // Uniform spatial resampling along the curve (Google Maps navigation quality)
    const nSamples = Math.max(80, Math.min(600, Math.round(this.totalKm / Math.min(sampleStepKm, 12))));
    const samples: [number, number][] = [];
    const cumS: number[] = [];
    const angles: number[] = [];
    let j = 0;

    for (let s = 0; s <= nSamples; s++) {
      const target = (s / nSamples) * this.totalKm;
      while (j < cum.length - 2 && cum[j + 1] < target) j++;
      const segLen = Math.max(1e-9, cum[j + 1] - cum[j]);
      const f = Math.min(1, Math.max(0, (target - cum[j]) / segLen));

      const lng = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f;
      const lat = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f;
      samples.push([lng, lat]);
      cumS.push(target);

      // Local tangent direction: blend analytical spline derivative with forward-backward chord
      const dlngA = denseDeriv[j][0] + (denseDeriv[j + 1][0] - denseDeriv[j][0]) * f;
      const dlatA = denseDeriv[j][1] + (denseDeriv[j + 1][1] - denseDeriv[j][1]) * f;
      const dmercA = mercY(lat + dlatA * 0.001) - mercY(lat - dlatA * 0.001);

      const prevPt = dense[Math.max(0, j - 1)];
      const nextPt = dense[Math.min(dense.length - 1, j + 2)];
      const dlngC = nextPt[0] - prevPt[0];
      const dmercC = mercY(nextPt[1]) - mercY(prevPt[1]);

      const dlng = Math.abs(dlngA) > 1e-5 ? dlngA : dlngC;
      const dmerc = Math.abs(dmercA) > 1e-5 ? dmercA : dmercC;

      // In CSS screen space: 0° is East (+X), Y increases downwards (South = +Y, North = -Y)
      const angle = Math.atan2(-dmerc, dlng) * R2D;
      angles.push(angle);
    }

    this.samples = samples;
    this.cumKm = cumS;
    this.angles = angles;
  }

  get distanceNm(): number {
    return Math.round(this.totalKm * NM_PER_KM);
  }

  /** Project a recorded vessel position onto the corridor (spec 1.2: progress
   * from the recorded fix, never from endpoint interpolation). */
  projectPoint(lng: number, lat: number): { progress: number; offRouteKm: number } {
    if (!this.samples || this.samples.length === 0) return { progress: 0, offRouteKm: 0 };
    let best = 0;
    let bestKm = Infinity;
    for (let i = 0; i < this.samples.length; i++) {
      const d = haversineKm(lat, lng, this.samples[i][1], this.samples[i][0]);
      if (d < bestKm) {
        bestKm = d;
        best = i;
      }
    }
    return { progress: best / Math.max(1, this.samples.length - 1), offRouteKm: bestKm };
  }

  pointAt(p: number): GcPos {
    if (!this.samples || this.samples.length === 0) {
      return { lng: 0, lat: 0, angle: 0 };
    }
    if (this.samples.length === 1) {
      return { lng: this.samples[0][0], lat: this.samples[0][1], angle: this.angles[0] ?? 0 };
    }
    const t = clamp01(p) * (this.samples.length - 1);
    const i = Math.min(this.samples.length - 2, Math.floor(t));
    const f = t - i;
    const a = this.samples[i];
    const b = this.samples[i + 1];
    const angleA = this.angles[i];
    const angleB = this.angles[i + 1];

    return {
      lng: a[0] + (b[0] - a[0]) * f,
      lat: a[1] + (b[1] - a[1]) * f,
      angle: lerpAngle(angleA, angleB, f),
    };
  }

  /** Angle in degrees at sample index (for headings). */
  angleAt(i: number): number {
    if (!this.angles || this.angles.length === 0) return 0;
    return this.angles[Math.max(0, Math.min(i, this.angles.length - 1))];
  }

  traveledCoords(p: number): [number, number][] {
    if (!this.samples || this.samples.length === 0) return [];
    if (this.samples.length === 1) return [[this.samples[0][0], this.samples[0][1]]];
    const t = clamp01(p) * (this.samples.length - 1);
    const i = Math.min(this.samples.length - 2, Math.floor(t));
    const pos = this.pointAt(p);
    return [...this.samples.slice(0, i + 1).map((s) => [s[0], s[1]] as [number, number]), [pos.lng, pos.lat]];
  }

  remainingCoords(p: number): [number, number][] {
    if (!this.samples || this.samples.length === 0) return [];
    if (this.samples.length === 1) return [[this.samples[0][0], this.samples[0][1]]];
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

/* ── shared sim-clock progress (same formula the overlay UI uses) ───────────
 * Position truth rules (spec §1.2/§2/§3):
 *  - ARRIVED → 1 · BOOKED → 0 · CUSTOMS_HOLD → pinned at destination customs
 *  - a recorded AIS fix anchors progress (calendar advance resumes FROM the fix)
 *  - otherwise calendar interpolation along the corridor (labeled estimated) */
export function liveProgressAt(ship: TraceShip, simNow: number): number {
  if (ship.liveStatus === "ARRIVED") return 1;
  if (ship.liveStatus === "BOOKED") return 0;
  if (ship.liveStatus === "CUSTOMS_HOLD") return 1; // hold is recorded at destination customs (KBSP)
  const end = ship.actualArrival ? +new Date(ship.actualArrival) : ship.eta ? +new Date(ship.eta) : null;
  const start = ship.departure ? +new Date(ship.departure) : 0;
  if (!end) return 0;
  if (ship.progressSource === "ais-anchored" && ship.progressAnchor != null && ship.vesselPosition) {
    const anchorAt = Math.max(+new Date(ship.vesselPosition.at), start);
    const span = Math.max(1, end - anchorAt);
    const t = clamp01((simNow - anchorAt) / span);
    return clamp01(ship.progressAnchor + t * (1 - ship.progressAnchor));
  }
  if (ship.liveStatus === "AT_PORT") {
    // at a transit point — freeze at the last recorded event, never sail past it
    const anchor = ship.lastEventAt ? +new Date(ship.lastEventAt) : simNow;
    return clamp01((Math.min(simNow, anchor) - start) / Math.max(1, end - start));
  }
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
