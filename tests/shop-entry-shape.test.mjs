// Cycle 10 — exact shape of every entry in data-raw/shops-website.json.
// Must hold on the committed 138-entry file today AND on the grown
// file after the W14 crawl: this is the gate that proves appended
// entries carry the exact schema and resolvable identity.
// Schema (frozen): {hospiceId, name, address[], postcode, source},
// in that key order. offline / pure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { normalisePostcode } from '../scripts/shop-normalise.mjs';
import { CATCHMENTS } from '../scripts/catchment-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const shops = JSON.parse(
  readFileSync(join(__dirname, '..', 'data-raw', 'shops-website.json'), 'utf8')
);
const hospicesAll = JSON.parse(
  readFileSync(join(__dirname, '..', 'data-raw', 'hospices-all.json'), 'utf8')
);

const KEY_ORDER = ['hospiceId', 'name', 'address', 'postcode', 'source'];
const LEGACY_SLUGS = new Set(CATCHMENTS.map((c) => c.id));
const CANONICAL_IDS = new Set(hospicesAll.map((h) => h.id));

test('shape: every entry has exactly the 5 frozen keys, in order', () => {
  for (const e of shops) {
    assert.deepStrictEqual(
      Object.keys(e),
      KEY_ORDER,
      `entry "${e.name}" has keys [${Object.keys(e).join(', ')}] — append rule fixes the key order`
    );
  }
});

test('shape: name is a non-empty string', () => {
  for (const e of shops) {
    assert.equal(typeof e.name, 'string', `entry ${JSON.stringify(e)}: name not a string`);
    assert.ok(e.name.length > 0, `entry ${e.hospiceId}: empty name`);
  }
});

test('shape: address is a non-empty array of strings', () => {
  for (const e of shops) {
    assert.ok(Array.isArray(e.address), `entry ${e.name}: address not an array`);
    assert.ok(e.address.length > 0, `entry ${e.name}: empty address`);
    for (const line of e.address) {
      assert.equal(typeof line, 'string', `entry ${e.name}: non-string address line`);
    }
  }
});

test('shape: postcode is null or equal to its normalised form (D5)', () => {
  for (const e of shops) {
    if (e.postcode === null) continue;
    assert.equal(
      e.postcode,
      normalisePostcode(e.postcode),
      `entry ${e.name}: postcode ${JSON.stringify(e.postcode)} is not in canonical form`
    );
  }
});

test('shape: source is an http(s) URL with a host', () => {
  for (const e of shops) {
    assert.match(
      e.source,
      /^https?:\/\/[a-zA-Z0-9.-]+/,
      `entry ${e.name}: source ${JSON.stringify(e.source)} is not an http(s) URL with a host`
    );
  }
});

test('identity: every hospiceId is a legacy slug or a canonical id (D5)', () => {
  for (const e of shops) {
    assert.ok(
      LEGACY_SLUGS.has(e.hospiceId) || CANONICAL_IDS.has(e.hospiceId),
      `entry ${e.name}: hospiceId ${JSON.stringify(e.hospiceId)} is neither a legacy slug nor a canonical id`
    );
  }
});
