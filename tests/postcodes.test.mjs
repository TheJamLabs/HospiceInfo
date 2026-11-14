// Node built-in runner (C6-3): postcode normalisation and the confirmed
// lookup behaviour against the committed data file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { normalisePostcode } from '../src/lib/postcodes.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const practices = JSON.parse(
  readFileSync(join(__dirname, '..', 'public', 'data', 'practices.json'), 'utf8'),
);
// Same keying as StartHere.tsx: the file stores the space form ("LS1 4AP"),
// so both sides are normalised before lookup.
const byPostcode = new Map(practices.map((p) => [normalisePostcode(p.postcode), p.name]));

test('normalisePostcode strips non-alphanumerics and upper-cases', () => {
  assert.equal(normalisePostcode('ls1 4ap'), 'LS14AP');
  assert.equal(normalisePostcode('CF11 9HD'), 'CF119HD');
  assert.equal(normalisePostcode('  bt15-3lh '), 'BT153LH');
  assert.equal(normalisePostcode('LS14AP'), 'LS14AP');
  assert.equal(normalisePostcode('!@#'), '');
});

test('LS1 4AP resolves to a practice (positive vector)', () => {
  assert.ok(byPostcode.has('LS14AP'), 'LS1 4AP missing from public/data/practices.json');
});

test('CF11 9HD and BT15 3LH do not resolve (clean not-found, no throw)', () => {
  assert.equal(byPostcode.has('CF119HD'), false);
  assert.equal(byPostcode.has('BT153LH'), false);
});
