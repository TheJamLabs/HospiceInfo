// Prints rows 1-6 (parsed) of the CQC CSV to identify column layout.
import fs from 'node:fs';

const raw = fs.readFileSync('data-raw/cqc-directory-2026-10.csv', 'utf8');

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

const rows = parseCSV(raw);
console.log('total parsed rows:', rows.length);
for (const i of [0, 1, 2, 3, 4, 5, 6]) {
  const r = rows[i] || [];
  console.log(`--- row ${i} (${r.length} cols) ---`);
  r.forEach((c, j) => console.log(`  [${j}] ${c.slice(0, 120)}`));
}
