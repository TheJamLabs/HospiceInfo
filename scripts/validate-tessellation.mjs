// Verifies the Voronoi catchment tessellation:
//   1. every catchment has >=1 ring and all vertices are inside the bounds
//   2. union of all catchment polygons ~= the bounds (tiled, no big gaps)
//   3. pairwise intersection area of catchment polygons ~= 0 (no overlap;
//      a shared boundary edge has zero area)
import fs from 'node:fs';
import polygonClipping from 'polygon-clipping';
const { union, intersection } = polygonClipping;

const catchments = JSON.parse(fs.readFileSync('public/data/catchments.json', 'utf8'));
const x0 = -3.8, y0 = 52.9, x1 = -1.9, y1 = 55.05; // lon/lat bounds used by build-data
const bboxArea = (x1 - x0) * (y1 - y0);

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

let missing = 0;
for (const c of catchments) {
  if (!c.polygons?.length) { missing++; console.log('  no polygon:', c.hospiceId); }
}
console.log(`catchments: ${catchments.length}, missing polygons: ${missing}`);

let outOfBounds = 0;
for (const c of catchments) {
  for (const ring of toPolys(c)) {
    for (const [x, y] of ring) {
      if (x < x0 - 0.01 || x > x1 + 0.01 || y < y0 - 0.01 || y > y1 + 0.01) outOfBounds++;
    }
  }
}
console.log('vertices outside bounds:', outOfBounds);

const mergedUnion = union(catchments.flatMap((c) => toPolys(c).map((r) => [r])));
const unionArea = area(mergedUnion);
console.log(`coverage: union=${unionArea.toFixed(4)} / bbox=${bboxArea.toFixed(4)} deg^2 = ${((unionArea / bboxArea) * 100).toFixed(1)}%`);

let totalOverlap = 0;
let worst = null;
for (let i = 0; i < catchments.length; i++) {
  const pi = union(toPolys(catchments[i]).map((r) => [r]));
  if (!pi?.length) continue;
  for (let j = i + 1; j < catchments.length; j++) {
    const pj = union(toPolys(catchments[j]).map((r) => [r]));
    if (!pj?.length) continue;
    const ia = area(intersection([pi[0]], [pj[0]]));
    totalOverlap += ia;
    if (!worst || ia > worst.ia) worst = { a: catchments[i].name, b: catchments[j].name, ia };
  }
}
console.log(`pairwise overlap: ${totalOverlap.toFixed(4)} deg^2 (a shared edge should be ~0)`);
console.log('worst overlap:', worst ? `${worst.a} vs ${worst.b} = ${worst.ia.toFixed(4)}` : 'none');
