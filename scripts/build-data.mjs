// Builds the app's data files from the UK register extracts (work list item 14):
//   data-raw/hospices-all.json           (merged nation registers, item 10)
//   data-raw/gp-practices-{en,sc,ni,wales}.json
//   data-raw/postcode-geo.csv            (Nominatim geocoding, items 12-13)
//   scripts/catchment-map.mjs            (20 curated EN catchments — provenance + shop id remap only, ADR-0005)
//   data-raw/shops-website.json          (charity shop list, scraped from hospice websites)
//   data-raw/shops-geo.json              (Nominatim geocoding of those addresses)
// Emits:
//   public/data/hospices.json    (id, name, town, postcode, lat, lon, color, kind, source, website, cqcUrl, curated, nation)
//   public/data/practices.json   (id, name, address, postcode, lat, lon, nation, hospiceId)
//   public/data/catchments.json  (hospiceId, name, nation, kind, curated, practiceCount, polygons)
//   public/data/shops.json       (id, name, address, postcode, lat, lon, hospiceId, outsideCatchment, source)
//
// Envelopes (ADR-0005): every geocoded practice is assigned to exactly ONE
// hospice — the nearest hospice site (haversine). No postcode-outcode matching,
// no hand-pinned catchments. A Voronoi tessellation of the practice +
// hospice-site points over the UK box gives each hospice a polygon (union of
// its cells): adjacent catchments share a continuous edge — no overlaps, no
// gaps. Each catchment is then clipped to the UK land mask (ADR-0006:
// `data-raw/uk-land.json`; no sea, no box-only fallback). A hospice whose
// postcode has no coordinate yet is unplaced (logged); it receives no polygon
// and no practices.
import fs from 'node:fs';
import { Delaunay } from 'd3-delaunay';
import polygonClipping from 'polygon-clipping';
import { CATCHMENTS } from './catchment-map.mjs';
import { loadMaskWithBBoxes, polysBBox, bboxesOverlap } from './land-mask.mjs';
const { union, intersection } = polygonClipping;

// ADR-0002 id remap: the 20 legacy catchment slugs used by the scraped shop
// list (data-raw/shops-website.json) map 1:1 to the canonical `en-<cqcId>`
// identities. The build fails if a shop id does not resolve.
const SLUG_TO_ID = Object.fromEntries(
  CATCHMENTS.map((c) => [c.id, `en-${(c.cqcUrl.match(/location\/(1-\d+)/) || [])[1]}`])
);

// UK tessellation box (ADR-0001: wide enough to include all four nations).
const BOX = [-9.5, 49.5, 2.0, 61.5]; // [x0, y0, x1, y1] = [west, south, east, north]

// ADR-0004: deterministic per-hospice colour from its canonical id —
// FNV-1a 32-bit hash → hue mod 360 → hsl(hue, 65%, 45%) as hex. No palette.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function hashToColor(id) {
  const hue = fnv1a(id) % 360;
  const s = 0.65, l = 0.45;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + hue / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ---- load inputs -----------------------------------------------------------
const hospicesAll = JSON.parse(fs.readFileSync('data-raw/hospices-all.json', 'utf8'));
const PRACTICE_FILES = {
  en: 'data-raw/gp-practices-en.json',
  sc: 'data-raw/gp-practices-sc.json',
  ni: 'data-raw/gp-practices-ni.json',
  wales: 'data-raw/gp-practices-wales.json',
};
const practices = [];
for (const [nation, f] of Object.entries(PRACTICE_FILES)) {
  for (const p of JSON.parse(fs.readFileSync(f, 'utf8'))) practices.push({ ...p, nation });
}
const geoRows = fs
  .readFileSync('data-raw/postcode-geo.csv', 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .slice(1);
const geo = new Map();
for (const line of geoRows) {
  const [pc, lat, lon] = line.split(',');
  if (lat && lon) geo.set(pc, { lat: Number(lat), lon: Number(lon) });
}
const geoOf = (postcode) => geo.get((postcode || '').toUpperCase()) ?? null;

// ADR-0006: land mask for the coastline clip. The raw OSM file is human-
// fetched (`node scripts/fetch-uk-land.mjs`) and committed; land-mask.mjs
// loads it (FAILING FAST without it — no silent box-only fallback) and
// returns a deterministically DP-simplified copy (tol 0.001 deg, in memory)
// so the ~2.6M-segment OSM mask stays within polygon-clipping's 1M-endpoint
// queue cap.
const maskBBoxes = loadMaskWithBBoxes(); // [poly, bbox][]

// ---- hospices ----------------------------------------------------------------
const hospicesOut = hospicesAll.map((h) => {
  const g = geoOf(h.postcode);
  return {
    id: h.id,
    name: h.name,
    town: h.town,
    postcode: h.postcode,
    lat: g ? g.lat : null,
    lon: g ? g.lon : null,
    color: hashToColor(h.id),
    kind: h.kind,
    source: h.source,
    website: h.website || '',
    cqcUrl: h.cqcUrl || '',
    curated: !!h.curated,
    nation: h.nation,
  };
});
const unplacedHospices = hospicesOut.filter((h) => h.lat == null).length;
console.log(`hospices: ${hospicesOut.length} (unplaced: ${unplacedHospices})`);

// ---- practices + assignment (nearest-hospice rule, ADR-0005) -------------------
const missingGeo = [];
const practicesOut = practices.map((p) => {
  // Source-provided coordinates take precedence (the Wales DataMap layer ships
  // lat/lon and no postcode); postcode geocoding (ADR-0002) locates everything else.
  const g = p.lat != null && p.lon != null ? { lat: p.lat, lon: p.lon } : geoOf(p.postcode);
  if (!g) missingGeo.push(p.postcode);
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    postcode: p.postcode,
    lat: g ? g.lat : null,
    lon: g ? g.lon : null,
    nation: p.nation,
    hospiceId: null,
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

const placed = hospicesOut.filter((h) => h.lat != null);
let unassigned = 0;
for (const p of practicesOut) {
  if (p.lat == null || !placed.length) { unassigned++; continue; }
  let best = null, bestD = Infinity;
  for (const h of placed) {
    const d = distKm(p, h);
    if (d < bestD) { bestD = d; best = h.id; }
  }
  if (best) p.hospiceId = best;
  else unassigned++;
}

// ---- catchment polygons (Voronoi tessellation) --------------------------------
// Vertices: every assigned geocoded practice plus each placed hospice site (so
// a placed hospice always owns a non-empty cell). Each Voronoi cell keeps its
// practice/hospice label; cells per label are unioned into one polygon.
const vertices = [];
const labels = [];
for (const p of practicesOut) {
  if (p.lat != null && p.hospiceId) { vertices.push({ lat: p.lat, lon: p.lon }); labels.push(p.hospiceId); }
}
for (const h of placed) {
  vertices.push({ lat: h.lat, lon: h.lon });
  labels.push(h.id);
}
const voronoi = vertices.length
  ? Delaunay.from(vertices, (v) => v.lon, (v) => v.lat).voronoi(BOX)
  : null;
const ringsByLabel = new Map();
if (voronoi) {
  for (let i = 0; i < vertices.length; i++) {
    const ring = voronoi.cellPolygon(i);
    if (!ring) continue;
    const id = labels[i];
    if (!ringsByLabel.has(id)) ringsByLabel.set(id, []);
    ringsByLabel.get(id).push(ring); // ring: [x, y][]
  }
}
const polygonsByLabel = new Map();
for (const [id, rings] of ringsByLabel) {
  const merged = union(rings.map((ring) => [ring]));
  // ADR-0006: clip the catchment to the land mask — no sea. BOX above remains
  // the voronoi bounds safety net. A cell whose land intersection is empty
  // (e.g. post-coastal islands) gets `polygons: []`. Prefilter the mask to
  // the land polygons whose bbox overlaps the cell's bbox so each clip
  // operand is small (the simplified mask is still large nationwide).
  const cbb = polysBBox(merged);
  const near = maskBBoxes.filter(([, bb]) => bboxesOverlap(bb, cbb)).map(([p]) => p);
  const clipped = near.length ? intersection(merged, near) : [];
  const out = clipped
    .flatMap((poly) => poly.map((r) => r.map(([x, y]) => ({ lat: y, lon: x }))))
    .filter((pts) => pts.length >= 3);
  polygonsByLabel.set(id, out);
}
console.log(`voronoi: ${vertices.length} vertices, ${new Set(labels).size} labelled cells`);

const catchmentsOut = placed.map((h) => {
  const pts = practicesOut.filter((p) => p.hospiceId === h.id && p.lat != null);
  return {
    hospiceId: h.id,
    name: h.name,
    nation: h.nation,
    kind: h.kind,
    curated: h.curated,
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
let shopsUnresolved = 0;
const shopsOut = [];
for (const [i, s] of shopRows.entries()) {
  const g = shopGeo[s.postcode ?? s.address.join(', ').toUpperCase()];
  if (!g?.lat) { shopGeoMissing++; continue; }
  const hospiceId = SLUG_TO_ID[s.hospiceId];
  if (!hospiceId) { shopsUnresolved++; continue; }
  const rings = catchmentRings.get(hospiceId) ?? [];
  shopsOut.push({
    id: `shop-${i}`,
    name: s.name,
    address: s.address.join(', '),
    postcode: s.postcode,
    lat: g.lat,
    lon: g.lon,
    hospiceId,
    outsideCatchment: !pointInRings(g.lat, g.lon, rings),
    source: s.source,
  });
}
const shopsOutside = shopsOut.filter((s) => s.outsideCatchment).length;
console.log(`shops: ${shopsOut.length} (geo missing ${shopGeoMissing}); outside own catchment: ${shopsOutside}; unresolved ids: ${shopsUnresolved}`);
if (shopsUnresolved) process.exit(1);
const outsideByHospice = new Map();
for (const s of shopsOut) {
  if (s.outsideCatchment) outsideByHospice.set(s.hospiceId, (outsideByHospice.get(s.hospiceId) ?? 0) + 1);
}
for (const [id, n] of [...outsideByHospice.entries()].sort((a, b) => b[1] - a[1])) console.log(`  outside catchment ${id}: ${n}`);

// ---- write outputs -------------------------------------------------------------
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/hospices.json', JSON.stringify(hospicesOut));
fs.writeFileSync('public/data/practices.json', JSON.stringify(practicesOut));
fs.writeFileSync('public/data/catchments.json', JSON.stringify(catchmentsOut));
fs.writeFileSync('public/data/shops.json', JSON.stringify(shopsOut));

// ---- report ---------------------------------------------------------------------
console.log(`practices: ${practicesOut.length} (geocoded ${practicesOut.length - missingGeo.length}, missing ${missingGeo.length})`);
if (missingGeo.length) console.log(`missing geo (first 30): ${[...new Set(missingGeo)].slice(0, 30).join(' ')}`);
console.log(`assigned: ${practicesOut.filter((p) => p.hospiceId).length}, unassigned: ${unassigned}`);
const perNation = new Map();
for (const p of practicesOut) perNation.set(p.nation, (perNation.get(p.nation) ?? 0) + 1);
console.log(`per-nation practices: en=${perNation.get('en') ?? 0} sc=${perNation.get('sc') ?? 0} ni=${perNation.get('ni') ?? 0} wales=${perNation.get('wales') ?? 0}`);
const perNationAssigned = new Map();
for (const p of practicesOut) if (p.hospiceId) perNationAssigned.set(p.nation, (perNationAssigned.get(p.nation) ?? 0) + 1);
console.log(`per-nation assigned: en=${perNationAssigned.get('en') ?? 0} sc=${perNationAssigned.get('sc') ?? 0} ni=${perNationAssigned.get('ni') ?? 0} wales=${perNationAssigned.get('wales') ?? 0}`);
console.log('wrote public/data/{hospices,practices,catchments,shops}.json');
