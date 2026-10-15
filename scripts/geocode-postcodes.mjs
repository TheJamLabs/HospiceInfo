// Geocodes distinct GP practice postcodes via OSM Nominatim (no key, 1 req/s).
// Resumable: skips postcodes already present in data-raw/postcode-geo.csv.
// On a unit miss, falls back to the outcode (postcode district) point, tagged "d".
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

const practices = JSON.parse(fs.readFileSync('data-raw/gp-practices-target.json', 'utf8'));
const { CATCHMENTS } = await import('./catchment-map.mjs');
const pcs = [...new Set([...practices.map((p) => p.postcode), ...CATCHMENTS.map((h) => h.postcode)])].sort();
const outPath = 'data-raw/postcode-geo.csv';
const existing = new Set();
if (fs.existsSync(outPath)) {
  for (const line of fs.readFileSync(outPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(1)) {
    existing.add(line.split(',')[0]);
  }
}
console.log(`total ${pcs.length}, already done ${existing.size}`);
let done = 0, fallback = 0, missed = 0, throttled = 0;
fs.appendFileSync(outPath, fs.existsSync(outPath) ? '' : 'postcode,lat,lon\n');
for (const pc of pcs) {
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
  if (!row) q = pc.split(' ')[0]; // outcode fallback
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
