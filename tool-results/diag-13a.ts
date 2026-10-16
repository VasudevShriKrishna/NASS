/* TEMP DIAGNOSTIC — Task 13-a (read-only). Verifies corridor geometry,
 * land violations, DB agreement and speed math. Deleted after run. */
import { PrismaClient } from "@prisma/client";
import { resolveMaritimeRoute, viaFromLegs, liveProgressAt, MaritimeRoute, SEA_NODES } from "../src/lib/maritime-routes";
import { PORTS } from "../src/lib/geo";
import { readFileSync } from "node:fs";

const db = new PrismaClient({ log: [] });
const HOUR = 3_600_000;
const D2R = Math.PI / 180;
const R = 6371;
const hav = (a: number[], b: number[]) => {
  const dLat = (b[1] - a[1]) * D2R, dLng = (b[0] - a[0]) * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/* ── land polygons ── */
const bundle = JSON.parse(readFileSync("/home/z/my-project/public/geo/world-land-110m.json", "utf8"));
const polys: number[][][][] = bundle.fill.geometry.coordinates; // MultiPolygon
function inRing(pt: number[], ring: number[][]) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function onLand(pt: number[]): boolean {
  let hits = 0;
  for (const poly of polys) {
    let c = 0;
    for (const ring of poly) if (inRing(pt, ring)) c++;
    if (c % 2 === 1) return true; // even-odd (holes handled)
  }
  return false;
}

/* allowances */
const SUEZ = { lngMin: 31.9, lngMax: 33.15, latMin: 27.0, latMax: 31.75 }; // canal + Gulf of Suez + approaches
const portPts: number[][] = [...Object.values(PORTS).map((p) => [p.lng, p.lat]), ...Object.values(SEA_NODES).map((n) => [n.lng, n.lat])];
function allowed(pt: number[]): string | null {
  if (pt[0] >= SUEZ.lngMin && pt[0] <= SUEZ.lngMax && pt[1] >= SUEZ.latMin && pt[1] <= SUEZ.latMax) return "suez-corridor";
  for (const q of portPts) if (hav(pt, q) < 0.15 * 111.32) return "port/node-proximity";
  return null;
}
function violation(pt: number[]): boolean { return onLand(pt) && !allowed(pt); }

/* nearest node-pair attribution (which corridor segment a violation sits on) */
function segDist(p: number[], a: number[], b: number[]) { // planar deg approx
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, dx || dy ? ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy) : 0));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

const ALLOW = (name: string) => name; // readability helper
function testRoute(route: MaritimeRoute, keys: string[], label: string) {
  const v: { pt: number[]; near: string }[] = [];
  for (const s of route.samples) {
    const pt = [s[0], s[1]];
    if (violation(pt)) {
      // attribute to nearest node pair
      let best = "segment", bd = 1e9;
      const nodes = keys.map((k) => [SEA_NODES[k].lng, SEA_NODES[k].lat]);
      for (let i = 0; i < nodes.length - 1; i++) {
        const d = segDist(pt, nodes[i], nodes[i + 1]);
        if (d < bd) { bd = d; best = `${keys[i]}→${keys[i + 1]}`; }
      }
      v.push({ pt, near: best });
    }
  }
  if (v.length) {
    const uniq = [...new Set(v.map((x) => x.near))];
    const w = v.reduce((a, b) => (Math.abs(b.pt[0] - 32.3) > Math.abs(a.pt[0] - 32.3) ? b : a));
    console.log(`  ✗ ${label}: ${v.length}/${route.samples.length} samples on land | pairs: ${uniq.slice(0, 8).join(", ")} | worst ~[${w.pt[0].toFixed(2)}, ${w.pt[1].toFixed(2)}]`);
  } else console.log(`  ✓ ${label}: 0/${route.samples.length} land violations`);
  return v.length;
}

/* ── lanes copied verbatim from maritime-routes.ts (private consts) ── */
const KBS_APPROACH = ["HORMUZ_S", "GULF_INNER", "GULF_MID", "GULF_MID_W", "BAHRAIN_CHANNEL", "KBSP_APPROACH", "KBSP"];
const LANES: Record<string, string[]> = {
  SHANGHAI: ["SHANGHAI", "EAST_CHINA_SEA", "TAIWAN_STRAIT", "SCS_WEST", "SCS_CENTRAL", "VIETNAM_COAST", "BORNEO_W", "NATUNA_W", "SINGAPORE_STRAIT", "MALACCA_S", "MALACCA_N", "SUMATRA_W", "BAY_OF_BENGAL_S", "CEYLON_SE", "CEYLON_S", "COLOMBO_S", "LACCADIVE", "ARABIAN_SEA_SW", "ARABIAN_SEA_W", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  NINGBO: ["NINGBO", "EAST_CHINA_SEA", "TAIWAN_STRAIT", "SCS_WEST", "SCS_CENTRAL", "VIETNAM_COAST", "BORNEO_W", "NATUNA_W", "SINGAPORE_STRAIT", "MALACCA_S", "MALACCA_N", "SUMATRA_W", "BAY_OF_BENGAL_S", "CEYLON_SE", "CEYLON_S", "COLOMBO_S", "LACCADIVE", "ARABIAN_SEA_SW", "ARABIAN_SEA_W", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  GENOA: ["GENOA", "LIGURIAN_W", "W_CORSA_SARD", "W_SARDINIA", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  ANTWERP: ["ANTWERP", "ANTWERP_OUT", "DUTCH_COAST", "DOVER", "CHANNEL_MID", "CHANNEL_W", "BISCAY_N", "BISCAY_W", "GALICIA", "PORTUGAL", "GIBRALTAR_W", "GIBRALTAR", "ALBORAN", "ALBORAN_E", "BALEARIC_S", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  GOTHENBURG: ["GOTHENBURG", "KATTEGAT", "SKAGEN", "NORTH_SEA_DK", "NORTH_SEA", "DOVER", "CHANNEL_MID", "CHANNEL_W", "BISCAY_N", "BISCAY_W", "GALICIA", "PORTUGAL", "GIBRALTAR_W", "GIBRALTAR", "ALBORAN", "ALBORAN_E", "BALEARIC_S", "W_SARDINIA_S", "S_OF_SARDINIA", "SICILY_STRAIT_W", "SICILY_STRAIT", "MALTA_S", "S_OF_MALTA", "MED_SEA_E", "S_OF_CRETE", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
  IZMIR: ["IZMIR", "AEGEAN_S", "DODECANESE", "RHODES_S", "S_OF_CRETE_E", "MED_EAST", "PORT_SAID_APPROACH", "PORT_SAID", "SUEZ_CANAL", "GULF_OF_SUEZ", "RED_SEA_N", "RED_SEA_MID", "RED_SEA_MID2", "RED_SEA_S", "RED_SEA_MOUTH", "BAB_EL_MANDEB", "ADEN_W", "ADEN_E", "ARABIAN_SEA_N", "OMAN_COAST", "OMAN_CAPE", ...KBS_APPROACH],
};
const VIA_INS: Record<string, Record<string, string[]>> = {
  JEBEL_ALI: { GULF_INNER: ["GULF_INNER", "JEBEL_ALI", "GULF_MID", "GULF_MID_W", "BAHRAIN_CHANNEL", "KBSP_APPROACH", "KBSP"] },
  COLOMBO: { CEYLON_SE: ["CEYLON_SE", "COLOMBO_S", "COLOMBO", "CEYLON_SE", "LACCADIVE"] },
};
function applyVia(keys: string[], via: string[]) {
  let k = [...keys];
  for (const v of via) {
    const vk = Object.keys(VIA_INS).find((x) => v.toLowerCase().includes(x.toLowerCase().replace("_", " ")) || x.toLowerCase() === v.toLowerCase());
    if (!vk) continue;
    const ins = VIA_INS[vk];
    const anchor = Object.keys(ins).find((a) => k.includes(a));
    if (anchor) { const i = k.indexOf(anchor); k = [...k.slice(0, i), ...ins[anchor], ...k.slice(i + 1)]; }
  }
  return k;
}

/* fine node-pair scan (5 km) — finds straight-segment land cuts */
function scanPairs(keys: string[], label: string) {
  const bad: string[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = [SEA_NODES[keys[i]].lng, SEA_NODES[keys[i]].lat], b = [SEA_NODES[keys[i + 1]].lng, SEA_NODES[keys[i + 1]].lat];
    const d = hav(a, b), steps = Math.max(4, Math.round(d / 5));
    let hits = 0, worst: number[] | null = null;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (violation(pt)) { hits++; worst = pt; }
    }
    if (hits) bad.push(`${keys[i]}→${keys[i + 1]} (${hits}/${steps + 1} @5km, worst ~[${worst![0].toFixed(2)},${worst![1].toFixed(2)}])`);
  }
  console.log(bad.length ? `  ✗ ${label}: ${bad.join(" | ")}` : `  ✓ ${label}: no node-pair land cuts`);
}

console.log("=== A. CORRIDOR SAMPLER — full-sample PIP (45km MarineRoute samples) ===");
for (const [org, keys] of Object.entries(LANES)) {
  const r = new MaritimeRoute(keys);
  testRoute(r, keys, `lane ${org}→KBSP (${r.distanceNm} nm, ${r.samples.length} samples)`);
}
console.log("— via-insertion variants —");
const rJa = new MaritimeRoute(applyVia(LANES.ANTWERP, ["JEBEL_ALI"]));
testRoute(rJa, applyVia(LANES.ANTWERP, ["JEBEL_ALI"]), "Antwerp→KBSP via JEBEL_ALI");
const rCo = new MaritimeRoute(applyVia(LANES.SHANGHAI, ["COLOMBO"]));
testRoute(rCo, applyVia(LANES.SHANGHAI, ["COLOMBO"]), "Shanghai→KBSP via COLOMBO");
const rRoad = new MaritimeRoute(["ASKAR_QUARRY", "ASKAR_YARD"], 10);
console.log(`  ℹ ROAD Askar Quarry→Yard: ${rRoad.samples.length} samples — on Bahrain island BY DESIGN (land-leg provenance)`);

console.log("\n=== B. RAW NODE-PAIR STRAIGHT LINES (5km scan — land-corner cutting) ===");
for (const [org, keys] of Object.entries(LANES)) scanPairs(keys, org);
scanPairs(applyVia(LANES.ANTWERP, ["JEBEL_ALI"]), "ANTWERP via JEBEL_ALI");
scanPairs(applyVia(LANES.SHANGHAI, ["COLOMBO"]), "SHANGHAI via COLOMBO");

/* ── DB ── */
console.log("\n=== C. PER-SHIPMENT: current interpolated position vs land + DB agreement ===");
function deriveLiveStatus(s: any): string {
  if (s.actualArrival || ["ARRIVED", "DELIVERED", "PARTIALLY_DELIVERED"].includes(s.status)) return "ARRIVED";
  if (s.status === "CUSTOMS_HOLD" || (s.customsStatus ?? "").toLowerCase().startsWith("held")) return "CUSTOMS_HOLD";
  if (s.carrierEta && s.supplierPromisedEta && +s.carrierEta - +s.supplierPromisedEta > 36 * HOUR) return "DELAYED";
  if (["PLANNED", "BOOKED", "READY"].includes(s.status)) return "BOOKED";
  if (s.status === "AT_TRANSIT_POINT") return "AT_PORT";
  if (s.status === "UNKNOWN" || s.freshness === "unavailable") return "UNKNOWN";
  return "IN_TRANSIT";
}
const shipments = await db.shipment.findMany({
  orderBy: { ref: "asc" },
  include: { milestones: { orderBy: { eventTime: "asc" } }, legs: { orderBy: { seq: "asc" } } },
});
const now = Date.now();
for (const s of shipments) {
  const legs = s.legs.map((l: any) => ({ mode: l.mode, fromPoint: l.fromPoint, toPoint: l.toPoint }));
  const via = viaFromLegs(legs);
  const resolved = resolveMaritimeRoute(s.originPort, s.destinationPort, s.mode, via);
  const liveStatus = deriveLiveStatus(s);
  const start = s.milestones.length ? +new Date(s.milestones[0].eventTime) : +s.created;
  const end = s.actualArrival ? +s.actualArrival : s.displayEta ? +s.displayEta : null;
  const shipLike = { liveStatus, actualArrival: s.actualArrival?.toISOString() ?? null, eta: s.displayEta?.toISOString() ?? null, departure: new Date(start).toISOString() };
  const p = liveProgressAt(shipLike as any, now);
  const last = s.milestones[s.milestones.length - 1];
  const voyageHours = end ? Math.max(1, (end - start) / HOUR) : 0;
  const speedKn = resolved.route && voyageHours > 0 && !["ARRIVED", "BOOKED"].includes(liveStatus)
    ? Math.round((resolved.route.distanceNm / voyageHours) * 10) / 10 : null;
  console.log(`\n${s.ref} [${liveStatus}] ${s.originPort} → ${s.destinationPort} mode=${s.mode} via=[${via.join(",")||"—"}]`);
  let pos: { lng: number; lat: number } | null = null;
  if (!resolved.route) { console.log(`  route: NONE (${resolved.provenance}) — no marker drawn; speed=${speedKn}`); }
  else {
    pos = resolved.route.pointAt(p);
    const posLand = violation([pos.lng, pos.lat]);
    const rem = resolved.route.remainingCoords(p);
    const remV = rem.filter((c) => violation([c[0], c[1]]));
    const allV = resolved.route.samples.filter((c) => violation([c[0], c[1]]));
    console.log(`  corridor: ${resolved.provenance} ${resolved.route.distanceNm} nm | progress=${(p * 100).toFixed(1)}% | pos=[${pos.lng.toFixed(2)}, ${pos.lat.toFixed(2)}] onLand=${posLand ? "YES(!)" : "no"} | remaining violations=${remV.length}/${rem.length} | whole-corridor=${allV.length}/${resolved.route.samples.length}${allV.length ? ` (Suez-allowed excluded)` : ""}`);
    if (remV.length) { const w = remV[0]; console.log(`    first remaining violation ~[${w[0].toFixed(2)}, ${w[1].toFixed(2)}]`); }
    console.log(`  speedKn=${speedKn} (corridor ${resolved.route.distanceNm} nm / voyage ${voyageHours.toFixed(1)} h)${speedKn && speedKn > 40 ? "  ⚠ UNPHYSICAL" : ""}`);
  }
  console.log(`  DB latest event: ${last ? `${last.code} "${last.label}" @ ${last.location ?? "—"} (${new Date(last.eventTime).toISOString().slice(0, 16)}Z, src=${last.source})` : "no milestones"}`);
  if (["SHP-8803", "SHP-8805", "SHP-8806", "SHP-8807"].includes(s.ref) && pos) {
    const kb = [50.535, 26.177];
    const dKb = hav([pos.lng, pos.lat], kb);
    const dCol = hav([pos.lng, pos.lat], [79.85, 6.95]);
    console.log(`  CHECK: engine pos ${dKb.toFixed(0)} km from KBSP, ${dCol.toFixed(0)} km from Colombo; status=${s.status}, customs=${s.customsStatus ?? "—"}, displayEta=${s.displayEta?.toISOString().slice(0, 16) ?? "—"} (${s.displayEtaType ?? "—"})`);
  }
}
await db.$disconnect();
console.log("\n=== D. raw shipment.status values ===");
for (const s of shipments) console.log(`${s.ref}: status=${s.status} customs=${s.customsStatus ?? "—"} freshness=${s.freshness} actualArrival=${s.actualArrival?.toISOString().slice(0, 16) ?? "—"}`);
