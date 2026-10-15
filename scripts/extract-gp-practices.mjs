// Extracts Patients/GP practice locations for the target Lancashire + Cumbria area.
import fs from 'node:fs';

const TARGET_AREAS = new Set(['PR', 'BB', 'FY', 'WN', 'BL', 'LA', 'CA', 'WA', 'OL']);

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
const data = rows.slice(5);
const first = (r) => (r[6] || '').trim().split('|')[0];

const out = [];
for (const r of data) {
  if (first(r) !== 'Doctors/GPs') continue;
  const pc = (r[3] || '').trim().replace(/\s+/g, ' ');
  const area = pc.split(' ')[0].slice(0, 2);
  if (!TARGET_AREAS.has(area)) continue;
  // Address field uses commas as line separators.
  const addr = (r[2] || '').split(',').map((s) => s.trim()).filter(Boolean);
  out.push({
    name: r[0].trim(),
    address: addr,
    postcode: pc,
    area,
    phone: r[4] ? r[4].trim() : '',
    website: r[5] ? r[5].trim() : '',
    region: r[11] ? r[11].trim() : '',
    cqcUrl: r[12] ? r[12].trim() : '',
  });
}
fs.writeFileSync('data-raw/gp-practices-target.json', JSON.stringify(out, null, 2));
const areas = new Map();
for (const p of out) areas.set(p.area, (areas.get(p.area) || 0) + 1);
console.log('extracted practices:', out.length);
console.log('by area:', [...areas.entries()].sort().map(([a, n]) => `${a}=${n}`).join(' '));
const pcs = new Set(out.map((p) => p.postcode));
console.log('distinct postcodes:', pcs.size);
