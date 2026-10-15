// Runs the actual geocoder loop over the first 8 postcodes, logging raw statuses/bodies.
import fs from 'node:fs';

const practices = JSON.parse(fs.readFileSync('data-raw/gp-practices-target.json', 'utf8'));
const pcs = [...new Set(practices.map((p) => p.postcode))].sort();
for (const pc of pcs.slice(0, 8)) {
  const norm = pc.toUpperCase().replace(/\s+/g, '').slice(0, 8);
  let r;
  try {
    r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(norm)}`, {
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.log(pc, 'TRANSPORT:', e.cause?.code || e.message);
    continue;
  }
  const body = (await r.text()).slice(0, 160);
  console.log(pc, `status=${r.status}`, body);
  await new Promise((res) => setTimeout(res, 800));
}
