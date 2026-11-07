# Design — Cycle 4, Stage 2B (Visual concepts)

Three genuinely distinct visual directions for Hospice Finder UK, each mapped 1:1 onto the ADR-0028 10-token `--hf-*` set (light `:root` + dark `[data-bs-theme="dark"]`), no token added, no token left unassigned. All three keep the fixed ADR-0022 heart-on-disc mark, the existing IA (header / 340px panel / map / footer), and the data-driven nation catchment colours (`h.color`: England #6fa8dc, Scotland #74b374, Wales #d99e5b, Northern Ireland #cf6b62 — identical in every concept, NOT tokenised).

**Mock format note:** the image-generation service was unavailable during this stage (5 aborted attempts). The mocks are therefore hand-authored SVGs at 1200×750 using each concept's exact theme HEX values. They reproduce the real chrome from `AppShell.tsx` / `MapView.tsx`: header (disc logo + heart pin + wordmark + tagline + GP practices / Charity shops switches OFF per first-load layer defaults + "Source &amp; Method" + Auto/Light/Dark control Auto-active + 6 nav links), 340px left panel (search, nation chips, "161 hospices", 7 mock rows with the 4th row active), map (GB + NI landmass, 6 catchment polygons, 8 diamond markers, legend bottom-left, zoom top-right, OSM attribution), and the thin footer. Row data is mock-only ("Ysbyty_y PCM" is not a real dataset name).

**Glossary terms in use:** theme-boot snippet, `hfuk-theme` localStorage key, `data-bs-theme` on `<html>`, Auto/Light/Dark, design tokens, first-load layer defaults, muted GP layer (`--hf-gp-fill` renders the GP layer muted when its switch is off, as mocked).

---

## Concept 1 — HAVEN (warm human)

**Rationale.** *Haven* is the most emotionally direct option: warm ivory paper with a deep teal brand colour, a characterful serif (Fraunces) for the wordmark and heads, and Work Sans for the UI. It feels like a cared-for home — branded and distinctive at a glance, yet calm enough to sit beside hospice names and legacy stats without becoming gaudy. The warmth lives in the neutrals (ivory, warm greys); the teal supplies seriousness. Best fit if the product should feel personal and human first.

**Typography (self-hosted woff2, package-free, `public/fonts/`):**
- Display: `Fraunces-400.woff2`, `Fraunces-600.woff2` (SIL OFL)
- Body/UI: `WorkSans-400.woff2`, `WorkSans-500.woff2`, `WorkSans-600.woff2` (SIL OFL)

**Palette — all 10 tokens, both themes (no unused tokens):**

| Token | Light | Dark |
|---|---|---|
| `--hf-primary` | `#0e5f57` | `#3fae9e` |
| `--hf-primary-ink` | `#fdf9f1` | `#0d2a26` |
| `--hf-surface` | `#faf6ef` | `#1c1914` |
| `--hf-surface-muted` | `#f2ece0` | `#26221b` |
| `--hf-border` | `#e3d9c6` | `#3a342a` |
| `--hf-text` | `#2b241a` | `#efe7d8` |
| `--hf-text-muted` | `#7c7060` | `#a89c88` |
| `--hf-gp-fill` | `#8a8172` | `#968c7c` |
| `--hf-legend-bg` | `rgba(250,246,239,0.95)` | `rgba(28,25,20,0.92)` |
| `--hf-row-active` | `#ece2cd` | `#322c21` |

**Logo (recolour only — ADR-0022 geometry FIXED, no new mark):** disc = `--hf-primary`; heart = cream `#fdf9f1` in light / `#0d2a26` in dark (i.e. `--hf-primary-ink`); pin = primary. Favicon: same heart-on-disc at 32px. OG image: teal field, cream heart, wordmark in Fraunces; treatment = flat lozenge panel with the mark, no new art.

**Mocks:** `.agents/design/haven-light.svg` (light chrome mock, exact palette); `.agents/design/haven-dark.svg` (dark chrome mock, exact palette).

**Changes vs today / stays:** change = token values + fonts + logo recolour; stays = mark geometry, IA, layout metrics, nation colours, all behaviour.

---

## Concept 2 — BEACON (cool civic)

**Rationale.** *Beacon* is the confidence-of-public-services option: crisp white (light) / near-black navy (dark), a deep institutional navy primary, and a bold all-sans typographic system (Archivo 700 wordmark, Public Sans for everything else). It reads as trustworthy, precise and national-scope — closer to gov.uk in spirit than in letter — and the coral #e06744 accent (OG image only, not wired to any token) adds a human spark without touching the 10-token cap. Lowest-risk choice if the audience includes care bodies and local authorities.

**Typography (self-hosted woff2, `public/fonts/`):**
- Display: `Archivo-700.woff2` (OFL)
- Body/UI: `PublicSans-400.woff2`, `PublicSans-600.woff2` (OFL)

**Palette — all 10 tokens:**

| Token | Light | Dark |
|---|---|---|
| `--hf-primary` | `#163a5f` | `#7dadd6` |
| `--hf-primary-ink` | `#ffffff` | `#0e1c2b` |
| `--hf-surface` | `#ffffff` | `#0f1720` |
| `--hf-surface-muted` | `#f4f7fa` | `#17222e` |
| `--hf-border` | `#d8e0e8` | `#2b3a4a` |
| `--hf-text` | `#1c2733` | `#e3ecf4` |
| `--hf-text-muted` | `#5f7183` | `#8fa3b8` |
| `--hf-gp-fill` | `#74879b` | `#8298ad` |
| `--hf-legend-bg` | `rgba(255,255,255,0.95)` | `rgba(15,23,32,0.92)` |
| `--hf-row-active` | `#e8f0f8` | `#223449` |

**Logo (recolour only):** disc = navy `#163a5f`; heart = white (light) / `#0e1c2b` (dark, `--hf-primary-ink`); pin = primary. Favicon: mark on navy. OG image: deep-navy field, white heart, coral #e06744 baseline rule — **OG-only, not a token**.

**Mocks:** `.agents/design/beacon-light.svg`; `.agents/design/beacon-dark.svg`.

**Changes vs today / stays:** change = token values + fonts + logo/OG recolour; stays = everything structural, including the 171-file prerender surface.

---

## Concept 3 — KEEP (UK moor)

**Rationale.** *Keep* is the distinctive-UK option: sage-cream paper and forest green, a Newsreader editorial serif paired with Figtree, and bracken rust #b0562e reserved for the OG image (OG-only, not a token). It evokes moorland, coastline and the four nations — a considered, place-rooted identity that still underpins the legibility the map and data tables demand. Most "designed" of the three; slightly more risk if the audience reads green as "clinical," but the warm paper and echoed nation palette (green/sage/rust) keeps it from that.

**Typography (self-hosted woff2, `public/fonts/`):**
- Display: `Newsreader-400.woff2`, `Newsreader-600.woff2` (OFL)
- Body/UI: `Figtree-400.woff2`, `Figtree-500.woff2`, `Figtree-600.woff2` (OFL)

**Palette — all 10 tokens:**

| Token | Light | Dark |
|---|---|---|
| `--hf-primary` | `#275c45` | `#64b18a` |
| `--hf-primary-ink` | `#f4f1e8` | `#0f241a` |
| `--hf-surface` | `#f5f4ee` | `#151a15` |
| `--hf-surface-muted` | `#ecebe1` | `#1f261f` |
| `--hf-border` | `#d9d8c8` | `#333d33` |
| `--hf-text` | `#232c24` | `#e4e8df` |
| `--hf-text-muted` | `#6f7a6c` | `#9aa795` |
| `--hf-gp-fill` | `#7e8a7d` | `#8b988b` |
| `--hf-legend-bg` | `rgba(245,244,238,0.95)` | `rgba(21,26,21,0.92)` |
| `--hf-row-active` | `#e0e4d5` | `#2a332a` |

**Logo (recolour only):** disc = forest green `#275c45`; heart = sage cream `#f4f1e8` (light) / `#0f241a` (dark, `--hf-primary-ink`); pin = primary. Favicon: mark on near-black-green. OG image: deep forest field, sage heart, bracken rust #b0562e accent bar — **OG-only, not a token**.

**Mocks:** `.agents/design/keep-light.svg`; `.agents/design/keep-dark.svg`.

**Changes vs today / stays:** change = token values + fonts + logo/OG recolour; stays = mark geometry, IA, layout, nation colours, data pipeline.

---

## Specimen

`.agents/design/type-palette-specimen.svg` — side-by-side type + palette specimen for all three concepts (display/body samples, light/dark primary, surfaces, text/row-active, `--hf-gp-fill` chip, and the 4 nation colours labelled data-driven/not tokenised), with a footer note documenting the image-gen outage and SVG substitution.

---

## Comparison

| | HAVEN | BEACON | KEEP |
|---|---|---|---|
| Palette temperature | Warm (ivory + deep teal) | Cool (white + deep navy) | Warm-green (sage paper + forest) |
| Type personality | Serif display, humanist sans body | Bold all-sans, civic | Editorial serif, warm sans body |
| Accent (OG-only) | none | coral #e06744 | bracken #b0562e |
| Risk | Low | Lowest | Moderate (green ↔ clinical read) |
| Effort via tokens | Identical: 20 token values + fonts + mark recolour | Identical | Identical |

## Implementation note (governs the rebrand work item)

Implementing the chosen concept is **token-swap only** per ADR-0028: update the 10 `--hf-*` values in the theme-boot snippet's `:root` / `[data-bs-theme="dark"]` blocks, recolour `logo.svg`, `favicon`, and the OG image with the concept's hex, and vendor the chosen woff2 set under `public/fonts/` (ADR-0008, no new npm deps). No structural changes, no component rework, no data or tessellation changes.

**The rebrand work item is BLOCKED until James picks a concept at gate H4-1.** Cycle 4 items 1–6 proceed unblocked. Nation catchment colours remain data-driven (`h.color`) and are unchanged by any concept.
