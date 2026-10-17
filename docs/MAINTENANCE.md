# Maintenance — UK-wide hospice catchment map

Short operational guide for keeping the map current. Provenance detail
per file: `data/README.md`. Decisions: `docs/adr/`. Vocabulary: `GLOSSARY.md`.

## Commands

```bat
npm install        :: once, per machine
npm run dev        :: dev server → http://localhost:5173
npm run build      :: tsc + vite → dist/ (deployable static site)
```

## Refreshing the data

Run the chain in order (all exit 0 when healthy):

```bat
node scripts/extract-gp-practices.mjs
node scripts/extract-gp-practices-sc.mjs
node scripts/extract-hospices-sc.mjs
node scripts/extract-gp-practices-ni.mjs
node scripts/extract-hospices-ni.mjs
node scripts/extract-gp-practices-wales.mjs
node scripts/extract-hospices-wales.mjs
node scripts/merge-hospices.mjs
node scripts/geocode-postcodes.mjs   :: the long one — 1 req/s, resumable
node scripts/build-data.mjs          :: run twice; outputs must be byte-identical
node scripts/validate-tessellation.mjs
npm run build
```

Missing source files never abort the chain: the extracts emit a documented
`[]` placeholder and log the human fetch procedure they need.

### Fetches still to do (one-time, from a machine with normal DNS/browser)

1. **RQIA (N. Ireland)** — "All Registered Services" XLSX from
   `https://publicregulation.gov.uk` →
   `data-raw\rqia-regulated-services-2026-06.xlsx`.
2. **Welsh GP practices** — data.wales catalog, layers
   `geonode:gpmainsites_ogl` + `geonode:gpbranchsites_ogl` →
   `data-raw\gp-practices-wales-{main,branch}-2026-10.csv` (or .geojson).
3. **Scottish GP practices** — NHS Scotland Spatial Hub layer →
   `data-raw\gp-practices-scotland-2026-10.geojson`.
4. **Welsh hospices** — CIW email request (exact text in
   `data/README.md`); save the reply as
   `data-raw\wales-hospices-2026-10.csv`.

After each file lands: run its extract script, then
`merge-hospices.mjs` (hospice files only) → `geocode-postcodes.mjs` →
`build-data.mjs` (twice) → `validate-tessellation.mjs` → `npm run build`,
and commit `data-raw/` + `public/data/`.

## Sanity checks for a healthy build

- `hospices: 155 (unplaced: 0)` and the per-nation counts in the Methodology
  modal of the app.
- `unassigned: 12` — these sit in 9 postcodes with no OSM coverage
  (documented in `data/README.md`); do not chase them in the geocoder.
- `shops: … unresolved ids: 0`.
- SHA-256 of the four `public/data/*.json` identical across two builds.
- Validator: 100% coverage; the printed Basildon missing-polygon line and
  the "Wisdom Hospice" sliver line are known, accepted quirks.

## Rollback

The feature is a single commit; `git revert <sha>` (or reset to
`5faa12e`) restores the previous Lancashire & South Cumbria state.
`public/data/*.json` can also be regenerated at any time from
`data-raw/` — data and code roll back independently.
