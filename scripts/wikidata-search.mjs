// Lists Wikidata entities whose EN label matches a term, via the REST API.
// Usage: node scripts/wikidata-search.mjs "hospice" [limit]
const term = process.argv[2] || 'hospice';
const limit = Number(process.argv[3] || 500);
const r = await fetch(
  `https://api.wikidata.org/w/v1/entities/search?q=${encodeURIComponent(term)}&language=en&limit=${limit}`,
  { headers: { accept: 'application/json', 'user-agent': 'HospiceInfoproto/0.1 (research; contact: james)' }, signal: AbortSignal.timeout(30000) }
);
const j = await r.json();
console.log('status', r.status, 'count', (j.entities || []).length);
for (const e of j.entities || []) console.log(`${e.id} | ${e.label}`);
