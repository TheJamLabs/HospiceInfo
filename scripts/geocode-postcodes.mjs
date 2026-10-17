// Geocodes distinct GP practice + hospice postcodes via OSM Nominatim (no key, 1 req/s).
//
// Work list item 12: input = the UNION of the four nation practice files and
// the four nation hospice files. The retired `gp-practices-target.json` and
// CATCHMENTS are no longer an input — their postcodes are a subset of the
// EN extracts.
//
// Resumable: skips postcodes already present in data-raw/postcode-geo.csv, so
// a re-run is idempotent (no duplicate rows). On a unit miss, falls back to
// the outcode (postcode district) point. After the loop, exits non-zero if
// any in-scope postcode is still missing from the CSV.
import fs from 'node:fs';

const UA = 'HospiceInfoproto/0.1 (geocoding research; contact: james)';

async function search(q) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=gb&format=jsonv2&limit=1`,
    { headers: { 'User-Agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(20000) }
  );
  if (!r.ok) return { status: r.status, row: null };
  const j = await r.json();
  return { status: r.status, row: j[0] || null };
}

const FILES = [
  'data-raw/gp-practices-en.json',
  'data-raw/gp-practices-sc.json',
  'data-raw/gp-practices-ni.json',
  'data-raw/gp-practices-wales.json',
  'data-raw/hospices-en.json',
  'data-raw/hospices-sc.json',
  'data-raw/hospices-ni.json',
  'data-raw/hospices-wales.json',
];

const pcs = new Set();
for (const f of FILES) {
  for (const row of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const pc = (row.postcode || '').trim().toUpperCase();
    if (pc) pcs.add(pc);
  }
}
const list = [...pcs].sort();
const outPath = 'data-raw/postcode-geo.csv';
const existing = new Set();
if (fs.existsSync(outPath)) {
  for (const line of fs.readFileSync(outPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(1)) {
    existing.add(line.split(',')[0]);
  }
}
console.log(`in-scope postcodes: ${list.length} (4 practice + 4 hospice files); already in ${outPath}: ${list.filter((p) => existing.has(p)).length}`);
let done = 0, fallback = 0, missed = 0, throttled = 0;
fs.appendFileSync(outPath, fs.existsSync(outPath) ? '' : 'postcode,lat,lon\n');
for (const pc of list) {
  if (existing.has(pc)) continue;
  let attempt = 0, row = null, q = pc;
  while (attempt < 8) {
    attempt++;
    try {
      const res = await search(q);
      if (res.status === 429 || res.status === 503) {
        throttled++;
        await new Promise((res2) => setTimeout(res2, 30000));
        continue;
      }
      row = res.row;
      break;
    } catch (e) {
      await new Promise((res2) => setTimeout(res2, 5000));
    }
  }
  if (!row && pc.split(' ')[0] !== pc) q = pc.split(' ')[0]; // outcode fallback
  if (!row && q !== pc) {
    try { row = (await search(q)).row ?? null; } catch { row = null; }
  }
  if (row && row.lat && row.lon) {
    fs.appendFileSync(outPath, `${pc},${row.lat},${row.lon}\n`);
    done++;
    if (q !== pc) fallback++;
    if (done % 25 === 0) console.log(`geocoded ${done} new (${fallback} district-fallback, ${missed} missed, ${throttled} throttled)`);
  } else {
    missed++;
    console.log(`miss: ${pc}`);
  }
  await new Promise((res2) => setTimeout(res2, 1000));
}
console.log(`done: ${done} new, ${missed} missed, ${fallback} district-fallback, ${throttled} throttled`);

// Item 12 guard: fail the run if any in-scope postcode is still missing.
const final = new Set();
for (const line of fs.readFileSync(outPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(1)) {
  final.add(line.split(',')[0]);
}
const missing = list.filter((pc) => !final.has(pc));
if (missing.length) {
  console.log(`incomplete: ${missing.length} in-scope postcodes still missing — ${missing.slice(0, 30).join(' ')}${missing.length > 30 ? ' …' : ''}`);
  process.exit(1);
}
console.log(`complete: all ${list.length} in-scope postcodes present in ${outPath}`);
