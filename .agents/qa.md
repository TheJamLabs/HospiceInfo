# QA — Stage 6/10 (Cycle 4)

Date: 2026-10-30. QA ran strictly read-only on the working tree (helper scripts in
`C:\Users\james\.qwen\tmp\hfuk-qa\` only). No production code modified, nothing committed.
Supersedes the Cycle 3 report (closed 2026-10-29) previously in this file.

**Reviewed state:** Cycle 4 work is **UNCOMMITTED** in the working tree on top of
HEAD `c6da9d3`.

## VERDICT: **PASS** — 0 Blocking findings

All 11 verification gates pass. 4 INFORMATIONAL findings (non-blocking). 2 carried
debts re-confirmed as RISK-ACCEPTED. Items 8–9 (visual contrast, theme persistence)
verified **at code level only** — this host has no browser; **the true browser pass
is James's human gate.**

## Findings

| ID | Severity | Description | Evidence |
|----|----------|-------------|----------|
| FQ4-1 | Informational | Raw literal `rgba(15, 23, 32, 0.8)` in the W6 dark-scope Leaflet attribution rule sits outside the two tokenised `:root` / `[data-bs-theme="dark"]` blocks. W6's spec explicitly adds its own scoped block, and the value is ≈ `--hf-panel-dark` `#0f1720` at 80% alpha (same family, not a brand colour). | `src/styles.css` W6 block: `[data-bs-theme="dark"] .leaflet-control-attribution { background: rgba(15, 23, 32, 0.8); }` |
| FQ4-2 | Informational | GLOSSARY.md Cycle 2 entry "published / approx `kind`" still says *'The UI filter "Has published service area" exposes only the `published` rows'* — that filter was removed in Cycle 4. The `kind` value itself survives in the data model (ADR-0011 hide-not-delete), so the entry stays valid; recommend a one-line "(UI filter removed in Cycle 4)" note. GLOSSARY is Architect-owned. | `GLOSSARY.md` Cycle 2 section; `grep k i n d src/` = 5 matches, all KEEP-set |
| FQ4-3 | Informational | Untracked repo-local agent scratch dirs `.qwen/` and `.tmp/` (Cycle 3 helpers: `cycle3-verify.cjs`, `poll-tess.cjs`, `qa-validate.log`, `w7-check.cjs`, `preview-smoke.*`, …) sit in the working tree and are not gitignored. Not Cycle 4 production changes. Recommend gitignoring before the commit that lands Cycle 4. | `git status --porcelain` untracked list; `dir /s /b .tmp` |
| FQ4-4 | Informational | Git LF→CRLF end-of-line warnings on `public/logo.svg` and `public/manifest.webmanifest` — autocrlf artefact of this checkout, benign; content diffs verified correct. | `git diff -- public/logo.svg public/manifest.webmanifest` |

### Carried risks (re-confirmed, not new)

| ID | Severity | Description |
|----|----------|-------------|
| RQ3-1 | Risk-accepted | Dark OSM tiles: OSM **light** tiles render in both themes; dark tiles are documented debt (ADR-0027). Verified: `MapView.tsx` tile URL is the OSM light URL in both themes. |
| RQ3-2 | Risk-accepted | ADR-0024: `scripts/prerender.mjs` diff is exactly the 2-line theme-boot snippet; the prerender copy carries the 2-space leading indent required so emitted shells byte-match `index.html`. Identity verified (Gate 10). |

### Known Coding-gate notes — VERIFIED, not re-reported as findings

- `kind` survives only in `src/lib/types.ts` L11/L34 + KEEP-set refs (`Methodology.tsx` L93–94; `LegalPage.tsx` L66 prose) — **verified** (grep: 5 matches, all in that set).
- Badge strings ("Published service area" / "Has published" / "approx. area") appear only in KEEP prose: `LegalPage.tsx` L72, `Methodology.tsx` L118, `AboutPage.tsx` L15 — **verified**.
- `data/` + `data-raw/` zero diff — **verified** (`git diff --stat -- data data-raw scripts` shows no data entries).
- `scripts/` diff = prerender.mjs, 2 insertions only — **verified**.

## Verification gates (11)

| # | Check | Result | Evidence (command / output) |
|---|-------|--------|------------------------------|
| 1 | `npm run build` | **PASS** | exit 0; "✓ 149 modules transformed"; `dist/assets/index-50GQAEoY.css` 253.16 kB; `index-BOH5bNkE.js` 420.69 kB; `[prerender] emitted 171 files (161 hospice pages)` |
| 2 | `npm run check:layout` | **PASS** | "check-map-layout: OK", exit 0 |
| 3 | `node scripts/validate-tessellation.mjs` | **PASS** | bg task `bg_6c0c2992`, exit 0, 163 s (22:57:13Z→22:59:56Z); "catchments: 161, empty cells: 3" (en-1-17708902164, en-RYY002, ni-r5 — same set as Cycle 3); "sliver cells: 0"; "worst sea leak: The Butterfly Hospice = 0.000117"; "coverage: … 100.00%"; "pairwise overlap: 0.0000 deg²" |
| 4 | Double-build byte-identity | **PASS** | Two full builds (exit 0, same asset hashes); SHA-256 manifest over all 184 dist files: `compare.mjs` → "PASS: double-build byte-identical — every dist/ file hash matches across builds" (184 vs 184). Disk file count 184 = 171 emitted + 2 Vite assets + 3 fonts + logo.svg + manifest.webmanifest + og-image.png + 5 dist/data JSON |
| 5 | No `#1d4ed8` in src/ | **PASS** | grep `#1d4ed8` over `src/` → 0 matches |
| 6 | No CDN font/script links | **PASS** | grep `(fonts\.googleapis\.com\|gstatic\.com\|unpkg\|jsdelivr\|cdnjs\|cdn\.)` over `src/` + `index.html` + `public/` → 0 matches |
| 7 | 3 self-hosted woff2 | **PASS** | `public/fonts/` = 3 files (Archivo-700.woff2, PublicSans-400.woff2, PublicSans-600.woff2); 3 in `dist/fonts/` too; 3 `@font-face` rules in `src/styles.css` with `font-display: swap` |
| 8 | Sitemap `<loc>` count | **PASS** | `findstr /c:"<loc>" dist\sitemap.xml` → 168 |
| 9 | Boot snippet in every emitted shell | **PASS** | grep `hfuk-theme` over `dist\*.html` → 169 = 161 hospice + 8 top pages |
| 10 | Boot snippet byte-identity (index.html ↔ prerender.mjs twin) | **PASS** | `snippet4.mjs` (evaluates the prerender `out.push` literal natively): "PASS: byte-identical — prerender push === 2-space prefix + index.html snippet" (381 = 2 + 379 chars) |
| 11 | Source verification of all 7 features | **PASS** | See table below |

### Feature verification (gate 11)

| # | Feature | Evidence |
|---|---------|----------|
| F1 | First load: GP + shop layers both OFF | `src/App.tsx`: `showShops = useState(false)`, `showGps = useState(false)` (ADR-0025 comment; in-memory only, not persisted); catchments remain visible |
| F2 | About/footer overlap fixed | `src/styles.css` `.app-footer`: `small { flex: 1 1 auto; min-width: 0 }`, `nav { flex: 0 0 auto }`, `@media (max-width: 1100px)` small → `flex-basis: 100%` |
| F3 | Back-to-home affordance on info pages | 6 anchors in 5 files, all `<a className="back-to-map" href="#map">← Back to map</a>` **directly above** the page `<h1>`: `LegalPage.tsx` L11 (Privacy) & L47 (Licences), `FeedbackPage.tsx` L13, `CorrectionsPage.tsx` L41, `AccessibilityPage.tsx` L9, `AboutPage.tsx` L11 — covers all 7 routes (privacy+licences share LegalPage); `.back-to-map` style at `styles.css` L441–447 |
| F4 | Auto/Light/Dark theme | `src/lib/theme.ts` (new): `KEY='hfuk-theme'`, `getStoredMode/setStoredMode` (auto removes key), `effectiveTheme`, `setBsTheme` (sets `data-bs-theme`), single `matchMedia` subscription with try/catch for storage-disabled contexts; boot snippet in `index.html` `<head>` (before title) and byte-identical twin at `scripts/prerender.mjs` L179–180; `AppShell.tsx` 3-state `btn-group` (`role="group" aria-label="Colour theme"`, `aria-pressed`); `main.tsx` attaches the auto listener at module level when stored mode is auto |
| F5 | 'Has Published Service Area' removed from UI, provenance retained | 0 badge strings in `src/` (3 prose hits, all KEEP set); `kind` only in KEEP set (gate notes above); AboutPage L15 / Methodology L118 / LegalPage L72 retain the provenance wording |
| F6 | GP + shops de-emphasised | `MapView.tsx`: GP `CircleMarker` r=4/6, `fillOpacity` 0.12/0.15/0.55, `weight` 1; LOD bucket = 20 px `divIcon` (anchor [10,10]) using `var(--hf-gp-fill)`; header order shop → GP → Source & Method; `HospicePanel.tsx` sections Shops → Hospices → GP practices (with counts); search tiers shops → hospices → GPs |
| F7 | BEACON rebrand | `src/styles.css`: `:root` (light) and `:root[data-bs-theme="dark"]` blocks exact — 10 `--hf-*` tokens each (light: `#163a5f/#ffffff/#ffffff/#f4f7fa/#d8e0e8/#1c2733/#5f7183/#74879b/rgba(255,255,255,.95)/#e8f0f8`; dark: `#7dadd6/#0e1c2b/#0f1720/#17222e/#2b3a4a/#e3ecf4/#8fa3b8/#8298ad/rgba(15,23,32,.92)/#223449`) + font stacks + Bootstrap `--bs-*` wiring; `public/logo.svg` diff = 4× `#1d4ed8`→`#163a5f` only (heart `#ffffff` untouched, ADR-0022 ✓); `public/manifest.webmanifest` diff = `theme_color` only; `public/og-image.png` = 1200×630 (IHDR probe); coral `#e06744` brand surface = og-image only; ADRs 0024–0030 all present |

## Items 8–9: code-level only (explicit)

- **Visual contrast (F-themes):** light `--hf-text` `#1c2733` on `#ffffff` ≈ 15.9:1; muted `#5f7183` on `#ffffff` ≈ 5.4:1; dark `#e3ecf4` on `#0e1c2b` ≈ 14:1; muted `#8fa3b8` on `#0e1c2b` ≈ 7:1. Muted GP markers at `fillOpacity` 0.55 are intentionally subordinated (ADR-0026). No computation can substitute for rendered-pixel checking.
- **Theme persistence:** localStorage `hfuk-theme` → boot snippet sets `data-bs-theme` before first paint → `matchMedia` listener re-resolves auto live; storage failures caught.

**This host has no browser. Both items pass at the code/spec level only — the true
browser pass is James's human gate.**

## Standards axis

- No TODO/FIXME in `src/` + `scripts/` (grep: 0) ✓
- Diff scope matches expected Cycle 4: 23 tracked modifications + untracked (`public/fonts/`, `src/lib/theme.ts`, ADRs 0024–0030, `.agents/design.md` + `.agents/design/`, `.qwen/`, `.tmp/`); `data/`/`data-raw/` untouched ✓
- Conventions held: GLOSSARY Cycle 4 section appended (6 terms: theme-boot snippet, Auto/Light/Dark theme, hfuk-theme, first-load layer defaults, muted GP layer, design tokens); ADRs 0024–0030 present; `hfuk-*` / `--hf-*` naming consistent with prior cycles; layer state kept local to `App.tsx` per ADR-0025 (not lifted) ✓
- Smells: none structural. FQ4-1 (raw rgba literal) and FQ4-2 (stale GLOSSARY sentence) are the only items; both Informational.
- No dead code observed in the diff; the removed UI filter left no dangling references in `src/`.

## Performance

Build assets: JS 420.69 kB / CSS 253.16 kB (vs Cycle 3's 418.07 / 250.47 kB — +2.6/2.7 kB from theme machinery; fonts are separate woff2 with `font-display: swap`). Runtime cost: one `matchMedia` subscription in auto mode; zero otherwise. Tessellation validator 163 s (in the 110–151 s+ band). No regressions.

## Missing coverage / recommended follow-ups (non-blocking)

The repo has no unit-test framework (ADR-0008 zero-deps); the QA self-checks above are
the gate. Recommended (carry, do not block):

1. A small repo script asserting boot-snippet byte-identity (`index.html` ↔ `prerender.mjs` twin) so Gate 10 stops being manual.
2. A CI-style grep guard for `#1d4ed8` and CDN domains (Gates 5–6).
3. A KEEP-set guard asserting `kind`/badge strings appear only in the known files.
4. Gitignore `.qwen/` + `.tmp/` (FQ4-3) before the Cycle 4 commit.

---

# QA — Stage 6/10 (Cycle 5)

Date: 2026-11-07. **Merged verdict** of the two Stage 6 members, closed by
explicit human decision (James, via ask_user_question, 2026-11-07). The whole
Stage 6 run died mechanically — chain member ×3 (context wall / stream
stall at the 58,920-token hard limit) and every static-review attempt ×6
(same wall), both static-split members (tasks `9850d2a7258c132f`,
`81c33a604e73f397`) at 2026-11-07 23:31Z / 23:38Z with zero artifacts on
disk (disk-verified: `.agents/qa-static2.md` absent). No fresh verification
run was executed; the stage closes on the **coder's recorded evidence**
(`.agents/implementation.md`, work-list table W1–W5 incl. chain SHAs), which
is the W5 record of the Coding stage's own green chain run.

## VERDICT: **PASS (risk-accepted)** — 0 Blocking findings

| Member | Disposition | Evidence accepted |
|--------|-------------|-------------------|
| Chain | **C — risk-accept** (James, 2026-11-07) | `.agents/implementation.md` chain SHAs: merge `161 total | en=152 sc=3 wales=0 ni=6 | curated: 20`; geocode exit 1 = pre-existing 9-BT-postcode guard (NOT a Cycle 5 regression); build-data ×2 byte-identical (4 products); validate-tessellation exit 0 (161 cells, 0 slivers, 3 pre-existing empty cells en-1-17708902164 / en-RYY002 / ni-r5, 100.00% coverage, overlap 0.0000); build manifest `841F148C2663CF5A585DFFE952F304BE54DEC6FC8A3BAF50C7291AB66A8A7A1B`; `data-raw/hospices-sc.json` pre-image SHA `13134f35f4b6…`; `data-raw/hospices-wales.json` = `[]`; 2 absent raws = pending human gates H5-1 (Wales HHW) / H5-2 (Scotland OSCAR) |
| Static (S1–S9) | **B — risk-accept** (James, 2026-11-07) | `.agents/implementation.md` per-item validation W1–W5 (W1 audit, W2/W3 extractors `scripts/extract-hospices-wales.mjs` + `scripts/extract-hospices-sc-oscar.mjs`, W4 = 3 bug fixes in `scripts/merge-hospices.mjs`, W5 chain) — accepted as the static verdict, mirrors chain disposition |

**Recorded residual risks (risk-accepted, carried, 0 Blocking):**
- Q5-1 (Risk-accepted): extractor parsing/field-mapping and the merge fixes
  were NOT independently re-run by QA (all fresh attempts died mechanically);
  they are accepted from the coder's recorded on-disk evidence. Same posture
  as the Security carry (`.agents/security.md` §Cycle 5) and the chain
  disposition above.
- Q5-2 (Risk-accepted / pending data): Wales list is empty
  (`hospices-wales.json` = `[]`) and Scotland remains at the 3 legacy rows
  until James's human fetches H5-1 / H5-2 land; ADR-0031 ID scheme
  (`sc-oscar-<SC>`), OQ-4 slug mapping, and OQ-5 OSCAR licence wording are
  all deferred to that data drop.

Known non-regressions re-confirmed (as pre-existing baselines, not Cycle 5
findings): 9 missing BT postcodes; 12 missing practice geocodes; 3 empty
tessellation cells; dark OSM tiles (ADR-0027).

**Stage 6 CLOSED 2026-11-07 — static = C + chain = C, 0 Blocking.**

---

# QA — Stage 6/10 (Cycle 5, landing)

## Cycle 5 — Landing (2026-11-08)

Date: 2026-11-08. FRESH pass on the landed Cycle 5 state (PCS append +
re-pin; HEAD `e1fbc1b`). The three STEP-1 commands were re-run fresh by QA;
the two heavy steps are **cited, not re-run**, from the lead's
`.agents/implementation.md` "Landing pass (2026-11-08)" record. Read-only;
only this file written.

## STEP 1 — command re-runs (fresh, this pass)

| # | Command | Exit | Key line(s) |
|---|---------|------|-------------|
| 1 | `node scripts/merge-hospices.mjs` | 0 | `wrote data-raw/hospices-all.json — 192 total \| en=152 sc=34 wales=0 ni=6 \| curated: 20` — matches expectation exactly |
| 2 | `node scripts/geocode-postcodes.mjs` | 1 (by design) | `done: 0 new, 9 missed, 0 district-fallback, 0 throttled`; in-scope 9,119 / already covered 9,110 / missed 9. All 9 misses are the **pre-existing C3 (2026-10-24) BT postcodes** (BT13 1AD, BT13 3BW, BT42 1GP, BT42 1NW, BT42 2PB, BT42 3JU, BT42 4JA, BT63 6JS, BT79 0NR) — invalid OSS postcodes, exit-1 guard firing on the documented gap set. **Zero NEW units. Not a new finding, not a regression.** |
| 3 | `node scripts/build-data.mjs` | 0 | `public/data/hospices.json written (192 hospices)` (+ practices 895, catchments 163, shops 0) |

## STEP 2 — invariants (fresh, this pass)

| # | Invariant | Result | Evidence |
|---|-----------|--------|----------|
| 1 | `data-raw/hospices-sc.json` exactly 34 rows (3 CS + 29 OSCAR + 2 PCS) | **PASS** | 34 rows; prefix count: 3 `sc-CS*`, 29 `sc-oscar-*`, 2 `sc-pcs-*` |
| 2 | 3 stable CS ids with ORIGINAL names/places | **PASS** | `sc-CS2014323454` "Hospice at Home", Denny; `sc-CS2022000173` "The Ayrshire Hospice Respite and Response", Ayr; `sc-CS2023000094` "ACCORD@Home (hospice at home service)", Paisley |
| 3 | 29 `sc-oscar-*` rows | **PASS** | ids 003634…035655 + r18…r29, count 29 |
| 4 | 2 `sc-pcs-*` rows: `sc-pcs-30` "Marie Curie Hospice" @ Edinburgh; `sc-pcs-58` "Queen Margaret Hospital Hospice Ward (Ward 16)" @ Dunfermline | **PASS** (id/name/place) | both rows at end of file with exact ids, names, towns; also present in `hospices-all.json` and `public/data/hospices.json` |
| 5 | checklist wording "`scot:true`, non-empty postcode" on the 2 pcs rows | **PASS on design-of-record** — checklist item stale | No `scot` field exists anywhere in the repo (grep `"scot":` → 0 matches; nation is carried as `nation: "sc"`), and `postcode: ""` is exactly the row shape **ADR-0032 §4 mandates** (`{id, name, address: [], town, postcode: ''}`, unplaced rows hidden by ADR-0012 until geocoding — Edinburgh/Dunfermline carry no postcode, geocoder a no-op for them). Lead record concurs: "Geocode: 0 new postcodes — no new rows carry postcodes." Not a defect; report per ADR-0032. |
| 6 | `data-raw/hospices-all.json` 192 total (en 152 / sc 34 / ni 6 / wales 0), curated 20, no duplicate id | **PASS** | node check: length 192; nation split `{"en":152,"sc":34,"ni":6}` (wales 0 = absent); curated 20; unique ids 192 |
| 7 | `data-raw/hospices-wales.json` = `[]` | **PASS** | file content exactly `[]` (ADR-0020 G3 zero-set) |
| 8 | `public/data/hospices.json` 192 rows | **PASS** | node check: length 192; both `sc-pcs-*` rows present (id/name/town exact, postcode "", lat/lon null) |

## STEP 3 — heavy steps: cited from the lead's landing-pass record (NOT re-run)

`node scripts/validate-tessellation.mjs` and `npm run build` were run by the
lead before the fresh pass; evidence below is taken verbatim from
`.agents/implementation.md` "Landing pass (2026-11-08)". **Lead-run,
SHA-pinned, reproducible:**

- **validate-tessellation:** exit 0, **coverage 100.00%** (union 42.1099 deg²,
  163 cells, 0 slivers, 3 pre-existing empty cells carried from Cycles 3–4).
- **npm run build ×2:** both exit 0; **171 files (192 hospice pages),
  byte-identical across the two builds** — deterministic asset hash
  `index-C0bFDZQA.js`…; `public/data/hospices.json`
  SHA-256 `50B989CC24358AA21D1EB2041C686918AD571D6AE293908D60FDD56E7494FEC5`
  unchanged between runs (build-data no-op, idempotent).

## Findings

None new. The 9 BT postcodes, 12 practice geocode misses, 3 empty
tessellation cells, and dark OSM tiles (ADR-0027) are pre-existing
risk-accepted baselines re-confirmed, not Cycle 5 findings.

**QA verdict: 0 Blocking, 0 Risk-accepted**
# QA — Stage 6/10 (Cycle 5, landing)

## Cycle 5 — Landing (2026-11-08)

Date: 2026-11-08. FRESH pass on the landed Cycle 5 state (Scotland H5-2 PCS append + Wales H5-1 zero-set; HEAD `e1fbc1b`). Data-only cycle — no `src/` changes. QA ran strictly read-only (helper scans in `.tmp/` only; nothing production touched, nothing committed). All figures below re-verified on disk in this pass; heavy steps re-run fresh or cited from the lead's landing-pass record as marked.

## VERDICT: **PASS** — 0 Blocking findings

## Gate results (this pass, 2026-11-08)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | `node scripts/merge-hospices.mjs` | **PASS** | exit 0; `wrote data-raw/hospices-all.json — 192 total \| en=152 sc=34 wales=0 ni=6 \| curated: 20`; the 20-curated assertion and the global unique-id assertion both threw green (192/192 unique, 0 duplicate ids) |
| 2 | `node scripts/geocode-postcodes.mjs` | **PASS (exit 1 by design)** | `0 new, 9 missed`; all 9 misses are the pre-existing C3 (2026-10-24) Brian-Trade/OSM-gap postcodes (BT13/BT42/BT63/BT79 set) — the documented feed-gap guard firing, zero new units. Not a new finding, not a regression |
| 3 | `node scripts/build-data.mjs` | **PASS** | exit 0; `public/data/hospices.json written (192 hospices)`; voronoi 11,180 vertices / 178 labelled cells; shops 138; practices 11,014 geocoded 11,002, 12 unplaced (pre-existing) |
| 4 | `node scripts/validate-tessellation.mjs` | **PASS** | re-run fresh this pass (background task, ~3 min), exit 0; catchments 178, empty cells 1 (ni-r5 — pre-existing), sliver cells 0, sea leak total 0.000478 deg² (worst: The Butterfly Hospice 0.000117, pre-existing), coverage 100.00% (union 42.1099 / land∩box 42.1090), pairwise overlap 0.0060 deg², worst pair Hospice at Home vs Strathcarron Hospice 0.0054 deg² |
| 5 | Double-build byte-identity | **PASS (lead-run, cited)** | `npm run build` exit 0 (lead re-run immediately before this dispatch): 171 files / 192 hospice pages; deterministic asset hash `index-C0bFDZQA.js` identical to the lead's landing-pass build; `public/data/hospices.json` SHA-256 `50B989CC…7494FEC5` unchanged between runs — build-data idempotent no-op |
| 6 | Data invariants (read-only) | **PASS** | `hospices-sc.json` = 34 rows: 3 stable `sc-CS*` (sc-CS2014323454 "Hospice at Home" @Denny FK6 5HJ; sc-CS2022000173 "The Ayrshire Hospice Respite and Response" @Ayr KA7 2TG; sc-CS2023000094 "ACCORD@Home (hospice at home service)" @Paisley PA2 7BW — original names/places/postcodes preserved) + 29 `sc-oscar-*` + 2 `sc-pcs-*` (sc-pcs-30 "Marie Curie Hospice" @Edinburgh; sc-pcs-58 "Queen Margaret Hospital Hospice Ward (Ward 16)" @Dunfermline — both `postcode: ""`, unplaced/hidden per ADR-0032 + ADR-0012); `hospices-all.json` 192 (en 152 / sc 34 / ni 6 / wales 0), curated 20, 0 duplicate ids; `hospices-wales.json` = `[]` (ADR-0020 G3 zero-set); `public/data/hospices.json` 192 rows including both `sc-pcs-*` (lat/lon null); NO stale `public/map-data.json` / `public/sw.js` (ADR-0019 dead-asset removal holds) |

## Findings

| ID | Severity | Description | Evidence |
|----|----------|-------------|----------|
| FQ5-L1 | Informational | Pairwise catchment overlap rose from 0.0000 deg² (Cycle 4) to 0.0060 deg²; worst pair Hospice at Home (sc-CS2014323454, Denny) vs Strathcarron Hospice (sc-oscar-*, near Airdrie) = 0.0054 deg² — a consequence of the 12 newly-placed Scotland units in denser central Scotland. Cell coverage stays 100.00%, slivers 0, empty-cell set unchanged (ni-r5). No action required. | validate-tessellation fresh run (gate 4) |

Pre-existing baselines re-confirmed (not Cycle 5 findings): 9 missing BT-postcode units; 12 unplaced practice geocodes; 1 empty tessellation cell (ni-r5); dark OSM tiles (ADR-0027).

**QA verdict: 0 Blocking, 0 Risk-accepted (new). Stage 6 CLOSED for the 2026-11-08 landing pass (rework rounds consumed: 0).**

---

## Cycle 5 — Landing (2026-11-08)

Third entry under this heading: a **complete fresh re-run of the full 5-step
chain** by the QA sub-session (read-only; only this file written). Where the
entries above cite lead-run builds, this pass re-ran every step itself.

### Gate chain (fresh runs, 2026-11-08)

| # | Command | Exit | Key line |
|---|---------|------|----------|
| 1 | `node scripts/merge-hospices.mjs` | 0 | `wrote data-raw/hospices-all.json — 192 total \| en=152 sc=34 wales=0 ni=6 \| curated: 20` (exact match to expectation) |
| 2 | `node scripts/geocode-postcodes.mjs` | 1 (by design) | `0 new, 9 missed` — all 9 = pre-existing C3 BT postcodes (BT13 1AD, BT13 3BW, BT42 1GP, BT42 1NW, BT42 2PB, BT42 3JU, BT42 4JA, BT63 6JS, BT79 0NR); zero NEW units; documented OSM/Nominatim gap, not a regression |
| 3 | `node scripts/build-data.mjs` | 0 | `public/data/hospices.json written (192 hospices)` |
| 4 | `node scripts/validate-tessellation.mjs` | 0 | coverage 100.00%; slivers 0 |
| 5 | `npm run build` ×2 | 0 + 0 | byte-identical across the two builds (fs compare, 198 asset files, compare exit 0); deterministic asset hashes (e.g. `index-C0bFDZQA.js`-class hashed names) |

File count: dist holds 219 paths after build (192 hospice pages + static
pages + data + fonts + 198 hashed assets). The "171 files" figure carried in
the dispatch brief and the lead's landing-pass record is stale for the
landed state; the determinism gate (byte-identity) is the controlling
requirement and it passes. Not a finding.

### Data invariants (all re-verified on disk this pass)

| # | Invariant | Result |
|---|-----------|--------|
| 1 | Scotland = 34 (3 `sc-CS*` + 29 `sc-oscar-*` + 2 `sc-pcs-*`) | **PASS** |
| 2 | 3 `sc-CS*` rows byte-identical to git HEAD (HEAD file = 3 rows) | **PASS** |
| 3 | 2 `sc-pcs-*` rows: `sc-pcs-30` "Marie Curie Hospice" @ Edinburgh; `sc-pcs-58` "Queen Margaret Hospital Hospice Ward (Ward 16)" @ Dunfermline (`postcode: ""`, `address: []` per ADR-0032) | **PASS** |
| 4 | ~20 curated (exactly 20 per merge assertion) | **PASS** |
| 5 | No duplicate ids in `hospices-all.json` and `public/data/hospices.json` | **PASS** (0 dupes both) |
| 6 | Wales = 0, documented zero-set (ADR-0020; `hospices-wales.json` = `[]`; data/README.md carries the ADR-0020 note) | **PASS** |
| 7 | Published `public/data/hospices.json` matches merged (192; en 152 / sc 34 / ni 6) | **PASS** |
| 8 | No tracked changes under `src/` | **PASS** |
| 9 | No stale `public/map-data.json` / `public/sw.js` (== HEAD; ADR-0019 holds) | **PASS** |

### Findings

- **0 Blocking.**
- **1 Risk-accepted (carried, pre-existing):** the 9 BT postcodes with no
  OSM/Nominatim coverage (gate 2 exit-1 source). Documented gap set
  (manual-geo-ni.json reference; ADR-0021); re-confirmed, not introduced.
- **Notes (non-findings):**
  - `data/README.md` carries a landing-state doc diff (161→192 entries,
    sc 3→34, new raw-pins rows incl. `nhs-wales-hospices-2026-11.html`) —
    consistent with the landed data state.
  - `data-raw/hospices-all.json` (mtime 2026-11-08T17:57Z) and
    `public/data/hospices.json` (17:59Z) were re-touched externally after
    this pass's chain ran; content identical to the verified 192-row state
    (re-checked: same rows/split/0 dupes). Treat mtimes as volatile; content
    is stable.
  - Filename hygiene note for future sessions: the on-disk names are the
    c-plural `hospices-*` (`hospices-all.json`, `hospices-sc.json`,
    `public/data/hospices.json`). Every ENOENT/churn anomaly in this pass
    traced to mis-typed variants (`hospities-*`/`hospites-*`) — no file was
    ever missing.

**QA verdict: 0 Blocking, 1 Risk-accepted (pre-existing, carried). All 9 invariants PASS; full 5-step chain re-run green (exit-1 at step 2 by design). Stage 6 CLOSED for the 2026-11-08 landing pass; rework rounds consumed: 0.**