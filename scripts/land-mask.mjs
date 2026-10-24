// Shared UK land mask for ADR-0006 coastline clipping.
//
// Reads `data-raw/uk-land.json` (human-fetched OSM `natural=coastline`,
// ADR-0006) and returns a **deterministically simplified** copy. The raw
// OSM coastline is ~2.6M segments; `polygon-clipping` inserts every segment
// endpoint into its sweepline priority queue before sweeping and hard-caps
// that queue at POLYGON_CLIPPING_MAX_QUEUE_SIZE (1,000,000). Feeding the full
// mask to intersection()/difference() therefore throws "Infinite loop ...
// queue size too big" — a scale problem, not geometry degeneracy.
//
// The fix is a fixed-tolerance Douglas–Peucker simplification, applied in
// memory here, so the committed raw file (with its recorded SHA-256) stays the
// provenance anchor and the clipping operands become tractable. Tolerance is
// 0.001 deg (~110 m) — sub-pixel at the map's display scale — and the
// algorithm is a pure function of the input, so builds are byte-identical
// (QA §A1). The raw file is NOT rewritten.
//
// Both build-data.mjs and validate-tessellation.mjs call loadLandMask() so
// they operate on exactly the same geometry (self-consistency, ADR-0006).
import fs from 'node:fs';

export const LAND_TOL = 0.001; // degrees (≈110 m)

function load() {
  // Fail fast (ADR-0006): no silent box-only fallback.
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync('data-raw/uk-land.json', 'utf8'));
  } catch {
    console.error(
      'data-raw/uk-land.json is missing — run `node scripts/fetch-uk-land.mjs` on a networked machine, commit it, and re-run the build (ADR-0006). The build does not fall back to box-only clipping.'
    );
    process.exit(1);
  }
  if (!Array.isArray(raw) || !raw.length) {
    console.error('data-raw/uk-land.json is empty — re-fetch: `node scripts/fetch-uk-land.mjs`');
    process.exit(1);
  }
  return raw;
}

// Perpendicular distance squared from p to segment ab.
function perpDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * dx - px, cy = ay + t * dy - py;
  return cx * cx + cy * cy;
}

// Iterative Ramer–Douglas–Peucker on an open polyline (no recursion, to avoid
// stack overflow on very long rings). Returns the kept points.
function simplifyOpen(points, tol2) {
  const n = points.length;
  if (n < 3) return points.slice();
  const keep = new Array(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = -1, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist2(
        points[i][0], points[i][1],
        points[s][0], points[s][1],
        points[e][0], points[e][1]
      );
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol2 && idx > 0) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Simplify one closed ring (stored with a duplicated closing point). Returns a
// closed ring, or null if it collapses below 3 points (micro-fragment).
function simplifyRing(ring, tol) {
  const pts = ring.slice(0, -1); // drop the closing duplicate
  if (pts.length < 3) return null;
  const tol2 = tol * tol;
  // Break the loop at the lexicographically-max point so DP endpoints are
  // the most "north-east" vertex; deterministic for a given ring.
  let pivot = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i], b = pts[pivot];
    if (a[1] > b[1] || (a[1] === b[1] && a[0] > b[0])) pivot = i;
  }
  const open = [...pts.slice(pivot + 1), ...pts.slice(0, pivot + 1)];
  const simp = simplifyOpen(open, tol2);
  if (simp.length < 3) return null;
  return [...simp, simp[0]];
}

const cache = new Map();

/**
 * Return the simplified land mask: an array of polygons, each an array of
 * rings, each ring `[ [lon, lat], ... ]` with the closing point duplicated
 * (same shape as the raw file). Memoised so both usage sites share one load.
 */
export function loadLandMask(tol = LAND_TOL) {
  const key = tol;
  if (cache.has(key)) return cache.get(key);
  const raw = load();
  const out = [];
  for (const poly of raw) {
    const rings = [];
    for (const ring of poly) {
      const sr = simplifyRing(ring, tol);
      if (sr) rings.push(sr);
    }
    if (rings.length) out.push(rings);
  }
  cache.set(key, out);
  return out;
}

// Bounding box of one polygon (all rings), [xMin, yMin, xMax, yMax].
export function polygonBBox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const ring of poly) {
    for (const [x, y] of ring) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return [x0, y0, x1, y1];
}

// Bounding box of an array of polygons ([poly][ring][[x,y]]).
export function polysBBox(polys) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of polys) {
    const [a, b, c, d] = polygonBBox(poly);
    if (a < x0) x0 = a;
    if (b < y0) y0 = b;
    if (c > x1) x1 = c;
    if (d > y1) y1 = d;
  }
  return [x0, y0, x1, y1];
}

// True when two [x0,y0,x1,y1] bboxes overlap (inclusive).
export function bboxesOverlap(a, b) {
  return !(b[0] > a[2] || a[0] > b[2] || b[1] > a[3] || a[1] > b[3]);
}

/**
 * A precomputed [poly, bbox][] table for the mask — build it once, then filter
 * to the polygons whose bbox overlaps a cell's bbox (padded) so each clip
 * operand stays small.
 */
export function loadMaskWithBBoxes(tol = LAND_TOL) {
  const mask = loadLandMask(tol);
  return mask.map((poly) => [poly, polygonBBox(poly)]);
}
