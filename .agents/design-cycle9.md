# Cycle 9 — Design artifact

Owner: Designer (in-lead). Date: 2026-11-16. Inputs: `.agents/feature-cycle9.md`,
`.agents/architecture-cycle9.md`, `src/styles.css` (two `:root` blocks, ≤768
header block L177–210, `.hf-start-here`, `.sheet-fab`),
`docs/adr/0043-mobile-menu-panel-and-cta-row.md`.
Read-only except this file. Input to the Reviewer and PM.

---

## 1. Scope

Four owner items: **M1/M2** — the one-line ≤768 px header with a
*hamburger button* opening the *menu panel*; **M3** — the *CTA row*
("Start here") plus *FAB restyle* ("Open list"); **D1** — the content-page
*footer overlap* fix. The architecture (`architecture-cycle9.md` §2–§4,
ADR-0043) is fixed: element tree, slot props (`mobilePanel`/`headerCta`),
z-order ladder (scrim 1500 < sheet 1600 < start-here 1700 < FAB 2000 <
panel 2100), state wiring (no React state for the panel;
`startHereMobileOpen` unchanged), and the D1 one-line CSS change are not
re-opened. This file records **visual selection records only** — exact
values, tokens, typography. No structural proposals.

## 2. Visual selection records

**LS-9-1 — *hamburger button* icon.** Inline SVG, 18 × 18 px,
`viewBox="0 0 24 24"`, three horizontal bars (`x1=4`…`x2=20` at
`y=6/12/18`), `stroke="currentColor"`, `stroke-width:2`,
`stroke-linecap="round"`, `aria-hidden="true"`. `currentColor` inherits the
`.btn` foreground, so the icon tracks light/dark with no value of its own.

**LS-9-2 — *hamburger button* sizing.** In the ≤768 block:
`.hf-burger { display:inline-flex; align-items:center; justify-content:center;
min-height:44px; min-width:44px }` — a square 44 × 44 px minimum target,
matching the site's pm 4.4 ≥44 px practice. Base rule
`display:none` (architecture §2); desktop header DOM unchanged.

**LS-9-3 — *menu panel* layout order.** Offcanvas body, in order:
1. Theme segmented control row (`.menu-theme`: the three `Auto / Light /
   Dark` buttons — same `mode`/`pickMode` markup, `aria-pressed` on active).
2. Layer toggle group (slot `mobilePanel`): **map route only** —
   Charity shops / GP practices / Children's switches; **absent on content
   routes** (panel = theme + Source & Method).
3. **Source & Method** button (`.hf-panel-source`,
   `data-bs-target="#methodologyModal"`).
The six site nav links are **not** in the panel — the footer carries them
(ADR-0039 kept for the nav).

**LS-9-4 — *menu panel* spacing.**
- `.hf-menu-panel .form-check { min-height:44px }` — every toggle row is a
  ≥44 px target (the existing ≤768 header form-check rule re-scoped, per
  architecture §2).
- `.hf-menu-panel .form-check-input { scale:1.4 }` — same as the current
  header switches (styles.css L184).
- `.hf-menu-panel .btn { min-height:44px }` — theme buttons and
  Source & Method are all ≥44 px tall.
- Rhythm ~0.75 rem: `.menu-theme { width:100%; justify-content:space-between;
  margin-bottom:0.75rem }`; the toggle group and the Source & Method row
  separate on the same 0.75 rem beat. Nothing tighter anywhere in the panel.

**LS-9-5 — *menu panel* width.** No `width` declaration: **bootstrap
default** (`.offcanvas` 400 px, clamped by Bootstrap's own
`max-width:100%` at 320/375 px). No custom width.

**LS-9-6 — *CTA row* button.** `.hf-start-here-cta` (inside `.hf-cta-row`,
under the header, mobile-only):
- `width:100%`, `min-height:48px`, `border:0`, `border-radius:0`
  (full-bleed row — deliberately cornerless, unlike the pill FAB),
  `padding:0.5rem 0`.
- `background:var(--hf-primary)`, `color:var(--hf-primary-ink)` — solid primary.
- `font-size:1rem` (tiered above the FAB's 0.95rem: this is the primary action).
- `font-weight:600` — chosen over 500 because the bundle ships only
  `PublicSans-400` and `PublicSans-600` (styles.css L15–25); 500 has no
  loaded face and would fall back to 400, rendering thin. 600 is the real
  semibold.
- Hover/press: stock Bootstrap `.btn` darken — no custom colour, no token.

**LS-9-7 — *FAB restyle*.** `.sheet-fab` (≤768 block; position, offset,
z-order, labels, wiring untouched):
- Inline `<svg>` **list icon** (three stacked bar rows, 18 × 18 px,
  `stroke="currentColor"`, `aria-hidden="true"`), before the label.
- `gap:0.5rem; align-items:center` (existing `display:inline-flex`).
- `box-shadow:0 4px 16px rgba(0,0,0,0.4)` — one notch stronger than the
  current `0 2px 8px rgba(0,0,0,0.35)`; literal rgba per the existing
  shadow-literal convention (`.sheet-scrim`, current `.sheet-fab`).
- Label copy kept **exactly "Open list" / "Close list"** (state-driven,
  unchanged). Pill `border-radius:999px`, `min-height:48px`,
  `background:var(--hf-primary)`, `color:var(--hf-primary-ink)`,
  `bottom:14px`, open offset `calc(var(--hf-sheet-h) + 14px)`,
  `z-index:2000` — all as-is.

**LS-9-8 — D1.** **No visual change.** The *footer overlap* fix is the one
CSS declaration (`.app`: `height:100%` → `min-height:100%`, styles.css L80);
rendered pixels at a fixed viewport are identical, and the map route stays
pixel-identical per architecture §4 (content height equals the viewport, so
`min-height:100%` resolves to today's value at 1280/768/375).

## 3. Theme coverage

Every chosen value resolves through the existing two `:root` blocks
(light + `:root[data-bs-theme="dark"]`, styles.css L27–54):

| Chosen value | Token chain | Light | Dark |
|---|---|---|---|
| *CTA row* / FAB fill | `--hf-primary` | #163a5f | #7dadd6 |
| *CTA row* / FAB text + icon | `--hf-primary-ink` | #ffffff | #0e1c2b |
| *menu panel* surface | `--bs-offcanvas-bg` → `--bs-body-bg` → `--hf-surface` | #ffffff | #0f1720 |
| *menu panel* text | `--bs-offcanvas-color` → `--bs-body-color` → `--hf-text` | #1c2733 | #e3ecf4 |
| Toggle labels | `--hf-text` / `--bs-body-bg` (surface-derived) | ok | ok |
| *hamburger button* icon | `currentColor` on `.btn` (Bootstrap secondary button vars) | ok | ok |

**No new `--hf-*` tokens are required.** No choice above needs a value that
does not already exist; the only raw literals are shadow `rgba()` values,
which follow the pre-existing shadow-literal convention and are sanctioned
by architecture §3 ("literal rgba — same convention as `.app-panel`; no new
token"). No choice that would require a new token is recorded here.

## 4. ASCII wireframes (≤768 px)

**(a) One-line header** (logo 28 px · title · *hamburger button* 44 px):

```
┌──────────────────────────────────────────────────┐
│ [♥ 28px]  Hospice Finder UK                  [ ☰ ]│
└──────────────────────────────────────────────────┘
```

**(b) *menu panel* open — map route** (offcanvas-end; all 3 layer toggles):

```
┌─────────────────────────────┬─────────────────────┐
│ map (behind bootstrap       │  Menu            [×] │
│ backdrop, dimmed)           │─────────────────────│
│                             │ [Auto|Light|Dark]   │
│                             │                     │
│                             │ [x] Charity shops   │
│                             │ [x] GP practices    │
│                             │ [x] Children's      │
│                             │                     │
│                             │ [Source & Method]   │
└─────────────────────────────┴─────────────────────┘
```

**(c) *menu panel* open — content route** (toggles absent):

```
┌─────────────────────────────┬─────────────────────┐
│ page content (backdrop      │  Menu            [×] │
│ dimmed)                     │─────────────────────│
│                             │ [Auto|Light|Dark]   │
│                             │                     │
│                             │ [Source & Method]   │
└─────────────────────────────┴─────────────────────┘
```

**(d) *CTA row* + *FAB restyle*** (below the header row; FAB as today):

```
┌──────────────────────────────────────────────────┐
│ [♥ 28px]  Hospice Finder UK                  [ ☰ ]│
├──────────────────────────────────────────────────┤
│ ███████████████████ Start here ████████████████ │  ← ≥48px, solid primary
├──────────────────────────────────────────────────┤
│                                                  │
│                     ( page )                     │
│                                                  │
│                 [ ▤  Open list ]                 │  ← pill, bottom 14px
└──────────────────────────────────────────────────┘
```

## 5. Contrast and touch targets

| Element | Min size | Token pair (fg / bg) | Ratio | ok? |
|---|---|---|---|---|
| *hamburger button* (icon + button) | 44 × 44 px | `.btn` fg (Bootstrap secondary) / `--hf-surface` | ≥4.5:1 both themes | ok |
| Theme buttons, *menu panel* | 44 px tall, full width | `.btn` fg / `--hf-surface` | ≥4.5:1 both themes | ok |
| Layer toggle rows | 44 px tall | `--hf-text` / `--hf-surface` | ~14:1 light, ~11:1 dark | ok |
| Source & Method, *menu panel* | 44 px tall | `.btn` fg / `--hf-surface` | ≥4.5:1 both themes | ok |
| *CTA row* | 48 px tall, full width | `--hf-primary-ink` / `--hf-primary` | ~10.6:1 light (#fff/#163a5f), ~8:1 dark (#0e1c2b/#7dadd6) | ok |
| *FAB* (icon + label) | 48 px tall | `--hf-primary-ink` / `--hf-primary` | same as *CTA row* | ok |

All targets meet the pm 4.4 ≥44 px phone practice; the two CTAs meet
their ≥48 px acceptance values.

## 6. Changelog vs ADR-0043 / architecture CSS

**Deviations: none.** Every value in §2 matches the CSS in
`architecture-cycle9.md` §2–§3 and ADR-0043. Two **additive, non-deviating**
declarations (add dimensions/weights the architecture omitted, no conflict
with any stated rule — recorded for the Reviewer, not unilateral changes):
1. `.hf-burger`: `min-width:44px` plus `align-items/justify-content:center`
   (architecture stated `display:inline-flex; min-height:44px`; a square
   44 px target is the stated intent, icon centred).
2. `.hf-start-here-cta`: `font-weight:600` (architecture CSS omits
   font-weight; the 400 face is the only other loaded weight — see LS-9-6).

No required-clarification flags. No new tokens, no new dependencies, no
DOM changes beyond those the architecture already specifies.
