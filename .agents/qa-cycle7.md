# Cycle 7 (C7) — Stage 6 QA Report

**Scope:** automated checks A–H of `.agents/requirements-cycle7.md` (in-browser items §8.3–9 are the owner's manual gate — see §7).
**Date / author:** 2026-11-15, qa-engineer (Stage 6).
**Inputs needed to complete this stage:** `.agents/requirements-cycle7.md` (contract), `.agents/implementation-cycle7.md` (claims audited), `.agents/qa.md` § C7 (Coding's W6/W8 records), source snapshot of the 5 C7 surface files + worktree state.
**Rules observed:** no production file modified, no commit/push; lead's disk-verified facts (W6 no-change, W2 1px reconciliation, W4 change required, W8 items 3–9 owner-gated, postcodes.ts pre-C7) treated as ground truth and NOT re-flagged.

VERDICT: __PENDING__ (final line of this file is authoritative)

## 1. Gate re-runs (check H) — executed 2026-11-15

| Gate | Exact output | Result |
|---|---|---|
| `npm test` | 23 pass / 0 fail (3134 ms), exit 0 | PASS |
| `npm run check:layout` | `check-map-layout: OK`, exit 0 | PASS |
| `npm run build` (single, sanity) | `✓ built in 914ms`; wrangler prerender `emitted 171 files (208 hospice pages)`; `find dist -type f \| wc -l` → **231** | PASS |

Build asset hashes reproduce the Coding double-build record in `.agents/qa.md` § C7/W8: css `index-Dn97-FzZ`, js `index-D61LFkAW`. The app is client-rendered (`<div id="root"></div>` empty at prerender), so prerendered HTML carries only the two hashed asset references — consistent with "prerender output byte-identical across double builds except asset references".

## 2. Per-check results A–G

| # | Check | Result | Evidence |
|---|---|---|---|
| A | W1: 4-line mobile header inside the 768px block; 1280 px desktop pixel-unchanged | PASS | `src/styles.css:202–209` — exactly the 8 contracted C7 header lines, all inside `@media (max-width: 768px)`. Line logic: `.app-title-row{width:100%}` (L202) forces line 1 (logo+title+subtitle ≤351 px); theme row already 100 % (L196–199, pre-C7) = line 2; 3× `.form-check{width:40%}` (L204) + hidden `.hf-source-method` (L207) + `.hf-start-here-toggle{…width:40%}` (L206) → slot layout 2+2 = lines 3–4, each ≤ 80% + 8px gap ≤ 351 px budget (375 − 2×12). Desktop: the only new **base** rules are `display:none` (L115 `.hf-footer-source`, L121 `.hf-start-here-toggle`) and the 1:1-mirror `.hf-start-here` (L249) — all desktop-inert; 1280 px footer/header unchanged. |
| B | W2/W3: CSS rule order, base-rule 1:1 mirror, `useState(true)`, toggle `aria-expanded`, no `aria-controls`, `select()` closes sheet+card same step | PASS | Order in the 768px block matches the contract exactly: L432 `.hf-start-here{display:none}` → L435 `.hf-start-here-open .hf-start-here{…}` (open geometry) → L453 `.app-sheet-open .hf-start-here{display:none}` **last** → L458 `.leaflet-top.leaflet-left{left:auto;right:10px}` → L462 `.app-selection{max-height:min(45vh,260px)}`. 1:1 mirror: `git show HEAD:src/components/StartHere.tsx` inline style = `position:absolute; top:12; left:36; z-index:1000; width:320px; max-width:calc(100% - 48px)` ≡ `src/styles.css:249–256`. State: `startHereMobileOpen` `useState(true)` at `src/App.tsx:55`. Toggle `aria-expanded={startHereMobileOpen}` at `src/App.tsx:184`; the toggle button carries **no** `aria-controls` (the only occurrence in src is the pre-existing sheet-fab, `src/App.tsx:282`). `select()` calls `closeSheet()` and `setStartHereMobileOpen(false)` in the same step (`src/App.tsx:41–46`). W2 1px reconciliation (`width:auto; max-width:320px` → 319 px at 375 px) is the documented/lead-approved variant — not flagged. |
| C | W4: ResizeObserver → `invalidateSize()` → `disconnect()`, no new imports/deps | PASS | `src/components/MapView.tsx:66–75` `ContainerResizeInvalidator`: `useMap()`, RO on `map.getContainer()`, `map.invalidateSize()` on fire, `ro.disconnect()` in effect cleanup, mounted inside `<MapContainer>` (before polygons). Imports unchanged — `useEffect`/`useMap` already present (L1–14); no `package.json` change (browser-native RO). No duplicate/legacy resize handling: grep for `invalidateSize` / `addEventListener('resize')` in `src/` → only the new component matches. |
| D | W5: `--hf-sheet-h` one definition, two consumers, no residual `min(55vh,480px)` literal | PASS | `min(55vh` occurs exactly once in `src/` — `src/styles.css:366` (the token definition). Consumers: L377 (`.app-panel` height) and L409 (`.app-sheet-open .sheet-fab` bottom offset). 1 definition + 2 consumers, drift impossible. |
| E | W7: `git diff --name-only -- src` shows only the 5 surface files | PASS | Output: `App.tsx, AppShell.tsx, MapView.tsx, StartHere.tsx, postcodes.ts, styles.css`. The 6th, `postcodes.ts`, is pre-C7 (lead ground truth: mtime 05:17, before the C7 session's 18:3x mtimes) — carried as dirty-tree state, not a C7 surface. All 5 manifest files present; no extra file. |
| F | Hard constraints: no `:has()`, 3-pair `flex-direction` set unchanged, allowed mobile surface only | PASS | `:has(` → 0 occurrences in `src/`. `flex-direction` → exactly 3 lines: `src/styles.css:77` (`.app` column), `:89` (`.app-body > .app` row), `:275` (`.legend-grid` column) — the gate's complete set, unchanged. Every C7 declaration uses allowed properties: display, position + offsets, width/max-width/max-height, overflow-y, z-index, border-radius, box-shadow, padding, font-size — plus the one permitted custom property `--hf-sheet-h`. No declarations outside the 768px block except the three desktop-inert base rules (check A). |
| G | R4/R6 determinism: no `window`/`typeof window`/storage/matchMedia branching on first render | PASS | C7-introduced state is plain `useState(true)` (`src/App.tsx:55`) with no environment branch. Repo-wide `window.` grep → `lib/useRoute.ts` (hash routing), `main.tsx` (client entry — never runs at prerender), `lib/theme.ts` — all pre-existing, none touched by the C7 diff. Server ↔ client first-render equality corroborated by the byte-identical double build (assets reproduced, §1). |

## 3. Findings

| ID | Severity | Summary |
|---|---|---|
| C7-QA-1 | RISK-ACCEPTED | W8 item-2 DOM-delta summary in the contract is internally inconsistent with W1/W3 — implementation is correct and complete |
| C7-QA-2 | RISK-ACCEPTED | W4 invalidator is undebounced; initial-observe no-op + per-frame `invalidateSize()` during continuous resize (official Leaflet pattern) |
| C7-QA-3 | RISK-ACCEPTED | Zero automated regression coverage for the entire 768 px mobile layout (23 tests are data/logic only; items 3–9 owner-gated by design) |

### C7-QA-1 — RISK-ACCEPTED — contract wording drift (W8 item 2)

`requirements-cycle7.md` §8 item 2 describes the first-render DOM delta as "exactly +1 static header toggle button … and the StartHere card class/style relocation — no other attribute change". The same contract mandates two additional first-render DOM deltas elsewhere: W1's +1 footer `Source & Method` link (`AppShell.tsx`) and W3's `.hf-start-here-open` class on `.app` (`App.tsx:192`). Coding's record (`implementation-cycle7.md`, W8 "client first-render delta") enumerates all four deltas honestly. The substantive requirement — server JSDOM first render ≡ client first render (R4/R6) — is met: no state branches on environment (check G), and the double build is byte-identical. This is a one-line summary that became stale relative to the rest of the contract, not an implementation defect. No code action; recommend the next cycle correct the §8 item-2 wording when it is next touched.

### C7-QA-2 — RISK-ACCEPTED — W4 ResizeObserver not debounced

`MapView.tsx:70`: the RO callback calls `map.invalidateSize()` unconditionally, with no throttle/debounce. Two consequences: (1) ResizeObserver fires once on initial `observe()`, so exactly one `invalidateSize()` runs right after `MapContainer` init — a harmless no-op on a freshly sized map; (2) during a continuous window resize or device rotation the callback fires per frame, and because `invalidateSize()` defaults to `pan=true`, the view can shift briefly mid-resize. This is the official Leaflet pattern for container-size tracking (which W4/D4 explicitly prescribes: "ResizeObserver + invalidateSize, the official Leaflet layout, no new dependency"), and the contract prescribes no debounce. On the 10k-practice `preferCanvas` layer, per-frame invalidation during a drag-resize can cause momentary tile gaps — observable in owner-gate item 3 (marker/tile alignment at 375 px). Accepted as-is; if the live check shows jank, a `requestAnimationFrame`-coalesced callback is a one-line follow-up (out of this pass's scope).

### C7-QA-3 — RISK-ACCEPTED — no automated regression coverage for the mobile layout

The 23/23 test suite covers data/logic only (postcode shape/lookup, vector, tessellation). Every visual acceptance of W1–W3 — 4-line header at 375 px, 319 px card geometry with 44 px right band, no page scroll, ≤2 reachable scroll regions (OQ1), 320 px overflow bound, footer contrast in-browser, marker/tile alignment after sheet open — is owner-gate items §8.3–9, and the repo ships no browser automation (`layout-detect` in `package.json` is a manual probe; Coding's W8 record documents this choice deliberately). Result: the entire C7 mobile layout (the heart of this cycle) has zero automated regression protection — a later CSS edit inside the 768px block will be caught only by the manual gate. Accepted by contract (items 3–9 are explicitly the owner's manual ship gate); carried as forward debt. Recommendation for a later cycle: one Playwright viewport assertion (375×812: header row count, `#root` scrollWidth ≤ 375, `.hf-start-here` box 319×…, `.app` max scrollY = 0) would pin the whole layout.

---

## 4. Missing test coverage (registry)

| Gap | Status | Route |
|---|---|---|
| 375×812 screenshot matrix / no-page-scroll / scroll-region ≤2 (OQ1) | Owner-gate §8.3, §8.4, §8.5 | Manual, by design (C7-QA-3) |
| Footer link contrast in-browser (W6 owner confirmation) | Owner-gate §8.6 | Manual; static computation already in `.agents/qa.md` § C7 (light 4.5008:1 / dark 7.4719:1, both PASS) |
| Marker/tile alignment after sheet open-close, 320 px overflow (W4/W2) | Owner-gate §8.7, §8.8 | Manual (see C7-QA-2) |
| a11y order / aria / focus pass at 375 px | Owner-gate §8.9 | Manual |
| Automated 768px-block layout assertion (regression pin) | Absent | Later cycle (C7-QA-3) |
| `npm run layout-detect` probe | Manual script, never automated | Carried forward from C5/C6 practice |

No automated gap is a C7 blocker: the contract assigns every in-browser item to the owner.

## 5. Standards-axis observations

- No convention deviations found. New CSS rules carry work-item + ADR provenance comments (`/* C7/W1 (ADR-0039): … */`, `/* C7/W5 (ADR-0041): … */`) matching the file's existing style; the new `MapContainer` child component follows the file's established helper pattern (`FitToNation` / `FitToSelection`); JSX comments in `App.tsx` use the same `C7/W3 (ADR-0038 re-issued, option b)` style.
- No duplicated logic: sheet height token consumers reference the custom property only; the W4 component reuses the existing `useMap`/Leaflet API surface without duplicating `FitToNation`'s behaviour.
- No dead code: `startHereMobileOpen` is consumed (L184, L192); `hf-footer-source`/`hf-start-here-toggle` base rules are both consumed by their mobile counterparts; `ContainerResizeInvalidator` is mounted.
- No tautological tests introduced (no C7 test files were added — see §4 for the coverage gap).

## 6. Spec-axis observations

- All W1–W9 items present in the diff; nothing beyond the surface was modified (check E). C8 work visible in `StartHere.tsx` (tier-2 geocode state machine, `catchments` prop) and `postcodes.ts` is pre-existing dirty-tree state, not a C7 claim, and is outside C7's acceptance surface.
- W6: PASS-without-change per the lead-verified record (light 4.5008:1 passes AA with +0.0008 margin; dark 7.4719:1; contingent mobile footer-link token correctly not triggered). The light-theme margin is razor-thin — noted for the owner's information only; changing `--bs-link-color` would alter 1280 px pixels and is explicitly out of C7 scope.
- W9: ADRs `docs/adr/0038–0041` all exist (mtime 2026-11-15). An initial glob for `003[89].md`/`004[01].md` spuriously returned "No files found" (tool artifact); a plain directory listing confirms all four files. No finding.
- Every acceptance item of the contract that falls inside the automated scope is satisfied; the contract's own §8.3–9 list is the only unverified remainder, and it is owned by the user.

## 7. Out of scope (owner's manual gate — not automated in this pass)

`.agents/requirements-cycle7.md` §8 items 3–9: 375×812 screenshot matrix (sheet open/closed, card open/closed), no-page-scroll check, reachable-scroll-region count ≤2, footer contrast confirmation in-browser, marker/tile alignment after sheet open-close, 320 px overflow check, a11y order/aria/focus pass. Plus W6's in-browser footer-contrast confirmation. These run on the owner's device/browser; the automation above verifies everything short of pixel-level live rendering.

---

VERDICT: **PASS (0 Blocking)** — 0 Blocking, 3 RISK-ACCEPTED (C7-QA-1 contract wording drift; C7-QA-2 undebounced RO invalidation, official pattern; C7-QA-3 no automated mobile-layout regression coverage, owner-gated by design). All automated checks A–H pass with evidence above; gate re-runs reproduced: `npm test` 23/23, `check:layout` OK, build 231 dist files with matching asset hashes.
