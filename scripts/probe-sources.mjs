// Probes alternative sources for a UK GP practices list.
(async () => {
  // 1) Does data.nhs.uk resolve?
  for (const host of ['data.nhs.uk', 'www.data.nhs.uk']) {
    try {
      const r = await fetch(`https://${host}/`, { signal: AbortSignal.timeout(10000) });
      console.log(`FETCH ${host} -> ${r.status} ${r.headers.get('content-type')}`);
    } catch (e) {
      console.log(`FETCH ${host} -> ERROR ${e.message}`);
    }
  }
  // 2) GitHub repo search
  for (const q of ['ods+practices', 'gp+practices+ods+csv']) {
    try {
      const r = await fetch(`https://api.github.com/search/repositories?q=${q}&per_page=8`, {
        headers: { 'user-agent': 'hospice-info-data-probe' },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        console.log(`GITHUB ${q} -> HTTP ${r.status}`);
        continue;
      }
      const j = await r.json();
      console.log(`GITHUB ${q} (${j.total_count} repos):`);
      for (const it of j.items || []) {
        console.log(`  - ${it.full_name}  | stars ${it.stargazers_count} | ${String(it.description || '').slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`GITHUB ${q} -> ERROR ${e.message}`);
    }
  }
})();
