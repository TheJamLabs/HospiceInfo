# Implementation — Cycle 4 (2026-10-30)

Stage 5/10 — Coding. Source of truth: `.agents/requirements.md` (Cycle 4,
lines 1–167), `.agents/architecture.md` (Cycle 4), `.agents/design.md` (BEACON
palette, Concept 2 — human gate H4-1 resolved), `.agents/review.md`,
ADRs 0024–0028.

Mandated order: W8 → W1 → W2 → W5 → W6 → W7 → W3 → W4 → W9 → W10, then the
11-item verification gate (double build LAST).

Invariant set: ADR-0008 zero new deps (no npm install); ADR-0011 data/ and
data-raw/ read-only; ADR-0012 hide-not-delete; ADR-0022 logo recolour only;
ADR-0024 boot snippet byte-identical in index.html + scripts/prerender.mjs
buildPage(); ADR-0025 first load = shops OFF + GPs OFF, useState only, no
persistence; ADR-0026 search tiers shops→hospices→GPs + muted GP markers;
ADR-0027 dark Leaflet overrides in app stylesheet only, OSM light tiles in
both themes (dark tiles = risk-accepted debt, 1-line follow-up); ADR-0028
BEACON = swap of exactly 10 --hf-* tokens.

## Cycle 4 work list (updated after each item)

| Item | Status | Evidence |
|------|--------|----------|
| W8 BEACON tokens | DONE | src/styles.css (10 x --hf-* tokens, 2 blocks: :root + :root[data-bs-theme=dark], body-var wiring); src/components/MapView.tsx (GP bucket divIcon 28px #1d4ed8 -> 20px var(--hf-gp-fill), anchor 14->10); all raw hex tokenised. Validation: node w8-style.cjs + w8-mapview.cjs OK (audit: 0 raw hex outside token blocks); npx tsc -b exit 0; grep #1d4ed8 src/ = 0; git status: only styles.css + MapView.tsx modified, package.json clean (ADR-0008) |
| W1 first-load defaults | DONE | src/App.tsx (showShops true->false; showGps useState(false) added; headerExtras order Charity shops -> GP practices id=gpsToggle -> Source & Method; showGps prop to MapView); src/components/MapView.tsx (showGps prop; visiblePractices gated showGps?filter:[]). In-memory only, no persistence. Validation: node w1-app.cjs OK; npx tsc -b exit 0; grep shows useState(false) x2 new in App.tsx L26/L29 (L34 sheetOpen pre-existing); showGps wiring x6 confirmed |
| W2 three-tier search + muted GP | DONE | w2 scripts a/a2/b/c/c2/d/d2 OK; tsc -b 0; radius 6/6 4 + fillOpacity 0.55 baseline at MapView.tsx :237/:242 (7/5 and 0.85 gone); HospicePanel.tsx :214/:228/:230 = Shops → Hospices → GP practices headers with counts + unassigned-GP filter; .panel-section-header rule at styles.css :353; shops prop wired App.tsx :131 |
| W5 theme system (theme.ts + boot + AppShell) | DONE | theme.ts created (hfuk-theme/data-bs-theme sole owner); boot snippet byte-identical in index.html + prerender.mjs buildPage (w5-verify 381=381 OK, exact ADR-0024 comment precedes out.push); AppShell Auto/Light/Dark btn-group aria-label Colour theme, active+aria-pressed; main.tsx module-level attachAutoListener (no theme useEffect, none in App.tsx); .theme-group full-width row at 768px; npx tsc -b exit 0 |
| W6 dark Leaflet CSS | DONE | single [data-bs-theme=dark] block appended to src/styles.css covering .leaflet-container (bg+text), .leaflet-control-zoom, .leaflet-control-attribution, .leaflet-popup-content-wrapper, .leaflet-popup-tip (BEACON tokens); no tile URL change; leaflet.css untouched; npx tsc -b exit 0 |
| W7 kill published/approx surfacing | DONE | App.tsx selection card kept only {selected.source}; HospicePanel: publishedOnly state+filter+switch removed, approx badge removed, comment rewritten to 'pm 4.1/W10: list sort (ADR-0011)'; MapView hospice popup keeps curated only; grep [Pp]ublished/[Aa]pprox in src/ hits only KEEP set (types/Methodology/About/Legal/AppShell/StartHere); npx tsc -b exit 0 |
| W3 footer CSS | DONE | appended .app-footer small {flex:1 1 auto;min-width:0} + .app-footer nav {flex:0 0 auto} + @media max-1100px .app-footer small {flex-basis:100%} to src/styles.css; footer markup (.app-footer d-flex) unchanged |
| W4 back-to-map links (7) | DONE | verification-only pass after coder MAX_TURNS outage: all 7 links present (AboutPage.tsx:11, CorrectionsPage.tsx:41, FeedbackPage.tsx:13, LegalPage.tsx:11 + :47 (privacy + licences sections), AccessibilityPage.tsx:9) each immediately before its <h1>; .back-to-map {.5rem rule + hover underline} at src/styles.css:411-418; grep `Back to map` src/pages = 7 hits (check d) |
| W9 self-hosted fonts | DONE | public/fonts/ new (3 woff2: Archivo-700 14,508 B, PublicSans-400 14,632 B, PublicSans-600 14,592 B); src/styles.css L3–L22 three @font-face → /fonts/*.woff2 (Archivo 700 = display, Public Sans 400/600 = body); Bootstrap wiring --bs-body-font-family/--bs-heading-font-family → var(--hf-font-body)/var(--hf-font-display) (L40–L41); dist/fonts/ serves all three; zero CDN references (gate 10); npx tsc -b exit 0 |
| W10 rebrand (logo hex, manifest, og-image) | DONE | public/logo.svg recoloured #1d4ed8 → #163a5f BEACON (pin circle + triangle + two find/settle dashes; heart stays #ffffff) — ADR-0022 recolour only, geometry unchanged; public/manifest.webmanifest theme_color #163a5f, background #ffffff; public/og-image.png regenerated on BEACON (navy field, coral #e06744 accent — og-image-only per design); index.html title unchanged (Hospice Finder UK); #1d4ed8 = 0 in src/ (gate 7) |
| GATE 11-item verification | DONE | 11/11 PASS (details below). Method: throwaway gate script v2 → `GATE-SCRIPT: ALL PASS` exit 0 (items 1, 2, 4, 10-CDN); item 5 tessellation exit 0 (≈151 s background job); items 3/6/7 command-level counts + greps; items 8–9 verified at code level (static) — true visual pass carried to QA Stage 6 as prior cycles; item 11 statement check. Cleanup: dist-copy/ (untracked) + .qwen/tmp/gate-checks.mjs deleted |

## Cycle 4 — 11-item verification gate (2026-10-30)

`.agents/requirements.md` L149–L161; run after all W items, double build LAST.
All 11 items pass.

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | `npm run build` → 171 files; tsc + vite clean | PASS | build clean (tsc -b + vite + prerender); gate script: `171 prerendered files (169 html + sitemap + robots)`, 184 total dist incl. static copies |
| 2 | Double build → `diff -r` zero | PASS | gate script: `double-build byte-identical (184 files)` (relative-path-keyed SHA-256 maps) |
| 3 | `sitemap.xml` 168 `<loc>` (161 + 7) | PASS | node count on dist/sitemap.xml = 168 |
| 4 | Boot snippet byte-identical index.html ↔ scripts/prerender.mjs; present in every shell | PASS | gate script: `snippet present in all 169 shells`; `snippet byte-identical across source + all shells`; `prerender.mjs literal byte-identical to index.html snippet` (literal carries the 2-space indent the HTML regex match strips — compared with indent re-applied) |
| 5 | `node scripts/validate-tessellation.mjs` exit 0 | PASS | background job exitCode 0 (22:11:13Z → 22:13:44Z, ≈151 s) |
| 6 | AC5 grep guard | PASS (with note) | `kind`: declared only in src/lib/types.ts L11/L34; remaining refs confined to the KEEP set (Methodology.tsx L93–94); LegalPage.tsx L66 is prose ("of this kind"), not the field. Badge strings (`published service area` / `Has Published` / `Approx. area` / `approx`): every hit inside the KEEP set (types field, StartHere, LegalPage, Methodology, AppShell tagline, AboutPage). data/ + data-raw/: zero diff. **Note:** the only scripts/ diff is the 2-line ADR-0024 theme-boot snippet in scripts/prerender.mjs (W4) — the diff gate item 4 itself mandates (it names scripts/prerender.mjs as the comparison target). This is the exact R2-2 tension, resolved by the authoritative W7(d) wording (requirements.md L94) |
| 7 | Token audit; no `#1d4ed8`; package.json clean | PASS | every raw hex in src/styles.css sits inside the two --hf-* token blocks (light L28–L35 + L37, dark L50–L57 + L59); `#1d4ed8` zero matches in src/; zero diff in package.json |
| 8 | Visual/contrast light + dark @1024/1280/1440/375 | PASS (code level) | no browser on this host — verified statically: W3 footer fix (`.app-footer small` flex:1 1 auto/min-width:0, `nav` flex:0 0 auto, small wraps to full row ≤1100px); W6 dark-scoped Leaflet block (container bg, zoom control, attribution, popup wrapper + tip) all token-driven; W2 GP subordination (CircleMarker r=4, r=6 selected, fillOpacity 0.55, 1px white stroke vs 16px hospice diamond / 10px shop square); BEACON tokens via item 7. Full visual pass carried to QA Stage 6 as in prior cycles |
| 9 | Theme persistence | PASS (code level) | fresh profile: no key → m='auto' → matchMedia('(prefers-color-scheme: dark)') in the boot snippet = OS match. Dark: setStoredMode persists `hfuk-theme`; boot snippet re-reads on reload → Dark persists. Auto: setStoredMode('auto') removes the key; AppShell pickMode → detach/attachAutoListener + setBsTheme(effectiveTheme) re-resolves live; OS flips tracked live only while auto (main.tsx attaches at module level) |
| 10 | Fonts: 3 woff2 from /fonts/, zero CDN | PASS | dist/fonts/: Archivo-700.woff2 (14,508 B), PublicSans-400.woff2 (14,632 B), PublicSans-600.woff2 (14,592 B); gate script: `zero CDN font references in src/, public/, dist/index.html` |
| 11 | Rollback | PASS (statement) | static site — no migration; C4 work uncommitted on top of HEAD `c6da9d3`; `git revert` of the cycle commit restores prior state; no destructive ops this cycle |

**GATE RESULT: 11/11 PASS.** Cleanup complete: `dist-copy/` (untracked) deleted;
`.qwen/tmp/gate-checks.mjs` deleted.

# Coding stage — implementation ledger (Cycle 3)
- Stage: 5/10 — Coding
- Date: 2026-10-29
- Objective: Cycle 3 — static prerendering (crawlable/SEO/AI-friendly), data-gap fills,
  rename to "Hospice Finder UK", logo refinement (arch §9 done-when).
- Source of truth: `.agents/requirements.md` (W1–W11) + `.agents/architecture.md`.
- Order: DATA REBUILD → W4 → W5 → W6 → W7 → W8 → W9 → W10 → W11 (LAST).
- Constraints: zero new deps (ADR-0008); no git; touch no exempt file; no `docs/MAINTENANCE.md`.

## Work list (updated after each item)

| Item | Status | Evidence |
|------|--------|----------|
| DATA REBUILD (build-data ×2, byte-identity) | DONE | 4 JSON prefixes `65818ace cc096f17 f7df12fd dd19e8ae` (hospices/practices/catchments/shops) identical across 2 runs |
| W1 SITE_URL config | DONE (pre-existing) | `site-config.json` has siteUrl; `siteConfig.ts` grep=2 |
| W2 NI manual geo + merge | DONE (pre-existing) | `manual-geo-ni.json` parses; `build-data.mjs` merge+fail-fast; README provenance row |
| W3 Wales id drift fix | DONE (pre-existing) | `wales-r${i + 1}` =1; old form =0 |
| W4 Prerender script | DONE | script runs exit 0 ("emitted 171 files (161 hospice pages)"); dist = 169 html + sitemap.xml + robots.txt = 171 emitted; invariant 168 locs == 161+7; `npm run build` ×2 → dist tree SHA-256 (relative-path keyed) `e870577749d62e460649ff56a379ca4e49cef3d599e5601b5fde77eddb04d681` byte-identical |
| W5 Build chain | DONE | package.json build = `tsc -b && vite build && node scripts/prerender.mjs` (name `hospice-catchment-map` untouched); full chain ×2 green |
| W6 Hash-redirect guard | DONE | exact bare IIFE (no comments) in src/main.tsx before createRoot; `npm run build` → new bundle `index-8JZPcOgA.js`, 171 files; live preview (:4173): `/` 200 title "Hospice Finder UK"; `/about.html` 200 title "About - Hospice Finder UK"; `/hospice/ni-r1.html` 200 title "Foyle Hospice (10627) - Hospice Finder UK"; all with #root + module bundle (map/About/map render); server stopped, port confirmed released; re-verified in final pass (below) |
| W7 SEO/JSON-LD/canonical head | DONE | verified in emitted dist/: §3.3 exacts (spot-checked home/hospice/404); og:type article on hospice, website elsewhere; one ld+json/page, @graph=[Organization(,HealthCareBusiness)], single JSON.stringify 0-space; sitemap 168 locs fixed order, no lastmod, LF + one trailing newline (crlf:false); robots.txt verbatim §3.6 incl. Sitemap line; 404.html shell "Page not found - Hospice Finder UK" Organization-only |
| W8 og-image.png | DONE | `public/og-image.png` 3161 B; PNG signature OK; chunks IHDR/IDAT/IEND; every chunk CRC valid; 1200×630; IDAT inflates to 2268630 = 630×(1+1200×3); sampled pixels (0,0)/(615,600)/(629,1199) all [29,78,216]=#1d4ed8; zero deps (node:zlib); throwaway generator+verifier ran from .qwen/tmp and deleted |
| W9 Logo refinement | DONE | public/logo.svg fully replaced with the exact 3-element arch §6 SVG (blue #1d4ed8 triangle path, blue circle cx32 cy26 r18, white #ffffff heart path; role=img; aria-label="Hospice Finder UK"); `grep -c "circle" public/logo.svg` → 1 (4→3 elements per ADR-0022; old white r12 circle gone) |
| W10 Rename + 404 wording | DONE | index.html <title>→"Hospice Finder UK"; AppShell header link text→"Hospice Finder UK" (href #map kept); manifest name→"Hospice Finder UK" / short_name→"Hospice Finder" (JSON.parse OK); recursive /hospice catchment map/i scan of src/ + public/ files + index.html → BRAND_HITS 0; all remaining "catchment" occurrences in exempt files only (data/README.md, docs/MAINTENANCE.md, GLOSSARY.md, README.md, InitialIdea.md, package.json name `hospice-catchment-map`, lockfile, about/legal domain prose) |
| W11 docs/build-log.md (LAST) | DONE | new file, 2 lines, LF-only, single trailing newline; line 1 verbatim `2 2026-10-26 dc261185 e11322ba 2a87a374 5628d8f7`; line 2 appended `3 2026-10-29 65818ace cc096f17 f7df12fd dd19e8ae` == independently re-hashed prefixes of hospices/practices/catchments/shops.json |

## Data rebuild (recorded)

- `npm run build-data` ×2 → identical SHA-256 set. New Cycle 3 anchor set (replaces
  Cycle 2 `dc261185 e11322ba 2a87a374 5628d8f7`):
  `65818ace cc096f17 f7df12fd dd19e8ae` (hospices / practices / catchments / shops).
- 161 hospices = 152 en / 3 sc / 6 ni / 0 wales; 0 unplaced hospices.

## Validation

### W4 / W5 / W7 (2026-10-29)

- `node scripts/prerender.mjs` (after `tsc -b && vite build`): exit 0,
  `[prerender] emitted 171 files (161 hospice pages)`.
- Emitted set: index.html + 6 info (about, corrections, feedback, privacy,
  licences, accessibility) + 161 `hospice/<id>.html` (code-unit ascending) +
  404.html + sitemap.xml + robots.txt = **171**.
- In-code invariant passed: sitemap `<loc>` count 168 == hospices.json length (161) + 7.
- Determinism: `npm run build` run twice → dist tree (180 files incl. assets/public
  copies) SHA-256 keyed by relative path identical:
  `e870577749d62e460649ff56a379ca4e49cef3d599e5601b5fde77eddb04d681`.
- Spot-check `dist/hospice/en-1-120960209.html` (name contains `&`): exactly one
  `<title>`, one `rel="canonical"`, one ld+json script; full og:* set; `&` → `&amp;`
  in HTML attributes, raw `&` inside JSON-LD (valid); `address` (LE3 9QE) and `geo`
  both present (postcode + placed).
- `dist/404.html`: shell, title `Page not found - Hospice Finder UK`, Organization
  node only (no HealthCareBusiness).
- `dist/robots.txt`: `User-agent: *` / `Allow: /` / blank / `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml`.

### W6 (2026-10-29)

- `src/main.tsx`: exact bare IIFE per spec (no comments) between imports and
  createRoot; `tsc -b` strict + `vite build` green; new bundle `index-8JZPcOgA.js`;
  prerender re-emitted 171 files with the new bundle hash.
- Runtime (vite preview :4173, then stopped):
  - GET `/` → 200, title `Hospice Finder UK`, #root + module script present (map SPA renders).
  - GET `/about.html` → 200, title `About - Hospice Finder UK` (guard → #/about → About page).
  - GET `/hospice/ni-r1.html` → 200, title `Foyle Hospice (10627) - Hospice Finder UK`
    (ends ` - Hospice Finder UK`; guard → #/ → map, no deep-link).
- Server stopped via `taskkill /F /T /PID 4584`; port 4173 fetch → DOWN.

### W8 (2026-10-29)

- `public/og-image.png`: valid 1200×630 solid-colour PNG, 3161 bytes.
- Verified programmatically: signature `89 50 4E 47 0D 0A 1A 0A`; chunk walk
  IHDR → IDAT → IEND with every CRC32 matching; IHDR 1200×630, 8-bit truecolor;
  IDAT decompresses to exactly 2268630 bytes = 630 rows × (1 + 1200×3);
  corner + centre pixels all [29, 78, 216] = #1d4ed8.
- Zero npm deps (Node built-in zlib deflate); throwaway generator and verifier
  lived in `.qwen/tmp` and were deleted after verification.

### W9 / W10 / W11 (2026-10-29)

- W9: `public/logo.svg` = the exact 3-element arch §6 SVG — triangle path
  `M24 30 L32 54 L40 30 Z` fill #1d4ed8; circle cx=32 cy=26 r=18 fill #1d4ed8;
  heart path fill #ffffff; viewBox 0 0 64 64, role="img",
  aria-label="Hospice Finder UK". `grep -c "circle" public/logo.svg` → 1 (4→3
  elements per ADR-0022; the old white r12 circle is gone). `public/` contents:
  data/, logo.svg, manifest.webmanifest, og-image.png.
- W10: brand strings changed on exactly the 3 surfaces (index.html `<title>`,
  AppShell header link, manifest name/short_name). Recursive case-insensitive
  "hospice catchment map" scan of src/ + public/ files + index.html → 0 hits
  (`node -e` recursive scan, BRAND_HITS 0). All remaining "catchment" occurrences
  are in the exempt set: data/README.md, docs/MAINTENANCE.md, GLOSSARY.md,
  README.md, InitialIdea.md, package.json name `hospice-catchment-map`,
  package-lock.json, and domain-prose "catchment" in About/Legal pages.
  No package.json script keys touched (dev/build/preview/build-data/check:layout only).
- W11: `docs/build-log.md` created as the LAST item — line 1 verbatim seed
  `2 2026-10-26 dc261185 e11322ba 2a87a374 5628d8f7`, line 2 appended
  `3 2026-10-29 65818ace cc096f17 f7df12fd dd19e8ae`. Verified: 2 non-empty
  lines; line 2 matches independently re-hashed SHA-256 prefixes of
  public/data/{hospices,practices,catchments,shops}.json; LF-only; exactly
  one trailing newline (lineCount=2, line1Ok=true, line2Ok=true, lfOnly=true,
  singleTrailingNewline=true).

### Full §9 final verification (2026-10-29 — all 10 checks PASS)

1. build-data byte-identity: 2 runs → identical `65818ace cc096f17 f7df12fd dd19e8ae`.
2. `npm run build` ×2 after all items → dist tree (181 files) SHA-256 keyed by
   relative path identical across both runs:
   `170036dafcd4de8c5600bb49b58678b06c8d381fd24a18cf65df2a2ea47a6536`.
3. `node scripts/validate-tessellation.mjs` → exit code 0 (background run:
   3 empty-cell warnings, 0 slivers, 0.000475 deg² outside land, coverage 100.00%,
   pairwise overlap 0.0000). Runs ~110 s; the foreground 120 s wrapper reports
   timeout from a host reporting quirk, not script failure (source audit: no
   lingering handles/streams/timers).
4. No "hospice catchment map" (case-insensitive) in index.html, public/, src/ — 0 hits.
5. dist/: 169 html (1 index + 6 info + 161 hospice + 1 404); 171 emitted
   (169 html + sitemap.xml + robots.txt); sitemap `<loc>` = 168; robots.txt
   first line `User-agent: *` + Sitemap line; per-page id set == hospices.json
   ids (missing 0, extra 0).
6. Spot-check `dist/hospice/en-1-120960209.html`: 1 `<title>`
   ("LOROS The Leicestershire &amp; Rutland Hospice - Hospice Finder UK"),
   1 canonical, 1 ld+json, full og set (og:type/og:title/og:url/og:image×2/
   og:site_name/og:description all present).
7. No "geo" in unplaced hospice pages — vacuously true (0 unplaced hospices).
8. `grep -c "circle" public/logo.svg` → 1; manifest.webmanifest JSON.parse OK
   (name "Hospice Finder UK", short_name "Hospice Finder").
9. No sameAs/contactPoint/openingHours/parentOrganization/affiliation in dist/
   (0 hits, recursive scan).
10. build-log.md: 2 lines present, line 1 verbatim, line 2 prefixes match the
    re-hashed data files.

_Final §9 done-when set appended at end of pass._

### Final re-verification (2026-10-29, end of cycle — on-disk confirmation after compaction)

- Consolidated verifier `node .tmp/cycle3-verify.cjs` → **22/22 PASS, exit 0**
  (manifest name/short_name; index.html `<title>` + no old brand; logo aria-label,
  1 `<circle>`, 4-element mark; build-log 2 lines / LF-only / line 1 verbatim /
  line 2 == re-hashed data prefixes; dist 169 html + 171 emitted; exact product-name
  brand "hospice catchment map" = 0 in dist; sitemap 168 locs, trailing LF, no
  lastmod; robots verbatim; index + 404 titles; og:type article=161 / website=8;
  no endorsement fields; exactly 1 canonical + 1 ld+json per page).
- Byte-stability over the 171 EMITTED files (`.tmp/hash-dist.cjs`, flat explicit
  list, code-unit order): `npm run build` run twice after the W10 edits →
  `files=171 missing=0`, identical digest both runs
  `9916acb627b9da4b13dfca6e76ff449b2988c641e2218d15621507d6544facdd`
  (digests `9916acb6…`).
- `npm run check:layout` → `check-map-layout: OK`.
- `node scripts/validate-tessellation.mjs` (foreground re-run, ~110 s): exit 0 —
  3 empty-cell warnings (en-1-17708902164, en-RYY002, ni-r5), sliver cells 0,
  outside-land 0.000475 deg², coverage 100.00%, pairwise overlap 0.0000.
- Live preview smoke test (`.tmp/preview-smoke.cjs` → `.tmp/preview-smoke.txt`):
  `/` 200 "Hospice Finder UK"; `/about.html` 200 "About - Hospice Finder UK";
  `/hospice/ni-r1.html` 200 "Foyle Hospice (10627) - Hospice Finder UK" — 3/3 PASS;
  server stopped via `taskkill /F /T /PID 7652`, port 4173 confirmed released.

## Open items

- W10 verify wording: `requirements.md`'s literal recursive `/catchment/i`
  expected 0 is not achievable without rewriting legitimate domain prose. The
  enforced (and correct per ADR-0023) scope is the 8-surface brand rename of
  "Hospice Catchment Map" → "Hospice Finder UK" + exact product-name string
  "Hospice Catchment Map" = 0 hits (verified: index.html, public/, src/, dist/).
  The generic lowercase domain word "catchment" (catchment areas, Voronoi cells,
  GP practice locations) in Methodology/MapView/StartHere/Legend/types/App.tsx/
  SiteConfig, and the sanctioned Organization JSON-LD description "...mapping of
  hospice catchment areas in the UK...", are content, not the brand, and are
  exempt per ADR-0023 non-goals. No exempt identifier (wrangler slug `hospiceinfo`,
  repo name, package.json name `hospice-catchment-map`, script keys, ADR file
  names, hospice/practice ids) was renamed.

## Cycle 3 — Security fix pass (rework round 1, 2026-10-29)

- Gate: Stage 7 Security → FAIL, 1 Blocking (SEC-3-01). Fix pass = rework round 1 of 2 (cap 2).
- Files modifiable: `scripts/prerender.mjs`, `.agents/implementation.md`. No git add/commit.

| Item | Status | Files | Validation |
|------|--------|-------|------------|
| WF-1 (SEC-3-01, Blocking) | DONE | scripts/prerender.mjs (:64) | build exit 0; tag-scan 169 html opens==closes==2, 0 mismatches; sample tail exact + single trailing LF; determinism 0 diffs; invariants 168 locs + robots verbatim — full 5-point suite green on post-WF-2 final state (suite run recorded in the WF-2 section below) |
| WF-2 (SEC-3-02, non-blocking) | DONE | scripts/prerender.mjs (:49, in the fail-fast loop :47-50) | per-id charset assertion; expected effect NONE (all 161 ids comply — build green after edit); full 5-point suite re-run green (below) |

### WF-1 (SEC-3-01) — close the boot `</script>` (2026-10-29)

- `scripts/prerender.mjs:64`: `const bootScript = bootTag[0] + '</script>';`
  (was `const bootScript = bootTag[0];`). One-line fix at extraction; no other
  behaviour change, no new deps/imports, no package.json/build-script change.
- Corrected impact wording (LEAD note): the report's "blank page site-wide" is
  OVERSTATED — a `<script src>` executes the fetched resource and ignores
  inline raw text, so pages rendered. The real defect is invalid HTML
  structure: the unclosed boot `<script>` swallows `</body></html>` into the
  script raw text.
- Validation (exact commands + key outputs):
  1. `npm run build` → exit 0, `[prerender] emitted 171 files (161 hospice pages)`.
  2. `node .qwen/tmp/check-sec-r1.cjs` → `html files: 169 / total opens: 338 /
     total closes: 338 / mismatches: 0`, exit 0.
  3. `dist/hospice/en-1-120960209.html` tail: ends exactly with closed boot
     `<script type="module" crossorigin src="/assets/index-mKHWy8cd.js"></script>`,
     `</body>`, `</html>`, one trailing newline (verified `crlf=no`,
     `singleTrailingNL=true`,
     `tail="...></script>\n</body>\n</html>\n"`).
  4. Determinism (re-run prerender 2nd time + `.qwen/tmp/hash-dist.cjs` before/
     after compare) → `files=181`, `differences=0`; aggregate
     `12f7742a5bf6c6684fb643e2dd08270afc92c48c5551517d16c97497270c1159`
     identical before/after (final-state proof, post-WF-2).
  5. Invariants → `dist/sitemap.xml` `<loc>` count 168 == 161 + 7, no lastmod,
     single trailing newline; `dist/robots.txt` verbatim unchanged (`User-agent:
     *` / `Allow: /` / blank / `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml`).

### WF-2 (SEC-3-02) — id charset assertion (2026-10-29)

- `scripts/prerender.mjs:49` (in the fail-fast loop :47-50): new assertion line
  `if (!/^[A-Za-z0-9-]+$/.test(h.id)) fail('hospice id has characters outside [A-Za-z0-9-]: ' + h.id);`
  after the existing id/name type check. Non-blocking per `.agents/security.md`;
  no other validation added.
- Expected effect: NONE — all 161 ids comply with `/^[A-Za-z0-9-]+$/` (build
  green after the edit: `[prerender] emitted 171 files (161 hospice pages)`).
- Full 5-point validation suite re-run on the final (post-WF-2) state — all green:
  1. `npm run build` → exit 0; vite `✓ 148 modules transformed`, bundle
     `index-mKHWy8cd.js` + `index-DXBOPrrL.css`;
     `[prerender] emitted 171 files (161 hospice pages)`.
  2. `node .qwen/tmp/check-sec-r1.cjs` → `html files: 169 / total opens: 338 /
     total closes: 338 / mismatches: 0`, exit 0; sample last 4 lines = closed
     boot script, `</body>`, `</html>`, blank.
  3. `dist/hospice/en-1-120960209.html` tail one-line check → `crlf=no`,
     `singleTrailingNL=true`,
     `tail="crossorigin src=\"/assets/index-mKHWy8cd.js\"></script>\n</body>\n</html>\n"`.
  4. Determinism: `node .qwen/tmp/hash-dist.cjs > .qwen/tmp/hash-before.txt &&
     node scripts/prerender.mjs && node .qwen/tmp/hash-dist.cjs >
     .qwen/tmp/hash-after.txt` + compare → `files=181` both runs, aggregate
     `12f7742a5bf6c6684fb643e2dd08270afc92c48c5551517d16c97497270c1159`
     identical, `differences=0`.
  5. Invariants: sitemap one-line check → `loc count=168`, `expected=168`,
     `lastmod=none`, `trailingNL=true`; `dist/robots.txt` verbatim
     `User-agent: *` / `Allow: /` / blank /
     `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml` (unchanged).

**FIX-PASS COMPLETE: WF-1 + WF-2 landed and validated** (Security gate,
rework round 1). Provenance note: the fix-pass sub-session closed without
writing this line; the lead appended it after disk-verifying the full fix
pass (both WF-1/WF-2 edits in `scripts/prerender.mjs`, the work-list table,
the WF-1/WF-2 sections with the all-green 5-point suite, and the dist
invariants: 169 HTML files, 338/338 script balance, 0 mismatches, 168
sitemap locs, robots.txt verbatim, LF-only with single trailing newline).
