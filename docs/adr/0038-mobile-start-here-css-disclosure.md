# ADR-0038 — Mobile StartHere: CSS-gated disclosure, default open

**Status:** accepted (C7 re-issue, 2026-11-15; supersedes the round-3 default-closed geometry, lead decision option (b))

## Context

The round-3 mobile StartHere card (CSS-disclosure overlay, default-closed, `width:351px`
anchored top-left) was raised as two Blocking findings: **B2** — the open card's
geometry covers the "Open list" FAB and the top-right map zoom controls; **B3** —
default-closed contradicts the acceptance line "map + postcode search own the primary
viewport" — at 375 px the user must see postcode search at initial paint. Verbatim
acceptance block this decision must satisfy: "At 375 px: map + postcode search own
the primary viewport; header collapsed; 'Open list' pill does not overlap content.
Panels reachable without double-scrolling; no third scroll region. Desktop 1280 px
pixel-unchanged. npm test and npm run check:layout green; deterministic build."

## Decision

1. Mobile scope = `@media (max-width:768px)`; desktop ≥1280 px has identical card
   position/visibility (computed styles byte-identical, pixel-unchanged).
2. The Start-here card is an absolutely-positioned overlay (not a flex participant):
   `top:12px; left:12px; right:44px` (width auto → 319px at a 375px viewport, i.e.
   right edge 44px from the viewport edge, clearing the "Open list" FAB and the
   top-right map zoom controls); `max-height:min(75vh, calc(100% − 72px))` — the
   bottom 72px band is reserved for the FAB/selection row.
3. At initial paint the card is OPEN with content that fits without internal
   scrolling: postcode field + "Find your hospice" button + collapsed disclosure
   rows (the expanded rows are the disclosure). max-height is a safety cap, not the
   expected state (default content ≈ 280–320 px tall).
4. When the list sheet opens, the card is hidden via the `.app-sheet-open` ancestor
   class (existing round-3 mechanism) — sheet and card never coexist, so the
   scroll-region count is unchanged (map + at most one sheet/card region; the card
   is not a third scroll region because it does not internally scroll in the
   default-open state).

## Alternatives considered

- **(a) Default-closed card** — rejected, B3: acceptance requires postcode search to
  own the primary viewport at initial paint; also two taps to reach the primary
  feature.
- **(c) Full-width bottom sheet as the primary entry** — rejected: covers the map,
  adds a third scroll region, violates the mobile scroll-region budget and the
  hard-constraint surface.
- **(d) Default-open with the round-3 `width:351px` top-left geometry** — rejected,
  B2: covers the "Open list" FAB + zoom controls.

## Consequences

- Header line-3 layer controls are restructured by the parallel architecture.md
  rework (D1) to four lines within the 351 px line budget (375px − 2×12px gutters);
  "Source & Method" moves to the footer link row (ADR-0039) — the card carries no
  controls.
- Hard constraints unchanged: the complete set of flex-direction declarations in
  `src/styles.css` stays exactly the 3 pairs, no `:has()`, size/visibility/
  overflow/position only, `--hf-sheet-h` the only custom property.
- Verification = 375 px screenshot matrix + `npm run check:layout` (3-pair
  whitelist) + `npm test`.
