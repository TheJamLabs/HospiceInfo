# ADR-0039 — Mobile nav carried by the footer

**Status:** proposed (Cycle 7, 2026-11-15)

## Context

The header renders the six `.site-nav-link` links (Feedback, Corrections,
About, Privacy, Licences, Accessibility) twice-in-advance: once in the header
and once in the footer, which repeats the identical set. At 375 px the header
links ragged-wrap onto two lines (owner screenshot, 2026-11-14), inflating a
header that Cycle 7 must compress to four lines (351 px line budget). A hamburger or other new
nav surface would add DOM, state, and a11y surface for functionality that
already exists.

## Decision

Under the existing `@media (max-width:768px)` block:
`.site-nav-link{display:none}`. The footer — already the identical 6-link set
inside a 100 %-height flex column, visible on mobile without page scroll — is
the mobile navigation. No React change, no new surface.

## Alternatives considered

- **Reflow the 6 links to fit** — at 375 px they cannot fit on the control
 row without shrinking below the 44 px touch-target rule already in use.
- **Hamburger menu** — extra component, state, focus management, and a11y
 surface for links the footer already provides.
- **Keep the second header line for links** — defeats the 3-line goal.

## Consequences

- Header settles to 4 lines, each ≤351 px wide; the map gains ≈20 px (honest
 D1 gain; map resize handled per D4 of the Cycle-7 architecture).
- Function loss: zero — every link remains reachable, visible, and
 keyboard-reachable via the footer.
- If a future cycle adds header-only links, they must not use
 `.site-nav-link` (or must be explicitly opted back in for mobile), or the
 footer set must be extended.
