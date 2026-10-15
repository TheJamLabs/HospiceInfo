// Lists CQC-registered services whose name mentions "hospice" in the target areas.
// Usage: node scripts/hospice-candidates.mjs
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

const raw = fs.readFileSync('data-raw/cqc-directory-2026-10.csv', 'utf8');
const rows = parseCSV(raw).slice(5); // rows 0-4 are preamble/header

const out = [];
for (const r of rows) {
  const name = (r[0] || '').trim();
  if (!/hospice/i.test(name)) continue;
  const pc = (r[3] || '').trim();
  const area = pc.split(' ')[0]?.slice(0, 2) || '';
  out.push({
    name,
    provider: (r[9] || '').trim(),
    address: (r[2] || ''),
    postcode: pc,
    area,
    inTarget: TARGET_AREAS.has(area),
    region: (r[11] || '').trim(),
    website: (r[5] || '').trim(),
    cqcUrl: (r[12] || '').trim(),
    services: (r[8] || '').trim().replace(/\|/g, ', '),
  });
}
console.log(`total hospice-named: ${out.length}`);
for (const o of out) {
  const tag = o.inTarget ? 'IN-TARGET' : 'outside  ';
  console.log(`${tag} | ${o.name} | ${o.postcode} | ${o.region} | ${o.address.slice(0, 60)}`);
}
fs.writeFileSync('data-raw/hospice-candidates.json', JSON.stringify(out.filter((o) => o.inTarget), null, 2));
const near = out.filter((o) => !o.inTarget).slice(0, 30);
if (near.length) {
  console.log('\n--- nearest out-of-target (context) ---');
  for (const o of near) console.log(`${o.name} | ${o.postcode} | ${o.region}`);
}
