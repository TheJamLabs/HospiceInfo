// Cycle 10 — ADR-0043 shop identity pass-through (resolveShopId).
// Pure, offline: the module under test is side-effect-free; the legacy
// SLUG_TO_ID table is rebuilt here from the same CATCHMENTS source
// build-data.mjs uses (catchment-map.mjs is a pure data module), so the
// table inside this test is byte-equal to the build's table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveShopId } from '../scripts/shop-identity.mjs';
import { CATCHMENTS } from '../scripts/catchment-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Same one-liner build-data.mjs uses for the 20-legacy table.
const SLUG_TO_ID = Object.fromEntries(
  CATCHMENTS.map((c) => [c.id, `en-${(c.cqcUrl.match(/location\/(1-\d+)/) || [])[1]}`])
);

const hospicesAll = JSON.parse(readFileSync(join(__dirname, '..', 'data-raw', 'hospices-all.json'), 'utf8'));
const canonicalIds = new Set(hospicesAll.map((h) => h.id));

test('ADR-0043: legacy slug resolves through the SLUG_TO_ID table to en-<cqcId>', () => {
  assert.equal(Object.keys(SLUG_TO_ID).length, 20);
  for (const [slug, id] of Object.entries(SLUG_TO_ID)) {
    assert.equal(resolveShopId(slug, canonicalIds, SLUG_TO_ID), id, `slug ${slug}`);
  }
  assert.match(resolveShopId('stcatherines', canonicalIds, SLUG_TO_ID), /^en-1-\d+$/);
});

test('ADR-0043: table wins when the input also exists in the canonical id set', () => {
  // Build an id that is a valid canonical id AND a legacy table key.
  const fakeCanonical = new Set(['stcatherines', ...canonicalIds]);
  assert.equal(
    resolveShopId('stcatherines', fakeCanonical, SLUG_TO_ID),
    SLUG_TO_ID['stcatherines'],
    'legacy table must take precedence over canonical membership'
  );
});

test('ADR-0043: canonical id from hospices-all.json resolves to itself', () => {
  for (const id of ['en-1-126365065', 'sc-oscar-005623', 'wales-r4']) {
    assert.ok(canonicalIds.has(id), `fixture expectation: ${id} in canonical set`);
    assert.equal(resolveShopId(id, canonicalIds, SLUG_TO_ID), id);
  }
  // Every canonical id resolves to itself (not just the three samples).
  for (const id of canonicalIds) assert.equal(resolveShopId(id, canonicalIds, SLUG_TO_ID), id);
});

test('ADR-0043: a typoed or foreign id resolves to null (no blind ?? fallback)', () => {
  assert.equal(resolveShopId('stcatherine', canonicalIds, SLUG_TO_ID), null);
  assert.equal(resolveShopId('en-9-999999999', canonicalIds, SLUG_TO_ID), null);
  assert.equal(resolveShopId('EN-1-126365065', canonicalIds, SLUG_TO_ID), null, 'id set is case-sensitive');
  assert.equal(resolveShopId('', canonicalIds, SLUG_TO_ID), null);
});

test('ADR-0043: the 138 committed baseline entries resolve byte-for-byte as before', () => {
  const baseline = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'shops-website-baseline.json'), 'utf8')
  );
  assert.equal(baseline.length, 138, 'committed baseline fixture is the 138-entry pre-crawl copy');
  for (const e of baseline) {
    const before = SLUG_TO_ID[e.hospiceId]; // pre-change build lookup
    const after = resolveShopId(e.hospiceId, canonicalIds, SLUG_TO_ID);
    assert.equal(after, before, `baseline entry ${e.name} (${e.hospiceId}) must resolve identically`);
    assert.ok(after, `baseline entry ${e.name} must still resolve (build hard-fail preserved)`);
  }
});
