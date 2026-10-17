// scripts/extract-hospices-sc.mjs
// Scotland hospices (work list item 7): filter the Care Inspectorate
// Scotland datastore CSV for Name containing "hospice".
//
// Input: data-raw/care-inspectorate-scotland-2026-08.csv (OGL; data as at
// 31 August 2026, source file 260831datastoreexternal.csv, fetched
// 2026-10-16 — see data/README.md).
//
// First-run discovery (ADR-0003, 2026-10-16): header logged — 73 columns,
// key ones: CSNumber, ServiceName, Address_line_1..4, Service_town,
// Service_Postcode, ServiceStatus. Fields are resolved BY NAME below; the
// script exits non-zero if a required field is missing.
//
// Output: data-raw/hospices-sc.json — {id: 'sc-<CSNumber>', name, address[],
// postcode}, one row per matching service (filter: ServiceName contains
// "hospice", case-insensitive; no status filter, per the work list).

import fs from 'node:fs';

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

const RAW = 'data-raw/care-inspectorate-scotland-2026-08.csv';
const rows = parseCSV(fs.readFileSync(RAW, 'utf8'));
if (rows.length < 2 || (rows[0][0] || '').trim() !== 'CSNumber') {
  console.error(`SC datastore layout unexpected (first cell: ${JSON.stringify(rows[0][0])}) — re-check the header`);
  process.exit(1);
}
console.log(`SC datastore header (${rows[0].length} cols, first 8): ${rows[0].slice(0, 8).join(', ')}`);
const header = rows[0].map((h) => (h || '').trim());
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) {
    console.error(`required SC field missing: "${name}"`);
    process.exit(1);
  }
  return i;
};
const cCS = col('CSNumber');
const cName = col('ServiceName');
const cTown = col('Service_town');
const cPc = col('Service_Postcode');
const addrCols = ['Address_line_1', 'Address_line_2', 'Address_line_3', 'Address_line_4'].map(col);

const out = [];
for (const r of rows.slice(1)) {
  const name = (r[cName] || '').trim();
  if (!name.toLowerCase().includes('hospice')) continue;
  const address = addrCols.map((i) => (r[i] || '').trim()).filter(Boolean);
  out.push({
    id: `sc-${(r[cCS] || '').trim()}`,
    name,
    address,
    town: (r[cTown] || '').trim(),
    postcode: (r[cPc] || '').trim().replace(/\s+/g, ' ').toUpperCase(),
  });
}
fs.writeFileSync('data-raw/hospices-sc.json', JSON.stringify(out));
console.log(`SC hospices: ${out.length}` +
  (out.length ? ` | first: ${out[0].id} ${out[0].name} ${out[0].postcode}` : ''));
