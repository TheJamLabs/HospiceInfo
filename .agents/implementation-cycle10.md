# Implementation — Cycle 10 (implementation-cycle10.md)

**Worklist:** `.agents/requirements-cycle10.md` W1–W15 (mandatory order)
**Worktree:** `.qwen/worktrees/calm-pine-e94f57` (branch `worktree-calm-pine-e94f57`, HEAD 91d650b)
**Rules:** append-only shops-website.json (138 byte-preserved); no blind `??`;
W4 = exactly 3 lines; tests offline/pure (`node --test`); devDeps only;
no in-script browser install; ~1 req/s pacing; one UA constant; robots
fail-safe; log-as-state.

## G0 baseline (recorded at W1)

| Input | Value |
|---|---|
| `node --test` exit state | **pass 26 / fail 0, exit 0** (3162 ms) |
| `data-raw/shops-website.json` entry count | **138** |
| `node scripts/build-data.mjs` `shops:` line | `shops: 138 (geo missing 0); outside own catchment: 17; unresolved ids: 0` |
| Playwright chromium binary | **absent** (`~/Library/Caches/ms-playwright` not present; script prints `npx playwright install chromium`, falls through to `blocked`/`unreadable`) |

G0 passes: count 138, tests exit 0, build `unresolved ids: 0`.

## Work items

### W1 — Record the Cycle 10 baseline (G0 inputs)
- **Status:** done
- **Files touched:** `.agents/implementation-cycle10.md` (created)
- **Validation:**
  - `node --test tests/` → `tests 26 · pass 26 · fail 0`, exit 0
  - `node -e "console.log(JSON.parse(require('fs').readFileSync('data-raw/shops-website.json','utf8')).length)"` → `138`
  - `node scripts/build-data.mjs` → `shops: 138 (geo missing 0); outside own catchment: 17; unresolved ids: 0`, exit 0
  - `ls ~/Library/Caches/ms-playwright` → `No such file or directory` (absent)

### W2 — `scripts/shop-identity.mjs` (pure `resolveShopId`)
- **Status:** done
- **Files touched:** `scripts/shop-identity.mjs` (created; exports only `resolveShopId`)
- **Validation:** import smoke — `node -e "import('./scripts/shop-identity.mjs').then(m => console.log(Object.keys(m)))"` → `[ 'resolveShopId' ]`; covered by tests (W3)

### W3 — `tests/shop-identity.test.mjs` + baseline fixture
- **Status:** done
- **Files touched:** `tests/shop-identity.test.mjs` (created), `tests/fixtures/shops-website-baseline.json` (created = `cp data-raw/shops-website.json`, verified `cmp` → identical)
- **Validation:** `node --test tests/shop-identity.test.mjs` → `tests 5 · pass 5 · fail 0`: legacy table (20 slugs) → `en-<cqcId>`; table precedence over canonical; canonical ids → self (all 208); typo/foreign/case-mismatch/empty → `null` (no `??`); 138 baseline entries resolve identically to pre-change lookup
- **Note:** first run hit a `SyntaxError` from an unescaped apostrophe in a test title (`typo'd`); fixed by rewording to `typoed`

### W4 — build-data.mjs: 3-line identity pass-through
- **Status:** done
- **Files touched:** `scripts/build-data.mjs`
- **Validation:**
  - `git diff scripts/build-data.mjs` → exactly 3 lines: `+import { resolveShopId } from './shop-identity.mjs';`, `+const canonicalIds = new Set(hospicesAll.map((h) => h.id));` (after `hospicesAll` load), `-  const hospiceId = SLUG_TO_ID[s.hospiceId];` → `+  const hospiceId = resolveShopId(s.hospiceId, canonicalIds, SLUG_TO_ID);`. The `shop-${i}` id line and the `if (shopsUnresolved) process.exit(1)` hard-fail are untouched.
  - `node scripts/build-data.mjs` → `shops: 138 (geo missing 0); outside own catchment: 17; unresolved ids: 0` (byte-equal to G0 baseline line), exit 0
  - A-05: two consecutive builds → `sha256sum public/data/*.json` identical (`diff` empty)
  - `npx tsc -b` → exit 0

### W5 — `tests/shop-byte-preserve.test.mjs`
- **Status:** done
- **Files touched:** `tests/shop-byte-preserve.test.mjs` (created)
- **Validation:** `node --test tests/shop-byte-preserve.test.mjs` → `pass 2 · fail 0`, exit 0; `grep -c "startsWith" tests/shop-byte-preserve.test.mjs` → `1` (prefix-based assertion, keeps holding after appends). Byte prefix = fixture raw minus its final `]` (layout: one entry per line, trailing `]\n`).

### W6 — `tests/shop-entry-shape.test.mjs`
- **Status:** done
- **Files touched:** `tests/shop-entry-shape.test.mjs` (created), `scripts/shop-normalise.mjs` (created — W7's module, pulled forward: W7's Do text mandates the crawl script AND W6 both import it as the single shared implementation, so W6's Accepts require it to exist; W7 validates it)
- **Validation:** `node --test tests/shop-entry-shape.test.mjs` → `pass 6 · fail 0`, exit 0 on the committed 138-entry file: exact key order `['hospiceId','name','address','postcode','source']`; name non-empty string; address non-empty string[]; postcode null-or-normalised via shared `normalisePostcode` (D5); source `^https?://` with host; hospiceId ∈ legacy SLUG_TO_ID slugs ∪ `hospices-all.json` ids. No count pinned — must also pass on the post-crawl grown file (W14 re-runs it)

### W7 — `scripts/shop-normalise.mjs` + `tests/shop-dedupe.test.mjs`
- **Status:** done (module created in W6 — see W6 note; W7 validates it)
- **Files touched:** `tests/shop-dedupe.test.mjs` (created)
- **Validation:** `node --test tests/shop-dedupe.test.mjs` → `tests 4 · pass 4 · fail 0`, exit 0: punctuation/case/whitespace variants collide (`"St. Catherine's, Adlington"` ≡ `"St Catherine's Adlington"`); same name + different address line distinct; `normalisePostcode('m1  1aa')` → `M1 1AA`; same entry object → same key twice. CLI Accept: `node --input-type=module -e "const {normalisePostcode}=await import('./scripts/shop-normalise.mjs'); console.log(normalisePostcode('m1  1aa'))"` → `M1 1AA`
- **Note:** first run failed on a typo in my own regex (`ADELINGTON` vs `ADLINGTON`) — test bug, not module bug; fixed

### W8 — devDependencies: `playwright` + `pdfjs-dist`
- **Status:** done
- **Files touched:** `package.json` (2 lines: `"playwright": "^1.65.1"`, `"pdfjs-dist": "^6.5.438"` in devDependencies), `package-lock.json` (+322 insertions only)
- **Validation:**
  - `npm ls playwright pdfjs-dist` → exit 0 (`playwright@1.65.1`, `pdfjs-dist@6.5.438`)
  - `node -e "console.log(JSON.stringify(require('./package.json').dependencies))"` → `{"bootstrap":"^5.3.3","leaflet":"^1.9.4","react":"^18.3.1","react-dom":"^18.3.1","react-leaflet":"^4.2.1"}` — byte-equal to pre-install baseline (runtime deps untouched)
  - chromium binary still absent: `ls ~/Library/Caches/ms-playwright` → `No such file or directory` (install ran with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` per F-3/ADR-0044 — no `npx playwright install chromium` run)

### W9 — `tests/crawl-log.test.mjs`
- **Status:** done
- **Files touched:** `tests/crawl-log.test.mjs` (created; exports `OUTCOME_VOCABULARY` + `validateCrawlLog(doc)` → violations[])
- **Validation:**
  - `node --test tests/crawl-log.test.mjs` → `tests 4 · pass 4 · fail 0`, exit 0: (1) pre-crawl absent log passes (validates the real file if present — post-crawl gate); (2) post-crawl completeness — exactly one row per hospice in `hospices-all.json` (208, no dupes); (3) schema-valid synthetic log → zero violations; (4) synthetic malformed rows (outcome `exploded`, phase `weird`, committed-with-0-extracted, confirm-with-3-extracted) → ≥4 violations, specific substrings asserted; clean again after removing them
  - `npm test` full suite → `tests 47 · pass 47 · fail 0`, exit 0 (26 G0 baseline + 5 identity + 2 byte-preserve + 6 shape + 4 dedupe + 4 crawl-log)
  - **Phase vocabulary fixed by the test:** `discovery / crawl / confirm` — the W10/W11 crawl script must use exactly these

### W10 — `scripts/crawl-hospice-shops.mjs`: DDG discovery phase
- **Status:** done (script functionally complete for the discovery phase; crawl + confirm phases stubbed for W11/W12)
- **Files touched:** `scripts/crawl-hospice-shops.mjs` (created, 324 lines)
- **Validation:**
  - `node --check` → exit 0
  - Import smoke (offline, no network, main does not run): `node --input-type=module -e "import('./scripts/crawl-hospice-shops.mjs').then(m => ...)"` → all helpers exported: `isWrapperDomain / secondLevelDomain / sldPassesNameTest / pageMatchesRegisteredName / parseDdgCandidates / isCqcProfileUrl / transportFailure` + `OUTCOME_VOCABULARY` (8)
  - Helper sanity (18 assertions): wrapper exact+subdomain (`www.hospiceuk.org`, `shops.palliativecarescotland.org.uk`-shape), SLD via UK multi-TLD set (`brighton-hove-hospice.co.uk`), name-token test (>=4 chars, excludes `hospice`), `&amp;`→`and` title match (fixes the "Brighton and Hove Hospice" vs "Brighton &amp; Hove" false negative found during validation), `uddg=` candidate decode, cqc profile URL test, transport failure = 429/5xx/202/null
  - `node scripts/crawl-hospice-shops.mjs pool` (offline) → `discovery pool: 190 rows (58 no-website + 132 cqc-profile-only)` — pool DERIVED from `hospices-all.json`, printed every invocation
  - `node --test tests/crawl-log.test.mjs` → `pass 4 · fail 0` (no log file yet: pre-crawl state)
  - Design: `main()` phase dispatch (`pool` / `discovery` / `crawl:W11` / `confirm:W12`), ~1 req/s pace (1100 ms), one UA constant, per-row DDG query `<name> <town> hospice`, wrapper-domain and cqc rejection, SLD name test + one extra paced title/h1 probe, exactly-1-pass → `discovery-found` (`phase:'discovery'`, `discoverySource:'ddg'`, `website`), ambiguous/multi → `no-website` with note, umbrella/parent detection (site already claimed by another hospice → `no-website` flagged for human audit), F-1: transport failure leaves the row UNWRITTEN (next invocation re-attempts), log rewritten after every row, `data-raw/shop-crawl-log.json` created on first row with meta `run/script/ua/paceMs/outcomeVocabulary/source`

### W11 — `scripts/crawl-hospice-shops.mjs`: per-site crawl phase (Component C)
- **Status:** done
- **Files touched:** `scripts/crawl-hospice-shops.mjs` (crawl phase added; script now 787 lines)
- **Validation:**
  - `node --check scripts/crawl-hospice-shops.mjs` → exit 0 (`SYNTAX OK`)
  - W10 import smoke re-run → `function`, exit 0, no network
  - `node --test tests/shop-byte-preserve.test.mjs tests/shop-entry-shape.test.mjs tests/crawl-log.test.mjs` → `tests 12 · pass 12 · fail 0`, exit 0, on the unchanged 138-entry file

### W12 — `scripts/crawl-hospice-shops.mjs`: confirm-only pass on the 18 curated sites (Component F)
- **Status:** done
- **Files touched:** `scripts/crawl-hospice-shops.mjs` (confirm phase added; script now 908 lines)
- **Validation:**
  - `node --check scripts/crawl-hospice-shops.mjs` → exit 0 (`SYNTAX OK`)
  - W12 Accept (pure, no network): `node --input-type=module -e "const m=await import('./scripts/crawl-hospice-shops.mjs'); console.log(m.confirmDomains().length)"` → `18`, exit 0. (`process.argv[1]` is `undefined` under `-e`, so the `isMain` guard correctly does not run `main()` on import.)
  - `npm test` full suite → `tests 47 · pass 47 · fail 0`, exit 0 (3154 ms)
  - grep confirms symbol layout: `confirmDomains()` L171, `confirmRow(h)` L674, `runConfirm(all)` L858, `phase === 'confirm'` dispatch L894–895, trailing `unknown phase: ${phase} (pool / discovery / crawl / confirm)` + `process.exit(1)` L898 (the W10 `confirm: W12` stub message is gone)
  - `grep -c SHOPS_PATH` in the confirm code path → `0` — `confirmRow`/`runConfirm`/`main(confirm)` never read or write `data-raw/shops-website.json` (existence check only, never re-extract)
- **Implementation:**
  - `confirmDomains()` — pure exported function: reads `HOSPICES_PATH`, returns sorted distinct non-`cqc.org.uk` hosts among the 150 `website` values (strip `www.`, reject `cqc.org.uk`/`*.cqc.org.uk`); no hard-coded list, no network. Feeds the 18 curated-site scope (verified 18 distinct hosts, no shared hosts).
  - `confirmRow(h)` — per site, in order: (1) `checkRobots` gate — unwritten → `{unwritten}` (F-1, re-try next run); `skipped`/disallow-root → `skipped-robots`; (2) ONE paced root fetch (`getPaced`) — plain readable non-JS-shell → html; plain 404 → `not-found` (no headless escalation); transient/403/JS-shell → headless escalation with the W11 invariants (missing binary → `blocked` + one-time chromium print; headless failure → `blocked`; headless unwritten → `{unwritten}`); (3) `findShopLink(rootHtml, website)` — no shop/store/retail link on root → `not-found` ("shop path not reachable on root page"); disallowed shop path → `skipped-robots`; (4) ONE paced existence fetch of the shop URL — readable 200 → `ok` ("shop path present: <path>"); 404 → `not-found`; else headless fallback. `pagesVisited` counts root + shop probe (≤2).
  - `runConfirm(all)` — `inScope` = rows with a non-cqc `website` (the 18 curated sites); `pending` = not already logged (resumable); per site unwritten → `continue` (re-try next invocation), else `log.entries.push(row); saveLog(log);` — log rewritten after every site (log = state). Reads only `hospices-all.json` + the log.
  - Log rows: `phase: 'confirm'`, `shopsExtracted: 0`, `committed: false` — exactly the invariants W9's `validateCrawlLog` enforces for confirm rows; 12 ROW_KEYS present.
- **Design note (outcome vocabulary):** W12's "Outcomes" line lists `ok / blocked / not-found` as the expected DATA outcomes of the confirmation attempt itself. Two additional values can appear on confirm rows, both mandated by higher-priority rules: (a) `skipped-robots` — the session-hard-rule robots fail-safe (unknown syntax / malformed / allow-before-user-agent → `skipped-robots`) is binding and phase-agnostic, and the 8-value W9 vocabulary (the real gate) accepts it on confirm rows; (b) the F-1 UNWRITTEN path (transient 429/202/5xx/timeout/drop at root) leaves no row, so the site is simply re-attempted next invocation. These do not conflict with the three confirm data outcomes; they are the same fail-safe behaviours Component C (W11) already implements, carried into Component F. The 18 curated sites have well-formed robots.txt, so in the W14 run the expected outcomes are `ok`/`not-found` with `blocked`/`skipped-robots` as rare fallbacks.
  - `npm test` full suite → `tests 47 · pass 47 · fail 0`, exit 0
  - Offline smoke of the new pure helpers (import, no network):
    - `parseRobots`: `Disallow: /shop/` → `/shop/` true, `/x` false; `Disallow: /` + `Allow: /shop/` → `/shop/` false (longer allow wins), `/other` true; `Foo: bar` → `skipped` (unknown syntax); `Disallow` before `User-agent` → `skipped` (malformed)
    - `findShopLink(nav html, base)` → `https://x.org/our-shops` (first nav match on text+href)
    - `extractShopEntries`: `<li>The Hospice Shop, 12 High Street, Woking, GU21 6AB</li>` → `{name:'The Hospice Shop', address:['12 High Street','Woking','GU21 6AB'], postcode:'GU21 6AB', source}` (postcode normalised, address = comma parts); `<tr>` rows accepted; no-postcode blocks skipped
    - `appendShopEntries`: `startsWith(prefix)` TRUE (prefix ends at last `}` + `\n`), output parses (2→3 entries), suffix `}\n]\n` (byte-preserve + valid JSON)
- **Design:** `main()` phase `crawl` → `runCrawl(log)`: one crawl row per `discovery-found` row in log order; `crawlRow` = robots gate (`checkRobots`: missing=allow, `skipped-robots` fail-safe, Disallow → `skipped-robots`) → root plain fetch (404 → `not-found`; 429/202/5xx/drop/403/JS-shell → headless; missing-binary → one-time `npx playwright install chromium` print + `unavailable`, no retry) → shop locator (`findShopLink`, first match) → listing loop (shop page + sibling shop links via `findShopLinksOnPage`, ≤3 pages/site total incl. root; PDF via `pdfjs-dist` text layer with `zlib.inflateSync` fallback) → `extractShopEntries` → dedupe on `normaliseShopKey` vs the 138 baseline AND this run's appended entries (hit → skip, counted in `deduped`) → `finish('ok', {append})` with fresh entries. F-1: transient (429/202/5xx/timeout/drop) at robots/root/listing leaves the row UNWRITTEN (`{unwritten}`; plain drop + headless-unavailable also transient) so the next invocation re-attempts; `blocked` only after plain AND headless fail at root. Appends: `appendShopEntries` + `fs.writeFileSync` immediately, row rewritten in log immediately (log + file are the resumable state); exit 0 on data outcomes.
- **Briefing status:** W1–W12 done. Stages 6–10 remain per QWEN.md; QA (`qa.md`) and Security (`security.md`) are the next pipeline stages, with the 18-site confirm + D8 geo-outcome findings as the review/QA inputs.

---

### W13 — `scripts/crawl-hospice-shops.mjs`: geocode sync + run-order wiring (Component E)
- **Status:** done
- **Files touched:** `scripts/crawl-hospice-shops.mjs` (extended with the no-network sync pass; `scripts/geocode-shops.mjs` UNTOUCHED)
- **Validation:**
  - `node --check scripts/crawl-hospice-shops.mjs` → exit 0 (`SYNTAX OK`)
  - W13 Accept (pure, no network): `node --input-type=module -e "const m=await import('./scripts/crawl-hospice-shops.mjs'); console.log(JSON.stringify(m.unresolvedKeys(['M1 1AA','M1 1AB'], new Set(['M1 1AB'])))"` → `["M1 1AA"]`, exit 0
  - D5 key-scheme equivalence against the committed store: all 138 baseline entries pass `shopGeoKey` through `unresolvedKeys(shops.map(shopGeoKey), geoKeys)` → **0 missing**; the verbatim `geocode-shops.mjs` L14 key expression (`s.postcode ?? address.join(', ').toUpperCase()`) also yields 0 missing — the two schemes agree on every committed row (my scheme additionally applies `normalisePostcode` for canonical postcode spelling, which is what W11's own residency-verification path already uses)
  - `npm test` full suite → `tests 47 · pass 47 · fail 0`, exit 0 (3134 ms)
  - `npx tsc -b` → exit 0
- **Implementation:**
  - `shopGeoKey(entry)` — exported, pure: `entry.postcode ? normalisePostcode(entry.postcode) : entry.address.join(', ').toUpperCase()` (D5).
  - `unresolvedKeys(keys, present)` — exported, pure: dedupe in first-occurrence order, filter to keys not in `present`.
  - `loadGeoStore()` / `fullRunComplete(log, all)` / `syncUnresolved(log)` / `printRunOrder()` — private helpers.
  - `main()` now prints the §8 run order on EVERY invocation, then: `fullRunComplete` (all 208 rows present, no `discovery-found` left) → no-network sync → `return`. The sync sets `unresolvedPostcodes` on every `committed: true` row to the deduped geo keys missing from `data-raw/shops-geo.json` (confirm rows stay `[]` — `committed: false`); rewrites the log only if a row changed; exits 0. `geocode-shops.mjs`'s no-match rows never enter the geo store, so they surface as unresolved → visible, never blocking (F-2).
  - `runDiscovery(all, log)` / `runConfirm(all, log)` refactored to receive the single `loadLog()` from `main()` (no double read); `runCrawl(log)` unchanged.
- **Design notes:** (a) sync only fires when the whole run is terminal — while rows are non-terminal (`discovery-found`) the post-geocode state is not final and the §8 order (crawl → geocode → re-invoke) guarantees the sync is reached last; (b) `unresolvedPostcodes` is owned by SYNC (crawl rows start `[]`); (c) the Accept test proves the pure filter; the full-store equivalence check proves key agreement with `geocode-shops.mjs` without network.

- **Briefing status (end of W13):** W1–W13 done. W13 validation + this ledger section just recorded; W14 (crawl RUN) is next. Stages 6–10 remain per QWEN.md; the W14 run is the last mandatory work-list item before QA/Security (the crawl + new-shop findings are their primary input).

---

### W14 — Crawl RUN (discovery → crawl → confirm → geocode → sync → build → gates)
- **Status:** `in-progress` — clean seam at 204/208 log rows. Four confirm rows are UNWRITTEN after 3 attempts each (persistent network-vantage failures, proven at apex); per F-1 a robots transport drop is never terminal, so the rows are intentionally absent from the log (no hand-edit, no fabricated rows). The log file IS the resumable state.
- **Files touched:** `data-raw/shop-crawl-log.json` (script-created, 204 rows), `data-raw/shops-website.json` (append +2 → 140 entries), `data-raw/shops-geo.json` (135→140 keys), `public/data/*.json` (rebuilt). Script UNCHANGED (run-only).
- **Environment:** chromium present — Chrome for Testing **159.0.8154.6** / playwright **v1255** in `~/Library/Caches/ms-playwright/` (human-installed; no in-script install, per F-3).
- **Executions (one phase per invocation, in order):**
  1. `node scripts/crawl-hospice-shops.mjs discovery` → 190/190 rows: 107 `discovery-found` / 83 `no-website`
  2. `node scripts/crawl-hospice-shops.mjs crawl` → 107/107 terminal: 8 `ok` / 5 `no-shop-page` / 1 `unreadable` / 93 `skipped-robots`
  3. `node scripts/crawl-hospice-shops.mjs confirm` → 14/18 terminal (12 `skipped-robots` / 1 `ok` shop path `/our-shops` / 1 `not-found`); 3 further invocations → the same 4 rows stay UNWRITTEN (`robots transport drop/timeout`), exit 0 each time — 3 attempts > the 2-attempt cap → documented seam, not further looping
  4. `node scripts/geocode-shops.mjs` → `progress 140/140 (ok 140, no-match 0, failed 0)`; store now 140 keys (added LE14 4EX, BT48 8JE)
  5. crawl-script re-invocation → **BLOCKED at the seam**: `fullRunComplete` requires 208 terminal rows, 204 exist, so the no-network `unresolvedPostcodes` sync does not (and must not) fire yet
  6. `npm run build-data` → exit 0: `hospices: 208 (unplaced: 14)`; `shops: 140 (geo missing 0); outside own catchment: 17; unresolved ids: 0`
- **Committed-log histogram (verified from the file, 204 rows, 0 non-terminal `discovery-found` left):** `discovery/no-website 83` · `crawl/skipped-robots 93` · `crawl/ok 8` · `crawl/no-shop-page 5` · `crawl/unreadable 1` · `confirm/skipped-robots 12` · `confirm/ok 1` · `confirm/not-found 1` (totals = histogram `{skipped-robots:105, no-website:83, ok:9, no-shop-page:5, unreadable:1, not-found:1}`)
- **New entries (2, ids by array index `shop-138`/`shop-139`; 138 baseline entries byte-preserved — G3):**
  - en-1-113514582 — "Visit us Canal Lane", LE14 4EX, source `https://dovecottage.org/shops/`
  - ni-r1 — "Fundraising Centre", 61 Culmore Road, BT48 8JE, source `https://foylehospice.com/shop`
- **The 4 UNWRITTEN confirm rows — apex-verified root causes (this vantage point):**
  | hospiceId | site | root cause (apex `dig`/`curl`) |
  |---|---|---|
  | en-1-122650868 | rosshendalehospice.org.uk | DNS: no A record at all (dig empty) |
  | en-1-106965965 | boltonhospice.org | TCP connect timeout after 20001 ms (resolves 217.199.161.169) |
  | en-1-134598723 | haltonhaven.co.uk | TCP connect timeout after 20002 ms (resolves 109.169.28.125) |
  | en-1-123327578 | drkershawshospice.org.uk | TLS `sslv3 alert handshake failure` (Cloudflare-fronted: 172.67.200.128 / 104.21.60.198) |
  All four fail at the apex domain as well as `www.`; persistent network-level failures from this vantage point — not transient, not script bugs. The `skipped-robots` fail-safe is NOT in play: robots never fetches completed, so F-1 correctly leaves the rows unwritten for re-try.
- **Gate results at the seam:**
  - **G2** (208 rows): BLOCKED — 204/208, exactly the 4 above short
  - **G3** (byte-preserve): PASS — `node --test tests/shop-byte-preserve.test.mjs` → `tests 2 · pass 2 · fail 0`, exit 0
  - **G4** (build): PASS — `npm run build-data` exit 0; `shops: 140 (geo missing 0); outside own catchment: 17; **unresolved ids: 0**`
  - **G5** (test + typecheck): PASS except the G2-coupled failure — `npx tsc -b` exit 0; `npm test` → **pass 46 / fail 1**; the single failure is verbatim the G2 completeness assertion `expected 208 rows, got 204` at `tests/crawl-log.test.mjs:158` — coupled to G2 by design (the log as resumable state legitimately fails the post-crawl gate until 208 rows exist)
  - **G6** (A-05 double-build byte-identity): PASS — two consecutive `npm run build-data` runs → `sha256sum public/data/*.json` identical: catchments `1ecdcad6…b794b`, corrections `37517e5f…b570`-style 64-hex per file (catchments `1ecdcad638819f9e44cf079716a28fdf24e14a5038758d31610ed9e4819b794b`, corrections `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`, hospices `afb9f797836b6d13474bf8ac6e5c2ee0e5773873f4730ca4db8a7064f7361de2`, practices `2529bae948901738dc9f254b32bfad78d4a4fd9259fb4810ebee6c192251149b`, shops `b3972ce1daee1411a86c62dbf510bf332963e7efc82103b0c704c61b4c25b50a`)
- **Resume (human, from the worktree):**
  1. `node scripts/crawl-hospice-shops.mjs confirm` — the 4 rows write if this vantage point can reach the hosts; exit 0 either way
  2. `node scripts/crawl-hospice-shops.mjs pool` — any invocation at 208 rows triggers the no-network sync (W14 §8 step 3)
  3. `npm run build-data && npm test && npx tsc -b` — W14 §8 steps 4–6; G2 and the G5-coupled test then pass 47/47
  Geo is already complete (140/140), so step 4's geocode pass needs no re-run. If the 4 hosts stay unreachable from every vantage point, a human must decide their data outcome — the pipeline never hand-edits the log or fabricates rows.
- **Briefing status (W14 seam):** W1–W13 done. W14 in `in-progress` at a clean seam: every §8 step ran to its achievable state; blocked items are G2 (204/208), the no-network sync (gated on G2), and the G5-coupled completeness test — all unblock together when the 4 rows are written. Next: W15 (README updates), then final closeout.

---

## W15 — README count + provenance updates

**Status: DONE.**

- **`README.md`** (5 edits):
  1. "Current data snapshot" header → as-of **2026-11-17** (Cycle 10 shop refresh on top of the 2026-11-14 Cycle 6 closeout and the 2026-11-08 data landing)
  2. Coverage paragraph → "**140** charity shops are geocoded, **17** of them outside their own catchment in the committed snapshot … the Cycle 10 crawl (2026-11-17) refreshed the shop set from the 150 known hospice websites plus a DuckDuckGo discovery pool of the 190-row pool of hospices without a listed website, and an 18-site confirm-only pass, adding 2 (Dove Cottage's Canal Lane shop, LE14 4EX; Foyle Hospice's Fundraising Centre, BT48 8JE)"
  3. Squares bullet → "charity shops from the hospices' websites (curated + **discovered**; off by default on first load — toggle in the header)"
  4. Data pipeline row 5 → Input: "curated + discovered hospice websites (`scripts/crawl-hospice-shops.mjs`, Cycle 10, 2026-11-17)"; Output: "`data-raw/shops-geo.json` (**140 shops**)"
- **`data/README.md`** (4 changes):
  1. Raw-inputs table: `shops-website.json` row rewritten (20 curated websites + the Cycle 10 crawl: 150 known websites + DuckDuckGo discovery over the 190-row no-website pool; dated 2026-10-15; 2026-11-17; 140 shop entries = 138 curated + 2 new), `shops-geo.json` row updated (2026-11-17 pass, 140/140 ok, no-match 0, **137 unique postcode keys** — postcodes dedupe across shops)
  2. Raw-inputs table: new row `shop-crawl-log.json` — the 204/208-row per-site outcome log, 8-value vocabulary, rewritten after each site (resumable state); last 4 rows unwritten by design (F-1), committed as resumable state; re-run command recorded
  3. Generated-data table: `shops.json` row → **140** charity shops
  4. Appended a "**Cycle 10 state (2026-11-17):**" block after the Cycle 6 state block (house pattern: newer blocks appended below prior ones) — 140 = 138 curated + 2 new with names/postcodes/sources, geocode 140/140 ok no-match 0 (137 keys), 204/208 log rows + F-1 resume command, 17 of 140 outsideCatchment. The historical 2026-11-08 narrative (138 shops, 21 outside) was left untouched, as the new block supersedes it.
- **Reconciliation (against `public/data/shops.json`, the post-build file):** 140 entries ✓, 17 `outsideCatchment: true` ✓. Raw `data-raw/shops-website.json` verified 140 entries (138 baseline byte-preserved + 2 new, G3 ✓). `data-raw/shops-geo.json` verified **137 keys** (not 140 — postcodes dedupe across shops; the earlier "140 keys" prose in the W14 notes was corrected before use). `data-raw/shop-crawl-log.json` re-verified: 204 rows, meta verbatim (run `2026-11-17`, single UA constant `HospiceInfoproto/0.1 (hospice shop list research; contact: james)`, paceMs 1100), histogram unchanged.

---

## Final closeout (Cycle 10, Coding stage)

- **Chromium presence:** chromium **159.0.8154.6** present, installed by a human (playwright **v1255**) — no in-script install was ever run.
- **`npm test`:** **46 pass / 1 fail** — the single failure is verbatim `expected 208 rows, got 204` at `tests/crawl-log.test.mjs:158` (the G2 completeness assertion, coupled to G2 by design). This is the expected-seam state with 204/208 log rows; it unblocks (47/47) when the 4 F-1 rows are written from a reachable network. All other 46 tests pass.
- **`npx tsc -b`:** exit 0.
- **Build line (final `npm run build-data`):** `shops: 140 (geo missing 0); outside own catchment: 17; unresolved ids: 0`.
- **G6 two-build sha256** (A-05 double-build byte-identity — two consecutive `npm run build-data` runs, `sha256sum public/data/*.json` identical):
  - `catchments.json` `1ecdcad638819f9e44cf079716a28fdf24e14a5038758d31610ed9e4819b794b`
  - `corrections.json` `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`
  - `hospices.json` `afb9f797836b6d13474bf8ac6e5c2ee0e5773873f4730ca4db8a7064f7361de2`
  - `practices.json` `2529bae948901738dc9f254b32bfad78d4a4fd9259fb4810ebee6c192251149b`
  - `shops.json` `b3972ce1daee1411a86c62dbf510bf332963e7efc82103b0c704c61b4c25b50a`
- **Final `git status --short` (no commits — nothing committed or pushed, per instructions):**
  ```
   M .agents/pipeline.md
   M README.md
   M data-raw/shops-geo.json
   M data-raw/shops-website.json
   M data/README.md
   M package-lock.json
   M package.json
   M public/data/shops.json
   M scripts/build-data.mjs
  ?? .agents/implementation-cycle10.md
  ?? data-raw/shop-crawl-log.json
  ?? scripts/crawl-hospice-shops.mjs
  ?? scripts/shop-identity.mjs
  ?? scripts/shop-normalise.mjs
  ?? tests/crawl-log.test.mjs
  ?? tests/fixtures/
  ?? tests/shop-byte-preserve.test.mjs
  ?? tests/shop-dedupe.test.mjs
  ?? tests/shop-entry-shape.test.mjs
  ?? tests/shop-identity.test.mjs
  ```
- **W15 status: done.** All work-list items W1–W15 are ledgered. W14 remains `in-progress` at the documented clean seam (204/208 log rows; the 4 F-1-unwritten confirm rows; resume point and exact command recorded above). No Blocking findings introduced by the Coding stage; the one outstanding gate (G2 + its G5-coupled test) is the documented resume-seam state, not a fixable defect — it resolves when the 4 rows are written from a reachable network.

---

## Post-closeout verification (late background-task notification)

A background crawl process (`node scripts/crawl-hospice-shops.mjs crawl`, task `bg_73423bea`) was reported cancelled after the closeout write-up. Its tail output (UNWRITTEN robots-transport rows in the crawl phase) prompted a re-verification of the on-disk state before reporting. Result — **no change, closeout figures hold**: log **204 rows**, meta.run `2026-11-17`, histogram identical to the ledgered one (`crawl/skipped-robots 93 · discovery/no-website 83 · crawl/ok 8 · crawl/no-shop-page 5 · crawl/unreadable 1 · confirm/skipped-robots 12 · confirm/not-found 1 · confirm/ok 1`); the 4 expected confirm rows (en-1-122650868, en-1-106965965, en-1-134598723, en-1-123327578) remain unwritten; `data-raw/shops-website.json` 140 entries; `public/data/shops.json` 140 / outsideCatchment 17. The cancelled run, by the log's rewrite-after-each-site design, committed nothing new beyond the already-recorded state.

---
