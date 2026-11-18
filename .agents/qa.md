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

---

# QA — Stage 6/10 (Cycle 6)

Date: 2026-11-10. FRESH pass on the C6-1 + C6-2 state (NI clip ring,
invariant-2 UK-land amendment, edge-merge hardening + C62_DBG trace).
QA ran strictly read-only: analysis harnesses in `.qwen/tmp/`
(`c62-repro.mjs`, `c62-classify.mjs`, `c62-trace.txt`); nothing production
touched, nothing committed. The `mergeTwo` slice of
`scripts/build-data.mjs` was executed in a `vm` sandbox with the
debug hooks intercepted — no source modification.

## VERDICT: **PASS** — 0 Blocking findings

2 Risk-accepted (data-level, carried) + 1 Informational. No code change
is required for any of the three reproduced anomalies; the edge-merge
hardening (adjacent-only cleanup rule) is verified correct and stays.

## Findings

| ID | Severity | Description |
|----|----------|-------------|
| Q6-1 (C6-2, T1) | Risk-accepted | **Data-level degeneracy at an L/L corner intersection (easting 49–53e4, northing 54–56e4), not an algorithm defect.** The two L-shaped source rings (grassroots-L `[49,54 49,56 51,56 51,54 51,54.001 49.0001,54.001 49.0001,54]` and L `[51,54 53,54 53,56 51,56 51,54.001 51.0001,54.001 51.0001,54]`) meet at the corner (51,54); their shared seam edges exist as **duplicated primitives** in the edge stack (seam `(51,54)→(51,54.001)` ×4 kept, `(51,54.001)→(51,54)` ×2 `inL=2`, `(51,54)→(51.0001,54)` ×2 `inR/inL=2`). All pass the pure adjacency rule (identical-pattern duplicates are *consistent*, so the rule correctly does not clean them). Full pre-cleanup classification (27 primitives, `c62-classify.mjs`): 16 kept. Chain #1 consumes exactly 11 edges and traces the composite outer boundary of the union: `[49,54 49.0001,54 49.0001,54.001 51,54.001 51,54 51.0001,54 52.2,54 52.2,54.001 53,54.001 53,56 51,56 49,56]`; `|area|/2 = 3.9986 ≈ 4.00` — the observed "single 4.00-area ring" is the geometrically **correct** composite-boundary result of this degenerate input (rsq `[51,54 52.2,54 52.2,55.2 51,55.2]` is cancelled: its left/top edges drop by neighbors, its bottom/right survive as the E→F→G→H→I detour at y=54.001). The 4 leftover duplicate primitives chain into a 3-vertex sliver `D-E-F` (area ≈ 5e-8) in chain #2, which the caller's 1e-6 area filter (`build-data.mjs` ACCEPT path, not `mergeTwo`) discards. **Consequence:** one catchment cell carries a slightly squarer-than-true boundary; cosmetic, localized, no overlap/coverage effect. Root cause is the CSI/sliver input data at the corner, not the merge rule. |
| Q6-2 (C6-2, T2) | Informational | **Outside L/L junction; rule-invisible stubs.** At (50.407, 54.2607) the two rings on each side of the vertical stub edges rotate the **same** way (o=1), so no stub edge has a neighbour in the kept set — the adjacency rule (by design, one-sided per edge) cannot see across the seam. Four 1e-3-scale stub vertices survive in the final mesh. Area is unchanged; mesh remains a valid simple polygon. Fixing it would require a cross-seam (two-sided) visibility check on top of the adjacency rule; not worth the added complexity for a cosmetic 1e-3 artifact. |
| Q6-3 (C6-1, T3) | Risk-accepted | **Ring self-intersection + coast crossing at (51.6559, 54.0774).** The Voronoi ring synthesized for an **unplaced** source row self-intersects (negative signed area in the pre-merge trace, `/G` category, cached in harness) and crosses the coast. It is **not** a published catchment (unplaced rows are hidden per ADR-0012 / the ADR-0033 chain) — no visible impact on the map. Carried, no action. |

Known non-regressions re-confirmed (baselines, not C6 findings): 9 BT
postcodes; 12 practice geocode misses; 3 empty cells (incl. ni-r5);
dark OSM tiles (ADR-0027; residual en/wales ROI spill 3.5658/0.3100
deg² — USER DECISION 2026-11-10 Option A debt).

## Verification gates (this pass, 2026-11-10)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | C6-2 anomaly reproduction | **REPRODUCED + ROOT-CAUSED** | `c62-repro.mjs` (vm sandbox over the `mergeTwo` slice, debug hooks intercepted): T1 `AREA=7.9972001 rings=1` (\|area\|/2 = 3.9986 ≈ 4.00, the single 4.00-area ring); `c62-classify.mjs` full pre-cleanup edge table (27 primitives with inL/inR) + final kept set (16) — proof that **no collapsing cleanup is needed** (every classified primitive's in/out counts equal its neighbour set, i.e. the adjacency rule fires exactly where it should and the duplicates are consistent) |
| 2 | Adjacent-only rule preserves valid rings | **PASS** | Repro T1: the kept chain traces one closed ring with 16 kept primitives, `kept=16`, chain #2 is the 3-vertex sliver discarded by the caller area filter — no ring is broken, no valid edge is dropped |
| 3 | T2 stubs | **ANALYSED** | Same harness: four o=1 stub edges (1e-3 scale) at (50.407, 54.2607) survive because both flanking rings rotate the same way — adjacency rule is one-sided per edge; stubs are cosmetic (Q6-2) |
| 4 | T3 self-intersection | **ANALYSED** | Trace (`c62-trace.txt`, `/G`): ring at (51.6559, 54.0774) self-intersects (negative signed area); unplaced-row Voronoi ring, unpublishable by design (Q6-3) |

**QA verdict: 0 Blocking, 2 Risk-accepted (Q6-1, Q6-3 — data-level,
carried), 1 Informational (Q6-2). No code change required from QA for
C6-1/C6-2 — the hardening stands. Stage 6 CLOSED; rework rounds
consumed: 0.**

---

# QA — Stage 6/10 (Cycle 6) — C62-V2 round 2/2 (2026-11-14)

Post-fix verification of the owner-decided C62-V2 pair (land-mask closing-point
dedup in `scripts/land-mask.mjs`; children `ni` → ROI-land clip in
`scripts/build-data.mjs`; per-kind invariant-2/5 amendment in
`scripts/validate-tessellation.mjs`, ADR 0036). QA ran the project's own
validator on the rebuilt `public/data/*.json`
(`.qwen/tmp/validate-c62v2-b.log`, disk-verified, exit 1).

## Findings

| ID | Severity | Description |
|----|----------|-------------|
| Q6-4 (C6-2, inv-6) | **BLOCKING** | **Scottish overlap gate fails:** worst SC×SC pair `Hospice at Home vs Strathcarron Hospice = 0.001983171 deg²` ≥ the 1e-6 deg² gate (≈24 km²; 19 SC cells, empty=0). Evidence: `.qwen/tmp/validate-c62v2-b.log` L12–13 (`scottland: 19 cells, empty=0 worst SC×SC overlap=0.001983171 deg^2 (must be < 1e-6)`; `ERROR: Scottish overlap >= 1e-6 deg^2 (C6-2): ...`). **Pre-existing, not introduced by this fix:** the 2026-11-08 baseline already carried worst-SC pairwise overlap 0.0136 deg² *before the C6-2 gate existed*; earlier validator runs aborted at invariant 2, so invariant 6 had never executed to completion. NOT covered by the 2026-11-14 children's risk-acceptance (that decision scopes invariants 2/5, not SC×SC overlap). |

Per-invariant state after the C62-V2 fixes (same log, disk-verified):
invariant 2 adults **100.49% PASS** (33.9175/33.7526 deg², strict 99.0–101.0%
gate) — the C62-V2 target; invariant 2 children 100.00% RISK-ACCEPTED
(ADR-0036); invariant 5 adults 0.000000000 deg² PASS, children 0.0006 deg²
warning-only (risk-accepted by design); invariant 1 0.000975 deg² advisory;
invariant 3 11.2330 deg² advisory (per-kind double-tiling, expected);
invariant 4 empty=0, slivers=0.

**QA verdict: 1 BLOCKING (Q6-4, invariant 6 / C6-2), 0 other open findings
for this pass. Rework cap (2 rounds) EXHAUSTED → per the pipeline
rework-loop rule the loop STOPS: a "HUMAN DECISION REQUIRED" section is
written to `.agents/pipeline.md` (options: (1) risk-accept the C6-2 pair
overlap, (2) targeted SC×SC fix pass under a fresh loop, (3) fresh C62
root-cause cycle). Stage 6 NOT passed for C62-V2 until Q6-4 is resolved.
Nothing committed (James's ship gate); the paused DevOps subagent was left
untouched.**

---

## Cycle 7 — Coding-stage records (Stage 5, 2026-11-15; input to Stage 6)

### W6 — footer link contrast (measured; WCAG 2.x relative-luminance formula,
static computation from resolved colours — in-browser confirmation is owner-gate
item §8.6 below; no browser automation exists in this repo)

| Theme | Element | Colour | Background | Contrast | AA (≥4.5:1) |
|-------|---------|--------|------------|----------|-------------|
| light | footer `<a>` links (Bootstrap 5.3 default `--bs-link-color`; no repo override) | `#0d6efd` | `#ffffff` | **4.5008:1** | PASS (margin +0.0008) |
| dark | footer `<a>` links | `#6ea8fe` | `#0f1720` (`--hf-surface`) | **7.4719:1** | PASS |

- Both themes ≥ 4.5:1 → **PASS: no source change** (W6 contract: “no source
  change if passing”). Contingent fix (footer-scoped `--hf-footer-link`,
  `@media (max-width:768px)`) not triggered, not applied.
- Contract-expectation note: the ≈7.5:1 prediction was right for dark (7.4719)
  but the light theme measures 4.5008:1 because the repo does not override
  `--bs-link-color` (Bootstrap 5.3 default `#0d6efd`). It still passes AA, so
  nothing changes in C7; recorded for the owner's information (a later, separate
  cycle could set `--bs-link-color: var(--hf-primary)` ≈11.6:1 light /
  #7dadd6 ≈7.58:1 dark, but that alters 1280 px pixels — out of C7 scope).
- Reference (outside W6's “footer-link” scope): footer `small.text-muted` body
  copy — light `#5f7183`/`#ffffff` = 5.0283:1; dark `#8fa3b8`/`#0f1720` =
  6.9595:1 — both PASS.

### W8 — verification matrix, automated items (run 2026-11-15, post W1–W6)

| Item | Check | Result |
|------|-------|--------|
| 1 | `npm run check:layout` (layout gate) | `check-map-layout: OK`, exit 0 |
| 2 | `npm run build` ×2 + prerender, DOM diff vs pre-C7 baseline | PASS — see below |

- Test suite: `npm test` → 23/23 pass, 0 fail (C8 vectors + postcode shape/lookup tests).
- Double build: 171 prerendered files each run; full dist SHA-256 manifest byte-identical
  (231 files; `diff .tmp/c7-build1.sha256 .tmp/c7-build2.sha256` empty).
- Prerender DOM: the app shell is client-rendered (`<div id="root"></div>` empty at
  prerender), so every prerendered HTML differs from `.tmp/c7-baseline/dist` ONLY in the two
  hashed asset references (css `index-50GQAEoY`→`index-Dn97-FzZ`, js `index-UggaqDto`→
  `index-D61LFkAW`). No static-DOM drift.
- Client first-render delta (R4/R6 = server render ↔ client first render match), verified
  at the static-JSX level (this repo has no browser automation; in-browser confirmation is
  owner-gate): exactly +1 static header toggle button (`aria-expanded=true` at first render),
  StartHere card root inline-style→class relocation (`hf-start-here`), `.app` gaining the
  `hf-start-here-open` class (deterministic `useState(true)`, identical in JSDOM and browser),
  and +1 footer `Source & Method` link (W1). No other attribute change.
- In-browser items 3–9 (375×812 screenshot matrix, no-page-scroll check, scroll-region
  count ≤2, footer contrast confirmation, marker/tile alignment, 320 px overflow, a11y
  order/aria/focus) = James's mobile-visual ship gate — manual, deliberately no
  browser-automation dependency added.
---

# Cycle 10 — QA (stage 6)

Worktree `calm-pine-e94f57` @ `a761871` (stage-5 gate commit). All evidence on disk, not from ledger prose. Read-only on the working tree; no fixes applied.

## Gates (requirements-cycle10.md)

| Gate | Status | Evidence |
|---|---|---|
| G0 baseline | PASS | 138-entry `shops-website.json` at HEAD^; the byte-preservation test uses it as reference. |
| G1 identity | PASS | `tests/shop-identity.test.mjs` green; `resolveShopId` = SLUG_TO_ID → canonical set → null, no blind `??` (shop-identity.mjs:15-19). |
| G2 completeness | **OPEN** | Log has 204/208 rows; 4 confirm rows unwritten after 3 attempts each (documented clean seam, not a defect). |
| G3 byte-preserve | PASS | First 28,782 bytes of `shops-website.json` == HEAD^ (cmp-clean); all 140 rows carry exact key order `hospiceId,name,address,postcode,source`; only 2 appended ids. |
| G4 build | PASS | `node scripts/build-data.mjs` exit 0: `shops: 140 (geo missing 0); outside own catchment: 17; unresolved ids: 0`. |
| G5 checks | PASS* | `npx tsc -b` exit 0; `npm test` 46/47 — the one failure is `tests/crawl-log.test.mjs:158` (204 ≠ 208), the G2-coupled completeness gate, expected at the seam. |
| G6 A-05 | PASS | Two clean builds; sha256 of `public/data/*.json` identical across builds. |

## Verified claims (all PASS on disk)

- `crawl-hospice-shops.mjs`: 3 phases via argv (discovery/crawl/confirm + pool); `PACE_MS=1100`, single UA, DDG discovery, per-site `browser.newContext`, pdfjs-dist legacy (incl. `zlib.inflateSync` fallback); per-site try/catch with `unwritten` semantics in all three phases.
- Crawl log (ADR-0045): 204 rows, exact 8-value vocabulary, 0 out-of-vocab outcomes, 0 non-terminal rows, per-entry source URL on all 107 discovered sites (`website` + `discoverySource:'ddg'`); all 14 confirm rows `shopsExtracted:0, committed:false`; exactly the 4 documented ids missing (en-1-122650868, en-1-106965965, en-1-134598723, en-1-123327578).
- Raw data: 138 byte-preserved + 2 appends (en-1-113514582 "Visit us Canal Lane" LE14 4EX; ni-r1 "Fundraising Centre" BT48 8JE); `shops-geo.json` 137 keys = 135 + the 2 new postcodes (both `source:"postcode"`).
- Build: `build-data.mjs` exactly +3 net lines (import, canonical id set, `resolveShopId` call); `public/data/shops.json` 140 / 17 outsideCatchment / 0 unresolved, ids end `shop-138`, `shop-139` (0-based).
- Deps: `playwright@1.65.1` + `pdfjs-dist@6.5.438` in devDependencies only; runtime deps (bootstrap/leaflet/react/react-dom/react-leaflet) untouched. `geocode-shops.mjs` unchanged; component E `unresolvedPostcodes` sync gated on `fullRunComplete` (never now).
- Pool shape: discovery 190 / confirm 18 (all real-domain `en-1-*`). ni-r1 legitimately appears in the **crawl** phase, not confirm: `hospices-all.json` has `ni-r1.website: ""` → discovery pool; DDG found foylehospice.com. No double-processing: 14 written + 4 unwritten = 18 confirm pool ✓.

## Findings

1. **G2 open seam — risk-accepted (the single open gate).** 4 confirm rows unwritten (transport-fail from this network's vantage at apex after 3 attempts each). Non-terminal by F-1 design (log-as-state); resume re-attempts only unwritten rows. Resume: `node scripts/crawl-hospice-shops.mjs confirm` from a reachable network, then re-run G2/G4/G5/G6.
2. **F-1 429/5xx/timeout simulation absent from the suite — risk-accepted follow-up debt (per review-cycle10.md F-1).** `tests/crawl-log.test.mjs` covers schema/vocabulary/invariants/completeness but contains no transport-failure simulation (only reference to `not-found` is the vocabulary list). Behaviour verified two ways instead: (a) code read — `transportFailure` (L133) returns true for no-response/429/202/≥500; all three phases return `{unwritten:true}` on it and the caller loops `continue` without writing a row; 403 → terminal `blocked`, 404 → terminal `not-found`; (b) offline simulation — 429/500/503/202/null → true; 200/403/404 → false (8/8). Row is left unwritten, never terminal not-found. ✓ A standalone unit test should be appended to the suite as carried debt.

## Verdict

**PASS — 0 Blocking findings.** G2 open seam (1) and the F-1 test gap (2) are both risk-accepted and carried forward; neither blocks the pipeline.
