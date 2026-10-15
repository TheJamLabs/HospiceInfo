// Finds which P31 class UK items labelled *hospice* use.
const query = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?cls ?label (COUNT(*) AS ?n) WHERE {
  ?h wdt:P17 wd:Q184534 .
  ?h rdfs:label ?hLabel .
  FILTER (lang(?hLabel) = "en" && CONTAINS(lcase(?hLabel), "hospice"))
  ?h wdt:P31 ?cls .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en"; ?label rdfs:label }
}
GROUP BY ?cls ?label
ORDER BY DESC(?n)
LIMIT 15`;
const params = new URLSearchParams({ format: 'json', query });
const r = await fetch(`https://query.wikidata.org/sparql?${params}`, {
  headers: { accept: 'application/sparql-results+json', 'user-agent': 'HospiceInfoproto/0.1 (research; contact: james)' },
  signal: AbortSignal.timeout(90000),
});
const t = await r.text();
console.log('status', r.status);
if (!r.ok) { console.log(t.slice(0, 300)); process.exit(1); }
const j = JSON.parse(t);
for (const b of j.results?.bindings || []) {
  console.log(`${b.cls.value} | ${b.label?.value ?? '?'} | ${b.n?.value}`);
}
