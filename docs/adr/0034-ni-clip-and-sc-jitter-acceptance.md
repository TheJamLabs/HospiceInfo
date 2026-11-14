# ADR 0034 — NI catchments clipped to the admin ring; SC overlap gated by a reduced JITTER nudge

**Status:** accepted (2026-11-08)

## Context

Two reported geometry defects share one pattern: the published Voronoi
catchments are the land-clipped cells of ADR-0006, and in two places that
clip is not tight enough.

1. **NI cells leak outside Northern Ireland.** The land mask
   (`data-raw/uk-land.json`) is island-scoped by construction
   (`scripts/fetch-uk-land.mjs` L38–42, box minLon −11.0; island ring OSM
   62273), so the land clip removes nothing for NI — the ROI/sea halves of
   NI cells are also land and survive. Only an admin-boundary polygon draws
   the NI–ROI line.
2. **Scottish cells overlap.** Co-located twin seeds (e.g. St Michael's vs
   St Michaels, one geocoded point) degenerate the Delaunay triangulation:
   global pairwise overlap baseline 0.0269 deg², worst SC pair 0.0136 deg².

A third concern is governance: the working-tree validator already ships
invariants 5 (NI spill) and 6 (SC overlap) — an uncommitted `M` change; the
ledger's "exit 0" baseline predates them, so current data is correctly red
on both until this cycle lands. The threshold choices below are the
acceptance contract the whole fix is measured against.

## Decision

1. **Clip ring = OSM relation 156393** (admin_level 4
   "Northern Ireland / Tuaisceart Éireann", 929 way members, single closed
   outer ring, no holes), fetched as `data-raw/roi-border.json` (ODbL,
   schema frozen in `.agents/architecture.md` §Data artifacts) and committed
   as the fetch emits it. Applied **after** the land clip, guarded to
   `id.startsWith('ni')` — the consumer (`build-data.mjs` L118–130 load +
   fail-fast, L273–274 clip) and the guard (validator invariant 5,
   `total roiSpill < 1e-9 deg²`) are already wired; this ADR freezes the
   ring and the threshold.
2. **SC overlap lever = the `JITTER` constant** (`build-data.mjs` L206)
   reduced from 1e-5 deg to the smallest value that clears the gate, with
   the mechanism unchanged (8-direction spiral L207, toFixed(6)
   co-location buckets L229–236, deterministic by label order, applied
   L239–242). **Acceptance threshold (invariant 6): 0 empty SC cells and
   every SC×SC pair < 1e-6 deg²**, with the global advisory (invariant 3)
   not worsening beyond the 0.0269 deg² baseline. The chosen constant is
   recorded in `.agents/implementation.md` with its gate run.

## Alternatives considered

* **Clip NI to the island ring (62273) / a tighter land-box:** rejected —
  the mask covers the whole island; the box change would move the clip of
  every nation and delete (island) land, not ROI land.
* **Hand-drawn / simplified NI ring:** rejected — OSM admin geometry is
  authoritative, ODbL-attributable, and reproducible to fetch.
* **Per-group scaled offsets / golden-angle spiral for the nudge:**
  rejected for first move — the real worst case is a two-member twin, which
  a smaller single nudge resolves; a mechanism change would touch every
  nation's cells at once. Revisit only if a constant reduction cannot clear
  invariant 6 without creating new empty cells.
* **Deduplicating co-located seed sites:** rejected — it changes which
  practices assign to which site, i.e. a data-identity change, not a
  geometry fix.
* **Loosening invariant 6 to 1e-5 deg²:** rejected — the reported defect is
  visible cell overlap; 1e-6 deg² (≈ 0.006 km² at this latitude) is truly
  below rendering visibility.

## Consequences

* New committed ODbL data artifact `data-raw/roi-border.json` — `data/README.md`
  gains a provenance row (SHA-256 pinned) and the §Licences / site Licences
  page gain the OSM attribution line for it.
* NI cells change geometry (clipped to the ring); `en`/`sc`/`wales` cells
  are byte-identical (id-guarded); the byte-identical rebuild ritual must
  stay green.
* A smaller JITTER touches every nation's co-location groups
  (deterministic); the full validator (invariants 1–6) plus the
  baseline-diff in `.agents/qa.md` is the proof.
* Vocabulary finalised in GLOSSARY.md (admin ring, spill, sliver,
  JITTER nudge).

## Amendment (2026-11-10) — invariant 5 spill direction corrected

The shipped invariant-5 code measured spill as
`area(intersection(cell, ring))` — cell area *inside* the ring. Because the
build clips NI cells **into** the ring (relation 156393 is the *Northern
Ireland* polygon, the keep-inside region), a correctly-clipped cell lies
entirely inside it, so `intersection` returns the whole cell and the gate
was structurally red (measured spill 6.37 deg² = total NI cell area) and
could never pass. The gate's stated intent is the opposite — "catchments
must not extend past the NI–ROI border" — so the correct measure is the
cell area lying **outside** the ring: `area(difference(cell, ring))`, which
is ~0 for a clipped cell and grows only when a cell pokes past the border.
The formula was corrected accordingly (lead-approved 2026-11-10); the
threshold (`< 1e-9 deg²`), the ring (relation 156393), and the build clip
are unchanged. Note the file name `roi-border.json` is historical — it
holds the NI admin polygon, not the Republic-of-Ireland polygon; this is
now stated explicitly in `data/README.md`. After the fix, measured NI spill
is 0.000000 (green) against the real-ring build.

## Amendment 2 (2026-11-10) — invariant 2 target restricted to UK land

The NI clip exposed a structural flaw in the coverage gate: invariant 2
measured `area(union) / area(land ∩ box)` against the full OSM land mask,
which carries the Republic of Ireland (ROI∩box = 8.3707 deg² = 19.88% of
the 42.1090 deg² target). With NI cells correctly clipped into the ring
(ni ∩ ROI = 0.0000 — the clip is verified correct), ROI land is
permanently uncovered, so the gate capped at ~88.6% by construction. The
target is therefore restricted to **UK land ∩ box = (land ∩ box) −
(Ireland − NI ring) ∩ box** (33.7383 deg²), with the numerator clipped to
the same set; the Ireland mask polygon is identified by a Dublin interior
point as a build-change guard. Coverage of the current build is ~100%
against the amended target. **User decision 2026-11-10: Option A** — amend
the gate only, keep the ni-only build clip; the alternative of extending
the clip to strip ROI from every nation's cells (removing the residual
3.5658 deg² en / 0.3100 deg² wales spill that visually "covers the
Republic") and the alternative of accepting an 88.59% baseline were both
declined. That residual spill is carried as documented, risk-accepted
debt: catchments still cross the NI–ROI *sea* border in en/wales cells —
the ADR's "must not extend past the NI–ROI border" wording binds to NI
cells only.
