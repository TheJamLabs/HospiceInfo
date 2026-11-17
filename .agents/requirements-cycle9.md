# Cycle 9 — Requirements / work breakdown

Owner: Product Manager (sub-session `pm-cycle9`, qwen-dense).
Date: 2026-11-16. Inputs: architecture-cycle9.md, design-cycle9.md,
review-cycle9.md, ADR-0043.

## 1. Goal restatement (owner approvals 2026-11-16; not re-litigated)

- **M1** — ≤768 px header = one line: logo + title + hamburger (44 × 44 px); no subtitle.
- **M2** — layer controls live in the offcanvas *menu panel* on mobile: theme control (Auto/Light/Dark, same `mode`/`pickMode`), the three layer toggles (map route only), Source & Method (`#methodologyModal`).
- **M3** — "Start here" = full-bleed *CTA row* (solid primary, ≥48 px) under the header, mobile only, toggling existing `startHereMobileOpen`; *FAB* "Open list" gains list icon + stronger shadow, position/offset/z-order/labels unchanged.
- **D1** — content-page *footer overlap* fixed via one-line CSS (`.app` `height:100%` → `min-height:100%`); map route pixel-identical.

## 2. Work list (order = architecture-cycle9.md §7)

### C9-1 — D1 one-line fix — status: pending
- **(a) File:** `src/styles.css` (L80, the `.app` rule only).
- **(b) Change:** `height: 100%;` → `min-height: 100%;`. Nothing else in the clamp chain is touched: `html, body, #root { height:100% }` and `main.app-body { flex:1 1 auto; display:flex; min-height:0 }` stay. Design LS-9-8: no visual change at a fixed viewport — on the map route content height equals the viewport, so `min-height:100%` resolves to today's value at 1280/768/375.
- **(c) Validation:** `npm run check:layout` green; footer below the content at 375/768/1280 on all six content routes (dev server — QA); map route pixel-identical at 1280/768/375.

### C9-2 — AppShell: slots + burger + offcanvas + aria sync + CTA-row wrapper — status: pending
- **(a) File:** `src/components/AppShell.tsx` (only new import: `type { ReactNode }`).
- **(b) Changes:**
  1. Two optional slot props: `mobilePanel?: ReactNode` (layer toggles; `undefined` on content routes → no toggle section) and `headerCta?: ReactNode` (presentational only, no state added).
  2. **Burger** appended after the `<nav>` in the header, verbatim architecture §2: `type="button"`, `className="hf-burger btn"`, `aria-label="Open menu"`, `aria-expanded={false}` (initial), `aria-controls="mobileMenu"`, `data-bs-toggle="offcanvas"`, `data-bs-target="#mobileMenu"`; child = inline hamburger SVG per LS-9-1: 18 × 18 px, `viewBox="0 0 24 24"`, three horizontal bars `x1=4…x2=20` at `y=6/12/18`, `stroke="currentColor"`, `stroke-width:2`, `stroke-linecap="round"`, `aria-hidden="true"`.
  3. **Offcanvas panel** as sibling of the header: `className="offcanvas offcanvas-end hf-menu-panel"`, `tabIndex={-1}`, `id="mobileMenu"`, `aria-labelledby="mobileMenuLabel"`; header row: `<h2 className="offcanvas-title h5" id="mobileMenuLabel">Menu</h2>` + `<button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close menu">`; body in LS-9-3 order: (1) theme `btn-group` `className="menu-theme" role="group" aria-label="Colour theme"` — the three buttons with the full own-header class expression `btn btn-outline-secondary btn-sm` + `active` when `mode===v` (reviewer R1 — state the dynamic class explicitly), `aria-pressed={mode===v}`, `onClick={() => pickMode(v)}`; (2) `{mobilePanel}`; (3) Source & Method button `className="btn btn-outline-secondary hf-panel-source"` `type="button"`, `data-bs-toggle="modal"`, `data-bs-target="#methodologyModal"`.
  4. **CTA-row wrapper** `<div className="hf-cta-row">{headerCta}</div>` as direct child between `<header>` and `<main>` (rendered on every route; empty on content routes).
  5. **aria sync:** `useEffect` + `useRef` on `#mobileMenu` — listen `shown.bs.offcanvas` / `hidden.bs.offcanvas`, set the burger's `aria-expanded` to `"true"`/`"false"`; cleanup on unmount. No React state for the panel (Bootstrap owns `show`/focus trap/Esc/backdrop); initial markup closed (no `show` class) → deterministic first paint; panel rendered once, never unmounted.
- **(c) Validation:** `npx tsc -b` green; desktop ≥769 px header pixel-identical at 1280 (burger CSS-hidden at base, closed offcanvas off-screen, CTA row `display:none` — C9-4); toggle section present on the map route only.

### C9-3 — App.tsx: wire slots, remove old toggle, FAB icon — status: pending
- **(a) File:** `src/App.tsx`.
- **(b) Changes:**
  1. Pass `headerCta={…Start here button…}` (the map route) — the existing `hf-start-here-toggle` button markup becomes the CTA row's content: same label **Start here**, same `startHereMobileOpen` `useState(true)` wiring (App.tsx:55) and `.hf-start-here-open` composition — untouched, except the class name changes to `hf-start-here-cta` (styles C9-4) and the `btn` class is retained.
  2. `mobilePanel` = the three layer toggles (Charity shops / GP practices / Children's) as plain copies of the header form-checks: identical labels, `form-check form-switch` classes, `showShops`/`showGps`/`childrenMode` state and `toggleKind` wiring unchanged; **the header copies stay in the DOM** (hidden ≤768 by CSS) — React state is single-source, no duplication of state.
  3. Remove the old `hf-start-here-toggle` button from `headerExtras` (App.tsx:183) — it has moved to the CTA row; delete its now-unused styling hook there.
  4. **FAB icon:** add an inline list icon (18 px, `stroke="currentColor"`, `aria-hidden="true"`) before the FAB label, `gap:0.5rem` handled in CSS (C9-4); labels exactly `Open list` / `Close list` (unchanged); `sheetOpen`, `aria-expanded`, `aria-controls` wiring untouched.
- **(c) Validation:** `npx tsc -b` green; `node --test` 26/26 green; the three panel switches and header switches show identical state via `aria-checked` in dev (QA, map route at 375); FAB icon present, labels byte-identical.

### C9-4 — styles.css ≤768 rewrite + component rules — status: pending
- **(a) File:** `src/styles.css`.
- **(b) Changes:**
  1. **Delete** the old `.hf-start-here-toggle` rules: the base rule (styles.css:121–123) and the ≤768 rule (styles.css:206).
  2. **Add base (all viewports):** `.hf-burger{display:none}` and `.hf-cta-row{display:none}` — desktop hides both, exactly mirroring how `.hf-start-here-toggle` behaved today.
  3. **Replace the ≤768 header block (styles.css:177–210) in full** (reviewer R5 — no dead selectors may survive): keep `.site-nav-link{display:none}` and `.hf-footer-source{display:inline}`; add `.theme-group{display:none}`, `.app-header .form-check{display:none}`, `.app-header .hf-source-method{display:none}`, and `.app-title-sub{display:none}` (reviewer C1 — the subtitle drops out of the DOM *visually*; not in the architecture CSS blocks, adopted here); show the burger `.hf-burger{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px}` (LS-9-2 centering + 44 × 44 target). Do **not** re-introduce `.app-title-row{width:100%}` (reviewer R5 — never shipped for a reason).
  4. **CTA row (≤768):** `.hf-cta-row{display:block}` + the CTA button per design LS-9-4 / architecture §3 verbatim: `width:100%; min-height:48px; border:0; border-radius:0; padding:0.5rem 0; background:var(--hf-primary); color:var(--hf-primary-ink); font-size:1rem; font-weight:600` (600, not 700 — only Public Sans 400/600 faces load). Do **not** add `.app-sheet-open .hf-cta-row{display:none}` (reviewer R2 — parity: visible while the sheet is open; QA flags the invisible state flip as the old C7 exposure, not a regression).
  5. **Menu panel (≤768):** `.hf-menu-panel{z-index:2100;width:100vw}` (reviewer C2 — explicit declaration records intent; Bootstrap's `-end` max-width:100% clamp makes it visually identical at 375 px) + the four inner rules from architecture §5: `.hf-menu-panel .form-check{min-height:44px}`, `.hf-menu-panel .form-check-input{scale:1.4}`, `.hf-menu-panel .btn{min-height:44px}`, `.menu-theme{width:100%;justify-content:space-between;margin-bottom:0.75rem}` (LS-9-5: no width change — 400 px clamped).
  6. **FAB (≤768), `.sheet-fab`:** add `gap:0.5rem; align-items:center;` and `box-shadow:0 4px 16px rgba(0,0,0,0.4)` (LS-9-7). Position/offset (`calc(var(--hf-sheet-h) + 14px)`), z 2000, 48 px size, and labels untouched.
- **(c) Validation:** `npm run check:layout` immediately after landing — green, **no** new `flex-direction` declarations (reviewer R3 / C4 hard guard); desktop ≥769 px surface unchanged at 1280; no new `--hf-*` tokens introduced.

### C9-5 — Dead-selector audit (reviewer R4) — status: pending
- **(a) File:** read-only sweep, nothing to change — `src/` (app code + styles).
- **(b) Change:** run `grep -rn 'hf-start-here-toggle' src/` — the three known sites (App.tsx:183 removed by C9-3; styles.css:121–123 and 206 removed by C9-4) must be gone. Also confirm no other Cycle 8-era selector outlives its element in `src/styles.css` (spot-check the ≤768 block boundaries).
- **(c) Validation:** grep returns zero hits; result recorded in `.agents/implementation-cycle9.md`.

### C9-6 — Final gates — status: pending
- **(a) File:** no file changes — run the gate commands from the repo root.
- **(b) Changes:** none; execute in order: `npx tsc -b`; `node --test` (26/26 expected, **zero test changes** — record the actual run); `npm run check:layout` (R3/C4 hard guard, full-set invariant); `npm run build` then `node scripts/prerender.mjs` run twice → `dist/` byte-identical (`diff -r`); `npm run sitemap` → 215 `<loc>` entries; re-confirm C9-5 grep is still zero.
- **(c) Validation:** every command green with output captured in `.agents/implementation-cycle9.md`; any failure blocks the stage and routes back to Coding.

## 3. Gates (all mandatory, run after C9-6)

1. `npx tsc -b` — green.
2. `node --test` — 26/26, no test edits (record the run).
3. `npm run check:layout` — green: flex-direction strict set `{.app column, .app-body > .app row, .legend-grid column}` unchanged (R3/C4).
4. `npm run build` + double prerender — `dist/` byte-identical across two runs.
5. `npm run sitemap` — 215 `<loc>`.
6. C9-5 grep — zero `hf-start-here-toggle` hits.
7. R5 id check — `mobileMenu` / `mobileMenuLabel` single-occurrence, offcanvas `aria-*` wiring complete (assert spec §3 row 8).

## 4. Invariants (must hold at the end of every work item)

- **A** — `startHereMobileOpen` begins `true` on every route (deterministic state, App.tsx:55).
- **B** — the menu panel is static Bootstrap markup, initially **closed**, rendered once, never unmounted; React only syncs `aria-expanded` (architecture §1).
- **C** — z-order ladder 1500 < 1600 < 1700 < 2000 < 2100 holds; 2100 (panel) is the only new value; Bootstrap offcanvas backdrop (≈1040) stays below 1500.
- **D** — `.app-sheet-open .hf-start-here{display:none}` untouched (existing sheet-over-card rule).
- **E** — FAB open offset `bottom: calc(var(--hf-sheet-h) + 14px)` untouched; `--hf-sheet-h: min(55vh, 480px)` untouched.
- **F** — map route pixel-identical at 1280 / 768 / 375 (and desktop header identical at ≥769 — burger hidden, CTA row hidden).
- **G** — colors only via `--hf-*` tokens: CTA uses `--hf-primary` / `--hf-primary-ink`; the FAB shadow `rgba(0,0,0,0.4)` is a shadow value, not a color token (existing convention).
- **H** — touch targets ≥44 px on mobile: burger 44, CTA 48, panel rows 44, panel buttons 44; FAB 48.
- **I** — the header layer controls remain in the DOM at ≤768 (CSS-hidden) and keep their single-occurrence ids `gpsToggle` / `childrenToggle`; the panel and CTA copies are id-free (R5 — duplicate ids are the failure QA checks for).
- **J** — no new `flex-direction` declarations anywhere (spec §5; R3/C4 hard guard).
- **K** — no new `--hf-*` tokens (spec §5; palette unchanged).

## 5. Review conditions adopted

- **R1 (→ C9-4, C9-2):** theme buttons in the panel keep the **full** own-header class expression `btn btn-outline-secondary btn-sm` + dynamic `active`, never a subset (state the expression explicitly in C9-2).
- **R2 (→ C9-4):** CTA row is **not** hidden when the sheet opens — no `.app-sheet-open .hf-cta-row` rule; the old C7 exposure pattern is not repeated; QA records the flip as a known exposure, not a regression.
- **R3 (→ C9-4, C9-6):** zero `flex-direction` drift — the strict `check:layout` set is the hard guard, re-run immediately after C9-4 lands, not only at the end.
- **R4 (→ C9-2, C9-5, gate 7):** reconciled per review R4 — the panel **keeps no ids**; `id="childrenToggle"` remains **once**, on its desktop header copy (which stays in the DOM, CSS-hidden ≤768), so title/aria pairs are never duplicated; all other switches keep labels/titles; QA asserts single-occurrence ids; dead-selector grep must be zero.
- **C1 + C2 (blocking, → C9-4):** `.app-title-sub{display:none}` and `.hf-menu-panel{width:100vw}` are folded into C9-4 as floating conditions — C9-4 is not `done` without both.

## 6. Done-when

- C9-1…C9-6 all stamped `status: done` in this file, each with its validation result.
- All §3 gates green; implementation log complete in `.agents/implementation-cycle9.md`.
- All §4 invariants re-verified by QA (spec §3 rows 1–8), especially 15–48 px row audit and offcanvas lifecycle.
- Reviewer R-conditions R1–R4 and blocking C1/C2 evidenced in the diff and in the QA report; no open Blocking finding.
