// Probes the CQC provider API for GP practices with locations.
(async () => {
  const base = 'https://www.cqc.org.uk/api/provider';
  const r = await fetch(`${base}?search=practice&type=doctor%20and%20general%20practice&n=3&per_page=3`, {
    signal: AbortSignal.timeout(20000),
    headers: { 'accept': 'application/json' },
  });
  console.log(`status ${r.status}`);
  const j = await r.json();
  console.log('meta keys:', Object.keys(j));
  const items = j.results || j.results || [];
  console.log('count in page:', items.length);
  if (items.length) {
    console.log(JSON.stringify(items[0], null, 2).slice(0, 2500));
  }
  // Also test a type-only filter for the Northwest region
  const r2 = await fetch(`${base}?region=North%20West&type=doctor%20and%20general%20practice&n=2&per_page=2`, {
    signal: AbortSignal.timeout(20000),
  });
  console.log(`region test status ${r2.status}`);
  const j2 = await r2.json();
  console.log('region results:', (j2.results || []).length, 'meta.count:', j2.meta && j2.meta.count);
})();
