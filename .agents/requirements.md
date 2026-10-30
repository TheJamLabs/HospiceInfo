# Requirements — Cycle 3 work list (2026-10-29)

Stage 4 (Product Manager). Authoritative work breakdown: the live DaVinciThink
orchestrator dispatch "Work Breakdown Structure for the Execution phase"
(W1–W11 + Data-rebuild section — see Ambiguity resolution below). Source spec:
`.agents/architecture.md` (Cycle 3, 2026-10-29) — THE SPEC; every `§`/ADR below
links into it, do not restate it verbatim. Also: `.agents/feature.md` (ACs),
`.agents/review.md` (gates). Contracts:
- Deterministic, exhaustive, exact per-step and per-item VERIFY; a partial pass
  is a failed pass. No TODOs; no design changes.
- After EVERY work-list item, Coding updates `.agents/implementation.md`
  (status, files touched, validation) — not in a batch.
- Commands run from the repo root (Windows; `node`/`powershell`/`git` on PATH,
  `tsc` via npx/npm scripts).

## In scope (this cycle)
W1 SITE_URL config · W2 NI manual geo + build-data merge + provenance ·
W3 Wales id drift fix · [Data rebuild] · W4 prerender script · W5 build chain ·
W6 hash-redirect guard · W7 SEO/JSON-LD/canonical head · W8 og-image.png ·
W9 logo refinement · W10 rename + 404 wording · W11 docs/build-log.md (LAST).

## Out of scope
- Shop re-scrape; any new data source beyond items below.
- New npm dependencies (ADR-0008) — everything is zero-dependency.
- Design changes beyond W9 logo + W8 og-image as specified.
- `docs/MAINTENANCE.md` — OWNER=DevOps (review F4, risk-accepted);
  Coding does NOT touch it.
- Push/deploy — lead + DevOps (ADR-0014 is git-connected; no config change).
- Wales data landing — human step, CIW reply pending (ADR-0020 disjunct B);
  Wales stays 0 this cycle.
- `#/hospice/<id>` deep-linking into the map panel (R12) — Cycle 4 candidate.
- Final brand rendering of og-image (V2) and final NI coordinates (V4) —
  human verification items (arch §10), not code blockers.

## Work items

### W1 — SITE_URL config (arch §3.7, ADR-0018/ADR-0009)
Goal: `siteUrl` in source + mirror. **Already in place — verify-only, NO edits.**
Files (read): `data-raw/site-config.json`, `src/lib/siteConfig.ts`.
Verify:
- `node -e "const c=require('./data-raw/site-config.json');process.exit(c.siteUrl==='https://hospiceinfo.pages.dev'?0:1)"` → exit 0
  (file already = `{"operatorName":"The Jam Labs Ltd","contactEmail":"hello@thejamlabs.com","siteUrl":"https://hospiceinfo.pages.dev"}`)
- `node -e "console.log(require('fs').readFileSync('src/lib/siteConfig.ts','utf8').split('siteUrl').length-1)"` → 2 (interface field + mirror value)
- `tsc -b` → exit 0

### W2 — NI manual geo + build-data merge (arch §5, ADR-0021)
Goal: committed manual-geo file, merge point, fail-fast, provenance row.
Files: `data-raw/manual-geo-ni.json` (NEW), `scripts/build-data.mjs`,
`data/README.md` (provenance rows only).
Steps (ordered):
1. Create `data-raw/manual-geo-ni.json` (LF, single trailing newline), exact:
   ```json
   {
     "asOf": "2026-10-29",
     "source": "operator manual reference, OSM grid (ADR-0021)",
     "entries": []
   }
   ```
   (`entries: []` this cycle — the 9 BT postcodes + coordinates are the
   operator's V4 human step; arch §10.)
2. `scripts/build-data.mjs` (126 lines): insert the arch §5 `manualGeo` merge
   block AFTER the `const geoOf = ...` line (current line 79, i.e. after the
   postcode-geo.csv `geo` Map construction, lines 76–79) and BEFORE the first
   `geo` use (line 90). Manual pins override the CSV row for the same postcode
   (documented precedence: manual > gazetteer).
3. Fail-fast inside that block — `console.error` + `process.exit(1)` on ANY of:
   JSON parse failure; `entries` not an array; an entry with missing/non-
   non-empty-string `postcode` or non-finite `lat`/`lon`; UK-bounds violation
   (`49 < lat < 60` AND `-12 < lon < 3`); postcodes not strictly code-unit
   ascending (a duplicate kills the build).
4. `data/README.md` (202 lines): the `manual-geo-ni.json` raw-inputs row
   ALREADY EXISTS (2026-10-29, operator manual reference, 9 BT postcodes) —
   verify-only, do not edit it. The `site-config.json` row's source cell reads
   `"The Jam Labs Ltd (operator)"` and does NOT mention `siteUrl` — append
   ` + siteUrl` to that cell (arch §9 check 7, provenance).
Verify:
- `node -e "JSON.parse(require('fs').readFileSync('data-raw/manual-geo-ni.json','utf8'))"` → exit 0
- `npm run build-data` → exit 0 with this exact baseline log (unchanged,
  because `entries: []`):
  `hospices: 161 (unplaced: 0)` · `voronoi: 11163 vertices, 161 labelled cells` ·
  `practices: 11014 (geocoded 11002, missing 12)` · `assigned: 11002, unassigned: 12`
- Fail-fast wired: `node -e "console.log(require('fs').readFileSync('scripts/build-data.mjs','utf8').split('manual-geo-ni').length-1)"` → ≥ 3 (read + each kill path)
- Provenance: `grep -c "manual-geo-ni.json" data/README.md` → 1+ and the
  site-config row now mentions `siteUrl` (`grep "site-config" data/README.md`)

### W3 — Wales id drift fix (arch §4, ADR-0019/ADR-0002)
Goal: ids stable in the URL on landing (`wales-r<n>` matches the land-pace).
File: `scripts/extract-hospices-wales.mjs` (73 lines).
Steps (ordered):
1. Line 35 only: `id: \`wales-${i + 1}\`` → `id: \`wales-r${i + 1}\``.
   (Header comments line 18/41 already say `wales-r<n>`-style; output file
   `data-raw/hospices-wales.json` — absent CSV → `[]` → exit 0, lines 46–47.)
Verify:
- `node scripts/extract-hospices-wales.mjs` → exit 0 (G3: no CSV → `[]`)
- `node -e "const s=require('fs').readFileSync('scripts/extract-hospices-wales.mjs','utf8');console.log((s.match(/wales-r\\\$\{i \+ 1\}/)||[]).length,(s.match(/wales-\\\$\{i \+ 1\}(?<!r)/)||[]).length)"` → `1 0`
  (equivalently: the `r`-form appears exactly once in the id assignment; the
  un-prefixed form disappears from output code)

## Data rebuild (interim — after W3, before W4)
- `npm run build-data` twice → SHA-256 of each `public/data/*.json` identical
  across the two runs (byte identity; re-baselines the Cycle 2 anchor per arch
  §9 check 1 — with `entries: []` the bytes equal the Cycle 2 set).
- Record the 4 new SHA-256 prefixes (hospices/gp/hoods/tracker, order
  `hospices.json gp-practices.json gp-hoods.json hospice-tracker.json`) for W11.
Verify:
- `node -e "const fs=require('fs'),c=require('crypto');for(const n of fs.readdirSync('public/data').sort())console.log(n,c.createHash('sha256').update(fs.readFileSync('public/data/'+n)).digest('hex').slice(0,8))"` → run twice; the two outputs are identical line-for-line

### W4 — Prerender script (arch §3.1–§3.2, ADR-0015)
Goal: deterministic static page emitter, zero deps.
File: `scripts/prerender.mjs` (NEW — imports `node:fs`, `node:path`, `node:url`
ONLY; nothing else, no npm deps).
Steps (ordered):
1. Read ONLY the fixed input list (no directory walking to collect inputs):
   `public/data/hospices.json`, `data-raw/site-config.json` (source of truth —
   NEVER the TS mirror `src/lib/siteConfig.ts`), and the built `dist/index.html`.
2. Extract VERBATIM from the built `dist/index.html`: all
   `<link rel="stylesheet">` tags, all `<link rel="modulepreload">` tags, and
   the module `<script type="module">` tag. Fail fast (exit non-zero) if any is
   missing, or if any input file is missing/unparsable, or `SITE_URL` (from
   `data-raw/site-config.json`) is empty or not an `https://` URL.
3. Emit into `dist/` (delete previously emitted page files first — idempotent):
   - 161 × `dist/hospice/<id>.html` — ids sorted CODE-UNIT ascending (arch §3.2
     rule 1; this is the set of placenames in `hospices.json`);
   - 6 info pages in EXACTLY this fixed order: `about.html`,
     `corrections.html`, `feedback.html`, `privacy.html`, `licences.html`,
     `accessibility.html`;
   - rewritten `dist/index.html` (W7 head + `<div id="root"></div>` + the
     verbatim boot script from step 2);
   - `dist/sitemap.xml`, `dist/robots.txt`, `dist/404.html`.
   Total: **171 emitted files** = 1 index + 6 info + 161 hospice + sitemap
   + robots + 404. (The full `dist/` tree additionally holds vite's
   `assets/` JS/CSS payload and the `public/` copies — logo.svg,
   manifest.webmanifest, og-image.png — so VERIFY counts the emitted set,
   not the raw tree.)
4. Enforce arch §3.2 in code: every emitted file is LF-only with exactly one
   trailing newline; NO `Date`/timestamps/`<lastmod>`/`Math.random` anywhere;
   JSON-LD built via a single `JSON.stringify(obj)` (0-space, no reformatting);
   iteration order always: hospice ids code-unit ascending, info pages the
   fixed array; no directory walking (fixed paths only).
5. In-code invariant (exit non-zero on failure): `sitemap.xml` `<loc>` count
   must equal `hospices.json.length + 7` (= 168 for Cycle 3 data), else
   `console.error` + `process.exit(1)`.
Verify:
- `npm run build` (W5's chain not needed yet — the old `build` still runs
  `tsc -b && vite build`; then run the script explicitly): exit 0 both times;
  `node scripts/prerender.mjs` → exit 0
- Emitted set = 171:
  `node -e "const fs=require('fs'),p=require('path');let h=0;(function d(x){for(const e of fs.readdirSync(x,{withFileTypes:true})){const f=p.join(x,e.name);if(e.isDirectory())d(f);else if(f.endsWith('.html'))h++}})('dist');console.log(h+(fs.existsSync('dist/sitemap.xml')&&fs.existsSync('dist/robots.txt')?2:0))"`
  → `171` (169 × `.html` + sitemap.xml + robots.txt)
- `node -e "console.log(require('fs').readFileSync('dist/sitemap.xml','utf8').split('<loc>').length-1)"` → `168`
- Idempotent: record an aggregate hash of the 171 emitted files (sha256 of
  path+content, path-sorted), re-run `node scripts/prerender.mjs`, re-hash →
  identical.

### W5 — Build chain (arch §3.1, ADR-0015)
Goal: prerender appended to the npm build.
File: `package.json` (the `build` line only).
Steps (ordered):
1. `"build": "tsc -b && vite build && node scripts/prerender.mjs"`.
Verify:
- `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).scripts.build)"` → exactly `tsc -b && vite build && node scripts/prerender.mjs`
- `npm run build` → exit 0 end-to-end

### W6 — Hash-redirect guard (arch §3.5, ADR-0016; closes R1)
Goal: real paths resolve to the hash router (no blank frame on direct load).
File: `src/main.tsx` (10 lines) — the ONLY change in this item.
Steps (ordered):
1. Insert the EXACT arch §3.5 IIFE after the imports (current line 7) and
   BEFORE `ReactDOM.createRoot(...)` (current line 9):
   - empty hash + real path → `window.location.replace('#/' + route)`;
   - `path === ''` → no-op (early return);
   - `hospice/<id>` → map route (R12 deep-linking documented, NOT built);
   - info page name → its hash route.
2. Forbidden: no router library, no query-string reading, no new hash states;
   `window.location.replace` is the only hash mutation (`pushState` banned).
Verify:
- `tsc -b` → exit 0
- `node -e "const s=require('fs').readFileSync('src/main.tsx','utf8');console.log((s.match(/location\.replace/g)||[]).length,(s.match(/pushState/g)||[]).length)"` → `1 0`
- `git diff --name-only -- src` → exactly one path: `src/main.tsx` (W10's renames land later)
- Operator smoke post-W10: `npm run preview` → direct load of `/about.html`
  renders the About view (not the map); `/` renders the map.

### W7 — SEO / JSON-LD / canonical head (arch §3.3–§3.6, ADR-0018)
Goal: per-page head + LD inside prerender (content rules for W4's emission).
File: `scripts/prerender.mjs` (W4 emission) — outputs in `dist/`.
Rules (enforced exactly, per arch §3.3–§3.6):
1. Head: titles/descriptions EXACT from the arch §3.3 table per page type;
   HTML-escape `&<>"'` in title/meta content; single
   `<link rel="canonical" href="…">` = served URL (`{SITE_URL}/` for home,
   `{SITE_URL}/about.html` … for info pages, `{SITE_URL}/hospice/<id>.html`
   for the 161); 6 OpenGraph + 2 Twitter tags on every page —
   `og:type=article` on the 161 ONLY, `og:site_name=Hospice Finder UK`,
   `og:image={SITE_URL}/og-image.png` on all.
2. JSON-LD: exactly ONE `<script type="application/ld+json">` per page;
   `@graph=[Organization]` on ALL pages (values from
   `data-raw/site-config.json`; `@id` = `{SITE_URL}/#operator`); hospice pages
   append `HealthCareBusiness` — `address` only when `postcode` non-empty,
   `geo` only when placed (`lat`/`lon` present in `hospices.json`); single
   `JSON.stringify` (0-space) per page.
3. No-endorsement guard: NEVER emit `sameAs`, `affiliation`,
   `parentOrganization`, `contactPoint`, `openingHours`, or pricing.
4. `sitemap.xml` per §3.6 (loc id-sorted, XML-escaped, no `<lastmod>`);
   `robots.txt` per §3.6 verbatim (incl. `Sitemap: {SITE_URL}/sitemap.xml`);
   `404.html` = the §3.3 shell, title `Page not found - Hospice Finder UK`,
   Organization node only.
Verify:
- `node -e "const s=require('fs').readFileSync('dist/hospice/hull-east-yorks.html','utf8');console.log((s.match(/<title>/g)||[]).length,(s.match(/rel=\"canonical\"/g)||[]).length,(s.match(/ld\+json/g)||[]).length)"` → `1 1 1`
- Guard, whole dist: `node -e "const fs=require('fs'),p=require('path'),re=/sameAs|affiliation|parentOrganization|contactPoint|openingHours|pricing/i;let n=0;(function d(x){for(const e of fs.readdirSync(x,{withFileTypes:true})){const f=p.join(x,e.name);if(e.isDirectory()){d(f);return}n+=(fs.readFileSync(f,'utf8').match(re)||[]).length}})('dist');console.log(n)"` → `0`
- `node -e "console.log(require('fs').readFileSync('dist/robots.txt','utf8'))"` → the §3.6 text, `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml` present, LF-terminated
- `node -e "console.log(require('fs').readFileSync('dist/404.html','utf8').includes('Page not found - Hospice Finder UK'))"` → `true`
- Unplaced honesty: for every hospice whose `hospices.json` entry lacks
  `lat`/`lon`, its page contains neither `"geo"` in the JSON-LD nor a
  lat/lng meta tag.
- Byte-stability: `npm run build` twice → the 171 emitted files
  byte-identical both runs (path-keyed aggregate sha256, as in W4).

### W8 — og-image.png (arch §3.8)
Goal: committed 1200×630 operator asset placeholder.
File: `public/og-image.png` (NEW).
Steps (ordered):
1. Zero-dep hand-generated placeholder — solid `#1d4ed8`
   (RGB 29,78,218) field; the white "Hospice Finder UK" wordmark and heart-pin
   mark are the V2 human branding gate (arch §10), NOT scripted here:
   `node -e "const z=require('zlib'),fs=require('fs');const W=1200,H=630;const raw=Buffer.alloc(H*(1+W*3));for(let y=0;y<H;y++){const o=y*(1+W*3);raw[o]=0;for(let x=0;x<W;x++){raw[o+1+x*3]=29;raw[o+2+x*3]=78;raw[o+3+x*3]=218}}const tint=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1))}return(c^0xFFFFFFFF)>>>0};const ch=(t,d)=>{const tb=Buffer.concat([Buffer.from(t,'ascii'),d]);const h=Buffer.alloc(8);h.writeUInt32BE(d.length,0);h.writeUInt32BE(tint(tb),4);return Buffer.concat([h,tb])};const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=2;fs.writeFileSync('public/og-image.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),ch('IHDR',ih),ch('IDAT',z.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]))"`
   → exit 0
2. Commit the file; NO image-library dependency added.
Verify:
- `node -e "const b=require('fs').readFileSync('public/og-image.png');console.log(b[0]===0x89&&b[1]===0x50&&b[2]===0x4E&&b[3]===0x47?'PNG':'BAD')"` → `PNG`
- `node -e "const b=require('fs').readFileSync('public/og-image.png');console.log(b.readUInt32BE(16)+'x'+b.readUInt32BE(20))"` → `1200x630`

### W9 — Logo refinement (arch §6, ADR-0022)
Goal: white heart on blue disc; 4 → 3 elements.
File: `public/logo.svg` (FULL content replacement).
Steps (ordered):
1. Replace the whole file with the EXACT 3-element SVG of arch §6
   (verbatim from architecture.md §6): pin path `M24 30 L32 54 L40 30 Z`
   fill `#1d4ed8`; the single `<circle cx="32" cy="26" r="18" fill="#1d4ed8"/>`;
   the white heart path fill `#ffffff`; `aria-label="Hospice Finder UK"`;
   `viewBox="0 0 64 64"`.
Verify:
- `node -e "const s=require('fs').readFileSync('public/logo.svg','utf8');console.log((s.match(/<circle /g)||[]).length,(s.match(/M24 30 L32 54 L40 30 Z/g)||[]).length,(s.match(/<path/g)||[]).length)"` → `1 1 2`
- `node -e "console.log(require('fs').readFileSync('public/logo.svg','utf8').includes('aria-label=\"Hospice Finder UK\"'))"` → `true`
- No favicon file: `node -e "console.log(require('fs').readdirSync('public').filter(n=>/logo|favicon/i.test(n)).join(','))"` → `logo.svg`
- `public/manifest.webmanifest` still parses: `node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'))"` → exit 0 (unchanged until W10)

### W10 — Rename + 404 wording (arch §2, ADR-0023)
Goal: "Hospice Finder UK" on every user-visible surface; 404 wording per §3.3.
Known live occurrences (verify the complete set first):
- `index.html` line 10 — `<title>UK Hospice Catchment Map</title>`
- `src/components/AppShell.tsx` line 33 — header text `Hospice Catchment Map`
- `public/manifest.webmanifest` — `name` `Hospice Catchment Map`,
  `short_name` `Hospice Map`
- Any other `src/` page component printing the name (arch §2 surface list)
Steps (ordered):
1. Discover the full set: case-insensitive search for `catchment` across
   `index.html`, `src/`, `public/`; every hit must land on an arch §2
   display surface or in the exempt set (step 2).
2. Rename: `index.html` title → `Hospice Finder UK`; `AppShell.tsx` header →
   `Hospice Finder UK`; `manifest.webmanifest` `name` → `Hospice Finder UK`,
   `short_name` → `Hospice Finder`; any other surface found in step 1.
   (404 title and prerender titles/og are already the new name via W7/W4.)
3. Touch NOTHING in the exempt identifier set: `wrangler.jsonc`,
   `package.json` `name` (`hospice-catchment-map`), repo/slug/site name,
   ADR files, `docs/` paths, `data/README.md` provenance, `.agents/` history.
Verify:
- `node -e "const fs=require('fs'),p=require('path');const re=/catchment/i;let hits=[];(function d(x){for(const e of fs.readdirSync(x,{withFileTypes:true})){const f=p.join(x,e.name);if(e.isDirectory()){if(!/node_modules|dist|\.git|\.agents|\.qwen/.test(f))d(f);return}if(/docs|wrangler\.jsonc$|adr/i.test(f))return;if(re.test(fs.readFileSync(f,'utf8')))hits.push(f)}})('.');console.log(hits.length)"` → `0`
  (i.e. no user-visible "catchment" remains anywhere in source/editable files)
- `tsc -b` → exit 0; `npm run build` → exit 0; then
  `node -e "const fs=require('fs'),p=require('path');let n=0;(function d(x){for(const e of fs.readdirSync(x,{withFileTypes:true})){const f=p.join(x,e.name);if(e.isDirectory()){d(f);return}n+=/catchment/i.test(fs.readFileSync(f,'utf8'))?1:0}})('dist');console.log(n)"` → `0`
- `public/manifest.webmanifest` → `JSON.parse` ok; `name==='Hospice Finder UK'` and `short_name==='Hospice Finder'`
- `git diff --name-only` for W10 excludes the entire exempt set above

### W11 — docs/build-log.md (LAST; arch §9 check 1)
Goal: build-cycle ledger, one line per cycle.
File: `docs/build-log.md` (NEW). Line format:
`<cycle> <date> <hospices-8> <gp-8> <hoods-8> <tracker-8>` (space-separated,
8-char SHA-256 prefixes, order: `hospices.json gp-practices.json
gp-hoods.json hospice-tracker.json`).
Steps (ordered):
1. Create the file with the Cycle 2 seed line (date 2026-10-26, anchors
   from the Cycle 2 baseline): `2 2026-10-26 dc261185 e11322ba 2a87a374 5628d8f7`
2. APPEND (after the Data rebuild, item already recorded, NOT this batch) the
   Cycle 3 line (2026-10-29) with the 4 new SHA-256 prefixes recorded at the
   Data rebuild. Tracked-file append discipline: the Cycle 2 line is never
   rewritten.
Verify:
- `node -e "console.log(require('fs').readFileSync('docs/build-log.md','utf8').trim().split('\n').length)"` → `2`
- Line 1 is verbatim `2 2026-10-26 dc261185 e11322ba 2a87a374 5628d8f7`
- Line 2 starts `3 2026-10-29 ` and carries exactly the 4 prefixes recorded at
  the Data rebuild (re-confirm by re-hashing `public/data/*.json`)
- File is LF-only, single trailing newline

## Sequencing
W1 → W2 → W3 → [Data rebuild ×2] → W4 → W5 → W6 → W7 → W8 → W9 → W10 → W11
(LAST). Matches the lead ordering: data merge → data rebuild → prerender +
build chain → hash guard → SEO/JSON-LD/canonical → og-image → logo → rename
→ build-log last.

## Ambiguity resolution — item numbering
The pre-cycle summary dispatch phrased the scope as "W1…W10 (per dispatch
numbering — NOT the existing file's W1–W11)"; the LIVE DaVinciThink
orchestrator dispatch "Work Breakdown Structure for the Execution phase"
specifies W1–W11 plus the interstitial Data-rebuild section and states: "This
is the work breakdown structure to work from." Rule applied: the LIVE
orchestrator dispatch is the authoritative, most-recent instruction
(highest priority). This file therefore carries W1–W11 + Data-rebuild
exactly as the orchestrator enumerates them.
