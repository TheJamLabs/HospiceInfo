# Coding stage — fix-pass report (bugfix: "map not rendering on desktop")

- Stage: 5/10 — Coding (fix pass)
- Date: 2026-10-24
- Bug: `.agents/bug.md`; diagnosis `.agents/diagnosis.md`; root cause `.agents/root-cause.md` (§4 = fix spec, §5 = regression-test contract)
- Scope (exactly the fix spec, nothing else): 3 code files + this artifact. No JS/TSX changes, no class renames, no new dependencies, no refactors, no design changes, no TODOs. Nothing committed.

## Item status

| # | Item | Status | Files touched |
|---|------|--------|---------------|
| 1 | `src/styles.css` — `flex-direction: column;` in `.app` + new `.app-body > .app` rule | done | `src/styles.css` |
| 2 | `scripts/check-map-layout.mjs` — dependency-free static layout check (contract §5.2) | done | `scripts/check-map-layout.mjs` (new) |
| 3 | `package.json` — add `"check:layout"` script entry | done | `package.json` |

Validations:
- `npm run check:layout` (positive) — exit 0, prints `check-map-layout: OK`
- NEGATIVE 1 (only the `.app` column line deleted) — exit 1, assertion A fails + C fails; restored exactly, re-check exit 0
- NEGATIVE 2 (only the `.app-body > .app` rule deleted) — exit 1, assertion B fails + C fails; restored exactly, re-check exit 0
- `git status --porcelain` after both restores — only the four expected changes (plus pre-existing untracked stage artifacts from prior bugfix stages: `.agents/bug.md`, `.agents/diagnosis.md`, `.agents/root-cause.md`, `.qwen/`; `.agents/pipeline.md` was already modified by the lead before this pass)
- `npm run build` — exit 0 (tsc -b && vite build, 147 modules, CSS re-inlined)

## Item 1 — src/styles.css

Status: **done**

Files touched: `src/styles.css` (only file of the original fix)

Change (exact `git diff` for the file):

```diff
 .app {
   display: flex;
+  flex-direction: column;
   min-width: 0;
   min-height: 0;
   height: 100%;
   position: relative;
 }

+/* Inner map container (src/App.tsx:108): the `.app` class is shared with the
+   outer shell (AppShell.tsx:21) — keep it a row (panel left / map right) and
+   stretch it to full width inside main.app-body. */
+.app-body > .app {
+  flex: 1 1 auto;
+  flex-direction: row;
+}
+
 .app-header {
```

- `flex-direction: column;` inserted immediately after `display: flex;` in the `.app` rule; every other declaration untouched.
- The inner-container rule inserted after the `.app` closing brace, before `.app-header`, exactly per brief. Line references verified on disk before writing: `AppShell.tsx:21` (`<div className="app">`), `App.tsx:108` (`` <div className={`app...`}> ``) — no comment adjustment needed.
- No other CSS rules touched (diff stat: 9 insertions, 0 deletions).

Validation: covered by the `npm run check:layout` + build runs below (item 2's assertions A/B directly assert these two declarations; `npm run build` re-inlines the stylesheet).

## Item 2 — scripts/check-map-layout.mjs (new)

Status: **done**

Files touched: `scripts/check-map-layout.mjs` (new, ~85 lines, no TODOs)

Implementation notes (per contract §5.2):
- Plain Node ESM; imports only `node:fs`, `node:path`, `node:url` (repo is `"type": "module"`).
- Reads `src/styles.css` resolved via `import.meta.url` → repo root; optional CLI argument overrides the CSS path.
- Strips `/* ... */` comments first.
- Parses with a brace-depth state machine (no substring/regex matching against raw text): `prelude` accumulates all text until each `{`/`}` boundary; at `{` it is the selector (or at-rule prelude), at the matching `}` it is the body. Rules inside `@media` wrappers are collected by the same walk. Declarations split on `;`, normalised to `name: value` (lowercase name, whitespace collapsed); `!important` stays in the value and fails the exact-value comparison naturally.
- Assertions, each failure → `console.error` + exit 1:
  - A: `.app` declares `display: flex` AND `flex-direction: column`
  - B: `.app-body > .app` declares `flex-direction: row` AND `flex: 1 1 auto`
  - C: the complete set of (selector → flex-direction) pairs in the whole file is exactly `{ ".app": "column", ".app-body > .app": "row", ".legend-grid": "column" }`

Validation:

Positive — `npm run check:layout` → **exit 0**

```
check-map-layout: OK
```

NEGATIVE 1 — only the `flex-direction: column;` line removed from the `.app` rule → `npm run check:layout` → **exit 1**, assertion A failing (and C):

```
check-map-layout: FAIL: rule ".app" does not declare, expected "flex-direction: column".
check-map-layout: FAIL: missing flex-direction for ".app: column".
```

Line restored exactly (byte-for-byte from backup); re-run → `check-map-layout: OK`, exit 0.

NEGATIVE 2 — only the inserted `.app-body > .app` rule (with comment) removed → `npm run check:layout` → **exit 1**, assertion B failing (and C):

```
check-map-layout: FAIL: rule ".app-body > .app" does not declare, expected "flex-direction: row".
check-map-layout: FAIL: missing flex-direction for ".app-body > .app: row".
```

Rule restored exactly (byte-for-byte from backup); re-run → `check-map-layout: OK`, exit 0.

## Item 3 — package.json

Status: **done**

Files touched: `package.json`

Change (only the `scripts` object; no dependency/field changes):

```diff
-    "build-data": "node scripts/build-data.mjs"
+    "build-data": "node scripts/build-data.mjs",
+    "check:layout": "node scripts/check-map-layout.mjs"
```

Validation: exercised by every `npm run check:layout` run above (wire-up works; exit codes as recorded).

## Final validation log (all 2026-10-24)

| Step | Command | Exit code | Key output |
|------|---------|-----------|------------|
| Positive | `npm run check:layout` | 0 | `check-map-layout: OK` |
| Neg 1 mutate | (remove `.app` column line) | — | pattern matched, backup taken |
| Neg 1 check | `npm run check:layout` | 1 | A failing: `rule ".app" does not declare, expected "flex-direction: column".` + C failing: `missing flex-direction for ".app: column".` |
| Neg 1 restore + re-check | `node mutate restore` → `npm run check:layout` | 0 | `check-map-layout: OK` |
| Neg 2 mutate | (remove `.app-body > .app` rule) | — | rule matched, backup taken |
| Neg 2 check | `npm run check:layout` | 1 | B failing: `rule ".app-body > .app" does not declare, expected "flex-direction: row".` + C failing: `missing flex-direction for ".app-body > .app: row".` |
| Neg 2 restore + re-check | `node mutate restore` → `npm run check:layout` | 0 | `check-map-layout: OK` |
| Tree state | `git status --porcelain` | 0 | `M src/styles.css`, `M package.json`, `?? scripts/check-map-layout.mjs`, `?? .agents/implementation.md` (this report) — plus pre-existing entries listed above; no stray modifications |
| Build gate (G6) | `npm run build` (tsc -b && vite build) | 0 | `✓ 147 modules transformed. … dist/assets/index-DXBOPrrL.css 250.47 kB … ✓ built in 3.48s` |

## Handoff notes (carried forward, non-blocking)

- Per root-cause §5.1/§8: the check asserts the CSS source, not rendered geometry — residual risk that a future `!important`/media-query override inside this file is caught by assertion C; displacement into a new CSS file is not. Human live verification (G5) and a live desktop smoke test at 1366px/1920px (root-cause §8.2) remain open QA gates.
- The original feature-build coding ledger previously in this file is preserved in git history (last committed before this bugfix pipeline).
