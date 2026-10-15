// Builds the app's data files from the raw extracts:
//   data-raw/gp-practices-target.json  (CQC directory extract)
//   data-raw/postcode-geo.csv          (Nominatim geocoding)
//   scripts/catchment-map.mjs          (hospice list + catchment outcodes)
// Emits:
//   public/data/hospices.json          (id, name, town, lat, lon, color, kind, source)
//   public/data/practices.json         (id, name, address, postcode, lat, lon, outcode, hospiceId)
//   public/data/catchments.json        (hospiceId, polygon, practiceCount, outcodes, kind)
import fs from 'node:fs';
import { CATCHMENTS } from './catchment-map.mjs';

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

// ---- convex hull (monotonic chain) -------------------------------------------
function convexHull(points) {
  const pts = [...new Map(points.map((p) => [`${p.lat},${p.lon}`, p])).values()].sort(
    (a, b) => a.lon - b.lon || a.lat - b.lat
  );
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Buffer the hull outward a bit so the envelope doesn't hug the points.
function bufferHull(hull, degrees) {
  if (hull.length < 3) return hull;
  const cx = hull.reduce((s, p) => s + p.lat, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.lon, 0) / hull.length;
  return hull.map((p) => {
    const dx = p.lat - cx;
    const dy = p.lon - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { lat: p.lat + (dx / len) * degrees, lon: p.lon + (dy / len) * degrees };
  });
}

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
let unassigned = 0;
for (const p of practicesOut) {
  if (p.lat == null) { unassigned++; continue; }
  const matches = byCatchment.get(p.id) || [];
  if (matches.length === 1) {
    p.hospiceId = matches[0];
  } else if (matches.length > 1) {
    // tie: nearest hospice (with known location) wins
    let best = null, bestD = Infinity;
    for (const id of matches) {
      const h = hospById.get(id);
      if (!h.lat) continue;
      const d = distKm(p, h);
      if (d < bestD) { bestD = d; best = id; }
    }
    p.hospiceId = best ?? matches[0];
  } else {
    // no catchment match: nearest hospice within 50 km (border effect), else unassigned
    let best = null, bestD = 50;
    for (const h of hospicesOut) {
      if (!h.lat) continue;
      const d = distKm(p, h);
      if (d < bestD) { bestD = d; best = h.id; }
    }
    if (best) p.hospiceId = best;
    else unassigned++;
  }
}

// ---- catchment polygons --------------------------------------------------------
const catchmentsOut = CATCHMENTS.map((h) => {
  const pts = practicesOut
    .filter((p) => p.hospiceId === h.id && p.lat != null)
    .map((p) => ({ lat: p.lat, lon: p.lon }));
  const hull = bufferHull(convexHull(pts), 0.03);
  return {
    hospiceId: h.id,
    name: h.name,
    kind: h.kind,
    outcodes: h.outcodes,
    practiceCount: pts.length,
    polygon: hull.length >= 3 ? hull : null,
  };
});

// ---- write outputs -------------------------------------------------------------
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/hospices.json', JSON.stringify(hospicesOut, null, 2));
fs.writeFileSync('public/data/practices.json', JSON.stringify(practicesOut, null, 2));
fs.writeFileSync('public/data/catchments.json', JSON.stringify(catchmentsOut, null, 2));

// ---- report ---------------------------------------------------------------------
console.log(`practices: ${practicesOut.length} (geocoded ${practicesOut.length - missingGeo.length}, missing ${missingGeo.length})`);
if (missingGeo.length) console.log('missing geo:', [...new Set(missingGeo)].slice(0, 30).join(' '));
const perHospice = catchmentsOut.map((c) => `${c.name}=${c.practiceCount}`).join('  ');
console.log(`assigned to a catchment: ${practicesOut.filter((p) => p.hospiceId).length}, unassigned: ${unassigned}`);
console.log(perHospice);
console.log('wrote public/data/{hospices,practices,catchments}.json');
