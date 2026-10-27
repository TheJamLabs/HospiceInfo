# ADR 0010 — Map performance strategy: profile-first, bounded fixes, no new dependencies

**Status:** accepted (2026-10-25)

## Context

The map renders 10,475 practice markers plus 155 catchment polygons and 138 shop
markers from two large static payloads (`catchments.json` 6.79 MB,
`practices.json` 3.04 MB). `src/components/MapView.tsx` does a linear
`hospices.find(...)` for every marker in three passes (catchments, practices,
shops), i.e. O(10,475 × 155) ≈ 1.6 M comparisons per render pass, and attaches a
per-marker `Tooltip` to every practice. James bound the approach: profile-first
(no speculative optimisation), no new npm dependencies, and the marker set
stays at the full 10,475 by default.

## Decision

- **Instrument first.** Before any change, record a baseline under
  Slow 4G + 4× CPU in `.agents/qa.md §Baseline` with a fixed metric set:
  (1) navigation → first painted markers, (2) 5-char search re-filter latency,
  (3) marker count at zoom 6 vs zoom 12, (4) navigation → interactive. No fix is
  claimed effective without its delta against this baseline.
- **Bounded fix set, sequenced and re-measured per batch:**
  1. `hospiceId → Hospice` Map (single `useMemo`) replacing every `hospices.find`
  — mandatory, the largest structural win.
  2. Grid-bucket markers (zoom < 11; `floor(lon/grid) × floor(lat/grid)` via
  `useMemo`, divIcon aggregates, expand on click) — no `leaflet.markercluster`.
  3. Remove per-practice `Tooltip`; keep click-only tooltips.
  4. Debounce the panel search 150–250 ms.
  5. Write `public/data/*.json` 0-space (`JSON.stringify(x)`) — payload win,
  byte-identity ritual re-baselined.
  6. Share one `divIcon` per catchment colour.
- **Downsampling is evidence-gated and off by default.** It activates only if
  navigation → first painted markers is still > 800 ms after fixes 1–6; the
  metric that justified it and the chosen stride are recorded in
  `data/README.md §Current state`. The stride is one named constant; `k = 1`
  (all 10,475) is the default, thinning is a render-time filter only, and no
  data is dropped from `practices.json`.
- **Payload split (practice name vs coordinates) is deferred** and revisited only
  if navigation → first painted markers is still > 2 s on the full marker set
  after fixes 1–6.
- Web Worker / server-side pre-aggregation is an escalation path noted for QA
  only — out of scope this cycle.

## Alternatives considered

- **`leaflet.markercluster` plugin:** rejected — new dependency, external pane
  state, and heavier than the need; a grid-bucket `useMemo` covers low zoom.
- **Turn downsampling on by default:** rejected — drops 10,475 verifiable points
  without evidence; the QA protocol requires the first-paint metric to exceed
  800 ms first.
- **Split the two big JSONs now:** rejected — a guess without a measured benefit;
  P5 (0-space JSON) recovers the indent waste at zero cost first.
- **Vertex simplification of catchment rings:** rejected as a perf lever — it
  moves drawn boundaries (data quality), not the marker cost.

## Consequences

**Positive (accepted):** every perf claim is measurable; the mandatory fix is
isolated; no new dependencies; the marker set is reversible to full by one
constant; payload size drops with P5 and the cache key flips with it.
**Negative (accepted):** P2/P3/P6 each need re-measurement between batches
(profile-first is slower overall than one big bang); QA must maintain the
throttled-profile rig; the 800 ms / 2 s thresholds are chosen by the architect
and are decision points for a future cycle, not tunable at runtime.
