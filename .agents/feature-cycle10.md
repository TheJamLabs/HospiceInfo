# Feature: Cycle 10 — Charity-shop website crawl

## One-line description

Crawl UK hospice websites to find and extract every charity-shop entry
(name, address, postcode, source URL) so the map's charity-shop layer
covers all hospices that publish shop lists — not just the 20 curated
sites currently behind the 138 committed entries.

## Background

`data-raw/shops-website.json` (138 entries, provenance 2026-10-15) was
hand/mined from 18 of the 20 curated hospice websites and is the single
source for the charity-shop layer:
`shops-website.json` → `scripts/geocode-shops.mjs` (Nominatim, 1 req/s,
resumable) → `data-raw/shops-geo.json` (postcode → {lat, lon}) →
`scripts/build-data.mjs` → `public/data/shops.json`. The build
hards-fails on a shop whose `hospiceId` resolves to no hospice row and
drops (counted) any shop whose postcode lacks a geo entry. ADR-0002
remaps the 20 legacy curated slugs to canonical `en-<cqcId>` ids.

`data-raw/hospices-all.json` holds 208 hospices; 150 carry a `website`
URL (mostly from the CQC England register), 58 do not (33 sc, 6 ni, 17
wales, 2 en).

## Owner decisions (2026-11-16, coach)

1. **Site scope — 150 + discovery**: crawl all 150 hospices with a
   website in the data, AND run a discovery pass to find websites for
   the 58 hospices without one.
2. **Machine-unreadable shop lists** (PDF lists, JS-rendered lists,
   embedded map widgets): use a **headless browser** as a dev-only
   dependency to render and extract.
3. **Data depth**: name + address + postcode only — the existing
   `shops-website.json` schema unchanged; no opening hours, no phones,
   no `shops.json` contract change, no UI change.

## Acceptance criteria

1. A crawl script (new, in `scripts/`, zero-runtime-dep rule respected —
   headless browser is devDependencies only) visits each in-scope site
   and locates the hospice's charity-shop listing page(s) using the
   site's own navigation (no blind links; robots.txt respected; the
   project User-Agent; ~1 req/s per site).
2. New shop entries are appended to the shop raw source with the exact
   existing schema `{hospiceId, name, address[], postcode, source}` —
   `hospiceId` is the canonical id from `hospices-all.json`; `source` is
   the page URL the shop was read from; the existing 138 entries are
   preserved byte-for-byte (dedupe on name+address, not throwing away
   curated entries on collision).
3. New/updated postcodes are geocoded via the existing
   `scripts/geocode-shops.mjs` pattern (Nominatim 1 req/s, explicit
   User-Agent, resumable) into the geo source; unresolvable postcodes
   are logged, their shops drop out of the build with a count (existing
   build behaviour), and are listed in the crawl log.
4. `npm run build-data` exits 0 with every committed shop's `hospiceId`
   resolving (extend the ADR-0002 remap only if new data needs it —
   expected: no, canonical ids are used directly).
5. `npm test` and `npx tsc -b` pass; `public/data/shops.json` grows (or
   stays equal) — never shrinks below the 138-shop baseline.
6. A committed crawl log (one JSON/MD file) records per site: outcome
   (`ok` / `no-shop-page` / `unreadable` / `skipped-robots` /
   `not-found` / `no-website` / `discovery-found`), pages visited, shops
   extracted, and the discovery source (search/URL) when a website was
   newly found.
7. `README.md` + `data/README.md` counts and provenance rows updated
   (site coverage, entry count, crawl date, headless-browser note).
8. Discovery for the 58: best-effort search per hospice (the subagent /
   lead documents the method — e.g. name + town + "hospice" search, or
   charity-regulator links); discovered sites are crawled like the 150;
   undiscovered ones are logged `no-website`.

## Out of scope

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

## Binding constraints (from repo + owner)

- Crawl compliance: descriptive User-Agent identifying the project;
  robots.txt checked and honoured per site; ~1 req/s per site; public
  pages only.
- Committed raw artifacts are the source of truth (reproducibility
  rule): every shop must be independently readable from its `source` URL.
- Zero-runtime-dep: the app's runtime dependency set stays exactly as
  today; the headless browser may only be a devDependency.
- Byte-identical rebuild ritual must keep passing (A-05).
- The 138 curated entries' `source` URLs are curated-host pages; new
  entries may come from any in-scope hospice site.
