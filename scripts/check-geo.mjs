// Checks postcode-geo.csv coverage against gp-practices-target.json.
import fs from 'node:fs';

const practices = JSON.parse(fs.readFileSync('data-raw/gp-practices-target.json', 'utf8'));
const needed = new Set(practices.map((p) => p.postcode));
const lines = fs.readFileSync('data-raw/postcode-geo.csv', 'utf8').split(/\r?\n/).filter(Boolean).slice(1);
const have = new Map();
for (const l of lines) {
  const [pc, lat, lon] = l.split(',');
  if (lat && lon && Number(lat)) have.set(pc, { lat: Number(lat), lon: Number(lon) });
}
const missing = [...needed].filter((p) => !have.has(p));
console.log(`practices: ${practices.length}, distinct needed postcodes: ${needed.size}, geocoded: ${have.size}, missing: ${missing.length}`);
if (missing.length) console.log('missing:', missing.slice(0, 40).join(' '));
