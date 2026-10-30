# Stage 7 — Security review (Cycle 3)

- **Stage:** 7 of 10 (Security engineer)
- **Date:** 2026-10-29
- **Cycle:** 3 — supersedes the 2026-10-26 Cycle 2 report at this path (PASS / 0 Blocking; SEC-F1 resolved; SEC-F2/SEC-F3 carried). Carried findings re-checked in §Carried items.
- **Scope:** static SPA (React 18, react-leaflet 4, Vite 5, TS strict, Bootstrap 5.3 ESM) on Cloudflare Pages (`https://hospiceinfo.pages.dev`). Cycle 3 change under review: deterministic static prerender (ADR-0015) — `scripts/prerender.mjs` emits 171 files into `dist/` (169 shell pages: index + 6 info + 161 hospice + 404; plus sitemap.xml, robots.txt), hash-redirect guard (ADR-0016) in `src/main.tsx`, single `package.json` build-script line.
- **Method:** read-only on-disk verification (RQ-1 — every claim cites a file:line, a grep, or a command executed this pass). No source modified, no `git add`/`commit`, no installs.
- **Trust model (unchanged, re-verified):** no backend, no auth, no cookies, no telemetry. Trust boundary = "static assets + public JSON" served over HTTPS; only runtime egress is OSM tiles (pre-existing, no key); only outward user action is a user-initiated `mailto:`.

## Verdict

**VERDICT: FAIL — 1 Blocking finding (SEC-3-01).** Every prerendered HTML page (169/169, including the deployed `dist/index.html`) has an unclosed boot `<script>` element, so `</body></html>` is swallowed as script raw-text, the module script throws a SyntaxError on the literal `<` token, React never mounts, and every page renders blank. 1 risk-accepted (SEC-3-02, design-level), 1 informational (SEC-3-03).

## Findings

| id | severity | area | description |
|---|---|---|---|
| SEC-3-01 | BLOCKING | `scripts/prerender.mjs` / dist | Boot tag extracted as opening tag only (`prerender.mjs:61` regex, `:64` `bootScript = bootTag[0]`); `buildPage` (`:198-201`) emits it followed by `</body>`/`</html>` with **no** `</script>`. All 169 dist pages have `<script` opens = 2, `</script>` closes = 1. Unclosed module-script raw-text swallows `</body></html>` → module SyntaxError → blank page site-wide. |
| SEC-3-02 | RISK-ACCEPTED (design-level) | `scripts/prerender.mjs` | Hospice `h.id` is interpolated into the emitted file path (`:235`) and into canonical/OG/JSON-LD URLs (`:161`, `:179`, `:185`) with no character-set assertion (`:41-43` type-checks `id`/`name` only). Safe today: all 161 emitted ids verified `[A-Za-z0-9-]` from dist file names (`en-1-120960209`, `ni-r1`, `sc-CS2014323454`, `en-H5R4P`, `en-R0B0U`, …). Carried inside SEC-F3's build-time curation boundary; hardening recommended (§Open items 2). |
| SEC-3-03 | INFORMATIONAL | `package.json` | Single-line build-script change (`dc07faf..2523390`): `"build": "tsc -b && vite build"` → `"build": "tsc -b && vite build && node scripts/prerender.mjs"`. No dependencies added; lock file untouched/absent; ADR-0008 upheld. |

Blocking: **1**. Risk-accepted: **1** (design-level, never blocks). Informational: **1**.

## Per-area conclusions (7 areas)

### 1. `scripts/prerender.mjs`

- **(a) Path traversal id → `hospice/<id>.html`.** `write('dist/hospice/' + h.id + '.html', …)` at `:235`; input validated only by `typeof h.id === 'string'` in the fail-fast loop `:41-43`. No `..`/separator filter. **Empirically benign today** (161 ids all `[A-Za-z0-9-]`, verified from dist file names) → **SEC-3-02** (risk-accepted, design-level; inside SEC-F3).
- **(b) HTML escaping `& < > " '` in title/meta/og — code and dist.** `esc()` `:68-74` and `xesc()` `:77-83` escape all five (`& ← &amp;`, `' ← &#39;`/`&apos;`); applied to every dynamic meta value `:176-188` (`title`, `description`, `og:title`, `og:description`, `twitter:*`, canonical/og:url). Dist spot-check `dist/hospice/en-1-120960209.html:6,7,13,14,19,20`: real-world `&` in "LOROS The Leicestershire & Rutland Hospice" renders as `&amp;`. **Clean.**
- **(c) `</script>` breakout in JSON-LD.** (i) Code: `jsonld()` `:155-158` is the single `JSON.stringify`; embedded at `:189`. `JSON.stringify` does **not** escape `/`, so a `</script>` in any data string would classically break out — the code-level risk exists. (ii) Dist: internal tag-count scan of all 169 files (verification row 2) shows exactly one `</script>` per file — the legitimate JSON-LD terminator. No breakout in any emitted page. The open≠close imbalance is explained entirely by SEC-3-01, not by injected closers. **Clean dist-wide; code-level residual noted under SEC-3-02's boundary.**
- **(d) XML escaping in sitemap.xml.** 168 `<loc>` values = 1 root + 6 info + 161 hospice; each `xesc`-ed (`:247`); node scan found 0 raw `<`, `>`, `&` in loc values, 0 `lastmod` (spec: no lastmod). Build-time invariant `:259-262`: FATAL unless `loc count === hospices.length + 7` — holds (168 = 161 + 7). **Clean.**
- **(e) Determinism, robots, sitemap spec.** Dist-wide scan for timestamp/Date/lastmod/randomness markers → 0 (verification row 5); `write()` `:205-208` normalises CRLF→LF + exactly one trailing newline. `dist/robots.txt` verified verbatim against spec: `User-agent: *` / `Allow: /` / blank / `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml` (matches `:252-255`). **Clean.**

### 2. `src/main.tsx` hash-redirect guard (ADR-0016)

IIFE `src/main.tsx:10-17`: early-returns if `location.hash` already set; `path` = `location.pathname` stripped of edge slashes; bare `hospice` → `null`; `hospice/…` prefix stripped; then `window.location.replace('#/' + route)` (`:16`). The redirect target is **always `#`-prefixed** — a same-origin fragment — and no other URL is constructed (no `http`, no `window.open`, no `href` assignment anywhere in the file, verified by full read). **Clean.**

### 3. Dependency trust

- `git diff --stat package.json package-lock.json` (this pass) → `package.json | 2 +-` only; no lock file in repo. The one changed line is the build script (SEC-3-03) — dev-script wiring, not a dependency. **ADR-0008 upheld.**
- `scripts/prerender.mjs` imports: `node:fs`, `node:path`, `node:url` only (`:19-21`). Zero npm dependencies. **Clean.**

### 4. Static assets (`public/`)

Grep for `http`/network references: `public/logo.svg` → 1 hit, `xmlns="http://www.w3.org/2000/svg"` (line 1) — a namespace identifier, not a network reference. `public/manifest.webmanifest` → 0 (icons local `/logo.svg`, `start_url:"./"`). `public/og-image.png` → 0 (no URL strings in binary). No `<script>`, animation, remote image, or off-origin ref in any asset. **Clean.**

### 5. robots.txt / sitemap.xml surface

Both re-verified from dist (rows 4–5, 9): 168 locs, all prefixed `https://hospiceinfo.pages.dev/`; no dev/internal/test paths, no `http://`, no `localhost`, no non-published routes (404 deliberately excluded). robots.txt allows `/` and points to the single site sitemap. **Clean.**

### 6. Trust boundary — re-confirm carried items; new design findings

No change to the boundary: still "static assets + public JSON" over HTTPS; prerendering adds build-time file emission only, no runtime capability; OSM-tile egress and user-initiated `mailto:` unchanged (re-verified by area 3/4 and row 10: no new `fetch`/storage/network code in `src/`). SEC-F2 (static-site posture) and SEC-F3 (human-curation supply chain = build-time trust) re-confirmed unchanged. One **new DESIGN-LEVEL** finding this cycle: **SEC-3-02** (id character-set not asserted before path/URL interpolation). It sits strictly inside SEC-F3's boundary, is empirically safe today, and does **not** require Architect rework — recorded as risk-accepted with a hardening recommendation.

### 7. Client data flow

Grep `src/` for `dangerouslySetInnerHTML|innerHTML|eval(|new Function|document.write|XMLHttpRequest|WebSocket` → **0 matches** (row 10). The only `fetch` calls remain the two same-origin `/data/*.json` reads carried from Cycle 2; no user input reaches any of them. No storage (`localStorage`/`sessionStorage`) present. **Clean.**

## Design-level findings

- **SEC-3-02** (risk-accepted, **DESIGN-LEVEL**): `h.id` flows from curate-controlled `public/data/hospices.json` into filesystem paths and public URLs with no charset assertion. Exploitable only if the curation pipeline (inside SEC-F3's trust boundary) is compromised to emit ids containing `/`, `..`, or markup. All 161 current ids verified `[A-Za-z0-9-]`. Recommendation: assert `/^[A-Za-z0-9-]+$/` per id in the `:41-43` fail-fast loop (one line, no design change). No route back to the Architect required.

No other trust-boundary, authentication, data-flow, or storage-model change: nothing requires Architect rework beyond the above.

## Carried items

| prior id | finding | Cycle-3 status |
|---|---|---|
| SEC-F1 | ODbL/attribution (Licences page, footer, README) | **Still resolved** — footer attribution untouched by Cycle-3 diff (delta limited to `scripts/prerender.mjs`, `src/main.tsx`, `package.json`); no regression. |
| SEC-F2 | Static-site trust posture (design-level) | **Unchanged — risk-accepted.** Zero network/storage/auth added by Cycle-3 deltas (§6, row 10). |
| SEC-F3 | Human-curation supply chain = build-time trust boundary (design-level) | **Unchanged — risk-accepted.** New SEC-3-02 is carried **inside** this boundary; curation scripts untouched. |
| SEC-1…SEC-5, SEC-7…SEC-9 (Cycles 1–2) | OGL artefact retired; register projection; practice-name personal names; dev-only advisories; human-fetch chain; Nominatim/Overpass netiquette | **Unchanged — risk-accepted.** The Cycle-3 diff touches none of those surfaces. |

## Open items

1. **SEC-3-01 (Blocking) — coding fix pass, rework round 1 of 2.** In `buildPage` (`prerender.mjs:198-201`), ensure the boot tag is closed before `</body>`: if `bootScript` does not end with `/>`, emit `</script>` immediately after it (preferred: extend the `:61` regex to capture the tag through its `>` and explicitly emit the matching close). Then re-run `node scripts/prerender.mjs` and re-scan all 169 dist pages: `<script` opens must equal `</script>` closes (= 2 each); spot-render one page to confirm React mounts.
2. **SEC-3-02 (non-blocking hardening).** Add the `/^[A-Za-z0-9-]+$/` id assertion to the `:41-43` fail-fast loop; re-run build to confirm no change to emitted output.
3. **SEC-3-03 (informational).** Recorded only; no action.

## Verification log (2026-10-29, Cycle 3, read-only)

| # | command/inspection | key output |
|---|---|---|
| 1 | read `scripts/prerender.mjs` in full (265 lines) | boot regex opening-tag-only `:61`; `bootScript = bootTag[0]` `:64`; `buildPage` emits `bootScript` + `</body>` + `</html>`, no `</script>` `:198-201`; `esc`/`xesc` `:68-83`; single `JSON.stringify` `:155-158` embedded `:189`; `write` LF normalisation `:205-208`; id→path `:235`; sitemap `:243-250`; robots `:252-255`; AC2 invariant `:259-262` |
| 2 | node scan: count `<script` vs `</script>` in every `dist/**/*.html` | html files scanned: 169; **MISMATCHES: 169** — every file open=2, close=1 (the one close = JSON-LD terminator; missing close = boot script → SEC-3-01) |
| 3 | read `dist/hospice/en-1-120960209.html` (28 lines) | title/meta/og carry `&amp;` (real-world `&`); JSON-LD has raw JSON `&` (valid JSON, not XML); file ends `<script type="module" crossorigin src="/assets/index-mKHWy8cd.js">` / `</body>` / `</html>` — unclosed boot script, visual proof of SEC-3-01 |
| 4 | node scan: extract all `<loc>` values from `dist/sitemap.xml`; filter for raw `<` `>` `&` | 168 locs; 0 raw specials; 0 `lastmod` |
| 5 | dist-wide scan for determinism markers (`Date`, `lastmod`, ISO-timestamp pattern) | 0 hits |
| 6 | read `dist/robots.txt` | `User-agent: *` / `Allow: /` / blank / `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml` — spec-verbatim |
| 7 | read `src/main.tsx` in full | IIFE `:10-17`; `window.location.replace('#/' + route)` `:16` — always `#`-prefixed; no other URL constructed |
| 8 | `git diff --stat package.json package-lock.json` | `package.json \| 2 +-` (1 insertion, 1 deletion; build-script line only); no lock file in repo |
| 9 | grep `http` in `public/logo.svg`, `public/manifest.webmanifest`, `public/og-image.png` | logo.svg: 1 hit = `xmlns="http://www.w3.org/2000/svg"` (benign); manifest: 0; png: 0 |
| 10 | grep `dangerouslySetInnerHTML\|innerHTML\|eval(\|new Function\|document.write\|XMLHttpRequest\|WebSocket` in `src/` | 0 matches |

Every conclusion is pinned to a row of this log. All 7 areas verified; no incomplete section; no TODOs.

## Post-fix verification — rework round 1 (2026-10-29)

- Independently re-verified on disk (fix-pass claims in implementation.md NOT trusted; all checks re-run):
  - **SEC-3-01: RESOLVED** — build exit 0; 169 HTML files; `<script` opens = 338, `</script>` closes = 338; 0 mismatched files; sample page tail exact (closed boot script + `</body>` + `</html>` + single trailing LF); dist re-hash identical before/after prerender re-run; `prerender.mjs:64` quoted below.
  - **SEC-3-02: RESOLVED (hardening landed)** — the recommended per-id charset assertion is present in the fail-fast loop (quoted below); all 161 ids comply, emitted output unchanged (0 hash differences).
  - **SEC-3-03: unchanged** — informational, no action required.
- **GATE VERDICT (rework round 1 of 2): PASS** — the single Blocking finding (SEC-3-01) is resolved on disk; 0 new findings; 0 open Blocking findings. Note on impact wording: as corrected by the lead in the fix pass, the defect was invalid HTML structure (unclosed boot `<script>` swallowing `</body></html>` as script raw text), not a "blank page" — the boot tag is a `<script src>` module and the browser executes the fetched resource while ignoring inline raw text. The original verdict line's "blank page site-wide" framing is superseded.

### Verification log (post-fix, rework round 1, 2026-10-29)

| # | check | command / evidence | result |
|---|---|---|---|
| 1 | Claimed edits present in source | `read_file scripts/prerender.mjs` (full, 266 lines) | line 64: `const bootScript = bootTag[0] + '</script>';` ✓; fail-fast loop (lines 47-50) now contains `if (!/^[A-Za-z0-9-]+$/.test(h.id)) fail('hospice id has characters outside [A-Za-z0-9-]: ' + h.id);` ✓. Rest of file matches the Cycle-3 report structure (esc/xesc, buildPage, LF-normalising write, emit set, sitemap/robots, AC2 invariant) — no other behavioural changes observed. |
| 2 | Build | `npm run build` | exit 0; `✓ 148 modules transformed`; `dist/assets/index-mKHWy8cd.js` + `index-DXBOPrrL.css`; `[prerender] emitted 171 files (161 hospice pages)` |
| 3 | Script tag balance, all dist HTML | `node .qwen/tmp/sec-r1-tags.cjs` (throwaway) | `html files: 169 / total opens: 338 / total closes: 338 / mismatches: 0`, exit 0 — every file exactly 2 opens / 2 closes |
| 4 | Sample page tail | `dist/hospice/en-1-120960209.html` byte check | `crlf=no`; `singleTrailingNL=true`; last 4 lines exactly: `  <script type="module" crossorigin src="/assets/index-mKHWy8cd.js"></script>` / `</body>` / `</html>` / ``(empty) |
| 5 | Determinism | hash all `dist/**` (sha256 keyed by relative path, single aggregate digest), then `node scripts/prerender.mjs`, hash again | `files=181` both runs; aggregate `293328338b000a9b7db32e9454bf39bcb38d2dc19b4c20d5df8a9a344ffd9a79` identical before/after (0 differences). (Digest differs from the `12f7742a…` recorded in implementation.md only because this verification used its own keying/concat scheme; the spec'd requirement is before/after identity of this pass's digest — satisfied.) |
| 6 | Invariants | `dist/sitemap.xml`, `dist/robots.txt` byte checks | sitemap: exactly 168 `<loc>`, no `lastmod`, single trailing newline; robots: 75 bytes, verbatim `User-agent: *` / `Allow: /` / blank / `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml` |
| 7 | Fix-pass ledger statement | `read_file .agents/implementation.md` (Cycle-3 fix-pass section tail) | ends with `**FIX-PASS COMPLETE: WF-1 + WF-2 landed and validated**` (followed by a provenance note from the lead) ✓ |

### Post-fix residual risk

- SEC-3-02's underlying exposure (id → path/URL interpolation) is now fail-fast asserted at build time (`[A-Za-z0-9-]`); the design-level concern remains carried inside SEC-F3's curation boundary — status moves from "hardening recommended" to "hardening landed", risk level unchanged (low, inside SEC-F3).
- SEC-3-01's JSON-LD `</script>` breakout note (verification row 3 of the original pass, area 1(c)) remains a code-level residual within the same SEC-F3 boundary; no emitted page is affected (tag balance 338/338 proves no breakout in the current dist). No action required.
- No trust-boundary, authentication, storage, or telemetry change introduced by the fix. Carried items (SEC-F1…F3, Cycles 1-2 findings) unchanged.
