// Cycle 10 — schema + invariants of data-raw/shop-crawl-log.json (ADR-0045).
// The commit log is the durable crawl record and the resumable state, so a
// malformed row must fail `npm test`, not a human.
// Pre-crawl: the file is absent and this suite passes trivially (G0).
// Post-crawl (W14): the same suite validates the real log — meta header,
// the 8-value outcome vocabulary, row fields, the confirm-row and
// committed-row invariants, and one row per in-scope hospice (208).
// The suite also proves the validator flags violations using one synthetic
// malformed row (green only if the violations are reported).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, '..', 'data-raw', 'shop-crawl-log.json');

export const OUTCOME_VOCABULARY = [
  'ok',
  'no-shop-page',
  'unreadable',
  'skipped-robots',
  'blocked',
  'not-found',
  'no-website',
  'discovery-found',
];
const PHASES = ['discovery', 'crawl', 'confirm'];
const META_KEYS = ['run', 'script', 'ua', 'paceMs', 'outcomeVocabulary', 'source'];
const ROW_KEYS = [
  'hospiceId',
  'nation',
  'site',
  'phase',
  'outcome',
  'pagesVisited',
  'shopsExtracted',
  'deduped',
  'committed',
  'note',
  'unresolvedPostcodes',
  'discoverySource',
];

export function validateCrawlLog(doc) {
  const violations = [];
  if (!doc || typeof doc !== 'object' || !doc.meta || !Array.isArray(doc.entries)) {
    return ['log must be an object with a meta header and an entries array'];
  }
  for (const k of META_KEYS) {
    if (!(k in doc.meta)) violations.push(`meta missing key: ${k}`);
  }
  if (JSON.stringify(doc.meta.outcomeVocabulary) !== JSON.stringify(OUTCOME_VOCABULARY)) {
    violations.push('meta.outcomeVocabulary is not exactly the 8-value vocabulary');
  }
  doc.entries.forEach((row, i) => {
    const where = `entries[${i}] (${typeof row?.hospiceId === 'string' ? row.hospiceId : 'id?'})`;
    for (const k of ROW_KEYS) {
      if (!row || !(k in row)) violations.push(`${where} missing key: ${k}`);
    }
    if (!OUTCOME_VOCABULARY.includes(row?.outcome)) {
      violations.push(`${where} outcome ${JSON.stringify(row?.outcome)} not in the 8-value vocabulary`);
    }
    if (!PHASES.includes(row?.phase)) {
      violations.push(`${where} phase ${JSON.stringify(row?.phase)} not one of ${PHASES.join('/')}`);
    }
    if (typeof row?.pagesVisited !== 'number' || row.pagesVisited < 0) {
      violations.push(`${where} pagesVisited must be a number >= 0`);
    }
    if (typeof row?.shopsExtracted !== 'number' || row.shopsExtracted < 0) {
      violations.push(`${where} shopsExtracted must be a number >= 0`);
    }
    if (typeof row?.deduped !== 'number' || row.deduped < 0) {
      violations.push(`${where} deduped must be a number >= 0`);
    }
    if (typeof row?.committed !== 'boolean') {
      violations.push(`${where} committed must be a boolean`);
    }
    if (typeof row?.note !== 'string') {
      violations.push(`${where} note must be a string`);
    }
    if (!Array.isArray(row?.unresolvedPostcodes)) {
      violations.push(`${where} unresolvedPostcodes must be an array`);
    }
    if (row?.outcome === 'discovery-found' && (!row?.website || !row?.discoverySource)) {
      violations.push(`${where} discovery-found row must carry non-empty website + discoverySource`);
    }
    if (row?.phase === 'confirm' && (row.shopsExtracted !== 0 || row.committed !== false)) {
      violations.push(`${where} confirm-row invariants: shopsExtracted must be 0 and committed must be false`);
    }
    if (row?.committed === true && row.shopsExtracted < 1) {
      violations.push(`${where} committed row must have shopsExtracted >= 1`);
    }
  });
  return violations;
}

function validRow(overrides = {}) {
  return {
    hospiceId: 'en-1-126365065',
    nation: 'England',
    site: 'example.org',
    phase: 'discovery',
    outcome: 'no-website',
    pagesVisited: 0,
    shopsExtracted: 0,
    deduped: 0,
    committed: false,
    note: '',
    unresolvedPostcodes: [],
    discoverySource: null,
    website: null,
    ...overrides,
  };
}

function validDoc() {
  return {
    meta: {
      run: '2026-11-17',
      script: 'scripts/crawl-hospice-shops.mjs',
      ua: 'HospiceInfo-shop-crawl/1.0 (research; contact: ops@example.org)',
      paceMs: 1100,
      outcomeVocabulary: [...OUTCOME_VOCABULARY],
      source: 'data-raw/hospices-all.json',
    },
    entries: [
      validRow({ outcome: 'discovery-found', website: 'https://example.org', discoverySource: 'ddg' }),
      validRow({
        hospiceId: 'sc-oscar-005623',
        phase: 'crawl',
        outcome: 'ok',
        pagesVisited: 2,
        shopsExtracted: 3,
        committed: true,
        discoverySource: null,
        website: 'https://example2.org',
      }),
    ],
  };
}

test('pre-crawl: absent log file is a valid state', () => {
  if (existsSync(LOG_PATH)) {
    const violations = validateCrawlLog(JSON.parse(readFileSync(LOG_PATH, 'utf8')));
    assert.deepEqual(violations, [], `committed crawl log violates schema:\n${violations.join('\n')}`);
  }
});

test('post-crawl completeness: exactly one row per in-scope hospice (208 from hospices-all.json)', () => {
  if (!existsSync(LOG_PATH)) return; // pre-crawl: nothing to count
  const doc = JSON.parse(readFileSync(LOG_PATH, 'utf8'));
  const all = JSON.parse(
    readFileSync(join(__dirname, '..', 'data-raw', 'hospices-all.json'), 'utf8')
  );
  const ids = new Set(doc.entries.map((r) => r.hospiceId));
  assert.equal(doc.entries.length, all.length, `expected ${all.length} rows, got ${doc.entries.length}`);
  for (const h of all) assert.ok(ids.has(h.id), `hospice ${h.id} has no crawl-log row`);
  assert.equal(ids.size, new Set(all.map((h) => h.id)).size, 'duplicate rows for one hospice');
});

test('validator: a schema-valid log produces no violations', () => {
  assert.deepEqual(validateCrawlLog(validDoc()), []);
});

test('validator: a synthetic malformed row is flagged (green only if violations are reported)', () => {
  const doc = validDoc();
  doc.entries.push(
    validRow({
      outcome: 'exploded', // not in the 8-value vocabulary
      phase: 'weird', // not a phase
      committed: true, // but shopsExtracted is 0 -> invariant broken
      shopsExtracted: 0,
    })
  );
  doc.entries.push(
    validRow({
      phase: 'confirm',
      shopsExtracted: 3, // confirm pass must be read-only
      committed: false,
    })
  );
  const violations = validateCrawlLog(doc);
  assert.ok(violations.length >= 4, 'expected >= 4 violations, got: ' + violations.join(' | '));
  assert.ok(violations.some((v) => v.includes('outcome') && v.includes('exploded')));
  assert.ok(violations.some((v) => v.includes('phase') && v.includes('weird')));
  assert.ok(violations.some((v) => v.includes('committed row')));
  assert.ok(violations.some((v) => v.includes('confirm-row invariants')));
  doc.entries.pop();
  doc.entries.pop();
  const removed = validateCrawlLog(doc).length;
  assert.equal(removed, 0, 'clean doc must validate again after removing the malformed rows');
});
