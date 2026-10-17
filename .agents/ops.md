# Ops — UK-wide hospice catchment map (stage 8, 2026-10-16)

Authored by the Engineering Lead (one-shot stage artifact; sub-session
policy per operator-validated practice in this environment). User-facing
summary: `docs/MAINTENANCE.md`.

## Running the app

- `npm install` (new machine), then:
  - Dev: `npm run dev` — Vite on `http://localhost:5173` (auto-increments if
    a prior session holds the port).
  - Production: `npm run build` → `dist/` (static; `dist/data/*.json` are
    copied from `public/data/` by Vite — verified present). Deploy `dist/`
    to any static host that serves same-origin fetches.
- No environment variables, no build-time secrets, no backend.

## Data refresh (canonical chain, in order)

1. Nation extracts (each exits 0; absent input files → documented
   `[]` placeholder + procedure log):
   `node scripts/extract-gp-practices.mjs`
   `node scripts/extract-gp-practices-sc.mjs`
   `node scripts/extract-hospices-sc.mjs`
   `node scripts/extract-gp-practices-ni.mjs`
   `node scripts/extract-hospices-ni.mjs`
   `node scripts/extract-gp-practices-wales.mjs`
   `node scripts/extract-hospices-wales.mjs`
2. `node scripts/merge-hospices.mjs` (asserts exactly 20 curated, unique ids)
3. `node scripts/geocode-postcodes.mjs` — the long pole. 1 req/s to OSM
   Nominatim, resumable append to `data-raw/postcode-geo.csv`, exits
   **non-zero if any in-scope postcode lacks coordinates**. Expect
   `incomplete: 9` on a fresh full run (the documented OSM gap — see below).
   Run as a background/monitored task for >1 h batches.
4. `node scripts/build-data.mjs` — run **twice** to confirm byte-identical
   `public/data/*.json` (SHA-256).
5. `node scripts/validate-tessellation.mjs` — must exit 0 (100% box
   coverage; known: 1 missing polygon = Basildon degenerate cell).
6. `npm run build` — tsc + vite, exit 0.
7. Commit `data-raw/` + `public/data/` (plus any touched scripts).

## Pending human fetches (3 files + 1 email; exact steps in `data/README.md`)

| Input | On receipt run |
|-------|----------------|
| RQIA "All Registered Services" XLSX → `data-raw/rqia-regulated-services-2026-06.xlsx` | `extract-hospices-ni.mjs` → `merge-hospices.mjs` → geocode → build → validate |
| data.wales `geonode:gpmainsites_ogl` / `geonode:gpbranchsites_ogl` → `data-raw/gp-practices-wales-{main,branch}-2026-10.{csv,geojson}` | `extract-gp-practices-wales.mjs` → geocode → build → validate |
| NHS Scotland Spatial Hub GP-practices GeoJSON → `data-raw/gp-practices-scotland-2026-10.geojson` | `extract-gp-practices-sc.mjs` → geocode → build → validate |
| CIW email reply (text at `data/README.md` B1) → save as `data-raw/wales-hospices-2026-10.csv` | `extract-hospices-wales.mjs` → `merge-hospices.mjs` → geocode → build → validate |

## Validation (definition of healthy)

- `npm run build` exit 0.
- Double `node scripts/build-data.mjs`: SHA-256 of the four
  `public/data/*.json` identical across runs (recorded set:
  catchments `581fceea…`, hospices `fced8491…`, practices `ff24599d…`,
  shops `7e81df4c…`).
- `node scripts/validate-tessellation.mjs` exit 0: 155 catchments, 100%
  coverage, known printed quirks (Basildon missing polygon; 0.0002 deg²
  "Wisdom Hospice" sliver).
- Build log invariants: `hospices: 155 (unplaced: 0)`; `shops: … unresolved
  ids: 0`; `assigned: 9552, unassigned: 12` (12 = the 9 OSM-gap postcodes).
- `data-raw/postcode-geo.csv`: 8,364 rows of 8,373 in scope.

## Rollback

- The whole feature lands as one commit on `main`. `git revert <sha>` (or
  `git reset --hard 5faa12e` in a clean tree) restores the Lancashire &
  South Cumbria map: the 20 curated identities are pinned, so the pre-feature
  state is fully reproducible from that commit.
- Data is independently rollable: `public/data/*.json` regenerate
  byte-identically from committed `data-raw/` — a stale or corrupt JSON set
  needs no code rollback, just a re-run of the chain.
- No migrations, no shared state, no external writes: rollback blast radius
  is the repository itself.

## Known operational risks

- Geocoding wall time (hours) — background task, resumable; 429/503 backoff
  can stretch it.
- The 9 OSM-gap postcodes persist until OSM coverage changes; the geocoder
  exiting 1 on them is expected and documented — do not loop.
- `npm audit`: 3 accepted advisories (xlsx devDep high ×2, esbuild dev
  moderate ×1) — see `security.md` SEC-1/SEC-2; not `npm audit fix --force`.
- Port 5173 frequently held by a prior session's server; Vite auto-increments.
