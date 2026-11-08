// scripts/extract-hospices-sc-pcs.mjs
// Scotland hospices — PalliativeCare Scotland (PCS) append (Cycle 5
// landing pass). Lands the PCS hospice-list entries that the OSCAR
// register does not carry; complements the OSCAR append
// (extract-hospices-sc-oscar.mjs), which is untouched.
//
// Input: data-raw/palliativecare-scotland-hospices-2026-11.html — the
// "Hospices and specialist units" directory page (https://
// www.palliativecarescotland.org.uk/content/hospices_specialist_units/),
// human-fetched 2026-11-08, pinned byte-exact from Wayback capture
// 20260514160126 (17,723 B; U+2019 apostrophes intact). The page carries 19
// list entries of the form <li><a href="/content/services_by_nhs_board/
// ?id=N">Name, Town</a></li> (some with a trailing space before </li>);
// the pinned regex tolerates that whitespace and matches all 19.
//
// APPEND mode: PCS rows are appended to data-raw/hospices-sc.json; every
// existing register row (the landed Cycle 5 register: 3 GIS rows + 29 OSCAR
// rows = 32) is preserved —
// appending never rewrites, re-orders, re-keys, or duplicates them (an
// accidental duplicate id trips the merge unique-id assertion,
// merge-hospices.mjs, exit 1).
//
// Entry resolution: name = text before the LAST comma (trimmed), town =
// text after the last comma (trimmed). Deduped against the existing file
// by casefolded full name and by id (sc-pcs-<num> distinct namespace,
// ADR-0031 D3), plus the ADR-0032 explicit equivalence mapping: 13 PCS
// service ids (19, 44, 45, 50, 51, 57, 61, 63, 67, 68, 70, 75, 76) are
// known to duplicate existing register rows (e.g. id 76 "Ayrshire Hospice,
// Ayr" -> sc-oscar-011390 "The Ayrshire Hospice") and are suppressed
// without a name match. Together with the 4 strict-name covers (ids 5, 43,
// 52, 72), that leaves exactly 2 appends (ids 30, 58). The appended row
// mirrors the adjacent row shape exactly —
// {id, name, address, town, postcode} — with no invented fields: address
// is [] (array, like every adjacent row) and postcode is '' (the PCS
// list carries neither; ADR-0012: unplaced rows are hidden, the chain
// stays green).
//
// Delta guard: the pin is a known 21-entry snapshot; the expected delta
// against the landed register is exactly 2 (sc-pcs-30 "Marie Curie
// Hospice", Edinburgh; sc-pcs-58 "Queen Margaret Hospital Hospice Ward
// (Ward 16)", Dunfermline). added = 0 -> idempotent re-run (no write,
// exit 0); added = 2 -> write; any other count -> log
// `PCS delta unexpected: N` + the full name list, NO write, EXIT 1
// (BLOCKED — the pin drifted vs the research reconciliations; re-pin
// before landing).
//
// In-script verify: after the write, the file is re-read and the
// pre-image rows (all rows present before this run) must be JSON-equal in
// place (rows [0 .. preImageCount) untouched); a mismatch exits 1.
//
// G3 tolerance: absent raw -> 0 rows appended, existing hospices-sc.json
// re-serialized deterministically (JSON.parse -> JSON.stringify), EXIT 0
// (valid zero-set, not an error — human gate in transit). First run on a
// present raw logs the entry count + first entry (ADR-0003) before the
// mapping is trusted.
//
// Read as UTF-8, written as UTF-8 — no BOM, no transcoding (U+2019 must
// survive byte-exact).

import fs from 'node:fs';

const RAW = 'data-raw/palliativecare-scotland-hospices-2026-11.html';
const OUT = 'data-raw/hospices-sc.json';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));

if (!fs.existsSync(RAW)) {
  console.log(`PCS raw absent (${RAW}) — G3: 0 rows appended; ${OUT} re-serialized deterministically with the ${existing.length} existing rows (valid zero-set, not an error — human gate in transit, pin per Cycle 5 landing pass)`);
  fs.writeFileSync(OUT, JSON.stringify(existing, null, 2));
  process.exit(0);
}

const html = fs.readFileSync(RAW, 'utf8');
const entries = [];
for (const m of html.matchAll(/<li>\s*<a[^>]*href="\/content\/services_by_nhs_board\/\?id=(\d+)"[^>]*>\s*([^<]+?)\s*<\/a>\s*<\/li>/g)) {
  const full = m[2];
  const ci = full.lastIndexOf(',');
  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"');
  const name = decode((ci >= 0 ? full.slice(0, ci) : full).trim());
  const town = decode((ci >= 0 ? full.slice(ci + 1) : '').trim());
  if (!name) continue;
  entries.push({ num: Number(m[1]), name, town, full });
}
if (entries.length < 2) {
  console.error(`PCS raw has no data entries (${RAW}; entries found: ${entries.length})`);
  process.exit(1);
}
console.log(`pcs scotland raw: ${entries.length} entries matched (ADR-0003 first entry: id=${entries[0].num} "${entries[0].full}")`);
console.log(`pcs scotland raw sample: ${entries.map((e) => `id=${e.num} "${e.full}"`).slice(0, 3).join(' | ')}`);

const existingNames = new Set(existing.map((h) => h.name.toLowerCase()));
const existingIds = new Set(existing.map((h) => h.id));
// ADR-0032 equivalence table: PCS service id -> existing register row it duplicates
const MAP = { 19: 'sc-oscar-r21', 44: 'sc-oscar-006888', 45: 'sc-oscar-011541', 50: 'sc-oscar-012372', 51: 'sc-oscar-r27', 57: 'sc-oscar-r18', 61: 'sc-oscar-r23', 63: 'sc-oscar-015783', 67: 'sc-oscar-003634', 68: 'sc-oscar-010159', 70: 'sc-oscar-r20', 75: 'sc-oscar-r22', 76: 'sc-oscar-011390' };
const appended = [];
for (const e of entries) {
  const id = `sc-pcs-${e.num}`;
  if (existingNames.has(e.name.toLowerCase()) || existingIds.has(id) || MAP[e.num]) continue; // strict name dedup + ADR-0032 equivalence mapping
  appended.push({ id, name: e.name, address: [], town: e.town, postcode: '' });
}

if (appended.length === 0) {
  console.log(`PCS append: ${existing.length} total | added: 0 (idempotent — all ${entries.length} entries already present in ${OUT})`);
  process.exit(0);
}
if (appended.length !== 2) {
  console.error(`PCS delta unexpected: ${appended.length}`);
  console.error(`PCS appended name list: ${appended.map((a) => `${a.id} "${a.name}", ${a.town}`).join('; ')}`);
  process.exit(1);
}

const out = [...existing, ...appended];
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

// in-script verify: pre-image preserved in place
const written = JSON.parse(fs.readFileSync(OUT, 'utf8'));
for (let i = 0; i < existing.length; i++) {
  if (!same(existing[i], written[i])) {
    console.error(`PCS pre-image mismatch at row ${i + 1} (${existing[i].id}) — append must never rewrite existing rows`);
    process.exit(1);
  }
}

console.log(`PCS append: ${out.length} total | added: ${appended.length} (${appended.map((a) => `${a.id} "${a.name}", ${a.town}`).join('; ')})`);
