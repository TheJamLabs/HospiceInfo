// package_show for a specific CKAN dataset id -> prints resources + notes.
// Usage: node scripts/show-dataset.mjs <id>
import fs from 'node:fs';
const id = process.argv[2];
if (!id) { console.error('usage: node scripts/show-dataset.mjs <id>'); process.exit(1); }
const r = await fetch(`https://ckan.publishing.service.gov.uk/api/3/action/package_show?id=${id}`);
const j = await r.json();
const p = j.result;
if (!p) { console.log('not found'); process.exit(0); }
console.log(`## ${p.title}`);
console.log('notes:\n' + (p.notes || '').split('\n').map((s) => '   ' + s).join('\n'));
console.log('--- resources ---');
for (const x of p.resources || []) console.log(`   [${x.format}] ${x.url}`);
