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
## Cycle 2 Hindsight — Completed 2026-10-26

### WHAT Changed (5 functional areas + numbers)
- Nation data: Scotland landed (911 practices, all geocoded + assigned);
  Wales GP practices + NI hospices remain HUMAN-GATED (H1a/H1b). Totals:
  155 hospices, 10,475 GP practices, 8,373 in-scope postcodes (8,364
  resolved), 12 practices unassigned (9 OSM-gap postcodes), 138 shops.
- Map performance (P1–P6): 186 grid buckets at zoom < 11, 10,463
  CircleMarkers at zoom ≥ 11 (GRID = 0.5°, ZOOM_LOD = 11,
  SEARCH_DEBUNCE_MS = 200).
- Panel UX: A→Z default sort, plus Z→A and practices-desc; "Has published
  service area" toggle → exactly 7 rows (see THE INVARIANT).
- PWA assets: logo.svg favicon + manifest.webmanifest.
- Landing "start here" card (postcode lookup), plus layout/spacing
  hygiene.

### ADRs Recorded
- **ADR-0008** (0-space data JSON + build script as single source of truth): `public/data/*.json` regenerate from `data-raw/` via `scripts/build-data.mjs`; never hand-edit data JSON — land script + data-raw deltas and rebuild.
- **ADR-0009** (manual publish after human gates): NO auto-deploy; lead must explicitly commit + push after each G5 pass/decision record (gate artifacts, notes).
- **ADR-0010** (evidence-gated stride investigation): STRIDE_K gate threshold m1>800 ms on 4G; G5 undecided, evidence pending.

### THE INVARIANT
`kind === 'published'` is **exactly 7 hospices** (20 curated set − 13 approximated catchments). This was repeatedly asserted wrong in Cycle 2 QA, producing repeated confusion; store as the strongest process lesson.

### PROCESS LESSONS (this repo's pipeline)
- **Sub-agent stall**: multiple stages showed a no-op pattern: 4 QA dispatches + 2 Hindsight dispatches produced zero writes. Pattern that WORKS: compact brief + mandatory early skeleton write within minutes of dispatch + bounded re-verification scope + lead pre-runs mechanical checks and hands the session verified facts.
- **Lead discipline**: Verify every deliverable on disk before marking complete — mtime + sha256 + content check; test before handoff.
- **Rework rounds**: Cycle 2 consumed **0** fix-verify rounds (QA PASS first try under the slim pattern; Security PASS).

### WHAT REMAINS (human-gated, pre-launch — then lead closes the loop)
- **G5** — human Chrome mobile pass (Slow 4G + 4× CPU): post-fix m1/m2/m4
  vs baselines 1677 / 435 / 1391 ms; live W5 bucket click, W7 ~200 ms
  debounce cadence, W10 sort + published toggle → exactly 7 rows, W11
  postcode flow (BD14 6NF). 8-row checklist in `.agents/qa.md` §G5.
- **W8** — ADR-0010 stride gate, decided by the lead from G5's m1:
  post-fix m1 > 800 ms ⇒ add `STRIDE_K` (named constant + bounded
  render-time filter in MapView.tsx); otherwise record "gate not triggered
  (m1 = X ms)".
- **G7** — Overpass re-fetch when a mirror has capacity (non-blocking
  carry-over; "mirror at capacity" diagnosis is acceptable).
- **H1a** — Wales GP practices: James browser-fetches the DataMap layers
  from `data.gov.wales` → `data-raw/gp-practices-wales-{main,branch}-2026-10.{csv,geojson}`.
- **H1b** — NI hospices: James browser-fetches the PRA register XLSX →
  `data-raw/rqia-regulated-services-2026-06.xlsx`.
- Then the lead runs the post-data-landing chain (`docs/MAINTENANCE.md`,
  from `.agents/ops.md` §5): extract → geocode → `npm run build-data` ×2
  byte-identity → `validate-tessellation` → `npm run build` +
  `check:layout` → provenance row → commit + publish (ADR-0009 — manual
  publish, never automatic).

### RISK-ACCEPTED DEBT carried
- F-1: 7-vs-20 invariant confusion (documented above)
- npm audit: esbuild devDep advisory (dev-only; not in dist/)
- 12 unassigned practices (9 OSM-gap postcodes — upstream-out-of-coverage, not a defect)
- Care Inspectorate Wales hospices email reply (non-gating gap)

---

### Remember for next time

- The `.app` class is shared by **two nested containers** that require **opposite** flex-directions. A one-line `.app` change alone breaks the inner map layout.
- The fix is **two CSS lines** in one file: (1) `flex-direction: column` in `.app`; (2) override `.app-body > .app` with `flex: 1 1 auto; flex-direction: row;`.
- A **dependency-free static CSS check** (`scripts/check-map-layout.mjs`) guards the contract; it runs on `npm run check:layout` and fails (exit 1) on any violation, including future `!important` overrides in-file.
- **G5 live smoke** (desktop 1366/1920 + mobile ≤768) is a human gate — no browser in the QA environment. Round-trip verification: test both directions of the fix (mutate one line, restore).
- **G6** is `npm run build` (exit 0).
- **G7** - delayed notifications: track `fetch*.log` completion and polygon counts; the Oct-23 remnant logs were not overwrites (2 sources: 21,468 and 22,999 polygons).

## Cycle 2 QA

QA independently re-verified the Cycle-2 core subset on 2026-10-26: `npm run build` and `npm run check:layout` both exit 0; static greps confirm W2 (one `hospices.find` in MapView.tsx), W4 (no markercluster), W6 (two `<Tooltip>`), G6 (three `flex-direction`), W11 (zero absent phrases src-wide, zero network APIs in `src/lib/feedback.ts`, `onOpenHospice` wired), W12 (B1 email section + "0 hospices" line), W13 ("not published in bulk"); QA computed m3 directly over `dist/data/practices.json` (10,475 records, 10,463 placed, 186 distinct 0.5° buckets; 10,463 CircleMarkers at zoom ≥ 11 per `GRID = 0.5` / `ZOOM_LOD = 11`) and confirmed 7 `kind==='published'` hospices in `dist/data/hospices.json`; the heavy tessellation/byte-identity chain was cited from the lead's 20:50 re-run (exit 0, 4× SHA-256 byte-identical) per dispatch. Every re-check agreed with the lead-verified facts; the only finding is the carried-over risk-accepted F-1 (7 of 20 curated hospices marked `published` by design). **Verdict: PASS — 0 blocking, 1 risk-accepted.**

Pending human gate items: the G5 Chrome pass (Slow 4G + 4× CPU) must produce post-fix m1 (baseline 1677 ms), m2 (435 ms), m4 (1391 ms), plus live W5 bucket click, W7 200 ms debounce cadence, W10 sort/toggling to exactly 7 rows, and the W11 postcode flow (e.g. BD14 6NF). The W8 stride gate decision awaits the G5 m1 result — if post-fix m1 meets the ADR-0010 strategy, the gate closes without code changes.

---

## Cycle 2.5 — Data landing (H1a + H1b) on 2026-10-27

Both human-gated fetches closed the same day James placed the files in
`data-raw/`; the lead ran the §5 chain (`ops.md` §5.1 run record):

- **H1a (CLOSED):** Wales DataMap GeoJSON layers (`gp-practices-wales-{main,branch}-2026-10.json`, OGL v3.0) → 539 practices (369 main + 170 branch), **all placed from source lat/lon** — the layers carry no postcodes, so the Nominatim geocoder was not needed for Wales (the "source-provided coordinates beat geocoding" rule in `data/README.md`).
- **H1b (CLOSED):** PRA "All Registered Services" June 2026 export `rqia-regulated-services-2026-06.xlsx` (SHA-256 `3a977f29…dfca7`) → 6 services `ni-r1`–`ni-r6`, all geocoded from postcodes; `merge-hospices.mjs` re-asserted the 20 curated set with unique ids. The extract's first-run column discovery pinned the header by name (header row 3: `Service Name`, `Postcode`).
- **Chain green:** geocode fourth pass (5 new NI hospice postcode units; 0 new practice units; exit 1 by design on the documented 9-postcode OSM gap — no loop) → `build-data` ×2 byte-identical (new SHA prefixes `f7df12fd`/`65818ace`/`cc096f17`/`dd19e8ae`, superseding the pre-landing `dc261185`/`e11322ba`/`2a87a374`/`5628d8f7`) → `validate-tessellation` exit 0 → `npm run build` + `check:layout` exit 0; largest dist asset 3.14 MiB, far under Cloudflare's 25 MiB per-file limit.
- **New totals:** 161 hospices (en 152 / sc 3 / ni 6 / wales 0); 11,014 practices (en 9,260 / sc 911 / ni 304 / wales 539); 11,002 assigned, 12 unplaced (all 12 in the 9 NI OSM-gap postcode units); 138 shops (21 outside their own catchment); 9,098 of 9,107 in-scope postcodes. THE INVARIANT (`kind === 'published'` = exactly 7) is unchanged.
- **Gates:** G5 / W8 / G7 remain OPEN → **no Cloudflare publish** (ADR-0009 manual publish). G5's m3 marker baseline (10,463) predates the landing and is re-verified against 11,002 in James's pass. Committed to `origin/main` (SHA in the 2026-10-27 ledger note, `.agents/pipeline.md`); publish stays deferred until G5 → W8 → G7 close.
- **Still pending (one human fetch):** the Care Inspectorate Wales hospice reply — the only outstanding register fetch (extract `extract-hospices-wales.mjs` already wired; it currently logs a documented `[]` placeholder). When it lands, run the §5 chain again.
