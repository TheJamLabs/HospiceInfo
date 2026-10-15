# Hospice Catchment Map — Lancashire & South Cumbria

An interactive map of 20 hospices in Lancashire and South Cumbria, with the GP
practices each one is (approximately) associated with. Click a hospice in the
side panel to spotlight its catchment envelope, pan/zoom the map, hover
dots for practice details, and open **Source & Method** for the full
methodology and caveats.

> **This is an approximation, not an official boundary.** No authoritative
> published "hospice catchment" dataset exists. Catchments are inferred from
> each hospice's published service-area wording where available (7 of 20),
> with the rest approximated around the hospice site (13 of 20). See the
> Source & Method modal and [`data/README.md`](data/README.md).

## What you'll see

- **Diamond markers** — hospice sites (coloured per hospice)
- **Dots** — each GP practice (CQC register, Oct 2026), coloured by the
  catchment it is assigned to
- **Areas** — each hospice's catchment, computed as a Voronoi tessellation
  of the practice + hospice-site points, so adjacent areas share a
  continuous edge (they tile the map: no gaps, no overlap)
- **Squares** — each hospice's charity shops (toggle in the header);
  orange squares are shops that sit *outside* their own catchment
- Side panel with search + list, bottom-right legend

## Quick start

Requires Node 18+ (tested on Node 22).

```
npm install
npm run dev
```

Open http://localhost:5173. The built data files in `public/data/` are
committed, so no network call is needed for the data — only the OSM map
tiles are fetched at runtime.

Production build:

```
npm run build     # type-check (tsc) + Vite build -> dist/
npm run preview   # serve the built app
```

## Data pipeline

All raw inputs and generated data are committed, so the map is reproducible
without re-downloading anything.

| Stage | Script | Input | Output |
|---|---|---|---|
| 1. Extract | `scripts/extract-gp-practices.mjs` | `data-raw/cqc-directory-2026-10.csv` | `data-raw/gp-practices-target.json` (643 GP practice locations) |
| 2. Geocode | `scripts/geocode-postcodes.mjs` | practice + hospice postcodes | `data-raw/postcode-geo.csv` (552 areas, OSM Nominatim, 1 req/s, resumable) |
| 3. Catchments | `scripts/catchment-map.mjs` | hospice websites / CQC | 20 catchment definitions (published vs approx outcodes) |
| 4. Shops | `data-raw/shops-website.json` + `data-raw/shops-geo.json` (curated from hospice websites; Nominatim, see `scripts/geocode-shops.mjs`) | — | 138 charity shops with `outsideCatchment` flag |
| 5. Build | `scripts/build-data.mjs` | 1–4 | `public/data/hospices.json`, `practices.json`, `catchments.json`, `shops.json` |

Assignment rule: a practice's postcode outcode is checked against each
catchment's outcode list; a single match wins; ties and outcodes claimed by
none go to the nearest hospice (haversine). The result is a **complete
partition**: 643/643 practices are assigned to exactly one catchment.
Catchment boundaries are then computed as a Voronoi tessellation of the
practice + hospice-site points, so adjacent areas share an edge.

Current state: 643 practices, all assigned; 138 charity shops, 13 of them
outside their own hospice's catchment.

## Updating the data

1. Re-download the CQC locations register (see `data/README.md` for the
   source and column layout) to `data-raw/cqc-directory-YYYY-MM.csv`.
2. `node scripts/extract-gp-practices.mjs` (point it at the new file if you
   rename it — the path is near the top of the script).
3. `node scripts/geocode-postcodes.mjs` — resumable; only new postcodes are
   fetched (Nominatim = 1 request/second, no key required). A fresh
   ~570-area set takes ≈ 10 min.
4. If a hospice's published service area changed, update
   `scripts/catchment-map.mjs` (outcodes come from the practice dataset, so
   use the outcodes that appear in `data-raw/gp-practices-target.json`).
5. `npm run build-data`, then `npm run build`.

## Tech

React 18 + TypeScript (strict) + Vite 5 + Leaflet (react-leaflet 4) +
Bootstrap 5. No backend, no auth, no telemetry.

`npm audit` currently flags esbuild (dev-server only, used by Vite during
`npm run dev`); the fix is Vite 8, a breaking upgrade. Accepted for this
prototype — it does not affect the built app in `dist/`.
