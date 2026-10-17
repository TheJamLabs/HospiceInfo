# Feature: UK-wide hospice catchment map

Extend the Lancashire & South Cumbria hospice catchment map to cover all hospices
in England, Wales, Scotland and Northern Ireland.

## Confirmed scope (grill session, 2026-10-16)

### Acceptance criteria

1. **Hospice coverage** — all hospices from the four national regulator
   registers: CQC (England), Care Inspectorate Wales, Care Inspectorate
   (Scotland), RQIA (Northern Ireland). Rule: registered name contains
   "hospice" (same as the current map; includes children's, day and
   hospice-at-home services).
2. **GP practices** — all registered GP practice locations UK-wide,
   geocoded via Nominatim (1 req/s, resumable) and used as tessellation
   vertices. Complete partition: every practice belongs to exactly one
   catchment.
3. **Catchments** — per-hospice Voronoi tessellation of practice +
   hospice-site points (union of cells → multi-ring polygon), same method
   as the current build.
4. **Flags** — the existing 20 Lancashire/South Cumbria catchments keep
   their curated published/approx flags as the only exceptions; all new
   hospices are practice-derived (approx).
5. **UI** — existing layout preserved; side panel becomes search-first
   (no 300-entry wall of lists); the 20-colour legend is demoted to
   on-demand; an England/Wales/Scotland/N. Ireland filter narrows the list
   and fits the map; colour rotation is local, not a stable 300-colour
   identity.
6. **Verification** — `npm run build` (tsc + vite) passes; data pipeline
   reproducible from committed raw files; dev-server smoke test passes.
7. **Existing work intact** — the 138-shop set, its header toggle and the
   `outsideCatchment` flags stay in the app; flags are recomputed against
   the new UK tessellation.

### Out of scope

- UK-wide charity-shop collection and new over-reach analysis (phase 2 —
  separate pipeline after this one lands).
- Manual curation of published service areas for the ~300 new hospices.
- New frameworks, backend, auth, telemetry.
- Changes to the pipeline contract (QWEN.md) or agent definitions.

### Key decisions (with rationale)

- **Regulator registers per nation** (user choice) — most authoritative,
  same method as the existing map; NI list will be the thinnest (RQIA has
  no bulk export).
- **All UK practices** (user choice) — preserves the "complete partition,
  areas tile the map" semantics; cost is a one-off background geocoding
  batch of a few hours (accepted by user).
- **Practice-derived catchments everywhere** (user choice) — one consistent
  honest rule; the 20 curated areas are the only exceptions.
- **Shops in phase 2** (user choice) — per-website scraping does not scale
  to ~300 hospices; a single national source will be researched in phase 2.
- **Search-first UI + nation filter** (user choice) — minimal change to the
  existing layout; a 300-entry legend/colour identity is unusable.
