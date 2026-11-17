# QA — Cycle 9 (mobile menu panel, CTA row, footer fix)

**Date:** 2026-11-17
**Scope:** the C9 delta only — `src/styles.css`, `src/components/AppShell.tsx`, `src/App.tsx` (uncommitted working tree, verified via `git diff` vs HEAD).
**Inputs:** `.agents/requirements-cycle9.md` (contract: C9-1…C9-6, 8 done-when rows, invariants A–K), `.agents/implementation-cycle9.md`, `.agents/review-cycle9.md` (R1–R5, conditions C1–C9), `docs/adr/0043-mobile-menu-panel-and-cta-row.md`.
**Method:** read-only. All gates run as the project's own checks; no production code modified; the only file written is this report.

## 1. Spec rows (done-when 1–8)

| # | Spec row | Verdict | Evidence |
|---|----------|---------|----------|
| 1 | ≤768 px header is one line: logo + title + 44×44 burger; subtitle dropped | **PASS** | `src/styles.css` L189 `.app-title-sub{display:none}`, L190 `.theme-group{display:none}`, L191 `.app-header .form-check{display:none}`, L192 `.app-header .hf-source-method{display:none}`, L193–199 `.hf-burger{display:inline-flex;…;min-height:44px;min-width:44px}`, L200 `.site-nav-link{display:none}`, L201 `.hf-footer-source{display:inline}`. No `.app-title-row` rule exists anywhere (grep: 0 hits) → review condition C1 satisfied. Burger markup `AppShell.tsx` L108–138: `type="button"`, `aria-label="Open menu"`, `aria-expanded={false}`, `aria-controls="mobileMenu"`, `data-bs-toggle="offcanvas"`, `data-bs-target="#mobileMenu"`, 18 px 3-bar SVG `aria-hidden`. |
| 2 | Panel carries functional theme control, 3 layer toggles, Source & Method | **PASS (structural; live interaction = owner visual)** | Offcanvas `AppShell.tsx` L143–180: `offcanvas offcanvas-end hf-menu-panel`, `tabIndex={-1}`, `id="mobileMenu"` (exactly one id), `aria-labelledby="mobileMenuLabel"` (L149 h2 `#mobileMenuLabel` "Menu" + `btn-close` `aria-label="Close menu"`). Body order exactly theme → `{mobilePanel}` → Source & Method. Theme group identical `mode`/`pickMode` expression with `aria-pressed` (L163–175). `mobilePanel` in `App.tsx` L179–208: 3 **id-less** form-switch copies, labels "Charity shops"/"GP practices"/"Children's", titles and `onChange` bindings identical to header copies (`setShowShops`/`setShowGps`/`toggleKind`). Source & Method button `data-bs-target="#methodologyModal"` (same modal as footer/header). Panel touch values `styles.css` L210–213: `.form-check{min-height:44px}`, `.form-check-input{scale:1.4}`, `.btn{min-height:44px}`, `.menu-theme{width:100%;justify-content:space-between;margin-bottom:0.75rem}`; panel `z-index:2100; width:100vw` (review condition C2 satisfied) L206–209. React has **no panel show state**: `useEffect` (`AppShell.tsx` L46–59) mirrors `shown/hidden.bs.offcanvas` onto burger `aria-expanded` with cleanup, `[]` deps — deterministically closed initial DOM (invariant A/B, ADR-0043). |
| 3 | Desktop header (≥769 px) unchanged | **PASS (by construction)** | Base rules `styles.css` L121–126: `.hf-burger{display:none}`, `.hf-cta-row{display:none}` replace the removed `.hf-start-here-toggle` base rule. Every C9 additive rule sits inside `@media (max-width:768px)`; the closed offcanvas is layout-inert (Bootstrap: `display:none` until `show` class, which Bootstrap JS owns and never sets server-side). All desktop-visible rules (`.app`, header, footer) pre-exist. |
| 4 | CTA row: full-width solid-primary "Start here" under header, mobile only, ≥48 px, bound to `startHereMobileOpen` | **PASS** | `styles.css` L217 `.hf-cta-row{display:block}` (≤768 only), L218–227 `.hf-start-here-cta{width:100%;min-height:48px;border:0;border-radius:0;padding:0.5rem 0;background:var(--hf-primary);color:var(--hf-primary-ink);font-size:1rem;font-weight:600}` — token-only colours. `AppShell.tsx` L140 `<div className="hf-cta-row">{headerCta}</div>` sits exactly between `</header>` and the offcanvas/`<main>`. `App.tsx` L213–222: `headerCta` = `button.hf-start-here-cta.btn`, `aria-expanded={startHereMobileOpen}`, `onClick` toggles state; `useState(true)` untouched (L63) so `hf-start-here-open` class composition on `.app` is unchanged. |
| 5 | FAB: 18 px aria-hidden list icon before label; gap 0.5 rem; align-items center; shadow `0 4px 16px rgba(0,0,0,0.4)`; position/left/z/48 px/labels untouched | **PASS** | `App.tsx` L238–252: `<svg width="18" height="18" viewBox="0 0 24 24" … aria-hidden="true">` (3 lines x1=8→20 at y=6/12/18 + 3 dots at x=4) precedes `{sheetOpen ? 'Close list' : 'Open list'}`; `aria-expanded`/`aria-controls="appPanel"`/`onClick` untouched. `styles.css` L410–428: added `gap:0.5rem`, `align-items:center`, shadow `0 2px 8px rgba(0,0,0,0.35)` → `0 4px 16px rgba(0,0,0,0.4)`; unchanged `position:absolute; left:50%; transform:translateX(-50%); bottom:14px; z-index:2000; min-height:48px; border-radius:999px; border:0; background:var(--hf-primary); color:var(--hf-primary-ink)`. |
| 6 | Footer no longer overlaps below tall content (D1) | **PASS (mechanism)** | `styles.css` L75–81: `.app { display:flex; flex-direction:column; min-width:0; min-height:100%; position:relative; }` — root-cause `height:100%` clamp released to `min-height:100%`, so `.app` (column: header / cta-row / main / footer) grows past the viewport and the footer follows the content. Verified no `height:100%` on `.app` (only pre-existing `html,body,#root` L68 and `.sheet-scrim` L374). Visual confirmation at 375/768/1280 is owner-visual (no browser tool this pass). |
| 7 | Map tiles 1280/768/375 pixel-identical (desktop unchanged; no layout regression) | **PASS (by construction + determinism gate)** | Argument: (a) all C9 CSS is base-hidden ≥769 px or 768 px-scoped; (b) closed offcanvas is display-none until user interaction; (c) no new `flex-direction` — the strict set is exactly 3 lines, `styles.css` L77 (`.app` column), L88 (`.app-body > .app` row), L294 (`.legend-grid` column) = the exact set `check:layout` enforces; (d) no new `--hf-*` tokens (git diff has zero `:root` hunks; `--hf-sheet-h` pre-existing from ADR-0041); (e) `npm run check:layout` OK and the double prerender below is byte-identical. Concrete 1280/768/375 visual pass: **needs-owner-visual** (see §3). |
| 8 | `npm test` green, no test edits | **PASS** | `node --test` → 26/26 pass, 0 fail (~3.1 s). No files under test changed by the delta (git diff touched only the 3 source files). |

## 2. Command gates (all run, all green)

| Check | Command | Result |
|-------|---------|--------|
| Type check | `npx tsc -b` | exit 0 |
| Tests | `node --test` | 26 pass / 0 fail |
| Layout invariant | `npm run check:layout` | `check-map-layout: OK` |
| Build | `npm run build` | green — 428.73 kB JS / 254.26 kB CSS, 171 files emitted (208 hospice pages) |
| Determinism | prerender ×2 → snapshotted `dist` to `.tmp/qa9-dist-A` / `.tmp/qa9-dist-B` → `diff -r` | **BYTE-IDENTICAL: PASS** (both runs "emitted 171 files (208 hospice pages)") |
| Sitemap | `grep -c '<loc>' dist/sitemap.xml` | **215** (= 208 hospices + index + 6 info pages) ✓ |
| Old toggle removed | `grep -rn 'hf-start-here-toggle' src/` | **0 hits** ✓ |
| Menu ids | `grep -rn 'mobileMenu' src/` | 5 hits, all `AppShell.tsx`: L118 `aria-controls`, L120 `data-bs-target`, L145 `id="mobileMenu"` (exactly one id), L146 `aria-labelledby`, L149 `id="mobileMenuLabel"` (exactly one) ✓ |
| Duplicate toggle ids | `grep -rn 'id="gpsToggle"\|id="childrenToggle"' src/` | exactly **1 each** (`App.tsx` L149, L162 — the header copies, CSS-hidden ≤768, per invariant I) ✓ |
| Z-ladder | `grep -n 'z-index' src/styles.css` | 1500 scrim (L372) < 1600 sheet (L398) < 1700 card (L469) < 2000 FAB (L418) < 2100 panel (L207); skip-link 3000 (L133) pre-existing ✓ |
| R2 exposure | `grep -n 'app-sheet-open .hf-cta-row' src/styles.css` | **0 hits** — the CTA is deliberately not hidden while the sheet is open (CSS comment L215–216 cites reviewer R2) ✓ as specified |
| Sheet invariants | `grep -n 'hf-sheet-h' src/styles.css` | `--hf-sheet-h: min(55vh, 480px)` L385; panel height L396; `.app-sheet-open .sheet-fab{bottom:calc(var(--hf-sheet-h) + 14px)}` L429–431 — all unchanged ✓; `.app-sheet-open .hf-start-here{display:none}` L474 present ✓ |

## 3. Findings

**Blocking: none (0).**

**Risk-accepted (documented debt, does not block):**

1. **R2 — CTA visible during open sheet (known exposure).** On ≤768 px the "Start here" CTA row remains visible (and state-flippable) while the bottom sheet is open, because no `.app-sheet-open .hf-cta-row{display:none}` rule exists. This is the reviewer's R2 parity decision: the old C7 bug (card visible in DOM while CSS-hidden) is deliberately *not* repeated; the state is now always observable by the user. Carried forward as known exposure, not a regression.
2. **Owner-visual pass not run by QA (1280/768/375).** No browser/screenshot tool is available in this session, so no pixels were inspected. Desktop pixel-identity is argued from base-hidden + media-scoped CSS, the strict flex-direction set, unchanged tokens, and the byte-identical double prerender (§2, row 7). **needs-owner-visual**: owner James to inspect the live site at 1280/768/375 after publish — header one-line, burger opens panel, CTA toggles card, footer below content (D1), FAB icon + shadow, sheet-over-CTA with note 1.
3. **Offcanvas live behaviour (focus trap, Esc, backdrop) not exercised.** Bootstrap 5.3 offcanvas library behaviour, wired per ADR-0043 (`data-bs-toggle="offcanvas"` on the burger, `data-bs-dismiss` on close, `shown/hidden.bs.offcanvas` for `aria-expanded` sync); only the wiring is structurally verified. Covered by the owner-visual pass above.
4. **Empty `.hf-cta-row` on content routes (cosmetic, zero impact).** `AppShell` always renders `<div className="hf-cta-row">` (L140); on non-map routes `headerCta` is undefined, so at ≤768 it is an empty `display:block` div of height 0, no padding/margin — no visual or layout effect. Noted for completeness.

**Note (not a finding):** the dispatch shorthand "headerExtras = ONLY Source & Method" is superseded by the authoritative contract (requirements C9-3, invariant I, review R4): the three header layer toggles must stay in the DOM (single-occurrence ids, CSS-hidden ≤768). The implementation follows the contract; ids verified single-occurrence (§2).

## 4. Checks not run, and why

- **Concrete browser visual pass at 1280/768/375** (burger → offcanvas open/close, panel control interaction, CTA card toggle, FAB restyle, D1 footer below content on all six content routes) — no browser/screenshot tool in this session; per dispatch recorded as needs-owner-visual, not a QA failure.
- **Offcanvas Esc / focus-trap / backdrop live behaviour** — same reason; library-provided behaviour, wiring verified structurally.
- **Dev-server run** — not required: static prerender gates + type check + test suite cover the delta's verifiable surface; D1's visual consequence is covered by the owner-visual pass.

## 5. Verdict

**PASS — 0 blocking findings.**

All 8 done-when rows verified (table §1), all seven mandated command gates green (§2), all review conditions C1–C9 satisfied in final file state, invariants A–K intact, z-ladder 1500<1600<1700<2000<2100, colours via tokens only (FAB `rgba(0,0,0,0.4)` shadow literal sanctioned by review, matching the pre-existing FAB shadow family), no new `--hf-*` tokens, no new `flex-direction`. The single intentional exposure (R2 CTA-while-sheet-open) is risk-accepted by design. Remaining residual: owner-visual pass at three viewports after publish.
