// Cycle 8 (C8) — client-side suite for src/lib/postcodes.ts tier-2 helpers.
// Zero network: lookupByPostcode runs on injected fetchImpl stubs only. R-5
// parity vectors are shared with tests/handler.test.mjs via ./postcode-vectors.mjs.
// No `public/data/*.json` is read; every cell below is synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isPostcodeShape,
  toSpacedForm,
  pointInCell,
  findHospiceCell,
  cellBboxes,
  lookupByPostcode,
} from '../src/lib/postcodes.ts';
import {
  VALID_COMPACT, SPACED_NORMALISES_TO, INVALID, SPACED_FORM,
} from './postcode-vectors.mjs';

// Synthetic square cell; ring is OPEN (4 corners, no repeated closing point —
// a zero-length edge trips the on-line band and would vote OUTSIDE).
function squareCell(hospiceId, lat, lon, h) {
  return {
    hospiceId, name: hospiceId, nation: 'england', kind: 'published',
    curated: false, children: false, practiceCount: 0,
    polygons: [[
      { lat: lat - h, lon: lon - h }, { lat: lat - h, lon: lon + h },
      { lat: lat + h, lon: lon + h }, { lat: lat + h, lon: lon - h },
    ]],
  };
}

const H = 4e-5;              // synthetic half-size, degrees
const OUT = 3.1623e-5;       // ≈ 10^-4.5 degrees

test('C8: isPostcodeShape — shared valid/invalid sets (R-5 parity)', () => {
  for (const code of VALID_COMPACT) assert.equal(isPostcodeShape(code), true);
  for (const [raw] of SPACED_NORMALISES_TO) assert.equal(isPostcodeShape(raw), true);
  for (const raw of INVALID) assert.equal(isPostcodeShape(raw), false);
});

test('C8: toSpacedForm — shared spaced set (R-5 parity)', () => {
  for (const [compact, spaced] of SPACED_FORM) assert.equal(toSpacedForm(compact), spaced);
});

test('C8: pointInCell — point ≈10^-4.5 deg outside a ring edge → false', () => {
  const cell = squareCell('edge-out', 53.0, -2.0, H);
  assert.equal(pointInCell(53.0 + H + OUT, -2.0, cell), false);
  assert.equal(pointInCell(53.0 - H - OUT, -2.0, cell), false);
});

test('C8: pointInCell — point clearly inside a convex ring → true', () => {
  const cell = squareCell('edge-in', 53.0, -2.0, H);
  assert.equal(pointInCell(53.0, -2.0, cell), true);
  assert.equal(pointInCell(53.0 + H / 2, -2.0 - H / 2, cell), true);
});

// Kite ring in the shape of a live tessellated catchment: vertex 1 is
// repeated, so edge 1→2 is zero-length. Before the skip guard, the on-line
// band degraded to `0 <= 0` on that edge and rejected EVERY point.
function kiteCell(hospiceId) {
  return {
    hospiceId, name: hospiceId, nation: 'england', kind: 'published',
    curated: false, children: false, practiceCount: 0,
    polygons: [[
      { lat: 53.63561094, lon: -2.67193613 }, // north
      { lat: 53.61573957, lon: -2.66543397 }, // west
      { lat: 53.61573957, lon: -2.66543397 }, // repeated → zero-length edge
      { lat: 53.59284668, lon: -2.67193613 }, // south
      { lat: 53.61573957, lon: -2.67843832 }, // east
    ]],
  };
}

test('C8: pointInCell — repeated vertex (zero-length edge) must not hard-reject an interior point', () => {
  const cell = kiteCell('degenerate');
  assert.equal(pointInCell(53.61573, -2.67194, cell), true);
  assert.equal(pointInCell(53.7, -2.67193613, cell), false); // well north of the ring
});

test('C8: lookupByPostcode — PR7 2TH geocode resolves through a zero-length-edge catchment (live regression)', async () => {
  const cell = kiteCell('en-1-126365065');
  const r = await lookupByPostcode('PR72TH', [cell], () =>
    Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ postcode: 'PR7 2TH', latitude: 53.61573, longitude: -2.67194 }),
    }),
  );
  assert.equal(r && r.cell.hospiceId, 'en-1-126365065');
  assert.equal(r && r.code, 'PR72TH');
});

test('C8: findHospiceCell — point on the shared on-line edge of two adjacent cells → null', () => {
  const h = 1e-4;
  const left = squareCell('band-left', 51.0, -3.0 - h, h);
  const right = squareCell('band-right', 51.0, -3.0 + h, h);
  for (const order of [[left, right], [right, left]]) {
    assert.equal(findHospiceCell(51.0, -3.0, order), null); // band votes OUTSIDE in both
  }
});

test('C8: findHospiceCell — degenerate polygons:[] → null, and never wins in a mixed set', () => {
  const empty = { ...squareCell('empty', 53.0, -2.0, H), polygons: [] };
  assert.equal(findHospiceCell(53.0, -2.0, [empty]), null);
  assert.equal(findHospiceCell(53.0, -2.0, [empty, squareCell('live', 53.0, -2.0, H)]).hospiceId, 'live');
});

test('C8: findHospiceCell — overlapping bboxes: PIP discriminates; memo observed', () => {
  // o1 (square) and o2 (concentric diamond, larger bbox) → both bboxes admit
  // P, but P lies inside o1 and outside o2's |x|+|y| ≤ d boundary.
  const h = 1e-4;
  const d = 1.2 * h;
  const o1 = squareCell('o1', 54.0, -5.0, h);
  const o2 = {
    ...squareCell('o2', 54.0, -5.0, d),
    polygons: [[
      { lat: 54.0, lon: -5.0 - d }, { lat: 54.0 + d, lon: -5.0 },
      { lat: 54.0, lon: -5.0 + d }, { lat: 54.0 - d, lon: -5.0 },
    ]],
  };
  const cells = [o1, o2];
  const px = 54.0 + 0.9 * h; // |offset| 0.9h < h → in o1
  const py = -5.0 + 0.9 * h; // |x|+|y| = 1.8h > d → outside o2
  for (const order of [cells, [o2, o1]]) {
    assert.equal(findHospiceCell(px, py, order).hospiceId, 'o1');
  }
  const first = cellBboxes.get(cells);
  assert.ok(Array.isArray(first));               // populated by the calls above
  findHospiceCell(px, py, cells);
  assert.equal(cellBboxes.get(cells), first);    // same reference → memoised on array identity
  assert.deepEqual(first[0], { minLat: 54.0 - h, maxLat: 54.0 + h, minLon: -5.0 - h, maxLon: -5.0 + h });
});

test('C8: lookupByPostcode — 200 + finite coords in a cell → {cell, code}; exact URL + signal', async () => {
  const calls = [];
  const cell = squareCell('hit', 53.652582, -2.636219, H);
  const r = await lookupByPostcode('PR72TH', [cell], (url, init) => {
    calls.push({ url, signal: init && init.signal });
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ postcode: 'PR7 2TH', latitude: 53.652582, longitude: -2.636219 }) });
  });
  assert.equal(r.cell, cell);
  assert.equal(r.code, 'PR72TH');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/postcodes/PR7 2TH');
  assert.ok(calls[0].signal instanceof AbortSignal);
});

test('C8: lookupByPostcode — 404 / 502 / bad JSON / non-finite / out-of-network → null (never throws)', async () => {
  const cells = [squareCell('hit', 53.652582, -2.636219, H)];
  const cases = [
    ['404', () => ({ status: 404, json: () => Promise.resolve({}) })],
    ['502', () => ({ status: 502, json: () => Promise.resolve({}) })],
    ['bad JSON', () => ({ status: 200, json: () => Promise.reject(new SyntaxError('Bad JSON')) })],
    ['non-finite coords', () => ({ status: 200, json: () => Promise.resolve({ latitude: 'x', longitude: 1 }) })],
    ['finite coords, no cell contains them', () => ({ status: 200, json: () => Promise.resolve({ latitude: 1.0, longitude: 1.0 }) })],
  ];
  for (const [label, stub] of cases) {
    assert.equal(await lookupByPostcode('PR72TH', cells, () => Promise.resolve(stub())), null, label);
  }
});

test('C8: lookupByPostcode — invalid shape → null and fetchImpl never invoked', async () => {
  let fetchCalls = 0;
  for (const raw of INVALID) {
    const r = await lookupByPostcode(raw, [squareCell('hit', 53.0, -2.0, H)], () => {
      fetchCalls += 1;
      return Promise.resolve({ status: 200, json: () => Promise.resolve({}) });
    });
    assert.equal(r, null, `raw = ${JSON.stringify(raw)}`);
  }
  assert.equal(fetchCalls, 0);
});

test('C8: lookupByPostcode — abort fires at the code\'s 3 s budget → null; no manual 3 s sleep in the test', async () => {
  let signalSeen = null;
  const stub = (url, init) => {
    signalSeen = init && init.signal;
    return new Promise((resolve, reject) => {
      if (init && init.signal) init.signal.addEventListener('abort', () => reject(new Error('aborted by budget')));
      // Settles only when the code-under-test aborts it.
    });
  };
  const t0 = performance.now();
  const r = await lookupByPostcode('LS14AP', [squareCell('hit', 53.0, -2.0, H)], stub);
  const elapsed = performance.now() - t0;
  assert.equal(r, null);
  assert.ok(signalSeen instanceof AbortSignal);
  assert.equal(signalSeen.aborted, true);
  assert.ok(elapsed >= 2900, `abort fired at ${Math.round(elapsed)} ms`);
  assert.ok(elapsed < 4500, `settled just after the 3 s budget: ${Math.round(elapsed)} ms`);
});

test('C8: acceptance vectors (shared coordinates) — adult + children IDs, compact and spaced input', async () => {
  const VECTORS = [
    ['PR72TH', 53.652582, -2.636219, 'en-1-126365065', 'en-1-114396298'],
    ['CF119HD', 51.484666, -3.193503, 'CF11-ADULT', 'CF11-CHILDREN'],
    ['BT153LH', 54.627331, -5.933535, 'BT15-ADULT', 'BT15-CHILDREN'],
  ];
  for (const [code, lat, lon, adultId, childId] of VECTORS) {
    for (const input of [code, toSpacedForm(code)]) {
      const mk = (id) => [squareCell(id, lat, lon, H)];
      const stub = () => Promise.resolve({ status: 200, json: () => Promise.resolve({ postcode: toSpacedForm(code), latitude: lat, longitude: lon }) });
      const r = await lookupByPostcode(input, mk(adultId), stub);
      assert.equal(r.cell.hospiceId, adultId, `${input} → ${adultId}`);
      assert.equal(r.code, input, `${input} round-trips as given`);
      const c = await lookupByPostcode(input, mk(childId), stub);
      assert.equal(c.cell.hospiceId, childId, `${input} → ${childId}`);
    }
  }
});
