# Cycle 9 — Research artifact

Owner: Research (in-lead — see pipeline.md dispatch log: sub-sessions
`f8bacc50` and `d5acd0d3` both failed to produce output).
Date: 2026-11-16. Read-only; no working-tree changes.
Spec: `.agents/feature-cycle9.md` (M1/M2 hamburger, M3 CTA row + FAB restyle,
D1 footer overlap).

---

## 1. D1 root cause — CONFIRMED (the `.app { height: 100% }` clamp chain)

The footer overlap on **all content routes** (`#about`, `#feedback`,
`#corrections`, `#privacy`, `#licences`, `#accessibility`) is caused by a
hard-height clamp that prevents the document from growing past one viewport.
The chain, with exact citations:

1. `html, body, #root { height: 100% }` — `src/styles.css:65-69`.
2. The **outer shell** `<div className="app">` (flex column: header / main /
   footer) is `src/components/AppShell.tsx:21`, styled by
   `src/styles.css:75-83`:
   `.app { display:flex; flex-direction:column; min-width:0; min-height:0;`
   **`height:100%`**; `position:relative }`.
3. `<main id="mainContent" className="app-body">` (AppShell.tsx, renders the
   content page) is `src/styles.css:139-143`:
   `.app-body { flex:1 1 auto; display:flex; min-height:0 }`.

Because the outer `.app` has a **hard `height: 100%`** (not `min-height`), it is
exactly one viewport tall. `main.app-body` is `flex:1 1 auto` *with
`min-height:0`*, so it is clamped to `100vh − header − footer`. A content page
(e.g. `src/pages/AboutPage.tsx`, a single tall `div.container` with no internal
scroll) is taller than that clamped main, so it **overflows main** and lands
visually **on top of the footer** below it. The document cannot scroll, because
`#root` is capped at `100%` — the user cannot reach the hidden content.

**Why the map route is fine:** its inner `.app` (App.tsx:192, restyled to a row
by `src/styles.css:87-90` `.app-body > .app`) fills exactly the viewport, so it
never exceeds `100vh` and the clamp is invisible there. The map is the intended
target of the fixed-viewport layout; the content routes are the broken case.

**Fix direction (for the Architect):** change the *outer shell* rule
`src/styles.css:80` `height: 100%` → `min-height: 100%`.
- Content routes: `.app` grows past one viewport, the **document scrolls**,
  and the footer sits **below** the content.
- Map route: content fills exactly `100vh`, so `min-height:100%` collapses to
  the same value as today → **pixel-identical** at 1280/768/375 (re-verify with
  `npm run check:layout` + double prerender).

No other rule in the chain needs to change. `main.app-body { min-height:0 }`
stays (it is what lets the map route clamp cleanly). One-line change.

## 2. Current mobile header anatomy (M1/M2 inputs)

`src/components/AppShell.tsx` — `<header className="app-header">` (L53)
contains, in one `d-flex flex-wrap … justify-content-between` row:

- **Title row** (L56): logo.svg 28 px + `<h1>` "Hospice Finder UK" (→ `#map`)
  + `app-title-sub` "UK — catchments approximated from GP practice locations".
- **`<nav aria-label="Site pages">`** holding, in order:
  1. **Theme segmented control** (L68): `<div className="btn-group
     theme-group" role="group" aria-label="Colour theme">` — three
     `btn btn-outline-secondary btn-sm` buttons (Auto/Light/Dark) with
     `aria-pressed`, `onClick={() => pickMode(t.value)}` (L77). Theme state
     (`mode`/`pickMode`) lives **in AppShell** (ADR-0024, arch R1).
  2. **`{headerExtras}`** — map route only (App.tsx:135-191): three layer
     toggles as `form-check form-switch` — **Charity shops** (`showShops`),
     **GP practices** (`showGps`, `id="gpsToggle"`), **Children's**
     (`childrenMode`, `id="childrenToggle"`); then the `hf-source-method`
     button (`btn btn-outline-secondary btn-sm`,
     `data-bs-target="#methodologyModal"`, ~L173); then the
     `hf-start-here-toggle` button (`btn btn-outline-secondary btn-sm`,
     `aria-expanded={startHereMobileOpen}`, L184).
  3. **Six `site-nav-link` anchors** (L85): Feedback / Corrections / About /
     Privacy / Licences / Accessibility.

**Current ≤768 px CSS** (`src/styles.css:177-210`) builds a **4-line**
mobile header: line 1 title (`.app-title-row{width:100%}`, subtitle 0.75 rem);
line 2 theme control full-width (`.theme-group{flex:1 1 100%;
justify-content:space-between}`, ADR-0024); lines 3-4 the toggles +
Start-here button at `width:40%` (two per line). Map header controls
(`.app-header .form-check`) get `min-height:44px`, `scale:1.4` inputs,
`0.875rem` labels. `site-nav-link` is `display:none` (footer carries the six
links); `hf-source-method` is `display:none`; `hf-footer-source` is
`display:inline`.

**M1/M2 target:** ≤768 px header = **one line** (logo + title + ☰ burger).
Everything the header currently carries besides the title — theme control,
the three layer toggles, Source & Method — moves into the burger panel.
Desktop (≥769 px) header is **unchanged** (1280 px pixel-identical).

**State-ownership note for the Architect:** theme state lives in AppShell;
the three layer-toggle states live in App.tsx. The panel must therefore be
rendered by AppShell (to reuse `pickMode`) and **receive the three toggles
via props** — the same slot pattern as the existing `headerExtras`
(AppShell's `headerExtras?: ReactNode` prop, App.tsx:135). No state lifting.

## 3. CTA row + FAB anatomy (M3 inputs)

**"Start here" (CTA row target):** today it is
`<button className="hf-start-here-toggle btn btn-outline-secondary btn-sm">`
inside `headerExtras` (App.tsx:181-187): `aria-expanded={startHereMobileOpen}`,
`onClick={() => setStartHereMobileOpen((open) => !open)}`. State
`startHereMobileOpen` is `useState(true)` (App.tsx:55) — **deterministically
true in every environment incl. JSDOM prerender** (C7 invariant, ADR-0038) —
and drives the `.hf-start-here-open` class on the map-route root div
(App.tsx:194-200). CSS:
`.hf-start-here-toggle { display:none }` base (styles.css:121-123,
C7/W3 ADR-0038 re-issued), `display:inline-flex; width:40%` in the ≤768 px
block (styles.css:206) — i.e. the header button exists only on mobile today.

M3 replaces it with a **full-width solid-primary CTA row under the header,
mobile only (≤768 px), min-height ≥48 px**, bound to the same
`startHereMobileOpen` state (and same `aria-expanded`). The row toggles the
existing card; no second state is introduced. The header button
(`hf-start-here-toggle`) drops out of the header entirely — substituted by
the row (desktop unaffected: the button is CSS-hidden ≥769 px anyway).

**"Open list" FAB:** `<button className="sheet-fab …">` (App.tsx:251-263):
`type="button"`, `aria-expanded={sheetOpen}`, `aria-controls="appPanel"`,
`onClick` toggles `sheetOpen`, text label
`{sheetOpen ? 'Close list' : 'Open list'}`. CSS (`src/styles.css`):
- base `display:none` (L346-347);
- ≤768 px block (L392-406): `display:inline-flex; position:absolute;
  left:50%; transform:translateX(-50%); bottom:14px; z-index:2000` (L397);
  `min-height:48px; padding:0 1.5rem; border-radius:999px; border:0;
  background:var(--hf-primary); color:var(--hf-primary-ink);
  box-shadow:0 2px 8px rgba(0,0,0,0.35); font-size:0.95rem;`
- open state (L408-410): `.app-sheet-open .sheet-fab { bottom: calc(var(--hf-sheet-h) + 14px) }`
  with `--hf-sheet-h: min(55vh, 480px)` (L366, ADR-0041).

M3 restyle is **cosmetic only**: add an icon (inline SVG, self-contained —
no new dependency) before the text, keep the pill shape, ≥48 px (already so),
and a **stronger shadow**. **Position / offset / z-order / label / behaviour
are unchanged** (`position:absolute; left:50%; bottom:14px / open offset;
z-index:2000`). The scrim (`sheet-scrim`, z-index 1500) is untouched. Current
z-order ladder to preserve: scrim 1500 < sheet `.app-panel` 1600 < start-here
card 1700 < FAB 2000.

## 4. Panel mechanics recommendation

**Recommended: Bootstrap 5.3 Offcanvas, static markup, data-attr open/close
(bootstrap owns the state) — no new dependency.** Bootstrap's **full ESM JS bundle**
is already imported (`src/main.tsx`:
`import 'bootstrap/dist/js/bootstrap.esm.js'`), so the modal data-attrs
(used by `hf-source-method`/`hf-footer-source`) already work; the same bundle
provides Offcanvas.

Placement & wiring:
- Render the offcanvas **inside AppShell** (header's sibling), so the theme
  segmented control can reuse AppShell's `mode`/`pickMode` (ADR-0024 — no
  theme state moves out of AppShell, no new `theme.ts` code).
- App.tsx passes the **three layer toggles** into AppShell via a new slot prop
  (e.g. `mobilePanel?: ReactNode`) — exactly the existing `headerExtras`
  pattern. Toggle state stays in App.tsx; the panel holds bound copies
  (rendered twice: desktop header keeps its inline copies ≥769 px, panel
  copies serve ≤768 px — both bound to the same state, one of the two is
  CSS-hidden per breakpoint).
- Open state is **AppShell-local React state**, initial **closed** in every
  environment (deterministic false — server/JSDOM/client — same invariant as
  the sheet: no hydration mismatch, no DOM change on first paint). **Static
  markup + `data-bs-toggle="offcanvas"` on the burger**: bootstrap's JS
  (from the already-imported ESM bundle) owns the `show` class and provides
  focus trap, Esc close and backdrop — no React state, no hand-rolled a11y.
  Burger `aria-expanded` syncs off the offcanvas `shown`/`hidden` events
  (see risk 1).
- Panel content order (per spec): theme segmented control · three layer
  toggles · Source & Method (`data-bs-target="#methodologyModal"`).
  The six site nav links **stay hidden on mobile** (footer already carries
  the same six — current behaviour, ADR-0039); not part of the panel per spec.

**Z-order consequence:** Bootstrap's offcanvas defaults (z-index ~1045) sit
**below** our mobile ladder (scrim 1500 / sheet 1600 / card 1700 / FAB 2000).
The menu panel must be raised **above the FAB**, e.g. `z-index:2100`, so an
open panel is never trapped under the sheet controls. Recommended ladder:
scrim 1500 < sheet 1600 < start-here card 1700 < FAB 2000 < **menu panel
2100**. (Open menu while the sheet is open is legal — the panel floats over
everything, closes independently; sheet state is untouched.)

**Why not a custom plain-div panel:** it would hand-roll focus trapping, Esc,
backdrop, scroll lock and body classes that Offcanvas already provides —
more code, more risk, no benefit.

## 5. Mobile footer Source & Method recommendation

The mobile footer **already** exposes Source & Method:
`<a className="small text-decoration-none hf-footer-source" data-bs-toggle="modal"
data-bs-target="#methodologyModal">` in the footer nav
(`src/components/AppShell.tsx`, footer block L96-111; C7/W1 ADR-0039
comment at styles.css:112-115). CSS: `.hf-footer-source { display:none }`
base (styles.css:115-117) with `display:inline` in the ≤768 px block
(styles.css:209). The modal it opens is
`src/components/Methodology.tsx:102` (`id="methodologyModal"`).

The spec's panel also contains a Source & Method entry — i.e. **two mobile
entry points to the same modal** (footer link = no-menu path, panel = in-menu
path). **Recommendation: keep both.** The footer link is the ADR-0039
no-menu fallback and costs nothing; the panel entry is spec-mandated and more
discoverable. No removal, no de-duplication code — both are plain
data-attr triggers of the same modal. Zero risk to 1280 px (footer link is
CSS-hidden ≥769 px today and stays so).

## 6. Design-token / BEACON impact

No **new** token values are required:
- CTA row: `background: var(--hf-primary)`, `color: var(--hf-primary-ink)`
  (light `:root` styles.css:28-29, dark `:root` styles.css:50-51). If a
  hover state is added, use an existing token (or an opacity/brightness
  filter) — no ad-hoc hex.
- FAB stronger shadow: existing convention is literal rgba inside component
  rules (`.app-panel` uses `0 -4px 16px rgba(0,0,0,.25)` at styles.css:384;
  FAB today `0 2px 8px rgba(0,0,0,0.35)` at styles.css:403). Keep the
  literal (stronger, e.g. `0 4px 16px rgba(0,0,0,0.4)`) unless the
  Architect prefers a `--hf-fab-shadow` token; either way, black-alpha, no
  new color.
- Menu panel: surface/border/text from `--hf-surface` / `--hf-border` /
  `--hf-text` (light styles.css:30/32/33, dark styles.css:52/54/55) → dark
  mode is automatic. Bootstrap offcanvas background derives from
  `--bs-offcanvas-bg` (bootstrap default — **not overridden** in
  styles.css; the existing BEM aliases at styles.css:42-44/60-62 cover body
  background/color/border only).
- BEACON invariant: any value that becomes a CSS variable (if chosen) must be
  defined in **both** root blocks (light ~L28-44, dark ~L50-62) — likely
  none this cycle.

## 7. Risks / open questions for the Architect

1. **Who owns the panel's open class.** Bootstrap's offcanvas JS owns the
   `show` class (focus trap, backdrop, Esc all key off it) — so the clean
   wiring is `data-bs-toggle="offcanvas"` on the burger (section 4): no
   React state, initial closed = static markup (no `show` class) →
   deterministic first paint. The only React concern is syncing the burger's
   `aria-expanded` via the offcanvas `shown`/`hidden` events (bootstrap does
   not update it for offcanvas — coding to verify in Bootstrap 5.3).
   A manual React class toggle would hand-bootstrap the focus trap — not
   recommended.
2. **Duplicate DOM ids**: the three layer toggles use
   `id="gpsToggle"` / `id="childrenToggle"` (App.tsx:161,172). A second,
   panel-bound copy must **not** reuse those ids. Panel copies: no ids
   (label wrapping already provides association) or suffixed ids. QA to
   assert single ids.
3. **Panel content per route**: layer toggles exist only on the map route.
   Content routes: panel = theme control + Source & Method only
   (`mobilePanel` slot prop undefined → section not rendered). The burger
   must exist on all routes (the theme control is in the base header today,
   so mobile content pages rely on it too — no regression).
4. **D1 verification surface**: `min-height:100%` (styles.css:80) changes
   `.app` height on content routes — verify with `npm run check:layout`
   (map geometry), **double `node scripts/prerender.mjs` (byte-identical)**,
   and footer-below-content at 375/768/1280 on all six content routes.
   `main.app-body { flex:1 1 auto; display:flex; min-height:0 }`
   (styles.css:139-143) stays — it is what clamps the map route cleanly;
   with a growing `.app` it simply grows on content routes.
5. **C7 invariant tests**: `npm test` (26/26) may assert on header DOM /
   `hf-start-here-toggle` presence / header structure; the CTA-row
   substitution and burger addition change prerendered HTML. Coding runs the
   suite and updates **only** assertions superseded by design-approved
   behavior — recorded in `.agents/implementation.md`.
6. **z-order ladder audit**: new menu panel at **2100** (above FAB 2000);
   its Bootstrap backdrop (~1040) stays below the sheet scrim 1500 (legal:
   sheet scrim covers it). Exactly one new ladder value; nothing else moves.
7. **Superseded ADR**: the 4-line mobile header (ADR-0039) is replaced by the
   one-line + panel design → Architect writes a new ADR (next number in
   `docs/adr/`) superseding it; GLOSSARY.md gets the new terms.
8. **Offcanvas instance per page**: the panel renders once (never
   conditionally unmounted) so bootstrap needs no re-init on route change;
   only the slot content inside it is conditional.

## 8. Glossary candidates

- **menu panel** — the mobile ≤768 px offcanvas carrying the theme control,
  layer toggles (map route only) and Source & Method; not a nav menu (the six
  site links stay in the footer on mobile).
- **CTA row** — the full-width solid-primary "Start here" bar under the header
  on mobile (substitutes the former `hf-start-here-toggle` button).
- **hamburger / burger** — the ☰ button in the one-line mobile header
  (`data-bs-toggle="offcanvas"`).
- (existing, unchanged): sheet, FAB, scrim, start-here card/disclosure,
  offcanvas (Bootstrap), token family `--hf-*`.

## 9. Summary for the Architect (≤15 lines)

1. **D1**: one-line fix — styles.css:80 `height:100%` → `min-height:100%`
   (outer `.app`); content routes scroll with footer below; map route
   pixel-identical (verify: check:layout + double prerender).
2. **M1/M2**: ≤768 px one-line header (logo+title+burger); panel = Bootstrap
   offcanvas (ESM bundle already imported) rendered in AppShell,
   data-attr toggle (bootstrap owns open state), slot prop `mobilePanel` for
   the three layer toggles (state stays in App.tsx; panel copies carry no
   duplicate ids); panel z-index 2100; content routes show theme +
   Source & Method only.
3. **M3**: `hf-start-here-toggle` button → full-width solid-primary CTA row
   (≤768 px, ≥48 px) bound to the same `startHereMobileOpen` (stays
   deterministically true); FAB restyle = inline-SVG icon + stronger shadow
   only — position/offset/z-order/label/behaviour untouched; ladder
   1500/1600/1700/2000/2100.
4. **Footer Source & Method link stays** (ADR-0039 no-menu fallback); panel
   S&M = second entry; both are data-attr triggers of #methodologyModal.
5. **Tokens**: no new values — CTA row via `--hf-primary`/`--hf-primary-ink`,
   panel via `--hf-surface`/`--hf-border`/`--hf-text`, FAB shadow literal
   (both `:root` blocks untouched unless a token is added).
6. **Verification bar**: `npm test` (update only design-superseded
   assertions), `npm run check:layout`, double prerender byte-identical,
   375/768/1280 checks on all routes.
