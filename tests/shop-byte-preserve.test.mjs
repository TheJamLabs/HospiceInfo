// Cycle 10 — append-only shop layer: data-raw/shops-website.json must
// byte-preserve the 138 committed baseline entries. The crawl appends
// rows before the closing bracket only; the first 138 entry lines are
// never touched. Checked as a raw-byte PREFIX (not whole-file equality)
// so the test keeps passing after the W14 crawl appends entries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixtureRaw = readFileSync(
  join(__dirname, 'fixtures', 'shops-website-baseline.json'),
  'utf8'
);
const liveRaw = readFileSync(join(__dirname, '..', 'data-raw', 'shops-website.json'), 'utf8');

test('append-only: shops-website.json starts with the 138-entry baseline bytes', () => {
  // The fixture is the pre-crawl file: everything before its final `]`
  // (the closing `]` line itself) is the prefix that must survive.
  const prefix = fixtureRaw.slice(0, fixtureRaw.lastIndexOf(']'));
  assert.ok(
    liveRaw.startsWith(prefix),
    'data-raw/shops-website.json no longer starts with the baseline ' +
      'bytes — the first 138 entries were modified, reordered, or re-serialised'
  );
});

test('append-only: the first 138 parsed entries deep-equal the baseline entries', () => {
  const fixture = JSON.parse(fixtureRaw);
  const live = JSON.parse(liveRaw);
  assert.equal(fixture.length, 138, 'baseline fixture must be the 138-entry pre-crawl copy');
  assert.ok(
    live.length >= fixture.length,
    'live file has fewer entries than the baseline (deletion is not an append)'
  );
  assert.deepStrictEqual(
    live.slice(0, fixture.length),
    fixture,
    'first 138 entries must deep-equal the baseline, in order and position'
  );
});
