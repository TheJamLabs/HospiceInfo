# Cycle 10 Research — charity-shop website crawl

Stage 1 of 10. Facts and options only — no architecture proposals (stage 2).
Goal: populate `data-raw/shops-website.json` beyond the 138 curated entries by
crawling hospice websites (150 with a `website` value + discovery for the 58
without), owner decisions per `.agents/feature-cycle10.md` (150 + discovery,
headless browser for machine-unreadable lists, name+address+postcode depth).

## 1. Baseline state of the shop chain — DONE

- `data-raw/shops-website.json`: **138 entries**, exact schema
  `{hospiceId, name, address[], postcode, source}`; **16 distinct legacy
  slugs** (`stcatherines` 12, `trinity` 28, `bolton` 11, `pendleside` 10,
  `wiganleight` 10, `bury` 9, `stjohns` 9, `eastlancs` 8, `queenscourt` 7,
  `stmaryfurness` 7, `stroccos` 7, `springhill` 7, `derianhouse` 6,
  `edenvalley` 4, `hahwestcumbria` 2, `haltonhaven` 1); **12 entries have no
  postcode** (address-keyed).
- `data-raw/shops-geo.json`: **135 keys** (postcode or
  `UPPERCASE(address join)`); all 138 entries resolve (`shops with NO geo: 0`);
  keys include both postcode and address forms — a build-side lookup must use
  the same `postcode ?? address.join(', ').toUpperCase()` key rule as
  `scripts/geocode-shops.mjs:17` (exact match, case-sensitive).
- `public/data/shops.json`: **138 entries**; `hospiceId` already canonical
  (`en-1-126365065` in entry 0) via the ADR-0002 remap; `outsideCatchment` and
  per-entry `source` present.
- `scripts/build-data.mjs:33-36`: `SLUG_TO_ID` built from `CATCHMENTS`
  (legacy slug → `en-<cqcId>`). **Ledg verifying pitfall (lead-verified,
  Cycle 10): a new entry whose `hospiceId` is a canonical id is NOT a key of
  `SLUG_TO_ID`** (keys are the 20 slugs) → `hospiceId` stays undefined →
  `shopsUnresolved` → `process.exit(1)` at `build-data.mjs:1082`. The build
  must gain an identity pass-through/fallback validated against the canonical
  hospice id set (research-stage fact; design is stage 2).
- `scripts/geocode-shops.mjs` is **resumable** (`store[k]?.lat != null` skip,
  :27) and paces Nominatim at 1100 ms with the project UA — re-running after
  appending new entries geocodes only the net-new keys.
- 16 slugs, not 18: two of the 20 curated catchments contributed no shop
  entries; the feature spec's "18 sites" refers to websites mined, entries
  land in 16 slugs.

## 2. The 150 "with website" are NOT 150 real sites — DONE

- `data-raw/hospices-all.json`: 208 rows; **150 with a truthy `website`**,
  58 without; per-nation total en 152 / sc 33 / ni 6 / wales 17; missing
  per-nation sc 33 / ni 6 / wales 17 / en 2; zero non-URL website values.
- Domain distribution of the 150 URLs: **19 unique hostnames — 132 of the 150
  are `cqc.org.uk` CQC register profile pages**
  (`https://www.cqc.org.uk/location/<cqcId>`); only **18 are hospice-owned
  domains** (stcatherines.co.uk, eastlancshospice.org.uk, pendleside.org.uk,
  rossendalehospice.org.uk, buryhospice.org.uk, boltonhospice.org,
  queenscourt.org.uk, sjhospice.org.uk, stmaryshospice.org.uk, wlh.org.uk,
  trinityhospice.co.uk, derianhouse.co.uk, haltonhaven.co.uk, stroccos.org.uk,
  drkershawshospice.org.uk, springhill.org.uk, edenvalleyhospice.org,
  hospiceathomewestcumbria.org.uk).
- Probe of `https://www.cqc.org.uk/location/1-106214874` (164 701 B HTML): 90
  links, **3 external — all CQC's own social pages**; **the page does not
  link to the hospice's own website**. So the 132 CQC rows carry no shop data
  and no pointer to it.
- CQC open API probe: `api.cqc.org.uk/locations/<cqcId>` and
  `?name=…` both return `{"statusCode":404,"message":"Resource not found"}` —
  the API is dead; no structured CQC channel exists.
- **Consequence:** the effective discovery pool is **132 (CQC-only EN rows) +
  58 (no website) = 190 hospices**, not 58. The 18 real sites are exactly the
  curated 18 whose 138 entries exist; per the feature spec their pages may be
  confirmed but not re-extracted.

## 3. Network probes (sample, project UA, ~1 req/s) — DONE

UA used: `HospiceInfoproto/0.1 (geocoding research; contact: james)`.

- **robots.txt (5 sites):** `cqc.org.uk` — generic template, no effective
  disallows; `stcatherines.co.uk` and `springhill.org.uk` — standard
  WordPress disallows (`/wp-admin/`, wc-logs) — shop pages permitted;
  `springhill.org.uk` additionally lists named AI bots (AddSearchBot, …) —
  our descriptive UA is not among them; **`eastlancshospice.org.uk` and
  `trinityhospice.co.uk` returned HTTP 403 Forbidden to the plain client** —
  WAF/CDN gating on non-browser clients (4 of 18 hospice sites sampled so
  far: 2/5 = 40%). Plain fetch will fail on some of the 18; a real browser
  profile is required both to pass gateways and for JS-rendered pages.
- **CQC page structure:** static server-rendered HTML (parseable by regex/
  DOM without JS) — only relevant if CQC pages were shop sources (they are
  not, §2).
- **Search channel:** `html.duckduckgo.com/html/?q=…` returned 10 parseable
  results with the project UA; top hit for `Strathcarron Hospice Durness
  official site` was `https://www.strathcarronhospice.net/` (the real site).
  Result URLs arrive as `duckduckgo.com/l/?uddg=<encoded>` redirects — the
  crawler must decode `uddg`. Secondary channels surfaced organically:
  hospiceuk.org care-finder, palliativecarescotland.org.uk directories,
  OSCR details pages.
- **OSCR (Scotland):** `api.oscr.org.uk` does not resolve; the register detail
  page (`oscr.org.uk/about-charities/search-the-register/charity-details?
  charityNumber=SC003634`) returns **200** to the plain client but is a JS
  app — website field needs the headless render. OSCR charity numbers are
  derivable from `sc-oscar-<n>` ids (zero-padded 6-digit + `SC` prefix).
- **Wales:** `data-raw/hospicehealth-wales-members-2026-11.csv` columns are
  `organisation,sc,town,postcode,address` — **no website column**; the 17
  missing Wales rows go through the same search channel.
- **NI (6 rows):** no register channel probed; search channel applies, as it
  did for the others.

## 4. Candidate GLOSSARY terms (Architect to finalise)

- **shop crawl**: the dev-time pass over in-scope hospice sites locating
  charity-shop listing pages and extracting `{name, address, postcode}` into
  the shop raw source, with a committed per-site log.
- **crawl log**: the committed record (one file) of per-site outcome
  (`ok` / `no-shop-page` / `unreadable` / `skipped-robots` / `blocked` /
  `not-found` / `no-website` / `discovery-found`), pages visited, shops
  extracted, and the discovery source URL when a website was newly found.
- **site discovery**: the best-effort search pass (name + town + "hospice",
  DuckDuckGo HTML endpoint, `uddg` decode) that finds a hospice's own website
  when the register row has none (or only a CQC profile page).
- **shop-page locator**: the per-site step that finds the shop-listing page(s)
  via the site's own navigation/links (no blind link lists).
- **identity pass-through**: the build change letting a shop entry carry a
  canonical `en-<cqcId>` id directly (validated against the hospice id set)
  instead of only legacy slugs (the `SLUG_TO_ID` slot).

## 5. Risks / open questions for stage 2

- **Scope math changed:** discovery pool 190 (not 58) — each needs one search
  request + a crawl if found; at ~1 req/s per site the crawl work is linear
  in sites-found, and the search pass is ~190 s. Budget the Coding stage for
  a long (multi-minute to multi-hour) run with resumability (per-site state
  file, like `geocode-shops.mjs`).
- **WAF 403s:** 2/5 sampled hospice sites reject non-browser clients; the
  headless browser is load-bearing for both extract-fidelity and
  accessibility. Sites that block even the browser → log `blocked`, do not
  retry-loop (shared rule: no package/network retry loops).
- **PDF/JS lists:** expected on some of the 18 curated-adjacent sites and
  anywhere found; the headless pass must detect "no parseable shop entries on
  the page" and fall through to PDF-embedded text before logging
  `unreadable` (owner decision 2).
- **Identity:** the build identity change (§1) is a prerequisite for ANY new
  entry — stage 2 must sequence it before the crawl's append (it can be built
  and tested against the existing 138 first, keeping them byte-preserved).
- **Discovery quality:** search top-hits can be directories/wrappers
  (hospiceuk.org, palliativecarescotland.org.uk, OSCR) rather than the
  hospice's own site — the locator must treat "domain matches hospice name /
  is the hospice's own domain" as the acceptance test, and record the
  discovery source URL in the crawl log.
- **Duplicate identity risk:** some of the 190 (e.g. `sc-oscar-005623`
  St Margaret of Scotland Hospice) may in fact be a service of a larger
  hospice that IS in the dataset; search may return the parent's site. The
  crawl log must keep the per-row decision so QA can audit.
- **Nominatim pressure:** new entries add postcodes; the existing 1100 ms
  pace means a 100-new-postcode run is ~2 min — fine, but logs `no-match`
  rows (like the 12 address-keyed entries) so the crawl log lists them.

## 6. Lead verification note (2026-11)

This artifact was written by the Research sub-session after both lead
polling windows had ended; the lead re-read it and re-probed every
decisive fact independently. Confirmed: 19 unique hostnames (132 CQC / 18
real domains), CQC page link probe (90 links, 3 external — all CQC social),
CQC API 404s on both call forms, DDG `uddg` channel and top-hit quality,
132+58=190 discovery pool. Two corrections/additions:

- **OSCR is unreachable from this environment:** the §3 claim "returns 200
  to the plain client but is a JS app" did not reproduce — lead re-probes
  of `oscr.org.uk` (robots + SC005623 detail URL) both returned
  **ENOTFOUND** (DNS), same as `api.oscr.org.uk`. Treat OSCR as
  HUMAN-FETCH/unreachable per the shared rules; the 33 sc rows go through
  the search channel, not a headless render of OSCR.
- **WAF intermittency:** `trinityhospice.co.uk` returned 403 to the plain
  client earlier, then 200 (109 KB root) to the same client one minute
  later in the lead re-probe — the gating is real but intermittent;
  `blocked` entries in the crawl log are per-site-per-attempt, and a
  headless render should be attempted before logging `blocked`.
