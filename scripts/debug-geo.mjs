// Prints first 10 geocoding attempts: raw postcode, normalized, URL, status, body snippet.
import fs from 'node:fs';

const practices = JSON.parse(fs.readFileSync('data-raw/gp-practices-target.json', 'utf8'));
const pcs = [...new Set(practices.map((p) => p.postcode))].sort();
for (const pc of pcs.slice(0, 10)) {
  const norm = pc.toUpperCase().replace(/\s+/g, '').slice(0, 8);
  const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(norm)}`, {
    signal: AbortSignal.timeout(15000),
  });
  const body = (await r.text()).slice(0, 80);
  console.log(`pc=${JSON.stringify(pc)} norm=${JSON.stringify(norm)} status=${r.status} body=${body}`);
  await new Promise((res) => setTimeout(res, 200));
}
