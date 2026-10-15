// Groups GP practices by postcode outcode and lists the towns seen in their addresses.
import fs from 'node:fs';

const practices = JSON.parse(fs.readFileSync('data-raw/gp-practices-target.json', 'utf8'));
const groups = new Map();
for (const p of practices) {
  const out = p.postcode.split(' ')[0].toUpperCase();
  if (!groups.has(out)) groups.set(out, new Set());
  const line = p.address[p.address.length - 1].trim().toLowerCase();
  for (const t of line.split(/[,\s]+/)) {
    if (t.length > 3) groups.get(out).add(t);
  }
}
for (const [out, towns] of [...groups.entries()].sort()) {
  console.log(`${out}: ${[...towns].join(', ')}`);
}
