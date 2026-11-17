# Cycle 9 — Review artifact (stage 3, pre-implementation constraint review)

Owner: Reviewer (in-lead). Date: 2026-07-08. READ-ONLY pass: this file is the
only write. Inputs per dispatch: `.agents/feature-cycle9.md` (whole),
`.agents/architecture-cycle9.md` (whole), `.agents/research-cycle9.md`
(Risks + D1 root cause) + targeted spot checks (styles.css, App.tsx,
AppShell.tsx, ADR-0043, package.json, scripts/check-map-layout.mjs,
scripts/prerender.mjs, tests/).

Supersedes the earlier 2026-11-16 review pass at this path. Useful notes
carried forward: its sheet-open CTA exposure observation (now R2 below) and
its dead-selector audit (now R3 below). One of its items ("panel keeps
`id='childrenToggle'`") is **rejected** — it contradicts research risk 2 and
architecture §2 (panel copies id-less) and would create duplicate ids.

## 1. Verdict

**PASS-WITH-CONDITIONS** — the architecture maps cleanly onto the acceptance and
every spot-check claim is accurate against source. Two blocking gaps, each a
one-line CSS addition (title subtitle not hidden; panel 100vw stated in prose
but absent from the CSS block), plus recommended conditions below. No redesign
required.

## 2. Constraint coverage (each "Done when" → architecture section)

| # | "Done when" clause | Arch | Assessment |
|---|---|---|---|
| 1 | ≤768 px header = one line: logo + title + ☰; **no subtitle** | §2 | **GAP** — proposed ≤768 block never hides `.app-title-sub` (renders in title row, AppShell.tsx L22; current ≤768 rule only shrinks font, styles.css:198-199). As written, line 1 = logo + title + **subtitle** + ☰. Finding F1. |
| 2 | Panel = theme segmented control (same `aria-pressed`+`pickMode`), three layer toggles (same state wiring), Source & Method (same `#methodologyModal` target); all functional from the panel | §2 | ok — verbatim header markup (AppShell.tsx L23-25: `aria-pressed={mode===t.value}`, `pickMode`), `mobilePanel` slot re-binds App.tsx state (`showShops`/`showGps`/`childrenMode`+`toggleKind`, App.tsx:159-182), S&M `data-bs-target="#methodologyModal"` (same target as footer link, AppShell.tsx L106). Minor: 100vw in prose, missing from CSS block — Finding F2. |
| 3 | Desktop ≥769 px (esp. 1280 px) header pixel-unchanged | §2, §3, §5 | ok — burger base `display:none` (layout-inert); closed offcanvas is fixed off-screen (Bootstrap default, zero in-flow footprint); CTA row base `display:none`; all new rules ≤768-scoped; theme control + headerExtras untouched at ≥769; old 4-line block (styles.css:175-210) removed in full. |
| 4 | "Start here" = full-width solid-primary CTA row, ≥48 px, under header, mobile only, toggles existing `startHereMobileOpen` disclosure; card behaviour unchanged | §3 | ok — `headerCta` slot + `.hf-cta-row` between header and main (`min-height:48px`, `--hf-primary`/`--hf-primary-ink`, `width:100%`); state untouched (App.tsx:55, deterministic `true`); `.hf-start-here-open` composition (App.tsx:192), select-closes-card (App.tsx:41), styles.css:432-453 all verbatim; old button + both its CSS rules (styles.css:121,206) removed. |
| 5 | "Open list" FAB: icon + text pill, stronger shadow, ≥48 px, position/offset/z-order unchanged | §3 | ok — `gap`/`align-items` + shadow `0 4px 16px rgba(0,0,0,0.4)` scoped to ≤768 only; `left:50%`/`translateX(-50%)`/`bottom:14px`/`z-index:2000` (styles.css:396-399), open offset `calc(var(--hf-sheet-h) + 14px)` (styles.css:408-410), `--hf-sheet-h` (styles.css:366) and scrim 1500 untouched. |
| 6 | `#about` + all content pages: no footer overlap at any width | §4 | ok — fix verified against the mechanism: `.app{height:100%}` (styles.css:80) + `main.app-body{flex:1 1 auto; min-height:0}` **with no overflow** (styles.css:139-143) ⇒ tall content flex item stretches past the clamped main and paints over the footer; document can't scroll (#root capped 100%). `min-height:100%` releases the clamp → document scrolls, footer below. Map route: inner `.app` fills exactly the viewport (card/FAB/scrim are absolutely positioned, don't extend flow height) ⇒ unaffected. |
| 7 | Map page pixel-identical at 1280/768/375 | §4 | ok — content ≤100vh ⇒ `min-height:100%` resolves to the same value as today's `height:100%`; re-verified via check:layout + double prerender per §4.5. |
| 8 | `npm test` green | §4.5 | ok — see §4 Test impact: 26-test baseline carries **no** header assertions; suite stays green with zero test changes. |
| 9 | `npx tsc -b` passes | §2-§3 | ok — only `import type { ReactNode }` + two optional props; no type-surface change. |
| 10 | `npm run check:layout` passes | §4.5 | ok, conditional — the script is a STRICT full-set-equality gate (found set must be exactly {.app→column, .app-body>.app→row, .legend-grid→column}); the proposed CSS contains no `flex-direction` declaration, so it passes as written. Condition C4 makes "no new `flex-direction`" a hard rule + immediate re-run. |
| 11 | Double `node scripts/prerender.mjs` byte-identical; sitemap 215 `<loc>` | §4.5 | ok — by construction: prerender emits per-page head + empty `<div id="root">` + boot script and **never snapshots React DOM** (scripts/prerender.mjs, `buildPage`); it is a pure function of data + dist asset hashes, so C9 markup/CSS changes are invisible to it. No routes added/removed ⇒ AC2 `hospices.length + 7` = 208 + 7 = 215 holds. |

## 3. Invariant audit (a)–(j)

| (a) `startHereMobileOpen` deterministically `true` (JSDOM / prerender) | **ok** — state untouched (App.tsx:55 `useState(true)`); CTA row reuses it; `.hf-start-here-open` class composition (App.tsx:192) and `select()` card-close (App.tsx:41) unchanged. |
|---|---|
| (b) menu panel static markup, initially closed | **ok** — architecture §2 markup has no `show` class and no React open state; bootstrap owns the class via `data-bs-toggle="offcanvas"`; React only syncs burger `aria-expanded` off `shown`/`hidden.bs.offcanvas` events. First server/JSDOM/client paint = closed, identical. |
| (c) z-order 1500/1600/1700/2000 + new 2100; bootstrap backdrop ~1040 < 1500 | **ok** — verified in styles.css: scrim `z-index:1500` (L349-358), sheet `.app-panel` 1600 (L380), start-here card 1700 (L433), FAB 2000 (L396). New `.hf-menu-panel: 2100` adds one top rung; Bootstrap 5.3 offcanvas backdrop (~1040) sits below the sheet scrim, so an open menu + open sheet remains legal. |
| (d) `--hf-sheet-h` + FAB offset math untouched | **ok** — `--hf-sheet-h: min(55vh,480px)` (styles.css:366), `bottom:14px` (L398), open offset `calc(var(--hf-sheet-h) + 14px)` (L409) verbatim in architecture §3. |
| (e) `.app-sheet-open .hf-start-here{display:none}` untouched | **ok** — styles.css:453; no C9 CSS in architecture §2/§3/§4 touches it. (Interaction with the CTA row: see recommended note R2.) |
| (f) tokens only via `--hf-*` | **ok** — CTA row `var(--hf-primary)`/`var(--hf-primary-ink)`; panel `--hf-surface`/`--hf-border`/`--hf-text` (both `:root` blocks, styles.css:28-44/50-62); FAB shadow `rgba(0,0,0,0.4)` matches the existing shadow-literal convention (`.app-panel` `0 -4px 16px rgba(0,0,0,0.25)` L384; current FAB `0 2px 8px rgba(0,0,0,0.35)` L403). No new `--hf-*` tokens, no `:root` changes. |
| (g) ≥44/48 px touch targets | **ok** — CTA row `min-height:48px`; FAB keeps `min-height:48px` (styles.css:399); burger `min-height:44px`; panel `.form-check`/`.btn` `min-height:44px` (architecture §2 CSS). |
| (h) desktop ≥769 px unchanged | **ok** — covered by table row 3: all C9 CSS is ≤768-scoped; new DOM (burger, closed offcanvas, CTA row, FAB icon) is CSS-hidden or layout-inert at ≥769. |
| (i) check:layout flex-direction invariant preserved | **ok, conditional** — scripts/check-map-layout.mjs asserts the found set of ALL `flex-direction` declarations equals exactly {.app→column (L77), .app-body>.app→row (L89), .legend-grid→column (L275)}; any new declaration anywhere fails. Proposed CSS introduces none ⇒ passes; Condition C4 locks this in. |
| (j) byte-identical double prerender feasible | **ok** — see table row 11; the React DOM is never in the prerender output, so a second run over the same build is trivially identical. |

## 4. Test impact

- `npm test` = `node --test` → 3 files, **26 tests** (`tests/postcodes.test.mjs`,
  `tests/handler.test.mjs`, `tests/postcodes-client.test.mjs`; shared vector
  module `tests/postcode-vectors.mjs`). All 26 are C8 postcode/handler scope.
- Verified: **no header/DOM/CSS assertions exist** — no occurrence of
  `app-header`, `theme-group`, `hf-start-here`, `hf-burger`, `menu-panel`,
  `sheet-fab` or route-HTML assertions in `tests/`.
- The architecture's "Coder updates only superseded assertions" clause is
  therefore **safe and vacuous**: zero assertions are superseded by this
  design; expectation is 26/26 with zero test file changes. Record the 26/26
  run in `.agents/implementation.md` (Condition C7).
- No new tests are mandated by the acceptance (M1/M2/M3 verification rides on
  the visual 375/768/1280 checks + the gate list); that is a QA-stage
  consideration, not a review blocker.

## 5. Findings

**Blocking**

- **F1 — Title subtitle not hidden (acceptance: "No subtitle").**
  Architecture §2's proposed ≤768 block lists rules for `.app-title-row`,
  `.hf-burger`, theme/toggles/S&M hidden, `.site-nav-link`,
  `.hf-footer-source`, `.hf-menu-panel` — but has **no rule for
  `.app-title-sub`**. The subtitle div is rendered by AppShell.tsx L22
  (`<div className="app-title-sub">`), and the existing ≤768 rule
  (styles.css:198-199) only sets `font-size:0.75rem`. Implemented as
  written, the one-line header is logo + title + **subtitle** + ☰, which
  violates M1. Fix is a one-liner in the proposed block:
  `.app-title-sub { display:none }` (Condition C1).
- **F2 — Panel width stated in prose, missing from CSS.**
  Architecture §2 prose: "panel width: 100vw (covers the phone; it is a
  control panel, not a nav list)". The proposed `.hf-menu-panel` rules carry
  only `z-index:2100` (+ inner rules) — **no width declaration**. Bootstrap
  5.3's default offcanvas width is 400 px (`--bs-offcanvas-width`), which
  overflows a 375 px viewport (400 > 375): the panel would extend ~25 px past
  the left edge on the target device. Implement the stated intent: add
  `width:100vw` to `.hf-menu-panel` in the ≤768 block (Condition C2).

**Recommended (non-blocking)**

- **R1 — Panel theme button: replicate the FULL class expression.**
  Architecture §2 lists the panel buttons as `btn btn-outline-secondary
  btn-sm` with `aria-pressed`/`onClick`, but the header buttons they copy
  include the dynamic `active` class — AppShell.tsx L24:
  `{'btn btn-outline-secondary btn-sm' + (mode === t.value ? ' active' : '')}`.
  "Verbatim" covers it, but state it explicitly so the panel's active theme
  button renders identically (visual parity is the point of "same markup").
- **R2 — CTA row vs open sheet: leave as-is (carry-forward from prior
  review; QA note, not a change).** While the sheet is open,
  `.app-sheet-open .hf-start-here` is `display:none` (styles.css:453) but
  the CTA row stays visible — it lives in AppShell (outside the map's
  `.app-sheet-open` subtree), and tapping it flips `startHereMobileOpen`
  invisibly (the card reappears only after the sheet closes, if the state was
  toggled back on). This is **parity with C7**: the old `hf-start-here-toggle`
  sat at the same shell level with identical exposure. Do not add
  `.app-sheet-open .hf-cta-row{display:none}`; flag to QA so it is not
  raised as a regression.
- **R3 — Dead-selector audit (carry-forward).** `hf-start-here-toggle` has
  exactly three in-tree sites: App.tsx:183 (button), styles.css:121-123 (base
  `display:none`), styles.css:206 (≤768 `inline-flex; width:40%`). All three
  go with the button; grep must return **zero** occurrences in `src/` after.
- **R4 — Panel toggle copies must be id-less.** Research risk 2 +
  architecture §2: ids `gpsToggle`/`childrenToggle` (App.tsx:161,172) stay on
  the desktop header copies; panel copies carry no ids (label wrapping
  provides association). The prior review's item "panel keeps
  `id='childrenToggle'`" is rejected — it would create duplicate ids,
  breaking label association. QA should assert single-occurrence ids.
- **R5 — Old ≤768 block replaced in full.** The new block fully supersedes
  styles.css:175-210; the carry-retained rules must survive verbatim in the
  new block: `.site-nav-link{display:none}`, `.hf-source-method{display:none}`
  (via the combined `display:none` rule), `.hf-footer-source{display:inline}`
  — all three are present in architecture §2. Verify no re-introduction of
  `.app-title-row{width:100%}` (the empty rule in §2 is a marker, not a
  declaration).

## 6. Risk review (research §7, all 8 risks)

| # | Research risk | Closed by | Status |
|---|---|---|---|
| 1 | Who owns the panel open class | arch §2: `data-bs-toggle="offcanvas"` burger; Bootstrap owns `show`/focus trap/Esc/backdrop; React only syncs `aria-expanded` via `shown`/`hidden.bs.offcanvas` | **closed** |
| 2 | Duplicate DOM ids (`gpsToggle`/`childrenToggle`) | arch §2 "id-less" panel copies + R4 above; QA single-id assertion | **closed** |
| 3 | Panel content per route | `mobilePanel` prop is passed only on the map route (content routes render `<AppShell>` bare — App.tsx content-route check returns without extra props), so content pages get theme + Source & Method only; burger exists in the base header on all routes → no theme-control regression on content pages | **closed** |
| 4 | D1 verification surface | arch §4.5: `min-height:100%` + check:layout + double prerender + 375/768/1280 footer-below-content on all six content routes | **closed** |
| 5 | C7 invariant tests | verified: the 26-test suite contains no header/DOM assertions → "update only superseded assertions" is a safe no-op | **closed** (vacuously) |
| 6 | z-order ladder audit | exactly one new value (2100); backdrop ~1040 < scrim 1500; 1500/1600/1700/2000 literal-verified unchanged in styles.css | **closed** |
| 7 | Superseded ADR (ADR-0039) | ADR-0043 exists (`docs/adr/0043-mobile-menu-panel-and-cta-row.md`, status proposed, supersedes ADR-0039's mobile-header part; footer link retained per ADR-0039); GLOSSARY update listed in arch §7 | **closed** |
| 8 | Offcanvas instance per page | offcanvas renders once in AppShell, which persists across route changes (single instance, no key) → no unmount/re-init; only slot children are conditional | **closed** |

## 7. Conditions to implementation

- **C1 (Blocking, fixes F1):** add `.app-title-sub { display:none }` to the
  ≤768 block of the proposed CSS.
- **C2 (Blocking, fixes F2):** add `width:100vw` to `.hf-menu-panel` in the
  ≤768 block, so the offcanvas covers the full phone width.
- **C3:** panel theme buttons use the full header class expression including
  the dynamic `active` class (R1) — not just the static
  `btn btn-outline-secondary btn-sm`.
- **C4:** no new `flex-direction` declaration may be added anywhere in
  styles.css; the Coder re-runs `npm run check:layout` immediately after the
  CSS edit and records the pass in `.agents/implementation.md` (strict-set
  gate, scripts/check-map-layout.mjs).
- **C5:** panel toggle copies are id-less; the header keeps
  `id="gpsToggle"`/`id="childrenToggle"` with their existing labels/titles
  (R4). QA asserts each id occurs exactly once in a rendered page.
- **C6:** after removal, `grep -rn "hf-start-here-toggle" src/` must return
  zero occurrences (all three sites: App.tsx:183, styles.css:121-123,
  styles.css:206) (R3).
- **C7:** run `npm test` and record the 26/26 result with zero assertion
  changes in `.agents/implementation.md` (see §4; any test change is a
  review regression).
- **C8:** do NOT hide the CTA row while the sheet is open — leave the
  CTA-row-while-sheet-open behaviour as-is (parity with the old C7 toggle,
  R2); QA flags it, not the Coder.
- **C9:** keep verbatim: `main.app-body{min-height:0}` (styles.css:139-143),
  the `--hf-sheet-h` chain (styles.css:366, 398, 409),
  `.app-sheet-open .hf-start-here{display:none}` (styles.css:453), and the
  mobile FAB's 48px/pill/position literals (styles.css:392-410).

Sign-off: conditions C1–C9 satisfied ⇒ build as per architecture §2–§4;
recommend proceeding to PM/Coding.
