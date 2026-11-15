# Hindsight — Cycle 8 (postcode-proxy feature, ADR-0037)

> Stage 10 of the 10-stage pipeline (2026-11-15). Memory steward pass:
> diagnosed C8 drift in the repo's knowledge memory; emitted the
> correction/ingestion list. Working tree untouched; this file is the only
> output. All claims cite artifact + line. Env names appear by NAME only
> (`POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`,
> `POSTCODES_ACCESS_CLIENT_SECRET`); no secret value appears here and none
> was sought. Optional reads (`research-cycle8.md`, `implementation-cycle8.md`)
> were skipped to stay inside the line budget; nothing below depends on them.

## 1. Cycle scope

Cycle 8 delivered the project's **first live runtime boundary**: the
stateless Cloudflare Pages Function `GET /api/postcodes/{postcode}`
(`functions/api/postcodes/[postcode].ts` + pure `handler.ts`), which proxies
the owner's self-hosted postcodes.io with server-attached Cloudflare Access
credentials, returning a stripped `{postcode,latitude,longitude}` body
(docs/adr/0037-online-postcode-fallback-pages-function.md, "Decision" 1).
Start-here gained a tier-2 geocode fallback: on a tier-1 practice-map miss the
client shape-gates, calls the Function (3 s abort), runs point-in-polygon over
kind-filtered catchments, and renders the "Open in panel" card — every failure
(400/404/502/500/timeout) degrades silently to the existing not-found card, no
throw (ADR-0037 "Consequences"; docs/MAINTENANCE.md:200-205). The Feature ships
with the static build: **231 files in `dist/`** incl. `functions/`, which
auto-publishes on the first push to `main` via the git-connected ADR-0014 chain
(215 `<loc>` in `sitemap.xml` = 208 hospice pages + 7; ops-cycle8.md:25-26).
Quality state at close: 23/23 `node --test`, byte-identical double build,
`check:layout` OK (ops-cycle8.md:39-41); QA **PASS — 0 Blocking** after one
rework round fixing 2 one-line Blocks (qa-cycle8.md:105-107); Security
**PASS — 0 Blocking, 2 risk-accepted, 2 informational**
(security-cycle8.md:12). Ship gate is James's commit + push
(ops-cycle8.md:43-54); nothing was committed in the pipeline (W12), and
`origin/main = aaee725` (the C6 ship) is the current live release
(ops-cycle8.md:43-45).

## 2. Memory quality diagnosis

### 2.1 Platform / env config
(a) Prior-cycle memory holds: "site is fully static, no runtime surface, no
server secrets" (the C5-era posture in docs/MAINTENANCE.md:125-129 "The site is
static"). Now false — there is a live API route.
(b) Missing/new knowledge that must be recorded:
- The three env names and their dual placement: Pages secrets (prod) and local
  `.dev.vars` (git-ignored at `.gitignore:11`, verified via `git check-ignore`);
  rotation is a dashboard-only ops action (ops-cycle8.md:68-82;
  docs/MAINTENANCE.md:211-220; ops-cycle8.md:87-89).
- Degradation contract: no `.dev.vars` → upstream 403 → function 502 →
  not-found card (docs/MAINTENANCE.md:65-68).
- SEC-8-01 makes this the project's first unauthenticated public trust
  boundary; the rejected client-direct-fetch alternative is why credentials
  are server-side (security-cycle8.md:18, 91).

### 2.2 Probe table & ops facts
(a) No prior-cycle probe table exists for a runtime route; memory that
"hospiceinfo has no post-deploy runtime probes beyond the C3-5/C5 static
smokes" is now incomplete.
(b) New knowledge, located in two canonical spots:
- W11 probe table P1–P7 with exact expected bodies — 200 = exactly
  `postcode,latitude,longitude` + `content-type: application/json` +
  `cache-control: no-store`; 400 = exactly `{"error":"bad-postcode"}`;
  404 = exactly `{"error":"unknown postcode"}`; 502 = exactly
  `{"error":"postcode service unavailable"}` (ops-cycle8.md:104-140;
  docs/MAINTENANCE.md:159-185).
- Ordering fact P7 depends on: the 502 probe runs **before the §2 secrets are
  set** (or after deleting one); after secrets exist, 502 occurs only on
  genuine upstream failure / 5 s budget — do not force it (ops-cycle8.md:138,
  177-179; docs/MAINTENANCE.md:180-185).
- Any `500` read on `/api/postcodes/*` is the SEC-8-02 class
  (missing/typo'd env key) — re-set the secret, no code change
  (ops-cycle8.md:171-173; docs/MAINTENANCE.md:187-190).
- Acceptance vectors for UI-level checks: PR7 2TH / CF11 9HD / BT15 3LH
  (each lands in exactly two cells — one adult + one children; kind filter
  disambiguates; BT15 3LH is 10.26 m from the NI boundary, outside the ~1e-9
  deg band) plus tier-1 vector LS1 4AP which performs no fetch (ac2)
  (ops-cycle8.md:142-151; ADR-0037 "Decision" 4).

### 2.3 Rollback references
(a) Prior memory: "rollback = data-chain re-run / prior release restore"
(C5 baseline, docs/MAINTENANCE.md:191-198).
(b) C8-specific facts to record (now the current truth):
- Prior live release to restore = the build of `origin/main = aaee725`
  (C6 ship); dashboard restore + `git revert <C8-ship-commit-sha>` + James-
  approved push (ops-cycle8.md:196-211; docs/MAINTENANCE.md:222-228).
- No migration, no env cleanup required — leaving the three secrets set is
  harmless; deleting them merely re-arms P7's degradation (ops-cycle8.md:190-
  194).
- Post-rollback expectation: `GET /api/postcodes/*` 404s and the static site
  behaves exactly as pre-C8, even mid-session (client degrades on any
  non-2xx) (ops-cycle8.md:214-228).

### 2.4 QA / security findings
(a) Two contradictory states exist *inside* qa-cycle8.md: initial verdict
"DEFECT — 2 Blocking findings" (lines 7-8) vs final "VERDICT: PASS — 0
Blocking (rework round 1 of 2 closed)" (line 107). Memory that ingests only
the head of the file will carry a false "2 Blocking" claim; the true close
state is the line-107 verdict, with B1/B2 (StartHere not-found copy "a
hospice catchment on this map"; 400 body `bad-postcode`) fixed and
post-fix-verified lines 95-103 (qa-cycle8.md:73-74, 95-107).
(b) Risk-accepted/informational debt not yet in durable memory:
SEC-8-01 (public endpoint, capacity/abuse residual, design-level, aligned
verbatim with reviewer S-1), SEC-8-02 (workerd default 500 vs contract 502),
SEC-8-03 (postcode-shape logic duplicated client ↔ function, drift caught by
shared vector suite `tests/postcode-vectors.mjs`, 23/23), SEC-8-04 (`functions/`
outside `tsc -b`; env-key-literal pin test is the function-side check)
(security-cycle8.md:18-21, 143-144; ops-cycle8.md:179-196).
QA risk-accepted: R-A1 (in-flight tier-2 fetch not aborted on resubmit; stale
result discarded by `lookupGen` guard), R-A2 (sitemap 215 vs stale 199
invariant — data growth, not a regression), R-A3 (abort test takes real ~3 s),
R-A4 (test file names differ from W6/W7 spec; content conforms)
(qa-cycle8.md:75-77).
(c) "M8 dist-density": no C8 artifact read in this pass (ops/security/qa/
ADR/MAINTENANCE) contains an item labelled M8 — it is **not** an established
C8 memory item. Treated as unverified here; if it refers to a
requirements-cycle8.md measurement gate, confirm provenance next cycle before
ingesting (flagged deliberately rather than invented).

### 2.5 ADR & doc coverage — the live contradictions
(a) ADR-0037's status line is stale: "**Status:** proposed (Cycle 7,
2026-11-14)" (docs/adr/0037-online-postcode-fallback-pages-function.md:3) —
the design is now implemented, security-passed, and ship-gated; the file also
still lists "Open for owner: not-found wording" which was resolved with owner
sign-off 2026-11-15 (ops-cycle8.md:239-241; qa-cycle8.md:73 B1).
(b) docs/MAINTENANCE.md (408 lines, shipped doc) contains C5-era baseline
numbers that now contradict its own C8 sections:
- C5 "Dist invariants" table: **215 physical files / 199 `<loc>` (192
  hospice + 7) / 200 shells** (docs/MAINTENANCE.md:388-390) vs C8 reality
  **231 files / 215 `<loc>` / 208 hospice pages** stated in the same file's
  Deploy section (docs/MAINTENANCE.md:131-132, 155), in ops-cycle8.md:25-26,
  and in qa-cycle8.md:106 G4 ("stale 199 baseline is not a regression").
- Post-publish smoke check "sitemap 199 `<loc>`" (docs/MAINTENANCE.md:404) —
  stale, must read 215.
- "Definition of healthy ... 192 hospices" (docs/MAINTENANCE.md:402-404) —
  stale, C8 data set is 208 (ops-cycle8.md:26; qa-cycle8.md:85).
- Build description "emits 200 static shells ... (215 files total)"
  (docs/MAINTENANCE.md:45) — stale file/shell counts (231 total).
These are intra-doc contradictions: a retriever reading the §invariants table
gets numbers 16 files and 16 `<loc>` entries off the current truth.

## 3. Correction / ingestion list

Apply in Hindsight memory after the cycle closes. Net-new or corrected only.

1. **C8-1 — ADR-0037 status.**
   Current: "Status: proposed (Cycle 7, 2026-11-14)"
   (docs/adr/0037-online-postcode-fallback-pages-function.md:3).
   New: "Status: accepted (Cycle 8, 2026-11-15) — implemented, SEC-passed
   (0 Blocking), ship-gated on owner push; open items OQ1/OQ3/OQ5 resolved
   2026-11-15 (ops-cycle8.md:239-241); B1/B2 ship fixes verified
   (qa-cycle8.md:95-103)."
2. **C8-2 — MAINTENANCE C5 dist-invariants table → C8 values.**
   Current: MAINTENANCE.md:388-390 "215 files / 199 `<loc>` (192 hospice + 7)
   / 200 shells / 200-200 boot snippet".
   New: "231 files / 215 `<loc>` (208 hospice pages + 7) (MAINTENANCE.md:131-
   155; ops-cycle8.md:25-26; qa-cycle8.md:105-106); re-assert shell count and
   boot-snippet survey on the next disk-verified build (prerender emits 208
   hospice pages, qa-cycle8.md:105)."
3. **C8-3 — MAINTENANCE smoke check + definition of healthy → C8 values.**
   Current: MAINTENANCE.md:404 "sitemap 199 `<loc>`"; MAINTENANCE.md:402-404
   "192 hospices".
   New: "Post-publish smoke: 215 `<loc>` (208 `/hospice/*` + 7). Definition of
   healthy: 208 hospices (C6/C8 data set); refresh the 192/199 C5 baseline
   labels (qa-cycle8.md:76 R-A2)."
4. **C8-4 — Platform: first live runtime boundary + env config.**
   New (no prior claim to correct): "hospiceinfo now runs a stateless Pages
   Function `GET /api/postcodes/{postcode}` behind the git-connected ADR-0014
   chain (auto-ships with `dist/`, no separate deploy). Credentials: Pages
   secrets `POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID`,
   `POSTCODES_ACCESS_CLIENT_SECRET` (prod) / `.dev.vars` (local, git-ignored,
   .gitignore:11). Rotation: dashboard-only. No `.dev.vars` → 403 → 502 →
   not-found card (ops-cycle8.md:68-89; MAINTENANCE.md:211-220;
   security-cycle8.md:91)."
5. **C8-5 — Probe table (W11 P1–P7) + ordering rule.**
   New: "Canonical locations: ops-cycle8.md §3 and MAINTENANCE.md:159-185.
   Expected exact bodies: 200 = `{postcode,latitude,longitude}` + no-store;
   400 = `{"error":"bad-postcode"}`; 404 = `{"error":"unknown postcode"}`;
   502 = `{"error":"postcode service unavailable"}`. Rule: P7 (502) is run
   **before** the three secrets are set (or after deleting one); never force
   a 502 after secrets exist; any 500 is SEC-8-02 class (re-set secret).
   Record results in `.agents/implementation.md` before W11 closes
   (ops-cycle8.md:104-179)."
6. **C8-6 — Rollback reference.**
   New: "Pre-C8 live release = `aaee725` (C6 ship). Rollback: Pages dashboard
   restore of that release, then `git revert <sha>` + James-approved push; no
   migration, no env cleanup (secrets may stay set); post-rollback
   `/api/postcodes/*` 404s by design (ops-cycle8.md:190-228;
   MAINTENANCE.md:222-228)."
7. **C8-7 — Findings ledger at C8 close.**
   New: "QA: PASS 0 Blocking (rework round 1/2 closed; B1/B2 fixed and
   post-fix-verified; R-A1..R-A4 risk-accepted). Security: PASS 0 Blocking;
   SEC-8-01 (design-level, capacity/abuse) and SEC-8-02 (500-vs-502)
   risk-accepted with Analytics monitoring; SEC-8-03/8-04 informational. Do
   NOT record the initial 'DEFECT — 2 Blocking' head-verdict as state
   (qa-cycle8.md:7-8 superseded by qa-cycle8.md:107; security-cycle8.md:12,
   18-21)."
8. **C8-8 — Repo state at close (pre-push).**
   New: "Local `main` at `c0300db` = `origin/main` (`aaee725`) + C8 commit-
   ready work; C8 work is uncommitted in the working tree (W12 commits
   nothing). Ship gate = owner commit + push, then watch deployment, then
   P1–P7. Open owner questions: probe origin (custom domain vs
   hospiceinfo.pages.dev) and commit message wording (ops-cycle8.md:43-48,
   231-233)."

## 4. Risks carried forward (Cycle 9+)

- **SEC-8-01** (Low, design-level, risk-accepted): `GET /api/postcodes/{postcode}`
  is an unauthenticated public proxy — capacity/abuse only, no secret/data
  leak; owner sets a Cloudflare Analytics alert on a sustained call-rate spike
  on `/api/postcodes/*` (e.g. > 100 req/min); escalation = upstream capacity
  or CF rate-limit/Access allowlist, out of C8 scope (ops-cycle8.md:180-186;
  security-cycle8.md:18).
- **SEC-8-02** (Low, risk-accepted): function-internal env failure (e.g.
  missing `POSTCODES_IO_BASE`) surfaces as workerd's generic **500**, not the
  contract 502 — alert on the first 500 (500-class on `/api/postcodes/*`
  should read 0); owner may later prefer a 502 shim for that class
  (ops-cycle8.md:188-192; security-cycle8.md:19; MAINTENANCE.md:233-235).
- **Deploy gate**: P7 (502 probe) must run **before the three secrets are
  set** on the live project; after setting, do not force a 502 — genuine
  upstream failures only (ops-cycle8.md:138, 177-179).
- **SEC-8-04** (informational debt): `functions/` is outside `tsc -b` — a
  typo'd env name compiles on CF and degrades to silent 502; the `node --test`
  env-key-literal pin test is the only function-side check (security-
  cycle8.md:21).
- **R-A2**: the 199 `<loc>` / 215-file / 192-hospice C5 baselines are stale
  (now 215/231/208) — refresh documented invariants next cycle; not a
  regression (qa-cycle8.md:76; MAINTENANCE.md:388-390, 402-404).
- **R-A1**: in-flight tier-2 fetch not aborted on resubmit (stale result
  discarded by `lookupGen` guard) — candidate `AbortSignal` param next cycle
  (qa-cycle8.md:75).
- **Owner questions open at close**: probe origin (custom domain?) and the
  ship commit message (ops-cycle8.md:231-233).

## 5. Lead handoff note

- **Report C8 complete**: all 10 artifacts exist; QA PASS 0 Blocking (rework
  round 1/2 closed) and Security PASS 0 Blocking; 23/23 tests, byte-identical
  double build, `check:layout` OK (qa-cycle8.md:107; security-cycle8.md:12;
  ops-cycle8.md:39-41).
- **Ledger**: no open Blocking findings; SEC-8-01/SEC-8-02 are risk-accepted
  and already documented in docs/MAINTENANCE.md:229-235 — carry as debt,
  do not re-open.
- **Final gate is the owner's**: James runs ops-cycle8.md §1 (commit + push),
  watches the Pages deployment (build exit 0), then runs the §3 P1–P7 probe
  sequence **with P7 before the §2 secrets are set**, records results in
  `.agents/implementation.md`, and only then sets the three Pages secrets.
- **Apply the C8-1…C8-8 ingests above** in Hindsight after close; the two
  in-doc corrections (ADR-0037 status line; MAINTENANCE.md C5 invariant
  table/smoke check/definition-of-healthy) are doc edits for the owner/Docs —
  this steward pass does not modify other files.
- Nothing was committed by the pipeline (W12); if the push is delayed,
  `origin/main = aaee725` remains the live release and rollback references
  stay valid (ops-cycle8.md:43-45).

### Remember for next time

- This repo's stage agents run into a hard ~58.9K-token context wall: keep
  Hindsight pages short, one fact-block per page, always carry file-path
  metadata so lookups land fast.
- The repo keeps two truths (cycle artifacts `.agents/*_cycleN.md` vs shipped
  docs `docs/MAINTENANCE.md`); after every ship, re-assert the numeric
  invariants (file counts, `<loc>` counts, hospice counts) in the shipped doc
  — the C5/C8 contradiction in §2.5 is exactly this gap.
- Probe tables and rollback SHAs (e.g. `aaee725`) are the highest-value
  durable facts for ops lookups; record them with the artifact section, not
  just the prose.
