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
