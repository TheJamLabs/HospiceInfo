// Builds the app's data files from the raw extracts:
//   data-raw/gp-practices-target.json  (CQC directory extract)
//   data-raw/postcode-geo.csv          (Nominatim geocoding)
//   scripts/catchment-map.mjs          (hospice list + catchment outcodes)
//   data-raw/shops-website.json        (charity shop list, scraped from hospice websites)
//   data-raw/shops-geo.json            (Nominatim geocoding of those addresses)
// Emits:
//   public/data/hospices.json          (id, name, town, lat, lon, color, kind, source)
//   public/data/practices.json         (id, name, address, postcode, lat, lon, outcode, hospiceId)
//   public/data/catchments.json        (hospiceId, polygons, practiceCount, outcodes, kind)
//   public/data/shops.json             (id, name, address, postcode, lat, lon, hospiceId, outsideCatchment, source)
//
// Envelopes: every practice is assigned to exactly one hospice (see assignment
// rule below), then a Voronoi tessellation of the practice + hospice-site
// points gives each hospice a polygon (union of its cells). Adjacent
// catchments therefore share a continuous edge: no overlaps, no gaps.
import fs from 'node:fs';
import { Delaunay } from 'd3-delaunay';
import polygonClipping from 'polygon-clipping';
import { CATCHMENTS } from './catchment-map.mjs';
const { union } = polygonClipping;

// ---- load inputs -----------------------------------------------------------
const practices = JSON.parse(fs.readFileSync('data-raw/gp-practices-target.json', 'utf8'));
const geoRows = fs.readFileSync('data-raw/postcode-geo.csv', 'utf8').split(/\r?\n/).filter(Boolean).slice(1);
const geo = new Map();
for (const line of geoRows) {
  const [pc, lat, lon] = line.split(',');
  if (lat && lon) geo.set(pc.toUpperCase(), { lat: Number(lat), lon: Number(lon) });
}

// ---- hospice locations: geocode their unit postcodes if we have them -------
// The geocoder covered practice postcodes; hospice units are fetched here if present.
const hospiceLatLon = new Map();
for (const h of CATCHMENTS) {
  const g = geo.get(h.postcode.toUpperCase());
  if (g) hospiceLatLon.set(h.id, g);
}
const missingHospiceGeo = CATCHMENTS.filter((h) => !hospiceLatLon.has(h.id)).map((h) => h.postcode);
console.log(`hospices geocoded from practice-geo file: ${hospiceLatLon.size}/${CATCHMENTS.length}`, missingHospiceGeo.length ? `missing: ${missingHospiceGeo.join(', ')}` : '');

// ---- palette: 20 clearly distinguishable colors -----------------------------
const PALETTE = [
  '#1f77b4', '#d62728', '#2ca02c', '#9467bd', '#ff7f0e',
  '#17becf', '#bcbd22', '#e377c2', '#8c564b', '#393b79',
  '#0f766e', '#7c3aed', '#be123c', '#15803d', '#a16207',
  '#1d4ed8', '#9d174d', '#4d7c0f', '#5b21b6', '#0e7490',
];

const hospicesOut = CATCHMENTS.map((h, i) => {
  const ll = hospiceLatLon.get(h.id) ?? null;
  return {
    id: h.id,
    name: h.name,
    town: h.town,
    postcode: h.postcode,
    lat: ll ? ll.lat : null,
    lon: ll ? ll.lon : null,
    color: PALETTE[i % PALETTE.length],
    kind: h.kind,
    source: h.source,
    website: h.website,
    cqcUrl: h.cqcUrl,
  };
});

// ---- practice -> hospice assignment ------------------------------------------
const outcodeOf = (pc) => pc.split(' ')[0].toUpperCase();

const byCatchment = new Map(); // practice idx -> list of hospice ids whose outcodes match
const missingGeo = [];
const practicesOut = practices.map((p, i) => {
  const g = geo.get(p.postcode.toUpperCase());
  if (!g) {
    missingGeo.push(p.postcode);
    return {
      id: i, name: p.name, address: p.address, postcode: p.postcode,
      lat: null, lon: null, outcode: outcodeOf(p.postcode), hospiceId: null,
    };
  }
  const oc = outcodeOf(p.postcode);
  const matches = CATCHMENTS.filter((h) => h.outcodes.includes(oc)).map((h) => h.id);
  byCatchment.set(i, matches);
  return {
    id: i, name: p.name, address: p.address, postcode: p.postcode,
    lat: g.lat, lon: g.lon, outcode: oc, hospiceId: null,
  };
});

// distance km (haversine)
function distKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const hospById = new Map(hospicesOut.map((h) => [h.id, h]));
const nearestHospiceIds = (p, candidates) => {
  let best = null, bestD = Infinity;
  for (const id of candidates) {
    const h = hospById.get(id);
    if (!h?.lat) continue;
    const d = distKm(p, h);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
};
let unassigned = 0;
for (const p of practicesOut) {
  if (p.lat == null) { unassigned++; continue; }
  const matches = byCatchment.get(p.id) || [];
  if (matches.length === 1) {
    // exactly one published catchment claims this outcode
    p.hospiceId = matches[0];
  } else {
    // tie (overlapping catchments) or no published match:
    // nearest hospice site wins, so every practice gets a catchment
    p.hospiceId =
      nearestHospiceIds(p, matches.length ? matches : CATCHMENTS.map((h) => h.id)) ?? null;
    if (!p.hospiceId) unassigned++;
  }
}

// ---- catchment polygons (Voronoi tessellation) --------------------------------
// Vertices: every assigned practice point plus each hospice site (so a
// hospice always owns a non-empty cell). Each Voronoi cell keeps its
// practice/hospice label; cells per label are unioned into one polygon.
const vertices = [];
const labels = [];
for (const p of practicesOut) {
  if (p.lat != null && p.hospiceId) { vertices.push({ lat: p.lat, lon: p.lon }); labels.push(p.hospiceId); }
}
for (const h of hospicesOut) {
  if (h.lat != null) { vertices.push({ lat: h.lat, lon: h.lon }); labels.push(h.id); }
}
const voronoi = Delaunay.from(vertices, (v) => v.lon, (v) => v.lat).voronoi([
  -3.8, 52.9, // x0, y0 (west, south)
  -1.9, 55.05, // x1, y1 (east, north)
]);
const ringsByLabel = new Map();
for (let i = 0; i < vertices.length; i++) {
  const ring = voronoi.cellPolygon(i);
  if (!ring) continue;
  const id = labels[i];
  if (!ringsByLabel.has(id)) ringsByLabel.set(id, []);
  ringsByLabel.get(id).push(ring); // ring: [x, y][]
}
const polygonsByLabel = new Map();
for (const [id, rings] of ringsByLabel) {
  // union expects array of polygons (each = array of rings of [x, y])
  const merged = union(rings.map((ring) => [ring]));
  const out = merged.flatMap((poly) => poly.map((r) => r.map(([x, y]) => ({ lat: y, lon: x }))))
    .filter((pts) => pts.length >= 3);
  polygonsByLabel.set(id, out);
}
console.log(`voronoi: ${vertices.length} vertices, ${new Set(labels).size} labelled cells`);

const catchmentsOut = CATCHMENTS.map((h) => {
  const pts = practicesOut.filter((p) => p.hospiceId === h.id && p.lat != null);
  return {
    hospiceId: h.id,
    name: h.name,
    kind: h.kind,
    outcodes: h.outcodes,
    practiceCount: pts.length,
    polygons: polygonsByLabel.get(h.id) ?? [],
  };
});

// ---- charity shops ---------------------------------------------------------------
// Shops are listed by the hospices' own websites (data-raw/shops-website.json) and
// geocoded with Nominatim (data-raw/shops-geo.json). A shop is flagged
// outsideCatchment when its point is not inside its own hospice's catchment
// polygon — i.e. it fundraises beyond the area the hospice serves.
function pointInRings(lat, lon, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i].lon, yi = ring[i].lat;
      const xj = ring[j].lon, yj = ring[j].lat;
      const crosses = (yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (crosses) inside = !inside;
    }
  }
  return inside;
}

const shopGeo = JSON.parse(fs.readFileSync('data-raw/shops-geo.json', 'utf8'));
const shopRows = JSON.parse(fs.readFileSync('data-raw/shops-website.json', 'utf8'));
const catchmentRings = new Map(catchmentsOut.map((c) => [c.hospiceId, c.polygons]));
let shopGeoMissing = 0;
const shopsOut = [];
for (const [i, s] of shopRows.entries()) {
  const g = shopGeo[s.postcode ?? s.address.join(', ').toUpperCase()];
  if (!g?.lat) { shopGeoMissing++; continue; }
  const rings = catchmentRings.get(s.hospiceId) ?? [];
  shopsOut.push({
    id: `shop-${i}`,
    name: s.name,
    address: s.address.join(', '),
    postcode: s.postcode,
    lat: g.lat,
    lon: g.lon,
    hospiceId: s.hospiceId,
    outsideCatchment: !pointInRings(g.lat, g.lon, rings),
    source: s.source,
  });
}
const shopsOutside = shopsOut.filter((s) => s.outsideCatchment).length;
console.log(`shops: ${shopsOut.length} (geo missing ${shopGeoMissing}); outside own catchment: ${shopsOutside}`);
const outsideByHospice = new Map();
for (const s of shopsOut) {
  if (s.outsideCatchment) outsideByHospice.set(s.hospiceId, (outsideByHospice.get(s.hospiceId) ?? 0) + 1);
}
for (const [id, n] of [...outsideByHospice.entries()].sort((a, b) => b[1] - a[1])) console.log(`  outside catchment ${id}: ${n}`);

// ---- write outputs -------------------------------------------------------------
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/hospices.json', JSON.stringify(hospicesOut, null, 2));
fs.writeFileSync('public/data/practices.json', JSON.stringify(practicesOut, null, 2));
fs.writeFileSync('public/data/catchments.json', JSON.stringify(catchmentsOut, null, 2));
fs.writeFileSync('public/data/shops.json', JSON.stringify(shopsOut, null, 2));

// ---- report ---------------------------------------------------------------------
console.log(`practices: ${practicesOut.length} (geocoded ${practicesOut.length - missingGeo.length}, missing ${missingGeo.length})`);
if (missingGeo.length) console.log('missing geo:', [...new Set(missingGeo)].slice(0, 30).join(' '));
const perHospice = catchmentsOut.map((c) => `${c.name}=${c.practiceCount}`).join('  ');
console.log(`assigned to a catchment: ${practicesOut.filter((p) => p.hospiceId).length}, unassigned: ${unassigned}`);
console.log(perHospice);
console.log('wrote public/data/{hospices,practices,catchments}.json');
