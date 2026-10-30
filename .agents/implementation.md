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
