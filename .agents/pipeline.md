# Pipeline: Make the map public-ready

## Cycle 3 (active, started 2026-10-29): name, SEO/crawlability, data gaps, logo

Goal: four James-requested improvements to the live site (James, 2026-10-29):
1. **Name** — "Hospice Finder UK" across title, app header, manifest and
   meta/OG strings (slug `hospiceinfo` unchanged).
2. **SEO/AI-friendliness (full prerendering)** — real paths for the info
   pages, one static page per hospice (~161 URLs), title/canonical/description
   + OG/Twitter + JSON-LD on every prerendered page, `sitemap.xml` +
   `robots.txt`.
3. **Data gaps (2)** — Wales hospices (0 → real count; CIW re-request is a
   human gate, alternative register to be researched); 12 unplaced NI
   practices (9 BT postcodes — no OSM/Nominatim coverage; alternative
   geocoder).
4. **Logo** — refine the heart+pin mark (`public/logo.svg`); keep
   recognisable continuity, no new concept.

Scope spec, acceptance criteria and human-gate definitions:
`.agents/feature.md`.

Cycle 3 human gates:
- H3-1: James re-sends/escalates the CIW data request (browser) once Research
  confirms the exact text + channel.
- H3-2: OS Places API key (free tier) for the NI BT postcodes, if the chosen
  geocoding path needs one.
- H3-3: James's browser fetch of a Wales alternative source (if Research
  finds one that needs a login/authenticated session).

Done when (Cycle 3): all ten stage artifacts for this cycle exist, no open
Blocking findings (resolved or risk-accepted), `npm run build` green
(`tsc -b` + Vite, re-run byte-identical), `node scripts/validate-tessellation.mjs`
exits 0, the Reporter's one-screen report is delivered in chat, and this
ledger is current.

## Cycle 2 (closed 2026-10-26): pre-launch completion

Goal: ship-ready state for public launch, per James's five 2026-10-24
pre-launch items:
1. Complete Scotland, Wales and Northern Ireland nation data: three human
   browser fetches with scripts already ready (RQIA XLSX → NI hospices,
   `data-raw/rqia-regulated-services-2026-06.xlsx`; data.wales DataMap
   layers `geonode:gpmainsites_ogl` + `geonode:gpbranchsites_ogl` → Wales GP
   practices; NHS Scotland Spatial Hub `gp_practices-is` GeoJSON → Scottish
   GP practices); each lands via the documented extract → geocode →
   build-data → validate-tessellation → build chain in `data/README.md`.
   Wales hospices: Care Inspectorate Wales data request pending — PROCEED
   as a documented pending gap (James, 2026-10-24); the extract script is
   already wired for the reply.
2. Map performance: profile first (James's symptom: "not sure / a mix");
   fix the measured costs — per-render O(n²) `hospices.find` across ~9.6k
   practices and the ~9.7k canvas layers — including an evidence-based
   decision on point restriction/downsampling.
3. Logo + favicon: heart + map-pin mark (James, 2026-10-24), wired into
   `index.html` (no favicon exists at all today) and the app header.
4. Hospice list ordering + filtering: replace raw-JSON order with a sensible
   default (alphabetical) plus sort options and richer filtering.
5. User flows: landing "start here" card — postcode → your GP practice →
   your catchment hospice — with patient / fundraiser / clinician journey
   surfaces (James chose landing card over dedicated pages, 2026-10-24).

Cycle 2 human gates:
- H1: James fetches the 3 browser files above (scripts ready; lead runs the
  extract chains once files land). **Re-scoped 2026-10-24:** Scotland
  **landed (911 practices)** — remaining fetches are 2, both on re-sourced
  URLs awaiting James's browser confirmation of exact URL + as-of date:
  NI hospices → Public Regulation Authority register (RQIA's 2024 successor;
  `publicregulation.gov.uk` is dead), Wales GP practices → new DataMap portal
  (candidate `data.gov.wales`; `data.wales` is a holding page). Wales
  hospices remain the CIW-email documented gap (proceed, per James).
- H2: Cycle 1 gates G5 (8-point mobile live pass, `.agents/qa.md` §A6) and
  G7 (Overpass re-fetch when a mirror has capacity) remain open and
  carry over as pre-launch gates.

Done when (Cycle 2): all ten stage artifacts for this cycle exist, no open
Blocking findings (resolved or risk-accepted), G6 re-run green after every
tree change (final run after the data landings), the Reporter's one-screen
report is delivered in chat, and this ledger is current.

## Cycle 1 (closed 2026-10-24): Make the map public-ready

Goal: Public release of the UK-wide hospice catchment map — coastline-clipped
catchments, hospice-assignment tooltips, public-safe UI, feedback +
corrections mechanism, About/legal pages, verified mobile. Cloudflare Pages.

Done when: all ten stage artifacts exist, no open Blocking findings
(resolved or risk-accepted), the Reporter's one-screen report is delivered
in chat, and this ledger is current. Scope: `.agents/feature.md`.

## Stage status — Cycle 3 (active)

| # | Stage | Status |
|---|-------|--------|
| 0 | Init | done (2026-10-29) |
| 1 | Research | done (2026-10-29: research.md 475 L — 1 Blocking design gap (hash-redirect guard R1), 7 risks, 10 open questions; recommended: deterministic `scripts/prerender.mjs` in the build chain, HealthCareBusiness JSON-LD, manual NI pinning via override file, one-off committed OG PNG; resumed after compaction; lead disk-verified) |
| 2 | Architect | done — rework round 1 (F1/F2/F3/F5 lead disk-verified 2026-10-29: ADR-0022 + arch §6 now state "the Coding stage replaces the full contents of `public/logo.svg`" (applied-claim deleted, acceptance intact); F2 — R13/R14 replaced with "research §3.4 legal guard (unnumbered, risk list ends at R13)" in arch §3.4 + §8, §8 risk row now `R10 (research)`; F3 — anchor set `dc261185 e11322ba 2a87a374 5628d8f7` in 3 places, `docs/build-log.md` = explicit Coding deliverable (check 1 + Q5 + done-when), zero `038a1635` in architecture.md; F5 — ADR-0023 surface #3 = `public/manifest.webmanifest`; GLOSSARY applied-claim + uk-land SHAs in other artifacts preserved; re-dispatch sub-session first-turn timed out AFTER edits landed — disk state is ground truth; original 2026-10-29 deliverable lead disk-verified: architecture.md 417 L + GLOSSARY 111 L (6 Cycle 3 terms) + ADR-0015..0023, 7 decisions) |
| 3 | Reviewer | done — post-fix verification (rework round 1) **PASS** (2026-10-29: review.md 165 L lead disk-verified — verdict line 144 now "PASS (supersedes original FAIL)"; addendum L152–164: F1 RESOLVED (arch §6 L328 + ADR-0022 L18 assign logo application to Coding; acceptance `grep -c "circle" → 1` intact; `public/logo.svg` on disk still old mark = Coding's task), F2/F3/F5 VERIFIED with line citations, F4 stays risk-accepted (DevOps owns `docs/MAINTENANCE.md`), regression sweep clean. Note: reviewer sub-session first-turns timed out repeatedly, the last AFTER its edit landed — disk is ground truth; a verified stage is not re-dispatched. Original: review.md 151 L — Verdict FAIL, 1 Blocking (F1, design-level → Architect) + 4 Risk-accepted (F2–F5); D1–D6 ALL PASS on (a)–(d), D7 PASS except (c) via F1; Q1–Q5 ALL ACCEPT (Q5 carries F3 caveat); R1–R13 / OQ1–10 / H3-1–3 all dispositioned) |
| 4 | PM | done (2026-10-29: requirements.md 222 L / 11,928 B lead disk-verified — Cycle 3 header, in/out scope, W1–W11 + sequencing; W1 SITE_URL (arch §3.7); W2 NI manual-geo `entries: []` + build-data merge + fail-fast + provenance row (arch §5/ADR-0021); W3 `wales-r${i+1}` id fix; W4 zero-dep `scripts/prerender.mjs` → 171 files, invariant 168 `<loc>`; W5 build chain; W6 hash-redirect IIFE (closes R1); W7 SEO/JSON-LD/OG/canonical head rules + no-endorsement guard; W8 `og-image.png` 1200×630; W9 logo.svg 3-element full replacement (acceptance `grep -c "circle"` → 1); W10 rename (8 surfaces, exempt identifier set); W11 `docs/build-log.md` (seed `dc261185 e11322ba 2a87a374 5628d8f7`, append-only); note: PM sub-session 4th first-turn timed out, write landed on disk — disk is ground truth, verified stage not re-dispatched) |
| 5 | Coding | done (2026-10-29: implementation.md 135 L Cycle 3 ledger — W1–W11 all DONE with evidence: W4 zero-dep `scripts/prerender.mjs` (171 emitted, invariant 168==161+7), W5 build chain, W6 verbatim hash-redirect IIFE, W7 head/JSON-LD/sitemap/robots/404, W8 og-image.png 1200×630 (zlib, zero-deps, CRC-verified), W9 logo 3-element (circle=1), W10 8-surface rename (brand hits 0), W11 build-log 2 lines (prefixes `65818ace cc096f17 f7df12fd dd19e8ae`); build ×2 byte-identical dist SHA-256 `e8705777…`; tessellation exit 0; 0 Blocking reported; 0 rework rounds — **lead disk-verified 2026-10-29**: build line, IIFE ×1, logo circle=1, build-log 2L/forward, 169 html + 168 `<loc>` + robots Sitemap line, rename grep 0 |
| 6 | QA | done (2026-10-29: qa.md Cycle 3 report **lead disk-verified** — VERDICT PASS / 0 Blocking; 11 checks all pass; anchor `65818ace cc096f17 f7df12fd dd19e8ae`; 169 html / 171 emitted / 168 `<loc>`; JSON-LD banned-key total 0 across dist; F-QA-1 (aggregate-hash methodology note) + F-QA-2 (NI NBSP source-data fidelity) INFORMATIONAL only; carried F-1/W8/G5/G7 re-confirmed risk-accepted; note: sub-session first-turn timed out on lead side, write landed on disk — ground truth) |
| 7 | Security | **FAIL** (2026-10-29, lead-disk-verified — 1 Blocking: SEC-3-01, `scripts/prerender.mjs` emitted the boot `<script>` unclosed; all 169 emitted pages open=2/close=1; lead impact correction: "blank page" framing overstated — the defect is invalid HTML structure. SEC-3-02 risk-accepted, SEC-3-03 informational). **Rework round 1 of 2 CLOSED — post-fix verification PASS** (lead disk-verified: security.md rework-round-1 section on disk — SEC-3-01 RESOLVED 169 pages 338/338/0, SEC-3-02 hardening landed, SEC-3-03 unchanged, 0 open Blocking) |
| 8 | DevOps | done (2026-10-29 — **lead disk-verified**: `.agents/ops.md` 425 L — Cycle 3 §1–5 complete (what-changed, deploy artifact 181 physical files, pre-publish gates C3-1..C3-10 with measured values, post-deploy §4, rollback §5), Cycle 2/1 sections preserved. History: original sub-session write DID land on disk (mtime 2026-10-28T21:33:46) despite lead-side first-turn timeout; the 2026-10-29 re-dispatch `devops-cycle3` (d169b825) was killed mid-verification by death of daemon PID 55148 and wrote nothing (transcript frozen at first request) — no rework consumed. Lead re-measured every ops.md claim on disk: 181 physical / 169 html / robots 75 B / sitemap 168 loc + 0 lastmod / logo circle=1 / **brand hits 0** (an earlier "1 hit in index.html" was a false positive from the lead's buggy inline probe — definitive case-insensitive file scan of index.html + public/ + src/ + dist/ = 0) / build chain `tsc -b && vite build && node scripts/prerender.mjs` matches package.json) |
| 9 | Documentation | done (2026-10-29 — **lead disk-verified**: `docs/MAINTENANCE.md` 200 L — H1 "Maintenance — Hospice Finder UK", Cycle 3 intro, build-chain line `tsc -b && vite build && node scripts/prerender.mjs → dist/` (169 shells + sitemap + robots, 181 files total), pre-publish gate table C3-1..C3-10 matching ops.md values, git-connected Deploy (ADR-0014), post-deploy curl verification (168 `<loc>` / 75 B robots), rollback story (Pages redeploy / git revert / data re-derivation); `README.md` — H1 "# Hospice Finder UK", build line carries the prerender step. Provenance: sub-session `docs-cycle3` (81dfe1de, qwen-coding-small) first-turn timed out on the lead side but ALL its writes landed on disk (README was updated after the timeout); lead made one cosmetic fix (double-backtick in the MAINTENANCE ops.md pointer). Case-insensitive scan of both files: old-brand phrase "hospice catchment map" hits 0; `node scripts/prerender.mjs` present in both; C3 table complete. No rework consumed) |
| 10 | Hindsight | done (2026-10-30 — **lead disk-verified**: `.agents/hindsight.md` 187 L — Cycle 3 section "## Cycle 3 Hindsight — Completed 2026-10-30" present (What changed / Key decisions / Process lessons / Remaining human gates G5/G7/W8 / Open findings: None Blocking); prior content (Cycle 1 meta + Cycle 2 + Cycle 2.5) preserved byte-for-byte. Provenance: sub-session `hindsight-cycle3` (qwen-coding-small) first-turn timed out on the lead side; Cycle 3 write landed on disk (140→185 L) — no re-dispatch; lead RQ-1 re-measured all section values on disk (171/169/168 `<loc>`/75 B/ADR-0022/0023/G5/G7/W8/None-Blocking present) and applied 5 surgical factual corrections (NI hospices: data chain not "hard-coded in index.html"; OG image: 3,161 B committed `public/` placeholder (ADR-0018) not "3 MiB generated by prerenderer"; ADR-0019: id-is-URL-slug per ADR file, was garbled `http:1min`; build-log: 98 B + 4 anchors + 181 dist files + double-build `e8705777` added; `JSON-LLD`→`JSON-LD` typo). 0 rework consumed |
| T | Reporter | done (2026-10-30: one-screen status report delivered in chat via `stage11-reporter` sub-session; 10/10 stages, 0 open Blocking — SEC-3-01 fixed in Security rework round 1 of 2, post-fix verify PASS; gates G5/G7/W8 carried open — lead relayed to James) |

**Close (Cycle 3):** 2026-10-30 — all 10 stage artifacts complete; 0 open Blocking findings (SEC-3-01 resolved, post-fix verification PASS; I-1/F-1/F-2 risk-accepted); `npm run build` green with byte-identical re-run; `validate-tessellation` exit 0; Reporter one-screen report delivered in chat; ledger current — Done-when satisfied. G5/G7/W8 remain open per ADR-0014; they do not block publication.

## Stage status — Cycle 2 (closed)

| # | Stage | Status |
|---|-------|--------|
| 0 | Init | done (2026-10-24) |
| 1 | Research | done (2026-10-25: Option A risk-accept — §0/§1 canonical + Table A; 22 residual stale markers documented debt, banner in file) |
| 2 | Architect | done (2026-10-25: architecture.md 123 L + GLOSSARY +38 L + ADR-0010..0013, lead disk-verified; 1 factual flag routed to Reviewer) |
| 3 | Reviewer | done (2026-10-26: **APPROVE** — 0 Blocking, 4 Minor lead-fixed on disk (R2-1..R2-4), 5 Dropped; dispatch #1 was no-op, #2 delivered) |
| 4 | PM | done (2026-10-26: requirements.md fresh — 175 L / 14,694 B, 13 W-items + HUMAN-GATED H1a/H1b, verify-only W12/W13; lead disk-verified) |
| 5 | Coding | done (W2–W13 complete, W1 noted QA-owned, W8 recorded-deferred; lead disk-verified 2026-10-26) |
| 6 | QA | done (2026-10-26: **PASS — 0 Blocking**; F-1 risk-accepted carried — `kind='published'`=7 not 20; m1/m2/m4 post-fix + live W5/W7/W10/W11 interactions remain human G5-gated; W8 stride gate awaits G5's m1; delivered by `qa-cycle2-slim` after 4 no-op/stalled dispatches — no fix-verify rounds consumed; lead disk-verified) |
| 7 | Security | done (2026-10-26: **PASS — 0 Blocking**, no design-level; SEC-F1 resolved in Cycle 2, SEC-F2/SEC-F3 risk-accepted carried; 2 Minor header inaccuracies lead-fixed (spurious commit hashes; date)) |
| 8 | DevOps | done (2026-10-26: ops.md 232 L / 14,637 B — deploy-neutral Cloudflare Pages, gate table G5/W8/G7/H1a/H1b with owners+acceptance, 4-step validation+rollback, post-data-landing chain; all script references verified present; lead disk-verified) |
| 9 | Documentation | done (2026-10-26: docs/MAINTENANCE.md + README.md refreshed for Cycle 2 from ops.md/qa.md — gate table, deploy/rollback, data pipeline, pre-launch list; lead copy-fixed ~13 streamliner debris lines incl. a stray completion note) |
| 10 | Hindsight | done (2026-10-26: `.agents/hindsight.md` "## Cycle 2 Hindsight" section appended — changes, ADRs, invariant, process lessons, remaining gates; lead copy-fixed mangled WHAT-CHANGED/WHAT-REMAINS blocks) |
| T | Reporter | done (2026-10-26: one-screen status report delivered in chat via `reporter-cycle2`; 10/10 stages, 0 open Blocking, 5 open gates — lead relayed to James) |

(QA and Security run in parallel after Coding and both must complete
before rework-loop rules apply.)

## Stage status — Cycle 1 (closed)

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
| 7 | Security | done (Cycle 3 report 2026-10-29, lead-disk-verified — **FAIL: 1 Blocking (SEC-3-01)** boot `<script>` unclosed in all 169 dist pages; lead verified 169/169 open/close mismatch on disk. Lead impact correction: report's "blank page" framing overstated — `src`-based module scripts ignore inline raw text, so pages render; the real defect is invalid HTML structure (swallowed `</body></html>`), which fixes are required for the cycle's SEO deliverable. SEC-3-02 RISK-ACCEPTED design-level hardening; SEC-3-03 informational. Prior-cycle SEC-F1/2/3 re-confirmed carried. **Rework: Security gate round 1 of 2 — CLOSED 2026-10-29, post-fix verification PASS** (WF-1 + WF-2 in `scripts/prerender.mjs`; 169 pages 338/338/0; security.md rework-round-1 section lead-disk-verified; 0 open Blocking) |
| 8 | DevOps | done (`.agents/ops.md` rewritten 2026-10-22: Cloudflare Pages deploy playbook, pre-publish gate G1–G6, rollback via Pages deployments; SEC-F1 fix assigned to Docs as G3) |
| 9 | Documentation | done (lead inline; G3 = SEC-F1 ODbL fix applied; MAINTENANCE/README currentised; `tsc -b` + `vite build` green; fringe greps clean — detail in Notes) |
| 10 | Hindsight | done (lead takeover 2026-10-22: sub-sessions reported dead (timeout) but #1's ingests landed on disk — RQ-1 verified; 8 correction docs in the bank, 5 pages corrected; update/delete tools absent on this machine, page-level rewrites held for human — detail in `.agents/hindsight.md`) |
| T | Reporter | done (lead inline 2026-10-22, read-only; one-screen status report delivered in chat; no artifact by design) |

(QA and Security run in parallel after Coding. QA result precedes
DevOps; DevOps' `.agents/ops.md` feeds Documentation. 2a/3a are the
Architect-Reviewer design rework loop, separate from the QA/Security gates.)

## Rework round counts

- Architect-Reviewer gate: 1 (cap 2) — Cycle 1 (2026-10-21); Cycle 3: round 1 of 2
  in flight (F1 design-level, 2026-10-29)
- Coding gate (Cycle 3): 0 fix-verify rounds — W1–W11 single delivery; QA gate PASS
  on first delivery; lead disk-verified 2026-10-29
- QA gate: 2 (cap 2) — F-1 (rework round 1), F-4 (rework round 2); both
  re-verified, no third round
  - Cycle 2: 0 fix-verify rounds — `qa-cycle2-slim` delivered PASS on the first
    substantial delivery (4 prior no-op/stalled dispatches are not round-consuming)
  - Cycle 3: 0 fix-verify rounds — `qa-cycle3` first-delivery PASS (11 checks);
    sub-session first-turn timed out on the lead side, write landed on disk
- Security gate: 0 (PASS first time; the 2026-10-16 stale file was superseded
  by the 2026-10-22 report)
  - Cycle 2: 0 fix-verify rounds — PASS first time
  - Cycle 3: round 1 of 2 — CLOSED 2026-10-29 (SEC-3-01 code-level FAIL;
    WF-1 + WF-2 landed in `scripts/prerender.mjs`; full 5-pt suite green;
    post-fix verification PASS, lead-disk-verified; lead corrected
    report's "blank page" impact to "invalid HTML structure" — see row 7)
- Research recon (Cycle 2): 3 passes — v3 (content-only), v4 (partial, §0 only),
  v5 (partial, §1.2/§1.3; 27 → 22 residual stale markers; first-turn timeout).
  Cap of 2 fix-verify rounds EXHAUSTED 2026-10-25 → escalated; RESOLVED 2026-10-25 via Option A
  (risk-accept — see newest top Note)

## Open findings

- Security gate (Cycle 3, 2026-10-29): **0 open Blocking** — SEC-3-01 RESOLVED:
  code fix DONE + lead-disk-verified (`scripts/prerender.mjs` WF-1 closed the
  boot `<script>`; WF-2 id charset assert folded in; all 169 dist pages
  open=2/close=2 — 338/338/0). Post-fix verification PASS (rework round 1 of
  2; security.md rework-round-1 section lead-disk-verified). SEC-3-02
  RISK-ACCEPTED (hardening landed — id charset assert in fail-fast loop).
  SEC-3-03 informational. Detail: security.md (Cycle 3 + rework-round-1).
- Coding gate (Cycle 3, 2026-10-29): 0 open Blocking — W1–W11 delivered; 0 brand hits;
  lead disk-verified 2026-10-29. Detail: implementation.md.
- QA gate (Cycle 3, 2026-10-29): 0 open Blocking — F-QA-1/F-QA-2 informational only;
  F-1/W8/G5/G7 re-confirmed risk-accepted. Detail: qa.md.
- Research recon (2026-10-25, RISK-ACCEPTED, non-blocking): `.agents/research.md` carries 22 stale
  anchor/count markers + 3 stale F1/F2 Scotland frames (§2/§4.1/§5.2/§8 region), all superseded by
  Table A in the Notes above; a STALENESS NOTICE banner atop the file directs every downstream stage
  to Table A for current values. Carried as documented debt.
- QA gate (Cycle 2, 2026-10-26): 0 open Blocking. F-1 risk-accepted carried —
  `kind='published'` = 7 rows (the panel toggle resolves to the published set;
  the 20 figure is the `curated===true` set, 7 published + 13 approximated;
  documented debt, not a defect). W8 stride gate DEFERRED by design (awaits G5
  post-fix m1). Detail: `.agents/qa.md`.
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

- 2026-10-27 (lead): **Deploy mode changed to git-connected Cloudflare Pages (ADR-0014) — auto-publish on push; the manual-publish-after-gates convention is superseded; G5/W8/G7 remain open verification gates and no longer block publication.**
  Trigger: the first git-connected Pages build failed — "No build command specified. Skipping build step." → Pages deployed the **repository root** (default output dir), so `data-raw/uk-land.json` (54.6 MiB) hit Cloudflare's 25 MiB per-file limit ("Failed to validate assets in the output directory").
  James's choice: **keep git-connected + build config**. Implemented: new `wrangler.jsonc` (repo root; `pages_build_output_dir: "dist"`, `name: "hospiceinfo"`); build command `npm ci && npm run build` to be set in the project settings (dashboard *Settings → Build & deploy*, or `npx wrangler pages project update hospiceinfo --build-command "npm ci && npm run build"`); **ADR-0014** (`docs/adr/0014-git-connected-deploy.md`) records the decision and notes that the manual-publish convention was never ADR-0009 (ADR-0009 on disk is site-config single source).
  `data-raw/` stays committed (ADR-0006/0008); it is excluded from the deployment by the output dir — only `dist/` ships (largest asset 3.14 MiB at the 2026-10-27 build). The ops.md §4 chain (`build-data` ×2 byte-identity, `validate-tessellation`, `npm run build`, `check:layout`) is now a hard pre-push obligation, since every push to `main` auto-publishes. Rollback: Pages dashboard restore, or `git revert <sha>` + push (the push rebuilds and re-publishes).
  Doc updates — **committed `f9f3e15` and pushed to `origin/main` 2026-10-27 (James-approved; 7 files, 173+/58−)**: `ops.md` (intro, §1 git-connected procedure, §2, §4 pre-push chain, §5/§5.1, preserved playbook, pending fetches, risks), `README.md` (pre-launch paragraph, Quick start deploy), `docs/MAINTENANCE.md` (Quick start, Deploy, gates closing, validation + rollback), this ledger, `hindsight.md` (two ADR-0009 misreferences fixed).
  OPEN: that push triggered the next git-connected build — confirm the build command is set in the Cloudflare project settings (the dashboard field may be authoritative over `wrangler.jsonc`); if the build log says "No build command specified" again, set it once in the dashboard (*Settings → Build & deploy*); a green build serving `dist/` confirms the 25 MiB fix end-to-end.
- 2026-10-27 (lead): **Data landing (H1a + H1b) done — both human-gated fetches CLOSED; §5 chain steps 1–6 green; committed; publication was then blocked behind G5/W8/G7 under the manual-publish convention — superseded 2026-10-27 by ADR-0014 (git-connected deploy; see the note above).**
  Files James placed in `data-raw/` on 2026-10-27: Wales DataMap GeoJSON layers — `gp-practices-wales-main-2026-10.json` (369 main) + `gp-practices-wales-branch-2026-10.json` (170 branch), OGL v3.0, every feature carrying source lat/lon (no geocoding needed for Wales) — and the PRA "All Registered Services" June 2026 export `rqia-regulated-services-2026-06.xlsx` (209,880 B, SHA-256 `3a977f293061fd7f245781e4b11f1751212b7d67852716bb019a7cb4966dfca7`). Exact download URLs pending James's confirmation (noted in the provenance rows; to be pinned when he sends them).
  Chain (`ops.md` §5, run by the lead): (1) `extract-hospices-ni.mjs` → 6 services `ni-r1`–`ni-r6`, all geocoded from postcodes; `extract-gp-practices-wales.mjs` → 539 practices (`data-raw/gp-practices-wales.json`, ids `wales-1`…`wales-539`). (2) `geocode-postcodes.mjs` fourth pass: 5 new NI hospice postcode units, 0 new practice units, 0 throttled; exit 1 by design on the documented 9-postcode OSM gap (non-blocking; no loop, feed-unavailable rule). (3) `npm run build-data` ×2 byte-identical — new SHA prefixes `f7df12fd` / `65818ace` / `cc096f17` / `dd19e8ae` (catchments / hospices / practices / shops; recorded in `ops.md` §4). (4) `validate-tessellation.mjs` exit 0. (5) `npm run build` + `npm run check:layout` exit 0; largest dist asset 3.14 MiB — under Cloudflare's 25 MiB per-file limit. (6) Provenance rows in `data/README.md` (source + retrieved date + SHA-256), gate tables in `ops.md` §3/§5.1 + `docs/MAINTENANCE.md`, `README.md` current-snapshot section (Wales 539 / NI 6), this ledger, `.agents/hindsight.md`.
  New totals: **161 hospices** (en 152 / sc 3 / ni 6 / wales 0 — the CIW reply remains the one open documented gap, non-blocking per James 2026-10-24); **11,014 practices** (en 9,260 + sc 911 + ni 304 + wales 539); **11,002 assigned / 12 unplaced** — all 12 sit in the 9 OSM-gap NI practice postcodes (8 units × 1 practice + 1 unit × 2); 138 shops (21 outside their own catchment); postcodes 9,098 of 9,107 in scope resolved. The `kind === 'published'` = 7 invariant is unchanged.
  Step 7 per `ops.md` §5: commit landed (SHA recorded in the follow-up tick below); **publish deferred** — G5 (mobile pass; its m3 marker baseline of 10,463 predates the landing and is re-verified against 11,002 in James's pass), W8 (stride gate, fed by G5's m1) and G7 (Overpass capacity) all remain open.
  - Follow-up tick (2026-10-27, post-commit): commit `816b609` on `origin/main` (filled by the doc-only SHA-tick commit that lands after it) carries `475675a` (Cycle 2 code: logo/manifest + map/list/StartHere) plus this data landing.
- 2026-10-26 (lead): **Stage 6 QA DONE — `qa-cycle2-slim` (2ba41391) delivered the full report; verdict PASS — 0 Blocking, 1 risk-accepted (F-1 carried: the "20 curated" figure is the `curated===true` set (7 published + 13 approx), the W10 toggle per label filters `kind==='published'` → exactly 7 rows — matches implementation + dist data + CodeQA fact).** `qa-cycle2-final` (5c7e7cc5) also stalled after its skeleton (1,811 B @ 20:49; 4 no-op/stalled dispatches total — none consumed a rework round). Slim-brief dispatch worked: mandatory early skeleton + compacted brief + lead pre-ran all mechanical verifications and handed the session the verified facts to re-check a core subset (build, check:layout, greps, m3 over dist data, W10 7-published over dist data) and cite the lead for the heavy chain (byte-identity + tessellation re-run green @ 20:50). QA-fresh re-checks: zero disagreements with lead facts. Post-fix m1/m2/m4 + live W5/W7/W10/W11 interactions remain human G5-gated (checklist in qa.md); W8 stride gate awaits G5's m1 (>800 ms ⇒ STRIDE_K follow-up). Lead housekeeping: removed leftover `qa-tmp-data.mjs`/`qa-tmp-src.mjs` from repo root + lead scratch files; `npm run build`/`check:layout`/tessellation/byte-identity all re-verified green before the QA dispatch. Next: Stage 8 DevOps.
- 2026-10-26 (lead): **Stage 6 QA — three consecutive no-op dispatches; final attempt in flight (no rework round consumed).** `qa-cycle2` (ed3f4f17, ~19:24; duplicate 09573402 zero writes) and continuation `qa-cycle2-continue` (3b3a6a18, ~20:05) both produced 30–45 min zero writes to `.agents/qa.md`; `Get-Process node` showed no process started near either dispatch time while the parallel `sec-cycle2` sessions ran fine → pattern suggests the QA brief weight/toolchain, not the dispatch mechanism. Final dispatch `qa-cycle2-final` (5c7e7cc5, ~20:47) uses a compacted brief + mandatory EARLY skeleton write (so progress is observable within minutes) + fill-in-place updates. Expected: skeleton appears within ~5 min if the session is alive. If it no-ops too, escalate to James before further retries.
- 2026-10-26: **Stage 7 Security DONE — two parallel `sec-cycle2` sessions (50b7ba4a, 834b55ed) both delivered; final on-disk state = 834b55ed's write (12,395 B @ 19:58, supersedes 50b7ba4a's 12,447 B @ 19:38 + lead's two Minor header fixes): VERDICT PASS — 0 Blocking, 0 new risk-accepted, no design-level (nothing routes to Architect).** Both pass-consistent. All 8 areas clean: StartHere postcode surface (input constrained to `[A-Z0-9]{5,7}` before use; exact local Map match; no network/storage), mailto via `encodeURIComponent` (no header injection), logo.svg inert / manifest local-only, divIcon html = colour + integer count only, remaining 2 Tooltips trusted data only, data key sets unchanged from Cycle 1 (no PII beyond name/postcode/lat/lon/kind), no new deps (git diff clean), secrets grep 0 in `src/`. SEC-F1 (ODbL attribution) resolved in Cycle 2; SEC-F2/SEC-F3 unchanged risk-accepted. Lead fixes (Minor, same file): Scope line listed five commit hashes that do not exist in git (replaced with "uncommitted Cycle-2 working tree"); header date 2026-10-22 → 2026-10-26. QA (Stage 6) still running.

- 2026-10-26: **Stage 5 Coding DONE — lead-verified on disk; Stage 6 QA + Stage 7 Security dispatched (parallel).**
  Original `coding-cycle2` (b04ab781) stalled ~47 min after the W11 code writes (17:39–17:53Z);
  treated as a no-op, no rework round consumed. Continuation `coding-cycle2-continue` (a23dcd07)
  completed: W11 verified against disk state, W12/W13 verified-no-write, W8 recorded-deferred
  (evidence gate: m1 not measurable on headless box, k=1 in effect, stride re-check at G5 human pass),
  completion statement on disk. Final `.agents/implementation.md` 17,981 B: W1 noted (QA-owned),
  W2–W7 done, W9–W13 done. Lead verification sweep on the final tree (source max mtime 17:56 < dist 18:29):
  `npm run build` exit 0 (148 modules, JS 417.85 kB), `npm run check:layout` OK (G6: 3 flex-directions),
  acceptance greps 11/11 green (forbidden StartHere=0, `<Tooltip`=2, finds=1, null2=0, markercluster=0,
  flex-direction=3, B1=1, "0 hospices"=1, "not published in bulk"=1, StartHere pill=1, STRIDE_K=0).
  One Minor (ground-truth line "yarn"→"en" in implementation.md) fixed by the lead on disk. QA runtime items
  (W5 bucket click, W7 debounce cadence, W10 sort/toggle, W11 postcode flow), the W1 baseline table, and the
  W8 gate (m1) are routed to QA. `qa-cycle2` and `sec-cycle2` dispatched 2026-10-26 (completion: sent).
- 2026-10-26: **Stage 4 PM DONE — requirements.md delivered; Stage 5 Coding dispatched.**
  PM dispatch #1 was unrecorded (treated as failure; disk showed the stale Cycle 1 file);
  dispatch #2 `pm-cycle2-r2` delivered a fresh work list (175 L / 14,694 B, mtime
  2026-10-26T13:56Z). Lead disk-verified: 13 W-items (W1 QA-owned baseline, W2–W8 map perf
  P1/P5/P6/P2/P3/P4 + evidence-gated W8 stride, W9 logo/manifest, W10 list ordering+filter,
  W11 start-here card, W12/W13 verify-only disclosures) + HUMAN-GATED H1a/H1b excluded from
  the executable set. Coding sub-session `coding-cycle2` dispatched 2026-10-26
  (completion: sent); W8 decision deferred to QA's post-fix m1 re-measurement (no code by
  default, k=1).
- 2026-10-26: **Reviewer (stage 3) DONE — verdict APPROVE; 4 Minor lead-fixed on disk.**
  `reviewer-cycle2-r2` wrote a fresh `review.md` (4,611 B, mtime 2026-10-26): 0 Blocking,
  4 Minor, 5 Dropped. Lead fixed all four (each edit verified on disk):
  - R2-1: ADR-0012 Consequences — placeholder-email claim → "mailto resolves through
    `siteConfig` (ADR-0009), which carries the real operator address" (real address set 557e553).
  - R2-2: "154 non-Wales hospices" → **155** in ADR-0013 + architecture.md §1 (155 rows, 0 Wales).
  - R2-3: GLOSSARY "LOD bucket marker" — gate misattribution fixed: P2 is bounded/measured; the
    evidence-gated mechanism is the §2c stride.
  - R2-4: B2 gate strengthened (ADR-0013 + architecture.md §1): report must show *placed* Wales
    practices (lat/lon non-null); unplaced rows only from documented geocoding gaps.
  Dropped R2-5 carries a useful correction for later stages: the G6 invariant is the **exact set
  of three** `flex-direction` declarations (styles.css L13/25/167, from the 2026-10-24 layout
  fix) enforced by `scripts/check-map-layout.mjs` — *no new ones may be added*, not "none
  anywhere". G6 `npm run check:layout` re-run green after the doc fixes. Stage 4 PM dispatched — dispatch #1 unrecorded (treated as failure), #2 `pm-cycle2-r2` verified dispatched 2026-10-26 (sub-session 4b408d2d, completion: sent).
- 2026-10-26: **Reviewer (stage 3) dispatch #1 = NO-OP round → re-dispatched.** `list_agents`:
  `reviewer-cycle2` reports `completed`, but disk shows zero writes — `.agents/review.md` is
  still the stale Cycle 1 file (4,214 B, mtime 2026-10-21T21:33), no fresh file in `.agents/`.
  Matches the known pitfall "completed with zero tool activity = no-op round". Re-dispatched
  `reviewer-cycle2-r2` (`qwen-coding`, `completion: sent`) with the same self-contained read-only
  brief. A no-op run does not consume a rework-loop round (only fix-verify rounds count toward
  the 2-round cap). Lead will disk-verify a FRESH `review.md` (mtime ~2026-10-26) before Stage 3
  closes.
- 2026-10-25: **Architect (stage 2) disk-verified — DONE.** `architect-cycle2` (id `df573f07`)
  produced all artifacts; lead verified on disk:
  - `.agents/architecture.md` 123 L / 14,829 B — complete Cycle 2 doc: §1 nation gates (B2 Wales
    practices, B3 NI hospices, Wales hospices documented pending gap, provenance pattern), §2 perf
    (fixed baseline metric set, P1–P7 with P1 mandatory, evidence-gated downsampling @800 ms,
    0-space JSON payload, no payload split), §3 logo (`public/logo.svg` heart+pin geometry,
    `manifest.webmanifest`, G6-safe), §4 list (name A→Z default, 3 sort options, "Has published
    service area" toggle), §5 start-here card (top-left, postcode flow, 3 persona sections,
    neutral not-found wording). Every item has acceptance criteria.
  - GLOSSARY.md +38 lines: 8 Cycle 2 terms (hide-not-delete, LOD bucket marker, start-here card,
    published/approx `kind`, branch site, nation filter, PRA, profile-first).
  - `docs/adr/`: 0010-map-performance-strategy, 0011-default-list-ordering-and-filters,
    0012-start-here-landing-card, 0013-nation-data-landing-gates — numbered after 0009, one-page.
  - LEAD FACTUAL FLAG for Reviewer: ADR-0012 consequence claims the "let us know" mailto assumes
    a *placeholder* operator email ("real address is a later ops task"). Lead verified
    `src/lib/feedback.ts`: `feedbackMailto` builds from `siteConfig.contactEmail`, and the real
    email is already set (commit 557e553, ADR-0009 lockstep). Reviewer must confirm + classify.
  Stage 3 Reviewer → running (dispatched this turn, `completion: sent`).
- 2026-10-25: **HUMAN DECISION on Research escalation: Option A (risk-accept) — Research DONE, Architect unblocked.**
  James chose Option A: the 22 residual stale markers in research.md are RISK-ACCEPTED documented
  debt — superseded, not blocking. Lead added a STALENESS NOTICE banner atop research.md (ledger-level
  annotation): §0/§1/§1.2/§1.3 are CANONICAL; Table A (v5 note below) supersedes every conflicting
  statement in the file. The performance FINDING stands (per-render O(10,475 × 155) `hospices.find`
  n²-class cost — anchors stale, cost real). Research → done; Architect → running (dispatched this
  turn, `completion: sent`; lead will disk-verify `.agents/architecture.md` before Stage 2 closes).
- 2026-10-25: **Research recon v5 outcome — PARTIAL FAILURE (round 3) → HUMAN DECISION REQUIRED.**
  v5 (`research-cycle2-recon-v5`, `completion: sent`) made real partial edits before dying on
  first-turn `stopReason: timeout`. Disk truth: 27,412 B / 245 lines, mtime 25/10/2026 12:15.
  v5 FIXED (lead disk-verified): §0 + §1.2/§1.3 entirely — npm chain, scot script lines,
  8,364/8,373 line, Wales lines, F2-as-landed narrative (L22/45/50/52/72 now correct).
  v5 LEFT STALE (lead grep-verified + full reads of MapView.tsx (292 L), HospicePanel.tsx (103 L),
  AppShell.tsx, practices.json head, @ HEAD `475675a`): 19 anchor/count markers — §2 performance
  anchors (L84/87/93/94/96/97/101/103), §4.1 HospicePanel (L126/154/156/157/183-185/195), §5.2
  (L219) — PLUS 3 stale Scotland F1/F2 decision frames (L210/218/233; the gate is RESOLVED: F2,
  landed in `475675a`, correctly stated at L22/45/50/52/72). Also two false claims inside
  research.md the Architect must NOT trust: (a) "155 × 9,564 ≈ 1.5M ops per re-render" —
  HospicePanel's `counts` useMemo is O(catchments)=155, not a per-practice scan; (b) AppShell's
  `<h1>` is "Hospice Catchment Map" (an `<a href="#map">` link), not "HospiceInfo".
  The two-round rework cap (QWEN.md) is EXHAUSTED: v3 (round 1 — content-only), v4 (round 2 —
  §0 only), v5 (round 3 — partial, timeout). No v6 may be auto-dispatched.
  **HUMAN DECISION REQUIRED** — options:
  - **A (lead-recommended): risk-accept the residual staleness and unblock.** Architect treats
    research.md §0/§1/§1.2/§1.3 as canonical and this ledger's Table A as the current ground truth;
    the 22 residual markers stand superseded. Lead adds a one-line staleness banner atop
    research.md (ledger-level annotation, not stage work). Lowest cost. Note the performance
    FINDING survives — the per-render O(10,475 × 155) `hospices.find` n²-class cost is real;
    only its anchors/counts are stale.
  - **B: human-authorized cap override — one more bounded v6 fix pass** using Table A verbatim.
    Cost: full first-turn wall-clock timeout risk again (v1/v2/v5 all died there); splitting into
    two smaller sequential passes mitigates but doubles latency.
  - **C: James edits the 22 remaining lines directly** from Table A (highest fidelity; human call).
  - **D: full fresh recon v6** (discards v3–v5 work; most expensive; not recommended).
  **Table A — current verified values (2026-10-25, HEAD `475675a`; supersedes every stale passage in research.md):**
  | # | Stale in research.md | Current value |
  |---|---|---|
  | 1 | `src/map/MapView.tsx`, `src/datapack/*` | `src/components/MapView.tsx` (292 L); no `src/datapack/` — data flow via `src/lib/useAppData.ts` + `src/lib/types.ts` |
  | 2 | 9,564 / ~9,552 GP practice markers | 10,475 (10,463 assigned; 12 unassigned on 9 known-gap BT postcodes), `CircleMarker` + per-marker `<Tooltip>` |
  | 3 | `tessellations-global.json` 83 KB | `public/data/catchments.json` 6,791,072 B (6.79 MB), 155 tessellations — largest asset |
  | 4 | `hospices.find(h => h.osmsu === practice.osmsu)` | `hospices.find(h => h.id === p.hospiceId` — per practice ≈L213-259; catchment block ≈L180-211; shops ≈L260-277 |
  | 5 | `practices-global.json` 3.18 MB, `hospices-global.json` | `public/data/practices.json` 3,037,217 B, 10,475 rows / 145,067 lines, 2-space indented, first id `en-1-10564001398`; `hospices.json` 73,680 B |
  | 6 | `byOsmsu = new Map(...)` | none — join key is `hospiceId` (`src/lib/types.ts`); `osmsu` has 0 codebase hits |
  | 7 | `src/ui/AppShell.tsx`, `<h1>HospiceInfo</h1>` | `src/components/AppShell.tsx`; `<h1 className="h4 mb-0"><a href="#map">Hospice Catchment Map</a></h1>`; no logo today |
  | 8 | `src/ui/HospicePanel.tsx` L39-119; filter name/town/osmsu | `src/components/HospicePanel.tsx` (103 L); `counts` useMemo L22-26 = O(catchments)=155; filter = `nation` + `name`/`town` substring only; list UNsorted (raw order) |
  | 9 | MapView old line anchors (L306-335, L438-483, L485-514, L529-621, L545, L255-527); ZoomControl bottomleft | hospice markers L280-288; `FitToSelection` `catchments.find` L66; `preferCanvas={true}`, `zoomControl={true}` |
  | 10 | `npm run geocode:postcodes` etc. | `node scripts/geocode-postcodes.mjs` — package.json exposes only `dev`/`build`/`preview`/`build-data`/`check:layout` |
  | 11 | Scotland F1/F2 framed as open gate (L210/218/233) | RESOLVED F2, landed `475675a` (911 practices, address-derived names curated with James; Gate H1b) |
  | 12 | (counts) | ~138 shops (`shops.json` 45,209 B); `corrections.json` 3 B (empty array) |
- 2026-10-25: **Research recon v4 dispatched (fire-and-forget) with full verified anchor map.**
  v3's on-disk pass (09:33) turned out to be a content-expansion only: file grew
  20,752 → 27,596 B, same 248 lines, diff stat against the 640-line committed
  version unchanged — i.e. prose lengthened in place, ZERO anchor fixes applied
  (verified: full read of all 248 lines + 22 stale-marker hits across
  `703b4d0` / `*-global.json` / `osmsu` / `src/map|ui|datapack` / `data-raw/scripts`
  / 9,564 / F1-F2-open / `npm run build:data`-style scripts; only 4 fresh
  `hospiceId` mentions, all forward-looking prose). File remains fully stale.
  v4 = `research-cycle2-recon-v4` (sub-session 6b4aa8d8, `completion: sent`) with
  the complete verified 11-point ground truth handed over (HEAD `475675a`;
  5-file `public/data/` with exact sizes — `catchments.json` 6.79 MB largest;
  `src/components/` layout, MapView 292 L / HospicePanel 103 L; `hospiceId` join;
  counts 10,475/10,463/155/~138/155; Scotland landed via F2 with reword-to-RESOLVED
  instruction; nation scripts already in `scripts/` — `data-raw/scripts/` absent;
  package.json npm scripts = dev/build/preview/build-data/check:layout only, so all
  `npm run <colon>` invocations reword to `node scripts/<name>.mjs`; R8 resolved),
  plus a stale-line checklist and a definition-of-done marker list (19 strings,
  zero hits required). Verification protocol unchanged: **Lead will disk-verify
  v4's reconciliation (mtime/size + zero stale-marker hits + spot-reads of
  §0/§1.2/§2.1/§4.1/§5.2 + 248±2 lines) before marking Research done.** One
  bounded fix pass max on failure, then escalate per the rework cap.
- 2026-10-24: **Cycle 2 Research artifact reconcile pass dispatched.**
  `.agents/research.md` (248-line Cycle-2 rewrite, uncommitted) was verified
  STALE against HEAD `475675a`: baseline cites `703b4d0`, `*-global.json`
  names, `osmsu` join (0 grep hits — real key is `hospiceId`), `src/map/` +
  `src/ui/` + `src/datapack/` paths (real: `src/components/` + `src/lib/` +
  `src/pages/`), 9,564 practice counts (real: 10,475 / 10,463 assigned),
  Scotland F1/F2 open (real: F2 executed, landed `475675a`), tessellation
  "83 KB" (real: `catchments.json` 6.79 MB — now the LARGEST asset). Two
  earlier Research sub-sessions died by first-turn timeout with zero on-disk
  progress (verified content-identical pre/post). Third dispatch
  `research-cycle2-recon-v3` uses `completion: sent` (fire-and-forget, no
  first-turn wall-time) with verified anchors handed over in the prompt
  (join key, component paths + sizes, L184/L218/L265 hotspots, counts,
  sizes, Scotland landed). Lead will disk-verify the reconciliation before
  marking Research done.
- 2026-10-24: **Scottish practices landed — H1 re-scoped.** James downloaded
  the NHS Scotland Spatial Hub `gp_practices-is` layer: 911 features, landed
  as `data-raw/gp-practices-scotland-2026-10.geojson.json` → renamed to the
  canonical name. `extract-gp-practices-sc.mjs` adapted to the register's
  name-less schema (first-run detection: name = first comma-delimited
  `address` segment; 911/911 rows, 0 skipped; BNG geometry ignored — location
  via postcode geocoding). G6 chain **COMPLETE 2026-10-24**: geocode pass
  (729 new, 6 district-fallback, same 9 known gaps) → build-data ×2
  byte-identical (10,475 practices; 10,463 assigned; **sc=911 all
  assigned**) → tessellation 100.00% coverage, 0 slivers → `tsc && vite
  build` green. `data/README.md` numbers updated (Current state +
  postcode-geo.csv + practices.json rows). **H1 re-scope:** James
  reports `publicregulation.gov.uk` does not exist and `data.wales` is a
  holding page → item 1 (NI hospices: re-source to the Public Regulation
  Authority, RQIA's 2024 successor) and item 2 (Wales practices: re-source to
  the new DataMap portal, candidate `data.gov.wales`) need browser
  confirmation of the exact URLs — H1 is now effectively Scotland-only plus
  two blocked/re-sourced fetches; the CIW email (Wales hospices) is
  unchanged. `data/README.md` provenance updated accordingly.
- 2026-10-24: **Cycle 2 opened — James's five pre-launch items.** (1)
  complete Scotland/Wales/NI nation data — 3 browser fetches with scripts
  already ready (RQIA XLSX → NI hospices; data.wales main+branch layers →
  Wales GP practices; NHS Scotland GeoJSON → Scottish practices); Wales
  hospices remain the CIW email gap — proceed as a documented pending gap
  (James, 2026-10-24). (2) Map performance — profile-first per James
  ("not sure / a mix"); lead ground-truth found per-render O(n²)
  `hospices.find` across ~9.6k practices and ~9.7k canvas layers. (3)
  Logo + favicon — heart + map-pin mark (James); `index.html` has no
  favicon at all today and no brand assets exist. (4) Hospice list ordering
  + filtering — list is raw-JSON order today, no sort. (5) User flows —
  landing "start here" card (postcode → GP practice → catchment hospice)
  plus patient/fundraiser/clinician journeys (James chose the landing card
  over dedicated pages). Cycle 1 closes: goal met, 0 open Blocking,
  H1/H2/H4/H5/H6/H8/H9 + G1–G4 closed; G5 + G7 carry over as Cycle 2 gate H2.
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
