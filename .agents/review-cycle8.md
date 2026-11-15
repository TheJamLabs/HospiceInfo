# Cycle 8 Review — online postcode geocode fallback (Pages Function proxy + client PIP)

Date: 2026-11-14 · Cycle: C8 · Stage 3 Reviewer (read-only)
Inputs: `.agents/feature-cycle8.md`, `.agents/research-cycle8.md`, `.agents/architecture.md`,
`docs/adr/0037-online-postcode-fallback-pages-function.md`, `GLOSSARY.md`.
All claims re-verified against the working tree; no wholesale read of
`public/data/catchments.json` (targeted files only).

**Verdict: APPROVE** — zero Blocking findings. Five low-severity items (R-1…R-5),
three risk-accepted (R-6…R-8), one design-level security item (S-1, risk-accepted),
four confirmations OK. Worklist-ready (§11).

## 1. Response contract completeness
OK. `architecture.md` §4 fixes every outcome: 400 bad shape; 404 upstream-404,
200-without-`result`, non-finite lat/long; 502 upstream 403/5xx/timeout/non-JSON;
200 body fixed to `{postcode, latitude, longitude}`; `Content-Type` +
`Cache-Control: no-store` on all responses. Upstream 403 (missing Access headers,
verified `research-cycle8.md` §5 probe) classifies as 502, and the client treats
all non-2xx identically → not-found. Gap: 500 class (function's own failure, e.g.
missing `POSTCODES_IO_BASE`) is implicit — R-1.

## 2. Non-throwing degradation
OK. `lookupByPostcode` (extended `src/lib/postcodes.ts`, one try/catch, injectable
`fetchImpl`, 3 s `AbortController`) never throws on 400/404/502/non-2xx/non-JSON/
non-finite-coords/network/abort/PIP-miss — exactly feature ac4. Tier 1
(`practiceByPostcode`, `tests/postcodes.test.mjs` pattern) unchanged, so LS1 4AP
stays offline with zero network (ac2). `StartHere` state machine idle/resolving/
result; re-search on re-submit; nothing unhandled.

## 3. Kind filter as sole disambiguator
OK. ADR-0035 double tessellation: each covered point sits in exactly 2 cells
(1 adult + 1 children) — research probes (P1 `en-1-126365065`/`en-1-114396298`,
P2 `wales-r15`/`en-1-129536667`, P3 `ni-r4`/`ni-r3`). `kindCatchments =
catchments.filter(c => c.children === childrenMode)` (`src/App.tsx` kind memo ~:68)
is applied **before** PIP, making the hit set unambiguous for the active mode —
no tie-break code; children-mode miss → not-found (separate sets; owner OQ3).

## 4. PIP port performance
OK. Even-odd + on-line band ported from `scripts/build-data.mjs:438-455` —
verified line-by-line (`(ay > py) !== (by > py)` toggle; `|v| <= (|dx|+|dy|)/2 * 1e-9`
votes outside). Band 1e-9 deg; P3 is 10.26 m ≈ 2 orders of magnitude outside the
band, so the band rule cannot flip any acceptance vector. Worst case ≤94,101
vertices per kind set, O(vertices) once per submit, sub-frame; bbox prefilter
memoised on cells identity. Acceptable.

## 5. Abort relationship (3 s client / 5 s function)
OK functionally; see R-6. Client 3 s is the UX guard; the function's independent
5 s abort may keep one upstream call in flight up to ~2 s past client abort —
bounded, no secret/data impact. Both aborts are frozen contract; no change.

## 6. ADR-0014 auto-publish risk
Confirmed: push `main` → `npm ci && npm run build` → publish `dist/`
(`wrangler.jsonc` 5 lines, `pages_build_output_dir: "dist"`, verified); `functions/`
ships on first push with no separate gate — acknowledged in ADR-0037 consequences;
rollback = restore prior deployment (`docs/MAINTENANCE.md` git-connected +
post-deploy verification sections present). Function tree gets no local
type-check (`tsconfig.json` `include:["src"]`) — R-2.

## 7. Secret handling
OK — names only. `POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`,
`POSTCODES_ACCESS_CLIENT_SECRET` appear in the four inputs **by name only** —
no values; function code reads `env.*` (`architecture.md` §3); `.dev.vars` to be
appended to `.gitignore` as its single line (verified: current 10 lines, no entry
→ work item D11 correct). `package.json`/`wrangler.jsonc` unchanged by design.

## 8. ADR-0037 fidelity
OK vs `architecture.md`: D1 stateless function (400/404/502/403→502 match §4
table); D2 client helpers + 3 s PIP; D3 `catchments={kindCatchments}` wiring =
existing prop (`src/App.tsx` `StartHere` ~:232–239, verified); D4 on-line band
= outside-unowned + P3 10.26 m, matches research probes; consequences (no separate
deploy gate, byte-identical + `<loc>` invariant, deferred wording) match §5–§10,
one precision nit aside: ADR wording "≤94k verts" vs §4's 94,101 (11 verts over
"94k" — rounding, no perf impact). Gap: public-proxy capacity exposure absent
from consequences — S-1.

## 9. Glossary consistency
OK. `GLOSSARY.md` "Cycle 7 (2026-11-14)" section contains every term the
ADR/architecture uses: Pages Function proxy, postcode geocode, geocode fallback,
on-line band (plus pre-existing catchment, kind filter, hide-not-delete,
start-here card). No orphan terms; no new additions required. Label discrepancy
("Cycle 7" in artifacts vs "Cycle 8" session label) — R-4, cosmetic.

## 10. Feature acceptance coverage
ac1 three vectors → §3 (research probes; re-verified by §9 real-vector tests —
R-8); ac2 LS1 4AP offline zero-network → tier-1-first with no-`fetchImpl` test;
ac3 unknown/unreachable → not-found no-throw → §2; ac4 secrets nowhere → §7 +
credential check below; ac5 chain green + byte-identical + `<loc>` invariant →
`functions/` outside vite (app-only `vite.config.ts`) and tsc (`include:["src"]`);
CF compiles `functions/` separately, so `dist/` is byte-identical — invariant
holds; ac6 ADR + maintainer docs → ADR-0037 present (proposed), ops lines in
R-2/R-7. No missing acceptance.

## 11. Local dev story (without CF Access)
Feasible: `npx wrangler pages dev dist` + repo-root `.dev.vars` (spec W5/D5,
research §5). First run fetches wrangler via npx (no dependency added, gate 5).
Without `.dev.vars`: upstream 403 → function 502 → graceful not-found (verified
degradation path) — local dev works before credentials exist. Note: R-7.

## Findings
| ID | Severity | Finding | Evidence (file:line) |
|----|----------|---------|----------------------|
| R-1 | Low | 502-vs-500 boundary implicit: function's own failures (e.g. missing `POSTCODES_IO_BASE` → workerd default 500) never documented | `architecture.md` §4 table; ADR-0037 D2 |
| R-2 | Low | `functions/` not type-checked locally; typo'd secret name compiles on CF, degrades tier to silent 502 | `tsconfig.json` `include:["src"]`; `package.json` (no CF types) |
| R-3 | Low | Tier-2 hit card: existing found card shows practice line `{found.name} · {found.postcode}`; tier 2 has no practice — "same layout" implicit | `src/components/StartHere.tsx` ~96–106; `architecture.md` §5 |
| R-4 | Low | "Cycle 7" label in all artifacts vs "Cycle 8" session label | `feature-cycle8.md`:1; ADR-0037 header; `GLOSSARY.md` Cycle 7 section |
| R-5 | Low | Postcode shape/spaced-form logic duplicated `src/lib/postcodes.ts` ↔ `handler.ts`; "kept in sync" unenforced | `architecture.md` §6, §9 |
| R-6 | Risk-accepted | 3 s client < 5 s function abort → ≤1 bounded upstream call survives client abort | `architecture.md` §4/§6 |
| R-7 | Risk-accepted | `npx wrangler` unpinned, network on first run; no-creds dev degrades gracefully | spec W5; `research-cycle8.md` §5 |
| R-8 | Risk-accepted | P1/P2/P3 two-cell probes lead-verified (research), not independently re-run here (no shell); §9 real-vector tests re-verify them | `research-cycle8.md` §7 probe table |
| S-1 | Design-level, risk-accepted | Public unauthenticated proxy exposes owner's upstream to unbounded callers (capacity/abuse, not secret/data leak) | `architecture.md` §4/§8; research OQ6 |

## Security findings (design-level items marked explicitly)
- **S-1 (DESIGN-LEVEL, risk-accepted):** `GET /api/postcodes/{postcode}` carries no
  client auth — any internet caller can geocode through the owner's self-hosted
  postcodes.io with the owner's CF-Access credentials attached server-side. Not a
  secret or data leak: fixed minimal response, no upstream body/headers echoed
  (`architecture.md` §4/§8), public geographic data, CF Access protects the
  instance itself. Fix: one accepted-risk line in ADR-0037 consequences
  (unbounded caller volume consumes owner's upstream; mitigation = upstream
  capacity, owner's call); route back to Architect if Security disputes.
- S-2 OK: `Cache-Control: no-store` on all responses; no-echo via fixed body.
- S-3 OK: secrets by name only in all four inputs; values absent; `env.*` reads
  only; `.gitignore` D11 line needed and planned.
- S-4 OK: `dist/` byte-identity preserved — `vite.config.ts` app-only (no
  `functions/` handling), `tsconfig.json` `include:["src"]`, CF compiles
  `functions/` separately; double-build SHA-256 + `<loc>`=data+7 gates unchanged
  (`architecture.md` §10.3; `docs/MAINTENANCE.md` Cycle 5 invariants).
- S-5 OK: upstream URL param is the regex-validated `spacedCode` (A-Z0-9 only —
  no path/query characters), re-validated in the function; no injection surface.

## Credential-absence check
Value-based grep is not possible for the secret (value exists only in the owner's
chat / CF dashboard — unreadable here, and no value fragment exists in the tree to
match). Prefix grep for the client-id family `cfast_`: **0 matches** in
`feature-cycle8.md`, `research-cycle8.md`, `architecture.md` and ADR-0037 (the
single `cfast_` occurrence in `.agents/` is the pipeline ledger's own zero-match
record, `pipeline.md:2103` — not an input); the earlier full 32-hex client-id
grep likewise returned 0 (values never reproduced in this artifact). Name check
across the four inputs and GLOSSARY: the three secret names appear only as
identifiers (`env.` reads, `.dev.vars` naming, "referenced by name only"
statements). ac4 control (grep-verified absence + names-only rule) passes.

## No-redesign note
No existing behaviour is redesigned: tier-1 practice-map lookup unchanged and
guaranteed first; data/prerender/sitemap untouched; no dependency, no
`package.json`/`wrangler.jsonc`/`vite.config.ts` change; `StartHere` gains one
prop and an idempotent state machine; not-found copy is a one-line rewrite
awaiting owner sign-off (OQ1). Pure additive design; no rework loop required.

**Bottom line:** approve as-is; PM to fold R-1…R-5 + S-1 line + R-7 doc line into
the worklist, and take owner sign-off on OQ1 / OQ3 / OQ5.

## Close
- **Verdict:** APPROVE — design worklist-ready; no rework loop required.
- **Blocking findings:** 0.
- **Risk-accepted:** 4 (R-6, R-7, R-8, S-1); five low-severity items R-1…R-5
  for the PM worklist.
- **Artifact line count:** 159 (this file, final).
