# Hospice Finder UK

An interactive map of UK hospices — 208 in the committed data snapshot
(England 152, Scotland 33, Wales 17, Northern Ireland 6) — with the GP
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
> 188 come from the national registers. See the Source & Method modal and
> [`data/README.md`](data/README.md).

No auth required. The side-panel search is debounced; `#feedback` opens
your mail client (nothing is collected by the site).

## What you'll see

- **Start here card** — the landing page (at the top-left) offers a
  postcode lookup. Unknown routes default to it.
- **Diamond markers** — hospice sites (colour is a deterministic hash of
  the hospice id, so it is stable across rebuilds); visible on first load
  along with the catchment areas
- **Dots** — each GP practice, coloured by the catchment it is assigned to
  (off by default on first load — toggle in the header; on mobile, in
  the menu panel)
- **Areas** — each hospice's catchment: a Voronoi tessellation of the
  practice + hospice-site points over the UK
- **Squares** — charity shops from the hospices' websites (curated +
  discovered; off by default on first load — toggle in the header; on
  mobile, in the menu panel)
- **Grid-bucket markers** — low-zoom grid cells that reveal the underlying
  practice markers on click and fly at zoom level 11
- **A→Z list** — the side panel lists hospices alphabetically by default,
  Z→A, or by practice counts descending
- **Side panel: search, nation pills, per-hospice practice counts**;
  non-matching-nation elements are dimmed on the map
- **Theme picker** — Auto / Light / Dark (Auto follows the operating
  system's colour scheme; the choice is persisted in the browser)
- **BEACON design release** — the navy-and-coral visual identity built on
  10 `--hf-*` design tokens (ADR-0028); the display name "Hospice Finder
  UK" is unchanged (ADR-0023)
- The catchment colour key (20 curated) lives in the **Source & Method**
  modal

## Current data snapshot

Counts from the committed `public/data/` as of 2026-11-17 (Cycle 10
shop refresh on top of the 2026-11-14 Cycle 6 closeout and the
2026-11-08 data landing). Scotland is
complete: 911 practices, all geocoded and assigned. Wales practices are
complete: 539, placed from the source's own coordinates (the DataMap layers
carry no postcodes).

| Nation | Hospices | GP practices |
|---|---|---|
| England | 152 | 9,260 |
| Scotland | 33 | 911 |
| Wales | 17 | 539 |
| Northern Ireland | 6 | 304 |

208 hospices in total, with 11,002 of the 11,014 practices geocoded (five
passes of `scripts/geocode-postcodes.mjs` at 1 req/s, outcode fallback — the
2026-10-24 pass added the 729 Scottish practice postcodes, the 2026-10-27
pass the 5 new NI hospice postcode units, and the 2026-11-08 pass the 15 new
Wales hospice postcode units plus the Cycle 5 Scotland additions). 140
charity shops are geocoded, 17 of them outside their own catchment in the
committed snapshot (recomputed on every build) — the Cycle 10 crawl
(2026-11-17) refreshed the shop set from the 150 known hospice websites
plus a DuckDuckGo discovery pool of the 190-row pool of hospices without a
listed website, and an 18-site confirm-only pass, adding 2 (Dove Cottage's
Canal Lane shop, LE14 4EX; Foyle Hospice's Fundraising Centre, BT48 8JE).
Geocoding is complete:
9,125 of the 9,134 in-scope postcodes are resolved. The remaining 9 (all
NI practice postcodes) have no OSM/Nominatim coverage (units and outcodes
both absent), so their 12 practices carry no assignment in the data and
are not shown on the map — a documented source gap, not a defect (see
[`data/README.md`](data/README.md)). The assignment rule itself never
changes.

## Live site

The map is live at <https://hospiceinfo.pages.dev>. The Pages project is
git-connected to `main`, so every James-approved push builds
(`npm ci && npm run build`) and publishes `dist/` automatically
(ADR-0014).

Verification gates (owners + acceptance) are tracked in the pre-publish
gates section of [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md):

- **G5** — Chrome mobile pass (Slow 4G + 4× CPU) — m1 decided W8; closed
  with the Cycle 7 ship pass (2026-11-15)
- **W8** — ADR-0010 stride gate — passed 2026-11-15 (decided from G5's m1
  and James's in-browser 375 px ship pass)
- **G7** — Overpass mirror capacity re-check — carried (a rebuild event if
  actioned)
- ~~**H1a** — Wales GP practices fetch~~ — done 2026-10-27 (539 practices)
- ~~**H1b** — NI hospices fetch~~ — done 2026-10-27 (6 from the RQIA
  June 2026 export)

Recent ships: the Cycle 7 mobile layout fix (2026-11-15) and the Cycle 8
postcode-finder online fallback (2026-11-16, ADR-0037 — the first live
runtime component, a Pages Function proxy).

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
npm run build  # type-check (tsc) + Vite build + prerender → dist/
                # emits 216 static shells + sitemap.xml + robots.txt (231 files total)
npm run preview  # serve the built app
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
| 3. Merge | `scripts/merge-hospices.mjs` | stage 2 + the 20 curated catchments | `data-raw/hospices-all.json` (208) |
| 4. Geocode | `scripts/geocode-postcodes.mjs` | practice + hospice postcodes (9,134) | `data-raw/postcode-geo.csv` (OSM Nominatim, 1 req/s, resumable) |
| 5. Shops | `data-raw/shops-website.json` + `scripts/geocode-shops.mjs` | curated + discovered hospice websites (`scripts/crawl-hospice-shops.mjs`, Cycle 10, 2026-11-17) | `data-raw/shops-geo.json` (140 shops) |
| 6. Build | `scripts/build-data.mjs` | stages 1–5 | `public/data/hospices.json`, `practices.json`, `catchments.json`, `shops.json` |
| 7. Validate | `scripts/validate-tessellation.mjs` | `public/data/catchments.json` | no gaps, no overlap, in-bounds (exit 0) |

Assignment rule: every geocoded practice is assigned to the
**nearest hospice site** (single haversine rule — no postcode-outcode
lists, no hand-pinned areas). Boundaries are then computed as a Voronoi
tessellation of the practice + hospice-site points over the UK box
(lon/lat `-9.5/49.5 → 2.0/61.5`).

## Updating the data

1. Refresh the raw registers — the per-nation download steps live in
   `data/README.md` (the RQIA export and the Wales DataMap layers were
   fetched and committed 2026-10-27; the Wales hospice list landed
   2026-11-08 from the five NHS Wales P&I regional sub-pages,
   SHA-256 pins in `data/README.md`).
2. Re-run the four practice extract scripts and the four hospice extract
   scripts, then `node scripts/merge-hospices.mjs`.
3. `node scripts/geocode-postcodes.mjs` — resumable; only *new* postcodes
   are fetched (Nominatim = 1 request/second, no key). A full fresh run
   of all ~9,134 areas takes roughly 3 hours.
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

## Known limitations

- **Light map tiles in both themes** — the map renders OSM light tiles even
  in the dark theme; dark-tile support is deferred debt (SEC-4-03,
  risk-accepted; a one-line tile-URL change per ADR-0027 §4.5 when it is
  taken up).
- **Theme preference is per-browser** — the Auto/Light/Dark choice is
  stored only in the user's browser (`hfuk-theme` in `localStorage`); until
  the user picks Light or Dark the site follows the OS colour scheme, and
  the choice does not sync across devices.
- **Minimal font subset** — only Archivo 700 and Public Sans 400/600 ship
  (self-hosted, SIL OFL 1.1, attributed on the licences page); any other
  weight falls back to the system font stack.
- **Visual/contrast and theme persistence pass via human gate** — QA items
  8–9 (light + dark contrast at 1024/1280/1440/375, and fresh → auto →
  light/dark persistence) pass at code/spec level only; the final browser
  confirmation is a manual gate owned by the repo operator, since no
  browser is available on the build host.
- **Curated JSON trust boundary** — the committed data files are
  human-curated, and curation is the control (SEC-4-D2, risk-accepted);
  every data landing goes through the pre-push chain with provenance
  recorded in `data/README.md` — no external writes into `data-raw/`.
- **No CSP header** — the site ships no Content-Security-Policy header
  (SEC-4-D3, risk-accepted); the only inline JavaScript is the frozen
  no-flash theme-boot snippet, and any future inline-JS addition re-raises
  the CSP question.
- **One raw colour literal** — the W6 block uses `rgba(15,23,32,0.8)`
  directly instead of a design token (FQ4-1, informational).
- **Dev-only `npm audit` advisories** — three advisories (vite, esbuild,
  postcss) affect the build toolchain only, not the shipped `dist/`.
