# Requirements — UK-wide hospice catchment map (work list)

Stage 4 of the pipeline for `.agents/feature.md`, 2026-10-16. Completed by the
Engineering Lead (the dispatched PM sub-session stalled >25 min with no
artifact on disk; the lead wrote the work list from the on-disk inputs —
see `.agents/pipeline.md` notes). Sources: `feature.md`, `research.md`,
`architecture.md`, `review.md` (PASS WITH NOTES, gaps G1–G3),
`docs/adr/0001–0005`, `GLOSSARY.md`.

Execution order: Phase A (raw inputs) → B (extract/merge scripts) → C
(geocoding, long pole) → D (build) → E (app) → F (docs). Coding updates
`.agents/implementation.md` after EVERY item (status, files touched,
validation) — not in a batch.

## Phase A — raw inputs & deps

1. **Add `xlsx` devDependency** (MODIFY `package.json`). Script-side XLSX
   parsing only. *Verify:* `npm ls xlsx` resolves.
2. **Acquire Scotland datastore** (NEW `data-raw/care-inspectorate-scotland-2026-08.csv`).
   Care Inspectorate Scotland datastore, the "as at 31 August 2026" file
   (pin the exact file name + data date in `data/README.md`). *Verify:* file
   present, `head` shows one header row, data date recorded.
3. **Acquire RQIA bulk export** (NEW
   `data-raw/rqia-regulated-services-2026-06.xlsx`). "All Registered
   Services" from the RQIA register (08/06/2026 file). *Verify:* file
   present; on first read log its sheet header (feeds item 8).
4. **Acquire Wales GP layers** (NEW
   `data-raw/gp-practices-wales-2026-10.csv` — or `.geojson`, whichever the
   DataMap.wales geonode exports; layer `geonode:gpmainsites_ogl` +
   `geonode:gpbranchsites_ogl`, OGL v3.0). *Verify:* file present, format
   recorded in `data/README.md`.
5. **England + NI inputs already in repo**: `data-raw/cqc-directory-2026-10.csv`
   (no re-download) and `data-raw/gp-practice-reference-file-july-26.csv`
   (305 rows, reused as-is — no new collection).

## Phase B — extract/merge scripts

6. **Widen England extract** (MODIFY `scripts/extract-gp-practices.mjs`).
   Drop `TARGET_AREAS`; emit `data-raw/gp-practices-en.json` (all
   "Doctors/GPs" rows, ~9,260) AND `data-raw/hospices-en.json` (Name contains
   "hospice", case-insensitive, ~178 raw rows). **Dedupe to one row per
   hospice organisation** (review gap G2): main-site rule — when several
   rows share an organisation, keep the single primary site (document the
   exact tie-break in the script header, e.g. the row whose outcode matches
   the main-siteword in the name, else lexicographically first by
   address). *Verify:* script exits 0 and logs `EN practices: 9260` (±),
   `EN hospice organisations: N` (N < 178); the 20 curated names each appear
   exactly once.
7. **Scotland extracts** (NEW `scripts/extract-gp-practices-sc.mjs`,
   `scripts/extract-hospices-sc.mjs`). ADR-0003 first-run discovery: log
   header + sample row, named-access mapping table in the script header,
   exit non-zero on unmapped required field (practices: name+postcode;
   hospices: name+postcode). Outputs `data-raw/gp-practices-sc.json`,
   `data-raw/hospices-sc.json`. *Verify:* scripts exit 0; logged header
   recorded in `data/README.md`; counts measured and logged.
8. **NI extracts** (NEW `scripts/extract-gp-practices-ni.mjs`,
   `scripts/extract-hospices-ni.mjs`). Practices: normalise the existing NI
   CSV (`PracNo/PracticeName/Address1-3/Postcode/LCG` →
   name/address[]/postcode/area; `area = outcode`) →
   `data-raw/gp-practices-ni.json`; **log distinct LCG values on first run**
   (review risk 3 — if Belfast-only, the limitation is documented in the
   Methodology modal later). Hospices: parse the RQIA XLSX (item 3), filter
   service name contains "hospice" → `data-raw/hospices-ni.json`; ADR-0003
   discovery rules apply. *Verify:* scripts exit 0; `NI practices: 305`;
   LCG list logged; RQIA header logged in `data/README.md`.
9. **Wales extracts** (NEW `scripts/extract-gp-practices-wales.mjs`,
   `scripts/extract-hospices-wales.mjs`). Practices from item 4's file
   (CSV or GeoJSON — first-run inspection) →
   `data-raw/gp-practices-wales.json`. Hospices: parse the CIW reply file
   (`data-raw/hospices-wales.csv`, format unknown until it arrives) →
   `data-raw/hospices-wales.json`; **the script and the whole build must be
   valid with a zero-length Wales hospice set** (review G3) — when the file
   is absent, emit `[]` with a log line, not an error. *Verify:* practices
   script exits 0; hospices script exits 0 with `[]` when the CIW file is
   absent.
10. **Merge hospices** (NEW `scripts/merge-hospices.mjs`). Inputs: the four
    `hospices-*.json`. Output `data-raw/hospices-all.json` per architecture
    §2.1 (id `${nation}-${registerId}` / row-index fallback, ADR-0002;
    `kind`, `source`, `website`, `cqcUrl`, `curated`). Seed the 20 `curated`
    from `scripts/catchment-map.mjs` **by CQC location ID** (20/20
    verified in review §3) — assert all 20 match uniquely, exit non-zero
    otherwise. *Verify:* `hospices-all.json` has exactly 20 `curated: true`;
    20 old slugs map 1:1 to `en-<cqcId>`.
11. **Shop id remap** (LEAD-FOUND gap — not in `review.md`; see
    `.agents/pipeline.md` notes). ADR-0002 changes the 20 curated ids slug →
    `en-<cqcId>`; the 138 rows in `public/data/shops.json` (and
    `data-raw/shops-website.json` / `data-raw/shops-geo.json` if they carry
    hospice ids) reference the old slugs. Add the slug → new-id mapping to
    `scripts/build-data.mjs` (applied to every shop row and any other slug
    reference, e.g. Legend/Methodology). *Verify:* every shop `hospiceId`
    resolves to an entry in `public/data/hospices.json` (assert in the build
    log: `shops unresolved: 0`).

## Phase C — geocoding (long pole)

12. **Widen geocoder** (MODIFY `scripts/geocode-postcodes.mjs`). Input =
    union of postcodes over all four `gp-practices-*.json` + all
    `hospices-*.json` units; reuse the existing resumable append to
    `data-raw/postcode-geo.csv` (1 req/s, User-Agent, 429/503 backoff);
    log the distinct count before running (~11–12k est.); **exit non-zero if
    any practice/hospice ends without coordinates** (no silent gaps).
    *Verify:* dry run logs the distinct count; re-run is idempotent (no
    duplicate `postcode-geo.csv` rows).
13. **Run the Nominatim batch** as a **background task** (3–4 h estimate at
    1 req/s; backoff can stretch it to days — monitored, resumable). *Verify:*
    task completed; `postcode-geo.csv` row count ≥ the item-12 dry-run count.

## Phase D — build

14. **UK build** (MODIFY `scripts/build-data.mjs`). Read `hospices-all.json`
    + `gp-practices-{en,sc,ni,wales}.json` (retire the `catchment-map.mjs`
    import — ADR-0005); single assignment rule = nearest hospice by
    haversine; UK Voronoi box `[-9.5, 49.5, 2.0, 61.5]` (ADR-0001) in **both**
    `build-data.mjs` and `scripts/validate-tessellation.mjs`;
    `hashToColor(id)` = FNV-1a → hue, `hsl(·,65%,45%)` (ADR-0004) as a **pure
    function of id** (byte-identical rebuild); add `nation`/`curated`
    fields; recompute `outsideCatchment` for the 138 shops; apply item 11's
    id remap. *Verify:* script exits 0; logs `unassigned: 0` and
    `shops unresolved: 0`; rebuild of identical inputs produces
    byte-identical `public/data/*.json`.
15. **Run validate-tessellation** (MODIFY `scripts/validate-tessellation.mjs`
    — box constant only). *Verify:* script exits 0 on the UK output.

## Phase E — app

16. **Types** (MODIFY `src/lib/types.ts`): + `nation: 'en'|'sc'|'wales'|'ni'`
    on `Hospice`, `Practice`, `Catchment`; + `curated: boolean` on
    `Hospice`. *Verify:* `tsc` clean.
17. **App shell** (MODIFY `src/App.tsx`): nation filter state
    (`all|en|sc|wales|ni`); pass to panel + map; header subtitle
    "UK — catchments approximated…". *Verify:* `tsc` clean; filter renders.
18. **Panel** (MODIFY `src/components/HospicePanel.tsx`): search box is the
    first element; nation pill row (All/England/Wales/Scotland/N. Ireland);
    list filtered by query AND nation; row = colour dot + name + town +
    `approx` badge + practice count. *Verify:* `tsc` clean; filtering
    asserted in the smoke test.
19. **Map** (MODIFY `src/components/MapView.tsx`): `fitBounds` per nation —
    EN `[[49.9,-4.6],[55.9,1.8]]`, SC `[[54.6,-8.0],[59.0,-1.0]]`, **Wales
    `[[51.4,-5.3],[53.4,-2.7]]` (NOT 49.9 — lead-found typo, arch §5.2)**,
    NI `[[54.0,-8.2],[55.7,-5.3]]`, UK full box; dim non-matching nation to
    opacity 0.15; ship **all** ~10k practice `CircleMarker`s with NO
    downsample — the smoke test checks first paint ≤ ~2 s; the pre-agreed
    fallback is the one-line canvas renderer (verify in the smoke test, do
    not pre-empt). *Verify:* `tsc` clean; nation change refits the map.
20. **Legend demoted** (MODIFY `src/components/Legend.tsx`): removed from the
    persistent layout; renders the **20-entry** colour list (name + hash
    colour) inside the Methodology modal instead. *Verify:* no persistent
    legend in the rendered app.
21. **Methodology** (MODIFY `src/components/Methodology.tsx`): UK-wide text
    — the four register names, the practice-derived Voronoi rule, the
    20-curated provenance note ("drawn boundary is now practice-derived" —
    ADR-0005; "old 20-swatch palette retired" — ADR-0004), the geocoding
    note, the **Wales placeholder note** (0 until the CIW reply), and the
    20-entry colour legend (item 20). *Verify:* `tsc` clean; text present.

## Phase F — docs

22. **README.md** (MODIFY): UK-wide framing, per-nation counts, old
    hard-coded "13 outside" prose **replaced with the recomputed count**;
    the 20-colour-key removal noted. *Verify:* no stale count text remains
    (grep).
23. **data/README.md** (MODIFY): the new `data-raw/` files (fetch dates,
    licences, pinned file names), the **CIW email request status + exact
    email text** (item B3), the first-run headers logged per ADR-0003, the
    RQIA data date, the GLOSSARY pointer. *Verify:* every committed
    `data-raw/` file has a row.

## Blocked-on-human

- **B1 — CIW email:** a human sends the CIWInformation@gov.wales request
  (text at item 23). Until the reply lands, Wales hospices = 0 (flagged,
  build valid — G3). The pipeline is NOT held up by this.
- **B2 — RQIA fallback DECISION (review gap G1):** if the acquired XLSX
  (item 3) lacks usable "hospice" rows, adopt a Wales-style placeholder for
  NI hospices (documented in `data/README.md`, `hospices-ni.json` = `[]`
  with a note) — decision made at item 8's first run, recorded in
  `.agents/implementation.md`.

## Acceptance & verification (feeds QA)

- `npm run build` (tsc + vite) passes.
- Reproducible pipeline: from committed `data-raw/`,
  `extract-gp-practices.mjs → extract-*-sc/ni/wales.mjs → merge-hospices.mjs
  → geocode-postcodes.mjs → build-data.mjs → validate-tessellation.mjs`
  exits 0 throughout.
- Byte-identical `public/data/*.json` on rebuild; `unassigned: 0`;
  `shops unresolved: 0`; per-nation hospice counts (EN deduped, SC/NI > 0
  measured, Wales ≥ 0 flagged); all 138 shops resolve, toggle works,
  `outsideCatchment` recomputed; 20 entries `curated: true`; first paint ≤
  ~2 s; nation filter narrows list + refits map.
