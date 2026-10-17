# Architecture — UK-wide hospice catchment map

Design for `.agents/feature.md` (UK-wide hospice catchment map), 2026-10-16.
Reads: `QWEN.md`, `.agents/feature.md`, `.agents/research.md`.
Decisions with longer rationale live in `docs/adr/0001.md` … `0005.md` (linked as [ADR-n]).
New domain terms follow `GLOSSARY.md` (finalised by this stage).

## 0. Summary of what changes

- Practice + hospice data sources: four national registers + four practice files (was: one England CQC CSV).
- `build-data.mjs` becomes UK-wide: single source of truth `hospices-all.json`, practice-derived assignment to every hospice (20 curated keep only their `kind` + source note), UK Voronoi box (was: CQC 9-outcode + 20-outcode + Lancs Voronoi).
- `postcode-geo.csv` grows from 552 rows to ~13k rows (resumable Nominatim batch).
- App: search-first panel with nation filter (was: list of 20), 20-colour legend demoted to Source & Method modal, hash-derived per-hospice colour (was: static 20-swatch palette).

## 1. Nation data acquisition

Per-source plan. One new script per nation where a scriptable feed exists; the Wales hospice route is manual.

### England (re-existing)
- **Hospices + practices** — widen `scripts/extract-gp-practices.mjs`:
  - drop `TARGET_AREAS`; select `first(r) === 'Doctors/GPs'` (≈9,260 rows, ~7k distinct postcodes est.).
  - add a second emit: rows with `Name` (col 0) containing "hospice" (case-insensitive) → `data-raw/hospices-en.json` (~178 rows est.). Fields: name, address[], postcode, phone, website, region, cqcUrl (same CSV column mapping as practices).
  - output `data-raw/gp-practices-en.json` (renamed from `gp-practices-target.json`; the old name is retired).
- **Licence** — CQC register is OGL v3.0 (documented in `data/README.md`).

### Scotland
- **practices** — new `scripts/extract-gp-practices-sc.mjs`. Source: data.gov.uk "GP Practices – Scotland" (`16f795a0-…`), a CKAN GeoJSON resource with name/address/location. Output `data-raw/gp-practices-sc.json`, same shape as EN (name, address[], postcode, area, …). **UNVERIFIED** row count — first run logs it; design must tolerate 0 → 5k.
- **hospices** — new `scripts/extract-hospices-sc.mjs`. Source: Care Inspectorate Scotland datastore monthly CSV (OGL). Filter: Name contains "hospice". Output `data-raw/hospices-sc.json`. **UNVERIFIED** columns — first run logs the header and a sample row before the filter is trusted (document this in the script's header comment).
- **Licence** — OGL (both).

### Northern Ireland
- **practices** — **reuse `data-raw/gp-practice-reference-file-july-26.csv` as-is** (305 rows + header). One new script `scripts/extract-gp-practices-ni.mjs` normalises it to the common shape (map `PracNo/PracticeName/Address1-3/Postcode/LCG` → name/address[]/postcode/area; `area = outcode`). No geocoding beyond the shared Nominatim batch.
- **hospices** — new `scripts/extract-hospices-ni.mjs`. Source: RQIA "All Registered Services" XLSX (bulk export confirmed by research; contradicts the feature brief's "no bulk export" assumption). Read with a small XLSX dep (add `xlsx` to devDependencies). Filter: service name contains "hospice". Output `data-raw/hospices-ni.json`. **UNVERIFIED** column names — first run logs the header row.
- **Licence** — OGL (RQIA register is published OGL).

### Wales
- **hospices** — **manual, async**. The CIW directory is email-only (`CIWInformation@gov.wales`); no self-serve bulk CSV (research confirms). Process:
  1. Coding stage composes and sends the email (named in `data/README.md` as the pending request).
  2. On reply, the human saves the file to `data-raw/hospices-wales.csv` (or whatever format CIW sends) and commits it.
  3. `scripts/extract-hospices-wales.mjs` parses it (first run logs header + sample; filter on "hospice" in name).
  4. **Build proceeds with 0 Welsh hospices until the reply lands.** The build must be valid with an empty Wales hospice set (no crash, no empty-polygon arrays). When the file lands, re-run extract + build. This is a **flagged placeholder, not an error**: `hospices.json` will contain a Wales nation with `length: 0` until then.
- **practices** — new `scripts/extract-gp-practices-wales.mjs`. Source: DataMap.wales geonode layers `geonode:gpmainsites_ogl` + `geonode:gpbranchsites_ogl` (OGL v3.0, geocoded points). Download format (CSV vs GeoJSON) **UNVERIFIED** — first run inspects the layer; both are supported. Output `data-raw/gp-practices-wales.json`.
- **Licence** — OGL v3.0 (both).

### Shared `data-raw/` additions
- `gp-practices-{en,sc,ni,wales}.json` — one file per nation, common shape (below), emitted by the per-nation extract scripts.
- `hospices-{en,sc,ni,wales}.json` — one file per nation.
- `hospices-all.json` — **the single source of truth** for the hospice list, produced by `scripts/merge-hospices.mjs` from the four per-nation files. This file, **not** `catchment-map.mjs`, drives the build.
- `postcode-geo.csv` — same file, appended to (no new file).

## 2. Unified data model

### 2.1 `hospices-all.json` (new, drives the build)
Each entry:
```
id            string  ${nation}-${cqcId|rowId}  — UK-unique, stable (below)
name          string
town          string
postcode      string
nation        'en' | 'sc' | 'wales' | 'ni'
kind          'published' | 'approx'
source        string   (verbatim quote for published; rationale note for approx)
website       string   ('' if none)
cqcUrl        string   (register URL; '' if the source has no per-record URL)
curated       boolean  (true only for the 20 original catchments)
```
- `id`: for England, `${'en'}-${cqcLocationId}` from the CQC CSV (the existing `cqcUrl` already encodes it). For the other three nations, the register's own record ID; if a register has no per-record ID, use a row index `${nation}-r${n}` (stable as long as the CSV/XLSX row order is stable — document the fetch date in `data/README.md`).
- `curated`: the 20 original Lancs/South Cumbria catchments are identified **by CQC location ID match** (the `cqcUrl` value in `catchment-map.mjs` already carries the CQC location ID). `merge-hospices.mjs` seeds `curated: true` + `kind` + `source` from `catchment-map.mjs` for the 20 matching IDs; everything else is `curated: false, kind: 'approx'`.

### 2.2 `src/lib/types.ts` changes
- `Hospice`: add `nation: 'en' | 'sc' | 'wales' | 'ni'` and `curated: boolean`.
- `Practice`: add `nation: 'en' | 'sc' | 'wales' | 'ni'`.
- `Catchment`: add `nation` (denormalised from its hospice; lets the map fit bounds per nation without a join).
- `Shop`: unchanged (keeps `hospiceId`).

### 2.3 `build-data.mjs` rewrite
- **Input**: `hospices-all.json` (replaces `catchment-map.mjs` import) + `gp-practices-{en,sc,ni,wales}.json` (replaces `gp-practices-target.json`).
- **Assignment**: practice → nearest hospice site by haversine `distKm`, same as the current fallback. The 20 `curated` entries' `outcodes` are **retired as an assignment mechanism** ([ADR-3]: they were a proxy for the service area; now the practice-derived Voronoi is the single rule). Their `kind` and `source` survive in `hospices.json` as provenance.
- **Voronoi box**: `[ -9.5, 49.5, 2.0, 61.5 ]` (lon/lat; UK with margin). [ADR-1].
- **Colour**: `hashToColor(id)` — FNV-1a hash of `id` → hue in [0,360), fixed `s=65% l=45%` (legible on both light and dark tiles). No committed 300-colour identity. [ADR-4].
- **Output**: same four files in `public/data/`; `hospices.json` now ~300 entries with `nation`/`curated`; `practices.json` ~10k; `catchments.json` ~300; `shops.json` unchanged (138, `outsideCatchment` recomputed against the new UK polygons).

## 3. Geocoding strategy

- Reuse `scripts/geocode-postcodes.mjs` pattern (1 req/s, resumable append to `postcode-geo.csv`, outcode fallback on unit miss, 429/503 backoff).
- **Batch**: distinct postcodes across all four practice files + hospice units. EN ~7k + SC (UNVERIFIED, assume 3k) + WALES (UNVERIFIED, assume 1k) + NI 305 + ~300 hospice units → **≈ 11–12k distinct postcodes ≈ 3–4 h at 1 req/s** (estimate, not measured).
- The script already skips postcodes present in `postcode-geo.csv`; re-running after each nation's geocodes are in is safe and idempotent.
- **Wall time**: 3–4 h background run; the existing 552 rows are reused as-is.
- **ToS note** (flagged explicitly): ~11–12k Nominatim calls is within the 1 req/s policy per [research]; the User-Agent string identifies the project per OSM's usage policy. No OSM bulk download (several GB, unverified) is used for this batch.

## 4. Catchment tessellation

- Practice-derived everywhere (feature.md rule 3): one nearest-hospice rule, no per-nation special case.
- The 20 `curated` keep only `kind` + `source` (provenance); their drawn geometry is re-derived from the UK Voronoi like every other hospice ([ADR-3]).
- UK Voronoi clip box `[ -9.5, 49.5, 2.0, 61.5 ]` — a simple rectangle, **no coastline clipping** ([ADR-1] vs the OSM land-mask alternative).
- `outsideCatchment` recomputation unchanged (point-in-rings test against the shop's own catchment polygon). The 138-shop set is untouched as data; only the polygon it is tested against changes.

## 5. Colour + UI design

### 5.1 Colour
- `hashToColor(id)`: FNV-1a → hue; `hsl(h, 65%, 45%)` → hex. Same colour for a hospice, its catchment polygon, and its practice dots (the existing `hosp?.color` pattern carries through).
- No legend of 300 colours. The 20 original colours are **not** preserved — the 20 get their hash colours like everyone else; the old 20-swatch palette is retired.

### 5.2 App layout
- **HospicePanel** (search-first, top search box):
  - Top: search input (existing `query` state), now the *first* element.
  - Below search: a **nation filter** row — `All | England | Wales | Scotland | N. Ireland` (Bootstrap pills).
  - Result list: filtered by `query` (name/town) AND `nation`. No 300-row loop required — the list is virtualised by the existing `overflow-auto` container; with a nation filter, the visible set is ~70 rows max.
  - Each row: colour dot, name, town, `approx` badge (shown whenever `kind === 'approx'`, including the 20 curated entries — they keep their flag as before), practice-count badge.
- **MapView**:
  - `FitToSelection` unchanged (fits to the selected catchment).
  - On **nation filter change**, the map `fitBounds` to that nation's hospice points (computed from `hospices.json` by nation; a pre-computed bounds constant per nation is fine — e.g. `en: [[49.9,-4.6],[55.9,1.8]]`, `sc: [[54.6,-8.0],[59.0,-1.0]]`, `wales: [[49.9,-5.3],[53.4,-2.7]]`, `ni: [[54.0,-8.2],[55.7,-5.3]]` — these are display-only bounds, not tessellation bounds).
  - Colour: only the visible subset (selected nation, or all if "All") is full-opacity; the rest are dimmed (the existing `dim` pattern, extended to dim by nation when a filter is active).
  - **Performance — concrete stance: ship all ~10k practice `CircleMarker`s.** Leaflet's `CircleMarker` (SVG path) handles 10k markers at acceptable cost on a static, non-dragging map; the existing code already renders 643 without issue, and 10k SVG circles in a single `<MapContainer>` is well within the "a few seconds to first paint, smooth pan" threshold. No downsample-on-zoom. (If first paint exceeds ~2 s on a mid-range laptop in the smoke test, add a `CircleMarker` → `canvas` renderer switch as a one-line change — flag it, don't pre-empt it.)
- **Legend** — **demoted to the Source & Method modal**. The modal gains a "colour legend" section that lists **the 20 original catchments only** (their name + hash colour), for continuity with the Lancs/South Cumbria map. The 300-entry map-wide legend is not rendered anywhere. The `Legend.tsx` component is repurposed: it renders the 20-entry list inside the modal, not as a side-card.
- **Methodology modal** — updated text: UK-wide data sources, the four register names, the practice-derived Voronoi rule (replacing the 20-outcode rule), the 1–2 h geocoding note, the Wales hospice placeholder (0 until CIW reply), and the 20-curated-provenance note.

## 6. Verification plan

- `npm run build` (tsc + vite) passes.
- **Data pipeline reproducible**: from committed `data-raw/` files, re-running `merge-hospices.mjs` + `build-data.mjs` produces byte-identical `public/data/*.json` (the hash colour is a pure function of `id`; no timestamps in output).
- **Dev-server smoke test** (assert in a script or by manual check, recorded in `.agents/qa.md`):
  - hospice count per nation rendered in the panel (EN ~178, SC/WALES/NI > 0, Wales possibly 0 — flagged).
  - practice partition complete: every practice has a `hospiceId` (the build logs `unassigned: 0`).
  - shops toggle still works (138 shops render; 13 `outsideCatchment` flags recomputed — the count may change from 13; the *mechanism* is asserted, not the exact number).
  - the 20 `curated` entries are present in `hospices.json` with `curated: true`.

## 7. Work list for the PM (feeds `.agents/requirements.md`)

| File | Action | Purpose |
|---|---|---|
| `scripts/extract-gp-practices.mjs` | modify | drop `TARGET_AREAS`; also emit `hospices-en.json` (name contains "hospice") |
| `scripts/extract-gp-practices-sc.mjs` | new | data.gov.uk Scotland GP GeoJSON → `gp-practices-sc.json` |
| `scripts/extract-gp-practices-wales.mjs` | new | DataMap.wales geonode → `gp-practices-wales.json` |
| `scripts/extract-gp-practices-ni.mjs` | new | normalise existing NI CSV → `gp-practices-ni.json` |
| `scripts/extract-hospices-sc.mjs` | new | CIS datastore CSV → `hospices-sc.json` |
| `scripts/extract-hospices-ni.mjs` | new | RQIA XLSX → `hospices-ni.json` (add `xlsx` dep) |
| `scripts/extract-hospices-wales.mjs` | new | CIW reply CSV → `hospices-wales.json` (0 until reply lands) |
| `scripts/merge-hospices.mjs` | new | four nation files → `hospices-all.json`; seed `curated`/`kind`/`source` from `catchment-map.mjs` for the 20 CQC-matched IDs |
| `scripts/build-data.mjs` | modify | UK-wide: read `hospices-all.json` + four practice files; UK Voronoi box; `hashToColor`; retire `catchment-map.mjs` import |
| `scripts/geocode-postcodes.mjs` | modify | widen to all four practice files + hospice units (reuses existing resumable logic) |
| `scripts/catchment-map.mjs` | keep (read-only) | source of `curated`/`kind`/`source` for the 20; no longer an assignment input |
| `src/lib/types.ts` | modify | add `nation`, `curated` to `Hospice`; `nation` to `Practice` and `Catchment` |
| `src/App.tsx` | modify | nation filter state; pass to panel + map; update header subtitle ("UK — catchments approximated…") |
| `src/components/HospicePanel.tsx` | modify | search-first + nation filter row |
| `src/components/MapView.tsx` | modify | nation-based `fitBounds`; nation-dim; 10k `CircleMarker` (no downsample) |
| `src/components/Legend.tsx` | modify | demoted to modal: renders 20-entry list inside `Methodology` |
| `src/components/Methodology.tsx` | modify | UK-wide text; 20-entry colour legend; Wales placeholder note |
| `data/README.md` | modify | new `data-raw/` files, fetch dates, CIW email request status, licence per source |
| `GLOSSARY.md` | keep + extend (already seeded) | final domain vocabulary; add the feature-specific terms this design introduces |
| `docs/adr/0001.md` … `0005.md` | new (this stage) | ADRs for the non-trivial decisions |
