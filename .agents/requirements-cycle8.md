# Cycle 8 (C8) Requirements — online postcode geocode fallback (Pages Function proxy)

Date: 2026-11-14 · Stage: 4 Product Manager · Repo: HospiceInfo · Inputs: `.agents/feature-cycle8.md` (PRC) · `.agents/research-cycle8.md` (DR) · `.agents/architecture-cycle8.md` (ARC) · `.agents/review-cycle8.md` (REV: APPROVE, 0 Blocking) · ADR-0037 (proposed) · ADR-0014 (git-connected deploy: first `main` push → `npm ci && npm run build` → publish `dist/` + `functions/`).

## 1. Preamble — hard constraints

1. No new runtime deps — `package.json`/lockfile untouched; tests = `node --test` (Node 22).
2. `dist/` byte-identical — `functions/` outside Vite (app-only `vite.config.ts`) and TS (`tsconfig.json` `include:["src"]`); double-build hashes identical (W10); prerender invariants unchanged.
3. Secrets by name only — `POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`, `POSTCODES_ACCESS_CLIENT_SECRET`; values never in repo (Pages secrets; local `.dev.vars`, W8).
4. GLOSSARY verbatim: *Pages Function proxy*, *postcode geocode*, *geocode fallback*, *on-line band* (+ catchment, kind, hide-not-delete, start-here card).
5. On-line band votes OUTSIDE — a point in the 1e-9 deg band of a ring edge votes 0 (not inside any cell; ADR-0034/0037). P3 is 10.26 m ≈ 10⁻⁴·⁵ deg outside the band and MUST resolve (W6 guard).
6. Tier 1 first, unchanged — StartHere's `practiceByPostcode` map tried on every lookup; zero network on a tier-1 hit (`LS1 4AP`, ac2).
7. Coder does NOT commit — ship gate is the owner's (PRC gate 2); `.agents/implementation.md` updated after EACH item (W12); a partial pass is a failed pass.

## 2. Scope

**In:** stateless same-origin **Pages Function proxy** (validate postcode shape → forward geocode request to the owner's self-hosted postcodes.io with the two Cloudflare Access credentials → return stripped `{postcode, latitude, longitude}`) + **postcode geocode**/**geocode fallback** in the start-here search (tier 2: geocode → even-odd point-in-polygon against kind-filtered catchment cells → open the containing hospice), degrading to the not-found card without throwing.
**Out:** start-here card redesign (beyond the R-3 tier-2 line); data changes (`public/data/`, `data-raw/` untouched — no build-data double-run); new deps/wrangler config; proxy caching; kind overlay (one kind per ADR-0035); proxy auth (S-1, accepted-risk). Shared `.agents/requirements.md` is Cycle 7's — do not touch.

## 3. Parity vector set — C8-PARITY-VECTORS (R-5; cited by W6, W7)

W6 and W7 assert IDENTICAL client-side and function-side behaviour on exactly this set:
- Valid compact: `LS14AP`, `CF119HD`, `BT153LH`, `PR72TH`
- Raw spaced (normalise to the compact form above): `LS1 4AP`, `CF11 9HD`, `BT15 3LH`, `PR7 2TH`
- Invalid: `ABC`, `12345`, `!@#`, `''`, `LS1AA`
- Spaced-form expectations: `LS14AP`→`LS1 4AP`, `CF119HD`→`CF11 9HD`, `BT153LH`→`BT15 3LH`, `PR72TH`→`PR7 2TH`

## 4. Work items (ordered by dependency)

### W1 — `functions/api/postcodes/handler.ts` (NEW) — pure **Pages Function proxy** logic, workerd-free (importable under `node --test`)
- `POSTCODES_ENV_KEYS`: frozen constant `{ base:'POSTCODES_IO_BASE', clientId:'POSTCODES_ACCESS_CLIENT_ID', clientSecret:'POSTCODES_ACCESS_CLIENT_SECRET' }` — exact env-key literals live in code (R-2), asserted by W7.
- `validatePostcodeShape(raw): string | null` — trim → uppercase → fullmatch `^[A-Z]{1,2}[0-9](?:[0-9A-Z])?[0-9][A-Z]{2}$` → compact form, else null.
- `toSpacedForm(code): string` — detach last 3 chars (R-5 parity with client).
- `buildUpstreamRequest(base, code, clientId, clientSecret): { url, method:'GET', headers }` — `url = base` (trailing-slash stripped) + `/postcodes/` + code; headers = EXACTLY `CF-Access-Client-Id` + `CF-Access-Client-Secret` (values passed as arguments — no env access in this module).
- `shapeUpstream(status, parsed): { status, body }` — full mapping incl. the R-1 500 class: 200 + finite `result[0].latitude/longitude` → 200 + stripped JSON `{postcode, latitude, longitude}` (exactly 3 keys, no `result`/`status`/upstream internals); 200 + missing/non-finite coords → 404; upstream 404 → 404; 403 / 5xx / timeout / unparseable (parsed = null) → 502; all non-200 bodies = fixed non-empty JSON (never echo upstream status/body). Function-internal failures (e.g. missing base) surface as workerd's own 500 — W2; documented in W9/W11 (R-1).
- Acceptance: five exports; no `process.env`/`env.` reads in module (grep); no credential values anywhere.
- Verify: `node --test tests/postcode-function.test.mjs` (W7); runtime = post-deploy probe (W11 — `functions/` has no local type check by design, R-2).

### W2 — `functions/api/postcodes/[postcode].ts` (NEW) — thin route shell (exact path mandated by ARC)
- `export const onRequest = (request, env, context) => …` (Pages signature). Raw segment from `context.requestParams.postcode` ONLY (query ignored).
- Invalid shape → 400 fixed JSON `{"error":"bad-postcode"}` (no raw value echoed). Every response (400/200/404/502/500) carries `Content-Type: application/json` + `Cache-Control: no-store`.
- Read `env` via `POSTCODES_ENV_KEYS`; a missing/empty key → 500 (R-1: function's own failure = 500 class, distinct from the 502 upstream class). 5 s `AbortController` budget (D6: client 3 s < function 5 s); single upstream fetch via `buildUpstreamRequest`; `res.json().catch(() => null)` → unparseable → 502. try/catch around all → 500. Stateless: no second fetch, no logging, no storage.
- Deploys with the first `main` push (ADR-0014: `npm ci && npm run build` → publish; `functions/` ships with the same push).
- Acceptance: exact file path + `onRequest` export; 400/500/502 paths each emit the two header keys.
- Verify: post-deploy probe (W11) + local `npx wrangler pages dev` (W8 doc).

### W3 — `src/lib/postcodes.ts` (EXTEND, additive only; `normalisePostcode` byte-unchanged)
- `isPostcodeShape(code): boolean` — same compact regex as W1 (client twin, ARC §6).
- `toSpacedForm(code): string` — same rule as W1 (R-5 parity).
- `pointInCell(lat, lon, cell): boolean` — even-odd ray-cast port of `scripts/build-data.mjs:438-455` `interior()` (same `inside = !inside` edge test); **on-line band**: `Math.abs(v) <= (Math.abs(dx)+Math.abs(dy))/2 * 1e-9` → vote 0 = OUTSIDE. Rings = arrays of `{lat,lon}`; ALL rings of a cell.
- `findHospiceCell(lat, lon, cells): Catchment | null` — bbox `[minLon,minLat,maxLon,maxLat]` prefilter, boxes **memoised on `cells` array identity** (kindCatchments memo flips identity on kind toggle); PIP on survivors; first hit wins (≤1 per kind, ADR-0035); degenerate `polygons:[]` → null.
- `lookupByPostcode(code, cells, fetchImpl = fetch): Promise<{ cell, code } | null>` — normalise → shape check, fail → **immediate null, zero network** → 3 s `AbortController` → `fetchImpl('/api/postcodes/' + toSpacedForm(code), {signal})` (same-origin) → `!res.ok` / parse fail / non-finite coords → null → `findHospiceCell` on the geocoded point; entire body in ONE try/catch → **always resolves, never throws** (ac3).
- Acceptance: 5 new exports; `normalisePostcode` byte-identical; existing `tests/postcodes.test.mjs` (tier-1 pins) still green.
- Verify: `tsc -b` exit 0 + `npm test`.

### W4 — `src/components/StartHere.tsx` (EXTEND) — **geocode fallback** in the start-here card (ARC §6.2)
- New prop `catchments: Catchment[]` (type-only import from `../lib/types`); tier-1 `practiceByPostcode` map stays FIRST and byte-unchanged.
- State machine: submit → tier-1 hit → existing found card; tier-1 miss → pre-network phase → if `isPostcodeShape(normalised)` → phase `'resolving'` and call `lookupByPostcode(normalised, catchments)`; an in-flight fetch is aborted when the user resubmits; non-null result → `onOpenHospice(cell.hospiceId)`; null → not-found card. Never throws (ac3).
- R-3: the tier-2 hit card carries **NO practice line** — `{hospice.name} · {hospice.town}` + "Open in panel" only (the geocode fallback finds no practice).
- Not-found copy for a valid-shape tier-1 miss reworded "GP practice" → "hospice catchment" — gated on OQ1 (owner sign-off before this copy ships; see §6).
- Acceptance: the three existing tier-1 card states render byte-identically as today; resolving state is visible (status on the card); tier-2 card has no practice line.
- Verify: `tsc -b` exit 0 + `npm test` (W6 client suite) + `npm run check:layout` unchanged.

### W5 — `src/App.tsx` (EXTEND, one added prop)
- Add `catchments={kindCatchments}` to the `StartHere` render (~lines 232–239); the kind filter (one kind per ADR-0035) is untouched.
- Acceptance: the diff adds exactly that one prop; the children's view resolves against children cells only (kind identity flows through the memo array).
- Verify: `tsc -b` exit 0.

### W6 — `tests/postcodes.test.mjs` (EXTEND) — client-side PIP/lookup tests on C8-PARITY-VECTORS (R-5; no network)
- `isPostcodeShape`/`toSpacedForm`: the EXACT set and expectations of §3 (identical to W7).
- PIP fixtures on synthetic rings: (a) P3 — a point 10.26 m (≈10⁻⁴·⁵ deg) outside a ring edge → `pointInCell` false (on-line band guard, preamble 5); (b) a point clearly inside a convex ring → true; (c) a point in the shared on-line band of two adjacent cells → `findHospiceCell` returns null for it (band votes OUTSIDE for every cell); (d) degenerate `polygons:[]` cell → null.
- `findHospiceCell`: two cells with overlapping bboxes — bbox prefilter admits both, PIP discriminates; repeated calls with the same `cells` identity return the same hit (memoised boxes).
- `lookupByPostcode` with injected `fetchImpl` stubs (no real network): 200 + finite coords inside a cell → resolves `{ cell, code }`; 404 / 502 / bad JSON / non-finite coords → null; invalid shape → null with fetchImpl never invoked (zero network, ac2); timeout path via a stub rejecting on `signal` abort — no real 3 s wait in the suite.
- Acceptance: suite green under `node --test tests/postcodes.test.mjs`; zero network (all fetchImpl-stubbed); vectors identical to W7.
- Verify: `node --test tests/postcodes.test.mjs`.

### W7 — `tests/postcode-function.test.mjs` (NEW) — function-side tests, `.mjs` imports `.ts` (existing convention, as in `tests/postcodes.test.mjs`)
- Imports the handler from `../functions/api/postcodes/handler.ts`; `functions/` is excluded from `tsc -b`, so this suite IS the function-side check (R-2).
- Asserts the EXACT env-key literals of `POSTCODES_ENV_KEYS`: `POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`, `POSTCODES_ACCESS_CLIENT_SECRET` (R-2).
- `validatePostcodeShape`/`toSpacedForm`: the EXACT §3 set with expectations identical to W6 (R-5 parity — one named vector set, asserted by both suites).
- `buildUpstreamRequest`: url = trailing-slash-stripped base + `/postcodes/LS1 4AP`; header set exactly `{CF-Access-Client-Id, CF-Access-Client-Secret}` — no extra headers.
- `shapeUpstream` full table: 200 + finite → 200 + exactly 3 keys; 200 + missing/non-finite → 404; upstream 404 → 404; 403 → 502; 500/503 → 502; unparseable (parsed = null) → 502; every non-200 body a fixed non-empty JSON, distinct per status, never echoing caller input.
- Credential-absence grep (ac4 extension, REV §11): 0 matches for `cfast_` prefix across the new test files.
- Acceptance: zero network; parity vectors identical to W6; file at exactly `tests/postcode-function.test.mjs`.
- Verify: `node --test tests/postcode-function.test.mjs`.

### W8 — `.gitignore` (EXTEND) + `docs/MAINTENANCE.md` (EXTEND) — local-dev ops (REV §11, R-7, D11)
- `.gitignore`: add `.dev.vars` (entry currently absent).
- `MAINTENANCE.md` local-dev section: `npx wrangler pages dev dist` serves the Pages Function locally (wrangler not pinned — latest `npx` version); credentials come from `.dev.vars` only (never committed); with no `.dev.vars` the upstream returns 403 → the function 502s → the start-here card shows not-found (documented degradation, not an error state).
- Acceptance: `git check-ignore -v .dev.vars` exits 0; no secret values in the working tree; MAINTENANCE.md contains the `wrangler pages dev` line and the `.dev.vars` line.
- Verify: `git check-ignore -v .dev.vars` + grep `wrangler pages dev` / `.dev.vars` in `docs/MAINTENANCE.md`.

### W9 — `docs/adr/0037-online-postcode-fallback-pages-function.md` (DRAFT per ARC — fold reviewer lines in)
- R-1 line: function-internal failures (missing/empty env key, uncaught throw) surface as workerd's own 500 — the 500 class, distinct from the 502 upstream class (403/5xx/timeout/unparseable); both degrade to the not-found card client-side.
- S-1 line: accepted risk — no proxy auth; the public path is callable, but upstream access is Cloudflare-Access-protected (credentials live in the function); assessed and accepted by owner/reviewer.
- One page: context / decision / alternatives considered / consequences; GLOSSARY terms verbatim.
- Acceptance: both lines read back verbatim; ADR number/path unchanged (`docs/adr/0037-…`).
- Verify: read-back of the two lines.

### W10 — verification chain (gate for the owner's ship gate)
- Run in order: `npm test` (both new suites + all existing pins) → `tsc -b` (exit 0) → `npm run build` TWISE (SHA-256 over `dist/` both times — byte-identical double build; `git diff --stat dist/` empty between the two) → `npm run check:layout` (unchanged).
- If the double-build hashes diverge: source-level fix only (functions/ must not enter dist via Vite), never a `dist/` edit.
- Acceptance: all four commands green; the two dist hashes recorded in `.agents/implementation.md`.
- Verify: the four commands above, in order.

### W11 — post-deploy probe (owner pushes after W10; coder prepares + records)
- Coder does NOT push (owner's ship gate, PRC gate 2). Prepare the table below; owner runs it after the first `main` push and results are pasted into `implementation.md` before W11 is marked done.
- Probe table: (1) valid: `GET /api/postcodes/LS14AP` → 200, JSON exactly `{postcode,latitude,longitude}`, headers `Content-Type: application/json` + `Cache-Control: no-store`; (2) invalid: `GET /api/postcodes/ABC` → 400 `{"error":"bad-postcode"}`; (3) valid-unresolvable: `GET /api/postcodes/AA99AA` → 404; (4) no-credential path (pre-secrets deploys): 403→502 → start-here not-found card (R-1 observation: a function-internal failure, e.g. a missing env key, must read 500, not 502 — record what was actually seen).
- Acceptance: all four outcomes match (or the deviation recorded with the R-1 class label); headers verified on at least one 200 and one non-200.
- Verify: owner's probe results in `.agents/implementation.md`.

### W12 — `.agents/implementation.md` (UPDATE after EACH work item)
- After each of W1–W11: status, files touched, verification output (incl. the two W10 dist hashes, the W7/W6 vector pass counts). W11 is marked "pending owner push" with the probe table until results land. No TODOs left; final section = completion summary + pointer to §6 open owner questions.
- Acceptance: one section per work item in W1→W12 order; nothing committed (owner's ship gate).
- Verify: read-back of `.agents/implementation.md`.

## 5. Acceptance mapping — PRC ac1–ac6 + reviewer folds
- ac1 (real vectors): start-here resolves the acceptance vectors — `LS1 4AP` tier 1; `CF11 9HD` / `BT15 3LH` / `PR7 2TH` tier 2 via the postcode geocode; tier 2 runs only after a tier-1 miss (W3/W4/W5; §3 vectors; PRC gate 3).
- ac2 (tier-1 first, zero network): a tier-1 hit performs NO fetch — W4 state machine; W6 stub asserts fetchImpl never invoked; owner devtools check.
- ac3 (degradation without throwing): every failure path (invalid shape, 400/404/502, timeout, non-finite coords, no cell at the point, kind miss) lands on the not-found card with no throw/console error (W2/W3/W4; W6 + W7 suites).
- ac4 (credential absence): `cfast_` grep → 0 matches repo-wide incl. new test files (W7); secrets referenced by name only (W1/W2); `.dev.vars` git-ignored (W8).
- ac5 (chain gate): the four-command chain of W10 is green before any push; owner's ship gate (PRC gate 2) then decides; post-deploy probes W11.
- ac6 (documentation): MAINTENANCE.md local-dev section (W8) + ADR-0037 with R-1/S-1 lines (W9) + probe results recorded (W11).
- Reviewer folds covered: R-1 → W2/W9/W11 · R-2 → W1/W7 · R-3 → W4 · R-5 → §3/W6/W7 · R-7 → W8 · S-1 → W9 · D11 → W8.

## 6. OWNER QUESTIONS — RESOLVED (owner sign-off 2026-11-15)

- **OQ1 — gates W4 (not-found copy reword).** ARC §6 copy: on a valid-shape tier-1 miss, the start-here not-found card changes "We couldn't match that postcode to a **GP practice** on this map." → "a **hospice catchment**" (tier 2 now also consults catchments, so the practice-only wording is inaccurate). **RESOLVED 2026-11-15 (owner): reword confirmed — W4 copy is final.**
- **OQ3 — gates W4 (children-mode miss behaviour).** If a postcode misses tier 1 and the geocoded point is not inside any children catchment, the miss falls to the same not-found card as the adult mode (no separate children-mode wording). **RESOLVED 2026-11-15 (owner): same not-found card for both modes.**
- **OQ5 — gates W2 final sign-off (nation selector ignored).** The existing nation filter (`all|en|sc|wales|ni`) does not constrain the postcode lookup — start-here resolution is nation-agnostic (ARC §13). **RESOLVED 2026-11-15 (owner): signed off — W2 locked.**
