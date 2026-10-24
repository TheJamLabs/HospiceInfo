# Hindsight — "map not rendering on desktop" (bugfix pipeline, stage 5 of 5)

**Run:** 2026-10-24 (map layout fix pipeline complete).  
**Method:** Reviewed `pipeline.md`, `root-cause.md`, `diagnosis.md`, `bug.md`, `implementation.md`, `qa.md`, plus `docs/adr/` (all 9 ADRs exist), cross-checked against on-disk artifacts (src/styles.css, scripts/check-map-layout.mjs, .agents/*.md).

## Diagnoses

1. **Bank stale entries (2026-10-22).** The prior run stored:
   - `Corrections` (bare-array shape) and `ODbL` attribution, G1–G6 — correct.
   - No entry for **the layout-correct separation-plus-override fix**.
   - No entry for the **dependency-free regression script**.
   - G5 live smoke still open (no browser in the QA environment).

2. **Retrieval gaps.** Targeted lookups (prior architecture decisions; past Blocking findings; release-gate decisions) had no "layout fix" record; the key layout-fix facts (commit `e4b8503` removal of `flex-direction: column` from `.app`) were not in the curated Hindsight bank.

3. **Hindsight pages touched by the 10-stage pipeline.** Already-ingested (2026-10-22):
   - `kp-84899dd8…` (component map) — updated with 2026-10-22 tree correction.
   - `kp-be4582a3…` (core concepts) — updated with 2026-10-22 scale correction.
   - `kp-2008e97b…` (conventions) — updated with 2026-10-22 conventions.
   - `kp-cab9174c…` (decisions) — updated with 2026-10-22 ADRs 0006–0009.
   - `kp-b4b28bc7…` (initiatives) — updated with 2026-10-22 UK-wide expansion.

   **New pages added:** none; all new material was stored as raw session notes or in `docs/adr/`, and cross-checked against on-disk artifacts before commit.

## Fixes applied

1. **Hindsight Meta page rewritten** (`.agents/hindsight.md`) — consolidated all verified layout-fix facts (shared-class trap, minimal fix + override, regression guard), G5 human gate open, and all open questions from diagnosis §7:
   - The `.app` class is shared by 2 nested elements (outer shell `AppShell.tsx:21` and inner map container `App.tsx:108`) with opposite flex-direction needs (outer `column`, inner `row`).
   - Minimal fix: (1) `flex-direction: column` in `.app`; (2) new rule `.app-body > .app { flex: 1 1 auto; flex-direction: row; }` (src/styles.css).
   - Regression guard: `scripts/check-map-layout.mjs` (dependency-free Node ESM) asserted the 3-flex-direction contract + 2-declarations (`flex: 1 1 auto` + `row`), wired as `npm run check:layout`, exit 0 on positive, exit 1 on either negation.
   - G5 live smoke remains open (1366px/1920px desktop + ≤768px mobile).

2. **5 open QA questions added** (diagnosis §7) — exact viewport/URL/content/console output used to confirm the static derivation matches the actual rendered geometry:
   1. Where observed — deployed URL or local dev?
   2. Browser + viewport?
   3. What was visible? (diagnosis predicted 0-120px map column).
   4. Console messages?
   5. Did desktop ever work before commit `e4b8503`?

3. **Open gates tracked** — G5 live smoke (human) + G6 (npm run build) passed + G7 (delayed notifications resolved 2026-10-24).

## Destructive operations held

- **Held:** none. The Hindsight bank is ingest-only on this machine; updates made only to `.agents/hindsight` (the meta-artifact). No file deletions, re-embeddings, or bulk actions were performed.

## Memory quality

- **Stale entries resolved.** The prior run (2026-10-22) noted component map incongruence (pilot-era claims vs. on-disk UK-wide build); those corrections were ingested as "Correction:" pages. The 2026-10-24 layout-fix facts were added to this session's Hindsight page.
- **Duplication risk:** the prior run stored `share-lanes-nh` errors and `landing | ADR-0006` as notes; the 2026-10-24 consolidated entry supersedes them for the current run's layout-fix context.
- **Embedding:** no new embeddings were requested; facts live in text form for retrieval; future sessions can consume `.agents/hindsight.md` as the source of truth for the layout fix.

---

### Remember for next time

- The `.app` class is shared by **two nested containers** that require **opposite** flex-directions. A one-line `.app` change alone breaks the inner map layout.
- The fix is **two CSS lines** in one file: (1) `flex-direction: column` in `.app`; (2) override `.app-body > .app` with `flex: 1 1 auto; flex-direction: row;`.
- A **dependency-free static CSS check** (`scripts/check-map-layout.mjs`) guards the contract; it runs on `npm run check:layout` and fails (exit 1) on any violation, including future `!important` overrides in-file.
- **G5 live smoke** (desktop 1366/1920 + mobile ≤768) is a human gate — no browser in the QA environment. Round-trip verification: test both directions of the fix (mutate one line, restore).
- **G6** is `npm run build` (exit 0).
- **G7** - delayed notifications: track `fetch*.log` completion and polygon counts; the Oct-23 remnant logs were not overwrites (2 sources: 21,468 and 22,999 polygons).
