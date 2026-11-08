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
- **ADR-0009** (site-config single source). Note: the "manual publish after human gates" convention was never ADR-0009 — it lived in ops.md/README/MAINTENANCE and is superseded 2026-10-27 by **ADR-0014** (git-connected Cloudflare Pages deploy): every James-approved push to `main` runs `npm ci && npm run build` and publishes `dist/` (`pages_build_output_dir` in `wrangler.jsonc`); G5/W8/G7 remain open verification gates and no longer block publication. The first git-connected build failed Pages' 25 MiB per-file limit (no build command → repo root deployed, incl. `data-raw/uk-land.json` at 54.6 MiB); ADR-0014's build settings resolve it.
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
  `check:layout` → provenance row → commit; the James-approved push to `main`
  auto-publishes (git-connected, ADR-0014 — supersedes the manual-publish
  convention, which was never ADR-0009).

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

---
## Cycle 3 Hindsight — Completed 2026-10-30

### What changed

- **Brand rename to "Hospice Finder UK"**: ADR-0023 drove declarative changes across 8 surfaces; identifiers locked, no "hospice catchment map" string remains in active code or emitted assets.
- **Deterministic zero-dependency prerenderer** `scripts/prerender.mjs`: emitted 171 files (169 static HTML shells + sitemap.xml, robots.txt) in `dist/`; third build step `tsc -b && vite build && node scripts/prerender.mjs` encodes per-page `<head>` + empty `#root` + boot script (ADR-0015); invariant `sitemap <loc> count === 161 + 7` (= 168).
- **SEO surfaces**: `sitemap.xml` (168 `<loc>`, 0 `<lastmod>` per ADR-0015 idempotent emit), `robots.txt` (75 bytes), JSON-LD `HealthCareBusiness` without any endorsement qualifiers, canonical + Open Graph; hash-redirect guard IIFE (ADR-0016) on every emitted page.
- **Northern Ireland hospices**: 6 landed via the data chain (RQIA June 2026
  export; ids `ni-r1`–`ni-r6`, ADR-0002/ADR-0019 scheme); **Wales G3-tolerant
  landing** (0 rows shipped; ADR-0020).
- **Logo**: 3-element inversion (circle=1; ADR-0022).
- **OG image**: `public/og-image.png` 1200×630, 3,161 B on disk — a committed
  placeholder (ADR-0018) referenced by `og:image` on every emitted page; not
  generated by the build.
- **Build log / provenance**: `docs/build-log.md` (98 B) carries the four data anchors `65818ace cc096f17 f7df12fd dd19e8ae` (replacing Cycle 2.5's `dc261185 e11322ba 2a87a374 5628d8f7`); `dist/` = 181 physical files (171 emitted + 10 Vite outputs); double-build dist tree SHA-256 prefix `e8705777` confirms full byte-identity.

### Key decisions

- **ADR-0022 (logo, heart on disc)**: 4→3 element inversion (removed duplicate white circle via R12 hide-not-delete; circle=1).
- **ADR-0023 (rename, Hospice Finder UK)**: declarative brand rename across 8 surfaces; identifiers locked; no exterior names carry the old branding; JSON-LD Organization/title surfaces match.
- **ADR-0015 (deterministic static prerenderer as third build step)**: idempotent, no npm deps, no timestamps, LF-only with single trailing newline, delete-then-recreate to ensure byte-identity across runs.
- **Hash-redirect guard IIFE (ADR-0016)**: route normalization leading to 404 without 204 subrequest storm; every emitted page includes the guard IIFE.
- **Hospice JSON-LD (ADR-0018)**: `@graph` contains Organization and HealthCareBusiness; no `sameAs`, `affiliation`, `parentOrganization`, `contactPoint`, `openingHours`, or `pricing` (endorsement guard).
- **Canonical + ID URL scheme (ADR-0019)**: the id *is* the URL slug — every page ships at `/hospice/<canonical-id>.html`; ids are `{nation}-{registerId}` with `r<n>` fallback (shipped `ni-r1…ni-r6`); the `wales-r<n>` one-line fix landed before any Wales content (0 live URLs churn); emitted artifacts sort code-unit ascending by id; hide-not-delete still applies (R12).
- **Data anchors**: `65818ace cc096f17 f7df12fd dd19e8ae` (replaces Cycle 2 `dc261185 e11322ba 2a87a374 5628d8f7`); `docs/build-log.md` live with cycle anchors.

### Process lessons

1. **Sub-session first-turn timeout pattern**: writes land on disk while `create_sub_session`/`send_message` dispatch times out; detect by waiting for disk confirmation on the sub-session's first turn before re-dispatching (applied 3×: QA, DevOps, Docs, no rework consumed).
2. **Daemon death is a single point of failure**: process PID 55148 died mid-re-dispatch; verify daemon stability before shipping new code or heavy compute.
3. **RQ-1 lead discipline**: re-measure every claimed artifact value on disk; use `.cjs`/`.mjs` scripts for assertions (e.g., PR-1 false-positive brand hit avoided by disk-grep rather than ephemeral `node -e` probe).

### Remaining human gates

- **G5** (Chrome mobile pass, Slow 4G + 4× CPU): carried forward from Cycle 2; W5/W7/W10/W11 post-fix timings; m1/m2/m4 baselines; not yet human-smoked on the live device.
- **G7** (Overpass mirror capacity re-check): long tail of throughput when external mirror hits rate limits; lead re-check recommended.
- **W8** (ADR-0010 STRIDE-K gate): undecided (pending live G5 m1 result); decision path: >800 ms on m1 ⇒ enable STRIDE-K; else record "not triggered".

### Open findings

None Blocking. Listed risk-accepted (carried-forward or resolved) items:
- F-1: 7-vs-20 invariant confusion (now documented in Cycle 2 Hindsight history).
- npm audit: esbuild dev-only advisory (not shipping to dist).
- 12 unassigned practices (9 OSM-gap postcodes; covered by geocoder gap).
- G5 / G7 / W8: explicitly noted above as human gates.

## Cycle 4 Hindsight — Completed 2026-10-30 (BEACON rebrand/release; published as `bbe4bde` 2026-10-30)

### What changed (7 delivered items, all disk-verified RQ-1)

1. **Hospices-only first load** (ADR-0025): GP + shops layers off by
   default — zero `localStorage` persistence, in-memory `useState(false)`
   per layer; catchment areas remain visible.
2. **About/footer overlap fix**: `.app-footer` flex rules (`small`
   `flex-basis: 100%` under 1100 px) stop the legal block overlapping at
   desktop widths.
3. **Back-to-home affordance**: `← Back to map` anchor on every info route
   (about / methodology / privacy / licences / accessibility / errors).
4. **Auto/Light/Dark theme** (ADR-0024): sole `localStorage` key
   `hfuk-theme` (whitelist `light`/`dark`, absent = auto); sole JS owner
   `src/lib/theme.ts` (77 L, no React state, `matchMedia` auto listener
   module-level in `main.tsx`); no-flash boot IIFE in `index.html` head —
   frozen byte-identical twin emitted by `scripts/prerender.mjs` (2-space
   indent inside the `out.push`); `data-bs-theme` on `<html>`.
5. **"Has Published Service Area" filter removed from all UI** — GROUP
   PROVENANCE RETAINED (`kind` unchanged in data); zero UI badge tokens;
   question remains in METHOD/About prose (hide-not-delete, ADR-0012).
6. **GPs + shops de-emphasised** (ADR-0026): panel/search order GPs
   muted + shops listed before GPs, smaller GP pin styling.
7. **BEACON rebrand** (ADR-0022/0028): 10 `--hf-*` colour tokens per
   theme block (`src/styles.css` light L28/L35, dark L50/L57 — light
   `#163a5f`, dark `#7dadd6`, GP fill `#74879b`/`#8298ad`) + 2 font
   tokens; Archivo 700 + Public Sans 400/600 self-hosted (`public/fonts/`
   = exactly 3 woff2, SIL OFL 1.1, favicon/logo recoloured to navy);
   coral `#e06744` appears only in `og-image.png` (0 text hits in
   src/ + public/).

### ADRs recorded (docs/adr/ — exact on-disk titles)

0024-`theme-auto-light-dark`, 0025-`layer-state-both-off-first-load`,
0026-`search-ranking-shops-then-gps`, 0027-`dark-leaflet-css-overrides`,
0028-`css-token-plan-for-rebrand`, 0029-`keyless-osm-build-time-geocoding`,
0030-`reproducible-static-pipeline`. (The task brief's parenthetical
titles were wrong on 0024/0025/0029/0030 — disk titles above
authoritative; verify by glob before citing.)

### Invariants (disk-verified this run; supersedes Cycle 3's "181 files")

- `dist` = **184 physical files** (= 171 emitted + Vite JS/CSS + fonts 3
  + logo + manifest + og-image + data JSONs); double build
  **184/184 SHA-256 byte-identical**.
- Sitemap **168 `<loc>`** (7 static + 161 hospice); **169 `.html`** shells;
  boot snippet `/hfuk-theme/` in **all 169**; script tags
  **507 open / 507 close** across dist.
- `check:layout` exit 0; `validate-tessellation` exit 0 (161 hospices /
  3 empty cells); `package.json` untouched (no deps added — ADR-0008).
- Data anchors unchanged (`65818ace cc096f17 f7df12fd dd19e8ae`), 161
  hospices / 11,014 practices / 138 shops; THE INVARIANT (`kind ===
  'published'` = exactly 7) holds.

### Gates & findings

- **QA**: PASS (11/11 gates, 0 Blocking). FQ4-1 `#000000` fallback in dark
  Leaflet CSS (informational); FQ4-2 stale GLOSSARY `kind` line (FIXED —
  line reworded, provenance noted); FQ4-3 scratch dirs `.qwen/`+`.tmp/`
  (FIXED — `.gitignore` now covers both); FQ4-4 CRLF logo.svg
  (informational, round-trips).
- **Security**: PASS, 0 Blocking. SEC-4-01 OFL font attribution (Low)
  RESOLVED in Stage 9 (Licences page Typography section, OFL 1.1 text +
  byte sizes, verified in shipped dist). SEC-4-02/03 informational
  (scratch dirs now gitignored; dark-tile debt carried, ADR-0027 §4.5).
  Design: SEC-4-D1 `hfuk-theme` trust surface (Low, accepted), D2 =
  SEC-F3 (Medium), D3 = SEC-F2 (Info, no CSP).
- **Deploy**: ADR-0014 git-connected Cloudflare Pages (push to `main`
  publishes); `data/` + `data-raw/` zero diff (SHA-256 verified — data
  pipeline did not run this cycle), scripts touched only for the
  ADR-0024 boot twin.

### Closure state — READ BEFORE ANY PUBLISH DECISION

- **C4 PUBLISHED (2026-10-30).** Ship commit `bbe4bde` ("Ship Cycle 4:
  BEACON rebrand - hospices-only first load, auto/light/dark theme,
  GP+shop de-emphasis, published-area UI removed (ADRs 0024-0030)", 51
  files, +3487/-790) on `origin/main` after James's "Commit + push now"
  gate decision; git-connected Pages build auto-published (ADR-0014).
  Rollback = `git revert bbe4bde` + push (push = publish).
- **Post-publish human verification (James's items 8–9)**: visual contrast
  light+dark @ 1024/1280/1440/375 + theme persistence across reloads —
  moved from pre-push gate to post-publish verification by James's commit
  + push decision (code-level verification had already passed: double
  build, token greps, dist invariants).
- G5 / G7 / W8: carried from Cycle 3, unchanged this cycle.
- `.agents/design/` reconciliation: **7 SVGs = 6 concept pairs
  (haven/beacon/keep × light/dark) + 1 type-palette specimen** — the
  "6" (security) and "7" (pipeline) counts are both correct at their
  scopes; not a defect.
- The "no published before push" rule is now satisfiable: C4 is committed,
  James-approved, and pushed (2026-10-30) — "published" is accurate.

### Bank state & ingest plan (no MCP tools in the Stage-10 subagent —
the vllm-linux bank could not be searched or ingested from it; lead
performed the ingest post-stage)

- Bank was re-seeded 2026-10-28 from gitlog → reflects at most the pre-C4
  committed state; **no Cycle 4 page exists** (theme, BEACON tokens,
  ADRs 0024–0030, 184-dist invariants all absent).
- **Ingest DONE (lead, 2026-10-30)**:
  `hindsight_ingest_document` correction page "Correction: HospiceInfo
  Cycle 4 BEACON rebrand state (2026-10-30)"
  (doc_id `correction-hospiceinfo-cycle-4-beacon-rebrand-state-2026-10-30`)
  carrying this section with file-path metadata (`.agents/hindsight.md`,
  `src/lib/theme.ts`, `src/styles.css`, `docs/adr/0024…0030`); curation of
  the five pages (component map / conventions / initiatives / decisions /
  core concepts) is automatic via the bank server.

### Remember for next time

- **Boot twin rule**: the `hfuk-theme` IIFE lives in exactly two places —
  `index.html` head and `prerender.mjs` `out.push`; edit both in the same
  change or dist drifts (QA gate 10 checks byte equality).
- **dist gate set** (re-run after any build): 184 files / 168 `<loc>` /
  169 shells / 169 boot snippets / 507+507 scripts / `check:layout` exit
  0 / double-build SHA-256.
- **C4 is published** (ship commit `bbe4bde`, 2026-10-30) — verify "C4
  shipped" claims against git log / the ledger; glob ignores gitignored
  `dist/`, verify dist by direct path reads.
- ADR titles: trust `docs/adr/` filenames (the pipeline brief misnamed 4
  of the 7).
- `kind` is provenance-only now (ADR-0012): never re-add published-area
  UI without a new ADR; GLOSSARY records this (Cycle 4 terms).
- OFL attribution for the 3 shipped fonts lives on the Licences page
  (Typography section) — add future fonts only with the same attribution
  pattern.

## Cycle 5 Hindsight — Landing pass completed 2026-11-08 (Scotland PCS append 2 + Wales final-gate resolution; publish PENDING James's human gate)

**Landed on** `e1fbc1b` (28 uncommitted `git status` entries as of
2026-11-08). One commit + push to `main` auto-publishes (ADR-0014);
rollback = `git revert` + push (byte-exact deterministic build).

### What changed (landing — all figures disk-verified 2026-11-08)

- **Data**: hospice total **192** (was 161) — en=152, sc=34, ni=6,
  wales=0; curated stays **20**. Scotland 34 = 3 Care Inspectorate +
  29 OSCAR + **2 PCS append** (`sc-pcs-30` Edinburgh "Marie Curie
  Hospice"; `sc-pcs-58` Dunfermline "Queen Margaret Hospital Hospice
  Ward (Ward 16)"). Wales **0 verified-negative** (ADR-0020): live
  2026-11-08 NHS Wales P&I fetch, SHA-pinned `8055D936…` (61,852 B);
  the published list is under review — re-poll when it lifts.
- **dist**: 200 `.html` shells (1 index + 6 info + 192 hospice + 1 404),
  199 `<loc>` (192 + 7; prerender self-assert passed), **215 files
  total** (202 emitted + 13 static). Double `npm run build`
  byte-identical (171 files).
- **Tessellation** (vle pass): 178 cells, 100.00% coverage, 0 slivers,
  1 empty cell (ni-r5), overlap 0.0060 deg² → FQ5-L1 (Informational).
- **Practices/shops**: 138 shops; 11,014 practices (11,002 geocoded /
  12 unplaced = 9 BT + 3 non-BT — pre-existing C3 posture, 0 new).
- **Code delta**: `sc-pcs` router only (Scotland PCS detail link) —
  validated by the fresh Security pass (SEC5-L3/L4 guard notes).
- **SHA pins** (implementation.md §Landing, 6 total):
  hospices-all `DACD4426…`, sc-normalised `8f7485d2…`, PCS raw
  `D768069C…` (Wayback 2026-05-14), Wales raw `8055D936…`,
  land-mask `b9b313ab…` (unchanged G7 pin), public `hospices.json`
  `50B989CC…` (72,265 B), `hospices-sc.json` `85474C85…` (26,087 B).

### ADRs recorded (docs/adr/ — exact on-disk titles)

0031-`oscar-primary-scotland-source-and-id-scheme`,
0032-`pcs-append-id-scheme-and-equivalence-mapping` (13-row
equivalence table; the 2 unmapped entries are exactly the append
delta). Together with ADR-0020 (Wales VERIFIED-NEGATIVE zero-set).

### Findings (all non-blocking; 0 Blocking, 0 new risk-accepted)

- FQ5-L1 (Informational): catchment overlap 0.0000 → 0.0060 deg² from
  the 12 newly-placed Scotland units; coverage 100.00%, 0 slivers —
  no action.
- SEC5-L1..L5 (Informational): L1 zero runtime network in extractors;
  L2 PCS entity-decode neutralisation (markup inert); L3
  prefix-exclusive id schemes + 3-layer dedup + delta guard; L4 `en-`
  prefix guard in merge; L5 package.json unchanged. No design-level
  items; nothing routes to Architect.
- Carried: SEC-4-01 (OFL font attribution — resolved in C4 Docs),
  SEC-4-02 (scratch hygiene — `scripts/_tmp-hash.mjs` untracked,
  **removed before any commit**), SEC-4-03 (dark-tiles debt,
  ADR-0027).
- Process note (ops.md only, gate artifacts untouched): gate-tail
  prose counters in `qa.md` / `implementation.md` are stale Cycle-4
  template carry-forwards (169/177/193/171 vs disk truth
  200/199/215/192); prerender self-assert proves the dist.
- Carried discrepancy: pipeline.md 2026-11-17 pivot table pins Wales
  SHA `57B56A20…` vs implementation.md `8055D936…` — implementation.md
  authoritative (raw re-fetch 2026-11-08); no action.

### Process lessons (this host)

- **`create_sub_session` silent first-turn death**: Security
  (`S5-Sec-Land-C5`, `-r2`) and Docs (`S5-Docs-Land-C5`) both
  first-turn-timed out with zero writes this cycle; QA
  (`S5-QA-Land-C5`) timed out on the lead side but its write landed on
  disk. Rule in practice: write-file-only briefs + RQ-1 disk
  verification + **lead lands the artifact directly** (C4 precedent)
  when a sub-session breaks.
- **Stale counter carry-forward** in gate prose: re-derive every
  invariant from disk (file counts, `<loc>` counts) at landing; trust
  the prerender self-assert over template numbers.

### Bank state & ingest plan (no MCP tools in the Stage-10 subagent —
lead performed the bank ingest after the stage, C4 pattern)

- Bank was re-seeded from gitlog → reflects the committed state only
  (`e1fbc1b`); **no Cycle 5 landing page exists** (192/34/0/6/20,
  215/200/199 invariants, ADR-0031/0032, PCS append, Wales
  verified-negative — all absent).
- **Ingest DONE (lead, 2026-11-08)**:
  `hindsight_ingest_document` correction page "Correction: HospiceInfo
  Cycle 5 landing state (2026-11-08)"
  (doc_id
  `correction-hospiceinfo-cycle-5-landing-state-2026-11-08`) — claims
  what the bank said (or didn't), what is true now (192; Scotland 34;
  Wales 0 verified-negative; 215/200/199 dist; uncommitted on
  `e1fbc1b`), and the evidence (RQ-1 marker sweep 2026-11-08).

### Remember for next time

- **Publish PENDING**: landing uncommitted on `e1fbc1b` until James's
  human gate (one commit + push → auto-publish, ADR-0014). Post-publish
  smoke checks: 199 `<loc>`; 200-shell survey incl. `sc-pcs-30` /
  `sc-pcs-58`; Scotland 34 / Wales 0 in data; robots 75 B; 3 woff2
  14,508/14,632/14,592 B.
- **Wales list is under review** (ADR-0020) — re-poll the NHS Wales P&I
  when it lifts; the zero-set is a verified negative, not an
  exhaustion.
- **Script balance** was NOT measured this landing pass — do not
  fabricate it in MAINTENANCE.md invariants.
- MAINTENANCE.md convention: earlier cycle sections stay the base
  guide; newer cycle runbook sections state current values (larger
  counts win).
- Wales/Scotland raw provenance lives in `data-raw/` (+ Wayback for the
  PCS snapshot); the merge is the only step that may gain rows —
  rebuild chain is fail-fast + byte-identity (merge → geocode →
  build-data ×2 → validate-tessellation → build ×2).
