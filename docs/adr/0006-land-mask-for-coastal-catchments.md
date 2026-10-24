# ADR 0006 — Land mask for coastal catchments (reverses ADR 0001)

**Status:** accepted (2026-10-21)

## Context

ADR 0001 (2026-10-16) decided catchments would be clipped to a rectangular
box `BOX = [-9.5, 49.5, 2.0, 61.5]` and explicitly recommended *against*
clipping to coastline. That design matched the "Lancashire & South Cumbria"
era scope. For the UK-wide public release, that design is incorrect:

- 25 coastal hospices have Voronoi cells that cross the sea boundary. A map
  showing sea areas as hospice catchments is gauche for a public-facing "service
  areas" visualisation.
- The method glues to the coastline: `intersection(cell, uk-land)`. This
  contracts coastal cells to zero-area or empty results where no land exists
  within the clip box (e.g. open sea and inter-island water gaps).
- `scripts/validate-tessellation.mjs` checks (100% box coverage, all vertices
  in box) no longer apply once sea is removed.

The feature.md requirement is crisp: **"Coastline clip to OSM land polygon, no
sea; byte-identical rebuild including the land file"** — a new build data input,
a new validator invariant, and ODbL attribution for the land source.

## Decision

**Clip catchments to the UK land mask** (derived from OSM `natural=coastline`
via Overpass) instead of the rectangular box. The land mask is a committed file
`data-raw/uk-land.json` (format: `[lon,lat][]` rings, outer clockwise); the
build script computes `intersection(voronoiCell, ukLand)` after the per-label
`union(rings...)` step. If the land file is absent (e.g. during first fetch),
the build fails fast with a clear error; it does not silently revert to box-only.

### Land source and licence

OSM `natural=coastline` layer from the primary Overpass mirror, exported as a
geometry suitable for `polygon-clipping`. Attribution follows ODbL; documented in
`data/README.md` (SEC-4), the Licences & Attribution page, and the footer.

### Island coverage note

The committed land file `data-raw/uk-land.json` represents what the
`scripts/fetch-uk-land.mjs` script returns for the bbox. This file covers
**Great Britain, Northern Ireland, the Channel Islands, and the Isle of Man**
only if present in the OSM extract (the Overpass `natural=coastline` extract).
The file is **not** hardcoded to a specific island list — it is whatever the
Overpass query returns for the given bounding box.

In `build-data.mjs`, **at the Voronoi cell extraction point** (around
L160-233), each cell is intersected with the land polygon per-label:
build each label's Voronoi cell → union that label's cells per hospice →
intersection(unionCell, ukLand) via `polygon-clipping`. The existing
box-clip remains as a bounds safety net.

### Validator changes

The tessellation validator is updated to verify "cells tile the land" instead of
"cells tile the box":

1. Every cell is wholly within the land mask (point-in-rings against the land
   boundary).
2. The union of all clipped cells covers approximately the land ∩ box area
   (new invariant; old 100% box-coverage line is removed or deprecated).
3. Empty cells (`polygons: []`) are reported but not fatal (e.g. Wisdom,
   post-coastal islands); **slivers pass with a warning, not an
   error**.
   
   **SLIVERS AND EMPTY CELLS COVERAGE:** The validator already handles these
   as non-fatal. Empty polygons are skipped with
   `if (!pi?.length) continue;` in
   `scripts/validate-tessellation.mjs` — this is valid behavior. Slivers (
   < 0.0002 deg²) pass with a warning, not an error. The coverage check uses
   the same `uk-land.json` file as the build script for self-consistency.

Old checks that are no longer valid after sea removal:
- "every vertex is in box ± 0.01" → replaced by "every vertex is in land".
- "100% box coverage" → replaced by "coverage ≈ land ∩ box, within
  tolerance".

### Build-time behaviour

A dedicated script `scripts/fetch-uk-land.mjs` (not part of the automated
pipeline) downloads the OSM coastline via Overpass, prepares the land mask, and
writes `data-raw/uk-land.json`. This is a human step: the script provides a
provenance-friendly template and includes ODbL attribution text. Once the file
is committed, subsequent `npm run build-data` runs are reproducible
(byte-identical on repeated runs with the same land input).

### Build-time simplification (2026-10-23 addendum)

The fetched mask (22,999 polygons, ~2.6M segments ⇒ 5.3M unique ring
endpoints) exceeds `polygon-clipping`'s internal priority-queue cap
(1,000,000 endpoints), so `intersection(cell, ukLand)` aborts with
"Infinite loop when putting segment endpoints in a priority queue
(queue size too big)".

The mask is therefore consumed **in memory** through a deterministic
Douglas–Peucker pass (`scripts/land-mask.mjs`, shared by
`build-data.mjs` and `validate-tessellation.mjs`):

- fixed tolerance `LAND_TOL = 0.001`° (≈ 110 m) — an order of magnitude
  smaller than the cell geometry consumers resolve on screen;
- each ring is pivoted at its lexicographically maximal vertex then
  simplified with an iterative (stack-based) RDP; rings collapsing to
  fewer than 3 points are dropped (17,684 micro-fragments);
- per-cell bounding-box prefilter: land polygons whose bbox does not
  overlap the cell's bbox are excluded from the clip operand. This is
  exact — disjoint land contributes nothing to intersection or
  difference — so no padding is needed.

Result: 22,999 → 5,315 polygons, ~2.6M → 87,696 segments, build clip
≈ 0.8 s, two `npm run build-data` runs byte-identical.

The raw file is **never rewritten** — the simplification is a pure
function of its contents, so the committed `data-raw/uk-land.json`
SHA-256 stays the provenance anchor and determinism holds.

Alternatives rejected: raising
`POLYGON_CLIPPING_MAX_QUEUE_SIZE` (155 heavy full-mask sweeps per build,
prohibitively slower) and committing a pre-simplified second file
(duplicates provenance; the in-memory path is simpler and
re-derivable).

### Validator re-expression self-consistency

The coverage invariant (`land ∩ bbox`) in
`scripts/validate-tessellation.mjs`'s re-expression **MUST use the same
`uk-land.json` file that the build script uses**. Both scripts source the same
land mask to ensure the validator checks against exactly the geometry the build
produced. Any mismatch between the land file used at build time versus
validation time would invalidate the coverage calculation.

## Alternatives considered

1. **Box-only clip (ADR 0001, retired)**:
   - Pro: simplest, no external geometry.
   - Con: visually wrong at coast; goes against the feature's explicit
     requirement that the map should show no sea.

2. **Natural Earth coastline**:
   - Pro: pre-generalised, small file.
   - Con: Creative Commons licence incompatible with ODbL ecosystem;
     historically the selection was rejected for that reason. Also over-smoothed
     for pop-level map work.

3. **Fetch multiple OSM extracts and keep re-fetching**:
   - Pro: never stale.
   - Con: violates "committed-for-reproducibility"; every shape change is a
     rebuild event requiring rebuild validation and provenance note; the ODbL
     attribution is still required.

4. **No clip, accept sea cells as-as**:
   - Pro: zero geometry change.
   - Con: fails the public-facing requirement; the "no sea" rule is non-negotiable.

## Consequences

### Positive

- **Accurate map**: coastal hospices no longer bleed into the sea; the map
  matches the intended "service areas" visualisation.
- **Licensing compliance**: ODbL attribution is a single, documented entry;
  ecosystem consistent with CQC-derived data.
- **Reproducible pipeline**: once `uk-land.json` is committed, the build becomes
  byte-identical again across rebuilds (matching the existing model).

### Negative (accepted)

- **One more build input**: the human must download the land, commit it, and run
  the build twice to validate. One more file in `data-raw/`.
- **Validator rework**: three checks change; old box-coverage line is retired.
- **Geometry complexity**: per-catchment and the land mask are both multi-ring;
  polygon-clipping intersections are heavier than a trivial box. Still acceptable
  for 155 × 1 = 155 intersections at source-compile time.
