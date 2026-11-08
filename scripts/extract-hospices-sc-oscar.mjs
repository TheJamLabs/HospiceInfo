// scripts/extract-hospices-sc-oscar.mjs
// Scotland hospices — OSCAR append (Cycle 5, ADR-0031 D2/D3/D4).
//
// Input: data-raw/oscar-scotland-hospices-2026-11.csv (human-fetched,
// gate H5-2, HUMAN-FETCH — procedure in .agents/research.md §5.3.5; the
// reconciled OSCAR set, one row per hospice site).
//
// APPEND mode: the OSCAR rows are appended to data-raw/hospices-sc.json; the
// 3 existing GIS rows (sc-CS2014323454, sc-CS2022000173, sc-CS2023000094)
// are register rows of record and are preserved (identity stability,
// ADR-0031 D5 — appending never rewrites, re-orders, re-keys, or duplicates
// them; any accidental duplicate id trips the merge unique-id assertion,
// merge-hospices.mjs, exit 1). The GIS extractor
// (scripts/extract-hospices-sc.mjs) is untouched.
//
// Column resolution (by name; R-1 `!== -1` sentinel — the retired `||`
// chain fell through on a falsy index 0 and short-circuited on a truthy
// -1):
//   name      'organisation' exact -> 'name' exact -> first header
//             containing 'name'; none -> exit 1 with the logged header
//   id        'sc-oscar-<SC>' where SC = 6-digit Scottish Charity Number
//             (first header containing 'sc', row value validated
//             /^\d{6}$/); row without a valid SC -> 'sc-oscar-r<n>' where n
//             is the 1-based position of that row within the OSCAR body
//             (stable against the CSV, not a per-fallback counter);
//             distinct namespace, ADR-0031 D3
//   town      first header containing 'town' (optional; default '')
//   postcode  first header containing 'post' (whitespace-collapsed,
//             uppercased); blank-postcode rows are KEPT and reported
//             (geocoding gate — ADR-0012: unplaced rows are hidden, the
//             chain stays green)
//   address   first header containing 'address', if present — raw-row
//             metadata consumed by the merge's townOf only, never
//             published (ADR-0031 D4)
//
// NO "hospice" substring filter: the OSCAR export is already the
// reconciled hospice set; empty names are the only rows dropped.
//
// G3 tolerance: absent CSV -> 0 rows appended, existing hospices-sc.json
// re-serialized deterministically (JSON.parse -> JSON.stringify), EXIT 0
// (valid zero-set; H5-2 in transit).
//
// Idempotent: re-runs skip rows whose id already exists in the register
// (a duplicate id would trip the merge unique-id assertion, exit 1).
//
// Read as UTF-8, written as UTF-8 — no BOM, no transcoding.

import fs from 'node:fs';

const RAW = 'data-raw/oscar-scotland-hospices-2026-11.csv';
const OUT = 'data-raw/hospices-sc.json';

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

const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));

if (!fs.existsSync(RAW)) {
  console.log(`OSCAR raw absent (${RAW}) — G3: 0 rows appended; ${OUT} re-serialized deterministically with the ${existing.length} existing rows (valid zero-set, not an error — human gate H5-2 / HUMAN-FETCH per ADR-0031 D5, OSCAR extract reconciled vs the PPPC seed, procedure in .agents/research.md §5.3.5)`);
  fs.writeFileSync(OUT, JSON.stringify(existing, null, 2));
  process.exit(0);
}

const rows = parseCSV(fs.readFileSync(RAW, 'utf8'));
if (rows.length < 2) {
  console.error(`OSCAR raw has no data rows (${RAW}; rows found: ${rows.length})`);
  process.exit(1);
}
const header = rows[0].map((h) => (h || '').trim());
console.log(`oscar scotland csv header: ${header.join(', ')}`);
console.log(`oscar scotland csv sample row: ${rows[1].join(' | ')}`);

// R-1 (Cycle 5): explicit priority loop, `!== -1` sentinel. Array `find`
// yields `undefined` when NO candidate matches, so `?? -1` normalises the
// sentinel before the contains-'name' fallback is consulted (none at all
// -> exit 1).
const NAME_CANDIDATES = ['organisation', 'name'];
let iName = NAME_CANDIDATES
  .map((c) => header.findIndex((h) => h.toLowerCase() === c))
  .find((idx) => idx !== -1) ?? -1;
if (iName === -1) iName = header.findIndex((h) => h.toLowerCase().includes('name'));
if (iName === -1) {
  console.error(`OSCAR raw: no name column — header: ${header.join(', ')}`);
  process.exit(1);
}
const iSc = header.findIndex((h) => h.toLowerCase().includes('sc'));
const iTown = header.findIndex((h) => h.toLowerCase().includes('town'));
const iPc = header.findIndex((h) => h.toLowerCase().includes('post'));
const iAddr = header.findIndex((h) => h.toLowerCase().includes('address'));

let fallbackCount = 0, blankPc = 0;
const appended = [];
rows.slice(1).forEach((r, bi) => {
  const name = (r[iName] || '').trim();
  if (!name) return; // empty names are the only rows dropped
  const postcode = iPc >= 0 ? (r[iPc] || '').trim().replace(/\s+/g, ' ').toUpperCase() : '';
  if (!postcode) blankPc++;
  const scv = iSc >= 0 ? (r[iSc] || '').trim() : '';
  let id;
  if (/^\d{6}$/.test(scv)) {
    id = `sc-oscar-${scv}`;
  } else {
    fallbackCount++;
    id = `sc-oscar-r${bi + 1}`; // 1-based position within the OSCAR body
  }
  const row = { id, name };
  if (iAddr >= 0) {
    const a = (r[iAddr] || '').trim();
    if (a) row.address = [a];
  }
  row.town = iTown >= 0 ? (r[iTown] || '').trim() : '';
  row.postcode = postcode;
  appended.push(row);
});

const existingIds = new Set(existing.map((h) => h.id));
const kept = appended.filter((row) => !existingIds.has(row.id)); // idempotent re-run: skip rows whose id is already in the register
const out = [...existing, ...kept];
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`OSCAR append: ${kept.length} rows appended (${appended.length - kept.length} skipped — id already present; usable postcodes: ${kept.length - blankPc}, blank postcodes KEPT+reported: ${blankPc}, id-fallback sc-oscar-r<n>: ${fallbackCount}); ${OUT} now ${out.length} rows`);
