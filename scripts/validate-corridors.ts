/* Corridor geometry regression validator (spec §1.2 + §21 map tests).
 *
 * Run: bun scripts/validate-corridors.ts
 *
 * Fails (exit 1) when any registered origin→KBSP corridor:
 *   a) has 45km-samples sitting on land outside the allowed Suez-canal zone
 *      / port-node proximity, or
 *   b) cuts land corners on a 5km node-pair straight-line scan.
 *
 * Land mask: public/geo/world-land-110m.json (same 110m dataset the map
 * renders). Coarse coastlines (±5-15km) can produce single-point artifacts
 * near shores — the report lists them so future node edits can be judged.
 */
import { MaritimeRoute, SEA_NODES, LANES_TO_KBSP, VIA_INSERTIONS } from "../src/lib/maritime-routes";
import { PORTS } from "../src/lib/geo";
import { readFileSync } from "node:fs";

const D2R = Math.PI / 180;
const R = 6371;
const hav = (a: number[], b: number[]) => {
  const dLat = (b[1] - a[1]) * D2R, dLng = (b[0] - a[0]) * D2R;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const bundle = JSON.parse(readFileSync(new URL("../public/geo/world-land-110m.json", import.meta.url), "utf8"));
const polys: number[][][][] = bundle.fill.geometry.coordinates;
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
  for (const poly of polys) {
    let c = 0;
    for (const ring of poly) if (inRing(pt, ring)) c++;
    if (c % 2 === 1) return true;
  }
  return false;
}

/* Suez waterway allowance as a polygon tracing the legitimate corridor
 * (spec 1.2: canals are legitimate): canal + Great Bitter Lake + Gulf of
 * Suez + Strait of Gubal, bounded by the Egyptian (west) and Sinai (east)
 * coasts — excludes the Nile interior and the Sinai interior. */
const SUEZ_POLY: number[][] = [
  [32.05, 31.5], [32.15, 30.9], [32.1, 30.5], [32.2, 30.0], [32.45, 29.6],
  [32.6, 29.3], [32.75, 29.0], [32.9, 28.65], [33.0, 28.3], [33.1, 27.95],
  [33.2, 27.65], [33.35, 27.45], [33.55, 27.3], [34.6, 27.3],
  [34.5, 27.6], [34.2, 27.9], [33.9, 28.2], [33.7, 28.5], [33.55, 28.85],
  [33.4, 29.2], [33.25, 29.55], [33.1, 29.85], [32.9, 30.2], [32.8, 30.6],
  [32.7, 31.0], [32.6, 31.5],
];
function inSuezWaterway(pt: number[]): boolean {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = SUEZ_POLY.length - 1; i < SUEZ_POLY.length; j = i++) {
    const xi = SUEZ_POLY[i][0], yi = SUEZ_POLY[i][1], xj = SUEZ_POLY[j][0], yj = SUEZ_POLY[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const portPts: number[][] = [...Object.values(PORTS).map((p) => [p.lng, p.lat]), ...Object.values(SEA_NODES).map((n) => [n.lng, n.lat])];
/* Coarse-110m coastlines cannot represent delta/estuary/gulf-fjord shipping
 * channels (Yangtze mouth, Zhoushan, Westerschelde, Gulf of Izmir) — port
 * approaches at these registered ports get a wider proximity allowance.
 * Everything else (straits, mid-ocean) stays at the strict 0.15° gate. */
const WIDE_APPROACH_PORTS = new Set(["SHANGHAI", "NINGBO", "ANTWERP", "IZMIR"]);
const widePortPts: number[][] = Object.entries(SEA_NODES)
  .filter(([k]) => WIDE_APPROACH_PORTS.has(k))
  .map(([, n]) => [n.lng, n.lat]);
function allowed(pt: number[]): boolean {
  if (inSuezWaterway(pt)) return true;
  for (const q of portPts) if (hav(pt, q) < 0.15 * 111.32) return true;
  for (const q of widePortPts) if (hav(pt, q) < 0.5 * 111.32) return true;
  return false;
}
const violation = (pt: number[]) => onLand(pt) && !allowed(pt);

function applyVia(keys: string[], via: string[]): string[] {
  let k = [...keys];
  for (const v of via) {
    const vk = Object.keys(VIA_INSERTIONS).find((x) => v.toLowerCase().includes(x.toLowerCase().replace("_", " ")) || x.toLowerCase() === v.toLowerCase());
    if (!vk) continue;
    const ins = VIA_INSERTIONS[vk];
    const anchor = Object.keys(ins).find((a) => k.includes(a));
    if (anchor) { const i = k.indexOf(anchor); k = [...k.slice(0, i), ...ins[anchor], ...k.slice(i + 1)]; }
  }
  return k;
}

let failures = 0;
function testRoute(keys: string[], label: string) {
  const route = new MaritimeRoute(keys);
  const bad = route.samples.filter((s) => violation([s[0], s[1]]));
  if (bad.length) {
    failures++;
    const pts = bad.slice(0, 4).map((p) => `[${p[0].toFixed(2)},${p[1].toFixed(2)}]`).join(" ");
    console.log(`  ✗ ${label}: ${bad.length}/${route.samples.length} samples on land — ${pts}`);
  } else {
    console.log(`  ✓ ${label} (${route.distanceNm} nm)`);
  }
}
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
    if (hits) bad.push(`${keys[i]}→${keys[i + 1]} (${hits}/${steps + 1} worst ~[${worst![0].toFixed(2)},${worst![1].toFixed(2)}])`);
  }
  if (bad.length) { failures++; console.log(`  ✗ ${label}: ${bad.join(" | ")}`); }
  else console.log(`  ✓ ${label}`);
}

console.log("=== corridor samples (45km) ===");
for (const [org, keys] of Object.entries(LANES_TO_KBSP)) testRoute(keys, `lane ${org}→KBSP`);
testRoute(applyVia(LANES_TO_KBSP.ANTWERP, ["JEBEL_ALI"]), "Antwerp→KBSP via JEBEL_ALI");
testRoute(applyVia(LANES_TO_KBSP.SHANGHAI, ["COLOMBO"]), "Shanghai→KBSP via COLOMBO");
console.log("=== node-pair 5km scan ===");
for (const [org, keys] of Object.entries(LANES_TO_KBSP)) scanPairs(keys, org);
scanPairs(applyVia(LANES_TO_KBSP.ANTWERP, ["JEBEL_ALI"]), "ANTWERP via JEBEL_ALI");
scanPairs(applyVia(LANES_TO_KBSP.SHANGHAI, ["COLOMBO"]), "SHANGHAI via COLOMBO");
console.log(failures === 0 ? "\nALL CORRIDORS CLEAN" : `\n${failures} corridor check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
