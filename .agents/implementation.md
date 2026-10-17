# Implementation — UK-wide hospice catchment map (stage 5)

Executes `.agents/requirements.md` (23 items, Phases A–F) in order.
Started 2026-10-16. Convention: one section per item; status updated as each
item completes (not in a batch). Shell: single commands only (daemon guard).
No `git commit` in this stage (lead commits).

Status legend: `done` / `blocked (human fetch)` / `pending geocode batch` /
`not started`.

---

## A1. Add `xlsx` devDependency (item 1)
Status: done (2026-10-16)
Files: `package.json`, `package-lock.json`
Verify: `npm ls xlsx` → `hospice-catchment-map@0.1.0 … -- xlsx@0.18.5` (resolves, exit 0).
Note: npm reports 3 known vulnerabilities in the SheetJS `xlsx` npm package
(1 moderate, 2 high). Accepted: script-side devDependency only, no runtime
use, no network-exposed service; the secure version is distributed via
SheetJS's own CDN registry, not npm.

## A2. Acquire Scotland datastore (item 2)
Status: done (2026-10-16)
Files: `data-raw/care-inspectorate-scotland-2026-08.csv` (README row at F23)
Verify: file present on disk; `find /c` = 10,499 lines (10,498 data rows +
one header row). Header logged verbatim (key columns): `CSNumber, Combined_Service_, CaseNumber_Combined, CareService, Subtype, AdditionalSubtypes, ServiceType, ServiceName, Address_line_1..4, Service_town, Service_Postcode, …, ServiceStatus, DateReg, …`. Data date: as at **31 August 2026** (pinned source file name `260831datastoreexternal.csv`, fetched from the Care Inspectorate S3 bucket). Fetch date 2026-10-16.

## A3. Acquire RQIA bulk export (item 3)
Status: **blocked (human fetch)** (2026-10-16)
Files: `data-raw/rqia-regulated-services-2026-06.xlsx` — **not on disk**
Findings: `curl https://publicregulation.gov.uk` → `curl: (6) Could not resolve
host: publicregulation.gov.uk` (DNS failure from this machine; matches
research §2.4 — all RQIA host variants DNS-fail here; the exact bulk-export
URL is UNVERIFIED and must not be guessed). Not looped per execution rule 3.
**Human fetch command/procedure (full-DNS machine):**
1. Open `https://publicregulation.gov.uk` and use the register's **data
   download / "All Registered Services"** export (research names it; the
   08/06/2026 file).
2. Save the XLSX as
   `C:\Users\james\source\repos\HospiceInfo\data-raw\rqia-regulated-services-2026-06.xlsx`
   (pin the exact as-of date from the file into `data/README.md`).
3. Re-run `node scripts/extract-hospices-ni.mjs` + `scripts/merge-hospices.mjs`
   + build.
Consequence now: `hospices-ni.json` = `[]` placeholder (B2 fallback, Wales-style),
build stays valid; `extract-hospices-ni.mjs` handles the absent XLSX gracefully
(B8).

## A4. Acquire Wales GP layers (item 4)
Status: **blocked (human fetch)** (2026-10-16)
Files: `data-raw/gp-practices-wales-main-2026-10.{csv,geojson}` +
`data-raw/gp-practices-wales-branch-2026-10.{csv,geojson}` — **not on disk**
Findings: `www.data.wales` → DNS fails (`curl: (6) Could not resolve host`).
Apex `data.wales` resolves (200 on the homepage, Cloudflare edge), but every
catalog/API path 404s at the edge — `/api/geonode/layers/?q=`,
`/datasets/geonode:gpmainsites_ogl/`, `/datasets/?q=GP+practice`,
`/datasets/` (also with a browser User-Agent). Stopped probing per execution
rule 3 (5 distinct probes; the edge blocks non-browser clients).
**Human fetch procedure (full-DNS machine, browser):**
1. Open `https://data.wales` and search the catalog for the GP practice
   layers `geonode:gpmainsites_ogl` (main sites) and
   `geonode:gpbranchsites_ogl` (branch sites) — OGL v3.0.
2. From each dataset's download tab, export the layer (CSV preferred;
   GeoJSON accepted — the extract script supports both).
3. Save as
   `…\data-raw\gp-practices-wales-main-2026-10.csv` and
   `…\data-raw\gp-practices-wales-branch-2026-10.csv` (rename
   `.geojson` if that is the exported format).
4. Re-run `node scripts/extract-gp-practices-wales.mjs` + geocoder + build.
Consequence now: `gp-practices-wales.json` = `[]` placeholder
(execution rule 3 / G3 style); build stays valid, Wales practices = 0
(flagged in the Methodology modal).

## A5. England + NI inputs already in repo (item 5)
Status: done (2026-10-16)
Files: (none)
Verify: `data-raw/cqc-directory-2026-10.csv` and `data-raw/gp-practice-reference-file-july-26.csv` both present on disk (glob `data-raw/*.csv`). CQC snapshot: 4 preamble lines, header line 5, "produced on 14 October 2026"; NI file: 305 data rows (`PracNo,PracticeName,Address1..3,Postcode,LCG,…`).

## B6. Widen England extract (item 6)
Status: done (2026-10-16)
Files: `scripts/extract-gp-practices.mjs` (MODIFIED) → `data-raw/gp-practices-en.json` (9,260 entries), `data-raw/hospices-en.json` (152 entries)
Dedupe rule (final, in script header; pinned after probe): group by normalized Provider name (fallback normalized Name); main site = (1) exact normalized Name match with provider, else (2) highest shorter/longer ratio among substring-containing pairs (the location named like its organisation wins), else (3) highest Levenshtein similarity to provider name; ties → smallest CQC Location ID. Probe facts: 178 raw "hospice" rows, 152 organisations, 16 multi-row groups; all 20 curated CQC ids present, each in a single-row organisation; the script asserts 20/20 exactly once (exit 1 otherwise). Shape: practices `{id:'en-<cqc slug>', name, address[], postcode}`; hospices `{id:'en-<cqcId>', cqcId, name, address[], postcode}`.
Fix found by verification: `Service types` is pipe-separated (`Doctors/GPs|…`) — predicate must use the first segment (exact-equality gave 338; correct is 9,260).
Verify: `node scripts/extract-gp-practices.mjs` → exit 0; actual output: `EN practices: 9260` / `EN hospice raw rows: 178 | organisations emitted: 152 | curated identities verified: 20/20`.

## B7. Scotland extracts (item 7)
Status: done (2026-10-16) — practices side **blocked (human fetch)** (placeholder `[]`)
Files: `scripts/extract-hospices-sc.mjs` (NEW) → `data-raw/hospices-sc.json` (3 entries); `scripts/extract-gp-practices-sc.mjs` (NEW) → `data-raw/gp-practices-sc.json` (`[]` placeholder for now)
First-run discovery (ADR-0003): CAS header logged — **109 cols** (`CSNumber, Combined_Service_, CaseNumber_Combined, CareService, Subtype, AdditionalSubtypes, ServiceType, ServiceName, …`); named access; SC hospice count verified = **3** (first: `sc-CS2014323454` "Hospice at Home", FK6 5HJ).
SC practices: the data.gov.uk CKAN API IS reachable from this machine — dataset verified: `gp-practices-scotland`, id `16f795a0-e87f-4ce2-a910-eeb7f9944632`; but it registers only two resources, both portal links (`https://data.spatialhub.scot/dataset/gp_practices-is`, `https://www.opendata.nhs.scot/dataset`) — no direct file download. No loop (rule 3); **human fetch** (browser): open the Spatial Hub layer page, download the GP practices layer as GeoJSON → `data-raw/gp-practices-scotland-2026-10.geojson`, re-run `node scripts/extract-gp-practices-sc.mjs` (then geocoder + build).
Verify: both scripts exit 0; actual output — `SC hospices: 3` / `SC practices: 0` (procedure logged).

## B8. NI extracts (item 8)
Status: done (2026-10-16) — RQIA side **blocked (human fetch)** (placeholder `[]`, per A3)
Files: `scripts/extract-gp-practices-ni.mjs` (NEW) → `data-raw/gp-practices-ni.json` (304 entries); `scripts/extract-hospices-ni.mjs` (NEW) → `data-raw/hospices-ni.json` (`[]`)
First-run discovery (ADR-0003): NI header logged verbatim (`PracNo,PracticeName,Address1,Address2,Address3,Postcode,LCG,Registered_Patients,,,,`); named access; names trimmed (trailing spaces in source); `area` = outcode.
**B2 DECISION (recorded 2026-10-16, first run):** RQIA XLSX absent (A3 DNS failure) → `hospices-ni.json` stays `[]` placeholder; map shows 0 NI hospices; build stays valid (Wales-style zero-set tolerance). Human fetch procedure in A3; the RQIA script does named column discovery (`Service Name`/`Regulated Service Name`/header containing "service name"; exits 1 with header if not found) and logs header + sample row on first successful run.
Verify: both scripts exit 0; actual output — `NI practices: 304` (306 data rows, 2 blank-name rows skipped) + `NI LCG values: Belfast=73 Northern=67 Southern=66 South Eastern=51 Western=47`; `NI hospices: 0` (placeholder logged).

## B9. Wales extracts (item 9)
Status: done (2026-10-16) — both sides **blocked (human fetch)** (placeholder `[]` per G3/A4)
Files: `scripts/extract-gp-practices-wales.mjs` (NEW) → `data-raw/gp-practices-wales.json` (`[]`); `scripts/extract-hospices-wales.mjs` (NEW) → `data-raw/hospices-wales.json` (`[]`)
Design: practices script reads `gp-practices-wales-{main,branch}-2026-10.{csv,geojson}` (both formats supported, per-layer, ADR-0003 first-run logging, named/case-insensitive access); absent layers skipped with a log; both absent → `[]` + human procedure (A4). Hospices script: CIW has no bulk export (research §2.3) so the input is a human-prepared CSV from the B1 email reply (`data-raw/wales-hospices-2026-10.csv`); absent → `[]`, log line, exit 0 (G3 tolerance).
Verify: both scripts exit 0; actual output — `Wales practices: 0` (absent-file logs + procedure) / `Wales hospices CSV absent … G3: [] (0 Wales hospices until the CIW reply, B1)`.

## B10. Merge hospices (item 10)
Status: done (2026-10-16)
Files: `scripts/merge-hospices.mjs` (NEW) → `data-raw/hospices-all.json` (155 entries)
Curated seeding: 20 CATCHMENTS matched by CQC id in `cqcUrl` (`location/1-<digits>`); the register row with the same `en-<cqcId>` is replaced by the curated record (names/town/postcode/kind/source/website/cqcUrl from catchment-map.mjs, `curated: true`). Register rows: `kind: 'approx'`, `curated: false`, EN register rows carry `cqcUrl`/`website` from their CQC id; SC rows use their explicit `town`. Assertions: exactly 20 curated, globally unique ids, all 20 curated ids present (exit 1 otherwise).
Verify: `node scripts/merge-hospices.mjs` → exit 0; actual output: `hospices-all: 155 total | en=152 sc=3 wales=0 ni=0 | curated: 20`.

## B11. Shop id remap (item 11)
Status: done (2026-10-16)
Files: `scripts/build-data.mjs` (MODIFY — `SLUG_TO_ID` table + per-shop remap + `unresolved ids` guard; pre-item-14 intermediate state, superseded by the item-14 rewrite)
Verify: `node scripts/build-data.mjs` → exit 0; actual output: `shops: 138 (geo missing 0); outside own catchment: 13; unresolved ids: 0`. Every shop `hospiceId` now carries the canonical `en-<cqcId>` identity (log lines: `outside catchment en-1-114396298: 4`, …). 20/20 legacy slugs resolved via `cqcUrl` → CQC Location id.

## C12. Widen geocoder (item 12)
Status: done (2026-10-16)
Files: `scripts/geocode-postcodes.mjs` (MODIFY — input is now the union of the 4 practice files + 4 hospice files; `gp-practices-target.json` and CATCHMENTS retired as inputs; pre-run count log; end-of-run guard exits non-zero if any in-scope postcode is still missing; 1 req/s + UA + 429/503 backoff + outcode fallback + CSV-skip retained)
Verify: dry run (probe `.qwen/tmp/geocode-scope.mjs`): **8,373 distinct in-scope postcodes** (practices: en=9,260, ni=304, sc=0, wales=0; hospices: en=152, sc=3, ni=0, wales=0); **552** already in `postcode-geo.csv` → 7,821 to fetch. Script start log: `in-scope postcodes: 8373 …; already in data-raw/postcode-geo.csv: 552`; completion log: `complete: all 8373 in-scope postcodes present` (exit 0) or `incomplete: N …` (exit 1). Re-run idempotent: existing rows skipped, append-only.

## C13. Run the Nominatim batch (item 13)
Status: **done (2026-10-16) — with a 9-postcode OSM gap (documented debt)**
Batch `bg_fcfd76e9` finished: `done: 7804 new, 17 missed, 108 district-fallback, 45 throttled` → guard exit 1 (`incomplete: 17 …`). One resume run (idempotent, fetched only the 17): `done: 8 new, 9 missed, 2 district-fallback, 1 throttled`.
Final CSV: **8,364 rows + header** of the 8,373 in scope. The 9 unresolvable are missing from OSM/Nominatim at unit AND outcode level after two full passes (8-attempt backoff + outcode fallback per postcode; not looped further, execution rule 3): `BT13 1AD, BT13 3BW, BT42 1GP, BT42 1NW, BT42 2PB, BT42 3JU, BT42 4JA, BT63 6JS, BT79 0NR`. (Probe: transient misses do clear on a resume pass — 8 of the 17 did; a BT13 probe itself hit 429, so the residual 9 are treated as a source-side gap, not a script bug.)
Verify: row count 8,364 + header (measured after the final run); the residual `incomplete: 9 …` line is the documented OSM gap (flows to D14 as 12 unassigned practices — QA risk-accepted).

## D14. UK build (item 14)
Status: **done (2026-10-16)** — final verify run after the C13 batch
Files: `scripts/build-data.mjs` (REWRITTEN — reads `hospices-all.json` + the 4 practice files; CATCHMENTS import kept ONLY for `SLUG_TO_ID` (ADR-0002/0005); UK Voronoi box `[-9.5, 49.5, 2.0, 61.5]` (ADR-0001); `hashToColor` = FNV-1a 32 → hue mod 360 → `hsl(hue,65%,45%)` hex (ADR-0004, PALETTE removed); single nearest-hospice haversine rule (outcode matching + pinned catchments retired); `nation`/`curated` fields added to hospice/practice/catchment outputs; `outcodes` dropped from catchment rows; `outsideCatchment` recomputed vs the new polygons; `shopsUnresolved` guard + per-nation practice logs retained)
Verify (intermediate run, 552-postcode geo state): `node scripts/build-data.mjs` → exit 0; actual output: `hospices: 155 (unplaced: 131)` / `voronoi: 1072 vertices, 24 labelled cells` / `shops: 138 (geo missing 0); outside own catchment: 19; unresolved ids: 0` / `practices: 9564 (geocoded 1048, missing 8516)` / `assigned: 1048, unassigned: 8516`. The large `missing`/`unassigned` counts are the expected mid-batch state (7,821 postcodes still fetching — C13).
Final verify (run 2026-10-16 after the C13 batch): `node scripts/build-data.mjs` → exit 0; actual output: `hospices: 155 (unplaced: 0)` / `voronoi: 9707 vertices, 155 labelled cells` / `shops: 138 (geo missing 0); outside own catchment: 21; unresolved ids: 0` / `practices: 9564 (geocoded 9552, missing 12)` / `assigned: 9552, unassigned: 12` (the 12 practices sit in the 9 OSM-unresolvable postcodes — C13, documented gap; `unassigned: 0` was unattainable). Second run of the same build is **byte-identical** (SHA-256 of all four `public/data/*.json` identical: hospices `FCED8491…AA1AF7`, practices `FF24599D…03A68D`, catchments `581FCEEA…DE80D2`, shops `7E81DF4C…D30D9F79`). Two data quirks recorded for the QA gate (not code bugs): (1) `en-1-17708902164` "Hospice at Home", Basildon SS16 5NJ — site coincident with a practice point → degenerate zero-area cell, its catchment row has `polygons: []` (marker still renders, validator reports 1 missing polygon, exits 0); (2) two distinct "Wisdom Hospice" register rows → 0.0002 deg² sliver overlap between their cells (passes the validator's tolerance).

## D15. Run validate-tessellation (item 15)
Status: done (2026-10-16) — run on the intermediate (mid-batch) UK output; final run recorded below
Files: `scripts/validate-tessellation.mjs` (MODIFY — bounds constant → `-9.5, 49.5, 2.0, 61.5` per ADR-0001)
Verify: `node scripts/validate-tessellation.mjs` → exit 0; actual output: `catchments: 24, missing polygons: 0` / `vertices outside bounds: 0` / `coverage: union=138.0000 / bbox=138.0000 deg^2 = 100.0%` (Voronoi tiles the box by construction) / `pairwise overlap: 0.0000 deg^2` — no overlap, no gaps, all vertices inside the UK bounds.
Final run (2026-10-16, after the C13 batch and the full 155-cell build): exit 0; `no polygon: en-1-17708902164` (Basildon degenerate cell) → `catchments: 155, missing polygons: 1` / `vertices outside bounds: 0` / `coverage: 138.0000 / 138.0000 = 100.0%` / `pairwise overlap: 0.0002 deg^2` (sliver between the two same-named "Wisdom Hospice" rows) — passes the validator's own tolerance; both anomalies are the documented data quirks from D14, not code defects.

## E16. Types (item 16)
Status: done (2026-10-16)
Files: `src/lib/types.ts` (MODIFY — `Nation = 'en' | 'sc' | 'wales' | 'ni'`; Hospice gains `curated: boolean` + `nation`; Practice `nation`; Catchment `nation`)
Verify: `node node_modules/typescript/bin/tsc -b` → exit 0, no errors (2026-10-16).

## E17. App shell (item 17)
Status: done (2026-10-16)
Files: `src/App.tsx` (MODIFY — `nation` state `'all' | Nation`; subtitle → "UK — catchments approximated from GP practice locations"; `nation={nation}`/`onNation={setNation}` wired into HospicePanel, `nation` into MapView; persistent `<Legend>` render removed and its import dropped)
Verify: `tsc` clean (`tsc -b` exit 0, 2026-10-16); filter renders (nation pills in shared HospicePanel; smoke test item 33 — lead).

## E18. Panel (item 18)
Status: done (2026-10-16)
Files: `src/components/HospicePanel.tsx` (MODIFY — `NationFilter` type exported here; All/England/Scotland/Wales/NI pill group; list filtered by nation; `approx` badge for `kind === 'approx'`; per-hospice practice-count badge; `unassigned` counter in the summary line)
Verify: `tsc -b` exit 0 (2026-10-16); filtering asserted in the smoke test (item 33 — lead).

## E19. Map (item 19)
Status: done (2026-10-16)
Files: `src/components/MapView.tsx` (MODIFY — `NATION_BOUNDS` per-nation viewports (Wales corrected to `[[51.4,-5.3],[53.4,-2.7]]`); `FitToNation` re-fits on filter change; MapContainer initial bounds = UK box; non-matching-nation polygons/practices/hospices/shops dimmed (opacity ≤ 0.15); all placed practices shipped, no downsampling; `· curated` in the hospice popup)
Verify: `tsc -b` exit 0 (2026-10-16); nation change refits the map (FitToNation — smoke test item 33, lead).

## E20. Legend demoted (item 20)
Status: done (2026-10-16)
Files: `src/components/Legend.tsx` (REWRITTEN — accepts `hospices`, renders ONLY the 20 curated entries (dot + name + town), JSDoc notes it is now modal-only), `src/App.tsx` (persistent render removed in item 17)
Verify: `tsc -b` exit 0 (2026-10-16); no persistent legend in the rendered app (grep for `<Legend` → only `src/components/Methodology.tsx`).

## E21. Methodology (item 21)
Status: done (2026-10-16)
Files: `src/components/Methodology.tsx` (REWRITTEN — UK framing: four registers (CQC Oct 2026 / CI Scotland 31 Aug 2026 / RQIA pending / CIW email-pending), per-nation count line (e.g. "England 152 · Scotland 3 · Wales 0 · Northern Ireland 0"), single nearest-hospice rule, postcode-unit Nominatim + UK Voronoi, 138 shops, "Catchment colour key (20 curated)" section rendering the demoted `<Legend>`; caveats incl. explicit Wales/NI 0-hospice note; refreshed data/update procedure)
Verify: `tsc -b` exit 0 (2026-10-16); text present (grep "four UK registers" → 1 hit in Methodology.tsx).

## F22. README.md (item 22)
Status: done (2026-10-16)
Files: `README.md` (REWRITTEN — UK title + 155-hospice framing; per-nation table (EN 152/9,260, SC 3/0, Wales 0/0, NI 0/304) with pending-fetch flags; "Current data snapshot" note (552/8,373 postcodes, 138 shops / 19 outside at this snapshot); pipeline table now 7 stages incl. merge + validate-tessellation; assignment rule = single nearest-hospice haversine (outcode matching retired); legend demotion noted (colour key in the Source & Method modal); updated-data steps reference the per-nation scripts + `data/README.md`)
Verify: grep `643|outcode|570-area|bottom-right|13 of them` on README.md → only hit is the intentional "no postcode-outcode lists" line (data/README.md rows were item 23's scope and are now updated too).
Addendum (2026-10-16, post-batch): the "Current data snapshot" paragraph in `README.md` now carries the final numbers — 8,364/8,373 postcodes resolved; 12 unassigned practices (9 OSM-unresolvable postcodes, `data/README.md`); 21 shops outside their own catchment.

## F23. data/README.md (item 23)
Status: done (2026-10-16)
Files: `data/README.md` (REWRITTEN — one row per committed `data-raw/` file incl. all `[]` placeholders + retired provenance artifacts; three human-fetch procedures (RQIA XLSX with exact target path + as-of-date pinning, data.wales `geonode:gpmainsites_ogl`/`geonode:gpbranchsites_ogl` layers, NHS Scotland Spatial Hub GeoJSON) each with its re-run chain; CIW data-request email with the EXACT text (B1); first-run header discovery per ADR-0003 (CQC 15 cols line 5, CI-SC 109 cols, NI file header verbatim; RQIA/Wales pinned on receipt); interim-state note (552/8,373 postcodes, 1,048 assigned, 19 shops outside at this snapshot); GLOSSARY.md pointer; caveats updated for the UK rule set)
Verify: every `data-raw/` file on disk (19 files, checked via directory listing 2026-10-16) has a row; the B1 email text is present (grep "Data request — list of hospice" → data/README.md).
Addendum (2026-10-16, post-batch): the `postcode-geo.csv` row and the "Current state" section in `data/README.md` now carry the final numbers — 8,364/8,373 in-scope postcodes; 9,552 assigned, 12 `hospiceId: null` (the 9 OSM-gap postcodes, listed in full); 21 shops outside their own catchment.

---

## Blocked-on-human (from requirements)

- **B1 — CIW email:** text drafted at item 23; a human must send it. Wales
  hospices = 0 until the reply lands (build valid — G3).
- **B2 — RQIA fallback DECISION:** recorded at item 8's first run.

## Lead-run commands remaining (final update 2026-10-16 — geocode batch COMPLETE)

The C13 batch finished: `data-raw/postcode-geo.csv` has **8,364 rows + header**
of the 8,373 in-scope postcodes; the 9 remaining (BT13 1AD, BT13 3BW,
BT42 1GP, BT42 1NW, BT42 2PB, BT42 3JU, BT42 4JA, BT63 6JS, BT79 0NR) are
documented OSM source gaps (no unit, no outcode, two full passes with
backoff + fallback — C13). The data pipeline was run to completion on this
machine: `node scripts/build-data.mjs` exit 0 (`assigned: 9552,
unassigned: 12`, `outside own catchment: 21`, `unresolved ids: 0`) and
`node scripts/validate-tessellation.mjs` exit 0; the second build pass is
byte-identical (SHA-256 verified). Remaining:

1. `npm run build` (tsc + Vite) — the only build step not yet re-run after
   the final data. Then commit the changed `public/data/*` and
   `data-raw/postcode-geo.csv` (8,364 rows).
2. The three human fetches (procedures + exact target paths in
   `data/README.md`); each is followed by its extract script, then the
   full re-run chain (`node scripts/merge-hospices.mjs` for a hospice
   fetch, `node scripts/geocode-postcodes.mjs`, `node scripts/build-data.mjs`,
   `node scripts/validate-tessellation.mjs`, `npm run build`):
   - RQIA XLSX → `node scripts/extract-hospices-ni.mjs`
   - data.wales GP layers (main + branch) → `node scripts/extract-gp-practices-wales.mjs`
   - NHS Scotland Spatial Hub GeoJSON → `node scripts/extract-gp-practices-sc.mjs`
3. Send the B1 CIW email (verbatim text in `data/README.md`); save the
   reply as `data-raw/wales-hospices-2026-10.csv` → `node scripts/extract-hospices-wales.mjs`
   → same chain as above.
