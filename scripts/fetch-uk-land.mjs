// Fetches the UK land mask from OSM `natural=coastline` via Overpass
// (work list item 1.1; ADR-0006) and writes `data-raw/uk-land.json`.
//
// HUMAN STEP: run manually from a networked machine — this script is NOT part
// of the automated build chain. Once the file is committed, the build and the
// validator read that exact file (ADR-0006 self-consistency). A re-fetch is a
// rebuild event: refresh the SHA-256 provenance in `data/README.md`, then
// re-run the build twice (byte-identical ritual) and the validator.
//
// Output format: an array of polygons, each a list of linear rings
// [ [lon, lat], ... ]; outer rings counter-clockwise, holes clockwise (the
// convention `polygon-clipping` expects). Rings are closed (repeat the start
// point).
//
// The fetch box is intentionally WIDER than the public map box (ADR-0001:
// lon -9.5..2.0): ring closure needs the FULL coast of every island of
// interest. Ireland's western coast reaches ~10.5W; clipping it at -9.5W
// opens the whole Irish loop, which is then dropped as an uncloseable
// fragment — losing Northern Ireland entirely (ADR-0006 requires it). The
// build keeps its ADR-0001 box as the bounds safety net, so out-of-box land
// (west Ireland) never reaches the map. Island coverage is NOT hardcoded:
// the file is exactly what Overpass returns for the box below (ADR-0006);
// only genuinely uncloseable fragments (beyond the fetch box) are dropped.
//
// Netiquette mirrors `scripts/geocode-postcodes.mjs`: explicit User-Agent,
// 30s backoff on 429/502/503, bounded retries per mirror (then next mirror)
// — no unbounded loop. Other 4xx (e.g. parse rejections) are not retried;
// the response body is printed on every non-2xx so failures are diagnosable.

import fs from 'node:fs';

const UA = 'HospiceInfoproto/0.1 (OSM land-mask research; contact: james)';

// Fetch box: ADR-0001's public map box (lon -9.5..2.0, lat 49.5..61.5)
// widened west to -11.0 so the full Irish coast closes (header above). The
// build/validator keep the map box as the bounds safety net (ADR-0001).
// The query applies the box as an element-level box filter (see QUERY).
const BOX = { minLat: 49.5, minLon: -11.0, maxLat: 61.5, maxLon: 2.0 };

// Overpass mirrors, tried in order (item 1.1: >= 2 source options).
// kumi first: the busiest workhorse for heavy `out geom` (observed: 504
// under saturation, healthy when it has capacity). de is fast for light
// queries and parses core syntax fine, but returns 502 under load with a
// "human-operated tools only" notice. osm.ch and private.coffee are the
// cheap documented fallbacks.
const MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// The box is applied as a *plain element-level box filter*, not via an
// area object: `nwr[natural=coastline](minLat,minLon,maxLat,maxLon)` is
// core Overpass syntax (v0.5 era) and parses on every mirror. The two area
// box idioms were both ruled out live on 2026-10-23 (probe v2/v3):
// `area(barebox:…)` — `line 1: parse error: Unknown query clause` on all
// four mirrors, even for a tiny control box (the volunteer mirrors run old
// OSM3S builds without `barebox`); `area[360~…][~360~…]` — parses everywhere
// but on overpass-api.de matches a degenerate area set (1 coastline
// element in the full-UK box), i.e. the pseudo-key does not do what the
// box contract needs. The element box selects exactly the coastline within
// the ADR-0006 box; anything outside the box (e.g. the west-Ireland sliver
// beyond -9.5°W) is clipped away by the same box the tessellation itself
// uses, so nothing is lost for the land-mask contract.
// `nwr` (way/node/relation) is required: a bare `natural=coastline(...)`
// filter is rejected as `Unknown type "natural"` on all four mirrors;
// OSM coastline is ways, with polygon relations only in a few places.
// timeout:600 — 300s is too short for the GB+Ireland box with `out geom`
// on kumi; 600s (the budget the fetchers' own fetch ceiling leaves after
// transport) is the value used by the working probe.
const QUERY =
  `[out:json][timeout:600];` +
  `nwr[natural=coastline](` +
  `${BOX.minLat},${BOX.minLon},${BOX.maxLat},${BOX.maxLon});` +
  'out geom;';

const MAX_STEPS = 2000000;

async function post(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(960000), // heavy geometry (GB+Ireland box); ~16 min ceiling
  });
}

// Overpass `out geom` points are `{id?, lat, lon}` objects (NOT [lon,lat]
// pairs); downstream ring math works on `[lon, lat]` pairs rebuilt from the
// key string via pointAt, so the key's order is what matters here.
//
// Guard (2026-10-24): a kumi run returned 35,476 elements and then crashed
// here with `Cannot read properties of undefined (reading 'toFixed')` —
// some geometry point lacks a numeric `lon`/`lat`. Skipping such points
// would open rings and silently drop islands (ADR-0006), so fail loudly
// with the offending point in hand; the file is not written (the crash
// precedes the write step) and the next live run logs the point's shape,
// which is what the real fix is based on.
function key(pt) {
  if (!pt || typeof pt.lon !== 'number' || typeof pt.lat !== 'number') {
    throw new Error(`geometry point without numeric lon/lat: ${JSON.stringify(pt)}`);
  }
  return `${pt.lon.toFixed(6)},${pt.lat.toFixed(6)}`;
}

async function fetchElements() {
  let lastErr = null;
  for (const url of MIRRORS) {
    console.log(`overpass: ${url}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await post(url, `data=${encodeURIComponent(QUERY)}`);
        if (r.status === 429 || r.status === 502 || r.status === 503 || r.status === 504) {
          const body = (await r.text()).replace(/\s+/g, ' ');
          // includes kumi's `request_read_and_idx::timeout` / "too busy" wording
          if (/timed ?out|request_read_and_idx::timeout|too busy/i.test(body)) {
            console.log(`  status ${r.status}: server-side timeout — mirror cap reached, trying next mirror`);
            break; // re-sending the same query at the same cap cannot succeed
          }
          console.log(`  status ${r.status} (${body.slice(0, 200)}) — back off 30s (attempt ${attempt}/3)`);
          await new Promise((res) => setTimeout(res, 30000));
          continue;
        }
        if (!r.ok) {
          // OSM3S error pages put the actual message AFTER the license
          // boilerplate, so slice the *tail* of the body.
          const body = (await r.text()).slice(-500).replace(/\s+/g, ' ');
          console.log(`  status ${r.status} — not retryable: ${body}`);
          break; // permanent rejection (e.g. parse error): go straight to the next mirror
        }
        const j = await r.json();
        const elements = j.elements?.filter((el) => el.type === 'relation' || el.type === 'way') ?? [];
        console.log(`  fetched ${elements.length} coastline elements`);
        return elements;
      } catch (e) {
        lastErr = e;
        console.log(`  ${e.message} — retry in 30s (attempt ${attempt}/3)`);
        await new Promise((res) => setTimeout(res, 30000));
      }
    }
    console.log('  mirror exhausted, trying next');
  }
  throw new Error(`all Overpass mirrors failed: ${lastErr?.message ?? 'no data'}`);
}

function buildRings(elements) {
  // Undirected segment graph over 6-decimal-precision nodes.
  const adj = new Map(); // nodeKey -> [neighborKey, ...] (with duplicates)
  let ways = 0;
  const addSeg = (a, b) => {
    const ka = key(a), kb = key(b);
    if (ka === kb) return;
    for (const [k, other] of [[ka, kb], [kb, ka]]) {
      if (!adj.has(k)) adj.set(k, []);
      adj.get(k).push(other);
    }
  };
  for (const el of elements) {
    const geoms = el.type === 'way'
      ? [el.geometry ?? []]
      : (el.members ?? []).map((m) => m.geometry).filter((g) => Array.isArray(g) && g.length >= 2);
    for (const g of geoms) {
      if (g.length >= 2) ways++;
      for (let i = 0; i + 1 < g.length; i++) addSeg(g[i], g[i + 1]);
    }
  }
  console.log(`joined ${ways} coastline way geometries, ${adj.size} nodes`);

  const pointAt = (k) => k.split(',').map(Number);
  const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const used = new Set();
  const rings = [];
  let fragments = 0;

  // Coastlines form degree-2 rings internally; bbox-edge fragments end in
  // degree-1 nodes and are dropped (documented above).
  for (const [startKey, neighbors] of adj) {
    if (neighbors.length !== 2) continue;
    if (used.has(edgeKey(startKey, neighbors[0])) && used.has(edgeKey(startKey, neighbors[1]))) continue;
    const ring = [pointAt(startKey)];
    let prev = null, node = startKey, closed = false;
    for (let step = 0; step < MAX_STEPS && !closed; step++) {
      const candidates = (adj.get(node) ?? []).filter((n) => !used.has(edgeKey(node, n)));
      // The circuit closes only when the walk comes back to the start with an
      // unused edge; never force the return after a single step (that would
      // turn every edge pair into a degenerate 2-step "ring").
      const next = (node === startKey && prev !== null)
        ? candidates[0]
        : candidates.find((n) => n !== prev) ?? candidates[0];
      if (next === undefined) break;
      used.add(edgeKey(node, next));
      prev = node;
      node = next;
      ring.push(pointAt(node));
      closed = node === startKey;
    }
    if (closed && ring.length >= 4) rings.push(ring);
    else if (!closed) fragments++;
  }
  // Count the segments left in dangling fragments (informational only).
  let fragSegs = 0;
  for (const [k, neighbors] of adj) {
    for (const n of neighbors) if (!used.has(edgeKey(k, n))) fragSegs++;
  }
  console.log(`closed rings: ${rings.length}; open fragments: ${fragments} (${fragSegs / 2} segments, dropped)`);
  return rings;
}

function signedArea(ring) {
  let a = 0;
  for (let i = 0; i + 1 < ring.length; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i + 1][1];
  return a / 2;
}

function orient(rings, ccw) {
  return rings.map((ring) => {
    const positive = signedArea(ring) >= 0;
    const reversed = (ccw ? positive : !positive) ? ring : [ring[ring.length - 1], ...ring.slice(0, -1)];
    reversed.push(reversed[0]); // keep closed
    return reversed;
  });
}

function pointInRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function main() {
  const elements = await fetchElements();
  const rings = buildRings(elements);
  if (!rings.length) {
    console.log('no closed rings — the fetch likely returned partial geometry; try another mirror.');
    process.exit(1);
  }
  const outers = orient(rings.filter((r) => signedArea(r) >= 0), true);
  const holes = orient(rings.filter((r) => signedArea(r) < 0), false);
  const polygons = outers.map((outer) => [outer]);
  for (const hole of holes) {
    const host = polygons.find((poly) => pointInRing(hole[0], poly[0]));
    if (host) host.push(hole);
    else console.log(`  WARN: hole ring ${hole[0].join(', ')} has no enclosing outer ring — dropped`);
  }
  polygons.sort((a, b) => Math.abs(signedArea(b[0])) - Math.abs(signedArea(a[0])));
  const outPath = 'data-raw/uk-land.json';
  fs.writeFileSync(outPath, JSON.stringify(polygons));
  console.log(`wrote ${outPath} (${polygons.length} polygon(s), ${(fs.statSync(outPath).size / 1024).toFixed(1)} KiB)`);
  console.log('next: record its SHA-256 in data/README.md, then re-run the build chain (MAINTENANCE.md).');
}

main().catch((e) => {
  console.log(`fetch failed: ${e.message}`);
  process.exit(1);
});
