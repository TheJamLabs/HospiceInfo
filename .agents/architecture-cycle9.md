# Cycle 9 — Architecture artifact

Owner: Architect (in-lead — sub-sessions `fa069c99`, `8bbeda72`,
`ec05d9f7` all timed out with zero output; see pipeline.md dispatch log).
Date: 2026-11-16. Inputs: `.agents/feature-cycle9.md`,
`.agents/research-cycle9.md`, C9 "Done when" (pipeline.md).
Read-only for everything except this file, `docs/adr/0043-*.md`,
`GLOSSARY.md`.

---

## 1. Changed-files list (and why nothing else)

| File | Change |
|------|--------|
| `src/styles.css` | D1 one-line fix (L80); rewrite of the ≤768 px header block (L177-210) to one-line + panel; CTA row rules; FAB icon gap + stronger shadow; panel z-index override |
| `src/components/AppShell.tsx` | new `mobilePanel?: ReactNode` prop (layer toggles slot) + new `headerCta?: ReactNode` prop (CTA row slot); burger button; offcanvas markup; CTA row wrapper |
| `src/App.tsx` | pass `mobilePanel` (three layer toggles) and `headerCta` (CTA button) to AppShell; remove `hf-start-here-toggle` from `headerExtras` (substituted by the CTA row); inline SVG icon in the FAB |

Arguments against touching anything else:
- **No theme code** — `mode`/`pickMode` stay in AppShell (ADR-0024); the
  panel reuses them in place; no `theme.ts` edits.
- **No `Methodology.tsx`** — `#methodologyModal` already exists; the panel
  and footer entries are plain `data-bs-target` triggers.
- **No `leaflet`/`MapView` changes** — the D1 fix is CSS-only; map
  re-layout is already handled by `ContainerResizeInvalidator`.
- **Tests** — `npm test` (node --test) is the upstream-only suite
  (`tests/postcodes*` + `tests/handler`); a scan for header-DOM /
  `hf-start-here-toggle` assertions comes back clean, so **no test
  changes are expected**. If any surfaces, the Coder updates
  design-superseded assertions only (research risk 5) and records each
  in `.agents/implementation.md`.

## 2. M1/M2 — one-line mobile header + offcanvas menu panel

### Header markup (AppShell)

The existing header row is kept intact on desktop. The only new element in
the header is the **burger**, appended after the `<nav>`:

```tsx
<button
  type="button"
  className="hf-burger btn"
  aria-label="Open menu"
  aria-expanded={false}
  aria-controls="mobileMenu"
  data-bs-toggle="offcanvas"
  data-bs-target="#mobileMenu"
>
  <svg /* 18 px hamburger, stroke:currentColor, aria-hidden */ />
</button>
```

CSS: `.hf-burger { display:none }` at base; `display:inline-flex;
min-height:44px` in the ≤768 block. Desktop header DOM is **unchanged**
(burger is CSS-hidden ≥769 px) → 1280 px pixel-identical.

### Offcanvas panel (AppShell, sibling of the header)

```tsx
<div className="offcanvas offcanvas-end hf-menu-panel" tabIndex={-1}
     id="mobileMenu" aria-labelledby="mobileMenuLabel">
  <div className="offcanvas-header">
    <h2 className="offcanvas-title h5" id="mobileMenuLabel">Menu</h2>
    <button type="button" className="btn-close" data-bs-dismiss="offcanvas"
            aria-label="Close menu" />
  </div>
  <div className="offcanvas-body">
    {/* 1 — theme: same markup as the header btn-group (mode/pickMode reused) */}
    <div className="btn-group theme-group menu-theme" role="group"
         aria-label="Colour theme"> …same three buttons… </div>
    {/* 2 — layer toggles (map route only; absent on content routes) */}
    {mobilePanel}
    {/* 3 — Source & Method */}
    <button className="btn btn-outline-secondary hf-panel-source"
            type="button" data-bs-toggle="modal"
            data-bs-target="#methodologyModal">Source &amp; Method</button>
  </div>
</div>
```

- **Open-state ownership (closes research risk 1):** the burger carries
  `data-bs-toggle="offcanvas"` — Bootstrap's JS (already imported,
  `src/main.tsx`) owns the `show` class, focus trap, Esc, and backdrop.
  **No React state for the panel.** Initial closed = static markup without
  `show` → deterministic first paint (server/JSDOM/client), same invariant
  class as `startHereMobileOpen`.
- **`aria-expanded` sync:** Bootstrap 5.3 does not update
  `aria-expanded` on offcanvas triggers. AppShell adds the only new
  React code: a `useEffect` attaching `shown.bs.offcanvas` /
  `hidden.bs.offcanvas` listeners on the `#mobileMenu` element (via
  `ref`) setting the burger's `aria-expanded` to `"true"`/`"false"`.
  Initial DOM value `false` matches initial closed.
- **Slot props (closes risks 2, 3):** `mobilePanel?: ReactNode` — App.tsx
  passes the three layer toggles as **id-less copies** (no reuse of
  `gpsToggle`/`childrenToggle`; the `<label>` wrapping already associates
  switch and text). Toggle **state stays in App.tsx** (`showShops` /
  `showGps` / `childrenMode` + `toggleKind`) — same slot pattern as
  `headerExtras`; no state lifting, no new state. Content routes:
  `mobilePanel` undefined → section not rendered; panel = theme +
  Source & Method. The six site nav links stay in the footer on mobile
  (ADR-0039) — **not** in the panel.
- **Theme control in panel:** the panel-themed buttons use the identical
  `btn btn-outline-secondary btn-sm` classes, `aria-pressed={mode===v}`,
  `onClick={() => pickMode(v)}` — `pickMode` untouched (ADR-0024).
- **Z-order (closes risk 6):** `.hf-menu-panel { z-index: 2100 }` — exactly
  one new ladder value; above the FAB (2000). Bootstrap's
  `.offcanvas-backdrop` (~1040) sits **below** our sheet scrim (1500):
  legal — if the sheet is open and the menu opens, the scrim paints over
  the backdrop, the panel floats above everything, and sheet state is
  untouched. Ladder: scrim 1500 < sheet 1600 < start-here card 1700 <
  FAB 2000 < **menu panel 2100**.
- **Tokens (closes risk 7's token half):** no new values. Panel surface /
  text derive from `--bs-offcanvas-bg` (= `--bs-body-bg` =
  `var(--hf-surface)`) and body colour alias — dark mode automatic via the
  existing two `:root` blocks.

### ≤768 px header CSS (replaces the 4-line block, styles.css L177-210)

```css
@media (max-width: 768px) {
  .app-header .app-title-row { /* no width:100% — title + burger share one line */ }
  .hf-burger { display: inline-flex; min-height: 44px; }
  .theme-group,            /* moves into the panel */
  .app-header .form-check, /* layer toggles move into the panel */
  .app-header .hf-source-method,
  .hf-start-here-toggle    { display: none; }
  .site-nav-link { display: none; }   /* unchanged — footer carries the six */
  .hf-footer-source { display: inline; } /* unchanged (ADR-0039) */
  /* panel control sizing (moved off .app-header selectors): */
  .hf-menu-panel { z-index: 2100; }
  .hf-menu-panel .form-check { min-height: 44px; }
  .hf-menu-panel .form-check-input { scale: 1.4; }
  .hf-menu-panel .btn { min-height: 44px; }
  .menu-theme { width: 100%; justify-content: space-between; margin-bottom: 0.75rem; }
}
```

Desktop ≥769 px: identical CSS to today for the header.

## 3. M3 — CTA row + FAB restyle

### CTA row

**Placement decision (recorded):** the row is rendered by **AppShell**
from a new slot prop `headerCta?: ReactNode`, as a direct child between
`<header>` and `<main>`:

```tsx
<div className="hf-cta-row">{headerCta}</div>
```

Justification: the row needs `startHereMobileOpen` (App.tsx state) plus the
toggle — AppShell holds neither, so the presentational slot keeps state in
App.tsx and the C7 invariant (element-tree state untouched; class only on
`.app`) intact, exactly like `headerExtras`.

App.tsx passes:

```tsx
headerCta={
  <button
    type="button"
    className="hf-start-here-cta btn"
    aria-expanded={startHereMobileOpen}
    onClick={() => setStartHereMobileOpen((open) => !open)}
  >
    Start here
  </button>
}
```

CSS:

```css
.hf-cta-row { display: none; }
@media (max-width: 768px) {
  .hf-cta-row { display: block; }
  .hf-start-here-cta {
    width: 100%;
    min-height: 48px;
    border: 0;
    border-radius: 0;
    background: var(--hf-primary);
    color: var(--hf-primary-ink);
    font-size: 1rem;
  }
}
```

- **State unchanged:** `startHereMobileOpen` stays `useState(true)`
  (App.tsx:55 — deterministically true everywhere); `.hf-start-here-open`
  class on the `.app` root and the card's open/close CSS are untouched.
- The old `hf-start-here-toggle` button **removes** from `headerExtras` and
  its two CSS rules (base `display:none` + the 40 % width rule in the
  ≤768 block) are deleted, replaced by the CTA rules.

### FAB restyle (cosmetic only)

- App.tsx: inline `<svg>` list icon (≈18 px, `stroke:currentColor`,
  `aria-hidden="true"`) before the label text.
- CSS ≤768 `.sheet-fab`: add `gap: 0.5rem; align-items: center;` and
  strengthen shadow to `box-shadow: 0 4px 16px rgba(0,0,0,0.4)` (literal
  rgba — same convention as `.app-panel`; no new token).
- **Unchanged:** `position:absolute; left:50%; transform:translateX(-50%);
  bottom:14px`; open offset `calc(var(--hf-sheet-h) + 14px)`; `z-index:
  2000`; `min-height:48px`; label text ("Open list"/"Close list");
  `aria-expanded`/`aria-controls`; `sheetOpen` wiring. Scrim (1500)
  untouched.

## 4. D1 — one-line CSS fix

`src/styles.css` L80 (the `.app` rule): `height: 100%;` →
`min-height: 100%;`. Nothing else in the clamp chain changes
(`html,body,#root { height:100% }` stays; `main.app-body { flex:1 1
auto; display:flex; min-height:0 }` stays).

- **Content routes fixed:** the outer `.app` can now grow past one
  viewport; `#root` (height:100 %) overflows and the document scrolls;
  the footer — a flex child after `main` — sits **below** the content
  instead of being painted over.
- **Map route pixel-identical:** on `#map` the inner `.app`
  (`.app-body > .app`, row layout) fills exactly the remaining viewport
  space (panel `flex:0 0 340px` + map fills; `main.app-body` is
  `flex:1 1 auto` of a shell exactly 100 vh tall when content fits) —
  content height equals the viewport, so `min-height:100%` resolves to
  the same value as today at 1280/768/375.
- **Verification:** `npm run check:layout` (flex-direction set invariant);
  double `node scripts/prerender.mjs` byte-identical (CSS-only change —
  no DOM impact, no hydration risk); footer-below-content visual check at
  375/768/1280 on all six content routes (QA/DevOps on the dev server;
  JSDOM has no layout engine, so this is a served-page check).

## 5. Invariants preserved

1. `startHereMobileOpen` deterministically `true` in every environment.
2. Menu panel: static markup, initially closed (no `show` class) —
   deterministic first paint, no re-init on route change (panel renders
   once; only its slot content is conditional — risk 8).
3. Z-order ladder 1500 / 1600 / 1700 / 2000 / 2100 (one new value).
4. `--hf-sheet-h: min(55vh,480px)`; FAB open-offset math untouched.
5. `.app-sheet-open .hf-start-here { display:none }` untouched.
6. Colours only via `--hf-*` tokens (both `:root` blocks); FAB shadow is a
   literal rgba per existing component convention.
7. ≥44 px touch targets: burger 44, CTA row 48, FAB 48, panel switches 44,
   panel buttons 44.
8. Desktop ≥769 px header (1280 px) pixel-identical; map 1280/768/375
   pixel-identical.

## 6. Research risks closed

1. **Open-class ownership** — data-bs-toggle; bootstrap owns it; React
   only syncs `aria-expanded` (shown/hidden events).
2. **Duplicate ids** — panel toggle copies are id-less (label association).
3. **Panel per route** — `mobilePanel` slot undefined on content routes;
   burger always present.
4. **D1 verification surface** — §4 list.
5. **C7 test assertions** — Coder updates only design-superseded
   assertions, recorded in implementation.
6. **Ladder audit** — exactly one new value (2100); backdrop ~1040 stays
   below 1500 (legal).
7. **Superseded ADR** — ADR-0043 (written, supersedes ADR-0039); GLOSSARY
   updated (menu panel / CTA row / hamburger).
8. **Offcanvas re-init** — panel rendered once, never unmounted.

## 7. Coder checklist (order matters)

1. styles.css: L80 `height:100%` → `min-height:100%` (D1).
2. AppShell: add `mobilePanel`/`headerCta` props, burger, offcanvas, CTA
   wrapper; `useEffect` for `aria-expanded` sync.
3. App.tsx: pass `mobilePanel` (id-less toggle copies) + `headerCta`;
   remove `hf-start-here-toggle` from `headerExtras`; FAB icon.
4. styles.css: rewrite ≤768 header block + CTA rules + FAB restyle + panel
   rules (per §2/§3 CSS above).
5. Tests: run `npm test`; update only superseded assertions (record each).
6. Gates: `npm run check:layout`, `npx tsc -b`, double prerender — green.
