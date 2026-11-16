# Feature: Cycle 9 — mobile header consolidation, CTA styling, About overlap

One line: give the ≤768 px header a one-line hamburger form (theme,
layer toggles and Source & Method move into a panel), restyle the two
mobile CTAs ("Start here" row + "Open list" FAB), and fix the desktop
content-page footer overlap.

## Acceptance criteria

1. **M1/M2 — one-line mobile header + hamburger panel**
   - ≤768 px: header renders exactly one line: logo (28 px) +
     "Hospice Finder UK" + ☰ button. No subtitle, no theme row, no
     toggle rows, no Start-here button in the header row (ADR-0039's
     four-line layout is replaced).
   - ☰ opens a dropdown panel containing, in order: the
     Auto/Light/Dark theme segmented control (same `pickMode` wiring,
     `aria-pressed` on the active mode), the three layer switches
     (Charity shops / GP practices / Children's — same checkbox
     state wiring as today), and the Source & Method button
     (same `#methodologyModal` target as the header/footer variants).
   - Panel is keyboard-accessible (focus, Escape/aria-expanded on the
     trigger, aria-controls), deterministic across SSR/JSDOM/client
     first render (closed by default everywhere — no hydration
     mismatch), and closes on selection where sensible.
   - ≥769 px header (1280 px reference) is pixel-unchanged: theme
     group, layer toggles, Source & Method, and nav links stay inline
     exactly as today.
   - The desktop-visibility swap of "Source & Method" (header on
     desktop / footer link row on mobile, ADR-0039) keeps working:
     after the change, mobile reaches it via the panel; the
     footer-row entry point is evaluated by Research (may be removed
     as redundant — 1280 px unaffected either way).

2. **M3 — CTA restyle**
   - "Start here": a dedicated slim CTA row directly under the header
     row, mobile-only, full-width solid-primary button, touch target
     ≥48 px, always visible (not inside the hamburger panel). Toggles
     the existing `startHereMobileOpen` disclosure; the Start-here
     card, its × dismiss, the sheet-wins rule
     (`.app-sheet-open .hf-start-here { display:none }`), and the
     selection-closes-card rule are unchanged.
   - "Open list": the existing bottom FAB restyled — icon + text pill,
     stronger shadow, target ≥48 px. Position (bottom 14 px, centred),
     open offset (`calc(var(--hf-sheet-h) + 14px)`), z-order (2000),
     scrim, `aria-expanded`/`aria-controls`, and
     selection-closes-sheet behaviour are all unchanged.
   - Desktop: neither control appears (AS today).

3. **D1 — content-page footer overlap**
   - `#about` (and by the same rule corrections/feedback/privacy/
     licences/accessibility) shows no footer overlap at desktop width
     (≥1024 px, 1280 reference) or mobile; content may scroll
     normally; footer sits below content.
   - Map page (`#map`) layout is pixel-identical to today at
     1280/768/375 — the map keeps its full-viewport fill
     (`.app { height:100% }` behaviour for the map route).
   - Root cause per owner report: `.app { height: 100% }` clamps
     content pages and lets tall content paint over the footer —
     Research confirms before Architect designs.

## Out of scope

- No desktop (≥769 px) header change beyond what item 1 already
  forbids; no visual change to any ≥769 px page except the About
  overlap fix (D1).
- No changes to the map layout, bottom sheet behaviour, legend,
  selection card, Leaflet treatment, font/colour token system, theme
  boot snippet, or `lib/theme.ts` semantics.
- No new nav destinations, pages, routes, or data endpoints.
- No Start-here card content/geometry change; no tier-2 geocode
  change; no data pipeline change.
- No new runtime dependencies (Bootstrap 5.3's own dropdown is
  available — Research confirms the JS include).
- Sitemap stays 215 `<loc>`.

## Constraints (carried from prior cycles)

- Hydration determinism: any new React state must have one value in
  every environment on first render (JSDOM prerender, server, client)
  — pattern: `startHereMobileOpen` (R4/R6).
- Byte-identical double prerender (`prerender:2win`) must stay green —
  no Date/network/flag in render paths.
- `npm test`, `npx tsc -b`, `check:layout` green.
- BEACON tokens only for new/changed colours (no raw literals outside
  the two `:root` blocks); ≤44 px control height rule; ≥44 px touch
  targets on phones.
- Commit scope for the cycle is explicit (no `git add -A`);
  `git push` triggers the Cloudflare Pages publish — owner gate.
