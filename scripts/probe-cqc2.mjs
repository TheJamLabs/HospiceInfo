// Probes CQC bare API and NHS "Find a GP" search page.
(async () => {
  try {
    const r1 = await fetch('https://www.cqc.org.uk/api/provider?per_page=2', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    const t1 = await r1.text();
    console.log(`CQC bare: ${r1.status} ct=${r1.headers.get('content-type')}`);
    console.log(t1.slice(0, 400));
  } catch (e) {
    console.log('CQC bare: ERROR ' + e.message);
  }

  try {
    const r2 = await fetch(
      'https://www.nhs.uk/service-search/gp/specialist/find-practices?search_term=PR1&search_description=primary+care&distance=5&loc=53.7599%2C-2.6847',
      { headers: { accept: 'text/html' }, signal: AbortSignal.timeout(20000) }
    );
    const t2 = await r2.text();
    console.log(`\nNHS find-a-GP: ${r2.status} len=${t2.length}`);
    // Look for evidence of embedded JSON data (practice names/postcodes)
    const m = t2.match(/Preston[^<]{0,120}/gi);
    console.log('Preston hits:', (m || []).length, (m || []).slice(0, 3));
    const hasJson = /window__|data-props|application\/json/.test(t2);
    console.log('has embedded data markers:', hasJson);
  } catch (e) {
    console.log('NHS find-a-GP: ERROR ' + e.message);
  }
})();
