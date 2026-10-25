// scripts/extract-gp-practices-sc.mjs
// Scotland GP practices (work list item 7).
//
// Source (per architecture): data.gov.uk CKAN "GP Practices – Scotland"
// (dataset id starts 16f795a0-; row count UNVERIFIED in research). Research
// recorded that data.gov.uk 404s from this machine, so the script resolves
// the source in this order and never loops:
//   1. local raw export data-raw/gp-practices-scotland-2026-10.geojson
//      (or .csv) — used if a human saved it;
//   2. one CKAN API probe (package_search + first GeoJSON resource), saved
//      to data-raw/gp-practices-scotland-2026-10.geojson for provenance;
//   3. else: log the exact human fetch procedure, write [] and exit 0
//      (execution rule 3 — the build stays valid until the fetch lands).
// GeoJSON shape (verified against the 2026-10-24 download of the Spatial Hub
// gp_practices-is layer): 911 features, properties
// prac_code/uprn/address/postcode/local_authority/la_s_code — no name column,
// so the practice name is derived from the first comma-delimited segment of
// `address` (e.g. "Garthdee Medical Group, Health Centre Garthdee Road, ...").
// Geometry is British National Grid E/N and is ignored: location comes from
// postcode geocoding (same pattern as England). Keys below are still tried
// case-insensitively in case the register format changes.
//
// Output: data-raw/gp-practices-sc.json — {id, name, address[], postcode},
// same shape as England.

import fs from 'node:fs';

const RAW_GEO = 'data-raw/gp-practices-scotland-2026-10.geojson';
const RAW_CSV = 'data-raw/gp-practices-scotland-2026-10.csv';
const OUT = 'data-raw/gp-practices-sc.json';

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

function fromGeoJSON(obj) {
  const feats = obj.features || [];
  const out = [];
  let skipped = 0, derived = 0;
  feats.forEach((f, i) => {
    const p = f.properties || {};
    let name = pick(p, ['name', 'practice name', 'gp name']);
    let address = pick(p, ['address', 'address line 1', 'street', 'street address']);
    if (p.address_array && Array.isArray(p.address_array)) address = p.address_array.join(', ');
    if (!name) {
      // This layer's register has no name column (see header note).
      name = address ? address.split(',')[0].trim() : '';
      if (name) derived++;
    }
    if (!name) { skipped++; return; }
    const postcode = pick(p, ['postcode', 'postal code']);
    out.push({ id: `sc-${i + 1}`, name, address: address ? address.split(',').map((s) => s.trim()).filter(Boolean) : [], postcode: postcode.toUpperCase() });
  });
  if (skipped) console.log(`sc geojson: ${skipped} features without a name skipped`);
  if (derived) console.log(`sc geojson: ${derived} names derived from first address segment (source has no name column)`);
  return out;
}

function fromCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => (h || '').trim());
  const idx = (keys) => header.findIndex((h) => keys.includes(h.toLowerCase()));
  const iName = idx(['name', 'practice name', 'gp name']);
  const iAddr = idx(['address', 'address line 1', 'street']);
  const iPc = idx(['postcode', 'postal code']);
  if (iName < 0) {
    console.error(`SC practices CSV: no name column — header: ${header.join(', ')}`);
    process.exit(1);
  }
  console.log(`SC practices CSV header: ${header.join(', ')}`);
  return rows.slice(1).filter((r) => (r[iName] || '').trim()).map((r, i) => ({
    id: `sc-${i + 1}`,
    name: (r[iName] || '').trim(),
    address: iAddr >= 0 ? (r[iAddr] || '').split(',').map((s) => s.trim()).filter(Boolean) : [],
    postcode: iPc >= 0 ? (r[iPc] || '').trim().replace(/\s+/g, ' ').toUpperCase() : '',
  }));
}

async function fetchFromCkan() {
  const body = await fetch('https://data.gov.uk/api/3/action/package_search?q=%22GP%20Practices%20-%20Scotland%22', {
    headers: { 'User-Agent': 'HospiceInfoproto/0.1 (geocoding research; contact: james)' },
    signal: AbortSignal.timeout(20_000),
  }).then((r) => {
    if (!r.ok) throw new Error(`CKAN package_search HTTP ${r.status}`);
    return r.json();
  });
  const results = (body && body.result && body.result.results) || [];
  const ds = results.find((d) => /gp practices/i.test(d.name || '') && /scotland/i.test(d.name || '')) || results[0];
  if (!ds) throw new Error('CKAN returned no dataset for "GP Practices - Scotland"');
  console.log(`CKAN dataset: ${ds.name} (${ds.id})`);
  for (const x of ds.resources || []) console.log(`  resource: ${x.name} [${x.format || '?'}] ${x.url}`);
  const res = (ds.resources || [])
    .find((x) => /\.geojson/i.test(x.url || '') || (x.format || '').toUpperCase().includes('GEOJSON'))
    || (ds.resources || []).find((x) => /\.csv/i.test(x.url || ''))
    || ds.resources[0];
  if (!res) throw new Error('CKAN dataset has no resources');
  console.log(`CKAN resource: ${res.name} [${res.format}] ${res.url}`);
  const geo = await fetch(res.url, {
    headers: { 'User-Agent': 'HospiceInfoproto/0.1 (geocoding research; contact: james)' },
    signal: AbortSignal.timeout(60_000),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`resource fetch HTTP ${r.status}`);
    return r.json();
  });
  fs.writeFileSync(RAW_GEO, JSON.stringify(geo));
  return geo;
}

let out = [];
if (fs.existsSync(RAW_GEO)) {
  out = fromGeoJSON(JSON.parse(fs.readFileSync(RAW_GEO, 'utf8')));
  console.log(`SC practices source: local ${RAW_GEO}`);
} else if (fs.existsSync(RAW_CSV)) {
  out = fromCSV(fs.readFileSync(RAW_CSV, 'utf8'));
  console.log(`SC practices source: local ${RAW_CSV}`);
} else {
  try {
    const geo = await fetchFromCkan();
    out = fromGeoJSON(geo);
  } catch (e) {
    console.log(`SC practices source unavailable (${e.message}).`);
    console.log('Human fetch procedure (full-DNS machine, browser):');
    console.log('  1. open https://data.gov.uk/dataset/gp-practices-scotland — its download links point to');
    console.log('     the ISD Spatial Hub layer https://data.spatialhub.scot/dataset/gp_practices-is');
    console.log('     (CKAN verified 2026-10-16: only the two portal links are registered, no direct file);');
    console.log('  2. on that Spatial Hub page download the GP practices layer (GeoJSON);');
    console.log('  3. save it as data-raw/gp-practices-scotland-2026-10.geojson (CSV accepted);');
    console.log('  4. re-run: node scripts/extract-gp-practices-sc.mjs');
    out = [];
  }
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`SC practices: ${out.length}`);
