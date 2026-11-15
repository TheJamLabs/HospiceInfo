# Security review — Cycle 8 (Stage 7 of 10)
Date: 2026-11-15

- **Stage:** 7 of 10 (Security engineer)
- **Pass type:** STATIC-ONLY fresh pass on the Cycle 8 (C8) delta — "Find by postcode" online fallback (Pages Function proxy + client PIP). No network calls of any kind; all evidence = code read + read-only commands executed this pass.
- **Scope / evidence base:** working-tree delta per `git status --short` — modified: `.gitignore`, `src/App.tsx`, `src/components/StartHere.tsx`, `src/lib/postcodes.ts`, `docs/MAINTENANCE.md`, `GLOSSARY.md`, `.agents/*`; new: `functions/` (exactly 2 files), `tests/handler.test.mjs`, `tests/postcode-vectors.mjs`, `tests/postcodes-client.test.mjs`, `docs/adr/0037-online-postcode-fallback-pages-function.md`. `package.json`, `package-lock.json`, `wrangler.jsonc`, `vite.config.ts`, `tsconfig.json` all untouched (absent from `git status`).
- **Files read in full:** `functions/api/postcodes/[postcode].ts`, `functions/api/postcodes/handler.ts`, `src/lib/postcodes.ts`, the 3 C8 test files, `docs/adr/0037-…md`, `.agents/review-cycle8.md`, `.agents/security.md`, `.gitignore`, `package.json`. Targeted greps only on `src/App.tsx`, `src/components/StartHere.tsx` (no full reads).
- **Trust model delta:** the project gains its **first unauthenticated PUBLIC runtime boundary** — `GET /api/postcodes/{postcode}` (Cloudflare Pages Function) → self-hosted postcodes.io behind Cloudflare Access. Credentials server-side only (Pages secrets / git-ignored `.dev.vars`). Everything else re-verified unchanged (static assets, same-origin `/data/*.json`, OSM tiles, `mailto:`).

## Verdict

**VERDICT: PASS — 0 Blocking findings.** 2 risk-accepted (SEC-8-01 Low = review S-1 capacity/abuse; SEC-8-02 Low = R-1 502-vs-500 boundary), 2 informational (SEC-8-03 parity drift, SEC-8-04 local type-check of `functions/`). One design-level item (SEC-8-01, the new public trust boundary) is explicitly risk-accepted and aligned with `.agents/review-cycle8.md` — **no Architect rework routed**. All contract invariants hold: shape-gated 400-before-upstream, fixed minimal responses, exact env-key reads, zero secret presences (both shape greps = 0), no CORS, no logging, 5 s/3 s budgets, 1:1 upstream amplification, no dependency changes, 23/23 project tests pass (executed this pass, zero-network).

## Findings

| # | Severity (Blocking/Risk-accepted) | Area | Description |
|---|---|---|---|
| SEC-8-01 | **Risk-accepted** (Low, design-level) | public endpoint / capacity | S-1: `GET /api/postcodes/{postcode}` carries no client auth — any internet caller can geocode through the owner's self-hosted postcodes.io with the owner's CF-Access credentials attached server-side. Not a secret or data leak (fixed minimal response, no upstream body/headers echoed, public geographic data, CF Access protects the instance itself). Residual = unbounded caller volume consumes owner's upstream capacity/abuse; mitigation = upstream capacity, owner's call. Wording aligned verbatim with `.agents/review-cycle8.md` S-1. |
| SEC-8-02 | **Risk-accepted** (Low) | error disclosure | R-1: function-internal failure (e.g. missing `POSTCODES_IO_BASE` → `base.replace` TypeError before the transport `try`) yields workerd's default 500, never the contract's 502. The client treats every non-2xx identically (not-found card; `src/lib/postcodes.ts` `res.status !== 200 → null`). Workerd's default 500 carries no env values, no internal paths, no stack. Documented in route file header and review R-1; availability-only, no disclosure. |
| SEC-8-03 | **Informational** (R-5) | duplication | Postcode shape/spaced-form logic duplicated `src/lib/postcodes.ts` ↔ `functions/…/handler.ts`; "kept in sync" is enforced by the shared vector set `tests/postcode-vectors.mjs` (C8-PARITY-VECTORS) asserted by both suites — 23/23 pass this pass, so drift is caught pre-push by the project's own check. Recorded, not actionable. |
| SEC-8-04 | **Informational** (R-2) | supply chain / tooling | `functions/` is outside `tsc -b` (`tsconfig.json` `include:["src"]`, unchanged) — a typo'd secret name compiles on CF and degrades tier-2 to silent 502 (documented, graceful). No local type-check of the function tree; the `node --test` suite (incl. env-key-literal pin test) is the function-side check. No exploitable flaw; carried as documented debt. |

Blocking: **0**. Risk-accepted: **2**. Informational: **2**. Design-level: **1** (SEC-8-01, §Design-level findings).

## Per-area conclusions (7 areas)

### 1. Public endpoint input handling & traversal — CLEAN

- **Shape gate before any upstream work:** `onRequest` starts with `validatePostcodeShape(context.requestParams.postcode ?? '')` (top of `[postcode].ts` handler); `null` → immediate **400 `{"error":"invalid postcode"}`** with `JSON_HEADERS` — before env is read, before any `fetch`. Compiled-gate regex (after strip-spaces + uppercase): `^[A-Z]{1,2}[0-9](?:[0-9A-Z])?[0-9][A-Z]{2}$` (`handler.ts`).
- **Traversal impossible:** after the gate only `[A-Z0-9]` chars (plus at most one internal space in spaced form) survive; `/`, `..`, `?`, `#` cannot pass. The route segment is used purely as string data — workerd exposes no filesystem for the function to traverse over; the upstream URL is `${base}/postcodes/${spaced}` where `base` comes only from `env.POSTCODES_IO_BASE` (trailing slashes stripped in `buildUpstreamRequest`), so **no user string can alter the path, host, query, or scheme** of the upstream call.
- **Client-side twin gate:** `isPostcodeShape` (`src/lib/postcodes.ts`) rejects bad shape before the network — suite test asserts `fetchImpl` is **never invoked** for invalid vectors (0 fetch calls measured).
- **Reserved areas not special-cased** (per ADR-0037 §4): any shape-valid code is forwarded; upstream 404 → 404 JSON. Matches the frozen contract.
- **Conclusion: Clean.**

### 2. Access credential handling — CLEAN

- **Exact env-key names, no fallback chains:** route reads `context.env.POSTCODES_IO_BASE`, `context.env.POSTCODES_ACCESS_CLIENT_ID`, `context.env.POSTCODES_ACCESS_CLIENT_SECRET` — single member access each, no `||` / deprecated-name fallback; suite test pins the three literals in the route source (pass). `src/` contains **0** `POSTCODES_` references (client knows nothing about the secrets).
- **No logging anywhere in `functions/`:** grep `console\.|logger|log\(` over `functions/` → **0 matches**; route header states the no-logging policy explicitly (postcode is PII-adjacent); none in `handler.ts` (full read).
- **`.dev.vars` gitignored:** `git check-ignore -v .dev.vars` → `.gitignore:11`; `git diff HEAD -- .gitignore` shows the **sole** change is `+.dev.vars` (one line).
- **No secrets in any checked-in file or build output (non-sensitive shape greps, measured this pass):** literal `cfast_` → **0 matches** repo-wide; regex `[0-9a-f]{32}\.access` → **0 matches** repo-wide; both shapes re-checked over `dist/` → **0 matches**. No values reported — counts/paths only.
- **Credential flow boundary:** values appear only as arguments into `buildUpstreamRequest`, written only into the two `CF-Access-Client-Id` / `CF-Access-Client-Secret` request headers (suite test asserts the header set is **exactly those two keys**). Response headers are the fixed 2-key `JSON_HEADERS` constant; upstream headers are never passed through.
- **Test fixtures:** `tests/` contains only placeholders `test-base` / `test-id` / `test-secret` (10 matches, all in `tests/postcode-vectors.mjs` + `tests/handler.test.mjs`); secret shapes in `tests/` → 0 (covered by repo-wide greps).
- **Conclusion: Clean.**

### 3. Client data flow & origins — CLEAN

- **Same-origin fetch only:** `lookupByPostcode` calls `fetchImpl('/api/postcodes/' + toSpacedForm(code), {signal})` — relative path, origin inherited from the page; suite test asserts the exact URL `/api/postcodes/PR7 2TH` and that an `AbortSignal` is passed. `fetchImpl` defaults to global `fetch` (injectable for tests only).
- **Client NEVER references the upstream base:** grep `postcodes\.thejamlabs` in `src/` → **0 hits**. Repo-wide `thejamlabs` = exactly 3, all benign: `src/lib/siteConfig.ts:16` + `data-raw/site-config.json:3` (pre-existing **contact email** `hello@thejamlabs.com`, not the upstream) and `docs/adr/0037-…md:14` (docs mention, allowed).
- **No new external origins, no CORS:** grep `Access-Control-Allow|crossOrigin|CORS` over `functions/` → **0 matches**; `fetch(` in `src/` → only the two pre-existing same-origin data fetches (`CorrectionsPage.tsx:26` `/data/corrections.json`, `useAppData.ts:4` generic same-origin helper). Browser runtime egress remains: same-origin data + OSM tiles (unchanged since C4).
- **Conclusion: Clean.**

### 4. Data exposure & privacy — CLEAN

- **Response is exactly `{postcode, latitude, longitude}`:** `shapeUpstream` 200-path copies only those three fields from `result[0]` (finite-checked via `Number.isFinite` — strings/bools/NaN rejected → 404). Suite test asserts `Object.keys(parsed).sort() === ['latitude','longitude','postcode']` with upstream fields `source`/`extra` demonstrably **not** copied.
- **Upstream bodies/headers never echoed:** 404/502 bodies are fixed strings `{"error":"unknown postcode"}` / `{"error":"postcode service unavailable"}`; suite test injects a `<<ECHO-ME>>` poison body and asserts the output matches `/ECHO-ME/` **never** and is byte-identical regardless of payload; the route's `catch {}` binds no error value (nothing can be echoed).
- **No storage, no logging of lookups:** no new `localStorage`/`sessionStorage` in the delta (`src/lib/postcodes.ts` full read — none; only the pre-existing `hfuk-theme` key in the client, untouched); no-logging policy re-verified (area 2).
- **`no-store` on every path:** the single `JSON_HEADERS` constant (with `Cache-Control: no-store`) is used by all three `new Response` call sites in the route (400, success, catch) — verified by full read.
- **Client result uses its own normalized code** (`{cell, code}` with `code` = client-normalised input), never the upstream-echoed postcode string.
- **Conclusion: Clean. No PII collected, stored, or logged; public geographic coordinates only.**

### 5. Resource & DoS posture — CLEAN (S-1 risk-accepted)

- **Function budget 5 s:** `setTimeout(() => controller.abort(), 5000)` with `clearTimeout` in `finally`; the `signal` is passed to the single upstream `fetch`.
- **Client budget 3 s:** same pattern in `lookupByPostcode` (`LOOKUP_BUDGET_MS = 3000`); suite test proves the abort fires at ~3 000 ms (measured 3005.9 ms) and the Promise resolves `null`.
- **Amplification = 1:** exactly one upstream `fetch` per client request — no retry loop, no recursion; suite test asserts `calls.length === 1`.
- **No unbounded loops:** PIP is O(vertices) over the kind-filtered cells, once per submit, bbox-prefiltered, memoised per array identity in a `WeakMap` (entries released with the array — no unbounded growth); worst case ≤94,101 vertices per kind set (review §4, sub-frame, unchanged measurement). Degenerate `polygons: []` cells no-op (test covers).
- **R-6 (carried from review, risk-accepted):** 3 s client < 5 s function → at most one bounded upstream call survives ~2 s past client abort. No secret/data impact.
- **S-1 (risk-accepted, wording aligned with `.agents/review-cycle8.md`):** "Public unauthenticated proxy exposes owner's upstream to unbounded callers (capacity/abuse, not secret/data leak)." Mitigation = upstream capacity (owner's call); one accepted-risk line in ADR-0037 consequences.
- **Conclusion: Clean.**

### 6. Supply chain — CLEAN

- **No new dependencies:** `git diff HEAD --stat -- package.json package-lock.json` → **empty** (both files untouched; C8 adds none). `wrangler.jsonc`, `vite.config.ts`, `tsconfig.json` also absent from `git status` → unchanged.
- **No lockfile drift, no new transitive surface.** `functions/` compiles separately on CF (directory convention); locally it is checked by the zero-network `node --test` suite, which **passed 23/23 this pass** (incl. 3 pre-existing tier-1 tests — no regression in tier-1 offline behaviour, ac2 upheld).
- **dist/ integrity:** `vite.config.ts` app-only + `tsconfig include:["src"]` unchanged → `functions/` remains outside the static build; dist byte-identity and `<loc>` invariants preserved by construction (review S-4, ADR-0037 consequences).
- **Conclusion: Clean.**

### 7. Error disclosure & trust boundary — CLEAN (1 Low documented)

- **Fixed generic bodies only:** `invalid postcode` / `unknown postcode` / `postcode service unavailable` — no internal paths, no URLs, no stack traces, no upstream status/body detail in any response (full read of both function files; poison-body test above).
- **R-1 residual (SEC-8-02):** function-internal failure (missing env → `TypeError` at `base.replace`, outside the transport `try`) yields workerd's default 500 → generic upstream text, no secret/path disclosure; client degrades to not-found. Documented in route header + review R-1. Risk-accepted.
- **Trust boundary:** the new boundary is *unauthenticated public edge (any internet caller) → authenticated upstream (CF Access, owner instance)*. Mitigations verified: credentials server-side only in env (area 2), no echo (area 4), no logging (area 2), no-store (area 4), budgets + 1:1 amplification (area 5), shape-gated input (area 1). The client sees **only** `{postcode,latitude,longitude}`; the upstream base URL and Access identities never cross the public edge.
- **Conclusion: Clean.**

## Design-level findings (trust boundary / auth / data flow)

Marked explicitly per pipeline contract.

| id | severity | classification | statement |
|---|---|---|---|
| SEC-8-01 (= review **S-1**) | LOW — **risk-accepted, design-level** | new unauthenticated public trust boundary | C8 creates the project's **first live runtime boundary**: `GET /api/postcodes/{postcode}` is public (no client auth, no cookies, no session) and proxies the owner's self-hosted postcodes.io with server-attached CF-Access credentials. **Sound decisions:** (a) the rejected alternative — client-side direct fetch — would have put a secret in the browser bundle (exposed to any XSS); server-side attachment is the correct boundary placement (ADR-0037 alternatives); (b) stripped 3-key response + fixed errors + no-echo + no-store close the disclosure routes; (c) stateless function with no storage means no data residence; (d) tier-1-first ordering keeps practice hits fully offline (ac2). **Residual risk:** unbounded caller volume against the owner's upstream (capacity/abuse only — no secret/data leak, public geodata). Fix = one accepted-risk line in ADR-0037 consequences; **no Architect rework routed** (reviewer risk-accepted; Security concurs, evidence above). **Data flow (verified):** user types postcode → client normalises + shape-gates (`isPostcodeShape`) → same-origin `GET /api/postcodes/{spaced}` (3 s abort) → function re-gates (400 before upstream) → upstream via env base + env credentials (5 s abort) → `shapeUpstream` → exactly `{postcode,latitude,longitude}` / fixed 404 / fixed 502 → client PIP over kind-filtered catchments → found card or not-found card (never throws; every failure → null → not-found card). No PII collected or stored at any hop. |
| SEC-8-02 (R-1) | LOW — risk-accepted | auth / error path | Missing/misconfigured `POSTCODES_IO_BASE` (or env unset) → workerd default 500, not the contract's 502. Design choice (documented): the client's non-2xx-equal treatment makes 500 vs 502 indistinguishable from the UX side, and workerd's default 500 leaks nothing. Kept as documented debt; no redesign required. |

Carried design items unaffected: SEC-F2/SEC-4-D3 (no CSP — static posture; the new function is server-side code, not a CSP target) and SEC-F3/SEC-4-D2 (human-curation trust — curation chain untouched).

## Carried-boundary status (prior cycles)

From `.agents/security.md` (C4 report + C5 resolution/landing sections). C8 does not touch any prior boundary; the Pages Function is the **only** new one (SEC-8-01).

| item | prior state | C8 re-verification |
|---|---|---|
| SEC-F1 (ODbL/OSM attribution) | resolved (C3) | **Unchanged** — no attribution code, tiles, or data-pipeline files in the C8 delta. |
| SEC-F2 / SEC-4-D3 (static posture, no CSP) | risk-accepted / informational | **Unchanged** — C8 adds zero inline code to static assets (`vite.config.ts`/`index.html` untouched); the new code is a server-side function, outside CSP scope. |
| SEC-F3 / SEC-4-D2 (human-curation trust: curated JSON → `href`/`mailto:`/popup) | risk-accepted, design-level (Medium) | **Unchanged** — curation/build chain untouched; `prerender.mjs` not in the delta. |
| SEC-3-01 / SEC-3-02 / SEC-3-03 (script balance, id charset, G7 re-pin) | resolved | **Unchanged** — prerender/dist chain untouched this cycle. |
| SEC-4-01 (OFL font attribution, Low) | open, risk-accepted | **Unchanged** — still open, carried to owner/Docs. |
| C5 risk-accepted carry (data-only cycle) | PASS carry | Superseded by this fresh C8 pass (C8 is code-level, not data-only). |
| **New: public function boundary** | — | **SEC-8-01** (design-level, risk-accepted). |

## Threat model (STRIDE — Cycle-8 delta)

Only C8-delta implications (one line each):

- **Spoofing:** no exploitable path — the upstream URL derives from server-side env (host/path not user-influenceable); user input survives only as `[A-Z0-9]`+space string data; unauthenticated callers can only query public geodata.
- **Tampering:** no persistent state in the function; all responses `no-store`; in-flight tampering is the platform's HTTPS transport responsibility (no new surface beyond a normal HTTPS endpoint).
- **Repudiation:** no logs by design (no-logging policy) — lookups are not attributable; accepted: nothing is stored, so nothing to fabricate against; no PII implicated.
- **Information disclosure:** closed — secret shapes absent repo-wide and in `dist/` (0/0 greps), credentials never in responses, stripped 3-key body, fixed error strings, no echo (poison test), no CORS; residuals = SEC-8-01 (volume) and SEC-8-02 (default 500, no detail).
- **DoS:** per-request 5 s/3 s budgets + 1:1 upstream amplification bound per-caller cost; residual = unbounded caller *volume* (S-1, risk-accepted, mitigation = upstream capacity).
- **Elevation:** credentials server-side only; the function has no filesystem/db env access beyond `fetch`; no path for a public caller to be upgraded to anything — no admin surface exists on this app.

## Verification log (read-only commands, executed this pass)

All commands run from the repo root (`C:\Users\james\source\repos\HospiceInfo`), cmd.exe, read-only (no writes to the working tree except this artifact; the test command only executes the project's own suite).

| # | Command | Abridged output |
|---|---|---|
| 1 | `git status --short` | C8 delta as enumerated in the header; `package.json`, `package-lock.json`, `wrangler.jsonc`, `vite.config.ts`, `tsconfig.json` absent → untouched. |
| 2 | `git check-ignore -v .dev.vars` | `.gitignore:11:.dev.vars` (matched). |
| 3 | `git diff HEAD -- .gitignore` | `+.dev.vars` — sole change, one line. |
| 4 | `git diff HEAD --stat -- package.json package-lock.json` | empty (no new dependencies). |
| 5 | `findstr /s /n /c:"cfast_" *.ts *.tsx *.js *.mjs *.json *.jsonc *.md *.html` (repo) | **0 matches**. |
| 6 | regex `[0-9a-f]{32}\.access` (repo-wide ripgrep equivalent) | **0 matches**. |
| 7 | both shape greps re-scoped to `dist/` | **0 matches**. |
| 8 | `test-base|test-id|test-secret` over `tests/` | **10 matches**, all placeholders in `tests/postcode-vectors.mjs` + `tests/handler.test.mjs`; secret shapes → 0. |
| 9 | `thejamlabs` over repo; `postcodes\.thejamlabs` over `src/` | 3 benign (contact email ×2, ADR docs ×1); **0** in `src/`. |
| 10 | `fetch\(` over `src/`; `POSTCODES_` over `src/` | 2 pre-existing same-origin; **0** `POSTCODES_` in client. |
| 11 | `Access-Control-Allow|crossOrigin|CORS` over `functions/`; `console\.|logger|log\(` over `functions/` | **0 / 0** (no CORS, no logging). |
| 12 | `kindCatchments` over `src/App.tsx` | defined :67-69 (memo filters by children mode); wired :173/:235/:245 — kind filter applied before PIP. |
| 13 | `npm test` (project script = `node --test`) | **"tests 23, pass 23, fail 0"** (20 C8 tiers incl. 3 s abort at 3005.9 ms, no-echo poison, exact-header, 3-key body, acceptance vectors PR72TH/CF119HD/BT153LH; + 3 pre-existing tier-1 tests — no tier-1 regression). |

## Closure

- **C8 security gate: PASS — 0 Blocking.** SEC-8-01/8-02 risk-accepted (documented, carried forward as debt; SEC-8-01 design-level, matching reviewer S-1 wording); SEC-8-03/8-04 informational, non-actionable (drift already test-enforced; tooling gap documented in ADR-0037).
- **No Architect rework routed** (all design-level items are risk-accepted, no findings require a design change).
- **Cleared for Stage 8 (DevOps).** DevOps note for the publish handoff: prod secrets `POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`, `POSTCODES_ACCESS_CLIENT_SECRET` must exist as **Pages secrets** before ADR-0014 git-connected publish (auto-publish on push); local dev uses gitignored `.dev.vars`. No other deployment-blocking security items.
