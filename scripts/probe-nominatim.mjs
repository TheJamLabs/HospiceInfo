// Probes OSM Nominatim for a postcode unit.
const q = process.argv[2] || 'PR1 2UH';
const r = await fetch(
  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=gb&format=jsonv2&limit=1`,
  { headers: { 'User-Agent': 'HospiceInfoproto/0.1 (geocoding research; contact: james)' }, signal: AbortSignal.timeout(20000) }
);
console.log('status', r.status);
console.log((await r.text()).slice(0, 600));
