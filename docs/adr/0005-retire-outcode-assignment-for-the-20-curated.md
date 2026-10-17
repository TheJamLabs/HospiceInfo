# ADR 0005 — Retire outcode-list assignment for the 20 curated catchments

**Status:** accepted (2026-10-16)

## Context

`build-data.mjs` currently assigns a practice to a hospice by matching the
practice's postcode **outcode** against the 20 curated `outcodes` lists in
`scripts/catchment-map.mjs`; ties and non-matches fall back to nearest
hospice. Those outcode lists are a *proxy* for each hospice's published
service area, hand-mapped from the service-area wording to the outcodes
present in the Lancs/South Cumbria practice file. UK-wide, keeping the 20
outcode lists as an assignment mechanism and using a *different* rule
(nearest-hospice) for the ~280 new hospices would mean **two assignment
rules in one tessellation** — the two rule sets' boundaries would not share
edges, breaking the "areas tile the map, every practice in exactly one
catchment" invariant that the Methodology modal promises.

## Decision

Retire the outcode-list assignment for all hospices, including the 20
curated. One rule everywhere: **practice → nearest hospice site by
haversine distance** (the existing `distKm` fallback, promoted to the sole
rule). The 20 `curated` entries keep their `kind` (`published`/`approx`) and
`source` (the verbatim service-area quote) as **provenance only**; their
`outcodes` lists are no longer read by `build-data.mjs`.

- `catchment-map.mjs` is **kept** (not deleted) as the read-only source of
  the 20 curated entries' `curated`/`kind`/`source`; `merge-hospices.mjs`
  copies them into `hospices-all.json` by CQC-ID match (ADR 0002) and
  `build-data.mjs` no longer imports it.
- The 20's drawn geometry is re-derived from the UK Voronoi (feature.md rule
  4) — their boundaries will change from the current outcode-derived ones.

## Alternatives considered

- **Keep outcode matching for the 20, nearest-hospice for the rest.** Two
  rules → shared-edge discipline breaks at the boundary between a curated
  catchment and a new one; the "no gaps, no overlaps" guarantee no longer
  holds across the London/Cheshire/North-Yorks edges. Rejected.
- **Re-derive the 20's outcode lists to match the UK practice set, then
  keep outcode matching for all.** Outcode matching is inherently a
  coarse, per-outcode assignment (an outcode is all-or-nothing per
  hospice); it cannot express the neighbourhood-based service area the
  Voronoi is meant to approximate, and it would require re-curation of the
  20 lists by hand — out of scope (feature.md: no re-curation of the ~280
  new, and re-curating the 20 is the same labour for a coarser result).
  Rejected.
- **Delete `catchment-map.mjs`.** Loses the provenance quotes and the
  20's curated `kind`/`source` values, which the Methodology modal and
  `data/README.md` reference. Rejected.

## Consequences

- **Positive:** one assignment rule → the complete-partition and shared-edge
  invariants hold UK-wide; the Methodology modal's "area tiling" statement
  stays true without a 20-entry exception.
- **Positive:** `build-data.mjs` reads a single `hospices-all.json` instead
  of the 20-entry `CATCHMENTS` — fewer inputs, no fork in the code path.
- **Negative (accepted):** the 20 curated boundaries change on screen.
  Documented in the Methodology modal ("the 20 original catchments keep
  their published/approx flag and service-area quote; their drawn boundary
  is now practice-derived like every other hospice"). The 138-shop
  `outsideCatchment` flags are recomputed against the new polygons (the
  count may shift; the mechanism is unchanged).
- **Negative (accepted):** a `published`-kind hospice's drawn boundary no
  longer matches its published service-area wording — the boundary is a
  *display* approximation of that wording, exactly as the current approx
  entries already are; the `source` quote remains the reference for what
  the hospice claims.
