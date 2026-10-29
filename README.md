# Hospice Catchment Map — United Kingdom

An interactive map of UK hospices — 161 in the committed data snapshot
(England 152, Scotland 3, Wales 0, Northern Ireland 6) — with the GP
practices each one is (approximately) associated with. Click a hospice in
the side panel to spotlight its catchment, use the nation pills
(All / England / Scotland / Wales / NI) to filter and reframe the map,
pan/zoom, hover dots for practice details, and open **Source & Method**
for the full methodology, caveats and the catchment colour key.

> **This is an approximation, not an official boundary.** No authoritative
> published "hospice catchment" dataset exists. Every catchment is
> approximated from practice and hospice locations: each geocoded practice
> is assigned to the **nearest hospice site** (straight-line distance),
> and the boundaries are a Voronoi tessellation over the whole UK —
> adjacent catchments share a continuous edge (they tile the map: no gaps,
> no overlap). The 20 hospices of the original Lancashire & South Cumbria
> map are *curated* (hand-verified names, towns and postcodes); the other
> 141 come from the national registers. See the Source & Method modal and
> [`data/README.md`](data/README.md).

No auth required. The side-panel search is debounced; `#feedback` opens
your mail client (nothing is collected by the site).

## What you'll see

- **Start here card** — the landing page (at the top-left) offers a
  postcode lookup. Unknown routes default to it.
- **Diamond markers** — hospice sites (colour is a deterministic hash of
  the hospice id, so it is stable across rebuilds)
- **Dots** — each GP practice, coloured by the catchment it is assigned to
- **Areas** — each hospice's catchment: a Voronoi tessellation of the
  practice + hospice-site points over the UK
- **Squares** — charity shops from the curated hospices' websites (toggle
  in the header)
- **Grid-bucket markers** — low-zoom grid cells that reveal the underlying
  practice markers on click and fly at zoom level 11
- **A→Z list** — the side panel lists hospices alphabetically by default,
  Z→A, or by practice counts descending. The "Has published service area"
  toggle filters to the 7 hospices that explicitly state a service area on
  their website
- **Side panel: search, nation pills, per-hospice practice counts**;
  non-matching-nation elements are dimmed on the map
- The catchment colour key (20 curated) lives in the **Source & Method**
  modal

## Current data snapshot

Counts from the committed `public/data/` as of 2026-10-27. Scotland is
complete: 911 practices, all geocoded and assigned. Wales practices are
complete: 539, placed from the source's own coordinates (the DataMap layers
carry no postcodes).

| Nation | Hospices | GP practices |
|---|---|---|
| England | 152 | 9,260 |
| Scotland | 3 | 911 |
| Wales | 0 — CIW reply pending | 539 |
| Northern Ireland | 6 | 304 |

161 hospices in total, with 11,002 practices geocoded (four passes of
`scripts/geocode-postcodes.mjs` at 1 req/s, outcode fallback — the
2026-10-24 pass added the 729 Scottish practice postcodes; the 2026-10-27
pass added the 5 new NI hospice postcode units). 138 charity shops are
geocoded, 21 of them outside their own catchment. Geocoding is complete:
9,098 of the 9,107 in-scope postcodes are resolved. The remaining 9 (all
NI practice postcodes) have no OSM/Nominatim coverage (units and outcodes
both absent), so their 12 practices carry no assignment in the data and
are not shown on the map — a documented source gap, not a defect (see
[`data/README.md`](data/README.md)). The assignment rule itself never
changes.

## Pre-launch

The map is in a pre-launch state. Verification gates remain open:

- **G5** — Chrome mobile pass (Slow 4G + 4× CPU) — post-fix m1, m2, m4 values
  pending the human pass
- **W8** — ADR-0010 stride gate, decided from G5's m1 (lead, code)
- **G7** — Overpass mirror capacity re-check
- ~~**H1a** — Wales GP practices fetch~~ — done 2026-10-27 (539 practices)
- ~~**H1b** — NI hospices fetch~~ — done 2026-10-27 (6 from the RQIA
  June 2026 export)

Pre-launch gates (owners + acceptance) are tracked in the pre-launch gates
section of [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md). The Cycle 2 working
tree is committed to `origin/main` (2026-10-27); the site publishes
automatically on each approved push via the git-connected Cloudflare Pages
build (ADR-0014) — the gates are verification gates and no longer block
publication.

## Pages

The app is a single page with hash routes (no server configuration
needed):

- `#map` — the map (default; unknown routes land here)
- `#about` — what the site is, who runs it, where the data comes from
- `#feedback` — how to flag a problem (opens your own email client;
  nothing is collected on this site)
- `#corrections` — public log of the corrections applied to the data
- `#privacy`, `#licences`, `#accessibility` — the legal and
  accessibility pages

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

Deployment to the live site (Cloudflare Pages — full procedure in
`docs/MAINTENANCE.md`): the Pages project is git-connected to `main`, so a
James-approved push builds (`npm ci && npm run build`) and publishes `dist/`
automatically (ADR-0014). Run the pre-push chain in `docs/MAINTENANCE.md`
before the push; no local `wrangler deploy` is needed.

## Data pipeline

All raw inputs and generated data are committed, so the map is reproducible
without re-downloading anything.

| Stage | Script | Input | Output |
|---|---|---|---|
| 1. Practices | `scripts/extract-gp-practices-{en,sc,ni,wales}.mjs` | CQC directory, NHS Scotland, NI practice file, Wales DataMap | `data-raw/gp-practices-<nation>.json` |
| 2. Hospices | `scripts/extract-hospices-{en,sc,ni,wales}.mjs` | CQC directory, Care Inspectorate, RQIA, CIW | `data-raw/hospices-<nation>.json` |
| 3. Merge | `scripts/merge-hospices.mjs` | stage 2 + the 20 curated catchments | `data-raw/hospices-all.json` (161) |
| 4. Geocode | `scripts/geocode-postcodes.mjs` | practice + hospice postcodes (9,107) | `data-raw/postcode-geo.csv` (OSM Nominatim, 1 req/s, resumable) |
| 5. Shops | `data-raw/shops-website.json` + `scripts/geocode-shops.mjs` | the 20 curated websites | `data-raw/shops-geo.json` (138 shops) |
| 6. Build | `scripts/build-data.mjs` | stages 1–5 | `public/data/hospices.json`, `practices.json`, `catchments.json`, `shops.json` |
| 7. Validate | `scripts/validate-tessellation.mjs` | `public/data/catchments.json` | no gaps, no overlap, in-bounds (exit 0) |

Assignment rule: every geocoded practice is assigned to the
**nearest hospice site** (single haversine rule — no postcode-outcode
lists, no hand-pinned areas). Boundaries are then computed as a Voronoi
tessellation of the practice + hospice-site points over the UK box
(lon/lat `-9.5/49.5 → 2.0/61.5`).

## Updating the data

1. Refresh the raw registers — the per-nation download steps live in
   `data/README.md` (the only one still pending is the Care Inspectorate
   Wales reply with the Wales hospice list; the RQIA export and the Wales
   DataMap layers were fetched and committed 2026-10-27).
2. Re-run the four practice extract scripts and the four hospice extract
   scripts, then `node scripts/merge-hospices.mjs`.
3. `node scripts/geocode-postcodes.mjs` — resumable; only *new* postcodes
   are fetched (Nominatim = 1 request/second, no key). A full fresh run
   of all ~9,100 areas takes roughly 3 hours.
4. `npm run build-data`, then `node scripts/validate-tessellation.mjs`,
   then `npm run build`.

First runs of the extract scripts auto-discover the register's columns
(they log the header on success), and the geocoder backs off on 429/503 —
so a fresh run is safe to leave unattended.

## Tech

React 18 + TypeScript (strict) + Vite 5 + Leaflet (react-leaflet 4) +
Bootstrap 5. No backend, no auth, no telemetry.

`npm audit` currently flags esbuild (dev-server only, used by Vite during
`npm run dev`); the fix is Vite 8, a breaking upgrade. Accepted for this
prototype — it does not affect the built app in `dist/`.
