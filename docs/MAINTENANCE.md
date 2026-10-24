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
node scripts/fetch-uk-land.mjs       :: one-time — only on a networked machine (ADR-0006)
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

## Land file block — `data-raw/uk-land.json` (ADR-0006)

The tessellation is clipped to the committed OSM land file
`data-raw/uk-land.json`. That file is **absent in the current commit**
(could not be fetched offline from the build machine), so
`build-data.mjs` and `validate-tessellation.mjs` fail fast by design —
no box-only fallback, no synthetic coastline. To resolve, on a machine
with a normal network run:

```bat
node scripts/fetch-uk-land.mjs
```

then commit `data-raw/uk-land.json`, record its SHA-256 and polygon count
in the provenance row in `data/README.md`, and re-run
`node scripts/build-data.mjs` (twice — the outputs must be byte-identical)
and `node scripts/validate-tessellation.mjs`.

**Coverage invariant** (enforced by `validate-tessellation.mjs` once the
land file is present): every placed practice, hospice, and charity-shop
point must fall inside some Voronoi cell after clipping to land. A point
with no cell fails the build — the map never serves an uncovered catchment
silently. Do not weaken the invariant or special-case points to make the
check pass.

## Deploy (Cloudflare Pages)

The site is static: `npm run build` produces `dist/`, and a one-command
push publishes it (full playbook in `.agents/ops.md`).

1. Build: `npm run build` (`tsc` + Vite → `dist/`).
2. Push: `npx wrangler pages deploy dist --project-name=hospiceinfo`
   (needs a one-time `wrangler login`; run from a machine with network).
   Hash routing (ADR-0007) means no rewrites, `_routes.json` or 404 page
   are needed.

**Pre-publish gate** (from `.agents/ops.md`; all six must be green
before the first live deploy):

- **G1** — commit all uncommitted work
- **G2** — fetch and commit `data-raw/uk-land.json` (human fetch
  procedure 4 in `data/README.md`) so catchments clip to land and
  `build-data.mjs`/`validate-tessellation.mjs` pass again
- **G3** — ODbL attribution for the OSM-derived land geometry
  (applied to the `#licences` page and `data/README.md`)
- **G4** — real operator name and contact email in
  `data-raw/site-config.json` **and** `src/lib/siteConfig.ts` (keep both
  in lockstep), then rebuild
- **G5** — a human mobile pass on the live URL
- **G6** — `npm run build` + every validator green

**Rollback (deployment):** Cloudflare Pages keeps every prior deployment —
roll back anytime from the dashboard (Pages → project → Deployments → pick
the earlier deployment → restore), no local action needed. `dist/` is
rebuilt from source at every deploy, so a bad data change is undone by the
normal "Updating the data" chain above plus a fresh push.

## Corrections log

`public/data/corrections.json` is a committed JSON array, **newest first**,
whose entries carry `{date, summary, dataChanged}` (extra optional fields
such as a point id are allowed). To record a correction:

```bat
node scripts/add-correction.mjs "what was corrected" [--data-changed]
node scripts/validate-corrections.mjs
```

The site renders the log at `#corrections` (page-local fetch; the log is
never part of the map data bundle).

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
`5faa12e`) restores the previous pilot-scope state.
`public/data/*.json` can also be regenerated at any time from
`data-raw/` — data and code roll back independently.
