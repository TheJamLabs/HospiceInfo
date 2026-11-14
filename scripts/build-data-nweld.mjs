// Builds the app's data files from the UK register extracts (work list item 14):
//   data-raw/hospices-all.json           (merged nation registers, item 10)
//   data-raw/gp-practices-{en,sc,ni,wales}.json
//   data-raw/postcode-geo.csv            (Nominatim geocoding, items 12-13)
//   scripts/catchment-map.mjs            (20 curated EN catchments — provenance + shop id remap only, ADR-0005)
//   data-raw/shops-website.json          (charity shop list, scraped from hospice websites)
//   data-raw/shops-geo.json              (Nominatim geocoding of those addresses)
//   data-raw/roi-border.json             (OSM ODbL ROI boundary ring, C6-1/ADR-0034)
// Emits:
//   public/data/hospices.json    (id, name, town, postcode, lat, lon, color, kind, source, website, cqcUrl, curated, children, nation)
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
import polygonClipping from 'polygon-clipping';
import { CATCHMENTS } from './catchment-map.mjs';
import { loadMaskWithBBoxes, polysBBox, bboxesOverlap } from './land-mask.mjs';
const { intersection } = polygonClipping;

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
// ADR-0021: operator manual geo for the 9 unresolvable BT unit postcodes.
// Committed file, provenance in data/README.md; manual entries win over geocoder.
let manualGeo;
try {
  manualGeo = JSON.parse(fs.readFileSync('data-raw/manual-geo-ni.json', 'utf8'));
} catch (err) {
  console.error(`manual-geo-ni.json: ${err.message} — aborting build (ADR-0021 fail-fast)`);
  process.exit(1);
}
const manualEntries = manualGeo.entries;
for (let i = 0; i < manualEntries.length; i++) {
  const e = manualEntries[i];
  if (i > 0 && e.postcode <= manualEntries[i - 1].postcode) {
    console.error(`manual-geo-ni.json: entries not sorted code-unit ascending by postcode ("${manualEntries[i - 1].postcode}" >= "${e.postcode}") — aborting (ADR-0021 fail-fast)`);
    process.exit(1);
  }
  if (!(e.lat > 49 && e.lat < 60 && e.lon > -12 && e.lon < 3)) {
    console.error(`manual-geo-ni.json: ${e.postcode} coordinates out of UK range (lat ${e.lat}, lon ${e.lon}) — aborting (ADR-0021 fail-fast)`);
    process.exit(1);
  }
}
for (const e of manualGeo.entries) { geo.set(e.postcode, { lat: e.lat, lon: e.lon }); }
const geoOf = (postcode) => geo.get((postcode || '').toUpperCase()) ?? null;

// ADR-0006: land mask for the coastline clip. The raw OSM file is human-
// fetched (`node scripts/fetch-uk-land.mjs`) and committed; land-mask.mjs
// loads it (FAILING FAST without it — no silent box-only fallback) and
// returns a deterministically DP-simplified copy (tol 0.001 deg, in memory)
// so the ~2.6M-segment OSM mask stays within polygon-clipping's 1M-endpoint
// queue cap.
const maskBBoxes = loadMaskWithBBoxes(); // [poly, bbox][]

// C6-1 (ADR-0034): ODbL-pinned ROI (Republic of Ireland) boundary ring — the
// NI–ROI border. NI catchment cells are clipped to this ring AFTER the land
// clip so no cell area falls outside Northern Ireland's coastline.
let roiRingPoly = null;
try {
  const roi = JSON.parse(fs.readFileSync('data-raw/roi-border.json', 'utf8'));
  if (!Array.isArray(roi.ring) || roi.ring.length < 3) throw new Error('ring missing or degenerate');
  roiRingPoly = [roi.ring.map(([x, y]) => [x, y])];
  console.log(`roi border: relation ${roi.relationId} (${roi.relationName}), ${roi.ring.length} ring points, fetched ${roi.fetchDate}`);
} catch (err) {
  console.error(`data-raw/roi-border.json: ${err.message} — aborting build (C6-1/ADR-0034 fail-fast)`);
  process.exit(1);
}

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
    children: !!h.children,
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

// C6-2 (ADR-0034): mergeTwo — robust two-polygon merge (union) for the
// tessellation. polygon-clipping's sweep line is not robust against this
// input family (shared box-boundary edges, near-collinear vertices), so
// build the union by segment arrangement:
//   1. split every ring edge at ALL points where a paired edge's endpoint
//      lands on it (proper crossings, T-touches, collinear overlaps);
//   2. subdivide into integer-endpoint primitives (S = 1e8, 1 mm) that also
//      keep their float start, direction, and exact doubled midpoint
//      (mx,my = p0x+p1x, unrounded);
//   3. keep exactly the primitives on the boundary of (A ∪ B), endpoint-
//      based: each primitive carries its origin ring o. It is "on" the
//      other ring when an endpoint sits on that ring's edge (1e-13
//      relative) AND the primitive is parallel to it — a shared boundary
//      span. Kept = on its own ring XOR swallowed: a primitive on ring k
//      is dropped if contained in the other ring (either endpoint
//      strictly inside — convex cells), kept as a shared co-edge when on
//      both, dropped when on neither;
//   4. dedup identical kept primitives (collinear overlapping input edges
//      split at the same integer points), then chain into closed rings.
// The input is a union (convex cells with disjoint interiors).
function mergeTwo(polyA, polyB) {
  const S = 1e8; // 1 mm integer grid (ring vertices are pre-nudged at 1e-10 deg: fine)
  // polyA/polyB are [ring][] poly lists — already flat ring lists.
  const rings = [...polyA, ...polyB];
  const es = [];
  for (let ri = 0; ri < rings.length; ri++) {
    const ring = rings[ri];
    const n = ring.length;
    for (let i = 0; i < n; i++) es.push({ a: ring[i], b: ring[(i + 1) % n], ts: [0, 1], o: ri });
  }
  // 1. arrangement: split every edge at ALL points where a paired edge's
  // endpoint lands on it — proper crossings, T-touches, and collinear
  // overlaps (projected on the dominant axis). Without endpoint splits a
  // segment spanning a T-junction keeps one primitive with no uniform
  // containment count.
  for (let i = 0; i < es.length; i++) {
    for (let j = i + 1; j < es.length; j++) {
      const e1 = es[i], e2 = es[j];
      const ax = e1.a[0], ay = e1.a[1], bx = e1.b[0], by = e1.b[1];
      const cx = e2.a[0], cy = e2.a[1], dx = e2.b[0], dy = e2.b[1];
      const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
      const den = rx * sy - ry * sx;
      const push = (edge, t) => {
        if (t >= -1e-12 && t <= 1 + 1e-12)
          edge.ts.push(t < 0 ? 0 : t > 1 ? 1 : t);
      };
      if (Math.abs(den) < 1e-24) {
        // parallel: only collinear pairs overlap
        if (Math.abs(rx * (cy - ay) - ry * (cx - ax)) > 1e-12 * Math.hypot(rx, ry)) continue;
        const tOn1 = (px, py) =>
          Math.abs(rx) >= Math.abs(ry) ? (px - ax) / rx : (py - ay) / ry;
        const tOn2 = (px, py) =>
          Math.abs(sx) >= Math.abs(sy) ? (px - cx) / sx : (py - cy) / sy;
        push(e1, tOn1(cx, cy)); push(e1, tOn1(dx, dy));
        push(e2, tOn2(ax, ay)); push(e2, tOn2(bx, by));
      } else {
        // Q = a + t*r1 = c + u*s2 is the single intersection of the two
        // infinite lines; t and u are its parameters on e1 and e2.
        const tQ = ((cx - ax) * sy - (cy - ay) * sx) / den;
        const uQ = ((cx - ax) * ry - (cy - ay) * rx) / den;
        // Split only at TRUE incidences (Q on both segments): shared
        // endpoints, T-touches, proper crossings. Skew pairs used to split
        // each other at a phantom Q — their line intersection falls inside
        // one segment and far outside the other — which over-fragmented
        // real cells into orphan slivers (T1: 18 edges -> 30 primitives,
        // all leaf-pruned to zero area; T3: hole-filling 20-point ring).
        if (tQ >= -1e-12 && tQ <= 1 + 1e-12 && uQ >= -1e-12 && uQ <= 1 + 1e-12) {
          push(e1, tQ);
          push(e2, uQ);
        }
      }
    }
  }
  // 2. subdivide edges at the intersection parameters, integer endpoints.
  // Each primitive also keeps its float direction vector and exact float
  // midpoint (p0 + p1, unrounded) — used later for orientation at shared
  // midpoints, where edge endpoints are known exactly.
  const edges = [];
  for (const e of es) {
    const ts = [...new Set(e.ts)].sort((x, y) => x - y);
    for (let k = 0; k + 1 < ts.length; k++) {
      const t0 = ts[k], t1 = ts[k + 1];
      if (t1 - t0 < 1e-9) continue;
      const rx = e.b[0] - e.a[0], ry = e.b[1] - e.a[1];
      const p0x = e.a[0] + t0 * rx, p0y = e.a[1] + t0 * ry;
      const p1x = e.a[0] + t1 * rx, p1y = e.a[1] + t1 * ry;
      edges.push({
        x1: Math.round(p0x * S), y1: Math.round(p0y * S),
        x2: Math.round(p1x * S), y2: Math.round(p1y * S),
        p0x, p0y, crx: p1x - p0x, cry: p1y - p0y,
        mx: p0x + p1x, my: p0y + p1y,
        o: e.o,
      });
    }
  }
  // 3. per-primitive union-boundary classification (endpoint+containment rule;
  // see the C6-2 note below the winding helper for the derivation).
  const winding = (ring) => {
    let a = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % ring.length];
      a += x0 * y1 - x1 * y0;
    }
    return a > 0 ? 1 : -1;
  };
  const ringWinding = rings.map(winding);
  // +1 = outer ring (CCW), -1 = hole ring (CW). The accumulated catchment
  // can carry holes — a label's cells ringing a single other label's cell
  // around a Voronoi vertex form a genuine catchment pocket — so a merge
  // sees polyA's outer ring PLUS its holes plus the new cell: N > 2 input
  // rings in general.
  const role = ringWinding.map((w) => (w > 0 ? 1 : -1));
  // C6-2 (ADR-0034) — union-boundary classification, N-ring rule.
  //
  // Why the earlier 2-ring versions failed:
  //   (a) midpoint orientation (ringClass at (p0+p1)/2): shared-vertex
  //       float drift ~1e-12 deg misclassified midpoints as "false
  //       crossings" → chain dangles.
  //   (b) relative-1e-13 containment band sat below the ~1e-12 drift →
  //       containment flip-flopped; exact collinear T-touches fell out as
  //       not-contained → orphaned primitives on the `none` drop.
  //   (c) "on both rings ⇒ shared, keep": kept adjacent-cell shared spans
  //       whose interiors lie on OPPOSITE sides of the span — union
  //       INTERIOR, not boundary → "did not close" (both rings' A–B span
  //       live on one lattice segment; one must drop).
  //   (d) the endpoint+winding 2-ring rule hard-coded exactly two rings
  //       (`on[1-o]`, `cnd[1-o]`): the first hole (3 input rings) made
  //       `cnd[o]` undefined and crash the build.
  //
  // The rule this version implements (any N input rings; simple,
  // interior-disjoint, meeting only at shared vertices):
  //   ∂U = the span positions whose two sides sit on OPPOSITE sides of
  //   the union interior, for U = Σ_r role_r · interior(r).
  //   Each primitive (a sub-segment of its origin ring's edge) is probed
  //   at its MIDPOINT, offset e = 1e-6 deg off the span (left / right
  //   unit normal of the span direction):
  //     inU(s) = Σ_r role_r · interior(r, q_s) > 0,  s ∈ {left, right}
  //   Keep  ⟺  inU(left) XOR inU(right).
  //   Midpoint, not endpoints: rings meet only at arrangement vertices,
  //   so a probe L/2 off the vertices is strictly off every ring edge
  //   line, while an endpoint probe within 1e-6·sin(θ) of a near-
  //   collinear adjacent edge (θ < ~0.3 deg at a turn) falls in
  //   interior()'s (|dx|+|dy|)/2·1e-9 on-line band and votes 0 — the
  //   mixed vote that made endpoint self-checks fire (the 1e-5/1e-4
  //   pre-nudges keep other LATTICE lines ≥ ~1e-5 deg away, not the
  //   ring's own adjacent edges).
  //   The origin ring is probed like any other: its own probes sit 1e-6
  //   deg on the interior / exterior side of its edge line, so interior()
  //   answers +1 / 0 for them without a shortcut.
  //   Holes: role -1 excludes the carved chamber from inU; when the cell
  //   that owns the pocket is finally merged in, its spans and the hole
  //   ring's coincident spans dedup as antiparallel co-edge twins and the
  //   hole closes.
  // Swallowed/dropped spans drop symmetrically across all rings in play
  // and kept arcs terminate at arrangement vertices, so each kept set
  // forms closed Euler cycles — section 5's start-key chaining + DEDUP
  // (identical integer endpoints, direction-blind) then unites the
  // antiparallel co-edge twins.
  // C6-2 (ADR-0034, Amendment 3): a proper even-odd (ray-cast) point-in-
  // polygon test, returning the ring's winding sign when inside. The
  // previous version counted "point left of every edge" (pos && !neg) —
  // a convexity test: for the staircase (CONCAVE) outer ring of an
  // accumulated catchment almost every interior point sits right of some
  // distant edge and read as OUTSIDE (0). inU then saw both probe sides of
  // an old boundary edge as exterior and dropped the genuine boundary
  // (583 leaf-pruned edges, coverage 1.41%). Even-odd is exact for simple
  // rings convex or concave; on-line keeps the 1e-9 relative band → 0
  // (probes are 1e-6 deg away from the probed span's own line, so a ring
  // votes 0 only when the point genuinely sits on one of ITS lines).
  const interior = (ri, px, py) => {
    const ring = rings[ri];
    let inside = false, onLine = false;
    for (let j = 0; j < ring.length; j++) {
      const ax = ring[j][0], ay = ring[j][1];
      const bx = ring[(j + 1) % ring.length][0], by = ring[(j + 1) % ring.length][1];
      const dx = bx - ax, dy = by - ay;
      const v = dx * (py - ay) - dy * (px - ax);
      if (Math.abs(v) <= (Math.abs(dx) + Math.abs(dy)) / 2 * 1e-9) {
        onLine = true;
        break;
      }
      // Edge crosses the horizontal ray at py (so dy !== 0): toggle when the
      // crossing x sits to the right of px (px < xint).
      if ((ay > py) !== (by > py) && px < ax + (bx - ax) * (py - ay) / dy) {
        inside = !inside;
      }
    }
    // Pure even-odd indicator, NO winding sign: role[] already encodes the
    // hole (role = -1 for CW rings), so multiplying by ringWinding would
    // double-negate the carve — inU = sum(role*inside) would count the
    // chamber as UNION-INTERIOR (role -1 x winding -1 = +1), flipping every
    // boundary probe on the hole ring and on any cell filling the hole
    // (inU > 0 on both sides -> XOR keeps neither). Role stays the single
    // source of orientation.
    return onLine ? 0 : inside ? 1 : 0;
  };
  const inc = new Uint8Array(edges.length);
  const edgeInfo = new Array(edges.length).fill('');
  const PROBE = 1e-6; // deg: 3 orders above shared-vertex drift (~1e-12),
                      // 4 orders below the shortest off-boundary distance
                      // (~1e-4) — probes are always strictly one-sided.
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const p1x = e.p0x + e.crx, p1y = e.p0y + e.cry;
    const len = Math.hypot(e.crx, e.cry) || 1;
    const nx = e.cry / len, ny = -e.crx / len; // left unit normal of span dir
    // w(q) = Σ_r role_r·interior(r, q) — signed winding count at probe q
    // (integer: +k inside k hulls, minus any holes containing q). Returned
    // RAW, not binary: a line with one hull both sides has |w| ∈ {0,1} and
    // is true interior (drop), while a line with a DIFFERENT disjoint hull on
    // each side has w = ±1/±1 — equal, |w| = 1 < 2, but it is a hull
    // boundary that must survive; two disjoint hulls sharing one side give
    // |w| = 2 on that side and a boundary on the other, also kept.
    const sideIn = (dx, dy, px, py) => {
      const qx = px + dx * PROBE, qy = py + dy * PROBE;
      let w = 0;
      for (let r = 0; r < rings.length; r++) w += role[r] * interior(r, qx, qy);
      return w;
    };
    // Probe at the span MIDPOINT, not the endpoints: rings meet only at
    // arrangement vertices, so a probe L/2 away from the vertices is
    // strictly off every ring edge line (the 1e-9 relative on-line band in
    // interior() measures (|dx|+|dy|)/2·1e-9 ≈ 5e-9 deg for a 0.01 deg
    // edge — a probe within 1e-6·sin(θ) of a near-collinear adjacent edge
    // (θ < ~0.3 deg at a turn) lands in that band and votes 0, mixing the
    // side status. The midpoint keeps 1e-6·sin(θ) ≥ (L/2)·sin(θ) ≈ 1e-6
    // scale, clear of every other edge line for spans down to L ~ 1e-3.
    const mx = e.mx / 2, my = e.my / 2; // exact doubled midpoint (pre-rounded)
    const inL = sideIn(nx, ny, mx, my);
    const inR = sideIn(-nx, -ny, mx, my);
    // Spec above: Keep ⟺ inU(left) XOR inU(right) — exactly one side is
    // union-interior (|w| ≥ 1) and the other is exterior (w = 0). Includes
    // multiplicity steps (0/2: a doubly-covered side; keep), and drops the
    // 1/2 interior lines the old (inL === inR && |inL| < 2) rule kept:
    // one hull both sides at DIFFERENT multiplicities (e.g. the {504,347}
    // x=51 / x=51.0001 lines, {1,2}) are union-INTERIOR — they dangle the
    // chain (odd-degree vertices → "too short"/"did not close"). Both-0
    // (cancelled by a coincident hole) is interior too; no ring can sit
    // strictly exterior on both sides of its own edge, so it cannot occur.
    const keep = (Math.abs(inL) === 0) !== (Math.abs(inR) === 0) ? 1 : 0;
    // Boundary edges must circulate consistently for Section 5's directed
    // chain to close; source rings may wind either way (outer vs hole), so
    // force interior-on-TRUE-LEFT (CCW). (nx,ny)=(cry,-crx)/len is the
    // RIGHT normal: inL probes the right side, inR the left — keep as
    // stored when the union interior is on the left (inL=0, |inR|≥1),
    // flip when it is on the right (inL≠0). inL is a signed count: the
    // keep rule above compares |inL| vs |inR|, so right-side interior
    // includes the negative-winding (hole) case inL<0 — `inL > 0` missed
    // it and left a CW twin on a coincident boundary (the C6-2 "chain of
    // 9 edges did not close" case); `inL !== 0` flips it, and the positive
    // half of previously-validated cases (inL>0) is bit-identical.
    // Both-sides interior (|w|≥2 separation) falls to the flip branch,
    // matching old binary behaviour for the {1,1} reading. CW output is
    // fatal downstream: the next merge's winding() reads role -1 from a
    // CW ring and treats it as a hole (T5b).
    if (keep && inL !== 0) [e.x1, e.y1, e.x2, e.y2] = [e.x2, e.y2, e.x1, e.y1];
    inc[i] = keep;
    edgeInfo[i] = `o=${e.o} inL=${inL} inR=${inR} ${keep ? 'keep' : 'drop'}`;
  }
  // C6-2 debug hook (env-gated, removable): dump the full edge table when
  // chain construction fails, so the dangling primitive can be inspected.
  const C62_DBG = !!process.env.C62_DBG;
  let c62Prev = -1;
  const c62State = { label: '', merge: 0, nRings: 0 };
  if (C62_DBG) {
    globalThis.__c62Set = (o) => {
      c62State.label = o.label;
      c62State.merge = o.merge;
      c62State.nRings = o.nRings;
    };
    globalThis.__c62Dump = (reason, chainEdges) => {
      const chainSet = new Set(chainEdges);
      const lines = [
        `== mergeTwo ${reason} | label=${c62State.label} merge#${c62State.merge} rings=${c62State.nRings} edges=${edges.length}`,
      ];
      const rawRings = [];
      for (const ring of rings) {
        rawRings.push(
          ring
            .map(([x, y]) => `(${(x * S).toFixed(1)},${(y * S).toFixed(1)})`)
            .join(' '),
        );
      }
      lines.push(`R0: ${rawRings[0]}`);
      lines.push(`R1: ${rawRings[1]}`);
      for (let k = 0; k < edges.length; k++) {
        const e = edges[k];
        lines.push(
          `#${k} ${e.x1},${e.y1} -> ${e.x2},${e.y2} | o=${e.o} | ${edgeInfo[k]}` +
            (k === c62Prev ? ' *PREV*' : '') + (chainSet.has(k) ? ' *CHAIN*' : ''),
        );
      }
      fs.appendFileSync('.qwen/tmp/c62-merge-debug.txt', lines.join('\n') + '\n\n');
      c62Prev = chainEdges[chainEdges.length - 1];
    };
  }
  // 5. chain kept edges into closed rings.
  // Collinear overlapping input edges (two cell borders lying on the same
  // line segment) split into identical integer primitives; they classify
  // identically, so the duplicate is dropped before chaining — a kept
  // duplicate would dangle and break closure.
  const seen = new Set();
  for (let i = 0; i < edges.length; i++) {
    if (!inc[i]) continue;
    const e = edges[i];
    // Degenerate slivers (≤ ~2 mm at the 1e8/mm grid): co-located twin
    // vertices (2–4 mm apart) round to the same integer pair, so the
    // arrangement emits zero/one-unit primitives whose inL≠inR keep is a
    // probe artifact. Their span is carried by the adjacent real primitive,
    // and left in they dangle and break chain closure.
    if (Math.abs(e.x2 - e.x1) <= 2 && Math.abs(e.y2 - e.y1) <= 2) inc[i] = 0;
    if (seen.has(`${e.x1}|${e.y1}|${e.x2}|${e.y2}`)) inc[i] = 0;
    else seen.add(`${e.x1}|${e.y1}|${e.x2}|${e.y2}`);
  }
  // Probe-through sliver pass: a span pair that the midpoint probe sees as
  // TWO boundary lines close together (off ≤2, the S=1e8 floating-point
  // rounding span of ~1e-10 deg) — e.g. R0's bottom D→E and R1's top E′→D′
  // of one shared cell border. Two flavours, both mid-probe leftovers
  // (the probe sits 100 units out, so it cannot see ≤2-unit features):
  //   (a) off < 1: SAME-LINE twins of a shared border (one ≤1 unit shorter,
  //       endpoints within 2 of each other). Dropping the shorter strands a
  //       1-unit stub at the shared end (the 3-edge-chain case) and keeping
  //       the longer strands one when the longer is the shared one — so
  //       keep BOTH; the chain walk's 1-edge-leftover rule absorbs the
  //       redundant twin.
  //   (b) off ≥ 1: a 1-unit GIFT sliver between two parallel lines, read as
  //       union-interior on both sides (inL=inR=1) at each midpoint (the
  //       9-edge-chain case). The sliver cannot be union-EXTERIOR — the
  //       cells each extend ≥ 1e-4 deg (10000 units) into their own sides —
  //       so the shorter/inner run lies inside U: drop it (keep both when
  //       spans are equal: the drop is still walk-safe, it only removes
  //       the inner line).
  for (let i = 0; i < edges.length; i++) {
    if (!inc[i]) continue;
    const e = edges[i];
    const el0 = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
    if (el0 <= 2) continue;
    const edx = e.x2 - e.x1, edy = e.y2 - e.y1;
    const exn = edy / el0, eyn = -edx / el0; // e's left unit normal
    for (let j = i + 1; j < edges.length; j++) {
      if (!inc[j]) continue;
      const d = edges[j];
      const dl0 = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
      if (dl0 <= 2) continue;
      const dxn = d.x2 - d.x1, dyn = d.y2 - d.y1;
      const cosA = (edx * dxn + edy * dyn) / (el0 * dl0);
      if (cosA < 0.999) continue; // parallel only (chords: handled upstream)
      const off = Math.abs((d.x1 - e.x1) * exn + (d.y1 - e.y1) * eyn);
      if (off > 2) continue; // not a ≤2-unit sliver pair
      const a = ((d.x1 - e.x1) * edx + (d.y1 - e.y1) * edy) / el0;
      const c = cosA > 0 ? 1 : -1;
      const jLo = Math.min(a, a + c * dl0), jHi = Math.max(a, a + c * dl0);
      // true overlap only: consecutive collinear segments share an endpoint
      // (jHi/jLo == 0) and must not be dropped — a collinear split vertex
      // is harmless to the walk; only genuinely overlapping ≤2-unit twins do
      if (!(jLo < 1 && jHi > el0 - 1)) continue;
      let onSide = 0; // 0 = no drop, 1 = drop i, -1 = drop j
      const covers =
        a >= -1 && (c > 0 ? a + dl0 : a - dl0) <= el0 + 1; // i covers j's run
      if (cosA > 0) {
        const endsMeet = Math.hypot(e.x2 - d.x2, e.y2 - d.y2) <= 2;
        if (off < 1 && endsMeet && Math.abs(el0 - dl0) <= 2) {
          // same-line twin of a shared border (flavour a): kept spans differ
          // by ≤2 units (rounding of one shared line): keep BOTH — the chain
          // walk closes through one and leaves the other unconsumed (it drops
          // out of the output silently); dropping either strands a 1-unit
          // stub that dead-ends the twin ring (the 3-edge case).
          // If the spans differ a lot, it is a GIFT sliver whose shorter
          // run is the inside of the lens — drop it (the 9-edge case):
          // the surviving chord carries the boundary and the 1-unit stub
          // is absorbed by the 1-edge leftover rule.
        } else {
          onSide = covers ? -1 : 1; // gift sliver: drop the shorter/inner
        }
      } else {
        onSide = covers ? 1 : -1; // overlapping anti-parallel: drop the longer
      }
      if (onSide === -1) inc[j] = 0;
      else if (onSide === 1) inc[i] = 0;
      if (C62_DBG) {
        fs.appendFileSync(
          '.qwen/tmp/c62-merge-debug.txt',
          `TWIN-DROP ${i}:${e.x1},${e.y1}->${e.x2},${e.y2} vs ${j}:${d.x1},${d.y1}->${d.x2},${d.y2} | off=${off.toFixed(1)} onSide=${onSide} a=${a.toFixed(1)} c=${c} cl=${el0.toFixed(1)} dl=${dl0.toFixed(1)}\n`,
        );
      }
    }
  }
  // Dead-end tail prune: a degree-1 vertex in the kept set can belong to no
  // cycle, so its single kept edge is probe/dedup residue — e.g. a ~26-unit
  // corner stub where R0's corner vertex survives as a leaf attached to the
  // true union corner (the 6-edge "did not close" case). A genuine union
  // boundary is 2-regular, so pruning leaves never touches real rings. Walk
  // through a leaf would end open and throw, so it must happen pre-walk.
  {
    let guard = 0;
    for (;;) {
      if (guard++ >= edges.length) break;
      const deg = new Map();
      for (let i2 = 0; i2 < edges.length; i2++) {
        if (!inc[i2]) continue;
        const ee = edges[i2];
        for (const k2 of [`${ee.x1}|${ee.y1}`, `${ee.x2}|${ee.y2}`]) {
          deg.set(k2, (deg.get(k2) || 0) + 1);
        }
      }
      let pruned = false;
      for (let i2 = 0; i2 < edges.length; i2++) {
        if (!inc[i2]) continue;
        const ee = edges[i2];
        const d1 = deg.get(`${ee.x1}|${ee.y1}`) || 0;
        const d2 = deg.get(`${ee.x2}|${ee.y2}`) || 0;
        if (d1 === 1 || d2 === 1) {
          inc[i2] = 0;
          pruned = true;
          if (C62_DBG) console.log(`WALK-LEAF i=${i2} #${i2}(${ee.x1},${ee.y1})->(${ee.x2},${ee.y2}) deg(${d1},${d2})`);
        }
      }
      if (!pruned) break;
    }
  }
  const startMap = new Map();
  for (let i = 0; i < edges.length; i++) {
    if (!inc[i]) continue;
    const k = `${edges[i].x1}|${edges[i].y1}`;
    if (!startMap.has(k)) startMap.set(k, []);
    startMap.get(k).push(i);
  }
  const used = new Uint8Array(edges.length);
  const outRings = [];
  for (let i = 0; i < edges.length; i++) {
    if (used[i] || !inc[i]) continue;
    const chain = [];
    const chainEdges = [];
    const sx = edges[i].x1, sy = edges[i].y1;
    let cur = i;
    while (cur !== -1) {
      if (used[cur]) throw new Error(`mergeTwo: edge ${cur} revisited`);
      used[cur] = 1;
      chainEdges.push(cur);
      const e = edges[cur];
      chain.push([e.x1, e.y1]);
      if (e.x2 === sx && e.y2 === sy) break; // back at the start: the face
      // boundary is a cycle — stop before picking a degenerate sliver at
      // the shared vertex (co-located twins leave 2 mm leftovers there).
      const nx = startMap.get(`${e.x2}|${e.y2}`);
      cur = -1;
      if (nx) {
        // Pair at free vertices (degree ≥ 3) by the face-tracing rule:
        // walk with the face on the left and take the outgoing edge
        // MINIMALLY counter-clockwise from the reverse of the incoming
        // direction. Index order is not enough — a collinear straight
        // candidate can block the needed 90° turn (the A∪B-square case),
        // stalling the chain in a dead end.
        const rx = e.x1 - e.x2, ry = e.y1 - e.y2;
        let best = -1, bestA = Infinity;
        for (const c of nx) {
          if (used[c]) continue;
          const c2 = edges[c];
          const a = Math.atan2(ry * (c2.x2 - c2.x1) - rx * (c2.y2 - c2.y1), rx * (c2.x2 - c2.x1) + ry * (c2.y2 - c2.y1));
          if (a < bestA) { bestA = a; best = c; }
        }
        cur = best;
      }
    }
    if (chainEdges.length < 3) {
      // A 1-edge chain is a sliver leftover: the start edge dead-ends at a
      // vertex whose only kept successors were consumed by an earlier cycle
      // (the <2 mm twin leftover at a co-located vertex, e.g. the 76160,145414
      // case where the real ring closed through its consumed twin). Not part
      // of any ring — dropping it is harmless. A 2-edge walk of NEW edges that
      // dead-ends is a genuine boundary gap and must still throw.
      if (chainEdges.length === 1) {
        inc[i] = 0;
        if (C62_DBG) console.log(`WALK1 i=${i} #${chainEdges[0]}(${edges[chainEdges[0]].x1},${edges[chainEdges[0]].y1})->(${edges[chainEdges[0]].x2},${edges[chainEdges[0]].y2})`);
        continue;
      }
      if (C62_DBG) globalThis.__c62Dump('too-short', chainEdges);
      throw new Error(`mergeTwo: chain of ${chainEdges.length} edges too short`);
    }
    // Closed iff the last edge's end equals the first edge's start.
    const first = edges[chainEdges[0]], last = edges[chainEdges[chainEdges.length - 1]];
    if (last.x2 !== first.x1 || last.y2 !== first.y1) {
      if (C62_DBG) console.log(`WALK-OPEN i=${i} [${chainEdges.join(',')}] start(${first.x1},${first.y1}) end(${last.x2},${last.y2})`);
      if (C62_DBG) globalThis.__c62Dump('did-not-close', chainEdges);
      throw new Error(`mergeTwo: chain of ${chainEdges.length} edges did not close`);
    }
    if (C62_DBG) console.log(`WALK-CLOSED i=${i} [${chainEdges.join(',')}]`);
    outRings.push(chain.map(([x, y]) => [x / S, y / S]));
  }
  return outRings.map((r) => [r]); // [rings][] poly list
}

// ---- catchment polygons (Voronoi tessellation) --------------------------------
// Vertices: every assigned geocoded practice plus each placed hospice site (so
// a placed hospice always owns a non-empty cell). Each Voronoi cell keeps its
// practice/hospice label; cells per label are unioned into one polygon.
// C6-2 (ADR-0034): two normalization properties before the tessellation:
//   1. Co-located twin points (two sites at identical geocoded
//      coordinates) are numerically duplicate — their bisector is
//      undefined and the per-label union (polygon-clipping sweep line)
//      throws or merges them. Every vertex therefore receives a
//      deterministic small offset (hash of its index, 1e-4 deg spiral for
//      the co-located groups, 1e-5 deg for the rest), BEFORE the cells are
//      built. The cells themselves are built triangulation-independently
//      (exact half-space intersection, below), so the offsets only need to
//      break coincidence and keep the shallow twin-bisector angles from
//      hitting polygon-clipping's sweep-line degeneracy: 1e-6 deg (~0.1 m)
//      still throws in the union; the 2026-11-10 jitter sweep found 0
//      overlapping raw-cell pairs at 3e-5 and 1e-4; 1e-4 is committed for
//      margin — negligible against km-scale catchments.
//   2. The offsets also put every bisector in general position, so the
//      per-label `union` / land-mask `intersection` see no exactly-
//      coincident vertices (a 1e-8 post-build nudge of the ring vertices
//      is NOT enough: it misaligns shared box-boundary edges by 2e-8 and
//      breaks the sweep-line ring closure).

// C6-4 (ADR-0035): the tessellation runs independently per kind ("completely
// separate"): each pass seeds only its own sites plus the geocoded practices
// assigned to those sites, so the adults and children catchment sets share no
// Voronoi vertices and never intermesh.
function tessellate(sites) {
  const siteIds = new Set(sites.map((h) => h.id));
  let vertices = [];
  const labels = [];
  for (const p of practicesOut) {
    if (p.lat != null && p.hospiceId && siteIds.has(p.hospiceId)) {
      vertices.push({ lat: p.lat, lon: p.lon });
      labels.push(p.hospiceId);
    }
  }
  for (const h of sites) {
    vertices.push({ lat: h.lat, lon: h.lon });
    labels.push(h.id);
  }
  // C6-2 (ADR-0034): every vertex gets a unique deterministic offset
  // (hash of its index) BEFORE the cells are built. Co-located twins
  // dodge each other (1e-4 deg, fixed spiral by intra-group label order);
  // all other vertices get 1e-5 deg so every bisector is in general
  // position and the per-label union sees no degenerate shared vertices.
  {
    const buckets = new Map();
    vertices.forEach((v, i) => {
      const k = `${v.lon.toFixed(6)},${v.lat.toFixed(6)}`;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(i);
    });
    const JDIRS = [[1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
    const groupOf = new Map();
    for (const idxs of buckets.values()) {
      if (idxs.length < 2) continue;
      idxs.sort((a, b) => (labels[a] < labels[b] ? -1 : labels[a] > labels[b] ? 1 : a - b));
      idxs.forEach((i, k) => groupOf.set(i, k));
    }
    vertices = vertices.map((v, i) => {
      if (groupOf.has(i)) {
        const [dx, dy] = JDIRS[groupOf.get(i) % JDIRS.length];
        return { lat: v.lat + dy * 1e-4, lon: v.lon + dx * 1e-4 };
      }
      const s1 = Math.sin((i + 1) * 12.9898) * 43758.5453;
      const s2 = Math.sin((i + 1) * 39.346) * 24634.6345;
      return {
        lat: v.lat + ((s2 - Math.floor(s2)) - 0.5) * 2e-5,
        lon: v.lon + ((s1 - Math.floor(s1)) - 0.5) * 2e-5,
      };
    });
    const nGroup = groupOf.size;
    if (nGroup) console.log(`tessellation offsets: ${nGroup} co-located vertices (±1e-4 deg) + ${vertices.length - nGroup} others (±1e-5 deg)`);
  }
  // C6-2 (ADR-0034): exact Voronoi cells — clip the box by every other
  // vertex's perpendicular bisector (Sutherland–Hodgman, convex in convex).
  // d3's cellPolygon() derives its half-spaces from the Delaunay neighbor
  // graph, which is corrupted for near-coincident (jittered twin) points:
  // overlapping raw cells (2407 deg² in one Argyll box; NI/SC leaks to
  // inv-3/inv-6 after per-label union). Direct half-space clipping is
  // triangulation-independent and tiles exactly (measured 0 deg² overlap).
  // Points are kept in the deterministic label-sorted group order, so the
  // twin split is reproducible.
  const lonLat = vertices.map((v) => [v.lon, v.lat]);
  const boxRing = [[BOX[0], BOX[1]], [BOX[2], BOX[1]], [BOX[2], BOX[3]], [BOX[0], BOX[3]]];
  const clipHalfPlane = (ring, si, sj) => {
    const dx = sj[0] - si[0], dy = sj[1] - si[1];
    const mx = (si[0] + sj[0]) / 2, my = (si[1] + sj[1]) / 2;
    const h = (p) => (p[0] - mx) * dx + (p[1] - my) * dy;
    let needs = false;
    for (const p of ring)
      if (h(p) > 0) { needs = true; break; }
    if (!needs) return ring;
    const out = [];
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k], b = ring[(k + 1) % ring.length];
      const ha = h(a), hb = h(b);
      if (ha <= 0) out.push(a);
      if ((ha <= 0) !== (hb <= 0)) {
        const t = ha / (ha - hb);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    return out.length >= 3 ? out : null;
  };
  // C6-2 (ADR-0034): pre-merge per-vertex nudge. Each cell's ring is clipped
  // independently, so shared-boundary vertices come out a few last ULPs apart
  // between adjacent cells (d3's halfedge sharing gave them bit-identity;
  // we do not have that here). Grid-snap to 1e-9 deg (timer; sub-jitter
  // precision is not needed) and add a nudge that is a function of the
  // snapped value alone (~6e-11 deg): identical shared vertices get the
  // same snap + the same nudge → kept identical; two vertices less than
  // 1e-9 deg apart get nudged by up to ~1e-10 → resolved to ~1e-9 deg,
  // which is well inside the minimum twin separation (1e-4 deg).
  const nudgeX = (v) => {
    const s = Math.round(v * 1e9);
    const x = (s * 2654435761) % 1048576;
    return v + ((x * 2951.112) / 1048576 - 1) * 1e-10;
  };
  const nudge = (p) => [nudgeX(p[0]), nudgeX(p[1])];
  const ringsByLabel = new Map();
  for (let i = 0; i < vertices.length; i++) {
    let ring = boxRing;
    const si = lonLat[i];
    for (let j = 0; j < vertices.length; j++) {
      if (j === i) continue;
      ring = clipHalfPlane(ring, si, lonLat[j]);
      if (!ring) break;
    }
    if (!ring) continue;
    const id = labels[i];
    if (!ringsByLabel.has(id)) ringsByLabel.set(id, []);
    ringsByLabel.get(id).push(ring.map((p) => nudge(p))); // ring: [x, y][]
  }
  const polygonsByLabel = new Map();
  const c62Area = (r) => {
    let a = 0;
    for (let k = 0; k + 1 < r.length; k++) a += r[k][0] * r[k + 1][1] - r[k][1] * r[k + 1][0];
    return Math.abs(a) / 2;
  };
  for (const [id, rings] of ringsByLabel) {
    // C6-2 (ADR-0034): polygon-clipping's `union` sweep line is not robust
    // to this tessellation (throws "Unable to complete output ring" /
    // "Unable to find segment ... in SweepLine tree" on shared box-boundary
    // edges), so a label's cells are merged iteratively with mergeTwo —
    // the classic split / group-by-directed-entity / odd-inclusion / trace
    // chain merge (module scope, below).
    let merged = null;
    let c62Merge = 0;
    const c62Steps = [];
    for (const ring of rings) {
      // mergeTwo takes flat ring lists and returns a poly list, so flatten
      // the accumulated polys before each merge; `merged` stays a poly list
      // for the downstream polysBBox / intersection clip.
      c62Merge++;
      if (process.env.C62_DBG && globalThis.__c62Set) {
        globalThis.__c62Set({ label: id, merge: c62Merge, nRings: rings.length });
      }
      merged =
        merged === null ? [[ring]] : mergeTwo(merged.flatMap((p) => p), [ring]);
      if (process.env.C62_STAGE) {
        c62Steps.push(
          +merged.flatMap((p) => p).reduce((s, r) => s + c62Area(r), 0).toFixed(6)
        );
      }
    }
    // ADR-0006: clip the catchment to the land mask — no sea. BOX above
    // remains the voronoi bounds safety net. A cell whose land intersection
    // is empty (e.g. post-coastal islands) gets `polygons: []`. Prefilter the
    // mask to the land polygons whose bbox overlaps the cell's bbox so each
    // clip operand is small (the simplified mask is still large nationwide).
    const cbb = polysBBox(merged);
    const near = maskBBoxes.filter(([, bb]) => bboxesOverlap(bb, cbb)).map(([p]) => p);
    let clipped = near.length ? intersection(merged, near) : [];
    // C6-1 (ADR-0034): NI cells must not extend past the NI–ROI border.
    if (id.startsWith('ni') && clipped.length) clipped = intersection(clipped, roiRingPoly);
    const out = clipped
      .flatMap((poly) => poly.map((r) => r.map(([x, y]) => ({ lat: y, lon: x }))))
      .filter((pts) => pts.length >= 3);
    polygonsByLabel.set(id, out);
    if (process.env.C62_STAGE) {
      const inRing = (x, y, rs) => { let ins = false; for (const r of rs) for (let k = 0, j = r.length - 1; k < r.length; j = k++) { const [xi, yi] = r[k], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
      const sp = sites.find((h) => h.id === id);
      const flatMerged = merged.flatMap((p) => p);
      (globalThis.__c62Stages ??= []).push({
        id,
        nRings: rings.length,
        ringAreas: rings.map((r) => +c62Area(r).toFixed(6)),
        mergedArea: +flatMerged.reduce((s, r) => s + c62Area(r), 0).toFixed(6),
        mergedSteps: c62Steps,
        siteInMerged: sp ? inRing(sp.lon, sp.lat, flatMerged) : null,
        clippedArea: +clipped.flatMap((p) => p).reduce((s, r) => s + c62Area(r), 0).toFixed(6),
      });
    }
  }
  console.log(`voronoi (${sites.length} sites): ${vertices.length} vertices, ${new Set(labels).size} labelled cells`);
  return polygonsByLabel;
}
const adultSites = placed.filter((h) => !h.children);
const childrenSites = placed.filter((h) => h.children);
const polygonsByLabel = tessellate(adultSites);
const childrenPolygonsByLabel = tessellate(childrenSites);

const catchmentsOut = placed.map((h) => {
  const pts = practicesOut.filter((p) => p.hospiceId === h.id && p.lat != null);
  return {
    hospiceId: h.id,
    name: h.name,
    nation: h.nation,
    kind: h.kind,
    curated: h.curated,
    children: !!h.children, // C6-4 (ADR-0035): kind split, separate catchments
    practiceCount: pts.length,
    polygons: (h.children ? childrenPolygonsByLabel : polygonsByLabel).get(h.id) ?? [],
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
if (process.env.C62_STAGE) fs.writeFileSync('.qwen/tmp/c62-stages.json', JSON.stringify(globalThis.__c62Stages));
