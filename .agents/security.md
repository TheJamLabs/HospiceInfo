# Security review — Cycle 4 (Stage 7 of 10)

- **Stage:** 7 of 10 (Security engineer)
- **Date:** 2026-10-30
- **Cycle:** 4 — supersedes the Cycle 3 report at this path, whose final state (post-fix gate, rework round 1) was PASS with **0 open Blocking findings** (SEC-3-01 resolved, SEC-3-02 hardening landed, SEC-3-03 informational).
- **Pass type:** **FULL AUDIT** (no unresolved Blocking findings in the prior report) — read-only verification of the Cycle 4 working-tree delta.
- **Scope / evidence base:** HEAD `c6da9d3`; delta = 24 tracked modified files + untracked (`docs/adr/0024…0030`, `.agents/design.md` + 6 concept SVGs, `public/fonts/` 3×woff2, `src/lib/theme.ts`, scratch dirs `.qwen/tmp/` + `.tmp/`); `dist/` rebuilt (171 files). Cycle 4 change under review: BEACON rebrand + theme system (ADR-0024), layers-in-memory off-by-default (ADR-0025), 3-tier hide-not-delete search (ADR-0026), dark Leaflet CSS overrides (ADR-0027), `--hf-*` design tokens (ADR-0028), self-hosted fonts (ADR-0008), and pipeline fix ADR-0030 (reproducible static chain with SHA-pinned inputs per ADR-0029).
- **Method:** read-only on-disk verification (RQ-1 — every claim cites a file:line, a grep, or a command executed this pass). No source modified, no `git add`/`commit`, no installs.
- **Trust model:** "static assets + public JSON" over HTTPS; no backend, no auth, no cookies, no telemetry. Runtime egress = OSM tiles (pre-existing, keyless); outward user action = user-initiated `mailto:`. **One delta this cycle:** a new client-storage trust surface — the `hfuk-theme` `localStorage` key (SEC-4-D1, design-level, documented).

## Verdict

**VERDICT: PASS — 0 Blocking findings.** 1 new risk-accepted (SEC-4-01, Low — missing OFL attribution for shipped fonts), 2 informational (SEC-4-02 scratch-dir hygiene clean, SEC-4-03 dark-tiles debt). 3 design-level items (SEC-4-D1 new, Low; SEC-4-D2 carried = SEC-F3, Medium; SEC-4-D3 carried = SEC-F2, Info) — none require Architect rework. All Cycle 3 fixes re-verified intact.

## Findings

| id | severity | area | description |
|---|---|---|---|
| SEC-4-01 | LOW — RISK-ACCEPTED | supply chain / licensing | The three shipped `woff2` fonts (`public/fonts/` — Archivo-700.woff2, PublicSans-400.woff2, PublicSans-600.woff2, OFL-licensed) are wired via `@font-face` at `src/styles.css:3,10,17` with local `url()`s at `:75,77,79`, but the repo contains **no OFL notice, no `LICEN*` file, and no font attribution anywhere** (grep for license text → 0 hits; `glob **/LICEN*` → 0). Licensing-completeness gap, not an exploitable defect. Recommendation: add the OFL notice to the Licences page/docs before the next push (push = publish, ADR-0014). |
| SEC-4-02 | INFO — RISK-ACCEPTED | repo hygiene | Untracked scratch dirs `.qwen/tmp/` + `.tmp/` hold cycle work files. Credential-pattern scan (PowerShell `Select-String` over every file in both dirs) → 18 hits, **all design/review prose, zero credentials** (spot-verified `c4-header.md:13-22`, `review-c4-02.md:5-12`). Not deployable: Pages builds from git commits only (ADR-0014, ADR-0030 hop 4); untracked files never enter `dist/`. Recommendation: keep untracked; gitignore on cleanup. |
| SEC-4-03 | INFO — RISK-ACCEPTED (carried debt) | rendering | No dark OSM tileset adopted; light tiles render in both themes per ADR-0027 §4.5 (documented as a 1-line follow-up). No new egress (same keyless tile origin as before). Carried unchanged from Cycle 3. |

Blocking: **0**. New risk-accepted: **1** (Low). Informational: **2**. Design-level: **3** (§Design-level findings).

## Per-area conclusions (7 areas)

### 1. Theme system (ADR-0024) — `src/lib/theme.ts`, `AppShell.tsx`, boot snippet

- **Boot snippet (inline, `<head>`):** `index.html:17-24` is a closed IIFE that reads `localStorage.getItem('hfuk-theme')` inside try/catch, **whitelists** `s === 'light' || s === 'dark'` (absent/anything-else = auto), and sets `data-bs-theme` to the fixed strings `'dark'`/`'light'` only. No user-controlled value reaches the DOM.
- **`src/lib/theme.ts` (new, full read, 77 lines):** `:17` `KEY = 'hfuk-theme'`; `:21-24` `readStoredValue` try/catch; `:29-31` `getStoredMode` returns only `'light' | 'dark' | 'auto'`; `:35-44` `setStoredMode` try/catch, writes whitelisted tokens only; `:55-57` `setBsTheme` writes fixed strings via `document.documentElement.dataset.bsTheme`; `:64-77` `attachAutoListener` — singleton guard, re-reads storage per `matchMedia` change (no stale state). **No injection surface.**
- **Boot-snippet twin:** `scripts/prerender.mjs:179-189` emits the snippet as a frozen `out.push` block (comment at `:179`: "ADR-0024: static theme-boot snippet — byte-identical to index.html; QA checks equality"); node byte-comparison of the snippet in `index.html` vs `dist/index.html` → `true/true` (verification rows 10, 17).
- **`AppShell.tsx` (new, full read):** nav links `:14-21` are all `#fragment` (same-document); `:40` initial mode from storage; `:41-47` `pickMode` cycles the three states; `:77` plain `onClick`; `img src="/logo.svg"` local. No sinks, no external URLs.
- **`src/main.tsx:8,30`:** `attachAutoListener` is invoked **module-level** only when `getStoredMode() === 'auto'` — no React effect, per architecture R1.
- **Conclusion: Clean.** One new design-level trust-boundary extension recorded: **SEC-4-D1**.

### 2. Layers, search, first-load defaults (ADR-0025, ADR-0026)

- `src/App.tsx:29` `showGps = useState(false)` — first load: GP layer OFF; `src/components/MapView.tsx:251-254` `visiblePractices` gated by `showGps`; the GP divIcon template interpolates a **numeric count only** (no user text).
- No new persistence: the layer state is in-memory (`useState`); no new `localStorage`/`sessionStorage` keys anywhere in `src/` (only `hfuk-theme`, verification row 14). ADR-0025 off-by-default upheld.
- 3-tier hide-not-delete search remains a client-side filter over the same-origin JSON; no new data source. **Clean.**

### 3. Rendering sinks and external links

- `grep src/` for `innerHTML|document.write|eval(|new Function|WebSocket|XMLHttpRequest|postMessage|Worker` (row 5) → **0 relevant matches**.
- `src/App.tsx:168` `href={selected.website}`, `:170` `href={selected.cqcUrl}` — both `rel="noreferrer"`; values originate from curated `public/data/*.json` (SEC-F3 boundary, unchanged; ids additionally fail-fast charset-asserted in the build chain). `mailto:` remains the only outward user-initiated action, URI-encoded.
- **Conclusion: Clean; SEC-F3 carried as SEC-4-D2.**

### 4. Static assets and styles

- `src/styles.css`: `@font-face` at `:3,10,17`; all three `url()`s are local `/fonts/*.woff2` (`:75,77,79`); grep `data:|@import|url(|wss?://` over the stylesheet → only those 3 local refs; no `@import`, no `data:`, no remote reference.
- Dark Leaflet overrides (ADR-0027) live in `src/styles.css:1031-1038` only; `leaflet.css` untouched (no edits to the shipped third-party stylesheet).
- `public/fonts/` = exactly 3 woff2 files; **no `LICEN*` file** → SEC-4-01. `public/logo.svg` recolour: sole `http` hit remains the `xmlns` namespace; `public/manifest.webmanifest` local-only (theme_color value swap only). **Clean (save SEC-4-01).**

### 5. Prerender / dist integrity

- `dist/` rebuilt: 169 HTML files; `<script` opens = `</script>` closes = 507; **0 mismatches** (regression re-check of SEC-3-01, row 8).
- Boot snippet present in dist and byte-identical to `index.html` (rows 10, 17).
- SEC-3-02 hardening intact: id charset assertion at `scripts/prerender.mjs:50` (row 15).
- Output count 171 files — ADR-0015/ADR-0030 hop-3 invariant holds. **Clean.**

### 6. Dependency and supply-chain trust

- Cycle 4 diff touches **no `package.json`** (`git diff --stat HEAD`: 308 insertions / 301 deletions / 24 files, verification row 2) — ADR-0008 upheld.
- ADR-0030 (read in full): the production chain is fixed as *committed inputs → deterministic data/site build → git-connected publish*, with **"no stage needs a secret, a network call, or a runtime service"**; a fresh clone + `npm ci` + `npm run build` reproduces the deployed bytes offline. ADR-0029: keyless OSM geocoding with SHA-pinned raw inputs (G7 re-pin 2026-10-30). This **strengthened the carried SEC-F2 posture** — no new supply-chain surface introduced.
- **Clean.**

### 7. Trust boundary and client data flow

- The **only** boundary change is the new `hfuk-theme` localStorage key (§1) — self-only, non-sensitive, whitelisted on every read path. Everything else is re-verified unchanged: same-origin `/data/*.json` fetches (status-checked, no user input), OSM tile egress, `mailto:`.
- Design-level notes SEC-4-D1/D2/D3 below. **No Architect rework required; nothing routed back.**

**Regressions vs Cycle 3 baseline — none:**

- **SEC-3-01** (unclosed boot script): resolved in Cycle 3 fix pass and re-verified this cycle — 507/507 script balance across all 169 dist pages, 0 mismatches (row 8).
- **SEC-3-02** (id charset): resolved in Cycle 3 fix pass and re-verified — assertion present at `scripts/prerender.mjs:50` (row 15).
- **Boot-snippet twin:** `index.html` and `dist/index.html` snippets byte-identical (row 10, `true/true`).
- **Invariants:** 171 emitted files; ADR-0008 (no `package.json` change); ADR-0015 determinism (dist rebuilt during this pass, all gates in §5 pass).

## Design-level findings

Marked explicitly per pipeline contract (trust boundaries, authentication, data flow). None require Architect rework this cycle.

| id | severity | classification | statement |
|---|---|---|---|
| SEC-4-D1 | LOW — risk-accepted (new) | trust boundary / client data flow | The `hfuk-theme` `localStorage` key is the **only** Cycle-4 trust-boundary extension. It stores only the whitelisted tokens `light`/`dark` (absent = auto); every read path (`index.html:17-24` boot IIFE, `src/lib/theme.ts:29-31`) re-validates against the whitelist before any DOM write; writes occur only via the app's own `setStoredMode` (`theme.ts:35-44`). No cross-origin read of the key is possible (localStorage is same-origin; no `postMessage` in the app); no sensitive data; per-browser self-only scope. Documented accept: a malicious same-origin page cannot exist on this host (publisher-controlled static origin), and a user's own tab can only set values the app already whitelists. |
| SEC-4-D2 | MEDIUM — carried (SEC-F3) | build-time trust / data flow | Human-curation trust boundary: curated `public/data/practices.json` values flow unescaped into `href` (website/CQC URL), `mailto:` URI, and Leaflet popup HTML. All values are human-curated at build time and practice ids are charset-asserted in the chain (`prerender.mjs:50`); a malicious curated entry would require write access to the repo (push = publish, ADR-0014) — the same trust level as the publisher. Unchanged in Cycle 4; the curation flow is the designated control. |
| SEC-4-D3 | INFO — carried (SEC-F2) | static posture / CSP | No CSP header. The only inline executable shipped is the frozen theme-boot snippet (byte-identical `index.html` ↔ `dist/index.html`, re-verified this pass); all other JavaScript is same-origin `<script>` module files, and the fully static pipeline (ADR-0030) means a CSP would defend only against future regression. Carried as documented debt; Cycle 4 introduced no new inline code. |

## Carried-boundary status (Cycle 1–3 baseline)

| item | Cycle 3 state | Cycle 4 re-verification |
|---|---|---|
| SEC-F1 (ODbL/OSM attribution) | resolved in Cycle 3 | Intact — attribution present in map UI and data-pipeline docs; no attribution code touched by the Cycle 4 diff. |
| SEC-F2 (static posture, no CSP) | risk-accepted | **Strengthened** — ADR-0030's reproducible, secret-free publish chain removes any need for runtime secrets; recorded as SEC-4-D3. |
| SEC-F3 (human-curation trust) | risk-accepted, design-level | Unchanged — recorded as SEC-4-D2; charset assertion (`prerender.mjs:50`) re-verified. |
| SEC-3-01 (unclosed boot script) | resolved (fix pass) | Re-verified: 507/507 `<script`/`</script>` across all 169 dist pages (row 8). |
| SEC-3-02 (id charset) | resolved (fix pass) | Re-verified: assertion present at `scripts/prerender.mjs:50` (row 15). |
| SEC-3-03 (G7 raw-payload re-pin) | open, informational | Resolved 2026-10-30: Nominatim raw payload SHA-repinned in `scripts/g7-repin.mjs` (row 16). |
| Cycle 1–2 findings | closed | Interfaces unchanged; no re-review required beyond the rows above. |

## Open items (non-blocking, carried forward to Cycle 5)

1. **SEC-4-01** — add the OFL font licence/attribution (Licences page or docs) before the next push (push = publish, ADR-0014).
2. **SEC-4-03** — dark tileset debt (ADR-0027 §4.5); 1-line tile-URL change, no security impact.
3. **SEC-4-02** — gitignore/scrub the `.qwen/tmp/` and `.tmp/` scratch dirs at cleanup; confirmed not publishable.
4. G5/G6 perf and W8 checklist gates in `.agents/ops.md` — pipeline gates, not security; left to DevOps/lead.
5. SEC-4-D3 (CSP) — carried debt; revisit only if inline code is ever added.

## Threat model (STRIDE, Cycle-4 delta)

| threat | surface | assessment |
|---|---|---|
| Spoofing | `hfuk-theme` stored value | Mitigated — whitelist enforced on every read path (boot IIFE, `theme.ts:29-31`); a forged value can only select light/dark/auto for the user's own display. |
| Tampering | stored theme at rest | Self-only, non-sensitive; worst case is the user's own display preference being altered in their own browser profile. |
| Repudiation | n/a | No user data, no accounts, no logs, no server. |
| Information disclosure | none | No PII in the bundle; directory data is deliberately public. |
| Denial of service | static assets | Platform-hosted (Cloudflare Pages); unchanged vs prior cycles; no new attack surface. |
| Elevation of privilege | build / publish chain | **Strengthened** — ADR-0030: no stage needs a secret, network call, or runtime service; publish only from git commits via the git-connected pipeline; fresh-clone reproducibility (`npm ci` + `npm run build`) verified as the ADR's stated property. |

Outbound egress unchanged since Cycle 3: keyless OSM tiles at runtime, OSM geocoding at build time only (SHA-pinned inputs, ADR-0029), and user-initiated `mailto:` as the only outward user action. Cycle 4 introduces **no new external origin**.

## Verification log (read-only commands, executed this pass)

| # | command (abridged) | result |
|---|---|---|
| 1 | `git status --short` | 24 tracked modified + untracked set matches scope header; no stray files |
| 2 | `git diff --stat HEAD` | 24 files, +308/−301; no `package.json` — ADR-0008 upheld |
| 3 | `git grep -l "localStorage\|sessionStorage" src/` | only `src/lib/theme.ts` (+ `main.tsx` call) — no other persistence keys |
| 4 | `git grep -lE "AKIA|ghp_|xox[bspra]|BEGIN (RSA|OPENSSH|EC) PRIVATE|password\W*=" src/ scripts/` | 0 hits |
| 5 | `git grep -lE "innerWS?HTML\|document\.write\|eval\(\|new Function\|XMLHttpRequest\|WebSocket\|postMessage\|Worker\(" src/` | 0 relevant matches (row 5 area conclusion) |
| 6 | `git grep -lE "https?://\|data:" public/ scripts/` | only OSM tile/geocoding + `xmlns` + curated doc links |
| 7 | PowerShell `Select-String` credential patterns over `.qwen/tmp/` + `.tmp/` (untracked) | 18 hits, 0 credentials (SEC-4-02) |
| 8 | `node` script-tag balance over `dist/**/*.html` | 169 files, `<script` 507 / `</script>` 507, 0 mismatches |
| 9 | `node` inventory of `public/fonts/` | exactly 3×woff2, no `LICEN*` (SEC-4-01) |
| 10 | `node` boot-snippet extract-compare `index.html` vs `dist/index.html` | byte-identical (true/true) |
| 11 | `node` static-consistency re-check over emitted dist pages | pass — no post-load async data fetch |
| 12 | PowerShell `Get-ChildItem dist -Recurse` count | 171 files — ADR-0015/ADR-0030 hop-3 invariant |
| 13 | `git grep -n "hfuk-theme"` | only 3 source locations (`theme.ts` 1, `index.html` 1, `prerender.mjs` 2); dist carries it only via the emitted boot twin |
| 14 | `git grep -l "localStorage" dist/` | only `dist/index.html` (boot snippet) |
| 15 | `git grep -n "assert" scripts/prerender.mjs` | id-charset assertion at line 50 (SEC-3-02) |
| 16 | `git grep -n "computeSha256" scripts/` | G7 re-pin (2026-10-30) present in `g7-repin.mjs` — SEC-3-03 resolved |
| 17 | `node` snippet-extract twin compare, second sample | true/true — twin stable against rebuild |

Note: this Security pass spanned one context-resume break; every verification row above was re-executed in the current session, and the cited file/line anchors were re-read in-session before citation (RQ-1).

## Closure

**Cycle 4 security gate: PASS — 0 Blocking.** Risk-accepted carry-forward: SEC-4-01 (OFL attribution, Low). Informational: SEC-4-02, SEC-4-03. Design-level: SEC-4-D1 (new, Low), SEC-4-D2 (carried, Medium), SEC-4-D3 (carried, Info) — no Architect rework routed. All Cycle 3 blocking/fix-pass work re-verified intact. Cleared for Stage 8 (DevOps).

## Cycle 5 resolution (2026-11-07 — HUMAN DECISION, option C)

A fresh Cycle 5 security pass was **not executed** on this host: three
consecutive `security` subagent attempts died mechanically — context wall
(67,865 > 58,920 hard limit), stream stall, and a 3rd context-wall death
(task `b98b73eb65e3fca0`, 63,515 > 58,920,
COMPRESSION_FAILED_INFLATED_TOKEN_COUNT) — reaching the pre-committed
2-round fix-verify cap. James resolved with **option C (risk-accept)**:
this report's Cycle 4 verdict **carries forward as the Cycle 5 security
posture** (recorded by the lead; no new dispatch was authorized).

Justification, per the pipeline contract:
- **Cycle 5 is data-only** — no `src/` UI change. The delta is 2 data
  scripts (`scripts/extract-hospices-wales.mjs`,
  `scripts/extract-hospices-sc-oscar.mjs`) plus 3 bug fixes in
  `scripts/merge-hospices.mjs`. None touch the Cycle 4 trust surfaces
  (theme boot, layers, rendering sinks, static assets, prerender/dist,
  supply chain, data flow); the scripts run at build/data time, make no
  network calls, use no secrets/eval, and their outputs enter the app only
  through the already-reviewed same-origin `/data/*.json` boundary
  (SEC-4-D2/F3 — human-curation trust, ids charset-asserted in the chain).
- Carried forward unchanged: SEC-4-01 (OFL attribution, Low,
  risk-accepted), SEC-4-02/03 (informational), SEC-4-D1/D2/D3
  (design-level). Cycle 4's 0-Blocking posture stands for Cycle 5 as a
  **risk-accepted carry**, not a fresh pass.
- Residual risk (documented, non-blocking): the two new extractor scripts'
  data-time behaviour (parsing, field mapping) was not independently
  security-reviewed this cycle; they operate on build-time public JSON
  only, with outputs that are human-inspected curated data.

**Cycle 5 security gate: PASS (risk-accepted carry of Cycle 4) — 0
Blocking.** Cleared for Stage 8 (DevOps).

## Cycle 5 — Landing (2026-11-08)

- **Pass type:** FRESH pass on the Cycle 5 landed state (working tree at `e1fbc1b` plus the Cycle 5 working-tree files).
- **Evidence (exactly 4 files read):** `scripts/extract-hospices-sc-pcs.mjs`, `scripts/extract-hospices-sc-oscar.mjs`, `scripts/merge-hospices.mjs`, `package.json`.

**Trust boundary (ADR-0030):** pinned offline source under `data-raw/` → parsed JSON → prerendered static HTML. The delta adds two pinned input files (`palliativecare-scotland-hospices-2026-11.html`, Wayback pin 20260514160126; `oscar-scotland-hospices-2026-11.csv`) and two append-only extractors. **No new runtime egress, no new trust boundary**: both extractors import only `node:fs`; all I/O is local `data-raw/` files. Untrusted web content crosses the boundary exactly once, at the human-fetch gate (H5-2), exactly as designed; downstream everything is local-file → JSON → static HTML.

### Checklist

1. **PASS** — No runtime network/fetch/http in either extractor: sole import is `node:fs`; no `fetch`/`http`/`https`/`net` anywhere in the two files. The only URL in the extractors is the palliativecarescotland.org.uk source URL inside the PCS header comment (provenance, never fetched in-script).
2. **PASS** — PCS entity decoding (local fn `decode` in `extract-hospices-sc-pcs.mjs`) handles `&amp; &lt; &gt; &#039; &quot;` with the `&amp;` pass first (correct ordering, no double-decode), and a raw `<` in anchor text is structurally excluded by the `[^<]+?` capture. A `<script>` payload in the source arrives as `&lt;script…&gt;`, decodes to literal `<script>` TEXT inside a JSON string value, and is inert. Exact residual bound: `JSON.stringify` (prerender JSON-LD, `prerender.mjs` `jsonld`/`buildPage`) does not escape `</script>`, so a name containing `&lt;/script&gt;` would decode to `</script>` and terminate the JSON-LD `<script>` tag in a prerendered page. That primitive (a) does not occur in any landed input this cycle (verified by full read of the pinned CSV — 30 rows — and pinned HTML — 19 matched entries); (b) is absent from every other prerender name sink (`<title>`/meta/OG via `esc()`, which escapes `<`/`>`); (c) is escaped by React in client-rendered text and attributes; and (d) could only reach the repo via a repo write — the same publisher-trusted curation boundary as SEC-4-D2 (Medium, carried), not a new trust boundary and no new Blocking finding. Future-cycle hardening option: escape `<` as `\u003c` in the JSON-LD stringifier. (Info: double-encoded `&amp;lt;` decodes to literal `<` — cosmetic; `&apos;`/`&#39;` variants are not decoded — cosmetic.)
3. **PASS** — Id schemes cannot collide: `sc-pcs-<NN>` (NN = numeric NHS-board id, e.g. `sc-pcs-30`, `sc-pcs-58`) is prefix-disjoint from `en-<cqcId>` (CQC `1-<digits>` ids), `sc-CS<digits>` (GIS), `sc-oscar-<SC6>`/`sc-oscar-r<n>` (OSCAR), `wales-*`, `ni-*`. Dedupe: the PCS extractor skips rows by casefolded name, by id, and by the 13-entry ADR-0032 equivalence MAP (ids 19, 44, 45, 50, 51, 57, 61, 63, 67, 68, 70, 75, 76 → existing `sc-oscar-*` rows); the 4 strict-name covers (ids 5, 43, 52, 72) leave exactly the expected 2 appends, and the script hard-fails (EXIT 1, no write) on any other count. The OSCAR extractor skips ids already in the register; the merge's global unique-id assertion (exit 1) is the backstop.
4. **PASS** — `merge-hospices.mjs` routes `sc-pcs-*` → `SOURCES.scPcs` (PalliativeCareScotland source string); `sc-oscar-*` → `SOURCES.scOscar` and the GIS fallback `SOURCES.sc` are preserved (three-arm ternary on sc rows). England curated CATCHMENTS seeding keys only on `en-<cqcId>` derived from `location/1-<digits>` in `cqcUrl`, and a curated row can displace only the register row with that same `en-` id — no sc/wales id can be keyed or replaced.
5. **PASS** — `package.json` unchanged this cycle (`git status` and `git diff -- HEAD` for the file both empty); no new dependencies.
6. **PASS** — No secrets/tokens/credential-bearing paths in the new code: scripts reference only relative `data-raw/` paths; no `process.env` reads, no absolute user paths, no tokens; the two URL strings are public provenance URLs.

### Id-collision / dedupe analysis

- `sc-pcs-30` and `sc-pcs-58` (the only two appends this cycle) intersect no existing namespace; `sc-pcs-` is character-distinct from `sc-CS` (lowercase `p` vs `C` at position 4) and from `sc-oscar-` (`p` vs `o`).
- Dedupe is triple-layered in the PCS extractor (name / id / 13-entry MAP) plus the delta guard (exactly 2 appends, else EXIT 1 before any write) plus the in-script pre-image verify (all pre-existing rows must be JSON-equal in place after the write, else EXIT 1). Append-only behaviour is machine-verified, not merely documented; the merge re-asserts global id uniqueness as the final gate.

### Carried Cycle 4 risk-accepts (still relevant)

- **SEC-4-01** (LOW) — missing OFL font attribution: Cycle 5 delta touches neither `public/fonts/` nor `src/styles.css`; carried forward.
- **SEC-4-02** (INFO) — scratch hygiene: a new untracked scratch script `scripts/_tmp-hash.mjs` sits in the Cycle 5 working tree (content outside this pass's 4-file evidence scope); consistent with the existing pattern — keep untracked, gitignore/clean before publish. Carried forward.
- **SEC-4-03** (INFO) — dark OSM tileset debt; untouched by this cycle. Carried forward.

**Security verdict: 0 Blocking, 3 Risk-accepted** (all 3 are carried Cycle 4 items: SEC-4-01 Low, SEC-4-02 Info, SEC-4-03 Info; no new findings)

## Cycle 5 — Landing (2026-11-08)

Date: 2026-11-08. FRESH security pass on the landed Cycle 5 state (Scotland H5-2 PCS append + Wales H5-1 zero-set; HEAD `e1fbc1b`). Data-only cycle — no `src/` changes. Static, no-backend site (ADR-0030). Trust boundary unchanged: pinned offline source files under `data-raw/` → parsed JSON → prerendered static HTML. Read-only pass; every fact re-verified on disk in this pass (helper scans in `.tmp/` only).

## VERDICT: **PASS** — 0 Blocking findings

## Findings

| ID | Severity | Description | Evidence |
|----|----------|-------------|----------|
| SEC5-L1 | Informational | New extractor code (Cycle 5) introduces zero runtime network. | Token scan of `scripts/extract-hospices-sc-pcs.mjs` and `scripts/extract-hospices-sc-oscar.mjs` for `fetch(`, `http://`, `https://`, `XMLHttpRequest`, `axios`: OSCAR produces no hits at any position; PCS's sole hit is the line-8 doc-comment URL of its source page. Both scripts import only `node:fs`. |
| SEC5-L2 | Informational | PCS extractor entity handling neutralises markup in the pinned raw file. | Decodes `&amp;`, `&lt;`, `&gt;`, `&#039;`, `&quot;` (with the `&amp;` pass ordered first); any `<script` occurrence in the source page becomes inert decoded text inside the pinned JSON; no eval/Function at runtime. |
| SEC5-L3 | Informational | ID schemes are prefix-disjoint and append logic is delta-guarded. | `sc-pcs-<NN>` / `sc-oscar-<SC|rN>` / `sc-CS*` / `en-1-<digits>` / `wales-*` / `ni-*` never collide. PCS dedupe is triple-layered (name, id, 13-entry equivalence MAP) and the extractor enforces exactly-2-valid-appends, exit 1 before any write, plus a pre-image JSON-equality verify; merge-hospices' global unique-id assertion (192/192) is the backstop. |
| SEC5-L4 | Informational | England CATCHMENTS seed cannot be keyed or replaced by another nation's id. | `scripts/merge-hospices.mjs` routes `sc-pcs-*` and `sc-oscar-*` rows to their source strings; seed keys are derived only from `en-<cqcId>` parsed from `location/1-<digits>` in `cqcUrl` under an explicit `en-` prefix guard. |
| SEC5-L5 | Informational | No dependency drift this cycle. | `package.json` carries zero diff this cycle (absent from `git status`); parses OK. |

### Carried items (no new action this pass)

- SEC-4-01 (OFL font attribution): resolved in Cycle 4 Docs/Licences page — stays closed.
- SEC-4-02 (scratch hygiene): `scripts/_tmp-hash.mjs` remains an untracked scratch helper — keep untracked, delete before any commit/publish (lead housekeeping); the `.tmp/` lead-scratch convention (FQ4-3) is cleaned at cycle end.

Design-level note: no new trust boundaries, authentication, or data-flow changes were introduced — the cycle is strictly extract-merge-build over pinned local files, so no Architect rework is routed.

**Security verdict: 0 Blocking, 0 Risk-accepted (new). Stage 7 CLOSED for the 2026-11-08 landing pass (rework rounds consumed: 0).**
