# Research — UK-wide hospice catchment map

Stage 1 (Research) of the pipeline for `.agents/feature.md` (UK-wide hospice
catchment map), 2026-10-16. **Supersedes the prior research pass of
2026-10-16** (the old file's claims are what were at issue when this pass was
triggered; everything below is re-stated from this session's reads/greps
/fetches/measurements). Facts the environment could not confirm are marked
**UNVERIFIED**.

## 1. Existing code map

### Pipeline scripts (`scripts/`, plain ESM `.mjs`, Node `node:fs`, no build step)

Five scripts form the documented pipeline (see `data/README.md` "Data
provenance" + `README.md` "Data pipeline"); the rest of the 27 files in
`scripts/` are one-off research/curation helpers
(`catchment-match.mjs`, `check-geo.mjs`, `debug-geo.mjs`, `debug-geo2.mjs`,
`download.mjs`, `fetch-hospices-wikidata.mjs`, `fetch-shops-osm.mjs`,
`find-datasets.mjs`, `geocode-shops.mjs`, `hospice-candidates.mjs`,
`inspect-cqc.mjs`, `outcode-survey.mjs`, `probe-cqc.mjs`, `probe-cqc2.mjs`,
`probe-hospice-class.mjs`, `probe-nominatim.mjs`, `probe-postcodes.mjs`,
`probe-sources.mjs`, `show-dataset.mjs`, `show-header.mjs`,
`summarise-cqc.mjs`, `validate-tessellation.mjs`, `wikidata-search.mjs`).

- **`scripts/extract-gp-practices.mjs`** — reads `process.argv[2] ||
  'data-raw/cqc-directory-2026-10.csv'`; CSV-parses, skips the first 5 lines
  (`rows.slice(5)` — 4 preamble lines + 15-column header); keeps rows whose
  first `Service types` value (column index 6, pipe-split on `|`) equals
  `Doctors/GPs` (verbatim string) **and** whose postcode outcode is in
  `const TARGET_AREAS = new Set(['PR', 'BB', 'FY', 'WN', 'BL', 'LA', 'CA',
  'WA', 'OL']);`. Emits `data-raw/gp-practices-target.json` with
  `{name, address[], postcode, area, phone, website, region, cqcUrl}` from
  columns r[0], r[2], r[3], r[4], r[5], r[11], r[12]. **UK-Wide extension =
  drop the `TARGET_AREAS` check** (one line); the `Region` column (index 11)
  already carries the nation label for every row.
- **`scripts/geocode-postcodes.mjs`** — distinct postcodes = union of
  practice postcodes and `CATCHMENTS` hospice postcodes, sorted; resumes off
  `data-raw/postcode-geo.csv` (skips postcodes already present). Per postcode:
  `fetch('https://nominatim.openstreetmap.org/search?q=<pc>&countrycodes=gb&format=jsonv2&limit=1')`
  with `User-Agent: HospiceInfoproto/0.1 (geocoding research; contact: james)`,
  `AbortSignal.timeout(20000)`; up to 8 attempts; 30 s backoff on
  429/503; 5 s on thrown errors; 1 s between requests. On a unit miss it
  retries once with the outcode (district) — the header comment says the
  result is "tagged d" but the CSV stays `postcode,lat,lon` (3 columns); no
  tag is written. Output rows are appended, so the file is forward-compatible
  with a larger UK-wide input set.
- **`scripts/catchment-map.mjs`** — exports `CATCHMENTS`: exactly 20 entries
  `{id, name, town, postcode, kind: 'published'|'approx', outcodes[], source,
  website, cqcUrl}` — 7 published (verbatim service-area quote in `source`) /
  13 approx (matches `data/README.md`'s lists).
- **`scripts/build-data.mjs`** — reads `gp-practices-target.json`,
  `postcode-geo.csv`, `catchment-map.mjs`, `shops-website.json`,
  `shops-geo.json`; uses `d3-delaunay` and `polygon-clipping`; writes
  `public/data/{hospices,practices,catchments,shops}.json`. Key mechanics:
  - practice → hospice: practice outcode matched against each catchment's
    `outcodes`; single match wins; ties **and** unmatched outcodes → nearest
    hospice site (haversine `distKm`); `hospiceId: null` only for practices
    with no geocoded point (currently 0 of 643 — complete partition).
  - Voronoi bounds hard-coded to the Lancashire box (quoted):
    `voronoi([-3.8, 52.9, -1.9, 55.05])` — **must widen for a UK build**.
  - catchment polygons = per-hospice cells unioned via
    `union(rings.map((ring) => [ring]))` (multi-ring output).
  - **Colour convention (as in code):** `PALETTE` is a hard-coded 20-entry
    hex array in `catchment-map.mjs` order; each hospice gets
    `PALETTE[i % PALETTE.length]`; practices and shops inherit their
    hospice's colour. **There is no hash function and no 100-colour palette
    anywhere in the codebase** — the "lambda-2 hashing / Z0-abseq 100-colour
    palette" described in the task brief does not exist in this repo; the
    Architect should take `i % N` rotation as the real baseline.
  - shop `outsideCatchment` = point-in-rings test against the shop's own
    catchment polygons.
- **`scripts/geocode-shops.mjs`** — Nominatim geocoding of the 138 curated
  shop postcodes/addresses → `data-raw/shops-geo.json` (per `data/README.md`).

### React app (React 18 + TS strict + Vite 5 + react-leaflet 4 + Bootstrap 5; no backend)

Files that exist (verified): `src/main.tsx`, `src/App.tsx`,
`src/components/{HospicePanel,MapView,Legend,Methodology}.tsx`,
`src/lib/{types.ts,useAppData.ts}`, `src/styles.css`, `index.html`.
**The task brief's `Panel.tsx`, `Summary.tsx`, `PageHeader.tsx`,
`StatusBadges.tsx` do not exist in this repo** (grep of `src/` found none);
the real components are the four listed.

- **`src/App.tsx`** — state: `selectedId`, `query`, `showShops`; four
  `useAppData` fetches of `/data/{hospices,practices,catchments,shops}.json`;
  header with hard-coded subtitle "Lancashire & South Cumbria — catchments
  approximated from GP practice locations" (must change), charity-shops
  toggle, "Source & Method" button → `#methodologyModal`; layout
  `aside.app-panel` (HospicePanel) + `main.app-map` (selection bar, MapView,
  Legend).
- **`src/components/MapView.tsx`** — `MapContainer` with **hard-coded bounds
  `[[53.0, -3.6], [54.95, -2.0]]`** (Lancashire box); OSMTiles;
  `FitToSelection` (re-fits on catchment select); multi-ring catchment
  `Polygon`s; practice `CircleMarker`s (coloured by assigned hospice,
  selection spotlight); shop `Marker`s (`#e07b00` when `outsideCatchment`).
- **`src/components/HospicePanel.tsx`** — text search (substr on name/town)
  + list of all 20 hospices with colour dot + practice-count badge.
- **`src/components/Legend.tsx`** — bottom-right card listing **all**
  hospices (20 today; ~320 would need the demote-to-on-demand rule).
- **`src/components/Methodology.tsx`** — modal; item 1 is Lancashire-specific
  ("filtered to the target postcodes PR, BB, FY, WN, BL, LA, CA, WA, OL") —
  wording must be generalised.
- **`src/lib/types.ts`** — `Hospice {id,name,town,postcode,lat,lon,color,kind,source,website,cqcUrl}`,
  `Practice {id,name,address[],postcode,lat,lon,outcode,hospiceId}`,
  `Catchment {hospiceId,name,kind,outcodes,practiceCount,polygons[][]}`,
  `Shop {id,name,address,postcode,lat,lon,hospiceId,outsideCatchment,source}`.
  A UK build will need a `nation` field somewhere in this chain — Architect's
  call.
- **`src/lib/useAppData.ts`** — generic `fetch(path)` hook for
  `/data/*.json`.
- **`package.json`** — scripts: `dev` (vite), `build` (`tsc -b && vite
  build`), `preview`, `build-data` (`node scripts/build-data.mjs`). Deps:
  `bootstrap ^5.3.3`, `leaflet ^1.9.4`, `react/react-dom ^18.3.1`,
  `react-leaflet ^4.2.1`; devDeps add `d3-delaunay ^6.0.4`,
  `polygon-clipping ^0.15.7`, `typescript ^5.5.4`, `vite ^5.4.8`. Node 18+
  (tested on Node 22).

### Data shapes & repo conventions

- `public/data/` (committed, generated): `hospices.json` **20**,
  `practices.json` **643**, `catchments.json` **20**, `shops.json` **138**
  (13 shops `outsideCatchment`).
- `data-raw/` (committed): `cqc-directory-2026-10.csv` (CQC locations
  extract, data date 14 Oct 2026), `gp-practices-target.json` (643),
  `postcode-geo.csv` (**552** geocoded postcodes),
  `gp-practice-reference-file-july-26.csv` (NI — see §2.4),
  `hospice-candidates.json`, `hospices-wikidata.json` (unused research
  artifacts), `shops-website.json` (138), `shops-geo.json`,
  `shops-osm.json`.
- `data/README.md` is the **provenance ledger** (source/fetch date/notes per
  file) and `README.md` documents the pipeline + 6-step "Updating the data"
  workflow — the UK build must extend both (new raw files → new provenance
  rows) to keep the offline-reproducibility promise (raw + generated data
  committed; only OSM tiles fetched at runtime).
- `data/raw/` is an empty directory (glob matched nothing this session).
- CQC CSV layout (verified against the file on disk): exactly 4 preamble
  lines — `CQC Locations data` / blank / `This data was produced on 14
  October 2026` / blank — then the 15-column header (verbatim):
  `Name,Also known as,Address,Postcode,Phone number,Service's website (if
  available),Service types,Date of latest check,Specialisms/services,Provider
  name,Local authority,Region,Location URL,CQC Location ID (for office use
  only),CQC Provider ID (for office use only)`. `Service types` is
  pipe-separated; the pipeline uses the first value.

## 2. Nation data sources (the crux)

### 2.1 England — CQC (verified; already on disk)

- **Bulk locations register**: on-disk file
  `data-raw/cqc-directory-2026-10.csv` corresponds to the live CQC download
  for 14 Oct 2026 (see `data/README.md` row for it).
- **Download endpoint (verified 2026-10-16)**: data page
  `https://www.cqc.org.uk/about-us/transparency/using-cqc-data` lists the
  weekly file; current one
  `https://www.cqc.org.uk/system/files/2026-10/14_October_2026_CQC_directory.csv`
  (CSV ~18 MB; ZIP ~4 MB) — "complete list of places in **England**
  regulated by CQC". The API portal
  `https://api-portal.service.cqc.org.uk` (registration + auth, API docs on a
  linked Google Drive file, contact `syndicationapi@cqc.org.uk`, TLS 1.2+,
  daily data incl. inactive records) is the alternative when weekly files are
  stale; the CSV is simpler and already committed.
- **Register search URLs (verified link pattern)**:
  `https://www.cqc.org.uk/search/all?filters%5B%5D=services%3Adoctor&radius=all`
  (service-lookup pattern usable for per-provider pages).
- **Licence**: Open Government Licence v3, must acknowledge CQC.
- **Counts (measured this session from the on-disk file; 57,110 data rows)**:
  - `Name` containing "hospice" (case-insensitive) — **178 rows**, all
    England regions: North West 33, South East 29, West Midlands 24,
    Yorkshire & Humber 20, London 17, East 17, South West 14, East Midlands
    13, North East 11. (Reference: first `Service types` value = `Hospice`
    matches 199 rows — the name rule is narrower by 21; feature.md fixes the
    name rule.)
  - First `Service types` = `Doctors/GPs` — **9,260 rows** (London 2,221;
    North West 1,349; South East 1,307; West Midlands 946; East 881;
    Yorkshire & Humber 770; South West 728; East Midlands 679; North East
    378; **1 row mislabelled Region "Wales" — border anomaly, see §3**) →
    **7,995 distinct unit postcodes**; the current target extract keeps 643.
- **Widening = deleting the `TARGET_AREAS` outcode filter** in
  `extract-gp-practices.mjs`; nothing else needs to change for the England
  side.

### 2.2 Scotland — Care Inspectorate (CAS) (bulk CSV verified reachable)

- **Full register CSV (verified this session)**:
  `https://www.careinspectorate.scot/care-services/directory/download` →
  `200, text/csv`, ~6.3 MB; the directory page states the data is updated
  regularly (cadence **UNVERIFIED**). Column set as reported by the fetch:
  `Case Number, Service Name, Service Type, Date of Registration, Address,
  Contact Details, Manager, Provider ID, Service Status` — **confirm headers
  on actual download** (not independently parseable from the fetched snippet).
- **Monthly datastore (verified this session)**: e.g. as at 31 Aug 2026 —
  `https://ci-web-media-production-bucket.s3.eu-west-2.amazonaws.com/assets/resources/datastore/260831datastoreexternal.csv`
  and `...260831datastoreexternal.xlsx` (XLSX adds pivot tables + a
  field-definitions sheet). Landing page:
  `https://www.careinspectorate.scot/resources-data/data-and-statistics/datastore`.
  Cancelled services are dropped month-to-month; there is a separate
  `cancelled-services` section for historical transparency.
- **Register search (verified)**:
  `https://www.careinspectorate.scot/find-care/search-for-care/care-services`
  with `service_type` and `current_status` params plus keyword box. The
  visible service-type filter list (13 types) has **no primary-care/GP
  type** — GP practices are not CAS-registered.
- **Hospices**: run the same name rule (`Service Name` contains "hospice")
  against the directory CSV. Count **UNVERIFIED** (file not downloaded;
  general knowledge suggests ~12–18 Scottish hospice sites — do not plan on
  a number until counted).
- **Licence**: OGL per the site's data pages.
- **GAP — Scottish GP practices**: the expected source is ISD (NHS Scotland)
  **Places of Provision (POD)** — a monthly list of all NHS Scotland places
  including all GPs, with postcodes. **UNVERIFIED from this machine**:
  `https://isd.org.uk` DNS-fails here (`ENOTFOUND`); expected portal
  `https://isd.org.uk/data-portal/datasets`. Fallbacks: OSM Overpass
  `health` POIs for Scotland (coverage patchy, count UNVERIFIED), or the
  `data.gov.uk` "GP Practices – Scotland" dataset (existence UNVERIFIED —
  `data.gov.uk` search 404'd from this machine).

### 2.3 Wales — Care Inspectorate Wales (CIW)

- **Register**: CIW's register/search is a JavaScript SPA at
  `https://www.careinspectorate.wales/find-care-service` (canonical:
  `https://digital.careinspectorate.wales/directory/search?fromCiwWebsite=1`;
  `careinspectorate.wales` 301-redirects to `digital.careinspectorate.wales`).
  **Any static fetch of the search page returns only a 4 KB redirect stub**
  ("if you are not being redirected to the CIW digital services",
  `javascript:location.reload()`). The results markup, any underlying API
  and any backend/export are **UNVERIFIED** and cannot be inspected without a
  JS-capable client (headless browser). **No bulk CSV/API was found by static
  analysis.**
- **Data tools (verified)**: `.../data-tools` hosts Power BI dashboards
  ("Services and places" covers care-home, domiciliary-support,
  child-care/play types; "Adults and Children's Services" covers six annual
  return types) and linked dataset pages — **counts only, not
  address-level register rows**.
- **Annual statistics (verified)**: StatsWales dataset
  `https://stats.gov.wales/en-GB/e355fff1-10a8-477f-877d-cc9e99326904` —
  "CIW care service data: services, registrations and cancellations by
  service type and area", 2020-21…2024-25, 4,697 rows, 26 LAs / 11 LHBs;
  supports SEXYP `CIVServiceType` (28 types) — includes care-home,
  domiciliary, nurse-agency, child-care types but **no palliative-care /
  hospice category and no primary-care category**. 2020-21 "Care Homes for
  Adults" totals were 1,043 services / 25,466 places. Implication: Welsh
  hospices are registered services (very likely under "Care Homes for
  Adults") with no hospice-specific count anywhere on the public pages.
- **Counts**: Welsh hospices and Welsh GP practices — **UNVERIFIED** from
  anything fetchable here (general-knowledge estimate ≈ 10–15 hospices,
  ≈ 600–700 GP practices — do not plan on these).
- **Data requests**: CIW field data queries via `ciwinformation@gov.wales`
  (verified on the data-tools page), OGL for published Welsh Government
  data.
- **GAP — Welsh GP practices**: NHS Wales directory
  `www.health.wales.nhs.uk` **DNS-fails from this machine** (GP list
  UNVERIFIED). CIW does not register GPs. Fallbacks: (a) headless-browser
  scrape of the NHS Wales GP list from a normal-DNS machine, (b) OSM
  Overpass `health` POIs for Wales (patchy), (c) email request to
  ciwinformation.
- **Licence**: register terms UNVERIFIED (SPA unreadable) — check before
  automated extraction.

### 2.4 Northern Ireland — RQIA + committed GP file

- **Hospices — RQIA register**: expected site `publicregulation.gov.uk`
  (per feature.md: "no bulk export", search UI). **UNVERIFIED from this
  machine**: `https://publicregulation.gov.uk`, `https://www.publicregulation.gov.uk`,
  `https://publicregulation.service.ni.gov.uk` all DNS-fail
  (`ENOTFOUND`). Working assumption (matches the NI GOV.UK "az" search app
  pattern): `https://www.publicregulation.gov.uk/search/?search=hospice` →
  validate with one browser fetch from a DNS-reachable machine. NI hospice
  count **UNVERIFIED** (feature.md calls it thinnest; general knowledge:
  single-digit hospice organisations — do not plan on a number).
  **Feasibility**: if the search renders server-side, the whole list is a
  handful of pages — opening each result in a browser and transcribing
  name/address/postcode (≈8–15 records) is realistic and avoids scrape-
  fragility entirely. RQIA licence terms: **UNVERIFIED**.
- **GP practices — `data-raw/gp-practice-reference-file-july-26.csv`
  (verified this session)**: 305 data rows (307 lines incl. header + 1
  blank). Header verbatim: `PracNo,PracticeName,Address1,Address2,Address3,Postcode,LCG,Registered_Patients`
  (8 named columns). **Coverage: Northern Ireland only** — every row's
  postcode is a BT outcode and `LCG` values are exactly the five NI Health &
  Social Care areas: Belfast 73, Northern 67, South Eastern 51, Southern 66,
  Western 47, plus 1 blank. 1 row has an empty Postcode → **304
  geocodable postcodes**. `data/README.md`: "NHS GP practice reference file,
  July 2026 extract, Northern Ireland only — **not used** in this map; kept
  for reference". Upstream publisher URL (HSCNI) **UNVERIFIED** (`hscni.net`
  homepage fetched but is a near-empty stub; `/publications/` 404'd).
  **Conclusion**: reusable as-is as the NI practice source (a complete,
  postcoded list); it is *not* a UK-wide file and cannot be widened — the
  other three nations each need their own source above.

### 2.5 UK summary

| Nation | Hospices (name contains "hospice") | GP practice locations | Source |
|---|---|---|---|
| England | **178** (measured, on-disk) | **9,260** rows / **7,995** distinct postcodes (measured) | CQC locations CSV (on disk + verified URL) |
| Scotland | UNVERIFIED (expect ~12–18; must count directory CSV) | UNVERIFIED (ISD POD expected; DNS-fails here) | CAS directory CSV (verified URL) + ISD |
| Wales | UNVERIFIED (expect ~10–15; register is a browser-only SPA) | UNVERIFIED (NHS Wales directory; DNS-fails here) | CIW register SPA (headless browser) |
| N. Ireland | UNVERIFIED (expect single digits; verify search URL) | **305** rows / 304 geocodable (measured, in-repo) | RQIA search (browser) + committed GP file |
| **UK total** | ~300-range consistent with feature.md's "~320 total" | ≈ 9.5–10.3k distinct unit postcodes (est., pending Scotland/Wales) | |

## 3. Risks & open questions

1. **Geocoding volume vs Nominatim policy.** England alone = 7,995 distinct
   unit postcodes (measured); + Scotland + Wales + 304 NI ≈ 9.5–10.3k total
   (Scotland/Wales counts UNVERIFIED). Pure Nominatim at the enforced
   1 req/s (existing `geocode-postcodes.mjs` behaviour, resumable, valid UA)
   ≈ **2.7–2.9 h** — feasible but on the bulk edge of the usage policy.
   **Mitigation: ONS Postcode File (PCF)** — quarterly OGL file with lat/lon
   for every UK postcode unit (all four nations); one download resolves the
   vast majority, leaving Nominatim for the small tail (misspellings,
   defunct units). **Exact current release URL UNVERIFIED from this machine**
   (ONS page `ons.gov.uk/geography/postcode-boundaries/postcode-file-pcf`
   404'd; `data.gov.uk/dataset?q=postcode+file` 404'd; `data.gov.wales`,
   `isd.org.uk` DNS-fail) — confirm from a full-DNS machine. Expected order
   of magnitude: 100k+ rows, few MB.
2. **Registers behind JS walls (CIW, RQIA).** Static `fetch` cannot read
   either (CIW proven: 4 KB redirect stub twice). Options: (a) headless
   browser (Playwright/Puppeteer) for a one-off extraction script, (b)
   manual transcription (realistic for RQIA's ~dozen records; harder for
   CIW), (c) CIW email request (`ciwinformation@gov.wales`). Licence/ToS for
   CIW register scraping UNVERIFIED.
3. **Network reachability of this machine.** DNS-fails observed this
   session: `publicregulation.gov.uk` (all variants), `health.wales.nhs.uk`,
   `data.gov.wales`, `isd.org.uk`, `gpconnect.scot`; `data.gov.uk` site
   works but `/search` 404s. Works: `cqc.org.uk`, `careinspectorate.wales`,
   `careinspectorate.scot` (+ its S3 bucket), `opendata.nhs.scot`,
   `hscni.net`, `nhs.scot`, `stats.gov.wales`, `gov.uk`,
   `nominatim.openstreetmap.org`. The Coding stage must re-run the
   UNVERIFIED fetches from a properly-connected machine and record results
   in the code-map section's style.
4. **CAS `Service Type` values unverified** — the 6.3 MB directory CSV was
   not parsed this session; hospice rows must be located and their
   `Service Type` values confirmed after download.
5. **CQC border row** (1 `Doctors/GPs` row, Region "Wales") — exclude (it is
   an England-extract row whose Region label is off) or keep; if kept, the
   UK build should dedupe against the CIW register (see risk 6).
6. **Cross-register double-counting** — a palliative provider operating in
   two nations can appear in both registers; de-duping by (name, postcode)
   is cheap to add at the merge step; expected to be near-zero.
7. **Hard-coded geography** — `build-data.mjs` Voronoi `[-3.8, 52.9, -1.9,
   55.05]` and `MapView.tsx` `[[53.0,-3.6],[54.95,-2.0]]` must become UK box
   (≈ lon −8.5…1.8, lat 49.9…60.9; Architect sets exact values incl.
   small-catchment zoom behaviour — `FitToSelection` already handles
   per-catchment fitting).
8. **UI scale at ~320 catchments** — Legend (all-hospices wall),
   HospicePanel list, search-first requirement (feature item 5), colour
   rotation (20-entry `PALETTE[i % N]` → nation-local rotation), App
   subtitle + Methodology wording (Lancashire-specific text). All are
   contained in the five components above — no new infrastructure needed.
9. **`outsideCatchment` recomputation** — the 138-shop flags fall out of the
   new tessellation automatically in `build-data.mjs`; the 20 curated
   catchment `outcodes` (incl. Derian House's single outcode, owner of 8 of
   the 13 flagged shops) are kept per feature rule, so the 13/138 split may
   shift — verify post-build and update `data/README.md` + README counts.
10. **Snapshot drift** — CQC weekly / CAS monthly; the committed extracts
    must keep provenance rows (fetch date + exact filename per new raw file)
    in `data/README.md` per repo convention.

## Open questions

1. **ONS Postcode File**: exact latest release URL, row count, and confirm
   it carries lat/lon for all four nations (verify from full-DNS machine /
   Stage 2)?
2. **ISD Places of Provision (POD)**: confirm URL, file format (expected
   Excel), cadence, and that GP rows carry full postcodes (`isd.org.uk`
   DNS-failed)?
3. **CIW register**: what are the search params / result markup / ToS for
   "hospice", and is there a headless-readable results URL? (Determines
   browser-script vs manual transcription.)
4. **RQIA**: does `publicregulation.gov.uk/search/?search=hospice` render
   server-side, how many results, and what fields (postcode?) — and its
   licence terms?
5. **CAS hospice count + `Service Type` values** — answer: download the
   6.3 MB directory CSV once and count (expected 12–18).
6. **Welish GP list**: exact URL/format of the NHS Wales GP directory
   (DNS-failed)? Fallback choice: OSM Overpass (patchy) vs
   ciwinformation email?
7. **CQC Region-="Wales" row**: exclude or keep; cross-check against CIW?
8. **Colour rotation scheme** for ~320 catchments (nation-local 20-color
   rotation vs hue bucketing) — Architect.
9. **UK Voronoi bounds + default view** (initial centre/zoom; nation-filter
   auto-fit) — Architect.
10. **Geocoding strategy**: PCF-first (new input file + merge step, minutes
    + small Nominatim tail) vs pure Nominatim (≈2.9 h, existing script
    unchanged)? Decision affects `geocode-postcodes.mjs` shape and the
    DevOps run-time estimate.
11. **Glossary terms**: `docs/GLOSSARY.md` does not exist yet; candidates for
    the Architect to finalise: **catchment**, **tessellation** (Voronoi cell
    union), **outcode** (postcode outward code), **published vs approx**
    (service-area provenance), **outsideCatchment** (point-in-polygon shop
    flag), **geocoding unit** (PC = postcode unit), **practice location**
    (registered site).
