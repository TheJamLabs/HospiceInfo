// Geocodes data-raw/shops-website.json via Nominatim (1 req/s, resumable).
// Postcode is preferred; falls back to "street, town" when no postcode.
// Writes data-raw/shops-geo.json: { "<idx:postcode-or-address>": {lat, lon, source} }
import fs from 'node:fs';

const UA = 'HospiceInfoproto/0.1 (geocoding research; contact: james)';
const shops = JSON.parse(fs.readFileSync('data-raw/shops-website.json', 'utf8'));
const geoFile = 'data-raw/shops-geo.json';
let store = {};
if (fs.existsSync(geoFile)) {
  store = JSON.parse(fs.readFileSync(geoFile, 'utf8'));
}

const key = (s) => s.postcode ?? `${s.address.join(', ').toUpperCase()}`;

async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) return { status: r.status };
  const j = await r.json();
  if (!j.length) return { status: 200, empty: true };
  return { status: 200, lat: Number(j[0].lat), lon: Number(j[0].lon) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, empty = 0, failed = 0;
for (let i = 0; i < shops.length; i++) {
  const s = shops[i];
  const k = key(s);
  const q = s.postcode ? s.postcode : `${s.address.join(', ')}, United Kingdom`;
  if (store[k]?.lat != null) { ok++; continue; }
  const res = await nominatim(q);
  if (res.lat != null) {
    store[k] = { lat: res.lat, lon: res.lon, source: s.postcode ? 'postcode' : 'address' };
    ok++;
  } else if (res.empty) {
    empty++;
    console.log(`  no match [${i}] ${s.name} (${q})`);
  } else {
    failed++;
    console.log(`  HTTP ${res.status} [${i}] ${s.name} (${q}) — will retry next run`);
  }
  if ((i + 1) % 10 === 0) console.log(`progress ${i + 1}/${shops.length} (ok ${ok}, no-match ${empty}, failed ${failed})`);
  await sleep(1100);
}
fs.writeFileSync(geoFile, JSON.stringify(store, null, 2));
console.log(`done: ok ${ok}, no-match ${empty}, failed ${failed} — wrote ${geoFile}`);
