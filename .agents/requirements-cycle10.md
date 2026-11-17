# Requirements — Cycle 10

Crawl the 150 hospice websites in the data plus run site discovery for the 58
hospices without one (a 190-row discovery pool: 132 CQC-profile-only rows + 58
explicit no-website rows), and an 18-site confirm-only pass, appending the
machine-readable charity-shop entries to `data-raw/shops-website.json` in its
existing `{hospiceId, name, address[], postcode, source}` shape, with every
attempt recorded in the committed crawl log. Coder order is mandatory: Component A
identity pass-through (architecture §4 / ADR-0043) first and green before anything
else, then the 5 new tests + fixture, then the headless devDeps, then the crawl
script (site discovery + per-site crawl + log writing, §5–§9 / ADR-0044 / ADR-0045),
then the crawl RUN as its own long, interruptible item, then README counts and
provenance. Gates G0–G6 are lead/QA-run certifications, referenced where they prove
an item — they are not coder todos.

## Work list

### W1 — Record the Cycle 10 baseline (G0 inputs)

- **Files:** `.agents/implementation-cycle10.md` (new ledger)
- **Prereqs:** —
- **Do:** Record in the ledger: the current `node --test` exit state; the
  `data-raw/shops-website.json` entry count (must parse to 138); the exact
  `shops:` summary line printed by `node scripts/build-data.mjs`; whether the
  Playwright chromium binary is present (`npx playwright install` state). These
  are the G0 baseline values every later Accepts compares against.
- **Accepts:** `.agents/implementation-cycle10.md` exists and contains all four
  baseline values; `node -e "console.log(JSON.parse(require('fs').readFileSync('data-raw/shops-website.json','utf8')).length)"`
  prints `138`; `node --test` exits 0.
- Cites: architecture §12 G0; feature spec binding constraints (138 baseline,
  A-05).

### W2 — Component A: `scripts/shop-identity.mjs` identity pass-through helper

- **Files:** `scripts/shop-identity.mjs` (new)
- **Prereqs:** —
- **Do:** Export `resolveShopId(inputId, canonicalIds, slugToId)` — the only
  export. Pure, no I/O, zero imports: first `slugToId[inputId]` (legacy table
  wins); else `canonicalIds.has(inputId) ? inputId : null`; else `null`. No
  blind `?? inputId` fallback — an unresolvable id must stay `null` so the
  build hard-fails as before.
- **Accepts:** `node --input-type=module -e "const m=await import('./scripts/shop-identity.mjs'); console.log(typeof m.resolveShopId, m.resolveShopId('nope', new Set(['x']), {}), m.resolveShopId('x', new Set(['x']), {x:'legacy'}), m.resolveShopId('x', new Set(['x']), {}))"`
  prints `function null legacy x`.
- Cites: architecture §4 / D2 / ADR-0043 (helper signature).

### W3 — `tests/shop-identity.test.mjs` + baseline fixture

- **Files:** `tests/shop-identity.test.mjs` (new), `tests/fixtures/shops-website-baseline.json` (new)
- **Prereqs:** W2
- **Do:** Create the fixture as a byte-identical verbatim copy of the current
  `data-raw/shops-website.json` (not a re-serialisation). The test rebuilds the
  legacy table exactly as `scripts/build-data.mjs` L33–36 does (from
  `data-raw/catchment-map.mjs` `CATCHMENTS`, `cqcUrl` regex `location/(1-\d+)`)
  and asserts, for every one of the 138 fixture entries:
  `resolveShopId(hospiceId, canonicalIds, legacyTable)` equals the pre-cycle
  resolution; every `hospices-all.json` canonical id resolves to itself; an id
  in neither set resolves to `null`.
- **Accepts:** `node --test tests/shop-identity.test.mjs` exits 0;
  `cmp tests/fixtures/shops-website-baseline.json data-raw/shops-website.json`
  exits 0. This is the test gate G1 runs.
- Cites: architecture §4, §11 test 1; ADR-0043.

### W4 — Component A: one-line build-data change

- **Files:** `scripts/build-data.mjs` (edit, 3-line diff only)
- **Prereqs:** W2, W3
- **Do:** `import { resolveShopId } from './shop-identity.mjs';`; add
  `const canonicalIds = new Set(hospicesAll.map((h) => h.id));` directly after
  `hospicesAll` (L63); replace the L1065 lookup `SLUG_TO_ID[s.hospiceId]` with
  `resolveShopId(s.hospiceId, canonicalIds, SLUG_TO_ID)`. Change nothing else —
  in particular not the L~1069 array-index `id: \`shop-${i}\`` assignment (the
  append-only write rule this makes) and not the L1082 hard-fail.
- **Accepts:** `npm run build-data` exits 0 and its `shops:` summary line is
  byte-equal to the W1 baseline; `npm test` exits 0; A-05 ritual: two
  consecutive `npm run build-data` runs give identical `sha256sum` of
  `public/data/*.json` (G0).
- Cites: architecture §4 / ADR-0043; review finding: array-index ids ⇒
  append-only writes.

### W5 — `tests/shop-byte-preserve.test.mjs`

- **Files:** `tests/shop-byte-preserve.test.mjs` (new)
- **Prereqs:** W3 (fixture)
- **Do:** Assert `data-raw/shops-website.json`'s raw bytes have as a prefix the
  fixture's raw bytes minus its closing `]` line (the first 138 entry lines
  are byte-identical, in order and position), and that the parsed first-138
  entries deep-equal the fixture entries. Prefix check, not whole-file
  equality: a post-crawl file legitimately gains blocks before the closing
  bracket, and the append-only rule forbids touching the first 138.
- **Accepts:** `node --test tests/shop-byte-preserve.test.mjs` exits 0 on the
  current file; `grep -c "startsWith" tests/shop-byte-preserve.test.mjs` ≥ 1
  (the assertion is prefix-based, so it keeps holding after appends).
- Cites: architecture §6, §11 test 2; review finding (byte-preservation; G3
  runs this test).

### W6 — `tests/shop-entry-shape.test.mjs`

- **Files:** `tests/shop-entry-shape.test.mjs` (new)
- **Prereqs:** W3
- **Do:** Parse `data-raw/shops-website.json` and assert for every entry: keys
  are exactly `['hospiceId', 'name', 'address', 'postcode', 'source']` in that
  order (checked on the parsed object, so a future append with wrong key order
  fails the suite); `name` is a non-empty string; `address` is a non-empty
  array of strings; `postcode` is `null` or equals its normalised form
  (uppercase, single internal space); `source` matches `^https?://` with a
  host; `hospiceId` is in (legacy slugs ∪ `hospices-all.json` id set).
- **Accepts:** `node --test tests/shop-entry-shape.test.mjs` exits 0 on the
  committed 138-entry file today, and after W14 on the grown file (proving the
  appended entries have the exact shape).
- Cites: architecture §6, §11 test 3; D5 (identity pass-through keeps the
  build from seeing ids it cannot resolve).

### W7 — `tests/shop-dedupe.test.mjs` + `scripts/shop-normalise.mjs`

- **Files:** `scripts/shop-normalise.mjs` (new), `tests/shop-dedupe.test.mjs` (new)
- **Prereqs:** W3
- **Do:** `scripts/shop-normalise.mjs` exports the two pure functions the
  architecture fixes but leaves unlocated: `normalisePostcode(pc)` (uppercase,
  collapse internal whitespace to a single space, `null` passthrough) and
  `normaliseShopKey(name, address)` (uppercase, strip punctuation, collapse
  whitespace, `name + " " + address.join(", ")`). Test cases: `"St.
  Catherine's, Adlington"` vs `"St Catherine's Adlington"` → identical keys;
  `"St. Catherine's"` with `['Adlington Road']` vs `['Adlington Lane']` →
  distinct keys; `normalisePostcode('m1  1aa')` → `M1 1AA`; the same entry
  object normalises to the same key twice. `scripts/shop-normalise.mjs` is the
  chosen shared module: the crawl script and W6 both import it, so the dedupe
  key and the shape test share one implementation.
- **Accepts:** `node --test tests/shop-dedupe.test.mjs` exits 0;
  `node --input-type=module -e "const {normalisePostcode}=await import('./scripts/shop-normalise.mjs'); console.log(normalisePostcode('m1  1aa'))"`
  prints `M1 1AA`.
- Cites: architecture §6 (dedupe rule), §11 test 4, D5; matching
  `scripts/geocode-shops.mjs` L14 key scheme.

### W8 — `package.json` devDependencies: `playwright` + `pdfjs-dist`

- **Files:** `package.json`, `package-lock.json`
- **Prereqs:** — (place after W4 is green, per the mandated order)
- **Do:** `npm i -D playwright pdfjs-dist`. devDependencies only — the
  zero-runtime-dep rule (precedent: devDependency `xlsx: ^0.18.5` at
  `package.json` L32). Do not touch `"dependencies"`. Do not run
  `npx playwright install chromium` — the browser binary is human-installed
  (F-3); the crawl script prints the command at runtime.
- **Accepts:** `npm ls playwright pdfjs-dist` exits 0;
  `node -e "console.log(JSON.stringify(require('./package.json').dependencies))"`
  prints exactly the value recorded in W1 (runtime deps unchanged).
- Cites: architecture §13 D3 / ADR-0044; review F-3 (binary = environment,
  not a build/test dependency).

### W9 — `tests/crawl-log.test.mjs`

- **Files:** `tests/crawl-log.test.mjs` (new)
- **Prereqs:** —
- **Do:** If `data-raw/shop-crawl-log.json` is absent, the test passes
  (pre-crawl state; keeps `npm test` green for G0). If present, it asserts: a
  `meta` header with `run`, `script`, `ua`, `paceMs`, `outcomeVocabulary`
  (exactly the 8 values `ok / no-shop-page / unreadable / skipped-robots /
  blocked / not-found / no-website / discovery-found`) and `source`; every
  `entries[]` row carries `hospiceId`, `nation`, `site`, `phase`, `outcome`,
  `pagesVisited`, `shopsExtracted`, `deduped`, `committed`, `note`,
  `unresolvedPostcodes`, `discoverySource`; `outcome` is in the vocabulary;
  `discovery-found` rows have non-empty `website` + `discoverySource`; rows
  with `phase: "confirm"` have `shopsExtracted === 0` and `committed ===
  false`; `committed: true` rows have `shopsExtracted ≥ 1`. The test must
  include one synthetic malformed row proving the validator flags violations
  (green only if the validator reports them).
- **Accepts:** `node --test tests/crawl-log.test.mjs` exits 0 with the log
  absent (today). After the crawl run (W14) the same command must exit 0
  against the committed 208-row log (G2 input).
- Cites: architecture §7, §11 test 5, §13 D4; ADR-0045 (row shape, confirm-row
  invariants).

### W10 — Component B + D: site discovery with crawl-log writing

- **Files:** `scripts/crawl-hospice-shops.mjs` (new)
- **Prereqs:** W7, W8, W9
- **Do:** The script derives its discovery pool from `data-raw/hospices-all.json`
  (no hard-coded list) and prints the pool size and composition on every
  invocation: 58 rows with no `website` + 132 rows whose `website` is a
  `cqc.org.uk` profile URL = 190. Per unlogged row: one DDG query (`html.duckduckgo.com/html/?q="<name> <town> hospice"`), ~1 req/s (1100 ms pace), a
  descriptive project User-Agent constant at the top of the script (same
  descriptive form as `scripts/geocode-shops.mjs` L6); decode the `uddg=`
  redirect links; reject wrapper/directory domains by exact match **or
  subdomain** (`hospiceuk.org`, `palliativecarescotland.org.uk`,
  `scotcharityregister.org.uk`, `cqc.org.uk`); accept a candidate as the
  hospice's own site only on the registered-name token test against the
  second-level domain, or the full registered name in the root page's
  `<title>`/`<h1>` (one extra paced fetch); ambiguous → `no-website`; a
  candidate belonging to the parents' website → `no-website` + note flagged
  for human audit. Write the crawl-log row on each decision: `discovery-found`
  (with `website` + `discoverySource`) or `no-website`. **Review F-1 (carried
  as a coding requirement):** on transient transport failures (429 / 5xx /
  timeout / network drop) the discovery round of that row must leave its log
  row **unwritten** — a transport failure never becomes a terminal row (no
  `not-found`); the next invocation re-attempts it, and gate G2's coverage
  check self-enforces the rule (QA verifies with a simulated 429).
- **Accepts:** `node --check scripts/crawl-hospice-shops.mjs` exits 0;
  `node --input-type=module -e "const m=await import('./scripts/crawl-hospice-shops.mjs'); console.log(typeof m.isWrapperDomain)"`
  prints `function` without network traffic (main runs only from
  `process.argv[1]`, so pure helpers are import-safe).
- Cites: architecture §5 (site discovery), §7 (log writing); D1, D7; review
  F-1.

### W11 — Component C: per-site crawl, entry append, per-site log

- **Files:** `scripts/crawl-hospice-shops.mjs` (extended)
- **Prereqs:** W10
- **Do:** For each `discovery-found` row: check robots.txt via the fail-safe
  minimal parser (disallows the page → `skipped-robots`); engage each page in
  the fixed order plain fetch → headless render → PDF text layer; headless
  uses a fresh `browser.newContext()` per site with the project UA and a
  headline-wait timeout + settle; if the chromium binary is missing, print
  `npx playwright install chromium` once and fall through to `blocked` /
  `unreadable` with `note: "headless unavailable"` (no retry); PDF pages go
  through `pdfjs-dist` with the `zlib.inflateSync` fallback, else
  `unreadable`; the shop-page locator (`/shop|shop\w*|store|retail/i` on nav
  text and hrefs, first match wins) bounds each site to 3 pages. Per listing:
  extract UK-postcode candidates, split name/address on commas, normalise the
  postcode (W7) or store `null` for address-only entries, `source` = the page
  URL the entry was read from. Dedupe on `normaliseShopKey` against the
  existing 138 **and** this run's appended entries (hit → skip existing,
  count in `deduped`). Append new entries to `data-raw/shops-website.json` as
  blank-line-separated blocks after the last existing block and before the
  closing `]`, each block one `JSON.stringify` of `{hospiceId, name, address,
  postcode, source}` in exactly that key order (ids become `shop-${138+}` by
  array index). Rewrite the crawl log after every site (ADR-0045 write
  cadence); `blocked` only after plain **and** headless both fail; no retry
  loops; exit 0 on data outcomes.
- **Accepts:** `node --check scripts/crawl-hospice-shops.mjs` exits 0; the
  W10 import smoke command exits 0 (no network); W5 and W6 tests still exit
  0 on the unchanged file. After W14 these files are re-checked: `tests/crawl-log.test.mjs`
  and `tests/shop-byte-preserve.test.mjs` exit 0 on the committed log and
  grown file (G2, G3).
- Cites: architecture §6 (crawl), §7 (log cadence); D3, D6, D7, D9, D10;
  ADR-0044, ADR-0045; review append-only rule (append end, ids 138+, never
  reorder or re-shape existing entries).

### W12 — Component F: confirm-only pass on the 18 curated sites

- **Files:** `scripts/crawl-hospice-shops.mjs` (extended)
- **Prereqs:** W11
- **Do:** Derive the 18 curated domains from the data: the distinct
  non-`cqc.org.uk` hosts among the 150 `website` values (exported pure
  function `confirmDomains()`, fed by `hospices-all.json` — no hard-coded
  list). Per site: robots check, one root fetch, one attempt to reach the
  shop path under which the 138 entries' `source` URLs live; existence
  check only — never re-extract. Outcomes: `ok` / `blocked` / `not-found`.
  Log rows: `phase: "confirm"`, `shopsExtracted: 0`, `committed: false`
  (invariants W9 asserts). The confirm pass must never read or write
  `data-raw/shops-website.json`.
- **Accepts:** `node --input-type=module -e "const m=await import('./scripts/crawl-hospice-shops.mjs'); console.log(m.confirmDomains().length)"`
  prints `18` (pure, no network).
- Cites: architecture §9 (Component F); D6, D10 (confirm-row invariants).

### W13 — Component E: geocode sync + run-order wiring (no geocode-script change)

- **Files:** `scripts/crawl-hospice-shops.mjs` (extended: no-network sync pass)
- **Prereqs:** W12
- **Do:** `scripts/geocode-shops.mjs` stays unchanged (already 1 req/s,
  1100 ms pace, resumable via its L31 stored-key skip). When invoked with
  every log row terminal (all 208), the script performs a no-network
  post-geocode sync: for each `committed: true` row, compute its geo
  key(s) with the D5 scheme (`normalisePostcode` / upper-cased
  `address.join(', ')` per `scripts/geocode-shops.mjs` L14) and set
  `unresolvedPostcodes` to the keys missing from `data-raw/shops-geo.json`.
  The script's stdout documents the §8 run order (crawl → geocode → sync →
  build → `npm test` + `npx tsc -b` → READMEs) for the W14 operator.
- **Accepts:** `node --check scripts/crawl-hospice-shops.mjs` exits 0;
  `node --input-type=module -e "const m=await import('./scripts/crawl-hospice-shops.mjs'); console.log(JSON.stringify(m.unresolvedKeys(['M1 1AA','M1 1AB'], new Set(['M1 1AB'])))"`
  prints `["M1 1AA"]` (pure, no network).
- Cites: architecture §8 (Component E, run order); D5; review F-2 (no-match
  postcodes are logged, not blocking — their shops drop out of the build
  with a count, existing build behaviour).

### W14 — The crawl RUN (long-running, interruptible, re-runnable)

- **Files:** `data-raw/shop-crawl-log.json` (new, committed), `data-raw/shops-website.json` (append only), `data-raw/shops-geo.json` (new keys), `public/data/*.json` (rebuilt)
- **Prereqs:** W4, W13. If the chromium binary is absent, the run needs one
  human step first: `npx playwright install chromium` (the script prints
  this; record its presence in the log's `meta`).
- **Do:** Execute the §8 sequence: (1) `node scripts/crawl-hospice-shops.mjs`
  (discovery → crawl → appends → per-site log; ~1 h at ~1 req/s; may span
  multiple sessions — the crawl log is the resumable state); (2)
  `node scripts/geocode-shops.mjs` (new postcodes only); (3) re-invoke the
  crawl script for the no-network `unresolvedPostcodes` sync; (4)
  `npm run build-data`; (5) `npm test` + `npx tsc -b`; (6) A-05 ritual:
  build twice, compare `sha256sum public/data/*.json`. If a run surfaces a
  script bug: fix, record the fix in the ledger, resume from the log — never
  delete rows from the log to "reset".
- **Accepts:** every invocation exits 0; G2: committed log carries exactly
  one row for every in-scope row (190 discovery + 18 confirm = 208 rows, so
  `tests/crawl-log.test.mjs` exits 0 on it); G3:
  `node --test tests/shop-byte-preserve.test.mjs` exits 0 on the appended
  file; G4: `npm run build-data` exits 0 with `unresolved ids: 0` and the
  `shops` output count ≥ the W1 baseline of 138 in `public/data/shops.json`;
  `npm test` + `npx tsc -b` exit 0 (G5 input); G6: the two A-05 builds are
  byte-identical (matching sha256).
- Cites: architecture §8 (run order), §12 (G2–G6); feature acceptance 2–6.

### W15 — README count and provenance updates

- **Files:** `README.md`, `data/README.md`
- **Prereqs:** W14
- **Do:** In both READMEs update: the shop entry count (138 baseline + N
  appended, N = `committed: true` rows' `shopsExtracted` summed over the log
  minus `deduped` hits — take the number from the committed log); the site
  coverage statement (150 known + discovery; 18 confirm-only); the crawl date
  (= the committed log's `meta.run`); the headless-browser note (dev-only
  dependency, human-installed binary, used only for machine-unreadable
  lists); the provenance line (every entry's `source` URL is committed with
  it; the crawl log is the per-site audit trail).
- **Accepts:** the final entry count appears in both files
  (`grep "<count>" README.md data/README.md` finds it in each); the crawl
  date string in both files equals `meta.run` of the committed log.
- Cites: feature acceptance 7; architecture §8 (run order, final step).

## Out of scope (restated)

- No hours/phone/other shop attributes (schema frozen by decision 3).
- No UI change (shop layer, cards, list, filters unchanged).
- No change to the `shops.json` public contract, geocoding service, or
  geocode-fallback runtime path.
- No crawling beyond shop-listing pages (no deep site crawling, no
  newsletter signups, no contact forms).
- Scotland/NI/Wales hospices whose shop lists are not machine-readable
  after the headless-browser pass are logged `unreadable`, not chased.
- No re-crawling of the 18 already-curated sites' shop pages (their 138
  entries stay as-is; the crawl may confirm page existence but does not
  re-extract them).
- No cron/scheduled refresh (manual refresh story only, per repo
  convention).

## Notes for the Coder

- **Gates are not todos.** G0–G6 are lead/QA-run certifications; the items
  above carry their inputs (W1 baseline, W3/G1, W14/G2–G6). Do not add
  "run the gate" steps to your own checklist — build the items so each
  gate's command passes.
- **Append-only write rule.** Writes to `data-raw/shops-website.json` are
  appends only, after the last existing block and before the closing `]`
  (blank-line-separated `JSON.stringify` blocks, exact key order). The
  build assigns ids by array index (`shop-${i}`, `scripts/build-data.mjs`
  L~1069), so appends take ids 138+ with zero changes to the first 138.
  Never reorder, re-shape, or re-serialise existing entries; the
  byte-preservation test (W5) is the tripwire.
- **F-1 is a coding requirement, not just a risk.** Discovery transport
  failures (429 / 5xx / timeout / drop) leave the row's log row unwritten
  and are re-attempted next invocation — never a terminal `not-found`
  row. QA will simulate a 429; G2's exact-coverage check depends on this.
- **F-2 (risk-accepted):** geocode no-match postcodes are recorded in the
  log's `unresolvedPostcodes` and their shops drop out of the build with a
  count — existing build behaviour; do not add patching, fallbacks, or
  retries in the geocode path.
- **F-3 (risk-accepted):** the Playwright chromium binary is an
  environment concern, not a dependency: it is human-installed
  (`npx playwright install chromium`), the script only prints that
  command and falls through to `blocked` / `unreadable` + a note. Never
  add an install step to an npm script.
- **F-5 / F-6 (risk-accepted):** the DDG endpoint format and some
  sites' WAF behaviour may shift mid-run. The response is the committed
  crawl log — record the state and resume; do not redesign the discovery
  method inside a run.
- **Ledger discipline:** update `.agents/implementation-cycle10.md` after
  every W item — status, files touched, validation output — not in a
  batch.
- Use the GLOSSARY terms (shop crawl, crawl log, site discovery,
  shop-page locator, identity pass-through) in identifiers, log output,
  and prose.
- `npm test` must pass offline on every item: all network lives in the
  crawl script; tests and smoke checks use fixtures and pure imports
  only.
- `tests/fixtures/shops-website-baseline.json` is frozen after W3 —
  byte-identical to the pre-cycle file; do not update it during the run
  (W5 diffs against it).
- The identity pass-through (ADR-0043) has no blind fallback: an
  unresolvable `hospiceId` must stay `null` and the build must hard-fail
  at `scripts/build-data.mjs` L1082 — do not "help" by defaulting
  missing ids.
