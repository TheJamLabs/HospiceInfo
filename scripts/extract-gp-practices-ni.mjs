// scripts/extract-gp-practices-ni.mjs
// Northern Ireland GP practices (work list item 8): normalise the committed
// NHSNI "GP Practice Reference File" to the common practice shape.
//
// Input: data-raw/gp-practice-reference-file-july-26.csv (OGL; 305 data
// rows, retrieved July 2026 — see data/README.md for exact provenance).
//
// First-run discovery (ADR-0003, 2026-10-16): header logged —
// `PracNo,PracticeName,Address1,Address2,Address3,Postcode,LCG,Used_Patients,,,,`
// (trailing empty columns). Fields resolved BY NAME. Names carry trailing
// spaces — trimmed. LCG (Local Commissioning Groups) distinct values are
// logged (review risk 3: the LCG list must be documented).
//
// Output: data-raw/gp-practices-ni.json —
//   {id: 'ni-<PracNo>', name, address[], postcode, area: <outcode>, lcg}.
// Rows without a postcode are kept (logged) — the geocoder skips them.

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

const RAW = 'data-raw/gp-practice-reference-file-july-26.csv';
const rows = parseCSV(fs.readFileSync(RAW, 'utf8'));
if (rows.length < 2 || (rows[0][0] || '').trim() !== 'PracNo') {
  console.error(`NI reference file layout unexpected (first cell: ${JSON.stringify(rows[0][0])})`);
  process.exit(1);
}
console.log(`NI reference header: ${rows[0].join(',')}`);
const header = rows[0].map((h) => (h || '').trim());
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) {
    console.error(`required NI field missing: "${name}"`);
    process.exit(1);
  }
  return i;
};
const cNo = col('PracNo');
const cName = col('PracticeName');
const cA1 = col('Address1');
const cA2 = col('Address2');
const cA3 = col('Address3');
const cPc = col('Postcode');
const cLcg = col('LCG');

const out = [];
let noPc = 0;
const lcgCounts = new Map();
for (const r of rows.slice(1)) {
  const name = (r[cName] || '').trim();
  if (!name) continue;
  const pc = (r[cPc] || '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!pc) noPc++;
  const lcg = (r[cLcg] || '').trim();
  lcgCounts.set(lcg || '(blank)', (lcgCounts.get(lcg || '(blank)') || 0) + 1);
  out.push({
    id: `ni-${(r[cNo] || '').trim()}`,
    name,
    address: [cA1, cA2, cA3].map((i) => (r[i] || '').trim()).filter(Boolean),
    postcode: pc,
    area: pc.slice(0, 2),
    lcg,
  });
}
fs.writeFileSync('data-raw/gp-practices-ni.json', JSON.stringify(out));
console.log(`NI practices: ${out.length}` + (noPc ? ` | without postcode: ${noPc}` : ''));
console.log('NI LCG values: ' + [...lcgCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(' '));
