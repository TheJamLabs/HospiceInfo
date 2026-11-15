# QA — Cycle 8: online postcode fallback (Pages Function + geocode)

Date: 2026-11-15 · Stage 6 of 10 · qa, non-interactive

## 1. VERDICT

**DEFECT — 2 Blocking findings** (both one-line fixes in `functions/api/postcodes/[postcode].ts` and
`src/components/StartHere.tsx`; no design change). All four gates GREEN. 3 risk-accepted items
carried to security/ops. Contract conformance otherwise verified line-by-line against ADR-0037,
PM requirements-cycle8.md and the reviewer's R-1…R-3.

## 2. GATES (measured, not assumed)

| Gate | Command | Result | Evidence |
|------|---------|--------|----------|
| G1 | `npm test` | **23 pass / 0 fail** (3418 ms; matches coder baseline) | node --test summary; 20 C8 tests (8 handler + 12 client) + 3 pre-existing tier-1 pins green |
| G2 | `npm run build` | **green** (tsc -b + vite 568 modules, 1.33 s; prerender: 171 files, 208 hospice pages) | measured run, no TS/rollup errors |
| G3 | build ×2 + recursive SHA-256 manifest of `dist/` | **231 files, byte-identical=true** — manifest hash `d44b83b98df53f4bd993bfd3bf6d130993e44880ee1e904dfa87b27d2b48856a` identical for both builds | node script, sorted path+hash manifest |
| G4 | `<loc>` count in `dist/sitemap.xml` | **215** = 208 `/hospice/*` + 6 static pages + root; `public/data/hospices.json` = **208 entries**; prerender reports 208 pages | 215 exactly equals current data → 199 invariant is a **stale pre-growth baseline** (data-growth flag, not a regression — see §7, R-A2) |

`npm run check:layout` (W10 chain): **OK**. `package.json` / `package-lock.json` not in `git diff` → no new runtime deps ✓.

## 3. CONTRACT CONFORMANCE (file:line cites)

**Pages Function** (`functions/api/postcodes/[postcode].ts`, `handler.ts`):
- 400 on invalid shape **before any fetch/env** — entry `catch` (`[postcode].ts:61-65`); regex `^[A-Z]{1,2}[0-9](?:[0-9A-Z])?[0-9][A-Z]{2}$` (`handler.ts:15`). → **deviates on body string: see B2.**
- 200 body exactly `{postcode,latitude,longitude}` — `shapeUpstream` (`handler.ts:39-48`); finite-only; rounding/DOMAIN text stripped ✓.
- upstream 200-missing/non-finite → 404 `unknown postcode`; upstream 404 → 404 (`handler.ts:49-53`); 403/5xx/sentinel-500/null → 502 `postcode service unavailable` (`handler.ts:54-58`); fixed bodies, no upstream echo ✓.
- every response sets `Content-Type: application/json` + `Cache-Control: no-store` (`JSON_HEADERS`, `handler.ts:8-11`, used on 400/success/catch; workerd default 500 for function-internal failure per R-1) ✓.
- `FUNCTION_BUDGET_MS = 5000` (`[postcode].ts:11`); `new AbortController` + `setTimeout` (`:15-19`); `clearTimeout` in `finally` (`:26-27`) ✓.
- env read by exact names `POSTCODES_IO_BASE` / `POSTCODES_ACCESS_CLIENT_ID` / `POSTCODES_ACCESS_CLIENT_SECRET` (`[postcode].ts:32`); missing/empty → 500 sentinel → 502 ✓ (AC5).
- **R-1 ✓**: `fetch` CALL outside `try`, `await` inside (`[postcode].ts:20-22`).
- No `console.*` anywhere in `functions/` (grep: 0 matches); upstream response bytes never echoed ✓.

**Client** (`src/lib/postcodes.ts`):
- `LOOKUP_BUDGET_MS = 3000` (`:90`); `normalisePostcode` byte-unchanged; diff = 146 insertions / 0 deletions (additive only) ✓.
- `isPostcodeShape` reuses function regex (`:99`); `lookupByPostcode` (`:154-201`): shape-gate → fetch (same-origin, no-store, 3 s abort) → finite guards (else null, no PIP) → PIP on passed cell — **one outer try/catch, always resolves, never throws** ✓.
- PIP port verified line-for-line against `scripts/build-data.mjs:438-455` (identical `v` expr, on-line band votes OUTSIDE, bbox prefilter with `|χ−x|<1e-9` inclusive test); `cellBboxes` memoised via WeakMap on array identity (`:116-125`) ✓.

**StartHere** (`src/components/StartHere.tsx`, diff vs HEAD):
- tier-1 `practiceByPostcode.has(normalised)` checked **first**, zero network, phase reset to idle (`:87-92`); existing found/hospice + found/!hospice cards untouched ✓.
- `isPostcodeShape` gate before any fetch (`:93`); stale-guard `lookupGen` ref discards in-flight results on resubmit (`:89, :97`) ✓.
- resolving indicator "Checking your area…" + hit card `{name} · {town}` + "Open in panel", **no practice line** (R-3) (`:156-171`) ✓; null `tier2Hospice` falls through to not-found ✓.
- **not-found copy: missing the OQ1-confirmed reword → B1.**
- `src/App.tsx`: exactly **+1 line** `catchments={kindCatchments}` (`App.tsx:235`) ✓.

## 4. TEST HYGIENE

- `tests/postcode-vectors.mjs` (shared), `tests/handler.test.mjs` (8), `tests/postcodes-client.test.mjs` (12): all `.mjs`, import `.ts` source directly ✓.
- Placeholders only (`test-base`/`test-id`/`test-secret`) ✓; shared vectors across both suites ✓.
- Zero network: every `fetch` (client + function) stubbed ✓. Real 3 s caveat: the abort-path test runs the real non-injectable 3 s timer (measured 3009 ms, ~3 s of the suite's 3.4 s); no network involved → R-A3.
- Naming deviates from W6/W7 file names → R-A4.

## 5. SECRET HYGIENE

- `cfast_` shape: **0 matches** · `[0-9a-f]{32}\.access` shape: **0 matches** (whole repo).
- `git check-ignore -v .dev.vars` → `.gitignore:11:.dev.vars`, **exit 0** ✓.
- No logging in `functions/`; no credentials in tests; package.json/lockfile untouched ✓.

## 6. TESTS

| Feature | Covered? | Evidence |
|---------|----------|----------|
| Function 400/200/404/502 mapping, headers, budgets, env | Yes | handler.test.mjs: 8/8 green |
| Client shape-gate, off-map→null, in-cell→hit, finite guards, PIP on/off, abort | Yes | postcodes-client.test.mjs: 12/12 green |
| Tier-1 pins unchanged | Yes | pre-existing `tests/postcodes.test.mjs` green (LS1 4AP positive; CF11 9HD / BT15 3LH negative) |
| StartHere state machine (resolving→hit/miss, stale discard) | **No (manual)** | React component; no component test in repo convention |

## 7. FINDINGS (Blocking vs Risk-accepted)

| # | Sev | Finding | Files | Fix / Disposition |
|---|-----|---------|-------|-------------------|
| B1 | **Blocking** | W4 not-found copy still "GP practice"; OQ1 resolved 2026-11-15, "W4 copy is final" (hospice catchment). Header comment also stale ("rewording pending sign-off") | `src/components/StartHere.tsx` (not-found card + line-13 comment) | One-word reword to "a hospice catchment on this map" + comment update |
| B2 | **Blocking** | 400 body is `{"error":"invalid postcode"}` but W2 + W11 owner probe specify `{"error":"bad-postcode"}` (ADR-0037 freezes the 400 mapping, not the string; the string is PM-fixed twice) | `functions/api/postcodes/[postcode].ts:63` | One-token change to `bad-postcode` |
| R-A1 | Risk-accepted | In-flight tier-2 fetch not aborted on resubmit (W4); stale `lookupGen` guard discards the result — functional intent satisfied; W3 froze the signature with no signal param (documented in code comment) | `src/lib/postcodes.ts`, `src/components/StartHere.tsx` (submit handler) | Carry forward; optionally add an `AbortSignal` param next cycle |
| R-A2 | Risk-accepted | G4: sitemap 215 vs invariant 199 — measured exactly 208 `hospices.json` entries + 7 other; data growth, build self-consistent (prerender 208) | `dist/sitemap.xml`, `public/data/hospices.json` | Owner flag: refresh the 199 invariant; **not a regression** |
| R-A3 | Risk-accepted | Abort test takes real ~3 s (W6 wanted none); constant non-injectable per W3; no network | `tests/postcodes-client.test.mjs` | Carry forward; injectable budget next cycle |
| R-A4 | Risk-accepted | Test files named `handler.test.mjs` / `postcodes-client.test.mjs` / `postcode-vectors.mjs` vs W6/W7 file names; content conforms fully | `tests/` | Carry forward; rename next cycle if desired |

## 8. VERIFICATION LOG (abridged)

G1 `npm test` → 23/0 (3418 ms). G2 `npm run build` → green (171 files, 208 hospice pages).
G3: build, recursive SHA-256 manifest of `dist/` (231 files), rebuild, second manifest →
`byte-identical=true` (hash `d44b83b98…2b48856a` both times). G4: node XML parse → 215 `<loc>`;
`hospices.json` length 208; classification 208 hospice + 6 static + root. `npm run check:layout` → OK.
Secret greps → 0/0 matches; `git check-ignore -v .dev.vars` → `.gitignore:11`, exit 0. `git diff --stat HEAD` →
App.tsx +1, StartHere.tsx +67, postcodes.ts +146 (0 deletions), no package.json/lockfile.
Reviewer R-1 (fetch/await), R-3 (no practice line), R-4 (500 sentinel), W8 (MAINTENANCE lines 60, 64-65) verified.

## 9. CLOSURE

**Not ready to pass**: 2 Blocking (B1, B2), both single-line fixes, no re-architecturing.
After fix: re-run G1–G4 (gate set in requirements-cycle8.md §8) + grep the two corrected strings;
expected 23/0, green build, identical double-build, 215. Risk-accepted R-A1…R-A4 cleared for
security/ops stages.

## Post-fix verification (QA rework round 1/2) — 2026-11-15

- **String checks (grep)**: `StartHere.tsx` — `hospice catchment on this map`: **1 match** (line 176) · `GP practice`: **0** · `OQ1 reword signed 2026-11-15`: **1 match** (line 12 header comment) · `pending sign-off`: **0**. `[postcode].ts` — `bad-postcode`: **1 match** (line 30, 400 body) · `invalid postcode`: **0**. `tests/` — `invalid postcode` **0** · `GP practice` **0** → B1, B2 text fixes confirmed.
- **G1** `npm test`: `# tests 23`, `# pass 23`, `# fail 0`, `# duration_ms 3747.454` (exit 0) → PASS.
- **G2** `npm run build`: `✓ 150 modules transformed`, `✓ built in 5.89s`, `[prerender] emitted 171 files (208 hospice pages)` (exit 0) → PASS.
- **G3** double-build: build #1 manifest `231 47013db678605ddd9a871629178b916016996143397c2c73a10d69dd3c17131a`; rebuild (`built in 6.29s`); build #2 manifest `231 47013db678605ddd9a871629178b916016996143397c2c73a10d69dd3c17131a` → byte-identical → PASS.
- **G4** `dist/sitemap.xml`: **215** `<loc>` total, **208** `/hospice/*` → 215 = 208 + 6 static + root, consistent with R-A2 data-growth baseline (stale 199 baseline is not a regression) → PASS.
- **Credentials**: repo-wide grep `cfast_` | `35581cb1901cc5c7b3dc94c9a0b152d7` → **0 matches**.
- **Scope**: changes limited to the two specified lines; no test files touched (no pins existed); nothing beyond W4 copy + 400 body string.

VERDICT: PASS — 0 Blocking (rework round 1 of 2 closed)
