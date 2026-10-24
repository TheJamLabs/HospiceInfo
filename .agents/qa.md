# QA — Stage 6/10 — "map not rendering on desktop"

- Date: 2026-10-24
- Bug: "map not rendering on desktop" (intake `.agents/bug.md`; root cause
  `.agents/root-cause.md`, fix spec §4, regression contract §5.2, QA commands §5.4).
- Method: independent verification — every check below was re-run by QA in this
  session; no coder claim was taken on trust. Negative tests used byte-exact
  `git apply` single-hunk patches (pre-validated with `git apply --check`), and
  restores from a pre-mutation byte-exact backup (`.qwen/tmp/qa-styles-backup.css`),
  with `git diff --stat` = exactly +9 and re-run `check:layout` = exit 0 as
  proof of restoration after each cycle. No commits; no production code
  modified (all mutations temporary, restored byte-for-byte).
- Supersedes: the previous-cycle record in this file (2026-10-22 A1–A6 review) is
  replaced in full; its content belongs to that cycle's artifacts.

## Verdict

**PASSING** — all 7 QA checks pass (check 7 = G5 live smoke has no browser in
this environment: stated explicitly, recorded as an open human gate, not a
failure). Zero Blocking findings. Three risk-accepted findings carried forward.

## Check table

| # | Check | Command | Exit | Key output | Result |
|---|---|---|---|---|---|
| 1 | Diff scope | `git status --porcelain`, `git diff --stat`, `git diff -U0 -- package.json`, `git diff -- src/styles.css` | 0 | `M src/styles.css` +9, `M package.json` (+1 net: `"check:layout": "node scripts/check-map-layout.mjs"`, trailing comma only), `?? scripts/check-map-layout.mjs`; no JS/TSX/dependency changes. Both CSS rules match root-cause §4 (see §Findings F-2 for comment wording) | **PASS** |
| 2 | Positive layout check | `npm run check:layout` | 0 | `check-map-layout: OK` | **PASS** |
| 3 | NEGATIVE 1: delete ONLY `flex-direction: column;` in `.app` | `git apply` (single-line patch) → `git diff -- src/styles.css` → `npm run check:layout` | 1 | diff shows exactly that one line removed; `check-map-layout: FAIL: rule ".app" does not declare, expected "flex-direction: column".` / `check-map-layout: FAIL: missing flex-direction for ".app: column".` | **PASS** |
| 3r | Restore 1 + re-run | backup `copy` → `git diff --stat -- src/styles.css` → `npm run check:layout` | 0 | `src/styles.css \| 9 +++++++++` (exactly +9, no other hunks); `check-map-layout: OK` | **PASS** |
| 4 | NEGATIVE 2: delete ONLY `.app-body > .app` rule + its comment | `git apply` (7-line patch) → `git diff -- src/styles.css` → `npm run check:layout` | 1 | diff shows exactly that block removed; `check-map-layout: FAIL: rule ".app-body > .app" does not declare, expected "flex-direction: row".` / `check-map-layout: FAIL: missing flex-direction for ".app-body > .app: row".` (assertions B and C, per §5.4) | **PASS** |
| 4r | Restore 2 + re-run | backup `copy` → `git diff --stat -- src/styles.css` → `npm run check:layout` | 0 | `src/styles.css \| 9 +++++++++` (exactly +9); `check-map-layout: OK` | **PASS** |
| 5 | Working tree after each restore | `git status --porcelain` | 0 | `M src/styles.css`, `M package.json`, `?? scripts/check-map-layout.mjs` — exactly the expected code files (plus pipeline/session artifacts: `M .agents/implementation.md`, `M .agents/pipeline.md`, `?? .agents/bug.md`, `?? .agents/diagnosis.md`, `?? .agents/root-cause.md`, `?? .qwen/`) | **PASS** |
| 6 | Build gate G6 | `npm run build` | 0 | `tsc -b && vite build` → `vite v5.4.21` → `✓ 147 modules transformed` → `dist/assets/index-DXBOPrrL.css 250.47 kB`, `index-Ci-M3aYr.js 409.61 kB` → `✓ built in 2.93s` | **PASS** |
| 7 | Live smoke G5 | (none executable — no browser in this environment) | n/a | Not run — stated explicitly, NOT a failure. Expected visuals recorded below for the human gate (root-cause §4.3) | **OPEN GATE (human)** |

### Check 7 — G5 expected visuals for human verification (root-cause §4.3)

- **Desktop (1366–2560px; smoke at 1366 and 1920):** header strip on top,
  full width W; `main` below it full width, height = viewport − header − footer;
  341px-wide hospice panel on the **left**; map filling **W − 341** on the
  **right** (≈1025px @1366, ≈1579px @1920, 2219px @2560); footer strip at the
  bottom, full width W; **no horizontal or vertical scrollbars, no empty gap**.
- **Mobile (≤768px):** header on top; map fills full width W from below the
  header to above the footer; bottom sheet hidden (`translateY(105%)`) until
  opened, then slides up to `height: min(55vh, 480px)` at `bottom: 0` spanning
  full width, with scrim `inset: 0` behind it; FAB (48px) centred above the
  footer, jumping to `bottom: calc(min(55vh,480px) + 14px)` when open.

## Findings

### Blocking

None.

### Risk-accepted (carried forward; none blocks the pipeline)

- **F-1 — Static check asserts CSS source, not rendered geometry.** A future
  `!important`/override inside `src/styles.css` (including media queries) is
  caught by the check's complete-contract assertion C (verified: NEGATIVE 2
  failed on both B and C, so the contract is live, not tautological).
  Displacement outside `src/styles.css` (a new CSS file) is not covered.
  Full geometric verification remains open gate G5 (root-cause §5.1, §8.1;
  pipeline.md Gate 5, human). Documented debt — never blocks.
- **F-2 — Comment wording deviates from the §4.2 "verbatim" spec.** The
  implemented selector and both declarations (`flex: 1 1 auto;` /
  `flex-direction: row;`, inserted after the `.app` block, before
  `.app-header`) are verbatim; only the adjacent explanatory comment is
  abbreviated (3 lines vs the spec's 5; cites `src/App.tsx:108` vs `App.tsx:107`
  and adds `AppShell.tsx:21`), omitting the max-content justification sentence.
  Comments are non-normative (stripped by the check's own parser); zero
  functional impact.
- **F-3 — The check script accepts an optional `[path-to-css]` argv**
  (`scripts/check-map-layout.mjs` L21) — a minor superset over the §5.2 spec
  (default is `src/styles.css`, wiring unchanged). No smell of concern;
  noted for completeness.

### Standards axis

- `scripts/check-map-layout.mjs` implements §5.2 exactly: comment stripping,
  brace-depth state machine (no substring/regex on raw text — a substring
  match would false-hit `.legend-grid`), normalised `name: value` comparison,
  assertions A/B/C, exit 0 + `check-map-layout: OK` / exit 1 on failure;
  dependency-free Node ESM consistent with `package.json` `"type": "module"`
  and the repo's no-test-runner convention.
- `check:layout` naming matches existing kebab-case scripts (`build-data`,
  `build`). No TODOs, no dead code, no new dependencies (runtime or dev).
- Diff is minimal and in-scope per root-cause §6: 3 files, +10 net lines
  (styles.css +9, package.json +1, new script), no JS/TSX touched.

## Risk assessment

Low residual. The fix is minimal (two CSS changes, declarations verbatim per
§4), the regression check is verified bi-directionally by independent
mutations, and the build is green. The only uncovered surface is live rendered
geometry (F-1), which is gated by the human G5 smoke — exactly the split the
root-cause accepted.

## Open gates (not failures)

- **G5 — live smoke (human):** desktop 1366px **and** 1920px + mobile phone,
  per the expected-visuals table above (root-cause §8.2: "QA should do one
  live smoke test at 1366px and 1920px"; pipeline.md Gate 5 "Mobile + desktop
  UX" = open). No browser exists in this QA environment, so this cannot be
  discharged here.

## Follow-ups

1. Run the G5 live smoke (desktop 1366/1920 + mobile ≤768) and close Gate 5.
2. Answer the 5 open user questions from `.agents/diagnosis.md` §7 (confidence
   boosters only; none affects the root cause):
   1. Where observed — deployed URL (https://… .pages.dev) or local
      `npm run dev`/`preview`? (QA needs the target for the live re-check.)
   2. Browser and viewport width? (derivation covers 1366–2560; below ~2450
      unchanged, above 2560 the map column stays <281px up to ~4700px.)
   3. What was visible exactly? (Expected pre-fix: full-height header band ~80%
      across the screen, narrow main sliver, no map area; a screenshot would
      settle width estimates.)
   4. Anything in the browser console? (rules out secondary tile-fetch/script
      errors.)
   5. Did desktop ever work on this URL before the 2026-10-24 release?
      (layout changed exactly in `e4b8503`; "yes" would strongly corroborate.)
