# ADR 0035 — per-kind tessellation: adult and children's catchments are separate

**Status:** accepted (2026-11-08)

## Context

Cycle-6 owner requirement (C6-4): **children's hospices are hidden by
default; when children's mode is shown, adult hospices are hidden;
catchments are completely separate per kind.** The dataset designates
children's hospices with the `children` flag on `data-raw/hospices-all.json`
rows (21 rows match `/children/i`). On disk today the tessellation **already
runs as two independent passes** — `tessellate(adultSites)` and
`tessellate(childrenSites)` (`scripts/build-data.mjs` definition L210–214,
per-kind calls L283–285) — so the two catchment sets share no Voronoi
vertices. `src/App.tsx` carries the `childrenMode` state (L50) and its
`kindHospices`/`kindSet`/`activeCatches`/`kindPractices`/`kindShops`
recomputes (L62–77) plus the `#childrenToggle` checkbox (L147–156), but two
views bypass the filter: the route-level `HospiceDetail` page, and
`StartHere.tsx`'s `onOpenHospice`/`onOpenShopSearch`/`onSearchList`
navigations.

## Decision

1. **Build-time (already implemented — frozen): `tessellate()` runs
   independently per kind** (`scripts/build-data.mjs` L210–214, calls
   L283–285). Each pass seeds **only its own sites plus the geocoded
   practices assigned to those sites**, so the two catchment sets share no
   Voronoi vertices and never intermesh; every cell in
   `public/data/catchments.json` carries the `children` flag. This is the
   load-bearing property — "completely separate" is a **data** invariant,
   enforced by construction (two passes that do not co-seed cannot share
   geometry) and witnessed by the per-pass vertex counts in the build log.
2. **View: a single kind mode with adults the default.**
   `childrenMode = useState(false)`; showing children's mode **replaces**
   (not overlays) the adult views — the two kinds are disjoint by
   construction, so "hide adults when shown" is the same filter from the
   other side. Coding closes the two bypasses: the route-level
   `HospiceDetail` applies the `kindSet` filter (an out-of-kind deep link
   shows the neutral not-found wording — hide-not-delete, ADR-0012), and
   `StartHere` threads `childrenMode` through `onOpenHospice` /
   `onOpenShopSearch` / `onSearchList`.
3. **Data edge cases (resolved at the human gates, verified by Coding):**
   St Andrew's (Grimsby) ships in **both** modes (children + adult rows,
   catchment in both); `sc-oscar-019724` (CHAS umbrella) is **removed
   entirely** from `data-raw/hospices-all.json`; ni-r3's blank town takes the
   gate-1 display value — no blank `town` reaches the shipped
   `public/data/hospices.json`.

## Alternatives considered

* **Overlay both kinds in one tessellation** (shared seeds, colour-split by
  kind): rejected — fails "completely separate per kind"; shared vertices are
  exactly what the requirement forbids.
* **New designation column in the raw register:** not needed — the
  `children` flag is already carried by `hospices-all.json` rows (the 21
  `/children/i` match), so the data contract is unchanged; no re-extract, no
  id re-allocation.
* **A children's *section* alongside adults (tabs for both, one map):**
  rejected — the owner's wording is "hide adult hospices when children's
  mode shown", which is replacement, not juxtaposition; a dual map would
  double the sliver/empty-cell surface the validator must keep green.
* **Manual children hop lists in `StartHere`:** rejected — the hop threading
  is a mechanical pass-through of the existing mode state; a manual list is
  a data fork that drifts from `hospices-all.json`.

## Consequences

* `public/data/catchments.json` cells partition strictly by the `children`
  flag: every `true` cell is disjoint from every `false` cell (no shared
  vertices, no cross-kind contribution to the pairwise overlap of
  invariants 3/4 — they are separate passes).
* The default view is adult; toggling children's mode swaps the whole
  rendering surface (map, list, detail, shop search) to the children's set —
  no half-state where an adult cell is drawn under a children's toggle.
* `HospiceDetail` deep links are mode-checked: an out-of-kind URL resolves to
  the neutral not-found wording, so a stale children's URL in an adult-mode
  session cannot render an adult row (and vice versa).
* The two thin-spot fixes are additive and mechanical (one filter
  application in the detail view, one flag threaded through the `StartHere`
  call sites) — no new state, no new data files, no change to
  `tessellate()` semantics beyond the per-kind invocation that already
  exists on disk.
