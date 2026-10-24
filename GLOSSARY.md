# Vocabulary — UK-wide Hospice Catchment Map

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
