// scripts/extract-gp-practices-wales.mjs
// Wales GP practices (work list item 9): merge the two DataMap.wales OGL
// layers (main sites + branch sites) into the common practice shape.
//
// Inputs (human-fetched; A4 ledger section holds the exact procedure).
// For each layer the script accepts GeoJSON (.geojson or a plain .json
// FeatureCollection) or CSV:
//   data-raw/gp-practices-wales-main-2026-10.geojson  (or .json / .csv)
//   data-raw/gp-practices-wales-branch-2026-10.geojson (or .json / .csv)
// The DataMap.wales layers (geonode:gpmainsites_ogl / geonode:gpbranchsites_ogl)
// carry practicename + latitude/longitude and NO postcode column, so
// coordinates pass through this script as lat/lon; build-data.mjs uses
// source-provided coordinates when present (see data/README.md provenance).
//
// First-run discovery (ADR-0003): whichever file is parsed first gets its
// header (CSV) or first feature (GeoJSON) logged before it is trusted.
// GeoJSON property keys are tried case-insensitively (name / practice name);
// CSV columns resolved BY NAME (name-like, address-like, postcode-like) and
// the header is logged.
//
// When a layer file is absent it is skipped with a log line; when BOTH are
// absent the output is [] and the human fetch procedure is logged (execution
// rule 3 — the build stays valid, Wales practices = 0 until the fetch lands).
//
// Output: data-raw/gp-practices-wales.json —
// {id: 'wales-<n>', name, address[], postcode}, main then branch.

import fs from 'node:fs';

const LAYERS = [
  { tag: 'main', base: 'data-raw/gp-practices-wales-main-2026-10' },
  { tag: 'branch', base: 'data-raw/gp-practices-wales-branch-2026-10' },
];

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const pick = (obj, keys) => {
  if (!obj) return '';
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) if (lower[k]) return String(lower[k]).trim();
  return '';
};

const NAME_KEYS = ['name', 'practice name', 'practicename', 'practice_name'];

function fromGeoJSON(obj, tag) {
  const feats = obj.features || [];
  if (feats.length) {
    const p = feats[0].properties || {};
    console.log(`wales ${tag} geojson sample feature properties: ${Object.keys(p).join(', ')} | name=${pick(p, NAME_KEYS)}`);
  }
  return feats.map((f) => {
    const p = f.properties || {};
    const lat = Number(p.latitude), lon = Number(p.longitude);
    return {
      name: pick(p, NAME_KEYS),
      address: pick(p, ['address', 'street']) ? pick(p, ['address', 'street']).split(',').map((s) => s.trim()).filter(Boolean) : [],
      postcode: pick(p, ['postcode', 'postal code']).toUpperCase(),
      ...(Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : {}),
    };
  }).filter((e) => e.name);
}

function fromCSV(text, tag) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => (h || '').trim());
  console.log(`wales ${tag} csv header: ${header.join(', ')}`);
  const idx = (keys) => header.findIndex((h) => keys.includes(h.toLowerCase()));
  const iName = idx(['name', 'practice name', 'gp name', 'property name']);
  if (iName < 0) {
    console.error(`wales ${tag} CSV: no name column — header: ${header.join(', ')}`);
    process.exit(1);
  }
  const iAddr = idx(['address', 'address line 1', 'street']);
  const iPc = idx(['postcode', 'postal code']);
  return rows.slice(1).map((r) => ({
    name: (r[iName] || '').trim(),
    address: iAddr >= 0 ? (r[iAddr] || '').split(',').map((s) => s.trim()).filter(Boolean) : [],
    postcode: iPc >= 0 ? (r[iPc] || '').trim().replace(/\s+/g, ' ').toUpperCase() : '',
  })).filter((e) => e.name);
}

const out = [];
let anyFile = false;
for (const layer of LAYERS) {
  let entries = null;
  const geoPath = `${layer.base}.geojson`;
  const jsonPath = `${layer.base}.json`;
  const csvPath = `${layer.base}.csv`;
  const geoFile = fs.existsSync(geoPath) ? geoPath : fs.existsSync(jsonPath) ? jsonPath : null;
  if (geoFile) {
    entries = fromGeoJSON(JSON.parse(fs.readFileSync(geoFile, 'utf8')), layer.tag);
    console.log(`wales ${layer.tag} (geojson ${geoFile}): ${entries.length}`);
  } else if (fs.existsSync(csvPath)) {
    entries = fromCSV(fs.readFileSync(csvPath, 'utf8'), layer.tag);
    console.log(`wales ${layer.tag} (csv): ${entries.length}`);
  } else {
    console.log(`wales ${layer.tag}: file absent (${geoPath} / ${jsonPath} / ${csvPath}) — skipped`);
    continue;
  }
  anyFile = true;
  for (const e of entries) out.push({ id: `wales-${out.length + 1}`, name: e.name, address: e.address, postcode: e.postcode, ...(e.lat != null ? { lat: e.lat, lon: e.lon } : {}) });
}
if (!anyFile) {
  console.log('No Wales GP layer files present.');
  console.log('Human fetch procedure (full-DNS machine, browser) — see .agents/implementation.md A4:');
  console.log('  1. open https://data.wales, find the GP practice layers geonode:gpmainsites_ogl and geonode:gpbranchsites_ogl (OGL v3.0);');
  console.log('  2. export each (CSV preferred, GeoJSON accepted);');
  console.log('  3. save as data-raw/gp-practices-wales-main-2026-10.csv and data-raw/gp-practices-wales-branch-2026-10.csv;');
  console.log('  4. re-run: node scripts/extract-gp-practices-wales.mjs (then geocoder + build).');
}
fs.writeFileSync('data-raw/gp-practices-wales.json', JSON.stringify(out));
console.log(`Wales practices: ${out.length}`);
