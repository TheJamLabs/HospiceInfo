// Quote-aware CSV inspection of the CQC directory.
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

const raw = fs.readFileSync(process.argv[2] || 'data-raw/cqc-directory-2026-10.csv', 'utf8');
const rows = parseCSV(raw);
console.log('rows:', rows.length);
const header = rows[0].map((h) => h.trim());
console.log('cols:', header.length);
console.log('HEADER:', JSON.stringify(header));
console.log('SAMPLE:', JSON.stringify(rows[1]));

// Find column matching service type / name
const nameI = header.findIndex((h) => /service name/i.test(h));
// distinct "type" values - guess column name
const typeI = header.findIndex((h) => /type/i.test(h));
console.log('nameI', nameI, 'typeI', typeI);
