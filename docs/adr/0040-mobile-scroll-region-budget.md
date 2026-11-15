# ADR-0040 — Mobile scroll-region budget: map + at most one reachable surface

**Status:** proposed (Cycle 7, 2026-11-15)

## Context

At 375 px three surfaces are simultaneously scrollable — the page, the
StartHere card, and the bottom sheet (owner screenshots, 2026-11-14) — which
compounds the overlap and makes gestures ambiguous. Without a definition of
"scrollable region" the mobile layout can regress silently in future cycles.

## Decision

Definition and budget, enforced by construction:

1. A **scrollable region** is the map (always counts as 1) plus any
 reachable, non-covered DOM surface with `scrollHeight > clientHeight` and
 `overflow-y:auto|scroll`. A surface fully covered by a higher-z surface is
 not reachable and does not count.
2. **Budget:** map + at most one reachable scrollable surface, in every
 visible state. The page (`html`/`body`/`.app`) keeps no overflow at ≤768 px.
3. State matrix (state → reachable surfaces): closed → map (1); card open →
 map + card (2); sheet open (±selection) → map + sheet (2), card hidden by
 `.app-sheet-open .hf-start-here{display:none}`; card open + selection alert
 → map + card (2), alert capped (`max-height:min(45vh,260px)`).
4. Enforcement: the D2 display rules (sheet excludes card), existing React
 behaviour (`select()` closes the sheet), and z-order reachability — no
 `:has()`, plain descendant combinators only.
5. Verification: automated count + screenshot matrix (Cycle-7 architecture
 §8.4/§8.5); `document.documentElement.scrollHeight <= window.innerHeight` in
 all 5 states.

## Alternatives considered

- **No budget, fix the observed overlap only** — regressions would be
 untestable; the ambiguity that caused the complaint would return.
- **Hard block via a runtime guard** — extra script for a property the CSS
 already guarantees statically; the matrix is provable by inspection.

## Consequences

- The mobile experience is always map-first with at most one competing
 scroll surface; gestures are unambiguous.
- Future mobile UI additions must place their new surface in the matrix and
 stay within the ceiling (e.g., a new overlay must hide the card via a
 display rule, or the sheet must take precedence).
- The definition must be used as-is by QA (not re-derived): it is the
 acceptance criterion for the Cycle-7 scroll checks.
