# Cycle 8 (C8) Implementation — online postcode geocode fallback (Pages Function proxy)

Stage 5 Coding. Date: 2026-11-15. Repo: C:\Users\james\source\repos\HospiceInfo.
Contract: `.agents/requirements-cycle8.md` (W1–W9, execution order; W9 OUT per
owner decision D3 default (b) — already covered by W4(d)). Design cited as A§n
from `.agents/architecture.md` (frozen). Glossary: `GLOSSARY.md`.

Labels: everything in this artifact and all C8 code/test output is labelled
**Cycle 8 (C8)** (R-4: upstream artifacts say "Cycle 7" — cosmetic drift, not
copied).

Secrets: the three credentials are referenced **by name only** everywhere:
`POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`, `POSTCODES_ACCESS_CLIENT_SECRET`.
Tests use placeholders only (`test-base` / `test-id` / `test-secret`). No value
written anywhere in this pass.

## Work list

| ID | Item | Files | Status | Validation |
|----|------|-------|--------|------------|
| W1 | Pure handler (validatePostcodeShape, toSpacedForm, buildUpstreamRequest, shapeUpstream) — workerd-free, importable under node --test | `functions/api/postcodes/handler.ts` | implemented (round 2: trailing-slash fix) | node -e smoke: `test-base/` / `test-base` / `test-base///` → `test-base/postcodes/LS1 4AP` (no `//` seam); 5 s… no env/fetch/AbortController in module; credentials as arguments; W4 suite regression |
| W2 | Thin workerd route shell (env by exact name, 5 s abort, fixed JSON bodies, no-store) | `functions/api/postcodes/[postcode].ts` | implemented (round 2: verified only) | Read once; 400/200/404/502 + JSON headers on every path; 5 s AbortController; env read by exact name; R-1: fetch CALL outside try → workerd default 500. No changes made. |
| W3 | Client helpers in postcodes.ts (isPostcodeShape, toSpacedForm, pointInCell, findHospiceCell, lookupByPostcode) | `src/lib/postcodes.ts` | implemented (round 2: verified only) | Read once; normalisePostcode byte-unchanged; on-line band vote OUT; cellBboxes WeakMap exported; lookup = 3 s abort, ONE try/catch, always resolves, fetchImpl injectable. No changes made. |
| W4 | Function test suite + shared vector table R-5 (incl. W2 env-name literals) | NEW `tests/postcode-vectors.mjs`, NEW `tests/handler.test.mjs` | implemented (round 2: suite also exposed + fixed the shapeUpstream `result[0]` gap — see Findings) | `node --test tests/handler.test.mjs` → 8 pass / 0 fail / 0 todo (457.93 ms, exit 0): env-key literal pin, shared vector set, spaced form, buildUpstreamRequest no-seam URL + EXACT two-header set, full shapeUpstream table |
| W5 | Client test suite (PIP parity vs build-data interior(), bbox memo, lookup stubs, ac1/ac2) | NEW `tests/postcodes-client.test.mjs` | implemented | `node --test tests/postcodes-client.test.mjs` → 12 pass / 0 fail / 0 todo (3388.3 ms, exit 0): R-5 parity sets, PIP in/out/band, degenerate cell, overlapping-bbox PIP discrimination + `cellBboxes` memo observation, lookup stubs (200/404/502/bad-JSON/non-finite/no-cell → null), invalid-shape zero-fetch, abort at the code's own 3 s budget (~3011 ms), 3 acceptance vectors × adult/children × compact/spaced |
| W6 | StartHere tier-2: catchments prop, idle/resolving/result machine, D1/D2 copy | EXTEND `src/components/StartHere.tsx` | implemented | diff reviewed (62 ins / 5 del, 8 anchored splices); tsc gate 2; ac2/ac3 per code — see log |
| W7 | App wiring: catchments={kindCatchments} on StartHere | EXTEND `src/App.tsx` | implemented | diff = exactly one prop line in the StartHere block (App.tsx:232-240); MapView occurrence untouched — see log |
| W8 | .gitignore + `.dev.vars` (append-only, one line) | EXTEND `.gitignore` | implemented | `git check-ignore -v .dev.vars` → `.gitignore:11:.dev.vars` (exit 0); `docs/MAINTENANCE.md` local-dev line + degradation note — see log |
| W9 | tsconfig.functions.json + package.json script | — | **OUT** (D3 default (b); W4(d) covers the pin) | — |

## Work item log (round 2, 2026-11-15 — resumed from disk state)

### W1 — trailing-slash fix in buildUpstreamRequest — DONE
- Status: implemented (was complete except this one spec gap).
- Files: `functions/api/postcodes/handler.ts` — ONE line changed:
  `url` is now `` `${base.replace(/\/+$/, '')}/postcodes/${toSpacedForm(code)}` ``
  (doc comment notes the strip). No other change in the module.
- Verification: node -e smoke (prints only): `test-base/` → `test-base/postcodes/LS1 4AP`;
  `test-base` → `test-base/postcodes/CF11 9HD`; `test-base///` → `test-base/postcodes/BT15 3LH`.
  Regression pinned by the W4 suite (`node --test tests/handler.test.mjs`).

### W2 — verified only (no changes) — DONE
- Files: `functions/api/postcodes/[postcode].ts` (read once).
- Verified: exact mandated path, `export const onRequest`; raw segment from
  `context.requestParams.postcode` only; fixed JSON 400 body (no raw echo);
  `Content-Type: application/json` + `Cache-Control: no-store` on every path
  (400/200/404/502); 5 s `AbortController` budget; env read by exact name
  (`POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`, `POSTCODES_ACCESS_CLIENT_SECRET`);
  single upstream fetch; `parse fail` → `shapeUpstream(..., null)`; R-1: the
  fetch *call* (synchronous URL validation) sits outside the transport try →
  function-internal failure = workerd default 500; no second fetch, no logging,
  no storage. No changes made.

### W3 — verified only (no changes) — DONE
- Files: `src/lib/postcodes.ts` (read once).
- Verified: `normalisePostcode` byte-unchanged; exports exactly the five new
  helpers — `isPostcodeShape` (same compact regex as W1), `toSpacedForm`,
  `pointInCell` (even-odd over ALL rings; on-line band
  `|v| <= (|dx|+|dy|)/2 * 1e-9` → vote OUTSIDE), `findHospiceCell` (bbox
  prefilter, first hit wins, degenerate `polygons:[]` → null), `lookupByPostcode`
  (3 s abort, ONE try/catch, always resolves / never throws, `fetchImpl`
  injectable, same-origin `/api/postcodes/{spaced}` URL); `cellBboxes` WeakMap
  memo exported for the W5 observation test. No changes made. Existing
  `tests/postcodes.test.mjs` tier-1 pins re-run in the W10 gate chain.

### W4 — function-side suite + shared R-5 vector table — DONE
- Status: implemented (new files). The suite's mandatory "200 + finite coords → 200"
  row exposed a second W1 spec gap (recorded in Findings); fixed at source level,
  then the suite is green.
- Files: NEW `tests/postcode-vectors.mjs` (C8-PARITY-VECTORS: `VALID_COMPACT`
  LS14AP/CF119HD/BT153LH/PR72TH; `SPACED_NORMALISES_TO`; `INVALID`
  ABC/12345/!@#/'/LS1AA; `SPACED_FORM`; `PLACEHOLDER_CREDS` = test-base/
  test-id/test-secret — placeholders only, no real values). NEW
  `tests/handler.test.mjs` (8 tests, zero network).
- Coverage: (1) route shell source read — exact literals
  `POSTCODES_IO_BASE` / `POSTCODES_ACCESS_CLIENT_ID` / `POSTCODES_ACCESS_CLIENT_SECRET`
  present; (2) `validatePostcodeShape` over the full shared valid/invalid set;
  (3) `toSpacedForm` over the shared spaced-form set; (4)
  `buildUpstreamRequest('test-base/', 'LS14AP', …)` → url exactly
  `test-base/postcodes/LS1 4AP`, method GET, headers deep-equal to EXACTLY
  `{CF-Access-Client-Id, CF-Access-Client-Secret}` (plus no-seam composition
  for a base without trailing slash); (5) full shapeUpstream table — 200+finite
  (array `result` with leaking extra keys in the element) → 200 body with
  exactly the 3 keys {postcode,latitude,longitude}; 200+missing/non-finite
  (6 cases: `[]`, null, NaN, missing fields) → 404; 404→404; 403/500/502/503 →
  502 incl. parsed=null; non-200 bodies fixed, non-empty JSON, distinct per
  class, never echo input (poison `<<ECHO-ME>>`).
- First run: 7 pass / 1 fail — "200 + finite coords → 200 stripped to exactly
  3 keys" asserted `404 !== 200`. Root cause + fix: see Findings.
- Verification (post-fix, real output): `node --test tests/handler.test.mjs` →
  `tests 8 / pass 8 / fail 0 / cancelled 0 / skipped 0 / todo 0` (457.93 ms),
  exit 0.

### W5 — client-side suite — DONE
- Status: implemented (new file). One first-run failure was a TEST-FIXTURE
  bug, not a source bug: the overlapping-bboxes fixture used two equal squares
  shifted 1.5 half-sizes — their bbox-overlap band is fully contained in each
  square, so PIP (correctly) admitted both. Replaced the second cell with a
  concentric diamond (bbox `[±1.2h]²` ⊃ square bbox `[±h]²`): P = (0.9h, 0.9h)
  sits in both bboxes, inside the square, outside the diamond's
  `|x|+|y| ≤ 1.2h` boundary. No source file changed.
- Files: NEW `tests/postcodes-client.test.mjs` (12 tests, zero network;
  imports `../src/lib/postcodes.ts` per the repo's .mjs-imports-.ts convention,
  shared vectors from `./postcode-vectors.mjs`; all cells synthetic — no
  `public/data/*.json` read).
- Coverage: (1) `isPostcodeShape` over the shared valid + invalid sets (R-5
  parity); (2) `toSpacedForm` over the shared spaced set; (3) `pointInCell` —
  point ≈10^-4.5 deg outside a ring edge (top/bottom) → false; centre +
  off-centre → true; (4) `findHospiceCell` — point exactly on the shared
  on-line edge of two adjacent cells → null in both orders (band votes OUT);
  degenerate `polygons:[]` → null, and never wins in a mixed set; (5)
  overlapping bboxes — bbox admits both, PIP discriminates in both orders;
  memo observed: `cellBboxes.get(cells)` is a fresh Array after the first call
  and the SAME reference after a second (identity-memo check) with
  `deepEqual` on the computed box; (6) `lookupByPostcode` — 200 + finite
  coords inside a cell → `{cell, code}` with the exact URL
  `/api/postcodes/PR7 2TH` and an `AbortSignal` passed as init; 404 / 502 /
  bad JSON (json rejects) / non-finite / finite-but-outside-all-cells → null
  (never throws); (7) invalid shape (full shared `INVALID` set) → null and
  `fetchImpl` invoked 0 times; (8) abort path — stub settles only when the
  code-under-test's 3 s `AbortController` fires; assert null, `signal.aborted`,
  elapsed ∈ [2900 ms, 4500 ms) (measured ≈3011 ms); no manual sleep in the
  test body; (9) acceptance vectors PR7 2TH (53.764541, -2.247151 →
  en-1-126365065 / en-1-114396298), CF11 9HD (51.484666, -3.193503 →
  CF11-ADULT / CF11-CHILDREN), BT15 3LH (54.627331, -5.933535 → BT15-ADULT /
  BT15-CHILDREN), each dispatched at both the compact and the spaced input,
  asserting the returned `code` round-trips as given.
- First run: 12 tests / 11 pass / 1 fail (fixture bug above). Re-run
  (post-fix, real output): `node --test tests/postcodes-client.test.mjs` →
  `tests 12 / pass 12 / fail 0 / cancelled 0 / skipped 0 / todo 0`
  (3388.30 ms), exit 0.

### W6 — StartHere tier-2 UI — DONE
- Status: implemented.
- Files: `src/components/StartHere.tsx` (62 insertions / 5 deletions; 8
  anchored delta-splices, LF preserved).
- Changes: `catchments: Catchment[]` prop; ARC §6.2 machine
  idle → resolving → hit | miss; `phase`/`cell` state + `lookupGen` ref
  (discards stale in-flight results on resubmit — W3 has no external signal
  param); submit path: tier-1 `practiceByPostcode.has` FIRST (hit → no state
  change, zero network, ac2), else `isPostcodeShape(normalised)` →
  `setPhase('resolving')` + `lookupByPostcode(normalised, catchments)` (always
  resolves, never throws, ac3); hit → `{hospiceById.get(cell.hospiceId)}` card
  with NO practice line (R-3) and user-initiated "Open in panel" →
  `onOpenHospice` (no auto-open, ADR-0012); miss → not-found card; the
  defensive null-guard on `tier2Hospice` falls through to the not-found card
  (ARC §6.2) — never an empty hit card. Invalid shape → straight 'miss',
  zero fetches. Not-found copy byte-identical (OQ1 gated; "GP practice"
  wording preserved).
- Verification: `git diff` reviewed — the 8 splices match the ARC §6 design
  exactly; the not-found JSX is unchanged (only its gating condition gained
  the resolving/hit exclusions). tsc: gate 2 chain.

### W7 — App wiring — DONE
- Status: implemented.
- Files: `src/App.tsx` — ONE line: `catchments={kindCatchments}` added inside
  the `<StartHere` props block (App.tsx:232-240), after `hospices`.
- Verification: `git diff` = single prop line in the StartHere block only;
  the MapView `catchments={kindCatchments}` occurrence and the line-173
  instance are untouched. tsc: gate 2 chain.

### W8 — .gitignore + local-dev docs — DONE
- Status: implemented.
- Files: `.gitignore` — append-only, one line: `.dev.vars` (now line 11).
  `docs/MAINTENANCE.md` — Quick start: `npx wrangler pages dev dist`
  (wrangler not pinned), credentials **by name only**
  (`POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`,
  `POSTCODES_ACCESS_CLIENT_SECRET`) read from `.dev.vars` only / never
  committed, degradation chain: no `.dev.vars` → upstream 403 → function
  502 → start-here not-found card.
- Verification: `git check-ignore -v .dev.vars` → `.gitignore:11:.dev.vars`
  (exit 0); both diffs reviewed.

## Findings

1. **W4 gate exposed a second W1 spec gap (fixed in this pass).** The lead's
   disk-verified brief called W1 complete except the trailing-slash gap. The
   W4 table's "200 + finite coords → 200" row failed (`404 !== 200`) because
   `shapeUpstream` read `parsed.result` as the coordinate object, while
   postcodes.io returns `result` as an **ARRAY** of locations — the
   coordinates live at `result[0]` (exactly what W1's spec text says). With
   the pre-fix code, a real successful upstream response would have returned
   404 for every valid postcode. Fix (minimal, source level, in
   `functions/api/postcodes/handler.ts` `shapeUpstream`):
   `const first = Array.isArray(result) ? result[0] : result;` — the
   finiteness check and the stripped body now use `first`; a bare object is
   accepted too (defensive). Doc comment updated to "200 + finite result[0]
   lat/lon" and notes the array shape. No other change in the module; W4
   suite re-run 8/8 green.

2. **Gate 2 exposed two type errors in `src/lib/postcodes.ts` (fixed in this pass).**
   The first `npm run build` failure was `tsc -b`: (a) line 118 — `FetchLike`
   referenced `GlobalThis.Response`; TS2833, no `GlobalThis` namespace in scope
   at a type position; (b) `lookupByPostcode` typed the parsed body
   `{ latitude?: unknown; longitude?: unknown }` and passed `data.latitude` /
   `data.longitude` straight into `findHospiceCell` (number params) — TS2345.
   Fix (minimal, source level, `src/lib/postcodes.ts` only): (a) `FetchLike`
   now returns the global `Response`; (b) cast is
   `{ latitude?: number; longitude?: number }` with explicit
   `typeof x === 'number' && Number.isFinite(x)` guards before use, so the type
   position and the runtime contract agree — non-finite coords still resolve to
   `null` (A§7 never-throw preserved; no behaviour change). Regression:
   `node --test tests/postcodes-client.test.mjs` → 12/12 green, then Gate 2
   re-run passed.

## Validation (PM §8 chain — all green before finishing)

Gates executed 5/5. Gates 1–4 green. Gate 5's measured value (215) misses the
stated PM §8 invariant (199) — assessed in slot 5 as a stale baseline, not a
C8 defect; carried as an owner flag in the completion summary below.

1. `npm test` — every suite incl. both new ones: GATE 1 GREEN — 23 pass / 0 fail / 0 todo / 0 skipped (close-out re-run 3545 ms, exit 0): pre-existing suites plus W4 `tests/handler.test.mjs` (8) and W5 `tests/postcodes-client.test.mjs` (12), sharing `tests/postcode-vectors.mjs`.
2. `npm run build` (first run; `tsc -b && vite build && node scripts/prerender.mjs`): GATE 2 — first run RED (2 tsc errors in `src/lib/postcodes.ts`: TS2833 `GlobalThis.Response`, TS2345 `unknown`→`number`), fixed at source level (Findings §2), re-run GREEN — tsc clean, 150 modules transformed, 171 prerender files emitted (208 hospice pages).
3. `npm run build` (second run): GATE 3 GREEN — tsc clean, 150 modules, 171 prerender files; `no-functions-in-dist` check confirmed no `functions/` content under `dist/`.
4. SHA-256 of full `dist/` tree across the two builds (must be byte-identical): GATE 4 GREEN — deterministic walk (relative paths sorted, per-file size + SHA-256, hash of the concatenation) over 231 files: build 1 `054b000d6807fa51ac53f9a146bde3837d56f3b6ed0110305b3f50e8e009df7c` = build 2 `054b000d6807fa51ac53f9a146bde3837d56f3b6ed0110305b3f50e8e009df7c` → byte-identical.
5. `dist/sitemap.xml` `<loc>` count (invariant: 199 = 192 hospice pages + 7): GATE 5 MEASURED **215** = 208 hospice pages (143 numeric-ID + 65 named: en-*, ni-r1–r6, sc-CS/oscar/pcs, wales-r1–r17) + 7 fixed (/, about, corrections, feedback, privacy, licences, accessibility). The stated invariant 199 (192 + 7) is **STALE** — data grew +16 hospice pages after PM §8 was written (the prerender itself reports 208 hospice pages; no C8 change touches page generation) — NOT a C8 regression. Owner flag: update the PM §8 invariant to 215 (208 + 7).

## Completion summary (C8 coding round 2 — close)

- **Work list W1–W8: all implemented.** Round 2 delivered W1 (trailing-slash
  fix), W2/W3 (verified only, no changes), W4 (function suite + shared R-5 vector
  table), W5 (client suite); this close completed W6 (StartHere tier-2 UI), W7
  (App wiring `catchments={kindCatchments}`) and W8 (`.gitignore` `.dev.vars` +
  `docs/MAINTENANCE.md` local-dev degradation note). Req W11 (post-deploy probe)
  is owner work after push — "pending owner push".
- **Validation gates 1–5 executed**, real outputs in §8 above: gates 1–4
  green; gate 5 measured 215 vs the stale 199 invariant (data growth, not a
  defect).
- **Findings: 2, both fixed at source level this pass** — the W4-gate
  `shapeUpstream` `result[0]` gap, and Gate 2's two `src/lib/postcodes.ts` type
  errors.
- **Owner flags:** (1) PM §8 sitemap invariant 199 → 215 (208 + 7);
  (2) owner ship gate — this pass made no commit/push.
- Constraints held all round: secrets referenced by name only
  (`POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`,
  `POSTCODES_ACCESS_CLIENT_SECRET`); no new dependencies; `package.json` +
  lockfile untouched; `dist/` built by the pipeline, never hand-edited; no
  scratch files left in the tree.

## Fix pass (QA rework round 1/2) — 2026-11-15

Scope: exactly the two Blocking findings from `.agents/qa-cycle8.md`
(QA round 2). No design changes, no commits/pushes, no new dependencies.

### B1 — StartHere not-found copy is stale — FIXED
- File: `src/components/StartHere.tsx`.
- JSX (the phase `'miss'` not-found card, line 176):
  Before: `We couldn't match that postcode to a GP practice on this map. You can search the list`
  After:  `We couldn't match that postcode to a hospice catchment on this map. You can search the list`
  Only the phrase "a GP practice on this map" → "a hospice catchment on this
  map"; the `<a href={noteMailto}>send us a note</a>` element and all
  surrounding JSX are untouched. Signed copy per requirements-cycle8.md OQ1
  (reword confirmed, W4 copy is final, 2026-11-15).
- Header comment (line 12):
  Before: `// never throws). Not-found copy unchanged (OQ1 rewording pending sign-off).`
  After:  `// never throws). Not-found copy: OQ1 reword signed 2026-11-15 (hospice catchment).`
  Rest of the header comment unchanged.

### B2 — 400 response body is the wrong string — FIXED
- File: `functions/api/postcodes/[postcode].ts` (invalid-postcode branch,
  line 30).
  Before: `new Response(JSON.stringify({ error: 'invalid postcode' }), {`,
  After:  `new Response(JSON.stringify({ error: 'bad-postcode' }), {`
  (with `status: 400, headers: JSON_HEADERS` on the following lines,
  unchanged) — body is now exactly `{"error":"bad-postcode"}` per
  requirements-cycle8.md line 41 + W11 owner probe line 108.
- Everything else in the file untouched: JSON_HEADERS, env read by exact name
  (`POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`,
  `POSTCODES_ACCESS_CLIENT_SECRET`), 5 s budget, fetch CALL outside the
  transport try / await inside, catch → `shapeUpstream(500, null)` → 502,
  `clearTimeout` in `finally`.

### Test-pin grep result
- `invalid postcode` in `tests/` → no matches.
- `GP practice` in `tests/` → no matches.
- Extra sanity ("match that postcode", "couldn't match" in `tests/`) → no
  matches.
- **No test pins** the old 400 body or the old copy; no test file touched.

### Validation (measured)
1. `npm test` — GATE GREEN, exit 0: 23 pass / 0 fail / 0 todo / 0 skipped
   (tail: `ℹ tests 23 / ℹ pass 23 / ℹ fail 0 / ℹ duration_ms 3544.9703`).
2. `npm run build` — GATE GREEN, exit 0: tsc clean, `✓ 150 modules
   transformed.`, `✓ built in 3.48s`, `[prerender] emitted 171 files
   (208 hospice pages)`.
- Double-build byte-identity and the sitemap gate were NOT re-run here —
  QA re-runs the full gate set in post-fix verification.
