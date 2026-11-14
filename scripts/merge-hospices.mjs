// scripts/merge-hospices.mjs
// Work list item 10: merge the four nation registers into the single
// canonical hospice list used by the build.
//
// Inputs (all committed, produced by the item 6-9 extract scripts):
//   data-raw/hospices-en.json    {id:'en-<cqcId>', cqcId, name, address[], postcode}
//   data-raw/hospices-sc.json    {id:'sc-<CSNumber>' | 'sc-oscar-<SC>', name, address[], town, postcode}
//   data-raw/hospices-ni.json    {id:'ni-r<n>',    name, postcode}        ([] until RQIA fetch, A3)
//   data-raw/hospices-wales.json {id:'wales-r<n>', name, postcode}        (17 hospices, NHS Wales P&I regional pages, ADR-0033)
//
// Provenance stamp (ADR-0009, two-prefix lookup, ADR-0031 D6):
//   id starts 'sc-oscar-' -> SOURCES.scOscar (OSCAR register string)
//   other sc rows         -> SOURCES.sc    (GIS register string)
//   wales rows            -> SOURCES.wales (NHS Wales P&I regional pages string)
//
// Curated seeding: the 20 entries of scripts/catchment-map.mjs (read-only
// provenance, ADR-0005) are identified by the CQC Location id embedded in
// their cqcUrl (`location/1-<digits>`). For each, the register row with the
// same id — if any — is REPLACED by the curated record: that is the
// identity the map's 20 curated catchments carry (names/towns/postcodes
// hand-verified upstream).
//
// Output: data-raw/hospices-all.json — [{
//   id, name, town, postcode, nation: 'en'|'sc'|'wales'|'ni',
//   kind: 'published'|'approx', source, website, cqcUrl, curated: bool,
//   children: bool (Cycle 6 C6-4 children's-mode designation; the frontend
//   derives both mode views from it, ADR-0035)
// }]
//
// Assertions (exit 1 on failure): exactly 20 `curated: true`; ids globally
// unique; all 20 curated CQC ids present; exactly 20 `children: true` (C6-4);
// sc-oscar-019724 (CHAS umbrella) absent (C6-4, gate 4 resolved 2026-11-08).

import fs from 'node:fs';
import { CATCHMENTS } from './catchment-map.mjs';

const SOURCES = {
  en: 'CQC register (data-raw/cqc-directory-2026-10.csv, produced 14 Oct 2026)',
  sc: 'Care Inspectorate Scotland (data-raw/care-inspectorate-scotland-2026-08.csv, as at 31 Aug 2026)',
  scOscar: 'OSCAR — Scottish Charity Register (data-raw/oscar-scotland-hospices-2026-11.csv)',
  scPcs: 'PalliativeCare Scotland — Hospices and specialist units (data-raw/palliativecare-scotland-hospices-2026-11.html, Wayback pin 20260514160126)',
  ni: 'RQIA bulk export "All Registered Services" (data-raw/rqia-regulated-services-2026-06.xlsx, human-fetched 2026-10-27)',
  // Cycle 5: five NHS Wales P&I regional sub-pages, pinned 2026-11-08 (ADR-0033), hospices-only scope.
  wales: 'NHS Wales Performance and Improvement network — Hospices and palliative care services, five regional sub-pages (data-raw/nhs-wales-hospices-2026-11-{north-wales, mid-and-west-wales, south-wales-west, south-wales-central, south-wales-east}.html)',
};

// Cycle 6 (C6-4): the children's roster — 20 rows confirmed by James in
// .agents/feature.md (name match /children/i, verified against the merged
// list; St Andrew's en-1-119796870 is dual-listed in both modes).
const CHILDREN_IDS = new Set([
  'en-1-117648999', 'en-1-116772470', 'en-1-110304719', 'en-1-119796870',
  'en-1-120599968', 'en-1-122038149', 'en-1-129536667', 'en-1-442758792',
  'en-1-119107844', 'en-1-3969537495', 'en-1-111584886', 'en-1-112108967',
  'en-1-116804848', 'en-1-113884204', 'en-1-8209602845', 'en-1-125645846',
  'en-1-114396298', 'sc-oscar-r28', 'sc-oscar-r29', 'ni-r3',
]);

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const en = read('data-raw/hospices-en.json');
// C6-4: CHAS umbrella org is removed, not a hospice (gate 4, 2026-11-08).
const sc = read('data-raw/hospices-sc.json').filter((h) => h.id !== 'sc-oscar-019724');
const ni = read('data-raw/hospices-ni.json');
const wales = read('data-raw/hospices-wales.json');

const townOf = (h) => (h.address && h.address.length > 1 ? h.address[h.address.length - 1] : '');

const all = [
  ...en.map((h) => ({
    id: h.id, name: h.name, town: townOf(h), postcode: h.postcode, nation: 'en',
    kind: 'approx', source: SOURCES.en,
    website: h.cqcId ? `https://www.cqc.org.uk/location/${h.cqcId}` : '',
    cqcUrl: h.cqcId ? `https://www.cqc.org.uk/location/${h.cqcId}` : '',
    curated: false,
  })),
  ...sc.map((h) => ({
    id: h.id, name: h.name, town: h.town || townOf(h), postcode: h.postcode, nation: 'sc',
    kind: 'approx', source: h.id.startsWith('sc-oscar-') ? SOURCES.scOscar : h.id.startsWith('sc-pcs-') ? SOURCES.scPcs : SOURCES.sc, website: '', cqcUrl: '', curated: false,
  })),
  ...ni.map((h) => ({
    id: h.id, name: h.name, town: '', postcode: h.postcode, nation: 'ni',
    kind: 'approx', source: SOURCES.ni, website: '', cqcUrl: '', curated: false,
  })),
  ...wales.map((h) => ({
    id: h.id, name: h.name, town: '', postcode: h.postcode, nation: 'wales',
    kind: 'approx', source: SOURCES.wales, website: '', cqcUrl: '', curated: false,
  })),
];

// curated seeding: replace the register row with the same id
const curatedIds = new Map();
for (const c of CATCHMENTS) {
  const m = (c.cqcUrl || '').match(/location\/(1-\d+)/);
  if (m) curatedIds.set(m[1], c);
}
for (const [cqcId, c] of curatedIds) {
  const id = `en-${cqcId}`;
  all.push({
    id, name: c.name, town: c.town, postcode: c.postcode, nation: 'en',
    kind: c.kind, source: c.source, website: c.website, cqcUrl: c.cqcUrl, curated: true,
  });
  const i = all.findIndex((h) => h.id === id && !h.curated);
  if (i >= 0) all.splice(i, 1); // curated identity wins over the register row
}

// C6-4: stamp the children's designation
for (const h of all) h.children = CHILDREN_IDS.has(h.id);

// assertions
const curatedCount = all.filter((h) => h.curated).length;
if (curatedCount !== 20) {
  console.error(`expected 20 curated: true hospices, found ${curatedCount}`);
  process.exit(1);
}
const dupes = all.map((h) => h.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupes.length) {
  console.error('duplicate hospice ids: ' + [...new Set(dupes)].join(', '));
  process.exit(1);
}
const present = all.filter((h) => h.curated).map((h) => h.id);
for (const cqcId of curatedIds.keys()) {
  if (!present.includes(`en-${cqcId}`)) {
    console.error(`curated id missing from merged output: en-${cqcId}`);
    process.exit(1);
  }
}
const childrenCount = all.filter((h) => h.children).length;
if (childrenCount !== 20) {
  console.error(`expected 20 children's hospices, found ${childrenCount}`);
  process.exit(1);
}
if (all.some((h) => h.id === 'sc-oscar-019724')) {
  console.error('CHAS umbrella sc-oscar-019724 is still present (must be removed)');
  process.exit(1);
}

fs.writeFileSync('data-raw/hospices-all.json', JSON.stringify(all));
const byNation = new Map();
for (const h of all) byNation.set(h.nation, (byNation.get(h.nation) || 0) + 1);
console.log(`hospices-all: ${all.length} total | en=${byNation.get('en') || 0} sc=${byNation.get('sc') || 0} wales=${byNation.get('wales') || 0} ni=${byNation.get('ni') || 0} | curated: ${curatedCount}`);
