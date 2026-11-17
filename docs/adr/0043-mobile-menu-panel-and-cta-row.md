# ADR-0043 — Mobile menu panel + CTA row (supersedes ADR-0039 for the header)

**Status:** accepted (2026-11-16)

## Context

Cycle 7 settled the mobile header to four lines (ADR-0039): title, theme
control, two layer toggles, third toggle + "Start here" — and ADR-0039
recorded the rejection of a hamburger for the **six site nav links**
(the footer already carries them). The owner's 2026-11-16 screenshot of
the 375 px header (Cycle 9, item 1) shows the four lines dominate the
small screen: the theme control, three switches, and two utility buttons
consume the whole top band, and "Start here"/"Open list" read as
unequal, cramped controls (item 3). The scope now is the **header
controls**, not the nav links: the six links remain footer-carried.

## Decision

- **M1/M2 — one-line header + offcanvas menu panel.** The ≤768 px header
  becomes a single line: logo + title + **hamburger button**. A Bootstrap
  `offcanvas offcanvas-end` panel (`#mobileMenu`, z-index 2100) carries,
  in order: the theme segmented control (same `mode`/`pickMode` from
  ADR-0024), the three layer toggles (slot `mobilePanel` from App.tsx,
  present on the map route only — absent on content routes), and
  **Source & Method** (same `data-bs-target` trigger as the footer).
  Bootstrap JS owns the `show` class, focus trap, Esc and backdrop
  (`data-bs-toggle="offcanvas"` on the burger); React only syncs the
  burger's `aria-expanded` via `shown.bs.offcanvas`/`hidden.bs.offcanvas`.
  Initial state is statically closed (no React state for the panel), so
  server/JSDOM/client first paints are identical.
- **M3 — CTA row + FAB restyle.** "Start here" becomes a full-width
  solid-primary CTA row (`≥48 px`) rendered directly under the header
  (mobile only), bound to the existing `startHereMobileOpen` state
  (ADR-0038, unchanged: deterministically `true`, class on `.app`).
  The "Open list" FAB keeps its exactly-measured position, offset
  (`--hf-sheet-h` math, ADR-0041), z-order 2000, labels and wiring;
  cosmetic only — a text icon added before the label and a stronger
  shadow.

## Alternatives considered

- **Keep the 4-line header, compress fonts** — violates the ≥44 px
  touch-target practice already in use; owner rejected the screenshot
  state.
- **Hamburger carrying the six nav links** — what ADR-0039 rejected;
  the footer remains the mobile nav (no change).
- **React state for the panel** — reintroduces the open-class
  server-render trap ADR-0038/ADR-0040 worked around; bootstrap
  offcanvas gives the same `show`-class mechanism deterministically.
- **Native `<details>`/`<summary>` disclosure** — no focus trap, no
  Esc-to-close, no backdrop, no `aria-expanded` on a trigger (it exists
  only on the summary itself), and its open state is not initial-state
  deterministic the way a static closed `show`-class-less offcanvas is.
- **Custom slide-in panel** — duplicates Bootstrap's focus trap / Esc /
  backdrop for a component the bundle already ships.
- **New `--hf-*` tokens for the panel** — `--bs-offcanvas-bg` already
  derives from `--bs-body-bg` = `var(--hf-surface)`; no new values.

## Consequences

- ADR-0039 is **superseded for the header** (4-line → 1-line) and **kept
  for the nav** (`.site-nav-link{display:none}` mobile; footer carries
  the six links).
- One new ladder value: menu panel 2100 (above FAB 2000; bootstrap
  backdrop ~1040 stays below our scrim 1500).
- The old `hf-start-here-toggle` button and its two CSS rules are removed;
  C7 test assertions on the 4-line header / toggle are updated by the
  Coder (recorded in `.agents/implementation.md`).
- Desktop ≥769 px header and the 1280 px map must stay pixel-identical;
  the map tiles 1280/768/375 pixel-identical (gates: check:layout,
  double byte-identical prerender, layout checks).
