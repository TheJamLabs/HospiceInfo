// Cycle 10 — dedupe key + postcode normalisation (scripts/shop-normalise.mjs).
// The crawl script and the shape test share this one implementation, so
// these tests pin its behaviour: punctuation/case/whitespace-insensitive
// identity, address-line-sensitive distinction, determinism, and the
// D5 canonical postcode form the geocoder's key scheme relies on.
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalisePostcode, normaliseShopKey } from '../scripts/shop-normalise.mjs';

test('dedupe: punctuation/case/whitespace variants of one identity give identical keys', () => {
  const a = normaliseShopKey("St. Catherine's", ['Adlington']);
  const b = normaliseShopKey('St Catherine\'s', ['Adlington']);
  assert.equal(a, b, `"St. Catherine's, Adlington" and "St Catherine's Adlington" must collide`);
  const c = normaliseShopKey('st  catherine’s', ['adlington']);
  assert.equal(a, c, 'case and whitespace must not change the key');
});

test('dedupe: same name with different address lines gives distinct keys', () => {
  const a = normaliseShopKey("St. Catherine's", ['Adlington Road']);
  const b = normaliseShopKey("St. Catherine's", ['Adlington Lane']);
  assert.notEqual(a, b);
});

test('postcode: lower/double-space input canonicalises to uppercase single-space', () => {
  assert.equal(normalisePostcode('m1  1aa'), 'M1 1AA');
  assert.equal(normalisePostcode('PR6 9NN'), 'PR6 9NN', 'already-canonical input is a fixed point');
  assert.equal(normalisePostcode(null), null, 'null passthrough');
});

test('dedupe: the same entry object normalises to the same key twice (deterministic)', () => {
  const entry = {
    name: "St. Catherine's Adlington",
    address: ['4 Babylon Lane', 'Adlington, Chorley'],
  };
  const first = normaliseShopKey(entry.name, entry.address);
  const second = normaliseShopKey(entry.name, entry.address);
  assert.equal(first, second);
  assert.match(first, /^ST CATHERINES ADLINGTON 4 BABYLON LANE ADLINGTON CHORLEY$/);
});
