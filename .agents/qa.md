# QA — Stage 6/10 (Cycle 3)

Date: 2026-10-29. QA ran strictly read-only on the working tree (throwaway scripts in `.qwen/tmp/` only). No fixes applied. Supersedes the Cycle-2 report previously in this file.

## VERDICT: **PASS** — 0 Blocking findings

All 11 checks pass. 2 INFORMATIONAL findings (methodology note, NBSP in source data). Carried debts re-confirmed as RISK-ACCEPTED (below). No new Blocking items.

## Findings

| ID | Severity | Description | Evidence |
|----|----------|-------------|----------|
| F-QA-1 | INFORMATIONAL | Coder's reported dist aggregates (`e8705777…` W4, `170036da…` §9) not reproducible: QA's method (SHA-256 of every file keyed by relative path; aggregate = SHA-256 of LF-joined sorted manifest) gives `795e4e02ea076fb1957ebce40b09f95b983e29e50d08fc1e5eaf9788d569bd6e`. Coder's manifest method is not stated. Intra-run per-file byte identity across two independent full builds is proven — the property under test — so not Blocking. | Check 2 |
| F-QA-2 | INFORMATIONAL | 6 NI hospice names in `public/data/hospices.json` contain `U+00A0` (no-break space) between the name and the `(...)` code (e.g. `Foyle Hospice (10627)`). All 6 titles render the NBSP faithfully; a literal match against a normal-space string fails. Source-data fidelity, cosmetic only. | Check 9, code-point dump |

## Checks

### 1. build-data determinism — PASS
`npm run build-data` run twice (exit 0 both). Per-file SHA-256 identical across runs:
- corrections.json `37517e5f…`
- hospices.json `65818aceb3c3cbb615bbe24729360a90af1ef769239facdffbc8d1a0e393e71e`
- practices.json `cc096f17e4ad618c1d1b034415bd9d6cc42baefe56452b08ca65c48b6f0c8992`
- shops.json `dd19e8aee50416626461f9d11cd0083c1e369eee009cacc2c635f5a3e64bf1e2`
- catchments.json `f7df12fdaffdb221ac349c88891798aca5d9747172424721293ab242e11eebaf`
- aggregate (all 5 files) `16a7cc83…` both runs.
Prefixes hospices/practices/catchments/shops = `65818ace cc096f17 f7df12fd dd19e8ae` — matches build-log line 2.

### 2. build determinism — PASS
`npm run build` run twice (exit 0 both): `index-mKHWy8cd.js` 418.07 kB, `index-DXBOPrrL.css` 250.47 kB, "emitted 171 files (161 hospice pages)", dist = 181 files.
Method: SHA-256 of every file keyed by relative path (forward slashes, sorted); aggregate = SHA-256 of LF-joined manifest. Result identical in both runs: aggregate `795e4e02…`; per-file manifests byte-identical (`fc /b` differs only in label bytes). See F-QA-1 re: coder-reported values.

### 3. tessellation validation — PASS
`node scripts/validate-tessellation.mjs` (background; ~101 s; known 120 s foreground false-timeout quirk) → exit 0:
```
warning: empty cell (no land in box): en-1-17708902164 (Hospice at Home)
warning: empty cell (no land in box): en-RYY002 (Wisdom Hospice)
warning: empty cell (no land in box): ni-r5 (Northern Ireland Hospice (10625))
catchments: 161, empty cells: 3
sliver cells: 0
cells outside land: total 0.000475 deg^2 (a clip seam should be ~0)
worst sea leak: The Butterfly Hospice = 0.000117
coverage: union=42.1099 / (land ∩ box)=42.1090 deg^2 = 100.00% (expect ~100%)
pairwise overlap: 0.0000 deg^2 (a shared edge should be ~0)
```
Matches W5 claim (names, slivers 0, 100%, overlap 0.0000).

### 4. brand rename — PASS
Case-insensitive scan of `index.html`, all of `public/`, all of `src/`: **0** hits for "hospice catchment map". 12 files retain "catchment" in exempt contexts (data fields, catchment-area prose, map layers) — none in user-facing brand strings.

### 5. dist inventory — PASS
- html files: **169** = 1 index + 6 info (`about, accessibility, corrections, feedback, licences, privacy`) + 161 `hospice/*.html` + 1 `404.html`
- emitted: 169 + sitemap.xml + robots.txt = **171**
- sitemap `<loc>`: **168** = 161 + 7 (first `https://hospiceinfo.pages.dev/`, last `…/hospice/sc-CS2023000094.html`)
- robots.txt exact match: `User-agent: *` / `Allow: /` / blank / `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml`
- id set(dist/hospice/*.html) == id set(hospices.json): 161 = 161, missing 0, extra 0

### 6. spot-checks — PASS
All pages show exactly 1 `<title>`, 1 `rel="canonical"`, 1 `ld+json`:
- `index.html`: title "Hospice Finder UK"; full og set (og:title/type/url/image/site_name/description — none missing); Organization JSON-LD; canonical `…pages.dev/`
- `hospice/en-1-120960209.html`: title "LOROS The Leicestershire &amp; Rutland Hospice - Hospice Finder UK" (`&amp;` in HTML attr; raw `&` inside valid JSON-LD body, name parses as "LOROS The Leicestershire & Rutland Hospice"); address present, postcode LE3 9QE; geo (52.65302, -1.16807); `og:type=article`
- `hospice/en-1-106214874.html` (en): "St Oswalds Hospice - Hospice Finder UK"
- `hospice/ni-r1.html` (ni): "Foyle Hospice (10627) - Hospice Finder UK" (NBSP per F-QA-2)
- `hospice/sc-CS2014323454.html` (sc): "Hospice at Home - Hospice Finder UK"
- `404.html`: title "Page not found - Hospice Finder UK"; ld+json types = Organization only; no HealthCareBusiness

### 7. JSON-LD no-endorsement guard — PASS
All 169 pages: ld+json parses as valid JSON; `@graph[0]` is Organization; 0 hospice pages lacking HealthCareBusiness. Banned keys across ALL of dist/: `sameAs` 0, `affiliation` 0, `parentOrganization` 0, `contactPoint` 0, `openingHours` 0, `pricing` 0 (total 0).

### 8. emitted-file determinism bytes — PASS
171 emitted files (169 html + sitemap + robots): 0 contain CR (LF-only); 0 wrong trailing newline (exactly one each); sitemap has no `<lastmod>` and no date patterns. Randomness/timestamps additionally ruled out by the double-build identity (check 2).

### 9. hash-redirect guard + live preview — PASS
`src/main.tsx`: exactly ONE `window.location.replace('#/' + route)`, bare IIFE, no comments, placed before `ReactDOM.createRoot`; skips when a hash exists; `hospice/…` paths map into the map, real paths get hash routes.
`npm run preview` (port 4173), curl.exe:
- `GET /` → 200, contains "Hospice Finder UK"
- `GET /about.html` → 200, contains "About - Hospice Finder UK"
- `GET /hospice/ni-r1.html` → 200, title "Foyle Hospice (10627) - Hospice Finder UK" (string match with normal space fails due to source-data NBSP — F-QA-2)
Server killed by PID; port 4173 confirmed released (curl exit 7, connection refused).

### 10. assets — PASS
- `grep -c "circle" public/logo.svg` → **1**
- `public/manifest.webmanifest` parses as JSON; name = "Hospice Finder UK" (short_name "Hospice Finder")
- `public/og-image.png`: PNG signature `89504e470d0a1a0a`, IHDR **1200×630** (3161 B)

### 11. docs/build-log.md — PASS
Exactly 2 lines; line 1 verbatim `2 2026-10-26 dc261185 e11322ba 2a87a374 5628d8f7`; line 2 = `3 2026-10-29 65818ace cc096f17 f7df12fd dd19e8ae` — each prefix matches the independently re-hashed data files (check 1). LF-only; single trailing newline (98 bytes).

## Carried debt (re-confirmed RISK-ACCEPTED — not re-raised)

- **F-1**: `kind='published'` count is 7; the "20 curated" figure includes 13 approximated entries. RISK-ACCEPTED.
- **W8**: stride gate DEFERRED by design to human gate G5. RISK-ACCEPTED.
- **G5 / G7**: human gates remain open, pending human sign-off. RISK-ACCEPTED.

## Open items

- F-QA-1: if byte-reproducible aggregates are ever needed across stages, document the manifest method in the architecture spec (in-script invariant 168 = 161 + 7 already enforced; not required for this cycle).
- F-QA-2: optional data normalization of NBSP in the 6 NI hospice names if literal string matching is ever required — out of scope for a QA fix pass.
- Human gates G5/G7 outstanding (carried).
