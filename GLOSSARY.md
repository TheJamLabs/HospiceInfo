# GLOSSARY - Hospice Finder UK

This glossary defines domain vocabulary used across the codebase, data
provenance, and documentation. New terms are formatted in *italics*.

## Core domain terms

- **catchment**: the area associated with a hospice; approximated in this
  map by a Voronoi tessellation of practice and hospice-site points, clipped
  to the *land mask* and a UK bounding box. A "catchment" may be *curated*
  (hand-verified identity) or *approx* (geometric estimate).
- **hospice**: a single organisation that provides palliative/hospice care. In
  this dataset each hospice row is keyed by a synthetic id (`{nation}-{registerId}`
  per ADR-0002); some rows are *curated* and carry a `kind` of `"published"`
  while others are `"approx"`.
- **GP practice**: a general practice surgery location in the dataset. A practice
  is assigned to the nearest hospice (haversine) and rendered as a dot coloured
  by its catchment.
- **Voronoi tessellation**: partition of the plane where each cell contains all
  points closer to one seed than to any other; this is the basis for catchment
  boundaries.
- **haversine**: spherical distance formula used to assign a practice to its
  nearest hospice site.

## Feature-specific terms (public-ready map)

- **land mask**: the OSM-derived `natural=coastline` geometry (committed as
  `data-raw/uk-land.json`) that constrains catchments to British land only.
  Catchments are *land-clipped*: the Voronoi cell is intersected with the land
  mask to remove sea cells. See ADR-0006.
- **land clip** (*italics*): the geometric result of `intersection(voronoiCell, landMask)`.
  The catchment polygons shipped in `public/data/catchments.json` are the clipped
  versions of the Voronoi cells.
- **corrections log** (*italics*): the public, append-only record (`public/data/corrections.json`)
  of accepted corrections; initially empty. Each entry references the source
  file modified (`dataChanged`) and may reference a specific correction (id or
  hospiceId). The curation workflow feeds into this log.
- **curation workflow** (*italics*): the documented manual loop for corrections:
  receive feedback → verify → apply (edit `data-raw/` or use curator override)
  → rebuild → log entry. See `scripts/add-correction.mjs` (optional) and
  `docs/MAINTENANCE.md` §Corrections workflow.
- **placeholder operator** (*italics*): the clearly-marked stand-in name and
  email in siteConfig (`src/lib/siteConfig.ts` + `data-raw/site-config.json`).
  While the real operator is unnamed, a "contact" line exists; its text is
  documented in the About page and the mailto template.
- **outside catchment flag**: per-shop boolean `Shop.outsideCatchment` in
  `shops.json`; a shop sits outside the boundary of its own catchment cell
  (point-in-polygon against the shop's own cell). This flag persists in the
  build output but is *hidden* from the UI per feature.md §3.2; affected shops
  render with their normal catchment colour (no badge, no special colour).
- **unassigned practices**: practices with `hospiceId: null` (post-geocoding
  gap); they remain in the data, but their count is hidden from the UI — no
  "unassigned" count is shown on any page (public-safety rule, feature.md §3.2).
- **degenerate cell**: a catchment with `polygons: []` (e.g. Wisdom, 0.0002 deg²;
  Basildon's `en-1-17708902164` has no ring). The UI hides these cells;
  the validator reports them.
- **byte-identical rebuild ritual**: the reproducible build practice that yields
  identical `public/data/*.json` output on consecutive `npm run build-data` runs,
  including the land file. The ritual runs the build twice and compares SHA-256.
- **ODbL attribution**: ODbL (Open Database License) is required for any data
  or geometry derived from OSM (e.g. the coastline land mask, map tiles, geocoding).
  See `data/README.md` §Licences & Attribution and the Licences page.

## Cycle 2 terms (landings, performance, identity, list, flows)

- **hide-not-delete**: the public-safe rule — data fields that mark internal gaps
  (unassigned practices, `outsideCatchment` flags, degenerate cells, missing
  geocoding) are never removed from the data model; the UI simply does not render
  them, and "not found" surfaces use neutral wording that never names an internal
  flag. See `.agents/architecture.md` §5 and ADR-0012.
- **LOD bucket marker** (*italics*): one rendered marker standing in for many
  practices at low zoom, produced by grouping placed practices into grid buckets
  (`floor(lon/grid) × floor(lat/grid)`); the bucket shows a count and expands on
  click. P2 is a bounded fix applied in measured sequence; the *evidence-gated*
  mechanism is the §2c stride (on only if the §2c metric justifies it); zoom 12
  shows every marker. See ADR-0010 (P2/§2c).
- **start-here card** (*italics*): the dismissible landing card anchored
  top-left of the map viewport; runs the postcode → practice → catchment →
  hospice flow with persona sections (patient / fundraiser / clinician). See
  ADR-0012.
- **published / approx `kind`**: `kind` on a hospice row — `"published"` is one
  of the 20 hand-verified (curated) catchments with a published service area;
  `"approx"` is the remaining geometric (Voronoi) estimate. The UI filter
  "Has published service area", which exposed only the `published` rows, was
  removed in the BEACON release (Cycle 4); `kind` remains in the data.
  (The adjectival form *approx kind* is used in review shorthand.)
- **branch site**: a secondary surgery location of a main GP practice; the Wales
  practices register ships main and branch sites as two separate datasets
  (`gp-practices-wales-{main,branch}-2026-10.{csv,geojson}`), both fed into the
  same extract. See `data/README.md` §Human fetch procedures (2).
- **nation filter**: the panel control that restricts the visible hospices
  (and their catchments/practices) to one nation (`en` / `sc` / `ni` / `wales`);
  added with the UK-wide map.
- **PRA**: the **Public Regulation Authority**, Northern Ireland's public
  regulator from 2024 (successor to RQIA and HSCQC); the source of the
  prospective `data-raw/rqia-regulated-services-2026-06.xlsx` NI hospice
  register. See `data/README.md` §Human fetch procedures (1).
- **profile-first**: the Cycle 2 performance discipline — instrument and record
  a baseline (Slow 4G + 4× CPU, fixed metric set in `.agents/qa.md §Baseline`)
  *before* any fix; every fix is measured against that baseline, and
  downsampling is off by default, triggered only by the recorded metric. See
  ADR-0010.

## Cycle 3 terms (prerendering, SEO, identity, data gaps)

- **static prerendering**: emitting one crawlable HTML file per routable URL (per-page head + empty #root + boot script) as a post-build step, so crawlers read real document titles, meta, and JSON-LD without executing JS.
- **site URL**: the single canonical SITE_URL (https://hospiceinfo.pages.dev), sourced in data-raw/site-config.json (ADR-0009 pattern) and used by canonical links, Open Graph, and sitemap entries.
- **canonical URL**: the link rel=canonical value on each page - the exact served .html URL (home: /) - so search engines consolidate one identity per page.
- **Open Graph image**: public/og-image.png (1200x630), referenced by og:image on every emitted page for social-link previews.
- **hash-redirect guard**: the snippet in src/main.tsx that, on a real-path load with an empty hash, replaces the URL with the matching #/route so the hash router lands on the intended page (ADR-0016; closes R1).
- **manual pin**: an operator-supplied latitude/longitude for a postcode the geocoder cannot resolve, stored in data-raw/manual-geo-ni.json and merged into the build geo map (ADR-0021).
## Cycle 4 terms (first-load layers, theme, rebrand tokens)

- **theme-boot snippet**: the static inline `<head>` script that sets `data-bs-theme` on `<html>` before first paint (localStorage `hfuk-theme`; absent = auto = `prefers-color-scheme`); byte-identical copies live in `index.html` and `scripts/prerender.mjs` `buildPage()` (ADR-0024).
- **Auto/Light/Dark theme**: the 3-state header control (AppShell, all pages) persisting the choice as `light`/`dark` under `hfuk-theme` (absent = auto); auto re-resolves the OS preference live via a `matchMedia` listener. The mode is deliberately not held in React state (ADR-0024).
- **hfuk-theme**: the app's single localStorage key (`"light"` / `"dark"`; absent = auto) — the only persisted user preference on the site (ADR-0024).
- **first-load layer defaults**: both the charity-shop and GP-practice layers are off on a fresh load (`useState(false)`, in-memory only, not persisted) while catchment polygons remain visible (ADR-0025).
- **muted GP layer**: the visual subordination of GP practice markers — 20 px slate `--hf-gp-fill` bucket divIcons and smaller, more transparent CircleMarkers (radius 4/6, base `fillOpacity` 0.55) — with shops ranked before GPs in controls, search sections, and legend (ADR-0026).
- **design tokens**: the `--hf-*` CSS custom properties (`:root` = light set, `[data-bs-theme="dark"]` = dark set) that are the single source of truth for app colour; Bootstrap `--bs-*` variables are wired to them so any Designer concept lands as a token-value swap (ADR-0028).

## Cycle 5 terms (Wales rewire, OSCAR Scotland, identity stability)

- **H5-1 / H5-2**: the two Cycle 5 human-fetch gates, each with a single owner
  (James) and a one-shot chat report: H5-1 = the Hospice Health Wales members
  list (`data-raw/hospicehealth-wales-members-2026-11.csv`); H5-2 = the OSCAR
  extract reconciled with the PPPC seed directory
  (`data-raw/oscar-scotland-hospices-2026-11.csv`). They gate the final data
  build (BUILD gates, chain green before the raws land) and the publication
  (DATA gates): G3 zero-set tolerance keeps the chain green while the files
  are in transit (`.agents/feature.md` lines 104–112; ADR-0031).
- **HUMAN-FETCH**: a data source selected as authoritative that is
  unreachable from this restricted-DNS environment (`curl: (6)` ENOTFOUND,
  verified 2026-11-07); the operator fetches it on a full-DNS machine and the
  lead pins it in `data/README.md` with source, fetch date, and SHA-256 from
  `Get-FileHash` (ADR-0009).
- **source-of-record row**: a hospice entry flowing through
  `scripts/merge-hospices.mjs` with a stable id; the merge is the map's
  identity boundary — every published hospice has exactly one source-of-record
  row, and its id never changes between builds (curated England: `en-<cqcId>`
  from `scripts/catchment-map.mjs`; register rows: `sc-<CSNumber>`,
  `sc-oscar-<SC>`, `ni-r<n>`, `wales-r<n>` — ADR-0002, ADR-0031). The Cycle 5
  Scotland APPEND-mode extractor keeps the 3 in-repo `sc-<CSNumber>` rows
  byte-identical (ADR-0031).
- **G3 zero-set tolerance**: absent raw source file → the extractor writes a
  valid zero-set (`[]` for replace-mode; byte-identical re-write for
  append-mode) and exits 0, so the chain stays green while HUMAN-FETCH files
  are in transit; the first-run log states the human-fetch procedure
  (ADR-0003, ADR-0020). `Wales: 0` / `Scotland: 3` are placeholders, not
  errors.
- **OSCAR**: the **O**nline **S**cotland **C**harity **R**egister
  (`www.scotcharityregister.org.uk`) — Scotland's statutory charity register;
  the authoritative primary source for the Scottish hospice population from
  Cycle 5 (ADR-0031).

## Cycle 6 terms (finalised 2026-11-08)

- **admin ring**: the OSM admin-boundary polygon for a nation — here the
  Northern Ireland ring, OSM relation 156393 "Northern Ireland / Tuaisceart
  Éireann" (admin_level 4, 929 way members, single closed outer ring),
  committed as `data-raw/roi-border.json` (ODbL); NI catchments are clipped to
  it **after** the land clip, guarded by `id.startsWith('ni')` (ADR-0034).
- **spill**: the area of a catchment cell falling **outside** its admin ring
  (NI: the ROI/sea portion of the island that survives the land clip);
  validator invariant 5 bounds it at `< 1e-9 deg²` per NI cell, and the
  total `roiSpill` gates the validator exit (ADR-0034).
- **sliver**: a non-empty cell below `0.0002 deg²` (validator warning class;
  e.g. Wisdom's `0.000186` clip seam) — distinct from a *degenerate cell*
  (`polygons: []`).
- **JITTER nudge**: the deterministic offset applied to co-located seed points
  **before** the Voronoi pass so the Delaunay triangulation stays
  non-degenerate — label-ordered 8-direction spiral, `toFixed(6)`
  co-location buckets, base `1e-5` deg; Cycle 6 keeps the mechanism unchanged
  and reduces the base constant only, until invariant 6 is green (0 empty SC
  cells, every SC×SC pair `< 1e-6 deg²`) (ADR-0034).
