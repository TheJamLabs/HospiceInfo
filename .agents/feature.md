# Feature: Cycle 5 — Complete UK hospice data: Wales, Scotland, Northern Ireland

Land the full UK hospice dataset: Wales (14 rows from the Hospice Health
Wales member list), Scotland (evidenced real count, ~40 expected,
reconciled from OSCAR / Hospice Scotland / PPPC with the three curated
Scottish identities surviving), and Northern Ireland (6 rows from the
pinned PRA inspectorate register, with an exhaustiveness proof). Every
source is pinned with full provenance in `data/README.md` (URL, fetch
procedure, fetch date, SHA-256, licence). No runtime dependencies change —
this is a data cycle on the existing chain
(`extract-*` → `merge-hospices.mjs` → `geocode-postcodes.mjs` →
`npm run build-data` → `validate-tessellation.mjs` → `npm run build`).

## James's scope decisions (2026-11-07)

- **Wales**: Hospice Health Wales (HHW) member list — "get them all into
  our app" (14 rows including the borderline Y Rhoel and Hope House
  (SY10, an England postcode serving the Welsh:border town); St David's
  has two sites = two rows; Clwyd Hospice and Terfel House were added to
  James's 10 entries). CIW is skipped entirely.
- **Scotland**: James's ~19-entry "Scottish Partnership for Palliative
  Care directory" list is a SEED only — it is missing ~6 major hospices
  (e.g. Aintree, Victoria Dundee, St Andrews), has blank postcodes, and
  one invalid entry. Real count expected ~40. Authoritative source =
  OSCAR (National Archives) reconciled with Hospice Scotland / PPPC
  lists.
- **Northern Ireland**: stays 6 rows from the pinned PRA inspectorate
  XLSX (`data-raw/hospices-ni.json`); exhaustiveness must be proven by
  scanning the register's classification columns (a name filter alone
  misses entries whose Service Name lacks "hospice").
- The three in-app Scottish entries (`lonesome-hospice`,
  `george-cross-hospice-edinburgh`, `aintree-hospice-paisley`) must
  survive with stable IDs (`merge-hospices.mjs` asserts 20 curated
  identities).

## Agreed scope

1. **Wales — 14 rows** from the pinned HHW member list: Clwyd Hospice,
   Tŷ Hafan, Tŷ Gobaith, Hope House, Y Rhoel, St David's (Llandudno),
   St David's (Newport), St Kentigern, Nightingale House, Marie Curie
   Cardiff & Vale, City Hospice, Skanda Vale, Terfel House, plus any
   further HHW member Research flags. Output rows:
   `{id:'wales-r<n>',name,postcode}`.
2. **Scotland — evidenced real count (~40 expected)**: every hospice
   with a valid UK postcode, geocoded via Nominatim; the three curated
   Scottish identities survive with stable IDs; the in-repo GIS CSV
   (10,497 rows, 3 name-matches) stays pinned as overlapping provenance;
   its undercount (only 3 name-matches) must be explained by the CSV's
   service-type classification (Research verifies).
3. **Northern Ireland — stays 6** with an exhaustiveness proof in
   `research.md`: the PRA register name filter yields exactly 6 and no
   classification column (service type, sector, categories, conditions)
   contains any hospice value.
4. **Pipeline hygiene**: every new source gets a full provenance pin in
   `data/README.md` (URL + fetch procedure + fetch date + SHA-256 +
   licence); Nominatim geocoding proceeds per the existing plan; zero new
   runtime dependencies.
5. **Full data chain green**: `npm run build-data` (fail-fast,
   byte-identical on re-run), `node scripts/validate-tessellation.mjs`
   (exit 0, ~110s runtime), `npm run build` green two runs and
   byte-identical (169 HTML shells / 168 `<loc>` invariant — note the
   shell/loc counts grow with the new hospices; the invariant is
   `<loc>` count = data count + 7 info pages, verified by the prereNDER
   script's own assertion).

## Acceptance criteria

- **AC1 (Wales)**: 14 Welsh rows in `hospices.json`, every one with a
  valid UK postcode, all from the pinned HHW list (URL + SHA-256 in
  `data/README.md`).
- **AC2 (Scotland)**: Scotland rows reflect the evidenced real count of
  hospice providers (~40 expected), each with a valid UK postcode
  geocoded via Nominatim; the three curated Scottish IDs (`lonesome-
  hospice`, `george-cross-hospice-edinburgh`, `aintree-hospice-paisley`)
  survive with the same identities; the `merge-hospices.mjs`
  curated-identity assertions pass.
- **AC3 (NI)**: NI stays 6; `research.md` contains the register-scan
  proof (name filter = 6 and zero hospice values in the classification
  columns).
- **AC4 (provenance)**: every new/updated source in `data-raw/` has a
  pin entry in `data/README.md` — URL, fetch procedure, fetch date,
  SHA-256, licence.
- **AC5 (chain)**: `npm run build-data` exit 0 and byte-identical on
  re-run; `node scripts/validate-tessellation.mjs` exit 0; `npm run
  build` green on two consecutive runs and byte-identical (prerender
  `<loc>` count = data count + 7, per the script's own assertion); 0 new
  runtime dependencies; 0 open Blocking findings from QA/Security.

## Out of scope

- UI / layout / theming changes. Two reported defects — the floating
  "Open list" button overlapping the Start-here card on mobile, and
  desktop footer overlap on long pages (a Cycle 4 AC3 regression) — are
  logged for the next bugfix cycle (screenshots: `C:\Users\james\.qwen\
  tmp\c69234fce73687cc3d15d654784c4d9280318512c32ea80fbf5c075ea3d56036\
  attachments\session-429b27cc-304a-4c10-8a4a-b81d3b8982d6\image.png` and
  `image (1).png`).
- Any change to the catchment assignment rule (nearest-hospice
  haversine — ADR invariant).
- England CQC data; GP/shop data changes; re-fetching the GIS CSV; CIW.

## Human gates (Cycle 5)

- **H5-1 (Wales)**: the HHW website is unreachable from this machine
  (restricted DNS, ENOTFOUND 2026-11-07). James fetches the member list
  in a normal browser (suggested URL in `research.md`) and saves it to
  `data-raw/`; the lead records the SHA-256.
- **H5-2 (Scotland, conditional)**: applies only if a primary source
  proves machine-unfetchable — Research decides per source and records
  the exact manual procedure.
