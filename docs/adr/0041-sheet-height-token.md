# ADR-0041 — Sheet-height token: `--hf-sheet-h`

**Status:** proposed (Cycle 7, 2026-11-15)

## Context

The mobile bottom sheet and its FAB each encode the sheet height as the
duplicated literal `min(55vh,480px)` (sheet block, ~line 323 of
`src/styles.css`): sheet `height` and FAB `bottom:calc(min(55vh,480px) +
14px)`. Two copies of one value invite drift — an edit to one without the
other re-introduces exactly the FAB/sheet overlap the owner screenshot shows
(2026-11-14).

## Decision

Inside the 768 px media block:

1. `.app{--hf-sheet-h:min(55vh,480px)}` — single definition.
2. `.app-panel{height:var(--hf-sheet-h)}` — sheet consumes the token.
3. `.app-sheet-open .sheet-fab{bottom:calc(var(--hf-sheet-h) + 14px)}` — FAB
 consumes the same token.

One value, two consumers; the FAB and sheet cannot drift apart. The token is
defined **inside** the 768 px block, keeping the whole change surface
media-scoped per the hard constraint.

## Alternatives considered

- **Keep the duplicated literal** — zero-risk today, certain drift tomorrow;
 the overlap is precisely the reported defect.
- **JS-set CSS variable on resize** — the value is purely viewport-relative
 (`min(55vh,480px)`); CSS `min()` already tracks viewport changes with no
 script.

## Consequences

- Editing the mobile sheet height is a one-line change; the FAB follows
 automatically.
- `check:layout` unaffected: custom properties and `height`/`bottom` are
 outside the `flex-direction` whitelist.
- The 14 px FAB gap remains the only tuning knob and stays literal — it is
 distinct from the height and has no second consumer.
