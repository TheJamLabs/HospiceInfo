// Fetches charity shops in OSM within the target bounds and keeps only those
// whose name plausibly belongs to one of our 20 hospices.
// Writes data-raw/shops-osm.json: [{name, addr, postcode, source, osmId, ...}]
import fs from 'node:fs';

const UA = 'HospiceInfoproto/0.1 (geocoding research; contact: james)';

const CATCHMENTS = (await import('./catchment-match.mjs')).matchers;

const query = `
[out:json][timeout:300];
(
  nwr["shop"="charity"](52.9,-3.8,55.05,-1.9);
  nwr["amenity"="charity"](52.9,-3.8,55.05,-1.9);
  nwr["office"="charity"](52.9,-3.8,55.05,-1.9);
);
out tags;
`;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
async function fetchOverpass() {
  for (const ep of ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`try ${ep} (attempt ${attempt + 1})`);
        const r = await fetch(ep, {
          method: 'POST',
          headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(120000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const res = await r.json();
        const n = (res.elements || []).length;
        if (n === 0) throw new Error('empty result (likely degraded endpoint)');
        return res;
      } catch (e) {
        console.log(`  failed: ${e.message}`);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 15000));
      }
    }
  }
  return null;
}
const j = await fetchOverpass();
if (!j) throw new Error('all overpass endpoints failed');
const elems = (j.elements || []).filter((e) => typeof e.tags?.name === 'string' && e.lat != null);
console.log(`overpass: ${elems.length} named charity/shop/office elements in bounds`);

const matches = [];
for (const e of elems) {
  const name = e.tags.name.toLowerCase();
  const m = CATCHMENTS.find((c) => new RegExp(c.regex).test(name));
  if (m) {
    matches.push({
      hospiceId: m.id,
      name: e.tags.name,
      lat: e.lat,
      lon: e.lon,
      postcode: e.tags["addr:postcode"] ?? null,
      address: [
        e.tags["addr:street"] ? `${e.tags["addr:housenumber"] ? e.tags["addr:housenumber"] + ' ' : ''}${e.tags["addr:street"]}` : null,
        e.tags["addr:town"],
      ].filter(Boolean),
      source: `OpenStreetMap (${e.type}/${e.id})`,
    });
  }
}
console.log(`matched to our hospices: ${matches.length}`);
const byHospice = new Map();
for (const m of matches) byHospice.set(m.hospiceId, (byHospice.get(m.hospiceId) ?? 0) + 1);
for (const [id, n] of [...byHospice.entries()].sort()) console.log(`  ${id}: ${n}`);
fs.mkdirSync('data-raw', { recursive: true });
fs.writeFileSync('data-raw/shops-osm.json', JSON.stringify(matches, null, 2));
console.log('wrote data-raw/shops-osm.json');
