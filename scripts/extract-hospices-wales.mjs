// scripts/extract-hospices-wales.mjs
// Wales hospices (work list item 9, G3).
//
// PRIMARY raws (ADR-0033, fetched 2026-11-08): the five NHS Wales
// Performance & Improvement (P&I) regional sub-pages under
// https://performanceandimprovement.nhs.wales/our-work/ow/peolc/hospices-and-palliative-care-services/<region>/
// — each embeds its service list as `var mapPlots = '<JSON>';` (an array
// of {id, postcode, title, url}); the parent page is an "under review"
// placeholder with no list. Pinned as:
//   data-raw/nhs-wales-hospices-2026-11-north-wales.html
//   data-raw/nhs-wales-hospices-2026-11-mid-and-west-wales.html
//   data-raw/nhs-wales-hospices-2026-11-south-wales-west.html
//   data-raw/nhs-wales-hospices-2026-11-south-wales-central.html
//   data-raw/nhs-wales-hospices-2026-11-south-wales-east.html
//
// SCOPE (ADR-0033, human directive 2026-11-08): HOSPICES ONLY. The source
// list mixes independent hospices with hospital-based palliative care
// services; hospital-based entries are excluded by additive-negative token
// matching on the FULL title — never a "hospice" substring whitelist, so
// Welsh names such as Tŷ Hafan, Y Rhosyn, Hosbis Hafren are not filtered
// out by lacking the English word in the name.
//
// RAW FAILURE MODES:
// - 0/5 regional pins present -> the legacy chain below runs (parent pin ->
//   HHW CSV -> HHW HTML), with its G3 zero-set semantics: all three
//   absent -> [] + EXIT 0 (valid zero-set placeholder, not an error);
//   raw present without a parseable list -> [] + EXIT 0 (the parent pin
//   is an under-review placeholder); raw present with <2 data rows ->
//   EXIT 1 (malformed pin, not a zero-set).
// - 1-4 regional pins present -> EXIT 1 (partial pin set = a stale pin;
//   a whole region must not be dropped silently).
// - a present regional raw missing mapPlots / invalid JSON / empty array
//   -> EXIT 1.
//
// First run on present files logs per-region entry count + first entry
// (ADR-0003) before anything is written, plus every kept and excluded
// row, so a human can verify the mapping.
//
// Read as UTF-8, written as UTF-8 — no BOM, no transcoding (Welsh
// orthography such as Tŷ Hafan / Y Rhoel must survive byte-exact).
//
// Output: data-raw/hospices-wales.json — {id: 'wales-r<n>', name, postcode}
// (n = 1-based position among kept rows, north-wales first; row anchors
// UNVERIFIED, ADR-0002). Empty names are the only rows dropped from the
// regional parse.

import fs from 'node:fs';

// The five NHS Wales P&I regional pages, fixed order (north -> mid-west ->
// south-west -> south-central -> south-east) — the ids are assigned in
// this order, so REGIONAL_RAW is the id-allocation oracle.
const REGIONAL_RAW = [
  { region: 'north-wales', path: 'data-raw/nhs-wales-hospices-2026-11-north-wales.html' },
  { region: 'mid-and-west-wales', path: 'data-raw/nhs-wales-hospices-2026-11-mid-and-west-wales.html' },
  { region: 'south-wales-west', path: 'data-raw/nhs-wales-hospices-2026-11-south-wales-west.html' },
  { region: 'south-wales-central', path: 'data-raw/nhs-wales-hospices-2026-11-south-wales-central.html' },
  { region: 'south-wales-east', path: 'data-raw/nhs-wales-hospices-2026-11-south-wales-east.html' },
];

// Legacy fallback pins (consulted ONLY when 0/5 regional pins are present).
const RAW_HTML = 'data-raw/nhs-wales-hospices-2026-11.html';
const RAW_CSV = 'data-raw/hospicehealth-wales-members-2026-11.csv';
const RAW_HHW_HTML = 'data-raw/hospicehealth-wales-members-2026-11.html';

// Hospital-based service tokens (ADR-0033). 'ysbyty' is the Welsh word for
// "hospital" (e.g. Ysbyty Ystrad Fawr).
const EXCLUDE_TOKENS = /hospital|ysbyty|spct|unit/i;

// A regional page carries its list as `var mapPlots = '<JSON>';` — a
// single-quoted JS string, JSON text inside. Any missing marker, invalid
// JSON, or empty array is a stale pin: fail fast.
function parseMapPlots(html, path) {
  const m = html.match(/var mapPlots\s*=\s*'([\s\S]*?)';/);
  if (!m) {
    console.error(`Wales raw: ${path} — mapPlots array not found (pin stale? re-fetch the regional page)`);
    process.exit(1);
  }
  let plots;
  try {
    plots = JSON.parse(m[1]);
  } catch (e) {
    console.error(`Wales raw: ${path} — mapPlots is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(plots) || plots.length === 0) {
    console.error(`Wales raw: ${path} — mapPlots array is empty`);
    process.exit(1);
  }
  return plots;
}

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

// Minimal saved-page table parse (research §5.2.4): first <table> only,
// row-by-row, cells tag-stripped + entity-decoded. No scraping.
function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
function parseHTMLTable(html) {
  const table = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
  if (!table) return [];
  const rows = [];
  for (const tr of table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<(t[dh])[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map((m) => decodeEntities(m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

let rows = null;
let mode = null;
let rawPath = null;
let rawText = null;
if (fs.existsSync(RAW_HTML)) {
  rawPath = RAW_HTML; mode = 'html';
  rawText = fs.readFileSync(RAW_HTML, 'utf8');
} else if (fs.existsSync(RAW_CSV)) {
  rawPath = RAW_CSV; mode = 'csv';
  rawText = fs.readFileSync(RAW_CSV, 'utf8');
} else if (fs.existsSync(RAW_HHW_HTML)) {
  rawPath = RAW_HHW_HTML; mode = 'html';
  rawText = fs.readFileSync(RAW_HHW_HTML, 'utf8');
}
if (!rawPath) {
  console.log(`Wales hospices raw absent (${RAW_HTML}, ${RAW_CSV}, ${RAW_HHW_HTML} all missing) — G3: hospices-wales.json = [] (0 Wales hospices: valid zero-set placeholder, not an error — human designation per ADR-0031 D5, procedure in .agents/research.md §5.2.5)`);
  fs.writeFileSync('data-raw/hospices-wales.json', JSON.stringify([]));
  process.exit(0);
}
if (mode === 'html' && !/<table[^>]*>/i.test(rawText)) {
  // The pinned NHS Wales P&I page (fetched 2026-11-08, 7 attempts,
  // consistently 61,851-61,852 B) carries breadcrumb + h1 only — the
  // section is under review, the hospice list is absent.
  console.log(`Wales hospices: raw present (${rawPath}), hospice list absent (NHS Wales P&I section under review, fetched 2026-11-08) — G3 zero-set: 0 rows, exit 0`);
  fs.writeFileSync('data-raw/hospices-wales.json', JSON.stringify([]));
  process.exit(0);
}
rows = mode === 'html' ? parseHTMLTable(rawText) : parseCSV(rawText);
if (rows.length < 2) {
  console.error(`Wales hospices raw has no data rows (${rawPath}, mode ${mode}; rows found: ${rows.length})`);
  process.exit(1);
}
const header = rows[0].map((h) => (h || '').trim());
console.log(`Wales raw mode: ${mode} (${rawPath})`);
console.log(`wales raw header: ${header.join(', ')}`);
console.log(`wales raw sample row: ${rows[1].join(' | ')}`);

// R-1 (Cycle 5): explicit priority loop, `!== -1` sentinel — first match
// wins. The retired `a || b || c` chain fell through on a falsy index 0
// and short-circuited on a truthy -1. Array `find` yields `undefined`
// when NO candidate matches, so `?? -1` normalises the sentinel before
// the contains-'name' fallback is consulted (none at all -> exit 1).
const NAME_CANDIDATES = ['service name', 'name'];
let iName = NAME_CANDIDATES
  .map((c) => header.findIndex((h) => h.toLowerCase() === c))
  .find((idx) => idx !== -1) ?? -1;
if (iName === -1) iName = header.findIndex((h) => h.toLowerCase().includes('name'));
if (iName === -1) {
  console.error(`Wales raw: no name column — header: ${header.join(', ')}`);
  process.exit(1);
}
const iPc = header.findIndex((h) => h.toLowerCase().includes('post'));

const out = rows.slice(1).map((r) => ({
  name: (r[iName] || '').trim(),
  postcode: iPc >= 0 ? (r[iPc] || '').trim().replace(/\s+/g, ' ').toUpperCase() : '',
})).filter((e) => e.name).map((e, i) => ({ id: `wales-r${i + 1}`, ...e }));

fs.writeFileSync('data-raw/hospices-wales.json', JSON.stringify(out));
console.log(`Wales hospices: ${out.length} (mode: ${mode}, with postcode: ${out.filter((e) => e.postcode).length})`);
