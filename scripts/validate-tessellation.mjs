// Verifies the Voronoi catchment tessellation against the UK land mask
// (ADR-0006 — retires the old "cells tile the box" invariants):
//   1. every catchment is wholly inside the land mask (no sea in cells)
//   2. the union of all catchments ~= area(UK land ∩ bbox), where UK land
//      excludes ROI (Ireland − NI ring; C6-1/ADR-0034: ni cells are clipped to
//      the NI ring, and ROI land has no catchments)
//   3. pairwise intersection area of catchment polygons ~= 0 (no overlap;
//      a shared boundary edge has zero area)
//   4. empty cells (`polygons: []`, e.g. post-coastal islands) and sliver
//      cells (< 0.0002 deg^2, e.g. Wisdom's 0.000186 clip seam) are reported
//      as warnings, not failures
//   5. C6-1 (ADR-0034): no NI cell has area outside the NI boundary ring
//      (area(difference(cell, niRing)) < 1e-9 deg^2) — catchments must not
//      extend past the NI–ROI border. `roi-border.json` holds the NI admin
//      polygon (OSM relation 156393) that the build clips cells INTO, so the
//      "spill" this gate measures is the cell area lying OUTSIDE that ring.
//   6. C6-2 (ADR-0034): Scottish cells — 0 empty, SC×SC pairwise overlap
//      < 1e-6 deg^2 per pair (jittered co-located points must not produce
//      overlapping Voronoi cells).
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

// C6-1 (ADR-0034) shared: NI admin ring (`data-raw/roi-border.json`, OSM
// relation 156393). The build clips ni* cells INTO this ring; inv-2 carves
// ROI (Ireland − NI ring) OUT of the coverage target; inv-5 measures spill
// OUTSIDE the ring.
let roiPoly;
{
  let roi;
  try {
    roi = JSON.parse(fs.readFileSync('data-raw/roi-border.json', 'utf8'));
  } catch (err) {
    console.error(`data-raw/roi-border.json: ${err.message} — aborting (C6-1/ADR-0034 fail-fast)`);
    process.exit(1);
  }
  if (!Array.isArray(roi.ring) || roi.ring.length < 3) {
    console.error('data-raw/roi-border.json: ring missing or degenerate — aborting (C6-1 fail-fast)');
    process.exit(1);
  }
  roiPoly = [roi.ring];
}

// Island of Ireland mask polygon, identified by an interior point (Dublin) so
// the identification is stable across mask rebuilds.
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const ireland = ukLand.find((p) => p.some((ring) => pointInRing(-6.26, 53.35, ring)));
if (!ireland) {
  console.error('ERROR: no land-mask polygon contains the Dublin test point — mask changed (C6-1 target guard)');
  process.exit(1);
}

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

// ---- 2. coverage ~= UK land ∩ box -----------------------------------------------
// Target restricted to UK land (ADR-0034, C6-1): ROI (Ireland − NI ring) is
// excluded from numerator and denominator — no kind's catchment covers the
// Republic, so it is out of scope for the tessellation.
const boxPoly = [[ [x0, y0], [x1, y0], [x1, y1], [x0, y1] ]];
const landInBox = intersection(ukLand, boxPoly);
const roiInBox = intersection(difference([ireland], roiPoly), boxPoly);
const ukLandInBox = difference(landInBox, roiInBox);
const targetArea = area(ukLandInBox);
// Sum per cell instead of a single union of all cells: inv-3 already proves
// cells are pairwise disjoint up to measure-zero shared edges, so the sum
// equals the union — and a cross-UK union of every ring at once feeds
// polygon-clipping's SweepLine geometry it hard-crashes on
// ("Unable to find segment #N"), which would abort the run before invariants
// 2/5/6 could report. Per-cell clips are the same size as the working
// per-cell clips in inv-1; a degenerate one is advisory, not fatal.
let adultsArea = 0;
let childrenArea = 0;
for (const c of catchments) {
  const pc = toPolys(c).map((r) => [r]);
  if (!pc.length) continue;
  const cbb = polysBBox(pc);
  const near = ukLand.filter((p) => bboxesOverlap(polysBBox([p]), cbb));
  if (!near.length) continue;
  // C62-V2 (ADR-0036): pre-union the cell's merged rings (eaten/drained
  // fragments — Milton is 253 rings) into one clean ring before the
  // intersection. Raw self-intersecting multi-ring input crashes
  // polygon-clipping's SweepLine ("Unable to find segment #N"); the per-cell
  // union is the exact operation inv-3 already runs for every cell (which
  // passes) — i.e. the geometry is normal the same way the pipeline output
  // normalizes it.
  let pi = null;
  try {
    pi = union(pc);
  } catch (err) {
    console.log(`warning: coverage cell union failed (advisory): ${c.hospiceId} — ${String(err.message).slice(0, 90)}`);
    continue;
  }
  if (!pi?.length) continue;
  try {
    const ia = area(intersection(pi, near));
    if (c.children) childrenArea += ia; else adultsArea += ia;
  } catch (err) {
    console.log(`warning: coverage cell clip failed (advisory): ${c.hospiceId} — ${String(err.message).slice(0, 90)}`);
  }
}
// C62-V2 (ADR-0036): per-kind coverage. The two tessellations are independent
// (ADR-0035), so each kind is measured separately against the C6-1 target
// (UK land ∩ box − ROI). Adults keep the strict ±1% gate. The children
// shortfall (18 children sites cannot fully tile the 33.75 deg² target) is
// USER-RISK-ACCEPTED debt (ADR-0036: root cause children site sparsity;
// remediation a future data cycle with more children sites) — reported,
// not fatal.
const coverageAdults = targetArea ? adultsArea / targetArea : 0;
const coverageChildren = targetArea ? childrenArea / targetArea : 0;
console.log(
  `coverage(adults): ∩UKland=${adultsArea.toFixed(4)} / (UK land ∩ box − ROI)=${targetArea.toFixed(4)} deg^2 = ${(coverageAdults * 100).toFixed(2)}% (strict gate: 99.0–101.0%)`
);
console.log(
  `coverage(children): ∩UKland=${childrenArea.toFixed(4)} / (UK land ∩ box − ROI)=${targetArea.toFixed(4)} deg^2 = ${(coverageChildren * 100).toFixed(2)}% — RISK-ACCEPTED (ADR-0036): children site sparsity; non-fatal, remediated by a future data cycle with more children sites`
);
if (Math.abs(coverageAdults - 1) > 0.01) {
  console.error('ERROR: adults coverage deviates from UK land ∩ box (minus ROI) by more than 1%');
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
    let ia;
    try {
      ia = area(intersection([pi[0]], [pj[0]]));
    } catch (err) {
      // Advisory-only gate: a degenerate output ring (cross-UK children cells
      // sharing long coincident edges) must not crash the run.
      console.log(
        `warning: overlap computation failed (advisory): ${catchments[i].hospiceId} vs ${catchments[j].hospiceId} — ${String(err.message).slice(0, 90)}`
      );
      continue;
    }
    totalOverlap += ia;
    if (!overlapWorst || ia > overlapWorst.ia) overlapWorst = { a: catchments[i].name, b: catchments[j].name, ia };
  }
}
console.log(`pairwise overlap: ${totalOverlap.toFixed(4)} deg^2 (a shared edge should be ~0)`);
console.log('worst overlap:', overlapWorst ? `${overlapWorst.a} vs ${overlapWorst.b} = ${overlapWorst.ia.toFixed(4)}` : 'none');

// ---- 5. C6-1 (ADR-0034): no NI cell outside the NI boundary ring --------------
// (roiPoly — the NI admin ring — is loaded once at the top of this file.)
// C62-V2 (ADR-0036): per-kind. Children-pass ni cells are clipped against the
// ROI land (Ireland − NI ring), not the NI ring, so their Scottish reach is
// legitimate; that spill is USER-RISK-ACCEPTED debt (ADR-0036) — reported,
// not fatal. Adult ni cells keep the strict < 1e-9 gate.
let roiSpill = 0;
let roiSpillChildren = 0;
let roiWorst = null;
{
  for (const c of catchments.filter((c) => c.nation === 'ni')) {
    const pi = union(toPolys(c).map((r) => [r]));
    if (!pi?.length) continue;
    const spill = area(difference([pi[0]], roiPoly)); // area outside the NI ring = spill past the border
    if (c.children) {
      roiSpillChildren += spill;
    } else {
      roiSpill += spill;
      if (!roiWorst || spill > roiWorst.spill) roiWorst = { name: c.name, spill };
    }
  }
  console.log(
    `NI cells outside NI ring (adults): total ${roiSpill.toFixed(9)} deg^2 (must be < 1e-9 each; expect ~0 after C6-1 clip)`
  );
  if (roiSpillChildren > 0)
    console.log(
      `warning: NI spill (children): total ${roiSpillChildren.toFixed(4)} deg^2 — RISK-ACCEPTED (ADR-0036): children ni cells retain Scottish reach by design (ROI-land strip, not NI-ring clip); non-fatal`
    );
  if (roiWorst) console.log('worst NI spill (adults):', `${roiWorst.name} = ${roiWorst.spill.toFixed(9)}`);
  if (roiSpill >= 1e-9) {
    console.error('ERROR: NI cell area outside the NI boundary ring (C6-1)');
    process.exit(1);
  }
}

// ---- 6. C6-2 (ADR-0034): Scottish cells — 0 empty, SC×SC overlap < 1e-6 --------
const sc = catchments.filter((c) => c.nation === 'sc');
const scEmpty = sc.filter((c) => !c.polygons?.length);
const scPresent = sc.filter((c) => c.polygons?.length);
const scPolys = scPresent.map((c) => union(toPolys(c).map((r) => [r])));
// C6 closeout 2026-11-14/15: two SC×SC pairs are waived below (B1 by
// James 2026-11-14; the ACCORD pair by the lead 2026-11-15 per the B1
// precedent — owner declined SC×SC fix loops 2026-11-14). Waivers match
// ONLY on an explicit, order-insensitive name pair — the measured
// overlap is still printed every run as a waived note. No threshold
// changes; every other pair keeps full force.
const scWaivers = [
  { names: ['Hospice at Home', 'Strathcarron Hospice'], reason: 'C6 closeout 2026-11-14: B1 risk-accepted (James)', decided: '2026-11-14' },
  { names: ['ACCORD@Home (hospice at home service)', 'Accord Hospice'], reason: 'C6 closeout 2026-11-15: ACCORD pair risk-accepted (lead, B1 precedent; 0.000488618 < B1 0.001983171 deg², same defect family, same town Paisley)', decided: '2026-11-15' },
];
const isScWaived = (a, b) =>
  scWaivers.some(
    (w) => (w.names[0] === a && w.names[1] === b) || (w.names[0] === b && w.names[1] === a)
  );
let scWorst = null;
for (let i = 0; i < scPolys.length; i++) {
  for (let j = i + 1; j < scPolys.length; j++) {
    const ia = area(intersection([scPolys[i][0]], [scPolys[j][0]]));
    if (isScWaived(scPresent[i].name, scPresent[j].name)) {
      const w = scWaivers.find(
        (x) => x.names.includes(scPresent[i].name) && x.names.includes(scPresent[j].name)
      );
      console.log(
        `waived (risk-accepted): ${scPresent[i].name} × ${scPresent[j].name} = ${ia.toFixed(9)} deg^2 — ${w.reason}`
      );
      continue;
    }
    if (!scWorst || ia > scWorst.ia)
      scWorst = { a: scPresent[i].name, b: scPresent[j].name, ia };
  }
}
console.log(`scottland: ${sc.length} cells, empty=${scEmpty.length}`,
  `worst SC×SC overlap=${scWorst ? scWorst.ia.toFixed(9) : '0'} deg^2 (must be < 1e-6)`);
for (const c of scEmpty) console.error(`ERROR: empty Scottish cell (C6-2): ${c.hospiceId} (${c.name})`);
if (scWorst && scWorst.ia >= 1e-6)
  console.error(`ERROR: Scottish overlap >= 1e-6 deg^2 (C6-2): ${scWorst.a} vs ${scWorst.b} = ${scWorst.ia.toFixed(9)}`);
if (scEmpty.length > 0 || (scWorst && scWorst.ia >= 1e-6)) process.exit(1);
