// Cycle 8 (C8) — function-side suite for the Pages Function proxy (A§4).
// `.mjs` importing `.ts` is the existing convention (tests/postcodes.test.mjs):
// functions/ is outside `tsc -b` by design, so this suite IS the
// function-side check. Zero network: the module under test has no fetch and
// nothing here calls one. Credentials are placeholders only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  validatePostcodeShape,
  toSpacedForm,
  buildUpstreamRequest,
  shapeUpstream,
} from '../functions/api/postcodes/handler.ts';
import {
  VALID_COMPACT,
  SPACED_NORMALISES_TO,
  INVALID,
  SPACED_FORM,
  WIRE_ENCODED,
  WIRE_ENCODED_INVALID,
  PLACEHOLDER_CREDS,
} from './postcode-vectors.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('C8 (R-2): the route shell pins the exact env-key name literals', () => {
  const route = readFileSync(
    join(__dirname, '..', 'functions', 'api', 'postcodes', '[postcode].ts'),
    'utf8',
  );
  for (const key of [
    'POSTCODES_IO_BASE',
    'POSTCODES_ACCESS_CLIENT_ID',
    'POSTCODES_ACCESS_CLIENT_SECRET',
  ]) {
    assert.ok(route.includes(key), `route shell must read env by exact name: ${key}`);
  }
});

test('C8: validatePostcodeShape — shared vector set (R-5 parity)', () => {
  for (const code of VALID_COMPACT) {
    assert.equal(validatePostcodeShape(code), code);
  }
  for (const [raw, compact] of SPACED_NORMALISES_TO) {
    assert.equal(validatePostcodeShape(raw), compact);
  }
  for (const raw of INVALID) {
    assert.equal(validatePostcodeShape(raw), null);
  }
});

test('C8 (C8-OPS-2): percent-encoded wire segments decode to the compact form', () => {
  for (const [raw, compact] of WIRE_ENCODED) {
    assert.equal(validatePostcodeShape(raw), compact);
  }
  for (const raw of WIRE_ENCODED_INVALID) {
    assert.equal(validatePostcodeShape(raw), null);
  }
});

test('C8: toSpacedForm — shared spaced-form expectations (R-5 parity)', () => {
  for (const [compact, spaced] of SPACED_FORM) {
    assert.equal(toSpacedForm(compact), spaced);
  }
});

test('C8: buildUpstreamRequest strips trailing slashes; exact header set', () => {
  const req = buildUpstreamRequest('test-base/', 'LS14AP', 'test-id', 'test-secret');
  assert.equal(req.url, 'test-base/postcodes/LS1 4AP');
  assert.equal(req.method, 'GET');
  assert.deepEqual(req.headers, {
    'CF-Access-Client-Id': 'test-id',
    'CF-Access-Client-Secret': 'test-secret',
  });
  // No extra headers: exactly the two CF-Access-* keys.
  assert.deepEqual(
    Object.keys(req.headers).sort(),
    ['CF-Access-Client-Id', 'CF-Access-Client-Secret'],
  );
  // A base without a trailing slash composes identically (no seam drift).
  assert.equal(
    buildUpstreamRequest(PLACEHOLDER_CREDS.base, 'CF119HD', 'test-id', 'test-secret').url,
    'test-base/postcodes/CF11 9HD',
  );
});

test('C8: shapeUpstream — 200 + finite coords → 200 stripped to exactly 3 keys', () => {
  const out = shapeUpstream(200, {
    result: [
      {
        postcode: 'LS1 4AP',
        latitude: 51.2345,
        longitude: -0.5432,
        source: 'must-not-leak',
        extra: 'upstream-internal',
      },
    ],
    status: 200,
  });
  assert.equal(out.status, 200);
  const parsed = JSON.parse(out.body);
  assert.deepEqual(Object.keys(parsed).sort(), ['latitude', 'longitude', 'postcode']);
  assert.equal(parsed.postcode, 'LS1 4AP');
  assert.equal(parsed.latitude, 51.2345);
  assert.equal(parsed.longitude, -0.5432);
});

test('C8: shapeUpstream — 200 + missing/non-finite coords → 404', () => {
  for (const body of [
    { result: [] },
    { result: null },
    null,
    { result: [{ postcode: 'AA9 9AA', latitude: 'x', longitude: 1 }] },
    { result: [{ postcode: 'AA9 9AA', latitude: NaN, longitude: 1 }] },
    { result: [{ postcode: 'AA9 9AA' }] },
  ]) {
    assert.equal(shapeUpstream(200, body).status, 404);
  }
});

test('C8: shapeUpstream — status table (404/403/500/503), incl. parsed = null', () => {
  assert.equal(shapeUpstream(404, { result: [] }).status, 404);
  assert.equal(shapeUpstream(403, null).status, 502);
  assert.equal(shapeUpstream(403, { result: [{ postcode: 'x', latitude: 1, longitude: 2 }] }).status, 502);
  assert.equal(shapeUpstream(500, null).status, 502); // R-1 sentinel: route passes 500 on abort/unreachable
  assert.equal(shapeUpstream(503, null).status, 502);
  assert.equal(shapeUpstream(502, null).status, 502);
});

test('C8: shapeUpstream — non-200 bodies are fixed, non-empty JSON, distinct per class, no input echo', () => {
  const poison = { result: [{ postcode: '<<ECHO-ME>>', latitude: 99, longitude: 99 }] };
  const b404a = shapeUpstream(404, null).body;
  const b404b = shapeUpstream(404, poison).body;
  assert.equal(b404a, b404b); // fixed regardless of input
  assert.ok(b404a.length > 0);
  assert.doesNotMatch(b404a, /ECHO-ME/);
  assert.deepEqual(JSON.parse(b404a), { error: 'unknown postcode' });

  const { body: b502a } = shapeUpstream(403, null);
  assert.equal(b502a, shapeUpstream(500, null).body);
  assert.equal(b502a, shapeUpstream(503, poison).body);
  assert.doesNotMatch(b502a, /ECHO-ME/);
  assert.deepEqual(JSON.parse(b502a), { error: 'postcode service unavailable' });

  assert.notEqual(b404a, b502a); // distinct per status class
});
