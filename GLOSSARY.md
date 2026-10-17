# GLOSSARY

Domain vocabulary for this repository. Finalised by the Architect stage
(2026-10-16, UK-wide feature pipeline); the terms were proposed by Research
(`.agents/research.md`) and used in all stage artifacts, code names and
prose.

- **catchment** — the area associated with one hospice: the set of GP
  practice locations claimed by that hospice, drawn as a polygon.
- **tessellation** — the Voronoi tessellation of all practice + hospice-site
  points; a **catchment polygon** is the union of the cells belonging to one
  hospice (one or more rings).
- **complete partition** — the invariant that every practice location
  belongs to exactly one catchment (no gaps, no overlaps in the
  practice→catchment assignment).
- **tessellation clip box** — the rectangular extent passed to the Voronoi
  computation; UK-wide: `[-9.5, 49.5, 2.0, 61.5]` (lon west→east, lat south→
  north). Cells are clipped to this box, not to the coastline.
- **outcode** — the outward code of a UK postcode (the letters, e.g. `PR`).
  Historically used as the catchment-assignment unit for the original 20;
  retired as an assignment mechanism (ADR 0005) but still a useful grouping
  key in practice data.
- **published vs approx** — provenance of a catchment's *definition*:
  **published** = the hospice's own website states the service area (verbatim
  quote in the `source` field); **approx** = no published area, so the
  catchment is inferred. For the UK-wide build every non-curated catchment is
  `approx` ("practice-derived (Voronoi)").
- **curated** — the 20 original Lancashire & South Cumbria catchment
  definitions in `scripts/catchment-map.mjs`; the only entries with
  hand-collected `kind`/`source` provenance. Identified in the widened CQC
  extract by CQC location ID; everything else is `curated: false`.
- **outsideCatchment** — a shop flag: the even-odd point-in-polygon test
  result of the shop's point against its *own* hospice's catchment polygon.
  An indicator of possible fundraising over-reach, not a judgement.
- **geocoding unit** — the unit addressed to OSM Nominatim: the postcode
  (unit) first; the address as fallthrough. Results cached in
  `data-raw/postcode-geo.csv` (resumable).
- **practice location** — a single registered site of a GP practice from a
  national register row (one `Practice` entry), not the legal practice
  entity.
- **nation register** — per-nation regulator source: CQC (England), Care
  Inspectorate Scotland datastore (Scotland), Care Inspectorate Wales
  (Wales), RQIA (Northern Ireland).
- **hash colour** — the per-hospice display colour derived from a stable
  FNV-1a hash of the hospice id into an HSL hue (ADR 0004); shared by the
  marker, polygon and panel dot; not a stable 300-colour legend identity.
- **geocoding batch** — the resumable Nominatim run (1 req/s, append-only)
  over all distinct practice + hospice postcodes, cached in
  `data-raw/postcode-geo.csv`; already-present postcodes are skipped, so
  re-runs are idempotent.
- **first-run discovery** — ADR 0003: per new source, the extract script
  logs the raw file's header/fields on its first run and maps columns by
  name (never position); a missing required field fails the run with the
  header printed rather than guessing.
- **placeholder nation** — a nation with pending hospice data (Wales, until
  the CIW email reply is committed to `data-raw/`); the build is valid with
  0 hospices for that nation and flags it in the Methodology modal.
- **search-first panel** — side-panel layout with the search box and nation
  filter on top and the result list below (feature.md rule 5: no 300-entry
  wall of lists).
- **nation filter** — the `All | England | Wales | Scotland | N. Ireland`
  pill row: narrows the panel list, fits the map bounds to the nation, and
  dims all other-nation markers/polygons.
- **demoted legend** — the 20-colour legend moved from the map card into the
  Source & Method modal, listing only the original 20 catchments.
