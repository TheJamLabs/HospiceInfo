# Pipeline: Make the map public-ready

Goal: Public release of the UK-wide hospice catchment map — coastline-clipped
catchments, hospice-assignment tooltips, public-safe UI, feedback +
corrections mechanism, About/legal pages, verified mobile. Cloudflare Pages.

Done when: all ten stage artifacts exist, no open Blocking findings
(resolved or risk-accepted), the Reporter's one-screen report is delivered
in chat, and this ledger is current. Scope: `.agents/feature.md`.

## Stage status

| # | Stage | Status |
|---|-------|--------|
| 0 | Init | done |
| 1 | Research | done |
| 2 | Architect | done |
| 3 | Reviewer | done (CHANGES REQUIRED; 13 findings RV-1…RV-13; lead-verified: 4 blocking, 4 minor, 5 dropped) |
| 2a | Architect (rework round 1) | done (8 findings fixed, lead-verified 2026-10-21; 3 residual prose stubs fixed by lead) |
| 3a | Reviewer (post-fix) | done (CHANGES REQUIRED; 0 Blocking, 6 Minor NF-1…NF-6 — all 6 lead-fixed directly; no 2nd Architect rework round) |
| 4 | PM | done (37 items, 6 areas, in `.agents/pm.md`; lead-verified on disk 2026-10-21) |
| 5 | Coding | done (37/37 on disk — 1.2 landed 2026-10-23: mask fetched + build crash fixed via deterministic in-memory DP simplification (`scripts/land-mask.mjs`); build ×2 byte-identical, validator exit 0, QA §A1 coastal spot-check 0 violations — see Notes) |
| 6 | QA | done (PASS w/ rework; 2 Blocking found — F-1 + F-4 — both fixed, rework rounds 1–2, re-verified; A1 full clip gate DEFERRED to human land fetch; see `.agents/qa.md`) |
| 7 | Security | done (PASS, 0 Blocking; sub-session died (timeout) but artifact valid on disk, 2026-10-22, re-verified by lead; SEC-F1 ODbL mis-attribution → Docs stage must-fix-before-public) |
| 8 | DevOps | done (`.agents/ops.md` rewritten 2026-10-22: Cloudflare Pages deploy playbook, pre-publish gate G1–G6, rollback via Pages deployments; SEC-F1 fix assigned to Docs as G3) |
| 9 | Documentation | done (lead inline; G3 = SEC-F1 ODbL fix applied; MAINTENANCE/README currentised; `tsc -b` + `vite build` green; fringe greps clean — detail in Notes) |
| 10 | Hindsight | done (lead takeover 2026-10-22: sub-sessions reported dead (timeout) but #1's ingests landed on disk — RQ-1 verified; 8 correction docs in the bank, 5 pages corrected; update/delete tools absent on this machine, page-level rewrites held for human — detail in `.agents/hindsight.md`) |
| T | Reporter | done (lead inline 2026-10-22, read-only; one-screen status report delivered in chat; no artifact by design) |

(QA and Security run in parallel after Coding. QA result precedes
DevOps; DevOps' `.agents/ops.md` feeds Documentation. 2a/3a are the
Architect-Reviewer design rework loop, separate from the QA/Security gates.)

## Rework round counts

- Architect-Reviewer gate: 1 (cap 2)
- QA gate: 2 (cap 2) — F-1 (rework round 1), F-4 (rework round 2); both
  re-verified, no third round
- Security gate: 0 (PASS first time; the 2026-10-16 stale file was superseded
  by the 2026-10-22 report)

## Open findings

- QA gate (2026-10-22): 0 open Blocking. F-1 (public-safe wording leak —
  Methodology/HospicePanel) fixed + re-verified in rework round 1; F-4
  (CorrectionsPage read `json.corrections` from a bare-array file — found as
  Security's routed non-security observation) fixed + re-verified in rework
  round 2. Carried: F-2 (informational, add-correction error-message wording),
  F-3 (risk-accepted, "Lancashire" historical ADR context). Detail:
  `.agents/qa.md`.
- Security gate (2026-10-22): 0 Blocking. SEC-F1 (Minor, **must-fix before
  publish**): `LegalPage.tsx` mis-attributes the OSM land boundary as "OS
  Open Data" — **RESOLVED 2026-10-22 in Stage 9**: `#licences` page now
  attributes tiles + land geometry + geocoded coordinates to "©
  OpenStreetMap contributors under the ODbL v1.0" (OS Open Data claim
  removed; OGL "Public registers" section added) and `data/README.md`
  `uk-land.json` row carries the licence line. Post-fix verified: grep
  "OS Open Data" in `src/` → no matches; build green.
  SEC-F2/F3 design-level informational (no backend, trust boundary clean);
  carried SEC-1…SEC-9 re-checked (SEC-5 xlsx devDep advisories unchanged).
  Detail: `.agents/security.md`.
- Blocking (design gates): 0 open — RV-1/RV-2/RV-7/RV-11 resolved in Architect rework round
  1; post-fix Reviewer (3a, `.agents/review.md`) confirmed all 8 fixes on disk.
  Detail (history): 4 blocking:
  - RV-1: ADR-0007 + architecture.md §2.1 claim a "Vite default catch-all" for
    deep links — false for hash routing (fragment never reaches the server;
    unknown hashes render the map via useRoute default). Fix: correct wording
    in both files; optional Cloudflare Pages `_routes.json` note.
  - RV-2: ADR-0008 / architecture.md §2.2 import `bootstrap/dist/js/bootstrap.
    bundle.min.js` (UMD) in the ESM bundle. Fix: specify the real ESM path
    (`bootstrap/dist/js/bootstrap.esm.min.js` or `bootstrap/esm/bootstrap.
    bundle.js`), verified against node_modules at coding time. Reviewer's
    `bootstrap.bundle.esm.js` does not exist.
  - RV-7: Public-safe violations at 3 live surfaces — MapView.tsx practice
    tooltip "no catchment match"; ShopMarker "⚠ Outside its own catchment"
    badge + orange `SHOP_OUTSIDE_COLOR`; unassigned counts in Methodology.tsx /
    HospicePanel.tsx. Fix: hide-not-delete neutralisation of all (feature.md
    §3.2).
  - RV-11: ADR-0006 does not state which islands are in/out of `uk-land.json`
    (Isle of Man, British islands). Fix: one explicit sentence; coverage
    invariant (land∩box) must use the same land file.
- Minor from first review: resolved in rework round 1 (RV-4, RV-5, RV-6,
  RV-10; confirmed by 3a). Detail (history): 4
  - RV-4: state that site-config.json mirrors the SiteConfig interface exactly.
  - RV-5: name the exact build-data.mjs change site (Voronoi cell extraction →
    per-label union → intersection with land).
  - RV-6: add explicit `preferCanvas: true` on MapContainer.
  - RV-10: re-expression must treat empty/sliver cells non-fatally (validator
    already skips empty polygons).
- Dropped (lead verification, with reasons): 5
  - RV-3: siteConfig files don't exist — new Coding-stage files per ADR-0009.
  - RV-8: corrections schema IS in architecture.md §5.1; CorrectionsPage is a
    planned component.
  - RV-9: cited phrase not present in architecture.md §2.3.
  - RV-12: pre-existing non-2xx throw in useAppData.ts; out of feature scope →
    risk-accepted (carried forward).
  - RV-13: `.github/actions/validate.yml` + `npx dating` are hallucinated; no
    `.github/` exists in the repo.
- Risk-accepted: (none new for this feature, plus RV-12 above. The 12 findings
  risk-accepted in the 2026-10-16 UK-wide run — 8 QA + 4 Security, listed in
  the Notes below — carry forward and remain risk-accepted.)
- Minor from post-fix review 3a: NF-1…NF-6 — ALL resolved, lead-fixed
  2026-10-21 (prose/consistency class; no design change): NF-1 architecture.md
  §7 rebuilt into a clean 6-row acceptance table; NF-2 GLOSSARY outside-
  catchment/unassigned/Wisdom wording; NF-3 ADR-0009 stray Chinese char;
  NF-4 ADR statuses (0006/0007/0008 → accepted; 0001 → superseded by ADR-0006);
  NF-5 architecture.md §4.1/§4.2 mobile wording made concrete; NF-6 ADR-0007
  catch-all claims → client-side `useRoute()` fallback wording. Plus
  standardised hospice count to ~155.

## Notes

- 2026-10-24: **G1 + G4 closed; G6 re-run green after the G4 tree change.**
  G1: all cycle changes committed in `e4b8503` (48 files) and the G4 change in
  `557e553` (2 files); remote `origin` = github.com/TheJamLabs/HospiceInfo.git;
  `main` pushed (both commits). GitHub GH001 warning on push — `data-raw/uk-
  land.json` 54.56 MB > recommended 50 MB — accepted as-is (LFS would force a
  history rewrite that breaks the committed SHA-256 provenance anchor); not a
  push failure. G4: `data-raw/site-config.json` now carries operator
  "The Jam Labs Ltd" / contact "hello@thejamlabs.com", mirrored in
  `src/lib/siteConfig.ts` (ADR-0009 lockstep); grep `hospiceinfo\.example`
  repo-wide → no matches. G6 re-run after the G4 tree change (all green):
  `npm run build` exit 0; `validate-tessellation.mjs` exit 0 (155 catchments,
  1 known empty-cell warning `en-1-17708902164` "Hospice at Home", coverage
  100.00%, worst sea leak 0.000117); `validate-corrections.mjs` exit 0.
  Remaining human gates: **G5** (8-point mobile live pass, `.agents/qa.md`
  §A6 — human phone only) and **G7** (fetch-script live verification + re-
  fetch + rebuild chain, environmental — when an Overpass mirror has
  capacity; diagnosability guard already in-tree). G6 stays the
  "re-run after any tree change" gate; the final pre-deploy run is the one
  above.
- 2026-10-24 (09:21): **G7 — second delayed notification (bg_68ac9ea6)
  resolved; the Oct-23 run pair is now identity-confirmed. No overwrite.**
  Notification claimed exit 0 with log `.qwen/tmp/fetch4.log`. On-disk
  verification: fetch4.log last-write 23/10 21:44 (coincides with
  uk-land.json's last-write 23/10 21:44:30) and its tail records "wrote
  data-raw/uk-land.json (22999 polygon(s), 55871.0 KiB)" — the landed repo
  version. `data-raw/uk-land.json` unchanged (57,211,893 B, SHA-256
  `038A1635F65D8AE28E8B6388E3EAEA1D29D5757FCB4C8B78C7C06CEC82653819`,
  matches data/README.md). This identity-confirms the Oct-23 pair
  (previously reconstructed from mtimes): bg_10309113 → fetch3.log →
  21,468 polygons (21:28, superseded); bg_68ac9ea6 → fetch4.log → 22,999
  polygons (21:44, landed). Both completion notifications were delayed
  deliverables arriving in this session. No state change; G7 unchanged.

- 2026-10-24 (09:17): **G7 — the "uk-land.json overwritten" alarm is
  resolved: no overwrite; the alarm source is an Oct-23 remnant log, not this
  session.** A task notification (bg_10309113, exit 0, log
  `.qwen/tmp/fetch3.log`) arrived this session; its log tail claims "wrote
  data-raw/uk-land.json (21468 polygon(s), 47855.6 KiB)" — conflicting with
  the in-repo file (22,999 polygons, `038A1635…3819`), which raised the
  overwrite alarm. On-disk verification this turn:
  (1) `fetch3.log` last-write 2026-10-23 21:28:29 — an Oct-23 remnant, not
  this session's output;
  (2) `data-raw/uk-land.json` last-write 2026-10-23 21:44:30, 57,211,893
  bytes, SHA-256 `038A1635F65D8AE28E8B6388E3EAEA1D29D5757FCB4C8B78C7C06CEC82653819`
  unchanged, matching `data/README.md`;
  (3) exactly one `uk-land.json` exists on disk (repo + user profile
  globs). mtime reconstruction of Oct 23: a ~21:28 run (35,534 elements via
  overpass-api.de; its log is fetch3.log) wrote 21,468 polygons, then a 21:44
  run (39,432 elements; 22,999 polygons) superseded it — the landed,
  recorded repo version. bg_10309113 is one of those Oct-23 runs; its
  notification arriving this session implies delayed notification delivery
  (inference — delivery timing is not directly verifiable). Nothing was
  written this session; no state change. G7 remains as recorded (malformed-
  point guard in-tree; re-fetch chain human-gated).

- 2026-10-24: **G7 re-framed — the re-fetch crash on kumi is a script bug,
  not a mirror rejection. Diagnosability guard landed; live re-verification
  still mirror-gated.** A background re-fetch run (`node
  scripts/fetch-uk-land.mjs`, bg_0445a1b2, pid 21696, exit 1) reached
  **kumi** and printed `fetched 35476 coastline elements` — the "all
  mirrors reject the committed query" picture in the G7 note below no
  longer holds (kumi serves the query when it has capacity). The run then
  died in the script's own post-fetch geometry processing: `fetch failed:
  Cannot read properties of undefined (reading 'toFixed')` — localised to
  `key(pt)` (`pt.lon.toFixed(6)`): at least one geometry point in kumi's
  response lacks a numeric `lon`/`lat`. No file was written (the crash
  precedes the write step); the landed `data-raw/uk-land.json` provenance
  anchor is intact (SHA-256 `038A1635F65D8AE28E8B6388E3EAEA1D29D5757FCB4C8B78C7C06CEC82653819`,
  57,211,893 bytes — re-hashed 2026-10-24, see note below). Live follow-up
  probe re-sending the committed query to kumi (2026-10-24) returned 504
  `request_read_and_idx::timeout` / "too busy" — kumi is at capacity again,
  so live re-sampling / re-verification remains mirror-gated. One
  diagnostic pass only, no retry (feed-unavailable rule). Script change
  (diagnosability only, no data-behaviour change): `key()` in
  `scripts/fetch-uk-land.mjs` now throws with the offending point's JSON
  when `lon`/`lat` is missing/non-numeric — skipping such points would
  open rings and drop islands silently (ADR-0006), and the crash already
  prevents a partial file from being written; the next live run prints the
  point's shape, and the real fix is based on that sample. Command (human,
  networked machine, when a mirror has capacity):
  `node scripts/fetch-uk-land.mjs`. G7 is now two halves: (a) mirror
  capacity — environmental, intermittent (kumi serving as of 2026-10-24);
  (b) malformed-point crash — code-side, diagnosability guard in place,
  live sample outstanding. Remaining human gates: **G1** (commit all
  changes), **G4** (real operator name/email), **G5** (mobile live 8-point
  pass), **G6** (final build + all validators green), **G7** (fetch-script
  fix + live verification, re-fetch + rebuild chain).
- 2026-10-24: **G7 recorded (carry-over, human-gated) — `fetch-uk-land.mjs`
  query rejected by all reachable mirrors; fix + live verification deferred.**
  A background re-fetch run (`node scripts/fetch-uk-land.mjs`, bg_ee22ee6d,
  pid 23568, exit 1) returned `status 400 — line 1: parse error: Unknown query
  clause` on all four mirrors (de additionally 502 at-capacity earlier in the
  run) — a parse-stage rejection of the committed query
  `[out:json][timeout:600]; nwr[natural=coastline](49.5,-11.0,61.5,2.0); out
  geom;`, not a capacity failure. Live-confirmed later on 2026-10-24:
  `scripts/probe-overpass.mjs` against de returned the same `Unknown query
  clause` parse 400 on one barebox form (its two sibling de probes returned
  the 502 at-capacity notice) — the current OSM3S build is actively
  rejecting the clause; not an artifact of mirror saturation. Live clause
  bisection is not possible as of 2026-10-24: mirrors saturated (a 6-form probe on overpass-api.de — including
  a trivial `out count` on a tiny box — gave 5× client timeout at the 20 s cap
  and 1× 502 "intended for browser-based and human-operated tools"). Per the
  feed-unavailable rule, one diagnostic pass only (probe file deleted); no
  edits to the committed script, since a fix cannot be live-verified while
  mirrors are saturated. James's decision (2026-10-24): log as carry-over
  gate **G7** — when mirrors have capacity, fix the query and live-verify the
  documented re-fetch chain (`docs/MAINTENANCE.md` / `data/README.md` name
  `node scripts/fetch-uk-land.mjs`). **G2 stays done**: landed
  `data-raw/uk-land.json` re-hashed 2026-10-24 — SHA-256
  `038A1635F65D8AE28E8B6388E3EAEA1D29D5757FCB4C8B78C7C06CEC82653819`
  (57,211,893 bytes) unchanged; only the maintenance re-fetch command is
  affected. Any future re-fetch is a rebuild event: re-pin the SHA-256 in
  `data/README.md`, build ×2 byte-identical, `validate-tessellation.mjs`
  green. Remaining human gates: **G1** (commit all changes), **G4** (real
  operator name/email), **G5** (mobile live 8-point pass), **G6** (final
  build + all validators green), **G7** (fetch query fix + live verification).
- 2026-10-23: **G2 done — land mask landed, verification chain fully green.**
  `data-raw/uk-land.json` on disk (SHA-256
  `038A1635F65D8AE28E8B6388E3EAEA1D29D5757FCB4C8B78C7C06CEC82653819`, 22,999
  polygons; 8 reference cities incl. Ireland in-mask). First build after
  landing CRASHED in `polygon-clipping`:
  "Infinite loop when putting segment endpoints in a priority queue (queue
  size too big)" — root cause: the mask's 2,642,531 segments ⇒ 5.29M unique
  ring endpoints exceed the clipper's 1,000,000-endpoint priority-queue cap
  (scale, not degeneracy). Fixed deterministically in new shared
  `scripts/land-mask.mjs`: Douglas–Peucker on load, fixed tolerance 0.001°
  (≈ 110 m), rings pivoted at lexicographic-max vertex, <3-pt rings dropped
  (17,684 micro-fragments) + per-cell bbox prefilter (exact — disjoint land
  contributes nothing to intersection/difference). 22,999 → 5,315 polygons,
  ~2.6M → 87,696 segments, clip ≈ 0.8 s. Build AND validator share the
  module (ADR-0006 self-consistency preserved); the raw file is NEVER
  rewritten, so its SHA-256 stays the provenance anchor and rebuilds are
  byte-identical. Raising POLYGON_CLIPPING_MAX_QUEUE_SIZE rejected (155
  heavy full-mask sweeps per build). Verification chain (all green):
  (1) `npm run build-data` ×2 exit 0, byte-identical — hospices
  `fced8491…a1af7` / practices `ff24599d…a68d` / shops `7e81df4c…d9f79`
  unchanged vs pre-land baseline, catchments `f9bf1cde…39d2f`
  changed-as-expected (box rect → coastline); (2) `validate-tessellation.mjs`
  exit 0 — sea leak 0.000390 deg² total (worst cell 0.000117), coverage
  100.00% (42.1099/42.1090 deg²), pairwise overlap 0.0002 deg² (Wisdom
  duplicate), 1 empty cell, 0 slivers; (3) QA §A1 vertex-level coastal
  spot-check: 85,602 vertices checked, 78,501 on/within-tolerance of coast,
  **0 violations** (full results in qa.md §A1). Docs updated: `data/README.md`
  provenance row + current-state paragraph (in-memory DP simplification);
  ADR-0006 addendum "Build-time simplification (2026-10-23)" with root cause
  + rejected alternatives. Data-quality note (risk-accepted, pre-existing,
  non-blocking): Wisdom Hospice, Rochester ME1 2NU — two CQC location records
  (en-1-221575490 + en-RYY002, identical coords) for one site → residual
  0.0002 deg² pairwise overlap; surface to James with the G1 commit.
  Remaining human gates: **G1** (commit all changes), **G4** (real operator
  name/email), **G5** (mobile live 8-point pass), **G6** (final build + all
  validators green).
- 2026-10-23: G2 (human land fetch) in flight — script hardened. Two
  grammar flaws in the Overpass query, both fixed in
  `scripts/fetch-uk-land.mjs`: (1) invalid `bbox:` element-filter argument
  → area-object box idiom (prior session); (2) a bare `natural=coastline(area.a);`
  filter — every OSM3S build requires an element-type prefix on each
  statement, observed as `Unknown type "natural"` on all four mirrors →
  fixed to `nwr[natural=coastline](area.a);out geom;`. Also: `504` added to
  the retryable status set and kumi's `request_read_and_idx::timeout` /
  "too busy" wording classified as cap-reached → next mirror (kumi returned
  504 with that runtime message on the 2026-10-23 run; de returned 200 with
  0 elements — probe `scripts/probe-overpass.mjs` (temporary) isolates which
  half is empty). As of ~16:10 UTC all volunteer mirrors saturated (de
  502 at-capacity, kumi 504). G2 still blocked on a healthy mirror; the G2
  verification chain (SHA-256 in data/README.md → build ×2 byte-identical →
  `validate-tessellation.mjs` → qa.md §A1 spot-check) runs once
  `data-raw/uk-land.json` lands.
- 2026-10-22: Stage 10 (Hindsight) done (lead takeover). Both Hindsight
  sub-sessions reported `stopReason: timeout`; sub-session #1 nonetheless left
  valid on-disk work (3 ingests + a full `.agents/hindsight.md` review) — RQ-1
  verified on disk. Lead then applied Wave 2: five per-page `Correction:`
  ingests (Component map, Conventions and patterns, Core concepts, Initiatives
  and enhancements, Key decisions and rationale) via `hindsight_ingest_document`,
  the sanctioned correction mechanism (newer facts supersede stale pages on
  future retrieval). Bank now carries 8 correction/superseding documents; all
  facts verified on disk before ingest. Tooling gap found and recorded:
  `update_knowledge_pages` / `delete_knowledge_pages` do not resolve in any
  session registry on this machine (lead's own registry checked) — page-level
  rewrites of the 5 stale curated pages are HELD for a human with the Hindsight
  console (cosmetic; retrieval is already corrected). Sync is background
  (2 active ops, 3 commits pending deepening) — pages re-flow asynchronously.
  `.agents/hindsight.md` overwritten with the full review (Diagnoses / Fixes /
  Destructive ops held / Remember-for-next-time). Dispatching the terminal
  Reporter (T).
- 2026-10-22: Stage 9 (Documentation) done (lead inline). Deliverables on
  disk: SEC-F1 four-part fix (`src/pages/LegalPage.tsx` rewritten OSM +
  Public registers sections; `data/README.md` ODbL line on the
  `uk-land.json` row); root `README.md` currentised (snapshot date
  2026-10-22, 9,564 practices total, "Pages" section listing all seven hash
  routes, Cloudflare Pages deploy block; removed the orange-squares and
  "unassigned in the panel" claims — public-safe, A3); `docs/MAINTENANCE.md`
  gained a "Deploy (Cloudflare Pages)" section (procedure, pre-publish gate
  G1–G6, Pages-deployment rollback). Verification: `npx tsc -b` +
  `npm run build` exit 0 (fresh dist); grep "OS Open Data|orange|unassigned
  in the panel" in `src/` → no matches. Dispatching Stage 10 (Hindsight).
- 2026-10-22: Stages 6 and 7 closed. QA sub-session died (timeout, zero
  writes) — lead ran the gate inline: **QA PASS with 2 Blocking findings**
  (F-1 public-safe wording leak; F-4 CorrectionsPage bare-array parse, the
  latter arriving via Security's report as a non-security observation routed
  to QA). Both fixed in rework rounds 1–2 and re-verified
  (`tsc -b` + `npm run build` both exit 0, fresh dist). The Security
  sub-session also died (timeout) but its artifact on disk is the genuine
  2026-10-22 report — lead re-verified it: **PASS, 0 Blocking**; SEC-F1
  (ODbL mis-attribution in `LegalPage.tsx` L48–53) must be fixed by the
  Docs stage before publish. Carried to human (unchanged): A1 full clip
  gate (land fetch on a networked machine + byte-identity + tessellation
  validator + coastal spot-check, procedure in qa.md §A1 remainder) and the
  8-point mobile live pass (qa.md §A6). DevOps (Stage 8) dispatched next.
- 2026-10-22: Stage 5 (Coding) done — `.agents/implementation.md` final
  (all 37 rows): 33/37 pm items done on disk; 1.2 BLOCKED on human land
  fetch (`node scripts/fetch-uk-land.mjs` on a networked machine → commit
  `data-raw/uk-land.json` + SHA-256 in data/README.md); 1.3/1.4
  code-done, validation blocked on 1.2 (fail-fast behaviour verified; the
  two-run byte-identity ritual + validator pass are QA's after the file
  lands). Stage-5 validation green: `npx tsc -b` clean, `npm run build`
  success (147 modules, fresh dist), `node scripts/validate-corrections.mjs`
  exit 0, `node --check` ×3 (add-correction / validate-corrections /
  fetch-uk-land), `npm run build-data` fails fast with the ADR-0006 message
  (exit 1, by design — land file absent). No git commits (Coding rule).
  QA + Security dispatched in parallel (stage 6/7 rows will flip as they
  report).
- 2026-10-21: Stage 4 (PM) done — `.agents/pm.md` (8,528 B, 115 lines):
  37 items across the 6 feature areas (1.1–1.5 clip, 2.1–2.4 tooltips,
  3.1–3.5 public-safe, 4.1–4.8 feedback+corrections, 5.1–5.10 pages/config,
  6.1–6.5 mobile), each with verified file paths, a "Done when", plus
  dependency order, explicit non-goals, and a QA checklist mapped 1:1 to the
  six acceptance items. Lead-verified on disk. Dispatching Stage 5 (Coding).
- 2026-10-21: Stage 3a done — post-fix Reviewer `.agents/review.md` (8,005 B):
  verdict CHANGES REQUIRED, 6 Minor (NF-1…NF-6), 0 Blocking; explicitly
  confirms all 8 prior fixes (RV-1,2,4,5,6,7,10,11) with file/line evidence.
  All 6 Minor are prose/consistency — lead fixed them directly (no 2nd
  Architect rework round; Architect-Reviewer gate round count stays 1 of 2).
  Dispatching Stage 4 (PM): `.agents/feature.md` → concrete work list; model
  qwen-coding.
- 2026-10-21: Stage 0 done (feature.md + ledger, replacing the completed
  2026-10-16 UK-wide run's artifacts). Grill session resolved: feedback =
  email + public corrections log; operator = named individual with
  placeholder name/email; hosting = Cloudflare Pages; coastline = OSM.
  Dispatching Research.
- 2026-10-21: Research done — `.agents/research.md` overwritten with the
  2026-10-21 feature findings (clip slot build-data.mjs L160/L172–179/L233,
  validator re-expression, 8 public-safe surfaces, Bootstrap JS missing →
  modal dead, no router → corrections.json must be page-local + committed
  stub, mobile CSS facts, site-config single-source design, corrections
  plumbing, OSM/Overpass land file ODbL). 10 risks (R1–R10) + 10 open
  questions (OQ1–OQ10) handed to the Architect. Architect dispatched.
  Scope summary (6 acceptance incl. mobile): (1) coastline-clip =
  post-union intersection with committed OSM land polygon, ADR-0006 reverses
  ADR-0001 box-only; (2) tooltips show assigned hospice for shops/GPs;
  (3) public-safe = hide-not-delete across 8 surfaces; (4) feedback = mailto
  + public corrections log from committed corrections.json; (5) About/legal
  pages + named-individual placeholder operator config; (6) mobile verified;
  out-of-scope: no backend/forms/analytics/auth, no actual corrections
  applied, Wales/NI data gaps remain.
- 2026-10-21: First Architect agent stopped before writing anything; resuming
  it failed on history size, so a fresh Architect agent was relaunched with a
  self-contained brief.
- 2026-10-21: Stage 2 done — `.agents/architecture.md` (hash routing per
  ADR-0007, Bootstrap JS per ADR-0008, site config per ADR-0009, canvas
  markers, corrections flow, public-safe surfaces) + ADR-0006 (land mask,
  reverses ADR-0001 box-only). Reviewer dispatched.
- 2026-10-21: Stage 3 done — CHANGES REQUIRED, 13 findings (RV-1…RV-13).
  Lead verified each on disk: 4 blocking (RV-1, RV-2, RV-7, RV-11), 4 minor
  (RV-4, RV-5, RV-6, RV-10), 5 dropped with reasons (RV-3, RV-8, RV-9,
  RV-12, RV-13; see Open findings). Fresh Architect rework agent dispatched
  (round 1 of 2) to fix architecture.md + ADR-0006/0007/0008; fresh Reviewer
  post-fix to follow.
- 2026-10-21: Stage 2a done — lead verified all 8 rework fixes on disk
  (RQ-1): RV-1 catch-all claim corrected (ADR-0007 + architecture.md); RV-2
  bootstrap.esm.js (existence confirmed in node_modules); RV-4 schema mirror;
  RV-5 Voronoi extraction point L160-233 (ADR-0006); RV-6 preferCanvas;
  RV-7 all 3 public-safe surfaces (architecture.md §5); RV-10 slivers/empty
  non-fatal + same land file; RV-11 island coverage note. Lead then fixed 3
  residual prose stubs (ADR-0006 orphan fragment + duplicated Consequences
  bullet; two stale catch-all sentences in ADR-0007). Fresh post-fix Reviewer
  (3a) dispatched.
- Subagent definitions in `~/.qwen/agents/` use `qwen-coding` (the
  `qwen3.8-flash` id 404s on this machine; `qwen-coding-small` 404s too).
- Read-only stages (Research, Reviewer, Reporter) never modify the working
  tree; the lead verifies each artifact on disk before proceeding (RQ-1).
- Najee-friendly(shell): single commands only (no compound syntax) —
  daemon shell guard.
- Carried-forward risk-accepted findings from the 2026-10-16 run (for
  reference; detail in the prior run's qa.md/security.md, which this run
  replaces): QA-1 9 OSM-gap postcodes → 12 unassigned practices; QA-2 shops
  outside catchment = 21; QA-3 Basildon degenerate zero-area cell;
  QA-4 "Wisdom Hospice" 0.0002 deg² sliver; QA-5 xlsx@0.18.5 3 npm vulns
  (devDep); QA-6 3 human-blocked fetches → NI/Wales/SC-practice
  placeholders; QA-7 stale index.html <title>; QA-8 Methodology wording;
  SEC-1/SEC-2 dev-only toolchain advisories; SEC-4 ODbL attribution missing
  in data/README.

## Bugfix — "map not rendering on desktop" (2026-10-24)

### Objective

Fix the reported symptom: the map does not render on desktop. Done when
`.agents/qa.md` reports **PASSING** (regression test run and passing; all
prior checks green; no regressions), per the bugfix skill.

### Scope

- Minimal fix only. No refactoring, no new runtime dependencies.
- Inclusive of: the defect, its regression test, and any test-runner
  bootstrap only if it is the minimal path to a runnable regression test
  (to be surfaced as a risk-accepted note if added).

### Stage ledger

| # | Stage | Artifact | Status |
|---|-------|----------|--------|
| 0 | Intake | `.agents/bug.md` + this section | done |
| 1 | Diagnosis (research agent) | `.agents/diagnosis.md` | done |
| 2 | Root cause (architect agent) | `.agents/root-cause.md` | done |
| 3 | Fix (coder agent) | fix + regression test | done |
| 4 | QA (qa-engineer agent) | `.agents/qa.md` | done |
| 5 | Hindsight (hindsight agent) | `.agents/hindsight.md` update | done |

Rebuild rounds: 0 of 2.

### Lead notes

- 2026-10-24: Intake written (`.agents/bug.md`). User report is one line:
  "map not rendering on desktop" — no environment/browser/details. Lead
  pre-scan (read-only): `.app` in `src/styles.css` is `display:flex` with
  **no `flex-direction`** (defaults to `row`), so on the map route
  `AppShell`'s header/main/footer lay out side-by-side; `.app-map` has
  `min-width: 0` and its content is absolutely positioned, so at typical
  desktop widths the map column is squeezed to zero width. Hypothesis only —
  Research must reproduce/verify with evidence before Stage 2. Layout last
  changed by `e4b8503`; no live desktop pass has ever run (G5 mobile-only,
  open).
- 2026-10-24: Stage 1 PASSED — `.agents/diagnosis.md` verifies the
  hypothesis: `flex-direction: column` was explicitly removed from `.app`
  in `e4b8503` (present in `dc3cf4d`), so the AppShell header/main/footer
  form a horizontal row; static derivation puts the map column at
  0–120px at 1366–2560px viewports. Alternatives (data-load, Leaflet init,
  z-index, height chain, mobile-CSS leak, Bootstrap override) ruled out
  with citations. Open user questions (URL/browsers/screenshot/console)
  logged in the diagnosis for confidence, not gate. Dispatching Stage 2.
- 2026-10-24: Stage 2 PASSED — `.agents/root-cause.md` re-verifies the
  diagnosis (7 claims, each on disk) and finds the decisive nuance the
  diagnosis missed: **the `.app` class is shared by two nested elements** —
  the outer shell (`AppShell.tsx:21`, needs column: header/main/footer) and
  the inner map container (`App.tsx:108`, needs row: panel left / map right).
  A one-line `column` fix would shrink the inner container to a 341px
  desktop sliver and zero the mobile bottom sheet. Lead spot-checked the
  DOM claim directly (both `div` elements confirmed). Fix = two CSS
  declarations, exact rule text in root-cause.md section 4:
  (1) `flex-direction: column;` in the `.app` rule;
  (2) new rule `.app-body > .app { flex: 1 1 auto; flex-direction: row; }`
  (selector uniquely matches the inner — its direct parent is
  `main.app-body`; specificity 0,2,0 wins; local CSS import order beats
  Bootstrap). Regression test = dependency-free `scripts/check-map-layout.mjs`
  (`npm run check:layout`): parses the CSS rules (brace-depth state machine,
  no substring) and asserts the complete flex-direction contract
  {`.app`: column, `.app-body > .app`: row, `.legend-grid`: column}, so any
  future override anywhere fails it. Risk-accepted note (carried to QA): the
  check asserts CSS source, not rendered geometry — gate G5 remains the live
  verification. Dispatching Stage 3 (coder), exact spec of root-cause.md
  sections 4-5; scope fixed at 3 files: `src/styles.css`,
  `scripts/check-map-layout.mjs`, `package.json`.
- 2026-10-24: Stage 3 PASSED (lead-verified on disk). `src/styles.css`:
  `flex-direction: column;` added to the `.app` rule + the new
  `.app-body > .app { flex: 1 1 auto; flex-direction: row; }` rule, exactly
  per root-cause.md section 4 (checked by reading lines 11-29); `scripts/
  check-map-layout.mjs` implements the section 5.2 contract (brace-depth
  state machine, assertions A/B/C, node:fs/path/url only); `package.json`
  gained only the `check:layout` script. Lead re-ran `npm run check:layout`
  independently: exit 0, `check-map-layout: OK`. `git status --porcelain`:
  only `M src/styles.css`, `M package.json`, `?? scripts/check-map-layout.mjs`
  (+ stage artifacts) — no stray changes. Coder's negative-mutation runs
  (both directions exit 1, restored byte-for-byte) and `npm run build`
  exit 0 (147 modules) recorded in `.agents/implementation.md`. Dispatching
  Stage 4 (QA) — independent re-run of the full validation matrix +
  regression-scope check.
- 2026-10-24: Stage 4 PASSED (lead-verified on disk: `.agents/qa.md`
  verdict PASSING). All 7 QA checks PASS, zero Blocking. QA independently
  re-ran the full matrix: diff scope clean (styles.css +9, package.json +1,
  new script only); positive check exit 0; NEGATIVE 1 and NEGATIVE 2 each
  exit 1 with the expected assertion failure, each restored byte-for-byte
  (git-apply patches proven byte-exact, diff back to exactly +9); tree clean
  after each restore; G6 `npm run build` exit 0 (147 modules). G5 live
  smoke remains the open human gate (no browser in the QA environment;
  expected visuals recorded in qa.md from root-cause §4.3). Risk-accepted:
  F-1 static-vs-geometry check; F-2 abbreviated (non-normative) comment;
  F-3 optional argv superset. No rework loop needed (rounds remain 0 of 2).
  Dispatching Stage 5 (hindsight).
- 2026-10-24: Stage 5 done (lead-verified on disk: `.agents/hindsight.md`
  records the shared-class trap with file/line citations, the two-line fix,
  the `npm run check:layout` regression guard, G5 open as the human gate,
  and the 5 open user questions; lead corrected a garbled header label).
  All stages done, zero Blocking findings, 0 of 2 rework rounds used.
  PIPELINE COMPLETE — final one-screen report delivered in chat.
