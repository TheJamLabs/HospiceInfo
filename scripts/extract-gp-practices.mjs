// scripts/extract-gp-practices.mjs
// England extract (work list item 6): every GP practice plus one row per
// hospice organisation, from the committed CQC directory snapshot.
//
// Input: data-raw/cqc-directory-2026-10.csv — 4 preamble lines, then header
// (discovery per ADR-0003: required fields are resolved BY NAME, never
// positional; exits non-zero on a missing field):
//   Name | Address | Postcode | Service types | Provider name |
//   Location URL | CQC Location ID (for office use only)
//
// Outputs (idempotent overwrite):
//   data-raw/gp-practices-en.json — {id, name, address[], postcode}, one per
//     "Doctors/GPs" row, whole of England (the old TARGET_AREAS post-code
//     filter is retired; the historic data-raw/gp-practices-target.json is
//     untouched and remains committed provenance).
//   data-raw/hospices-en.json — {id: 'en-<cqcId>', cqcId, name, address[],
//     postcode}, one row per hospice organisation (G2 dedupe below).
//
// G2 dedupe rule (fixed 2026-10-16 after first-run inspection: 178 raw rows
// contain "hospice"; 152 organisations; 16 multi-row organisations; all 20
// curated CQC ids present, each in its own single-row organisation):
//   Group by normalized Provider name (fallback: normalized location Name).
//   The main site of each group is chosen by
//     1. exact normalized Name == provider name (several: smallest CQC id);
//     2. else among rows where one name contains the other, the highest
//        shorter/longer ratio, then smallest CQC id — the location named
//        like its organisation is the main site;
//     3. else highest Levenshtein similarity to the provider name, then
//        smallest CQC id.
//   The 20 curated (CATCHMENTS) ids never sit in a multi-row group, so the
//   rule cannot displace a curated identity — asserted below (exit 1).

import fs from 'node:fs';
import { CATCHMENTS } from './catchment-map.mjs';

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

const sim = (a, b) => {
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  return 1 - lev(a, b) / Math.max(la, lb);
};

const text = fs.readFileSync('data-raw/cqc-directory-2026-10.csv', 'utf8');
const rows = parseCSV(text);

const headerIdx = rows.findIndex((r) => (r[0] || '').trim() === 'Name');
if (headerIdx < 0) {
  console.error('CQC header row not found in data-raw/cqc-directory-2026-10.csv');
  process.exit(1);
}
console.log('CQC snapshot:', rows.slice(0, headerIdx).filter((r) => (r[0] || '').trim()).join(' | '));
const header = rows[headerIdx].map((h) => (h || '').trim());
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) {
    console.error(`required CQC field missing: "${name}" — header: ${header.join(' | ')}`);
    process.exit(1);
  }
  return i;
};
const cName = col('Name');
const cAddr = col('Address');
const cPc = col('Postcode');
const cType = col('Service types');
const cProv = col('Provider name');
const cUrl = col('Location URL');
const cId = col('CQC Location ID (for office use only)');

const data = rows.slice(headerIdx + 1).filter((r) => (r[cName] || '').trim() !== '');

// ---- practices: all "Doctors/GPs" rows, no regional filter (item 6)
const practices = [];
const seen = new Set();
for (const r of data) {
  if ((r[cType] || '').trim().split('|')[0] !== 'Doctors/GPs') continue; // field may carry multiple types
  const pc = (r[cPc] || '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (pc.length < 2) continue; // no outcode -> not geocodable
  const url = (r[cUrl] || '').trim();
  const anchor = url.split('/').filter(Boolean).pop() || (r[cName] || '').trim();
  if (seen.has(anchor)) continue;
  seen.add(anchor);
  practices.push({
    id: `en-${anchor}`,
    name: (r[cName] || '').trim(),
    address: (r[cAddr] || '').split(',').map((s) => s.trim()).filter(Boolean),
    postcode: pc,
  });
}

// ---- hospice organisations (G2)
const hospRows = data.filter((r) => (r[cName] || '').toLowerCase().includes('hospice'));
const groups = new Map();
hospRows.forEach((r, i) => {
  const key = norm(r[cProv]) || norm(r[cName]) || `unknown-${i}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
});

function pickMain(rs) {
  const provider = norm(rs[0][cProv]) || norm(rs[0][cName]);
  const idAsc = (a, b) => (a[cId] || '').localeCompare(b[cId] || '');
  const exact = rs.filter((r) => norm(r[cName]) === provider);
  if (exact.length) return exact.sort(idAsc)[0];
  const contains = rs.filter((r) => {
    const ln = norm(r[cName]);
    return ln.length > 0 && (provider.includes(ln) || ln.includes(provider));
  });
  if (contains.length) {
    const inProv = contains.filter((r) => provider.includes(norm(r[cName])));
    const pool = inProv.length ? inProv : contains;
    const ratio = (r) => {
      const ln = norm(r[cName]).length;
      return Math.min(ln, provider.length) / Math.max(ln, provider.length);
    };
    return [...pool].sort((a, b) => (ratio(b) - ratio(a)) || idAsc(a, b))[0];
  }
  return [...rs].sort((a, b) =>
    (sim(norm(b[cName]), provider) - sim(norm(a[cName]), provider)) || idAsc(a, b)
  )[0];
}

let noIdFallback = 0;
const hospices = [...groups.values()].map((rs, i) => {
  const r = pickMain(rs);
  const cqcId = (r[cId] || '').trim();
  if (!cqcId) noIdFallback++;
  return {
    id: `en-${cqcId || `r${i + 1}`}`,
    cqcId,
    name: (r[cName] || '').trim(),
    address: (r[cAddr] || '').split(',').map((s) => s.trim()).filter(Boolean),
    postcode: (r[cPc] || '').trim().replace(/\s+/g, ' ').toUpperCase(),
  };
});

// curated identity check: all 20 must land in the output, exactly once
const curatedIds = CATCHMENTS.map((c) => (c.cqcUrl.match(/location\/(1-\d+)/) || [])[1]).filter(Boolean);
const counts = new Map();
for (const h of hospices) if (h.cqcId) counts.set(h.cqcId, (counts.get(h.cqcId) || 0) + 1);
const missingOrDoubled = curatedIds.filter((id) => (counts.get(id) || 0) !== 1);
if (missingOrDoubled.length) {
  console.error('curated identities not exactly once in EN hospice output: ' + missingOrDoubled.join(', '));
  process.exit(1);
}

fs.writeFileSync('data-raw/gp-practices-en.json', JSON.stringify(practices));
fs.writeFileSync('data-raw/hospices-en.json', JSON.stringify(hospices));
console.log(`EN practices: ${practices.length}`);
console.log(`EN hospice raw rows: ${hospRows.length} | organisations emitted: ${hospices.length}` +
  (noIdFallback ? ` | rows without a CQC id (fallback id): ${noIdFallback}` : '') +
  ` | curated identities verified: ${curatedIds.length}/${curatedIds.length}`);
