// GP filter check: first service-type token is "Doctors/GPs".
import fs from 'node:fs';
const s = fs.readFileSync(process.argv[2] || 'data-raw/cqc-directory-2026-10.csv', 'utf8');
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
const rows = parseCSV(s);
const data = rows.slice(5);
const first = (r) => (r[6] || '').trim().split('|')[0];
const gpish = data.filter((r) => first(r) === 'Doctors/GPs');
console.log('rows with first type Doctors/GPs:', gpish.length);
const nw = gpish.filter((r) => (r[11] || '').trim() === 'North West');
console.log('NW rows:', nw.length);
const areas = new Map();
for (const r of nw) {
  const a = (r[3] || '').trim().split(' ')[0].slice(0, 2);
  areas.set(a, (areas.get(a) || 0) + 1);
}
console.log('NW area counts:', [...areas.entries()].sort().map(([a, n]) => `${a}=${n}`).join(' '));
for (const r of nw.slice(0, 5)) console.log('  sample:', r[0], '|', r[3], '|', (r[2] || '').split(',').join(' / '));
