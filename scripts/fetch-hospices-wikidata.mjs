// Queries Wikidata for UK hospices (instance of "hospice", country UK) with location + county.
const query = `
SELECT ?hospice ?label ?lat ?lon ?county WHERE {
  ?hospice wdt:P31 ?cls .
  ?cls wdt:P279* wd:Q4802428 .
  ?hospice wdt:P17 wd:Q184534 .
  OPTIONAL { ?hospice wdt:P6198 ?lat . ?hospice wdt:P6200 ?lon }
  OPTIONAL { ?hospice wdt:P131 ?cty }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}`;
const params = new URLSearchParams({ format: 'json', query });
const r = await fetch(`https://query.wikidata.org/sparql?${params.toString()}`, {
  headers: { accept: 'application/sparql-results+json', 'user-agent': 'HospiceInfoproto/0.1 (research; contact: james)' },
  signal: AbortSignal.timeout(90000),
});
const t = await r.text();
if (!r.ok) {
  console.log('status', r.status);
  console.log(t.slice(0, 500));
  process.exit(1);
}
const j = JSON.parse(t);
const rows = (j.results?.bindings || []).map((b) => ({
  id: b.hospice.value,
  name: b.label ? b.label.value : '',
  lat: b.lat ? Number(b.lat.value) : null,
  lon: b.lon ? Number(b.lon.value) : null,
  county: b.county ? b.county.value : '',
}));
rows.sort((a, b) => a.name.localeCompare(b.name));
console.log('rows:', rows.length);
for (const x of rows) console.log(`${x.name} | ${x.lat ?? '-'} ${x.lon ?? '-'} | ${x.county}`);
const fs = await import('node:fs');
fs.writeFileSync('data-raw/hospices-wikidata.json', JSON.stringify(rows, null, 2));
