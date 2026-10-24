# Stage 2 — Root Cause: "map not rendering on desktop"

Repo: `C:\Users\james\source\repos\HospiceInfo`, branch `main`, HEAD `ed37091`.
Layout last changed by `e4b8503` (parent `dc3cf4d`); `git diff e4b8503 HEAD` for
`src/styles.css`, `src/App.tsx`, `src/components/AppShell.tsx`,
`src/components/MapView.tsx` is empty (verified 2026-10-24).

## 0. Verdict (TL;DR)

- Root cause **confirmed** (independently re-verified, §1): the `.app` rule
  (src/styles.css:11–17) lacks `flex-direction: column`, so the outer app shell
  (header/main/footer) lays out as a flex **row**; the incompressible header
  squeezes `main` to 45–309px at 1366–2560px widths, leaving the Leaflet map
  0–120px of space → "map not rendering on desktop".
- The Stage 1 suggestion of a **one-line** fix is **insufficient and
  mobile-breaking** (§2): the `.app` class is **shared by two nested elements** —
  the outer shell (`AppShell.tsx:21`) and the inner map container
  (`App.tsx:107`) — both of which must be flex containers with **different**
  `flex-direction` values, and the inner one additionally needs
  `flex: 1 1 auto` (width driver).
- **Minimal fix** = two CSS changes in one file (src/styles.css), §4: (1) add
  `flex-direction: column;` to the `.app` rule; (2) new rule
  `.app-body > .app { flex: 1 1 auto; flex-direction: row; }`.
- Regression test = dependency-free static CSS check
  `scripts/check-map-layout.mjs` wired as `npm run check:layout`, §5. No new
  runtime or dev dependencies.

## 1. Re-verification of Stage 1 claims

Every claim from `.agents/diagnosis.md` was independently re-derived against the
committed tree (not rubber-stamped). Sources cited: src/styles.css (305 lines,
line numbers as in HEAD `ed37091`), src/AppShell.tsx, src/App.tsx,
src/components/MapView.tsx, src/components/Methodology.tsx, src/main.tsx,
package.json, and git history (`git show e4b8503`, `git show dc3cf4d:...`).

| # | Claim (diagnosis.md) | Re-verification | Result |
|---|---|---|---|
| 1 | `.app` (styles.css:11–17) has `display:flex` + `min-width:0; min-height:0; height:100%; position:relative` and **no** `flex-direction` | Read in full at HEAD; comment at :8–10 even describes "the top-level app container" — a phrasing that itself signals the shared-class hazard (§2) | **Confirmed** |
| 2 | `e4b8503` removed `flex-direction: column;` from `.app` | `git show e4b8503 -- src/styles.css` hunk: `-flex-direction: column;` alongside removal of `height:100vh` and `overflow:hidden`, addition of `min-width/min-height/height:100%/position:relative` | **Confirmed** |
| 3 | `dc3cf4d` (parent) had `flex-direction: column` on `.app` | `git show dc3cf4d:src/styles.css`: `.app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }` | **Confirmed** |
| 4 | Outer shell `.app` (AppShell.tsx:21) stacks header/main/footer **horizontally** today | AppShell.tsx:21 `<div className="app">`, children: skip-link :22–24 (`position:absolute`, .skip-link css :38–45 → out of flow), `<header class="app-header">` :25–45 (`flex: 0 0 auto`, styles.css:19–20), `<main class="app-body">` :47–49, `<footer class="app-footer d-flex flex-wrap ...">` :50–58 (default `flex: 0 1 auto`). With no `flex-direction` the default is **row** | **Confirmed** |
| 5 | `main.app-body` shrinks: main: 45px@1366 … 309px@2560 | Row layout: items sorted by leftmost-first tie-break. Main (nearest leftmost, leftmost) wins first 341px max-content; map's 0px hypothetical box lands within that free space and donor (footer, end of row) loses as much as the gap: @1366 → 1366−260−761−200=145px donor loss; main 45, gap 296px, map 0 (120px cap irrelevant, gap < cap). @2560 → donor loss 339px; main 45, gap 496px, map 120px | **Confirmed** (diagnosis gave 45/309/120 end points — match) |
| 6 | Inner `.app` (App.tsx:107) max-content = 341px | Children in flow: `aside.app-panel` (flex `0 0 340px` + `border-right: 1px`, styles.css:59–65) → 341px; `div.app-map` (flex `1 1 auto`, styles.css:119–123) hypothetical = auto (max-content) = 0px because its in-flow children are absent: `app-map-canvas` is `position:absolute; inset:0` (styles.css:125–128; applied to MapContainer at MapView.tsx:161–170), `app-selection` is `position:absolute` (styles.css:131–139), `Methodology` renders `class="modal fade"` (Methodology.tsx:101) → Bootstrap `.modal { display:none }` (not overridden in styles.css, verified absent). Fab/scrim are `display:none` on desktop (styles.css:226, :228). → max-content = 341px | **Confirmed** (diagnosis estimated 300–344px; exact = 341px) |
| 7 | Ruled out: data-load failure, Leaflet init failure, z-index burial, height-chain break, mobile-CSS leak, Bootstrap override | Re-checked: data/initialisation paths unchanged since `dc3cf4d` (empty diff, §0); `z-index:1000` on overlays vs map canvas has no stacking conflict (styles.css:132, :149); height chain `html,body,#root {height:100%}` → `div.app {height:100%}` (styles.css:1–4, :15) intact on outer; both `@media` blocks (styles.css:91–105, :245–305) are scoped `max-width:768px` → no leak at ≥769px; Bootstrap CSS imported **before** `./styles.css` (main.tsx:3 before main.tsx:6) and `.app*` are custom classes absent from Bootstrap → local rules win on any specificity tie | **Confirmed** |

**Open questions from diagnosis §Open Questions 1–5** (exact URL/viewport, what
is visible, console output, has desktop ever been verified) remain open and are
forwarded to QA (§8) — none are required to resolve the root cause, since the
static derivation is exact for all standard widths.

## 2. The shared-class trap — why the one-line fix fails

**Finding (new; not in diagnosis.md):** the single rule `.app` (styles.css:11–17)
applies to **two nested elements**:

1. **Outer shell** — `AppShell.tsx:21` `<div className="app">`: contains
   header/main/footer; must be a **column** (the defect itself).
2. **Inner map container** — `App.tsx:107` `<div className={'app' + ...}>`:
   direct child of `<main class="app-body">` (AppShell.tsx:47), contains
   `aside.app-panel` (App.tsx:109) + `div.app-map` (App.tsx:122) + fab + scrim;
   must be a **row** (panel left, map right) on desktop, and must span **full
   width** on mobile (it is the `position:relative` containing block for the
   bottom-sheet apparatus, styles.css:17 + media :245–305).

This matches the brief's warning: pre-`e4b8503`, `flex-direction: column` was
scoped to a **single** `.app` element (the map container — pre-commit DOM was
`div.app` → header + `div.app-body`(panel+map), verified via
`git show dc3cf4d:src/App.tsx`: `div.app` at :50, `header` at :51, `div.app-body`
at :77). The subsequent AppShell refactor added the **outer** `.app` without
re-scoping the property, so one shared rule now governs two containers that
need opposite directions.

### Post-fix state if only candidate (a) is applied (`flex-direction: column` on `.app`)

**Desktop (1366–2560px):**
- Outer: header/main/footer stack vertically — defect element fixed.
- Inner: **also** a column (shared class). `aside.app-panel` becomes a
  full-width horizontal strip (340px **tall**) above the map.
- Main is a **row** (styles.css:56 `display:flex`, no direction → row) and the
  inner `.app` has **no flex shorthand** declared → defaults `flex: 0 1 auto`:
  it shrinks to its max-content width = **341px** (§1 #6) and will not grow.
- Result: a **341px-wide sliver** on the left (stacked panel strip + tiny map)
  with the rest of the main area empty. The "map to the right of the panel"
  expected behaviour is **not** achieved. The bug is *not* fixed.

**Mobile (≤768px):**
- Inner in-flow content = **only** `.app-map` (the panel is
  `position:absolute` under media :247–264, out of flow; fab/scrim hidden until
  `app-sheet-open`) → inner max-content = 0 → inner width = **0px** (as a
  `0 1 auto` item it cannot grow).
- Map: invisible (0 width).
- Bottom sheet: `left:0; right:0` resolved against a **0px-wide containing
  block** → sheet width = **0px** → the mobile bottom-sheet path (styles.css:
  245–305) is **broken by the fix itself**.

**Conclusion:** candidate (a) is *necessary* for the outer shell but
*insufficient* for the inner container (desktop) and *harmful* (mobile). The
minimum fix is (a) **plus** a targeted override for the inner container (§4).

## 3. Candidate adjudication

### (a) One-line `flex-direction: column` on `.app`
See §2: fixes the outer, deforms the inner (desktop sliver) and zeroes the
mobile sheet. **Rejected as the sole fix; the `column` line itself is retained**
as part of the real fix (§4.1).

### (b) Restore pre-`e4b8503` `height: 100vh` / `overflow: hidden`
- `height: 100vh` on the shared rule: the outer already has `height: 100%`
  (styles.css:15), which resolves to the viewport height via the `100%` chain
  (`html,body,#root` 100%, styles.css:1–4) → **redundant** for the outer. For
  the **inner** it is actively wrong: `100vh` = full viewport, but the inner
  must be 100% of `main` (= viewport − header − footer); it would overflow
  `main`'s content box (main has no `overflow:hidden`, styles.css:53–57) → page
  scroll / overlap under the footer. Pre-`e4b8503` there was only **one**
  `.app` (the root container, where `100vh` was the correct full-viewport
  fix); the value cannot be transplanted unchanged now that two elements share
  the class.
- `overflow: hidden`: with the §4 fix, every in-flow and absolute-positioned
  element extends **within** the bounds of its flex container (sheet panel
  `left:0;right:0;bottom:0;height:min(55vh,480px)`, fab `bottom:14px`, scrim
  `inset:0` — styles.css:247–298) → zero clipping benefit; it would only add a
  risk of silently clipping future content growth (e.g., a footer that stops
  fitting), and under (a)'s broken mobile state it would clip the 0-width
  sheet to nothing (hiding the symptom, not fixing it).
- Neither property is necessary for the defect, not sufficient for it, and both
  are net-risk on the shared-class structure. **Rejected.**

### (c) `.app-body` overflow / min-width guard
With (a)+§4.2 applied, `main.app-body` already has full width (stretch in the
column, styles.css:19–24 → outer column stretches children on the cross axis)
and `flex: 1 1 auto; min-height: 0` (styles.css:53–57) → it absorbs exactly the
residual height; no new min-width/overflow guard changes anything. Without the
inner fix, no guard on `main` can grant the inner a width — the inner's
`0 1 auto` sizing is driven by the inner's **own** flex properties, not by
`main`'s. This candidate treats a symptom, never the cause. **Rejected.**

### (d) Adopted: (a) + `.app-body > .app { flex: 1 1 auto; flex-direction: row; }`

**Sufficiency** — derivable for both viewports:

- *Desktop (1366–2560px):* outer = column → header (auto), `main` (rest),
  footer (auto), each stretched to full width W. Inner = row (override) +
  `flex: 1 1 auto` → width = W, full height of main. `aside.app-panel`
  `0 0 340px` + 1px border = 341px left column (styles.css:59–65);
  `div.app-map` `flex: 1 1 auto; min-width: 0` (styles.css:119–123) → width
  W − 341: **1025px @1366 … 2219px @2560** — the map renders to the **right of
  the panel at every standard width**. No scrollbars: column +
  `flex: 1 1 auto`/`min-height: 0` on main absorbs the residual height exactly.
- *Mobile (≤768px):* inner = row + `flex: 1 1 auto` → full width W (the
  in-flow map's 0 max-content needs `flex-grow` to materialise — the root of
  (a)'s mobile failure). `div.app-map` fills W × (viewport − header − footer).
  The panel, fab and scrim are `position:absolute` (styles.css:247–298)
  against the inner's `position:relative` (styles.css:17), whose containing
  block is now **W wide** → the bottom sheet spans `left:0`→`right:0` = full
  screen width, `bottom: 0`, `height: min(55vh,480px)`; open/close
  `translateY(105%)`↔`translateY(0)` (styles.css:263, :265–267) and the fab
  jump (`bottom: calc(min(55vh,480px) + 14px)`, styles.css:287–291) work
  **unchanged**; fab centred at `left:50%` = W/2 (styles.css:277–278); scrim
  `inset:0` (styles.css:232) covers the sheet area. All existing mobile rules
  (styles.css:245–305) continue to apply — no media-query changes.

**Necessity:** the outer needs `column` (that *is* the defect); the inner needs
an explicit `row` (shared rule gives it `column` from (a)) and `flex: 1 1 auto`
(its in-flow content has 0 max-content on mobile; no default grant). Both
declarations in (d) are load-bearing.

**Minimality:** +1 line inside one existing rule, +1 two-declaration rule, in
a single file (src/styles.css). No JS, no class renames (renaming
`AppShell`'s `app`→`app-shell` would touch AppShell.tsx, App.tsx and every
`.app` selector — strictly larger), no new dependencies.

## 4. Exact fix specification (implement verbatim)

Single file changed: **src/styles.css**.

### 4.1 Modify the `.app` rule (styles.css:11–17)

Insert `flex-direction: column;` directly after `display: flex;` (line 12).
Resulting rule:

```css
.app {
  display: flex;
  flex-direction: column;   /* ADDED — outer shell (AppShell.tsx:21): stack header/main/footer */
  min-width: 0;
  min-height: 0;
  height: 100%;
  position: relative;
}
```

### 4.2 Add one new rule after the `.app` block (after line 17, before `.app-header` at line 19)

```css
/* Inner map container (App.tsx:107): the `.app` class is shared with the
   outer shell — keep it a row (panel left / map right) and stretch it to
   full width inside main. Its in-flow children (the map; the mobile sheet
   panel/fab/scrim are absolutely positioned against it) have zero
   max-content size, so the explicit flex-grow gives it full width. */
.app-body > .app {
  flex: 1 1 auto;
  flex-direction: row;
}
```

**Selector uniqueness proof:** `main.app-body` (AppShell.tsx:47–49) contains
`div.app` (App.tsx:107–108) as a **direct child**; the outer `div.app`
(AppShell.tsx:21) is the **parent** of `main.app-body`, hence cannot be its
child → `.app-body > .app` matches exactly one element (the inner container).
It therefore overrides the base `.app` direction for the inner only (higher
specificity `0,2,0` vs `0,1,0`; and the local file wins over Bootstrap —
`bootstrap.min.css` is imported before `./styles.css`, main.tsx:3 vs :6).

### 4.3 Post-fix DOM/CSS state (assertion surface for QA)

| Element | Source | Key declarations (post-fix) |
|---|---|---|
| outer `div.app` | AppShell.tsx:21 | `display:flex; flex-direction:column; min-width:0; min-height:0; height:100%; position:relative` |
| `header.app-header` | AppShell.tsx:25–45 | `flex:0 0 auto;` (styles.css:19–24) |
| `main.app-body` | AppShell.tsx:47–49 | `flex:1 1 auto; display:flex; min-height:0;` (styles.css:53–57) |
| inner `div.app` | App.tsx:107–108 | `display:flex; flex-direction:row; flex:1 1 auto; min-width:0; min-height:0; height:100%; position:relative` (base rule + §4.2 override) |
| `aside.app-panel` | App.tsx:109–121 | `flex:0 0 340px;` + 1px border (styles.css:59–65); mobile: `position:absolute; left:0; right:0; bottom:0; top:auto; flex:none; width:100%; height:min(55vh,480px); min-width:0; z-index:1600; transform:translateY(105%)` (styles.css:247–264) |
| `div.app-map` | App.tsx:122–188 | `flex:1 1 auto; position:relative; min-width:0;` (styles.css:119–123) |
| `.app-map-canvas` (Leaflet) | MapView.tsx:161–170 | `position:absolute; inset:0;` (styles.css:125–128) |
| `.sheet-fab` / `.sheet-scrim` | App.tsx:189–197 / 198–205 | desktop `display:none` (styles.css:226, :228); mobile as in styles.css:272–298 |

**Expected visuals — desktop (1366–2560px):** header strip on top (full width
W, content height incl. wrap at narrow widths); below it `main` (full width W,
height = viewport − header − footer) with the 341px-wide hospice panel on the
**left** and the map filling **W − 341** on the **right** (1025px @1366,
2219px @2560); footer strip at the bottom (full width W). No horizontal or
vertical scrollbars, no empty gap.

**Expected visuals — mobile (≤768px):** header on top (with the 44px
touch-target controls, styles.css:91–105); map fills the full width W from
below the header to above the footer, with the fab (48px, styles.css:283)
centred above the footer; the bottom sheet is hidden (`translateY(105%)`)
until `app-sheet-open`, then slides up to `height: min(55vh,480px)` at
`bottom:0` spanning the **full width W**, with scrim `inset:0` behind it —
identical behaviour to the existing mobile spec, geometry now correct.

## 5. Regression-test contract

### 5.1 Why a static check and not a test runner

- The repo has **no test runner**: package.json (HEAD) has no test script and
  no vitest/jest/mocha dependencies; devDependencies are build/data tooling
  only (verified). No test infrastructure exists (`.agents/diagnosis.md`
  §"No test infrastructure exists").
- The defect is **declarative**: it is fully expressible as "which CSS
  declarations exist on which selectors". A browserless environment cannot
  render, and adding vitest (+ its transitive deps, plus a DOM/CSS engine for
  layout assertions) is a new dependency tree the pipeline forbids new *runtime*
  deps and only permits dev-dep bootstrap when a **minimal path** exists — no
  minimal path can assert *rendered geometry* here anyway.
- A dependency-free Node check script is: deterministic, O(file size), zero
  dependencies, and fails **exactly** when the fix is absent. This is the
  minimal mechanism that satisfies (i) "fails when `flex-direction: column` is
  absent" and (ii) "passes after the fix".
- **Risk-accepted note:** a static check asserts the CSS **source**, not the
  rendered geometry. Residual risk = a future rule (e.g., `!important` in a
  media query) overriding the asserted properties. Mitigation: the check
  asserts the **complete contract** (exactly which rules in the whole file,
  at any nesting depth, declare `flex-direction`, §5.2), so any override
  anywhere in src/styles.css — including media queries — is caught. Full
  geometric verification remains gate G5 (`.agents/pipeline.md`, "Gate 5 —
  Mobile + desktop UX": open, human phone verification) — recorded as
  residual risk, not a new blocking finding.

### 5.2 Mechanism: `scripts/check-map-layout.mjs`

New file, plain Node ESM (repo is `"type": "module"`, package.json), no
imports beyond `node:fs`, `node:path`, `node:url`. Algorithm:

1. Read `src/styles.css` (resolve relative to repo root via `import.meta.url`).
2. Strip `/* … */` comments (the file contains comment blocks, e.g. styles.css:8–10, 244–245).
3. Parse **all** rule blocks with a brace-depth state machine: walk the
   string, tracking depth; at depth ≥ 1 accumulate `selector { declarations }`
   pairs; `@media (max-width: 768px) { … }` wrappers are containers whose
   **inner** rule blocks are collected the same way (the file has two media
   blocks, styles.css:91–105 and :245–305, neither containing a `.app` rule —
   verified — but the parser must not rely on that). Split declarations on
   `;`; normalise each as `name: value` (lowercase name, collapse whitespace);
   handle `!important` (store as part of value — the contract below makes it
   fail naturally). **No naive substring matching**: a substring search for
   `flex-direction: column` would false-match `.legend-grid`
   (styles.css:156–160, the value at :158) and miss overrides.
4. Assert the following (each failure → `console.error` + `process.exit(1)`):
   - **A.** The rule whose selector normalises to `.app` declares
     `flex-direction: column` **and** `display: flex`.
   - **B.** A rule whose selector normalises to `.app-body > .app` exists,
     declares `flex-direction: row` **and** `flex: 1 1 auto`.
   - **C.** **Complete contract:** the set of all `flex-direction`
     declarations in the file, keyed by normalised selector, is exactly
     `{ ".app": "column", ".app-body > .app": "row", ".legend-grid": "column" }`
     (the pre-existing `.legend-grid` column at styles.css:158 is the only
     third occurrence — verified by full-file scan). This catches any future
     override anywhere in the file, including `!important` values (they would
     fail the exact-value comparison) and inside media queries.
5. On success: print `check-map-layout: OK` and `process.exit(0)`.

### 5.3 npm wiring

package.json `scripts` gets one entry:

```json
"check:layout": "node scripts/check-map-layout.mjs"
```

### 5.4 QA commands (both directions, per pipeline.md G4/G6 convention)

1. **Positive (must PASS post-fix):** `npm run check:layout` → exit code 0.
2. **Negative (must FAIL when the fix is removed) — QA proves both parts of the
   fix, one mutation at a time:**
   - Temporarily delete the `flex-direction: column;` line from the `.app`
     rule (styles.css:12 region) → `npm run check:layout` → **exit code 1**
     (assertion A fails). Restore the file.
   - Temporarily delete the `.app-body > .app` rule → `npm run check:layout`
     → **exit code 1** (assertions B and C fail). Restore the file.
   - After each mutation: `git status --porcelain` must be clean on restore.
3. **Build gate (G6):** after the fix + script land, re-run `npm run build`
   (package.json `build` = `tsc -b && vite build`) → must remain exit 0; CSS
   changes cannot affect `tsc`, and `vite build` re-inlines the stylesheet.

## 6. Scope and rollback

**Scope (exact deliverables — Stage 3 implements nothing beyond this):**
1. `src/styles.css` — +1 line inside the existing `.app` rule; +1 two-declaration
   rule with its comment (2 lines of declarations + comment lines).
2. `scripts/check-map-layout.mjs` — new, dependency-free (≈60–80 lines).
3. `package.json` — +1 `"check:layout"` script entry.

**Out of scope / untouched:** no JS/TSX changes (App.tsx, AppShell.tsx,
MapView.tsx, Methodology.tsx, main.tsx unchanged); no class renames; no
runtime dependencies; no dev-dependency bootstrap (considered, not needed,
§5.1); no changes to data, validators, or other CSS rules.

**Rollback:** one commit reverts three files: `git checkout HEAD -- src/styles.css package.json`
and delete `scripts/check-map-layout.mjs` (or a single `git revert` of the fix
commit). Rollback restores the pre-fix CSS exactly; the check script is inert
once un-wired.

## 7. Evidence trail (git)

- `git log --format="%H %P" -1 e4b8503` → `e4b8503… dc3cf4d890c41eba1611e51fc01f4c82ad54b736` (parent confirmed).
- `git show e4b8503 -- src/styles.css` → the `.app` hunk: `-flex-direction: column; -height: 100vh; -overflow: hidden; +min-width: 0; +min-height: 0; +height: 100%; +position: relative;` and removal of the old mobile block (`.app-body { flex-direction: column; } .app-panel { flex: 0 0 220px; }`).
- `git show dc3cf4d:src/styles.css` → pre-commit `.app` had `flex-direction: column; height: 100vh; overflow: hidden;`.
- `git show dc3cf4d:src/App.tsx` → pre-commit single-`.app` DOM (`div.app` :50 → `header.app-header` :51 → `div.app-body` :77 → `aside.app-panel` :78 + `main.app-map` :91), proving the pre-commit `column` value was scoped to the inner-only container (no AppShell existed).
- `git diff e4b8503 HEAD -- src/styles.css src/App.tsx src/components/AppShell.tsx src/components/MapView.tsx` → **empty** (fix must target exactly the e4b8503 regression surface).

## 8. Residual risks carried forward (non-blocking)

1. **Static check ≠ rendered geometry** (accepted, §5.1): a future
   `!important`/media-query override is caught by the complete contract
   (assertion C), but displacement outside src/styles.css (e.g., a new CSS
   file) is not. Full verification gates: G5 (human, open) post-fix, and QA's
   `npm run build` (G6).
2. **Live desktop verification never ran** in this pipeline: the fix is
   statically derived for 1366–2560px; if desktop was *never* live-verified
   pre-`e4b8503` (diagnosis open question 5), QA should do one live smoke test
   at 1366px and 1920px as part of fix verification.
3. Diagnosis open questions 1–5 (exact URL/viewport, what was visible, console
   output) remain open for QA context; none affect the root cause.
