// scripts/extract-hospices-wales.mjs
// Wales hospices (work list item 9, G3): the CIW register has no bulk
// export (research §2.3 — the SPA returns a 4 KB redirect stub; no
// address-level data is published). The list therefore comes from a
// HUMAN-prepared CSV (CIW email request B1, text in data/README.md when
// drafted) saved as:
//   data-raw/wales-hospices-2026-10.csv
// with a name column (tried: "Service name", "Name", "Hospice name") and,
// if present, a postcode column.
//
// ABSENT file (current state): write [], log the line, EXIT 0 (G3:
// zero-set tolerance — the build stays valid, Wales hospices = 0 until the
// CIW reply lands). No error, no placeholder text in the output.
//
// First run on a present file logs the header + first data row (ADR-0003)
// before the filter is trusted; the name column is resolved BY NAME and the
// script exits non-zero if it cannot be found.
//
// Output: data-raw/hospices-wales.json — {id: 'wales-<n>', name, postcode}
// (n = 1-based position in the file; row anchors are UNVERIFIED, ADR-0002).

import fs from 'node:fs';

const RAW = 'data-raw/wales-hospices-2026-10.csv';

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

if (!fs.existsSync(RAW)) {
  console.log(`Wales hospices CSV absent (${RAW}) — G3: hospices-wales.json = [] (0 Wales hospices until the CIW reply, B1)`);
  fs.writeFileSync('data-raw/hospices-wales.json', JSON.stringify([]));
  process.exit(0);
}

const rows = parseCSV(fs.readFileSync(RAW, 'utf8'));
if (rows.length < 2) {
  console.error(`Wales hospices CSV has no data rows (controls: ${rows.length})`);
  process.exit(1);
}
const header = rows[0].map((h) => (h || '').trim());
console.log(`wales hospices csv header: ${header.join(', ')}`);
console.log(`wales hospices csv sample row: ${rows[1].join(' | ')}`);
const iName =
  header.findIndex((h) => h.toLowerCase() === 'service name')
  || header.findIndex((h) => h.toLowerCase() === 'name')
  || header.findIndex((h) => h.toLowerCase().includes('name'));
if (iName < 0) {
  console.error(`Wales hospices CSV: no name column — header: ${header.join(', ')}`);
  process.exit(1);
}
const iPc = header.findIndex((h) => h.toLowerCase() === 'postcode');

const out = rows.slice(1).map((r) => ({
  name: (r[iName] || '').trim(),
  postcode: iPc >= 0 ? (r[iPc] || '').trim().replace(/\s+/g, ' ').toUpperCase() : '',
})).filter((e) => e.name).map((e, i) => ({ id: `wales-${i + 1}`, ...e }));

fs.writeFileSync('data-raw/hospices-wales.json', JSON.stringify(out));
console.log(`Wales hospices: ${out.length}`);
