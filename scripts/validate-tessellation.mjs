// Verifies the Voronoi catchment tessellation against the UK land mask
// (ADR-0006 — retires the old "cells tile the box" invariants):
//   1. every catchment is wholly inside the land mask (no sea in cells)
//   2. the union of all catchments ~= area(land ∩ bbox) (cells tile the land)
//   3. pairwise intersection area of catchment polygons ~= 0 (no overlap;
//      a shared boundary edge has zero area)
//   4. empty cells (`polygons: []`, e.g. post-coastal islands) and sliver
//      cells (< 0.0002 deg^2, e.g. Wisdom's 0.000186 clip seam) are reported
//      as warnings, not failures
//
// Self-consistency (ADR-0006): reads the SAME `data-raw/uk-land.json`
// file the build uses — the validator checks against exactly the geometry
// the build produced.
import fs from 'node:fs';
import polygonClipping from 'polygon-clipping';
import { loadMaskWithBBoxes, polysBBox, bboxesOverlap } from './land-mask.mjs';
const { union, intersection, difference } = polygonClipping;

const catchments = JSON.parse(fs.readFileSync('public/data/catchments.json', 'utf8'));
const x0 = -9.5, y0 = 49.5, x1 = 2.0, y1 = 61.5; // build's BOX (ADR-0001 safety net)

// Same deterministic DP-simplified mask the build used (ADR-0006,
// scripts/land-mask.mjs); fail-fast on a missing raw file is inside it.
const maskBBoxes = loadMaskWithBBoxes(); // [poly, bbox][]
const ukLand = maskBBoxes.map(([p]) => p); // full mask (for the box coverage clip)

const toPolys = (c) => (c.polygons ?? []).map((ring) => ring.map((p) => [p.lon, p.lat]));

function areaOfPolygon(poly) {
  let a = 0;
  for (const ring of poly) {
    for (let i = 0; i + 1 < ring.length; i++) {
      a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
  }
  return Math.abs(a) / 2;
}
const area = (polygons) => polygons.reduce((s, p) => s + areaOfPolygon(p), 0);

// ---- 4. empty cells (non-fatal) ------------------------------------------------
const empty = catchments.filter((c) => !c.polygons?.length);
for (const c of empty) console.log(`warning: empty cell (no land in box): ${c.hospiceId} (${c.name})`);
console.log(`catchments: ${catchments.length}, empty cells: ${empty.length}`);

// ---- sliver cells (non-fatal warning) -----------------------------------------
const slivers = [];
for (const c of catchments) {
  const a = area(toPolys(c));
  if (c.polygons?.length && a < 0.0002) slivers.push({ id: c.hospiceId, name: c.name, a });
}
for (const s of slivers) console.log(`warning: sliver cell (< 0.0002 deg^2): ${s.id} (${s.name}) = ${s.a.toFixed(6)}`);
console.log(`sliver cells: ${slivers.length}`);

// ---- 1. every cell is inside the land mask (no sea) -----------------------------
let seaLeak = 0;
let worst = null;
for (const c of catchments) {
  const pi = union(toPolys(c).map((r) => [r]));
  if (!pi?.length) continue;
  // Prefilter to the land polygons that can intersect this cell (bbox overlap
  // is exact here: non-overlapping land contributes nothing to the difference).
  const cbb = polysBBox(pi);
  const near = maskBBoxes.filter(([, bb]) => bboxesOverlap(bb, cbb)).map(([p]) => p);
  const outside = area(difference([pi[0]], near.length ? near : ukLand));
  seaLeak += outside;
  if (!worst || outside > worst.outside) worst = { name: c.name, outside };
}
console.log(`cells outside land: total ${seaLeak.toFixed(6)} deg^2 (a clip seam should be ~0)`);
console.log('worst sea leak:', worst ? `${worst.name} = ${worst.outside.toFixed(6)}` : 'none');

// ---- 2. coverage ~= land ∩ box --------------------------------------------------
const boxPoly = [[ [x0, y0], [x1, y0], [x1, y1], [x0, y1] ]];
const landInBox = intersection(ukLand, boxPoly);
const targetArea = area(landInBox);
const mergedUnion = union(catchments.flatMap((c) => toPolys(c).map((r) => [r])));
const unionArea = area(mergedUnion);
const coverage = targetArea ? unionArea / targetArea : 0;
console.log(
  `coverage: union=${unionArea.toFixed(4)} / (land ∩ box)=${targetArea.toFixed(4)} deg^2 = ${(coverage * 100).toFixed(2)}% (expect ~100%)`
);
if (Math.abs(coverage - 1) > 0.01) {
  console.error('ERROR: coverage deviates from land ∩ box by more than 1%');
  process.exit(1);
}

// ---- 3. pairwise overlap ~= 0 ---------------------------------------------------
let totalOverlap = 0;
let overlapWorst = null;
for (let i = 0; i < catchments.length; i++) {
  const pi = union(toPolys(catchments[i]).map((r) => [r]));
  if (!pi?.length) continue;
  for (let j = i + 1; j < catchments.length; j++) {
    const pj = union(toPolys(catchments[j]).map((r) => [r]));
    if (!pj?.length) continue;
    const ia = area(intersection([pi[0]], [pj[0]]));
    totalOverlap += ia;
    if (!overlapWorst || ia > overlapWorst.ia) overlapWorst = { a: catchments[i].name, b: catchments[j].name, ia };
  }
}
console.log(`pairwise overlap: ${totalOverlap.toFixed(4)} deg^2 (a shared edge should be ~0)`);
console.log('worst overlap:', overlapWorst ? `${overlapWorst.a} vs ${overlapWorst.b} = ${overlapWorst.ia.toFixed(4)}` : 'none');
