/* Generates public/geo/world-land-110m.json — a compact, fully bundled
 * world dataset for the MapLibre operation map (no external tiles):
 *   fill      → merged land MultiPolygon (dark fill)
 *   coast     → exterior coastline mesh (gold outline)
 *   borders   → interior country borders mesh (faint)
 *   graticule → 15° lon/lat grid lines
 * Source: world-atlas countries-110m (Natural Earth, public domain).
 * Run: bun scripts/generate-world-land.mjs                        */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import * as topojson from "topojson-client";
import { geoGraticule10 } from "d3-geo";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"));
const countries = topo.objects.countries;

// drop Antarctica (id 010) — mercator distortion, keeps the frame clean
const geom = countries.geometries.filter((g) => String(g.id) !== "010");

/* Per-country polygons (NOT topojson.merge): merged continent rings can
 * back-wrap across the antimeridian and render as giant fill wedges.
 * All geometry must stay STRICTLY within ±180 — geojson-vt clamps
 * out-of-range lngs back into the visible world as wedge artifacts.    */
const feats = topojson.feature(topo, { type: "GeometryCollection", geometries: geom }).features;
const ringAreaOf = (ring) =>
  ring.reduce((s, p, i) => {
    const q = ring[(i + 1) % ring.length];
    return s + (p[0] * q[1] - q[0] * p[1]);
  }, 0) / 2;
const hasWrapJump = (rings) => {
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (Math.abs(b[0] - a[0]) > 180) return true;
    }
  }
  return false;
};
const inRange = (rings) => {
  for (const ring of rings) {
    for (const pt of ring) {
      if (pt[0] > 180.01 || pt[0] < -180.01) return false;
    }
  }
  return true;
};
const polys = [];
for (const f of feats) {
  const parts = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const rings of parts) {
    if (hasWrapJump(rings)) {
      /* dateline band: keep only east-of-±180 parts that fit after +360 shift */
      let mn = Infinity;
      for (const pt of rings[0]) mn = Math.min(mn, pt[0]);
      if (mn < -140) {
        const shifted = rings.map((r) => r.map(([lng, lat]) => [lng + 360, lat]));
        if (inRange(shifted)) polys.push(shifted);
      }
      continue;
    }
    if (inRange(rings)) polys.push(rings);
  }
}
const merged = { type: "MultiPolygon", coordinates: polys };

const coast = topojson.mesh(topo, { type: "GeometryCollection", geometries: geom }, (a, b) => a === b);
const borders = topojson.mesh(topo, { type: "GeometryCollection", geometries: geom }, (a, b) => a !== b);
/* Unwrap longitude jumps across the antimeridian: Natural Earth splits
 * Russia/Fiji at ±180; merged geometry then contains back-wrapping
 * segments that MapLibre renders as giant wedges. Shift by ±360 for
 * continuity — MapLibre clips the overflow beyond ±180 cleanly.        */
const unwrapLine = (line) => {
  const out = [];
  let prev = null;
  let shift = 0;
  for (const pt of line) {
    let lng = pt[0] + shift;
    if (prev !== null) {
      while (lng - prev > 180) {
        lng -= 360;
        shift -= 360;
      }
      while (prev - lng > 180) {
        lng += 360;
        shift += 360;
      }
    }
    out.push([Math.round(lng * 1000) / 1000, pt[1]]);
    prev = lng;
  }
  return out;
};
const unwrapAndClip = (geom) => {
  const clipLine = (line) => {
    const out = [];
    let prev = null;
    let shift = 0;
    for (const pt of line) {
      let lng = pt[0] + shift;
      if (prev !== null) {
        while (lng - prev > 180) {
          lng -= 360;
          shift -= 360;
        }
        while (prev - lng > 180) {
          lng += 360;
          shift += 360;
        }
      }
      prev = lng;
      if (lng > 180.01 || lng < -180.01) continue;
      out.push([Math.round(lng * 1000) / 1000, pt[1]]);
    }
    return out;
  };
  if (geom.type === "MultiLineString") geom.coordinates = geom.coordinates.map(clipLine).filter((l) => l.length > 1);
  return geom;
};
unwrapAndClip(coast);
unwrapAndClip(borders);
const graticule = geoGraticule10();

const round = (c) =>
  typeof c === "number" ? Math.round(c * 1000) / 1000 : Array.isArray(c) ? c.map(round) : c;

const feat = (geometry) => ({ type: "Feature", properties: {}, geometry: round(geometry) });

const out = {
  fill: feat(merged),
  coast: feat(coast),
  borders: feat(borders),
  graticule: feat(graticule),
};

mkdirSync("public/geo", { recursive: true });
writeFileSync("public/geo/world-land-110m.json", JSON.stringify(out));
console.log("world-land-110m.json bytes:", JSON.stringify(out).length);
