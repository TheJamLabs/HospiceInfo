# Cycle 10 Architecture — "Charity-shop website crawl"

Stage 2 of 10. Inputs: `.agents/feature-cycle10.md` (owner spec, read in full),
`.agents/research-cycle10.md` (Stage 1, read in full, incl. §6 lead verification),
`.agents/pipeline.md` §Cycle 10 (goal, binding crawl policy, lead integration
notes 1–3). ADRs this cycle: `docs/adr/0043-shop-identity-pass-through.md`,
`docs/adr/0044-headless-browser-for-shop-crawl.md`,
`docs/adr/0045-shop-crawl-log.md`.

Sections: 1 Objective · 2 Platform note · 3 Architecture at a glance ·
4 Component A (identity pass-through) · 5 Component B (site discovery) ·
6 Component C (crawl script) · 7 Component D (crawl log) · 8 Component E
(geocode + build integration) · 9 Component F (curated-18 confirm) ·
10 Security · 11 Testing strategy · 12 Certification gates · 13 Decisions ·
14 Alternatives · 15 Risks / open questions → Reviewer · 16 References.

## 1. Objective

Owner decisions (2026-11-16, feature spec §Owner decisions): (1) **150 +
discovery** — crawl all 150 hospices with a website in the data AND run a
discovery pass for the 58 without one; (2) a **headless browser**, dev-only,
for machine-unreadable shop lists (PDF, JS-rendered); (3) **data depth**
name + address + postcode only — `shops-website.json` schema unchanged, no
`shops.json` contract change, no UI change.

Hard constraints: project User-Agent, robots.txt honoured per site, ~1 req/s
per site, public pages only; reproducibility rule (every shop independently
readable from its `source` URL); zero-runtime-dep (headless browser is a
devDependency only); A-05 byte-identical rebuild keeps passing; the existing
138 entries stay byte-for-byte; no `apps/` change; no TODOs, no retry loops.

Research-corrected scope math: the "58 without a website" understates the
work — the **discovery pool is 190 rows**: the 132 rows whose only `website`
is a `cqc.org.uk/location/<id>` profile page (profile pages do not link to
the hospice's own site; CQC API dead — research §2) plus the 58 no-website
rows (33 sc / 6 ni / 17 wales / 2 en). The remaining 18 rows carry real
hospice domains — the curated 18 (confirm-only).

## 2. Platform note

Target: **Node.js dev-time `.mjs` scripts**, no TypeScript, no build step.
Nothing ships to the app; `public/` changes are the rebuilt `shops.json` and
README count updates only. Repo-verified conventions:

- `package.json` `"test": "node --test"`; tests are `tests/*.test.mjs`
  importing repo modules directly (`tests/handler.test.mjs`,
  `tests/postcodes.test.mjs`) — no framework.
- Dev-only tooling dependency precedent: `xlsx: ^0.18.5` in
  `devDependencies`, runtime set untouched. The headless browser follows the
  same pattern (ADR-0044).
- `scripts/geocode-shops.mjs` (48 lines) is the house network pattern at
  line level: single global UA constant (L6), 1100 ms sleep between requests
  (L43), resumability by skipping already-stored keys (L32), one final
  `writeFileSync` of the store (L46). The crawl script reuses all three.

Environment facts (research §3 + §6, lead-verified — do not re-probe): DDG
`html.duckduckgo.com/html/?q=…` works with the project UA; result URLs are
`duckduckgo.com/l/?uddg=<urlencoded>` redirects that must be decoded; OSCR is
ENOTFOUND from this environment (unreachable — search channel only);
`eastlancshospice.org.uk` and `trinityhospice.co.uk` 403 the plain client
(WAF; trinity's gating is intermittent — attempt headless before logging
`blocked`).

## 3. Architecture at a glance

```
data-raw/hospices-all.json (208 rows, canonical ids per ADR-0002)
   │
   ├─ 190 DISCOVERY rows (= 58 no-website + 132 cqc.org.uk-profile-only)
   │      ▼
   │  PHASE 1 — SITE DISCOVERY   (scripts/crawl-hospice-shops.mjs)
   │  one DDG request per row, 1100 ms pace, project UA
   │  query "<name> <town> hospice"; decode uddg= redirect URLs;
   │  reject wrapper domains; accept plausible own-domain top hit;
   │  record discovery source URL
   │
   └─ 18 CURATED real domains (confirm-only pass, separate log section)
   ▼
  PHASE 2 — PER-SITE CRAWL
  robots.txt → root fetch → shop-page locator (site's own nav:
  /shop|shop\w*|store|retail/i on link text+href) → shop listing page(s)
  engagement order per page: plain fetch → headless render (403/JS) →
  PDF-embedded text (list is a linked PDF) → log `unreadable`
  extract {name, address, postcode} + per-entry source page URL;
  dedupe on normalised name+address vs existing 138 (skip, never replace);
  append new entries (canonical hospiceId) to shops-website.json;
  every step recorded per row in data-raw/shop-crawl-log.json — the log IS
  the resumable state (outcome `discovery-found` = pending; terminal
  outcomes = done and never retried)
   ▼
  data-raw/shops-website.json (138 byte-preserved + appended)
   ▼
  scripts/geocode-shops.mjs (UNCHANGED; resumable; new keys only)
   ▼
  data-raw/shops-geo.json →
  scripts/build-data.mjs — identity: SLUG_TO_ID lookup, else validated
  canonical-id pass-through, else unresolved (ADR-0043)
   ▼
  public/data/shops.json (≥ baseline) + README/data-README count +
  provenance updates + committed crawl log (A-10, A-05 both pass)
```

No `apps/` change. No cron — manual refresh story in the log's README notes.

## 4. Component A — identity pass-through (built and tested FIRST)

**Prerequisite for any new entry** (lead integration note 1, verified in
this session against `scripts/build-data.mjs`):

- L33–36: `SLUG_TO_ID` — built from `Object.fromEntries(CATCHMENTS.map…`,
  mapping the 20 legacy catchment slugs to `en-<cqcId>` (regex
  `location/(1-\d+)` on `cqcUrl`).
- L63: `const hospicesAll = JSON.parse(… 'data-raw/hospices-all.json')` — the
  canonical id set already loaded in this file (208 rows, one canonical id
  each per ADR-0002).
- L1065: `const hospiceId = SLUG_TO_ID[s.hospiceId];`
- L1066: `if (!hospiceId) { shopsUnresolved++; continue; }`
- L1082: `if (shopsUnresolved) process.exit(1);`

A new entry carrying a canonical id (`en-1-126365065`, `sc-oscar-005623`…)
is not a key of `SLUG_TO_ID` → `hospiceId` undefined → counted unresolved →
build hards-fails. **This is the SLUG_TO_ID pitfall (ADR-0043 context).**

Design: a pure, exportable helper in a new `scripts/shop-identity.mjs`:

```
resolveShopId(inputId, canonicalIds, slugToId) →
  slugToId[inputId]  (legacy path, unchanged semantics)
  else canonicalIds.has(inputId) ? inputId : null   (validated pass-through)
```

`build-data.mjs` changes at exactly one spot (L1065 becomes a call into the
helper), with `canonicalIds = new Set(hospicesAll.map((h) => h.id))` computed
once near L63. **Never a blind `?? inputId` fallback**: an id that is neither
legacy nor in the record validates to null → L1066 path → build exit 1. The
safety property (build hards-fails on unresolvable ids) is preserved by
construction.

Sequencing and proof of non-regression:

1. Implement helper + one-line build change.
2. New test (greenfield — no build-data test exists today) proves all 138
   existing entries resolve to **the same id as before** (legacy table takes
   precedence), plus pass-through cases (in-set id → itself; not-in-set id →
   null).
3. Commit clean baseline of `data-raw/shops-website.json` as a test fixture
   (`tests/fixtures/shops-website-baseline.json`); a byte-prefix test
   guards the 138 entries from then on.
4. Only after 1–3 pass does the crawl append anything.

## 5. Component B — site discovery (190 rows)

- **Channel:** DuckDuckGo HTML endpoint `html.duckduckgo.com/html/?q=…`
  (research-verified with the project UA). One query per row, 1100 ms pace:
  `"<name> <town> hospice"` (name from the hospice row, town from the row's
  address field). Total ≈ 190 requests ≈ 3.5 min.
- **Parsing:** decode `uddg=` on `duckduckgo.com/l/?uddg=<urlencoded>`
  result links; take the top accepted hit, not "the first hit".
- **Wrapper/directory reject list** (research §3 surfaced them as top hits):
  `hospiceuk.org`, `palliativecarescotland.org.uk`, `scotcharityregister.org.uk`,
  `cqc.org.uk` (and any subdomain of the other rows' register source).
  Decision: reject by hostname exact-or-subdomain match against this list;
  on reject, the next non-wrapped, plausibly-own-domain hit is considered,
  in order, until one is accepted or the list is exhausted → `no-website`.
- **Acceptance test:** domain plausibly belongs to the hospice. Concrete
  rule (no domain-name derivation fuzzing): the registered-name tokens of
  the hospice (e.g. "St Margaret of Scotland" → `st`, `margaret`, `scotland`)
  appear in the second-level domain, OR the page's `<title>`/`<h1>` at the
  root (one extra fetch, counted in pace) contains the full hospice name.
  This is the "own-domain" test; it is deliberately conservative — when in
  doubt, `no-website` (never a wrapper hit).
- **Per-row decision recorded** in the log: outcome, query, accepted URL,
  discovery source (the search result URL / DDG query), and — for the
  duplicate-identity risk (research §5: e.g. `sc-oscar-005623` St Margaret
  of Scotland may be a service of a larger hospice whose site is the
  top hit) — the decision is stored as the row's own entry: if the accepted
  site clearly belongs to a *different* hospice row, outcome stays
  `no-website` with a `note` naming the parent that appears to own the site,
  and the row is flagged for human audit. The crawl never writes shops to a
  row's id when the site is not the row's.
- **Row outcome set (phase 1):** `discovery-found` (pending — a website was
  found, phase 2 still owed) / `no-website` (terminal). The 18 curated rows
  do not go through discovery (their domains are already in the data); they
  enter phase 2 directly via the confirm pass (Component F).

## 6. Component C — crawl script `scripts/crawl-hospice-shops.mjs`

**Facts established this session** (design must respect them exactly):

- `data-raw/shops-website.json` is 155 lines / 138 entries: one-line objects
  `{"hospiceId","name","address","postcode","source"}` (this exact key
  order), grouped into 16 legacy-slug blocks separated by blank lines,
  closing `]` at L155. It is the only shop raw source the geocoder and
  build read (`geocode-shops.mjs` L8, `build-data.mjs` L1058).
- The geo key is case-sensitive and computed identically at geocode L14 and
  build L1063: `s.postcode ?? s.address.join(', ').toUpperCase()`. The
  geocoder stores the postcode **as scraped** — so the crawler must emit
  postcodes normalised (uppercase, single internal space, canonical form)
  to guarantee the geocoder's stored key equals the build's lookup key.
- `build-data.mjs` assigns output ids by array index (L1069
  `id: \`shop-${i}\``) — new entries are **appended only**; insertion would
  renumber the existing 138 output ids.

Behaviour:

1. **Load & resume:** read `hospices-all.json`; read
   `data-raw/shop-crawl-log.json` if present. Phase 1 processes discovery
   rows that have no log entry yet; phase 2 processes rows whose outcome is
   `discovery-found`.
   Terminal outcomes are never retried within a run — a "re-crawl" is a
   human decision, performed by deleting that row's log entry (manual
   refresh story, documented in the log).
2. **Phase 1** as in Component B; each accepted site is written to the log
   as `discovery-found` with `website` + `discoverySource`, then the script
   proceeds straight to phase 2 for it (single-run pipeline, resumable).
3. **Phase 2 per site** (sites are visited strictly one at a time, 1100 ms
   between any two requests to the same site — all requests in the script
   are sequential, so the geocoder's mechanism IS the pace):
   a. `GET /robots.txt` (plain fetch). Minimal parser: `User-agent: *`
      scope, `Disallow:` lines, literal prefix match, missing robots.txt =
      allow. Shop path disallowed → site outcome `skipped-robots`.
      (Known limitation: no `*` wildcard / regex rules in the parser; the
      two curator sites' robots are plain WordPress disallows — research §3.
      If a site's robots uses syntax the parser does not understand, the
      script logs `skipped-robots` with a `note` — fail-safe, not
      fail-open.)
   b. Root page: plain fetch first. Status 403/429/5xx or a JS shell (no
      parseable nav links) → headless render (Component below).
   c. **Shop-page locator:** from the rendered/fetched root, collect
      navigation links (`<nav>`/`<header>` `<a>` elements; fallback: all
      `<a>` in the first ~30 KB of HTML), match link **and** href against
      `/shop|shop\w*|store|retail/i` (e.g. "Our Shops", "/shops/"). First
      match = shop listing page. No match → `no-shop-page`. An explicit
      nav item that is a link to a PDF counts as the listing (→ PDF pass).
   d. **Page engagement order** (owner decision 2): plain fetch →
      headless render → PDF-embedded text → log `unreadable`. For the
      listing page: parse candidate entries — list items / table rows /
      blocks containing a UK postcode pattern
      (case-insensitive, normalised to canonical form); each candidate is
      accepted as a shop only if it has a name (the list's heading/first
      item), an address string, and the postcode; `name` = best shop-name
      candidate, `address` = the remaining address parts split on commas
      per the existing file's convention, `postcode` = normalised form,
      `source` = the page URL (per-entry, not per-site).
   e. Sub-pages: sibling shop-directory links on the listing page (hrefs
      also matching the locator regex) are followed, capped at **3 pages
      per site total** (feature: "no deep site crawling").
   f. **Dedupe:** normalised key = uppercased, punctuation-stripped,
      whitespace-collapsed `name + ' ' + address.join(', ')`, compared
      against all 138 existing entries **and** entries appended earlier in
      this run. Key hit → skip (never mutate/replace the curated entry);
      count as `deduped` in the log.
   g. **Append:** survivors, grouped by hospice id, added as new
      blank-line-separated blocks **after the last existing block, before
      the closing `]`**; each line built by `JSON.stringify` of an object
      created in the exact existing key order (hospiceId, name, address,
      postcode, source). `postcode` is the normalised string (or `null` if
      the page gave no postcode but a full address — same convention as the
      12 existing address-keyed entries).
4. **Headless browser** (ADR-0044): Playwright, `devDependencies` only,
   Chromium. The script itself **never downloads a browser binary** — if
   none is installed the script prints the exact human command
   (`npx playwright install chromium`) and logs the site `blocked` with
   `note: "headless unavailable"` (no retry loop, no in-script install).
   Per-site `browser.newContext()` isolation (clean cookies per site),
   project UA set on the context.
5. **PDF-embedded text (best-effort):** when the listing is a linked PDF —
   fetch the PDF, extract text-layer strings via `pdfjs-dist` (devDep,
   per accepted ADR-0044; the dependency-free `zlib.inflateSync`
   text-stream technique remains as fallback when pdfjs throws); if the
   extracted text lacks a parseable entry → `unreadable` (feature
   out-of-scope line: such lists are logged, not chased).
6. **`blocked` outcome:** set when plain fetch AND headless render both
   fail (403 to both) — per site, per attempt; no retry loop (binding
   rule). Sites blocked are retried by a later human run only.
7. **Logging:** every request is counted; every site gets exactly one log
   row at its terminal state; the log file is written after each site
   completes (crash-safe resume point).

Exit code 0 even with `blocked`/`unreadable` sites — the log carries the
record; a nonzero exit is reserved for script bugs.

## 7. Component D — crawl log (ADR-0045)

- **Location:** `data-raw/shop-crawl-log.json` — committed, next to the raw
  shop sources it describes (reproducibility/audit rule; A-10 keeps it in
  scope). Not `.agents/` (pipeline state, not data provenance), not
  `docs/` (must be machine-checkable by tests).
- **Role:** single source of both the audit record AND the resumable state
  (no second state file — two files would drift).
- **Schema** (one `entries` array, one row per in-scope hospice row — 190
  discovery rows + 18 confirms; plus a `meta` header):

  `meta`: `{run: <ISO date of latest run>, script, ua, paceMs,
  outcomeVocabulary: [8 values], source: "feature-cycle10 + research-cycle10"}`

  `entries[]`: `{hospiceId, name, nation, phase: "discovery"|"confirm",
  outcome, website?, discoverySource?, pagesVisited (int), shopsExtracted
  (int), deduped (int), unresolvedPostcodes [] (postcodes Nominatim did not
  resolve for this site's new entries), blocked?, note? (free text —
  human-audit flag, parser-limitation notes), committed (bool — true when
  this site contributed appended entries)}`

- **Outcome set (8, owned by the log, mirrored in the feature spec):**
  `ok` (page read, ≥1 shop extracted and committed — the confirm pass's
  successful state too), `no-shop-page`, `unreadable`, `skipped-robots`,
  `blocked`, `not-found` (site URL from the register/sitename probe does
  not resolve — the 2 en rows with a website may land here), `no-website`
  (discovery exhausted/declined), `discovery-found` (phase 1 succeeded,
  phase 2 pending — the ONLY non-terminal marker).
- **`confirms` section:** the 18 curated sites get `phase: "confirm"` rows
  in the same array; `shopsExtracted` is 0 by design (confirm-only — page
  existence check only, no re-extraction, no write to the 138),
  `committed: false` always.
- **Committed:** yes — it is the reproducibility/audit artefact (who
  visited what, what came back, which shops were committed and from which
  source URL) and the resume state. A test (`tests/crawl-log.test.mjs`)
  validates schema + outcome vocabulary on every `npm test`.
- **Manual refresh story:** re-crawl a site = delete its row, re-run; the
  script never overwrites terminal rows on its own.

## 8. Component E — geocode + build integration (unchanged scripts, run-order)

No code change to `scripts/geocode-shops.mjs` (it is already resumable: L32
skips stored keys; 1100 ms pace; writes `data-raw/shops-geo.json`). The
pipeline run-order is:

1. `node scripts/crawl-hospice-shops.mjs` (phase 1 → append → log).
2. `node scripts/geocode-shops.mjs` — geocodes only the net-new keys;
   `no match` postcodes are collected into the log's
   `unresolvedPostcodes` (their shops drop out of the build by existing
   behaviour — build-data L1063–1064 `shopGeoMissing` path — which the
   owner spec accepts: acceptance 3).
3. `node scripts/build-data.mjs` — identity via Component A; exits 0 only
   if every committed shop id resolves (L1082 gate preserved).
4. `npm test` + `npx tsc -b` (the app typecheck stays green — nothing in
   `apps/` changed, but the gate runs per the feature spec).
5. README.md + data/README.md: entry count, site coverage, crawl date,
   headless-browser note (acceptance 7).

Budget: ≈ 190 discovery requests ≈ 3.5 min; crawl is linear in sites-found
(≈ 3–6 requests per site at 1100 ms pace ≈ 10–30 min for a dozen sites);
geocode ≈ 1.1 s per new postcode. Total: a ~1 hour order, **multi-run by
design** — resumability (log-as-state + geocode skip) is load-bearing, and
the Coding stage must allow long, interruptible runs.

## 9. Component F — the 18 curated sites (confirm-only)

Per the feature spec's out-of-scope line: no re-crawling of the 18
listed sites' shop pages; the crawl may confirm page existence but does not
re-extract. Concretely: the 18 domains (research §2 — the only non-CQC
hostnames among the 150 `website` values) get `phase: "confirm"` log rows:
robots.txt check, one root fetch, one attempt to reach the same shop-path
the 138 entries' `source` URLs live under (existence check only). Outcomes: `ok` (page present), `blocked` (WAF refused even headless —
trinity-style intermittence), `not-found` (domain no longer resolves). The
18 are exactly the curated 18 from research §2; the 2 en rows *without* a
website go through phase 1 discovery, not the confirm pass. Confirm rows
**never** read from or write to
`shops-website.json`; `committed: false` is invariant — asserted by the
log test. This is the only part of the cycle that touches the curated 18,
and it is read-only.

## 10. Security

- **Crawl surface:** public pages only; no forms, no signups, no
  non-shop pages beyond the locator's nav (3-page cap). Project UA with
  contact identity on every request (plain and headless) — identified, not
  impersonated.
- **Rate:** 1100 ms between any two requests to the same site; at most one
  DDG query per hospice row. No parallelism, no concurrency — by design
  (research §4 precedent: geocoder is serial).
- **robots.txt** honoured (Component C.3.a); fail-safe on unparseable
  robots (skip, don't plough through).
- **WAF/blocks:** plain → one headless attempt → log `blocked`. No retry
  loops, no gateway-circumvention payloads, no extra headers to defeat
  WAFs beyond the honest browser profile.
- **Data hygiene:** entries are name + address + postcode + source URL —
  business locations the hospices publish themselves; no personal data
  collected, stored, or logged beyond what the page shows. Log stores
  URLs and counts, no page bodies. No credentials or keys in the script.
- **Identity trust boundary (ADR-0043):** shops map to hospices **only**
  via the validated id set (legacy table first, then record-set
  membership); everything else hards-fails the build. This is the
  trust-boundary design decision for the cycle — a silent
  `??`-fallback would attribute shops to the wrong hospice without any
  signal (route to Architect level if the Reviewer objects).
- **Playwright (ADR-0044):** devDependency only, browser binary installed
  by a human command, never by the script; removable with a `devDependencies`
  line without touching the runtime set.
- **Reproducibility/audit:** every committed shop's `source` URL is
  committed; the log records the full provenance chain (discovery source →
  site → page → entry). QA can audit any row end-to-end.
- **No secrets, no telemetry**: the script talks to the open web + DDG +
  (indirectly, via the unchanged geocoder) Nominatim. Nothing new
  surfaces.

## 11. Testing strategy

Conventions: `node --test` (no framework), `tests/*.test.mjs` importing repo
modules directly; no existing build-data test — the shop-identity tests are
greenfield. New tests (all pure-function / file-shape tests, no network):

1. `tests/shop-identity.test.mjs` — `resolveShopId` from
   `scripts/shop-identity.mjs`:
   - **Non-regression (load-bearing):** for every one of the 138 entries in
     the committed `data-raw/shops-website.json`, resolution via the new
     helper equals the id the legacy `SLUG_TO_ID` table produced (test builds
     the same table from `data-raw/catchment-map.mjs` `CATCHMENTS`, the
     same source build-data uses — line by line, no drift).
   - Canonical id in the `hospices-all.json` id set → resolves to itself.
   - Id neither legacy nor in the set (typos, foreign ids) → null (build
     exit-1 path, not silent mapping).
   - Legacy slug present in the table → table wins even if it also
     resembles a canonical pattern.
2. `tests/shop-byte-preserve.test.mjs` — `data-raw/shops-website.json`
   begins byte-for-byte with `tests/fixtures/shops-website-baseline.json`
   (committed before any append; the baseline file is the 138-line
   pre-crawl content). Proves acceptance 2's byte-preservation.
3. `tests/shop-entry-shape.test.mjs` — every entry (138 + appended): key
   order `{hospiceId, name, address, postcode, source}`; `postcode` is
   `null` or the normalised canonical form (uppercase, single space);
   `source` is an absolute URL; `hospiceId` ∈ {legacy slugs} ∪ canonical id
   set. Runs on the live file, so it guards future appends too.
4. `tests/shop-dedupe.test.mjs` — the normalisation function:
   case/whitespace/punctuation-insensitive collision detection
   ("St. Catherine's, Adlington" vs "St Catherine's Adlington" → same key;
   distinct streets → distinct keys).
5. `tests/crawl-log.test.mjs` — committed `data-raw/shop-crawl-log.json`:
   schema keys present per row; `outcome` ∈ the 8-value set; `discovery-found`
   rows have `website` + `discoverySource`; `phase: "confirm"` rows have
   `shopsExtracted: 0` and `committed: false` (the 18 are untouchable);
   `ok`/`no-*-page`/`blocked` rows with `committed: true` have
   `shopsExtracted ≥ 1`.
6. Existing tests must stay green unchanged (`tests/handler.test.mjs`,
   `tests/postcodes*.test.mjs`, `tests/patient-journey*.test.mjs`).

No test may hit the network — every behaviour above is designed to be
testable as pure file-shape + pure-function.

## 12. Certification gates

- **G0 (baseline, pre-crawl):** identity helper + build one-line change in;
  `node --test` green with the new tests; `node scripts/build-data.mjs`
  exits 0 with the same stdout summary as before the change (proof: record
  pre-change output, diff post-change; the counts must be identical).
- **G1 (identity proof on the 138):** test 1 passes — every existing entry
  resolves to exactly the id it resolved to before.
- **G2 (crawl run):** `node scripts/crawl-hospice-shops.mjs` exits 0; log
  committed; test 5 passes; appended entries exist per `committed` rows.
- **G3 (byte-preservation):** test 2 passes on the post-crawl file.
- **G4 (geocode + build):** `node scripts/geocode-shops.mjs` then
  `node scripts/build-data.mjs` exit 0; build summary shows
  `unresolved ids: 0`; `public/data/shops.json` entry count ≥ the
  pre-crawl count (dropouts only via the existing geo-missing path, each
  listed in the log's `unresolvedPostcodes`).
- **G5 (full gates):** `npm test` green, `npx tsc -b` green, `npm run
  build-data` green; README.md + data/README.md updated (count, coverage,
  crawl date, headless note).
- **G6 (A-05 ritual):** rebuild twice; `public/data/*.json` byte-
  identical (SHA-256) across the two runs.

## 13. Decisions (this cycle — each underdetermined, each decided)

- **D1 — Discovery pool is 190, not 58** (research §2: 132 CQC-profile-only
  rows carry no pointer to a real site; CQC API dead). Discovered by the
  identity pass-through's scope math; cost ≈ 3.5 min of search; the
  alternative (58) would silently skip 132 EN hospices.
- **D2 — Identity pass-through via validation set, not blind `??`, not
  drop, not new slugs** (ADR-0043). Preserves the build's hard-fail safety;
  legacy-first ordering keeps the 138 byte-resolving.
- **D3 — Playwright (Chromium) as devDependency; human-installed binary;
  plain → headless → PDF-text engagement order** (ADR-0044). Not Puppeteer
  (real reasons, §14); not no-browser (2/5 sampled curated sites 403 plain
  clients — browser is load-bearing for reachability, not just fidelity).
- **D4 — Committed log `data-raw/shop-crawl-log.json`, log-doubles-as-state,
  8-value outcome set, per-row decisions auditable** (ADR-0045).
- **D5 — Postcodes emitted in canonical normalised form** (uppercase,
  single space) so the geocoder's stored key == the build's lookup key
  exactly (case-sensitive key rule, L14/L1063).
- **D6 — Append-only writes to `shops-website.json`** (array-index output
  ids at L1069; insertion would renumber all existing `shop-N` ids).
- **D7 — 3-page cap per site; locator regex `/shop|shop\w*|store|retail/i`**
  on nav text+href; first match wins; no match = `no-shop-page`. (Keeps the
  crawl inside "shop-listing pages" per the feature's out-of-scope line.)
- **D8 — `discovery-found` is the only non-terminal log outcome** — it is
  the resume marker and the only row a later run acts on; terminal rows are
  human-deletable to re-crawl.
- **D9 — Script exits 0 on `blocked`/`unreadable`/`no-*` sites** — the log
  is the record; nonzero is reserved for script bugs, so a long multi-run
  crawl is safe to re-invoke.
- **D10 — No re-extraction of the curated 18** — confirm pass is
  read-only existence check; `profiles` rows carry
  `committed: false` invariant.
- **D11 — OSCR treated as unreachable** (lead-verified ENOTFOUND); all sc
  rows go through the search channel; no headless-OSCR design included.
- **D12 — Manual refresh only, no cron** (feature spec); refresh = delete
  log rows + re-run; documented in the log's `meta`.

## 14. Alternatives considered

- **Identity (ADR-0043):** blind `?? inputId` (silent mis-attribution risk —
  an unknown id would resolve as if valid); dropping unresolved shops
  (data loss; build gate weakened); adding canonical ids as new slugs to
  `CATCHMENTS` (table bloat; the 208-row record is already the source of
  truth — a second table would drift); reverse-lookup by name (fragile,
  duplicated logic). **Chosen: legacy table + record-set validation.**
- **Browser (ADR-0044):** Puppeteer — functionally equivalent for this
  task; the real reasons for Playwright are: library-pinned browser builds
  (reproducible across dev machines), per-context isolation without
  background workers (clean per-site cookie isolation, plain Node —
  matches the repo's `node --test` plain-JS tooling), and first-class
  `request`/`page` APIs for the plain→headless fall-through. Not
  capability, not tooling-parity with any other stage. No-browser:
  infeasible (WAF 403s verified on core curated sites).
- **Log location (ADR-0045):** `.agents/` (pipeline state, per contract not
  data provenance — and QA/Security read `.agents/` as ledgers); `docs/`
  (prose, not testable); ephemeral stdout (violates the reproducibility
  rule; nothing committed to audit); per-site files (190 files, audit-hell).
  **Chosen: one committed file in `data-raw/`.**
- **Discovery channel:** OSCR/headless-regulator (unreachable — D11);
  manual by owner (out of scope; the owner delegated it to the pipeline);
  blind top-hit acceptance (directory/wrapper contamination, research §5).
  **Chosen: DDG HTML endpoint + wrapper reject list + own-domain
  acceptance.**
- **State file:** separate `shop-crawl-state.json` (two sources of truth
  that drift); **Chosen: log = state** (D8).
- **Postcode handling:** store as scraped (case-sensitive key breakage —
  e.g. `pr6 9nn` never matches a later `PR6 9NN`); **Chosen: normalise
  on write** (D5).

## 15. Risks / open questions → Reviewer

1. **Discovery quality:** top hits can be wrappers/directories or a
   parent organisation's site (duplicate-identity rows, e.g.
   `sc-oscar-005623`). Mitigation: wrapper reject list + conservative
   own-domain acceptance + per-row `no-website`-with-note for audit.
   Residual: some real sites will be missed (logged `no-website`) — accepted
   per the feature's "best-effort" wording.
2. **`discovery-found` as resumable non-terminal outcome** (D8) means a
   crash between phase 1 and phase 2 leaves the log half-written — by
   design the next run re-processes exactly such rows; verify the
   written-per-site (Component C.7) granularity is sufficient.
3. **PDF text-layer fragility:** best-effort extraction; malformed/
   scanned PDFs → `unreadable` — the feature explicitly accepts this.
4. **Budget:** ~1 hour order, multi-run with resumability. Coding stage
   must be allowed to run long/interrupted (each sub-run re-invoke is
   safe per D9).
5. **Feature acceptance 5 wording** ("never shrinks below the 138-shop
   baseline") — the **built** `shops.json` count depends on geo resolution
   (unmatched postcodes drop by existing behaviour, e.g. address-keyed
   entries). Interpretation: the floor applies to committed entries; the
   built count must be ≥ the pre-crawl built count, with every dropout
   listed in the log. **Reviewer: confirm this reading matches the owner.**
6. **Confirm-pass `blocked` entries** (WAF on 2 of the 18) — a confirm row
   may log `blocked` with no data change; that's expected, not a failure.
7. **DDG dependency drift:** if `html.duckduckgo.com` changes/blocks the
   project UA mid-run, discovery degrades to `no-website` for remaining
   rows — no channel substitution mid-run (would break log semantics);
   note it and resume later.

## 16. References

- `.agents/feature-cycle10.md` — owner spec (read in full; decisions 1–3
  verbatim in §1).
- `.agents/research-cycle10.md` — Stage 1 (incl. §6 lead verification:
  OSCR ENOTFOUND, trinity intermittency); every line cited above with §.
- `.agents/pipeline.md` §Cycle 10 — goal, binding crawl policy, lead
  integration notes 1–3.
- `scripts/build-data.mjs` — L33–36 `SLUG_TO_ID`, L63 `hospicesAll`,
  L1056–1082 shop chain + hard-fail (all verified this session).
- `scripts/geocode-shops.mjs` — L6 UA, L14 key rule, L32 skip, L43 pace,
  L46 write (all verified this session).
- `data-raw/shops-website.json` — 155 lines / 138 entries / exact key
  order (verified this session); `data-raw/hospices-all.json` — 208 rows.
- `package.json` — `"test": "node --test"`; devDep precedent `xlsx:
  ^0.18.5` (verified this session).
- `docs/adr/0043`, `0044`, `0045` (this cycle); ADR-0002 (canonical id
  scheme); A-01–A-10 (`docs/rules/`): A-02 (script placement), A-05
  (byte-identical rebuild), A-08 (reproducibility rule), A-09 (log),
  A-10 (repo hygiene).
- `tests/` — `node --test` convention (verified: `handler.test.mjs`,
  `postcodes.test.mjs`, `postcodes-client.test.mjs`).

