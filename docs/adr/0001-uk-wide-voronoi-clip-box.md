# ADR 0001 — UK-wide Voronoi clip box: rectangle, no coastline clipping

**Status:** accepted (2026-10-16)

## Context

`scripts/build-data.mjs` tessellates catchments with a Delaunay/Voronoi
(`d3-delaunay`) whose cells are clipped to a hardcoded box. The current box is
Lancashire + South Cumbria: `[-3.8, 52.9, -1.9, 55.05]`. A UK-wide build needs
a box that covers England, Wales, Scotland and Northern Ireland. The open
question (raised in research risk 3): rectangular clip box, or clip to an OSM
land mask so cells hug the coastline?

## Decision

Use a simple rectangular clip box:

```
[ x0, y0, x1, y1 ] = [ -9.5, 49.5, 2.0, 61.5 ]   // lon/lat, UK with margin
```

No coastline clipping. `scripts/validate-tessellation.mjs` is updated to use
the same constants.

## Alternatives considered

- **OSM land-mask clip** (e.g. `polygon-clipping` `difference` against a
  coastline polygon fetched from OSM). More faithful to land: coastal cells do
  not extend into the sea. Cost: a new dependency on a coastline dataset
  (several MB, a new `data-raw/` file and a fetch script), a slow clip
  operation over ~300 cells, and the coastline edge becomes a hard tessellation
  boundary that can look artificial (a straight "border" where the sea meets
  the land — not a service area). Research has not assessed this cost; it is
  not needed for the acceptance criteria.

## Consequences

- **Positive:** zero new dependencies; the existing `d3-delaunay` call is
  unchanged in shape (only the box constant changes); reproducible from
  committed files with no network fetch at build time.
- **Positive:** edge cells (e.g. a hospice on the west coast) get a rectangular
  sea boundary, which is visually honest — it says "this is the extent of our
  data", not "this is the coastline".
- **Negative (accepted):** coastal cells include sea area. The catchment
  polygon is a *display* approximation (the Methodology modal already states
  this is not an official boundary), so sea areas in a cell do not mislead
  about service geography. The rectangular map edge at the box corners is
  visible but unremarkable at UK zoom.
- **Negative (accepted, minor):** a hospice whose only practices are near a box
  edge gets a flat boundary on that edge. The margin (≈ 0.5–1°) keeps every
  real UK point well inside the box, so no cell is clipped across land.
