// Probes a real Lancashire postcode the same way the geocoder does.
const pc = 'PR1 2UH';
const norm = pc.toUpperCase().replace(/\s+/g, '').slice(0, 8);
console.log('norm:', JSON.stringify(norm));
const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(norm)}`, {
  signal: AbortSignal.timeout(15000),
});
console.log('status', r.status);
console.log((await r.text()).slice(0, 500));
