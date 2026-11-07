# ADR 0028 — Rebrand via CSS custom-property design tokens (Designer handoff)

**Status:** accepted (2026-10-30)

## Context

Cycle 4 item 7 hands the visual identity to the Designer (Stage 2B); the
owner picks 1 of 2–3 concepts at gate H4-1. Today all colour is hard-coded
hex in `src/styles.css` (~10 values), `MapView.tsx` divIcon HTML,
`public/manifest.webmanifest`, and the static brand assets. The site has no
theming, no CSS variables, no build steps beyond Vite. The mechanism must
let Coding implement **any** chosen concept without re-architecture.

## Decision

- **Mechanism: CSS custom properties** — `--hf-*` tokens declared at
  `:root` (light set; initial values are *today's* hexes, so the Cycle 4
  diff is pure tokenisation with zero visual change) and overridden under
  `[data-bs-theme="dark"]` (dark set; initial guesses, refined when the
  concept lands). Full 10-token table: arch §6.1.
- **Bootstrap wiring:** `:root { --bs-body-bg: var(--hf-surface);
  --bs-body-color: var(--hf-text); --bs-border-color: var(--hf-border); }`
  → all Bootstrap components rebrand for free.
- **Map chrome:** `MapView.tsx` divIcon hexes → `var(--hf-primary)` /
  `var(--hf-primary-ink)` / `var(--hf-gp-fill)` (inline-styled HTML; CSS
  vars resolve at render).
- **`public/manifest.webmanifest` `theme_color`:** a static file value —
  fixed at the light `--hf-primary` value; not theme-aware (documented).
- **Brand assets:** `logo.svg` / `og-image.png` are **restyle-only**
  (palette/typography) on the ADR-0022 heart-on-disc mark; the mark's
  *concept* (geometry) is FIXED.
- **Designer handoff (arch §6.2):** FIXED — mark concept, information
  architecture, no new deps, no data/tessellation changes, the 171-file
  prerender invariant, the `var(--hf-…)` mechanism. OPEN — palettes
  (light + dark), typography, header/logo treatment, marker
  colour/saturation, spacing. Deliverable: 2–3 concepts rendered against
  the real IA. The chosen concept lands **via token value swaps only**
  (+ regenerating the two static assets) — no re-architecture.

## Alternatives considered

- **CSS-in-JS / JS theme object:** rejected — the site is plain CSS +
  Vite; a runtime theming library adds a dependency surface ADR-0008 rules
  out.
- **Bootstrap `--bs-*` variables only:** rejected — app-owned map chrome
  (divIcons, legend card) needs its own namespace; building on `--hf-*`
  composability is cleaner.
- **SASS/PostCSS variables:** rejected — new build steps and deps for no
  benefit on a static Vite site.

## Consequences

**Positive:** any concept = two CSS blocks + two images; the dark theme
works from day one of theming; rebrand risk is fully unblocked at H4-1.
**Negative (accepted):** a missed hard-coded hex leaves a dark-mode gap
(R5 — QA light/dark diff); `theme_color` is static (light value only);
extending the token set later is an ADR-level decision.
