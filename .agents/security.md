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

## Cycle 6 — FULL AUDIT (2026-11-10)

- **Stage**: 7 of 10 (Security engineer)
- **Date**: 2026-11-10
- **Cycle**: 6 — NI catchment clipped into the NI admin ring, SC jitter, per-kind tessellation / children's mode, postcode normaliser, and a new SHA-pinned OSM ring input.
- **Pass type**: **FULL AUDIT** — no unresolved Blocking findings in the prior report (Cycle 5 landing pass closed 2026-11-08 with 0 Blocking).
- **Scope**: working tree at HEAD `f141a71` + Cycle 6 delta (21 tracked modified, 5 new untracked): `scripts/build-data.mjs`, `scripts/validate-tessellation.mjs`, `scripts/merge-hospices.mjs`, `data-raw/roi-border.json` (new, 878,999 B), `data/README.md`, `docs/adr/0034-…` (new, with Amendment 2), `docs/adr/0035-…` (new), `src/lib/postcodes.ts` (new), `tests/` (new), `package.json`, `src/App.tsx`, `src/components/StartHere.tsx`, `src/lib/types.ts`, `data-raw/hospices-all.json`, `public/data/*.json` (rebuilt). Out of scope: Azure static / Front Door bicep + servers, `website/` copy edits (non-code documentation), `.agents/` pipeline ledgers.
- **Method**: read-only RQ-1 disk verification; full reads of both changed scripts; head / size / JSON-parse / secret grep on the new ring file; `npm audit` (prod + dev); dependency diff; grep-based SAST (semgrep unavailable on this host); SHA-256 recompute; `.gitignore` check.
- **Trust model**: ADR-0030 chain unchanged: pinned offline `data-raw/` → deterministic Node build → `public/data/*.json` → prerendered static HTML; no secrets, no network at publish time; runtime egress = keyless OSM tiles; sole user egress action = `mailto:`. **Delta**: one new pinned raw input (`roi-border.json`, ODbL) and one new pure client function (`normalisePostcode`) — neither extends trust-boundary components.

### Verdict

**PASS — 0 Blocking.** 1 new risk-accepted (SEC6-01, MEDIUM — dev-only vulnerable dependencies; no runtime/network vector), 3 Info (SEC6-02/03/04), 0 new design-level. **SEC-4-01 CLOSED** — OFL attribution for all three fonts verified on disk at `src/pages/LegalPage.tsx:79-93` in this pass (note: the `src/vite/LICENSE.txt` location cited in the Cycle 5 report's resolution text does not exist — the cited location was stale; the real attribution is in LegalPage). SEC-4-02/03, SEC-4-D1/D2/D3, SEC5-L1..L5 carried as noted below.

### Findings

| ID | Severity | Area | Description |
|---|---|---|---|
| SEC6-01 | MEDIUM — RISK-ACCEPTED | supply chain | `npm audit` (dev tree): `xlsx@0.18.5` HIGH (GHSA-4r6h-8v6p-xvw6 prototype pollution; GHSA-5pgg-2g8v-p4x9 ReDoS; no upstream fix) + `esbuild<=0.24.2` MEDIUM (via `vite`). Both are **dev-only** — `npm audit --omit=dev` → 0 vulnerabilities. Build tooling runs offline on the trusted operator machine; ADR-0030's fresh-clone reproducibility bounds the blast radius (exploitation requires prior compromise of that machine); no shipped runtime dependency is affected. Carried as accepted debt; next cycle that permits dependency changes (ADR-0008): remove/downgrade `xlsx`, upgrade `vite` past 0.24.2. |
| SEC6-02 | INFO | documentation alignment | The provider brief for C6-1 referenced a "relaxed bbox guard (lonMax < -5.0, latMin > 53.8)" and an "upper-left-anchor touch test"; neither exists in the code (grep across `scripts/` → 0 hits). What is implemented, per ADR-0034 Amendment 2, is (a) the ring fail-fast in both scripts (`build-data.mjs:116-126`, `validate-tessellation.mjs:41-54`) and (b) Ireland-polygon identification via the Dublin interior point `pointInRing(-6.26,53.35,ring)` (`validate-tessellation.mjs:57-78`). The safety property is preserved (mismatched / wrong ring → build and validator exit 1). Lead to align brief wording with the implementation; no code change required. |
| SEC6-03 | INFO | geometry (ADR-0034 Amendment 2) | Option A residual: `en` 3.5658 deg² / `wales` 0.3100 deg² of NI–ROI sea-border spill past the straight-line geometric boundary, part of which is Belfast Lough ROI-side. Documented and accepted in the ADR; geometry-only, no code surface; QA6 PASS. Carried as accepted risk. |
| SEC6-04 | INFO | repo hygiene (SEC-4-02 successor) | `C62_STAGE` debug output to `.qwen/tmp/c62-stages.json` (`build-data.mjs:846,866,972`) — env-gated (off by default), `.qwen/` gitignored (`.gitignore:9`), absent from `git status` → untracked, not publishable. SEC-4-02's condition (untracked scratch ≠ deploy target) carried. |

### Per-area conclusions (7 areas)

1. **C6-1 NI clip + ring input (ADR-0034)** — ring load `build-data.mjs:116-126` (`roi=JSON.parse(readFileSync(...))`; `!Array.isArray(roi.ring)||roi.ring.length<3 → process.exit(1)`; `catch → console.error + exit 1`; logs relationId/name/node count/fetchDate on load); mirrored fail-fast `validate-tessellation.mjs:41-54`; clip `build-data.mjs:860-861` `if (id.startsWith('ni') && clipped.length) clipped = intersection(clipped, roiRingPoly)` (NI cells only, keep-inside); validator invariant 2 `ukLandInBox = difference(landInBox, roiInBox)` with `roiInBox = intersection(difference([ireland], roiPoly), boxPoly)` (`validate-tessellation.mjs:124-125`) — Ireland identified by the Dublin point, so the UK-land target excludes ROI land; invariant-5 `spill = area(difference(cell, roiPoly)); spill >= 1e-9 → exit(1)` (`:191-200`) — the `difference` direction is Amendment 2's fix and is correct (measures NI-cell area outside the ring; `difference(cell⊆ring, ring) = ∅` by construction). `data-raw/roi-border.json`: valid JSON (ring 18423 pts = 18422 nodes + closure), SHA-256 `b3431350…f98c6` == `data/README.md:44` pin (recomputed), size 878,999 B == pin, header fields consistent (OSM relation 156393, adminLevel 4, 929/929 ways, 0 vanished, ODbL v1.0, fetchDate 2026-11-10), secret-pattern grep → 0 hits. **Clean.**
2. **C6-2 SC jitter (ADR-0034)** — bounded constant nudges (co-located SC seeds +1e-4 deg, all others +1e-5 deg; `build-data.mjs` header L8); no host/URL/identity-derived inputs; validator invariant 6 enforces `SC×SC overlap < 1e-6`; QA6 PASS (geometry-only delta). **Clean.**
3. **C6-3 postcode normaliser** — `src/lib/postcodes.ts` is pure regex (strip non-alphanumerics, uppercase): no sinks, no storage, no network. `tests/postcodes.test.mjs` (node:test) reads committed `public/data/practices.json`; no network. New `npm test` script is dev-time only (SEC6-01 context). **Clean.**
4. **C6-4 per-kind children's mode (ADR-0035)** — `src/App.tsx` (+72): local `childrenMode` state, `useMemo` filter over same-origin data, `#childrenToggle`; no `innerHTML`, no new external URLs, no new storage keys (grep `localStorage|sessionStorage` in `src/` → `theme.ts` only, unchanged). `merge-hospices.mjs` (+33): static `CHILDREN_IDS` set of 20 IDs, CHAS umbrella excluded, `children` flag stamped, count-mismatch → exit 1 (build-time data hygiene, no network). `src/lib/types.ts` +2 (type-only). **Clean.**
5. **Provenance / attribution** — `data/README.md:44` has the complete provenance row for `roi-border.json` (SHA-256, size, 929 ways, 18422 nodes, areaDeg2, bbox, ODbL v1.0 + OSM attribution, fetch date, explicit "NI ≠ ROI" disambiguation, fail-fast note). The app-side ODbL attribution (LegalPage / siteConfig / MapView) covers the new file generically. ADR-0034 records the Option A decision + residual spill (SEC6-03). **Clean.**
6. **Dependencies / supply chain** — `package.json` diff = the `"test": "node --test"` script addition only; no dependency version changes (ADR-0008 upheld); `package-lock.json` present (67,443 B), unmodified this cycle. `npm audit --omit=dev` → 0; full audit → SEC6-01 (dev-only). Audited scripts import only `node:fs`, `polygon-clipping`, `./land-mask.mjs`; grep `fetch(|http|net|dgram` across `scripts/{build-data,validate-tessellation,land-mask}.mjs` → 0 hits. **Clean except SEC6-01.**
7. **Sinks / rendering / data flow (SAST)** — semgrep unavailable → grep sweep `eval|new Function|innerWS?HTML|document.write|WebSocket|prompt(|child_process|execSync|spawnSync|localStorage|sessionStorage` across `scripts/ src/ tests/`: only pre-existing hits — `scripts/add-correction.mjs` (execFileSync of the local validator; pre-existing operator CLI, unchanged this cycle), `src/lib/theme.ts` (SEC-4-D1), `scripts/prerender.mjs` (frozen boot snippet, SEC-4-D3). **0 new sinks across the 21 changed files.** `src/lib/feedback.ts` re-verified: mailto subject + body `encodeURIComponent`-ed, static operator email from `siteConfig`. **Clean.**

### Design-level findings

None new in Cycle 6. The new ring input lands inside the existing `data-raw/` trust set defined by ADR-0029/0030 (SHA-pinned, ODbL-attributed, fail-fast load) and `normalisePostcode` is a pure function with no storage/egress; neither extends a trust-boundary component. Carried and re-verified: SEC-4-D1 (localStorage theme, LOW), SEC-4-D2 (curation trust, MEDIUM), SEC-4-D3 (no CSP, INFO). No rework loop routed back to the Architect.

### Carried-boundary status

| Item | Prior | Cycle 6 re-check |
|---|---|---|
| SEC-4-01 (OFL font attribution) | risk-accepted LOW | **CLOSED** — OFL 1.1 + copyright attribution for all three fonts on disk at `src/pages/LegalPage.tsx:79-93` (read this pass). |
| SEC-4-02 (scratch hygiene) | INFO | Successor SEC6-04: `.qwen/` gitignored (`.gitignore:9`); C62 debug env-gated, untracked, not publishable. |
| SEC-4-03 (dark tiles) | INFO | Unchanged (out of delta scope). |
| SEC-4-D1 (localStorage theme) | LOW design | Unchanged (grep re-verified: `theme.ts` + boot twin only). |
| SEC-4-D2 (curation trust) | MEDIUM design | Unchanged; chain endpoints (charset assertions, ODbL pins) re-verified. |
| SEC-4-D3 (no CSP) | INFO design | Unchanged; no new inline executables in the Cycle 6 delta. |
| SEC5-L1..L5 (Cycle 5 landing Info) | Info | Carried unchanged; no new input paths beyond the pinned `data-raw/` set. |

### Threat model (STRIDE — Cycle 6 delta)

| Threat | Surface | Assessment |
|---|---|---|
| Spoofing | `roi-border.json` ring shape | Mitigated — SHA-256 pin (`data/README.md:44`, recomputed), fail-fast load in both scripts, Dublin interior-point shape check (`validate-tessellation.mjs:57-78`); a tampered / mismatched ring fails build and validator (SEC6-02). |
| Tampering | pinned raw inputs | Same publisher-trusted boundary as every other `data-raw/` pin (ADR-0029/0030): repo write = publish = human approval. |
| Repudiation | n/a | No user data, no accounts, no logs, no server. |
| Information disclosure | ring file | Public OSM administrative boundary (ODbL-distributed); no PII. |
| Denial of service | static assets | Platform-hosted; the +879 KB pinned input is consumed at build time only, not shipped to runtime. |
| Elevation of privilege | build / publish chain | Unchanged — ADR-0030 chain is secret-free and network-free; the `npm test` script adds no privilege. |

Outbound egress unchanged since Cycle 3: runtime keyless OSM tiles, build-time pinned inputs only, `mailto:` as the sole user-action egress. Cycle 6 introduces **no new external origin**.

### Verification log (read-only commands, run this pass)

| # | Command (abridged) | Result |
|---|---|---|
| 1 | `git status --short && git log --oneline -1` | HEAD `f141a71`; 21 tracked modified + 5 untracked (roi-border.json, ADR-0034, ADR-0035, postcodes.ts, tests/); `package-lock.json` present, unmodified |
| 2 | `git diff package.json` | `"test": "node --test"` script addition only; zero dependency changes |
| 3 | `npm audit --omit=dev` | 0 vulnerabilities |
| 4 | `npm audit` (full) | 3 — xlsx HIGH (2 advisories) + esbuild MEDIUM, all dev-only (SEC6-01) |
| 5 | SHA-256 of `data-raw/roi-border.json` | `b3431350…f98c6` == `data/README.md:44` pin; size 878,999 B == pin |
| 6 | `node -e JSON.parse` on ring file | valid JSON; ring 18423 pts; bbox `[-8.1775099,53.8701701,-5.0777816,55.4435849]` |
| 7 | secret-pattern grep (AKIA/ghp_/xox/begin private/password) on `data-raw/roi-border.json` | 0 hits |
| 8 | grep `fetch(|http|net|dgram` in the three build scripts | 0 hits — no runtime network |
| 9 | sink grep across `scripts/ src/ tests/` (eval/Function/innerHTML/document.write/WebSocket/prompt/child_process/exec/spawn) | only pre-existing hits (add-correction.mjs, theme.ts, prerender.mjs); 0 new |
| 10 | grep `C62_DEBUG\|C62_STAGE` in `scripts/build-data.mjs` | `C62_STAGE` only, L846/866/972 → `.qwen/tmp/c62-stages.json` (SEC6-04) |
| 11 | `findstr "qwen" .gitignore` | L9 `.qwen/` — debug output untracked |
| 12 | read `src/pages/LegalPage.tsx:79-93` | OFL 1.1 + all three font attributions present → SEC-4-01 closed |
| 13 | full read of ADR-0034 (incl. Amendment + Amendment 2); ADR-0035 L1-50 | invariant / difference-direction wording consistent with the code |

Items 1–13 re-verified in the current session after the context-resume break, per RQ-1.

### Closure

**Cycle 6 security gate: PASS — 0 Blocking, 1 Risk-accepted (SEC6-01, dev-only dependencies), 3 Info (SEC6-02/03/04), 0 new design-level. SEC-4-01 CLOSED.** Stage 7 CLOSED for the Cycle 6 landing pass (rework rounds consumed: 0). Cleared for Stage 8 (DevOps). Lead-decision items: (1) approve SEC6-01 carry-forward with a dependency-cleanup target in a future cycle; (2) align the C6-1 brief wording with the implemented guards (SEC6-02).

## Cycle 10 — FULL AUDIT (2026-11-17)

- **Stage**: 7 of 10 (Security engineer)
- **Date**: 2026-11-17
- **Cycle**: 10 — shop crawl: 190-row discovery pool (132 CQC-profile-only + 58 no-website; DDG `html.duckduckgo.com` HTML endpoint) + 18-row confirm-only pass; plain fetch → headless Playwright escalation (ADR-0044); PDF text via pdfjs; committed crawl log as record + state (ADR-0045); shop identity pass-through into `data-raw/shops-website.json` (ADR-0043). The crawl ran at the stage-5 gate on 2026-11-17 and ended at a clean seam (see Seam state).
- **Pass type**: **FULL AUDIT** — no unresolved Blocking findings at this path (Cycle 6 closed 2026-11-10 with 0 Blocking; no Cycle 7–9 security sections are recorded at this path).
- **Scope**: worktree at HEAD `a761871` (stage-5 gate): `scripts/crawl-hospice-shops.mjs` (993 L, new — full read), `scripts/shop-identity.mjs` (new), `data-raw/shop-crawl-log.json` (new), `data-raw/shops-website.json` (+2), `public/data/shops.json`, `tests/crawl-log.test.mjs` (new), `docs/adr/0043–0045`, `package.json` (devDependencies +2), `docs/website/shop-visit-us.md`. Out of scope: build chain (re-verified network-free), frontend `src/` (zero code delta — check-3 entries land as data only).
- **Method**: full read of the script (all 993 lines, this session + pre-compaction session; every claim re-verified against code, not ledger prose); full-data verification of the committed log, `shops-website.json`, and both built `shops.json` outputs; test-suite read; hazard grep; `git log`; ADR reads. **No network activity by this stage; no in-script browser launches.**
- **Trust model delta**: ADR-0030's shipped chain (pinned raw → deterministic offline build → static site; no secrets; runtime egress = keyless OSM tiles) is **unchanged**. The new surface is a **developer-time, operator-run crawl on the trusted build machine** (not part of the shipped runtime): outbound empty-body GETs to hospice domains curated from `hospices-all.json` + one DDG endpoint + page-initiated requests; inbound **hostile web content** — markup, and in headless escalation, page JavaScript executing in local Chromium. No shipped-runtime component, no frontend code, no authentication, no credentials or environment values anywhere in the path.

### Verdict

**PASS — 0 Blocking.** 12 new findings SEC10-01…SEC10-12, **all risk-accepted**; six are explicitly **design-level** in character (SEC10-01/02/03/05/07/12) — none is design-level *Blocking*, so **no rework loop is routed back to the Architect**; they record the standing trust posture of the crawl subsystem. Carried: SEC6-01 (extended to the two new dev-only dependencies). The 4 unwritten log rows are apex-verified persistent failures — the seam state the design anticipates, not a defect.

### Findings

| ID | Severity | Area | Description | Evidence |
|----|----------|------|-------------|----------|
| SEC10-01 | LOW — RISK-ACCEPTED (**design-level**) | trust boundary | **Redirect-steered egress.** `fetchText`/`fetchBinary` use `redirect: 'follow'`, so any target can steer the script onto an arbitrary host; a redirected WAF challenge page's 403 also escalates to headless, whose `goto` follows its own redirects. The redirected-to host is not recorded in the log. | `:132–156`, `:159–189`; 403→headless `:658–659`/`:280`. Accepted: operator-run, empty-body GET only, UA the sole identifier, no payload/credentials. Hardening option for a future cycle: `redirect: 'error'` + bounded same-origin 30x follow (cf. ABCs/UBA-WordPress precedent, SEC-4). |
| SEC10-02 | LOW — RISK-ACCEPTED (**design-level**) | trust boundary | **Cross-site shop links are fetched and can commit entries.** `findShopLink`/`findShopLinksOnPage` resolve relative hrefs against the page URL and fetch with no same-origin constraint; any link target whose markup yields a structurally valid entry (≥3 comma parts + valid UK postcode) is fetched and can be committed. | `:537–571`, `:826–846`, commit path `:913–919`. Accepted: `source` records the originating page (`:565–571`), entries are deduped vs baseline (`:699`) and land in the audited log + `data-raw` with publication gated by the build chain the operator approves (D7). Both committed rows (`davecottage.org`, `foylehospice.com`) were same-site. |
| SEC10-03 | LOW — RISK-ACCEPTED (**design-level**) | trust boundary | **Search index as discovery source.** `discoverRow` trusts `uddg` URLs from the DDG html endpoint; a poisoned index (or `decodeURIComponent` misparse) injects arbitrary URLs into the pool. | `:507–535`. Mitigations: one paced root probe per candidate + `resolveSiteUrl` gates (reject list, CQC/Wikipedia/blocklist, first-SLD name-token test `:476–505`, `:528`), umbrella/parent claim demotes to `no-website` with a human-audit note (`:851–885`), and every extraction inherits the bounded hostile-content model (SEC10-02/05) plus the log's audit trail. Accepted: target set is a small known universe; DDG is the documented source (D7). |
| SEC10-04 | INFO — verified, no residual | trust boundary | **Robots gate is fail-closed, incl. on malice.** 404/3xx(404-equiv)/network-OK → allow only on explicit UA match; non-2xx ≥500 or transport failure → `{unwritten}` (never allowed, never blocked); no UA match → `skipped-robots`; **unknown rule syntax → `skipped-robots` (fail-closed, not fail-open)**; robots fetch itself uses `redirect: 'error'` (no steering on the gate). | `:200–264` (`parseRobots :200–229`, `checkRobots :231–264`); `redirect:'error'` `:207`. Absent-malformed → allow is the goal spec's default-allow, applied only when no robots file content is served at all — consistent with spec. |
| SEC10-05 | LOW — RISK-ACCEPTED (**design-level**) | integrity | **Hostile-markup injection depth (bounded, field-level).** `extractShopEntries` strips tags, decodes only `&amp;`, requires ≥3 comma parts + valid UK postcode; name = part 1, address = rest, postcode normalised; entries are JSON-escaped text — no HTML re-parse, no eval/Function/sink in the script. A hostile page can inject *structured text* (garbage names/addresses), not code. Residual: page prose survives into the address field (observed, shop-139 address ends "… Pin badges are sold here only. Get directions") — carry-fwd data-quality note for QA/Docs, not a security defect. | `:551–577`; hazard grep over all 993 lines: 0 `eval(`/`new Function`/`innerHTML`/`document.write`/`child_process`/`process.env`/`Worker`. Entry-level bounds: baseline dedupe + `source` provenance + build-chain geocode sanity before publication. |
| SEC10-06 | INFO — verified, no residual | integrity | **F-1 log-as-state contract holds (no fabricated terminal rows).** Every transient (429/202/≥500/timeout/abort/drop) yields `{unwritten}` at every boundary: robots `:222–226`/`:238–241`, plain root `:664–676`, headless `:713–723`, listing fetch `:693–702`, confirm probe `:751–761`/`:792–800`. `blocked` only after plain AND headless both fail (`:715–722`, incl. `unavailable`+transient→unwritten and `unavailable`+non-transient→blocked); a 404 short-circuits to terminal `not-found` before escalation (`:655–657`) — absence is not transient. Log rewritten after each site (`:919`, `:924`) — crash leaves the last-true state. Cosmetic (no classification impact): note text hardcodes `plain fetch failed` in the JS-shell+headless-unavailable branch (`:716–717`) where the plain fetch actually succeeded. |
| SEC10-07 | LOW — RISK-ACCEPTED (**design-level**) | trust boundary | **Hostile pages execute JavaScript in local Chromium.** `headlessRender` runs page-initiated JS during the ~23.5 s window (domcontentloaded + h1 3 s + 500 ms settle); page-initiated requests are unpaced and unrestricted. | `:277–315`. Mitigations verified: fresh `browser.newContext({userAgent: UA})` per site (ADR-0044) closed in `finally` — per-site isolation, no cookie/storage carry-over between sites; **no secrets, no env values, no init-script payloads enter the context** (grep `process.env` → 0; no `addInitScript`); browser is dev-machine-only (SEC6-01 context). Accepted: posture = "a browsable GET from this machine"; see SEC10-12 for the consolidated egress record. |
| SEC10-08 | INFO — verified, no residual | integrity | **`data-raw/shops-website.json` is append-only and the 2 new entries are exact.** `appendShopEntries` splices at `raw.lastIndexOf(']')` → `prefix + ',\n\n' + blocks + '\n]\n'`. Verified on disk: 140 entries; 138-entry prefix byte-identical to the stage-5-gate baseline; exactly 2 new rows (`shop-138` davecottage.org, `shop-139` foylehospice.com) schema-matched (`id/name/address/postcode/hospiceId/source`) and matching the log's two committed rows (`shopsExtracted:1/committed:true`). Only writes in the script: the log (`saveLog`, `:229`) and this file (`:917`). |
| SEC10-09 | INFO (extends SEC6-01) | supply chain | **Dev-only dependencies +2; no in-script binary download; runtime tree untouched.** Runtime deps unchanged (`bootstrap/leaflet/react/react-dom/react-leaflet`); new `playwright ^1.65.1`, `pdfjs-dist ^6.5.438` (both devDependencies; installs verified on the operator machine). `getBrowser` prints a one-time `npx playwright install chromium` command once and latches `headlessUnavailable:true` when the launch fails — no in-script download; with the latch set the script degrades to plain-fetch-only and all escalations become `blocked`/`unreadable` per F-1. **Advisory status of the two new dev deps not re-checked this cycle** (offline; no feed) — folded into SEC6-01's dev-only accepted debt; a future dependency-hygiene cycle should `npm audit` them. Unchanged-since-Cycle-6: `xlsx` HIGH + `esbuild` MEDIUM (dev-only) remain open. |
| SEC10-10 | INFO | integrity | **pdfjs input model acceptable.** `pdfToText` feeds arbitrary server bytes to pdfjs's legacy build (`getDocument({data})`), string-level text extraction only, no worker, no DOM; the `zlib.inflateSync` fallback verifies `v < 128 && v > 31` (range check) before concatenation. | `:317–345`. Residual = upstream-library exposure to hostile PDF structures (font-format code paths etc.), bounded by the dev-only, operator-run context — same envelope as SEC6-01/SEC10-09. No script-side sink. |
| SEC10-11 | INFO — verified, no residual | trust boundary | **Pacing / identifier surface matches the house pattern.** Single ident `HospiceInfoproto/0.1 (hospice shop list research; contact: james)` (`UA`, `:46`) on every scripted request (root probe, DDG, robots, shop pages); `PACE_MS 1100` (`:47`) enforced before every scripted fetch (`:416`, `:223`, `:230`, `:419`) — the 1 robots fetch + 1 root probe per site is the goal-specified tradeoff, accepted (robots failures are the majority of the pool: 105 rows). 20 s `AbortController` timeout on every fetch (`:146`). |
| SEC10-12 | LOW — RISK-ACCEPTED (**design-level**, consolidated) | trust boundary | **Complete egress inventory (the crawl subsystem's design-level record).** Egress = empty-body GETs only (no POST/PUT/query payload; no forms submitted); hosts = the DDG html endpoint, pool site roots, shop pages listed by those sites, and page-initiated requests in headless mode (SEC10-07); every scripted request identifies only the single UA string (SEC10-11). **No data, credentials, or environment values leave the machine in any path.** All writes are repo-local (`data-raw/`); all reads are operator-supplied local files. |

### Per-area conclusions (4 focus areas)

1. **Network trust boundary** — the robots gate is fail-closed (SEC10-04); pacing + single UA verified on all scripted requests (SEC10-11); per-site `browser.newContext` isolation and `finally`-close are real (ADR-0044, SEC10-07); WAF 403 → headless → `blocked` verified end-to-end, and `blocked` is only reachable after plain AND headless have both failed (SEC10-06); two 403-verified WAF sites behaved on the plain root path. The open edges are the three design-level egress-shaping behaviours: redirect-following (SEC10-01), cross-site shop links (SEC10-02), search-index-supplied discovery (SEC10-03) — none exploitable without the operator running the crawl, and all bounded by SEC10-12's posture.
2. **Integrity** — the F-1 contract is complete: no code path can fabricate a terminal row from a transient (SEC10-06); the append-only shops file with the byte-identical 138 baseline is verified on disk (SEC10-08); hostile-markup injection is bounded to structured text with provenance and downstream gates (SEC10-05); `resolveShopId` (`scripts/shop-identity.mjs:10–15`) re-verified per ADR-0043 — legacy map → canonical set → `null` (build hard-fail by the caller), **no blind `??`**.
3. **Supply chain & local exposure** — runtime deps untouched; playwright + pdfjs-dist dev-only (SEC10-09); never-download-a-binary upheld (SEC10-09); repo-local writes only, verified by grep (SEC10-08); zero `eval`/`Function`/`innerHTML`/`process.env`/`child_process`/`Worker` across all 993 lines (SEC10-05).
4. **Design-level items** — six, explicitly flagged: SEC10-01/02/03/05/07/12 (see below).

### Design-level findings (per contract — trust boundaries / data flow)

| ID | Design concern | Standing |
|----|----------------|----------|
| SEC10-01 | Remote content can steer egress via redirects (scripted + headless); final host not logged. | Risk-accepted; operator-run; empty-body GET; hardening option recorded (bounded same-origin redirect follow). |
| SEC10-02 | Third-party shop-page markup can commit cross-site entries into the published dataset. | Risk-accepted; `source` provenance + baseline dedupe + build-chain gate (D7) before publication. |
| SEC10-03 | DDG search index is a trusted discovery source. | Risk-accepted; probe + URL gates + claim demotion; small known target universe. |
| SEC10-05 | Hostile markup can inject structured text (not code) into shop entries. | Risk-accepted; field bounds + provenance; shop-139 address prose noted for data-quality follow-up. |
| SEC10-07 | Hostile page JavaScript executes in local Chromium with unrestricted, unpaced egress for ~23.5 s. | Risk-accepted; per-site context isolation (ADR-0044); no secrets in context; dev-machine-only. |
| SEC10-12 | The crawl subsystem's consolidated egress posture (who/what/where leaves the machine). | Risk-accepted; recorded here as the standing design record for the subsystem. |

**None is design-level Blocking** → no rework loop back to the Architect; the crawl subsystem is standing outside ADR-0030's shipped chain and is operator-gated (D7). If the crawl is ever moved into the shipped runtime chain or a non-operator context, revisit SEC10-01/02/07 first.

### Seam state (204/208 — documented deferral, not a defect)

The run ended at a clean seam: **204 of 208 in-scope hospices have a log row**; the 4 missing are **unwritten after 3 attempts each** — exactly what F-1 produces for persistent transport failures, and exactly what the log-as-state design stores in their absence:

| Site | Verified apex failure |
|---|---|
| `rosshendalehospice.org.uk` | DNS — no A record |
| `boltonhospice.org` | TCP connect timeout (20001 ms) |
| `haltonhaven.co.uk` | TCP connect timeout (20002 ms) |
| `drkershawshospice.org.uk` | TLS `sslv3 alert handshake failure` (Cloudflare front, hit repeatedly) |

All four apex-verified this pass (dead site / WAF-indefensible front ≠ transient). Consequences, accepted: (1) `data-raw/shop-crawl-log.json` = 204 rows; (2) one expected test failure — `tests/crawl-log.test.mjs:158` asserts `entries.length == 208` (goal-coupled completeness assertion) → 204 ≠ 208; (3) the 4 rows re-enter the pool on the next run (resumable by design). No fabricated rows, no partial data, no log-inconsistent state. **Security assessment: the seam is the correct behavior of the design; the expected test failure is coupled to the seam and resolves with it.**

### Threat model (STRIDE — Cycle 10 delta)

| Threat | Surface | Assessment |
|---|---|---|
| Spoofing | hostile site answering as a curate | Mitigated in effect — content model treats every answer as hostile (SEC10-02/05); identity pass-through (ADR-0043) fails closed on unknown ids; publication gated by build chain. |
| Tampering | crawl inputs / log / shops file | Same publisher-trust boundary as every `data-raw/` pin (ADR-0029/0030): repo write = publish = human approval; log is append-rewrite per site with invariants QA-verified. |
| Repudiation | crawl history | The committed log is the audit trail (8-value vocabulary, confirmed rows' invariants, `source` on entries). |
| Information disclosure | egress | SEC10-12: only the single UA string identifies the request; no data/credentials/env values leave the machine. |
| Denial of service | operator time | Bounded (190-row pool, 3-sight cap, 20 s timeout, 1100 ms pacing; whole run ≈ domain-sized); transient failures are unwritten, never fatal. |
| Elevation of privilege | build machine | Chromium executes hostile page JS (SEC10-07) — the one new local-execution surface; dev-only, no secrets in context, per-site isolated. |

Outbound egress: runtime (shipped site) unchanged since Cycle 6 — keyless OSM tiles + `mailto:` only. New egress is **developer-time only** (SEC10-12). No new shipped-runtime origin.

### Verification log (read-only, this pass)

| # | Check | Result |
|---|---|---|
| 1 | `git log --oneline -8` | `a761871` = stage-5 gate ("Track Cycle 10 seam in the security report"; base `9004415` "Build data and tests"); working tree = gate + QA's implementation-ledger edits only |
| 2 | Full read of `scripts/crawl-hospice-shops.mjs` (993 L) | All cited line ranges above; every focus-area claim re-verified against code |
| 3 | `data-raw/shop-crawl-log.json` full-data verification | 204 rows; 14 confirm rows all `shopsExtracted:0/committed:false/discoverySource:null` (0 violations); histogram `{skipped-robots:105, no-website:83, ok:9, no-shop-page:5, unreadable:1, not-found:1}` (no `blocked`; no `discovery-found` remaining); meta honest (2026-11-17, script, UA, 1100 ms, 8-value vocab, source file); exactly 2 committed rows → `davecottage.org`, `foylehospice.com` |
| 4 | `data-raw/shops-website.json` verification | 140 entries; 138-entry prefix byte-identical to baseline; 2 new rows schema-matched and matching the log's committed rows |
| 5 | `public/data/shops.json` | Both new entries present (with lat/long; `outsideCatchment:false`) |
| 6 | `tests/crawl-log.test.mjs:151–159` | Goal-coupled completeness assertion (208) — the single expected failure at the seam (204) |
| 7 | Hazard grep across the script | 0 hits: `eval(`, `new Function`, `innerHTML`, `document.write`, `process.env`, `child_process`, `Worker`, `navigator.`; the only `fetch` sites are `:146`/`:405`; the only `writeFileSync` sites are `:229` (log) / `:917` (shops) |
| 8 | `package.json` | Runtime deps unchanged; devDeps +2 (playwright, pdfjs-dist) — SEC10-09 |
| 9 | ADRs 0043/0044/0045 read | Documents match implementation (identity pass-through semantics; per-site context + finally-close + no-in-script-download; log vocabulary + F-1 + confirm invariants) |
| 10 | No network / no browser by this stage | Read-only pass; all "current state" facts above come from code + committed data, not live endpoints |

### Carried-boundary status

| Item | Prior | Cycle 10 re-check |
|---|---|---|
| SEC6-01 (dev-only vulnerable deps: xlsx HIGH, esbuild MEDIUM) | RISK-ACCEPTED MEDIUM | Carried; **extended** to the two new dev deps (not re-audited — offline feed; see SEC10-09). Still dev-only, offline, operator machine. |
| SEC-4-D1 (localStorage theme) / D2 (curation trust) / D3 (no CSP) | LOW/MEDIUM/INFO design | Unchanged — zero frontend code delta this cycle. |
| SEC5-L1…L5 (Cycle 5 extraction info) | Info | Carried; no new input paths beyond the pinned `data-raw/` set. |

### Closure

**Cycle 10 security gate: PASS — 0 Blocking.** 12 new risk-accepted findings (SEC10-01…12), of which 6 are explicitly design-level (SEC10-01/02/03/05/07/12) with **no design-level Blocking** → no Architect rework routed. 1 carried (SEC6-01, extended). Seams (204/208 + 1 expected coupled test failure) = documented deferral, not a defect. Stage 7 CLOSED for the Cycle 10 pass (rework rounds used: 0). Cleared for Stage 8 (DevOps).

Lead decision items: (1) accept the seams — 4 apex-verified unwritten rows + the coupled test failure — until the sites recover the lead re-judges (next crawl run re-enters them automatically); (2) note SEC10-01/02/07 (egress shaping + Chromium egress) as future hardening candidates for ADR-0044 follow-up; (3) SEC6-01 stays open — the next dependency-hygiene cycle should `npm audit` the new dev deps (playwright, pdfjs-dist) alongside xlsx/esbuild.
