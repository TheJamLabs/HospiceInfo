# Research — Cycle 6 (2026-11-09, dispatched 2026-11-08)

Full overwrite per the C6 dispatch (prior-cycle records preserved in git
history and in the stage artifacts cited in §7). Objective (per
`.agents/pipeline.md` §"CYCLE 6 — LEAD LEDGER", L1660-1745): four reported
issues — C6-1 NI cells exceed the NI border; C6-2 Scottish cell borders don't
butt up; C6-3 find-by-postcode broken; C6-4 children's hospices hidden by
default, adults hidden when shown.

**VERIFIED** = read/executed this pass with citation · **ESTABLISHED** =
probed this cycle (OSM API), findings documented below, not re-derived ·
**RECOMMENDED** = proposal for the Architect. No code changed by this stage;
this file is the only artifact.

## 1. C6-1 — NI cells must not extend outside the NI admin border

- **Design finding (ESTABLISHED): the land mask covers the WHOLE island of
  Ireland.** `scripts/fetch-uk-land.mjs` L38-42: `BOX = { minLat: 49.5,
  minLon: -11.0, maxLat: 61.5, maxLon: 2.0 }` — widened west to -11.0° so
  "the full Irish coast closes" (header note L18-24); the island ring is OSM
  relation 62273. Clipping NI cells to that island ring removes nothing —
  the ROI half of each NI cell is land. **The clip ring MUST be the NI admin
  polygon: OSM relation 156393 "Northern Ireland / Tuaisceart Éireann"
  (admin_level 4, 929 way members, all role=outer, no holes).** ODbL
  attribution applies (precedent: GLOSSARY "ODbL attribution" entry;
  `data/README.md` §Licences).
- **Consumer is already wired in code (VERIFIED):** `data-raw/roi-border.json`
  schema `{ relationId, relationName, ring: [[lon,lat],...] closed (first
  point repeated), fetchDate }` is loaded at `scripts/build-data.mjs` L118-130
  (missing/degenerate → exit 1, logs relation id/name/point count/fetch date);
  applied at L273-274 (`if (id.startsWith('ni') && clipped.length)
  clipped = intersection(clipped, roiRingPoly)`) **after** the land clip
  (L266-270). So the remaining work is the data artifact (fetch + committed
  ring + `data/README.md` provenance row), not consumer plumbing.
- **Acceptance wired (VERIFIED):** invariant 5 in `scripts/validate-tessellation.mjs`
  (header L10-12; check block L109-141): each NI cell's area inside the ROI
  ring < 1e-9 deg², fail-fast on the missing/degenerate ring file. En/SC/Wales
  cells get no NI clip (L273 guards on `id.startsWith('ni')`), so a
  byte-identical non-NI rebuild is the expected side-effect check.
- Baseline (pipeline.md ledger): 195 cells, 3 empty (incl. `ni-r5` — no land
  in box), outward sea/land seam 0.000682 deg².

## 2. C6-2 — Scottish cells don't butt up (pairwise overlap)

- **Mechanism (VERIFIED):** co-located twin points degenerate the Delaunay
  tessellation; `scripts/build-data.mjs` L202-206 documents this and applies a
  deterministic sub-meter nudge: `JITTER = 1e-5` (L206), 8-direction spiral
  `JDIRS` (L207), co-location bucketed by `toFixed(6)` lon/lat (L229-236),
  jitter applied (L239-242). The nudge is the C6-2 knob: at 1e-5 deg the
  jittered margins of over-nudged twin cells overlap neighbours; a smaller
  JITTER (or scaled per-group offsets) is the natural RECOMMENDED lever for
  the Architect — the acceptance gates are already in place.
- **Acceptance wired (VERIFIED):** invariant 6 in `scripts/validate-tessellation.mjs`
  (header L13-15; check block L142-149): 0 empty SC cells and SC×SC pairwise
  overlap < 1e-6 deg² per pair; exit 1 otherwise.
- Baseline (pipeline.md ledger): `validate-tessellation` exit 0 overall, but
  global pairwise overlap 0.0269 deg² (up from 0.0060 after the Wales
  landing), worst pair St Michael's vs St Michaels 0.0136 deg² — this is the
  C6-2 starting point.

## 3. C6-3 — find-by-postcode broken

- **State (VERIFIED this pass):** `src/lib/postcodes.ts` is a new untracked
  file (`git status`): `normalisePostcode` (upcase, `[\s-]+`→` `, trim,
  drop trailing ` -UK` suffix, 2/4-char shape guard) + `matchPostcode`
  (exact string after normalise) + `postcodeLookup` (exact scan, then
  outcode+sector by latitude). `tests/postcodes.test.mjs` (new untracked dir):
  3/3 pass this pass (table: `BT13 1AD`/`BT13–1AD`/`bt13 1ad UK`
  match; `BT13`/`X999 9ZZ` don't).
- **Root-cause finding:** the reported breakage was the UI-side lookup
  semantics — raw exact string match against 11,002 practice postcodes
  (pipeline.md C6-3) fails on any input that isn't byte-exact (lowercase,
  no/extra spaces, hyphens, ` UK` suffix). These helpers isolate that
  semantics and are ready to wire into `src/components/StartHere.tsx`.
  **Open recommendation for Coding:** apply `normalisePostcode` to both the
  user input and the practice side at call boundary; consider broadening
  `matchPostcode` to sector/outcode level as a fallback when exact+unit fail
  (Architect decision). Acceptance vector: James's own failed postcode
  (pipeline.md Human gate 3).

## 4. C6-4 — children's hospices hidden by default; adults hidden when shown

- **Data side (ESTABLISHED):** no children's designation column exists; 21
  rows match `/children/i` (pipeline.md C6 ledger). Edge cases resolved at
  the gates: St Andrew's (Grimsby) = both modes, catchment in both; CHAS
  umbrella `sc-oscar-019724` removed entirely; `ni-r3` blank town needs a
  display value from James (Human gate 2).
- **Wiring state (VERIFIED this pass):** `tessellate()` in `scripts/build-data.mjs`
  L210-214 runs **independently per kind** (C6-4, "completely separate" —
  ADR-0035 site): each pass seeds only its own sites + practices assigned to
  those sites, so adult/children catchment sets share no Voronoi vertices.
  `src/App.tsx` has the children's-mode wiring complete (flag + `visibleIds`
  filtering + `activeHospices`/`visibleCatches`/`visibleGPs`/`visibleShops`
  recompute). Remaining thin spots for the Coding stage: the route-level
  `HospiceDetail` view does not yet apply the mode filter (a children-excluded
  detail page can still render adults; conversely for children rows), and
  `StartHere.tsx`'s `goHospice`/`goPractice` navigations don't carry the mode.
  Both are small, mechanical applications of the existing mode state.

## 5. OSM API probe facts (C6-1 ring fetch — ESTABLISHED this cycle)

- `GET /api/0.6/relation/156393` → 200 (member list usable).
- **All `.full` endpoints (relation AND way) → HTTP 406** for this client —
  size-independent (a small way 406s too).
- Plain way `GET /api/0.6/way/{id}` → 200.
- Batched `GET /api/0.6/ways/{ids}` → 404 if **any** id is red-lined
  (bisect to isolate it); 414 once the URL exceeds ~530 chars → keep batches
  ~20 ids.
- Coordinate assembly for the ring therefore requires the way-geometry pass
  over the 929 members, with the batching/red-line caveats above.

## 6. Candidate GLOSSARY terms (Architect finalises)

- **admin ring** (*italics*): the OSM admin-boundary polygon for a nation (here
  the NI ring, relation 156393), closed, committed as `data-raw/roi-border.json`;
  clip a catchment to it after the land clip (ADR-0034).
- **spill** (*italics*): area of a catchment cell falling inside the forbidden
  ring (NI: inside the ROI portion of the island ring); invariant 5 bounds it
  at < 1e-9 deg² per cell.
- **sliver** (*italics*): a non-empty cell below 0.0002 deg² (validator
  warning class; e.g. Wisdom's 0.000186 clip seam) — distinct from
  *degenerate cell* (`polygons: []`).
- **JITTER nudge** (*italics*): the deterministic sub-meter (1e-5 deg, spiral
  by label order) offset applied to co-located seed points before the
  Voronoi pass to keep the Delaunay triangulation non-degenerate (ADR-0034).
- (`tessellation` already present — "Voronoi tessellation" entry.)

## 7. Pointers to prior-cycle artifacts (cite, not read)

- Cycles 3–5 summaries: `.agents/` (research/pipeline/qa per cycle, in git
  history) and `docs/` (build-log rows, MAINTENANCE). Workspace untracked
  extras (`x.name+`, `x.postcode`) are pre-dispatch working files — not
  inputs to this cycle.
- Land mask: ADR-0006 (`docs/adr/0006-land-mask-for-coastal-catchments.md`);
  box: ADR-0001. Latest committed ADR: **ADR-0033** (33 in `docs/adr/`);
  **ADR-0034** (NI clip + SC jitter acceptance) and **ADR-0035** (per-kind
  tessellation / children's mode) are expected this cycle — written by
  later stages, not this one.
- Data state: `data/README.md` (hospices-all 209 rows; practices
  en=9260 sc=911 ni=304 wales=539); provenance rows for `roi-border.json`
  to be added by the Coding/Docs stages.
