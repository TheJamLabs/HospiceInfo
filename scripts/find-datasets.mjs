// Shows full resource lists for CKAN datasets matching a query.
// Usage: node scripts/find-datasets.mjs "organisation data service" [maxRows]
const query = process.argv[2] || 'organisation data service';
const rows = process.argv[3] || 8;
const url = `https://ckan.publishing.service.gov.uk/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=${rows}`;
const j = await (await fetch(url)).json();
for (const r of j.result.results || []) {
  console.log(`## ${r.title}  (id: ${r.id})  note: ${String(r.notes || '').slice(0, 160).replace(/\n/g, ' ')}`);
  for (const x of r.resources || []) {
    console.log(`   [${x.format}] ${x.url}`);
  }
}
