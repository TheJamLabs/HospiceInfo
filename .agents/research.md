# Research — Cycle 2 (2026-10-24): nation data, map performance, logo/favicon, list ordering, "start here" flow

> **STALENESS NOTICE (2026-10-25, lead):** recon is partially reconciled. §0/§1/§1.2/§1.3 are CANONICAL and current. All other sections contain ~22 stale anchors/counts superseded by **Table A** in `.agents/pipeline.md` (current verified values @ HEAD `475675a`). Trust Table A over any conflicting statement in this file.

Updated 2026-10-24 (post-Scotland-landing reconciliation, commit `475675a`)

**Stage:** 1/10 (Research) of the multi-agent pipeline, `HospiceInfo`
**Companion ledger:** `.agents/pipeline.md` (owned by the lead; updated per stage)
**Supersedes:** the 2026-10-21 "Make the map public-ready" research (this file is overwritten; that cycle's findings were fully consumed — Cycle 1 completed 2026-10-23, see its stage artifacts, `docs/adr/`, and Hindsight pages).
**Mode:** READ-ONLY pass. The only file written is this artifact. Everything below is grounded in this session's direct reads/greps of the tree; network-bound facts are marked **operator action** (human gate).

James (operator) flagged five pre-launch items:

1. **Nation data** — three sources: (a) PRA XLSX for Northern Ireland hospices (PRA is the successor to the defunct RQIA); (b) data.gov.wales (OGL v3.0) for Welsh GP practices; (c) NHS Scotland GP practice data. Scotland has **landed** (F2, `475675a`, derived names — §1.2/§8); (a) and (b) are the only remaining human-gate downloads (§6 H1).
2. **Map performance** — "the map is currently quite heavy, need to think how this can be made lighter."
3. **Logo / favicon.**
4. **Hospice list ordering/filtering** — "not sure what the purpose of the current list display on screen 2 is. Should the hospice list be in A–Z order, alphabetical in name or town, or a filter to pick A–Z."
5. **A "start here" user flow** — an `gc0 3xx`-style "where do I belong / where does my GP practice belong" entry point at the top-left of the map screen.

---

## 0. Verified baseline (re-read 2026-10-24, post-Scotland landing)

- `HEAD 475675a`, working tree clean — the Scotland landing (F2) has been committed and landed.
- Exactly **5 published data files** in `public/data/`: `hospices.json`, `practices.json`, `catchments.json`, `shops.json`, `corrections.json` — nothing else in `public/` (no `*-global` variants, no staged `charity-shops-BUILD.json`, no `*.pre-prepublish-backup` stamps, no image assets, and **no `manifest.webmanifest` at all** — item 3 → §3.3 *creates* it).
- Repo-root `scripts/` layout (39 `.mjs` scripts): `build-data.mjs`, `validate-tessellation.mjs`, `check-map-layout.mjs`, `merge-hospices.mjs`, `geocode-postcodes.mjs`, plus the extract scripts (e.g. `extract-gp-practices-sc.mjs`); the old `data-raw/` scripts directory no longer exists.
- Build is green at `475675a` via the byte-identity ritual (`node scripts/build-data.mjs` → `node scripts/validate-tessellation.mjs` → `npm run build`, per `data/README.md`); the Cycle-1 shell brotli figures (app shell 137,624 B → 14,438 B) carry over, while the data payload now ships as the 5 flat files above (sizes re-measured by QA at its stage).
- `index.html` (14 lines): title `UK Hospice Catchment Map`, meta description, `#root` + `/src/main.tsx`; **no favicon link of any kind**; **no `manifest.webmanifest` file exists in `public/` at all** (item 3 → §3.3 creates it).
- The old `practices-NOMINATIM/` resolver history is gone; geocode state now lives in `data-raw/postcode-geo.csv` (9,093/9,102 after 3 passes; 2026-10-24 pass: 729 Scottish + 6 district-fallback + 0 throttled), as recorded by `data/README.md`.
- Prior-cycle human gates still open (carried forward, not re-opened here): **G5 mobile-viewport human pass**, **G7 Overpass charity-shop refresh confirmation** (from the `pre-publish-gates` checklist; Overpass refresh itself landed in Cycle 1 — the gate is the human *confirmation* of freshness).

---

## 1. Item 1 — Nation data (three sources)

### 1.1 (a) Northern Ireland hospices — PRA XLSX (file ABSENT)

- **Expected file:** `data-raw/pra-regulated-services-2026-06.xlsx`. Not on disk (verified).
- **Source:** PRA (the Public Regulation Authority — **successor to the defunct RQIA**) regulated-services register XLSX. The legacy cycle-1 workbook URL (`www.rqia.org.uk`) is **dead and is not the source**; the exact current PRA register location is *not on disk* and must be confirmed by the operator at pull time (see the §9 endnote "unreconcilable citations"). The register includes all regulated services (residential homes, care agencies, **hospices**); the extract must filter to hospice services (name contains "hospice").
- **Pipeline (wired to existing patterns):** operator drops the XLSX into `data-raw/` → script already present at `scripts/extract-hospices-ni.mjs` (run as `node scripts/extract-hospices-ni.mjs`), workbook-utils class like the other extracts (dry-run capable) → reads the Services sheet, builds rows `{id: slug(name), name, addr, town, post, kind: 'approx', source: 'PRA', curated: false}` (per the `merge-hospices.mjs:47-62` register convention: `kind: 'approx'`, `curated: false` until a catchment mapping exists), writes `data-raw/hospices-NI.json`.
- **Downstream chain (already exists):** `node scripts/geocode-postcodes.mjs` (Nominatim, 1 req/s, resumable) → `node scripts/merge-hospices.mjs` (folds NI into GB register) → `npm run build-data` (tessellation, ADR-0005 nearest-hospice decision) → `node scripts/validate-tessellation.mjs` → `npm run build`.
- **Scale:** National Statistics 2023 records **24 registered hospices** in NI (count varies by register vintage; the PRA workbook is authoritative this cycle). Expect a small add (estimate 15–30 new hospice rows). Note: NI GP *practices* are **already in the dataset** (304 of the 10,475, via the cycle-1 OSM extract) — the open NI gap is *hospices*, not practices.
- **Byte-identity:** any data change invalidates the QA-recorded content hashes — the full byte-identity ritual must re-run end-to-end and hashes refresh in QA.
- **Attribution:** PRA is an NI public-regulation body; candidate attribution text "PRA regulated services register, retrieved 2026-10-24" for `latest-attribution.json` (final wording is Documentation stage).
- **Human gate H1: operator downloads the PRA XLSX; agent provides the exact script. (The Scotland half of this gate is closed — F2 landed in `475675a`; see §6 H1.)**

### 1.2 (c) NHS Scotland — `gp_practices-is` (landed 2026-10-24 via F2: derived names)

**Source file: `data-raw/gp-practices-scotland-2026-10.geojson` (338,243 B, tracked; single-extension name, landed in `475675a`):**

- Valid GeoJSON `FeatureCollection`, **911 Point features**, properties: `prac_code`, `uprn`, `address`, `postcode`, `local_authority`, `la_s_code`. **No practice-name field.**
- The extraction script `scripts/extract-gp-practices-sc.mjs` (run as `node scripts/extract-gp-practices-sc.mjs`) reads `properties` through a fallback key chain; no name key matched, so names were **derived from the address** (F2, resolved at Gate H1b): first line of the address keyed by `prac_code`, with blank/ambiguous entries flagged into a curation list for James — the group-building ambiguity (many practices at one address) was worked through during that curation.

**Fix path (Gate H1b) — RESOLVED: F2.** The named-register option (F1: re-pull the **named** `gp_practices` register from the NHS Scotland data portal / data.shs, the `…-is` "information summary" extract being nameless by design) was not taken; the file was renamed to the single-extension name and the script adjusted to derive **curated names** from `address` (first line, keyed by `prac_code`), flagging blank/ambiguous names into a curation list for James (precedent: `SLUG_TO_ID`-style curated overrides at `scripts/build-data.mjs:30-33`). The dedup-ambiguity risk for group buildings was accepted during curation.

**Geocoding — COMPLETE:** all 911 Scotland postcodes resolved. `data-raw/postcode-geo.csv` now holds **9,093 of the 9,102 in-scope postcodes** (GB + Scotland); the Scotland third pass (2026-10-24) added 729 new + 6 district-fallback. Failures still surface per-postcode; the remaining unresolved postcodes include the known OSM/Overpass BT source gap (12 practices land unassigned — see §6).

**Downstream (ran at landing):** `scripts/extract-gp-practices-sc.mjs` → `practices-scotland-2026-10.json` → `npm run build-data` (data-land protocol: two byte-identical runs) → `node scripts/validate-tessellation.mjs` (100.00% — 10,463 of 10,475 assigned) → `npm run build`; provenance in `data/README.md`. QA hashes refresh at landing.

### 1.3 (b) Wales GP practices — data.gov.wales OGL (files ABSENT)

- **Expected files:** `data-raw/gp-practices-wales-main-2026-10.csv` (or `.geojson`) and `data-raw/gp-practices-wales-branch-2026-10.csv` (or `.geojson`). Not on disk (verified).
- **Source:** data.gov.wales 'GP Locations' datanodes, licensed **OGL v3.0**. The **exact data.gov.wales node names are unverified** — the cycle-1 `data.wales` portal is now a holding page; the carried-over names `geonode:gpmainsites_ogl` / `geonode:gpbranchsites_ogl` must be confirmed by the operator at pull time (see the §9 endnote "unreconcilable citations"). Export path: node page → CSV/GeoJSON download (operator, browser).
- **Script ready:** `scripts/extract-gp-practices-wales.mjs` (run as `node scripts/extract-gp-practices-wales.mjs`) already implements the dual-reader: GeoJSON → features; CSV → rows; name keys tried in order (`property name`, `Practice Name`, `NAME`, …), so it copes with data.gov.wales column naming as-is.
- **Scope (pre-existing decision, not re-litigated):** **main sites** get `hospiceId` + catchment; **branch sites** are ingested as `kind: "branch"` informational markers — listed/searchable but with *no* catchment assignment (no fabricated data; consistent with the hide-not-delete public rule).
- **Naming gap (documented, risk-accepted per operator):** data.gov.wales main-site names are often bare property names (e.g. "Ysbyty Glanavon") lacking a "GP Practice" suffix. James's Cycle-2 decision: **proceed without curation**; `Methodology.tsx` already discloses name provenance, and the new list UI (item 4, town search/sort) lets users compensate.
- **Geocoding load:** est. 300–500 new Welsh postcodes → a few minutes at 1 req/s (operator run, same script, resumable).
- **Attribution:** OGL v3.0 → "Contains public sector information licensed under the Open Government Licence v3.0." (wording finalised by Documentation).

### 1.4 Cross-cutting data notes

- **Coverage asymmetry:** after this cycle the UK map has *hospice* presence for England (152) and Scotland (3) — **155 total**; **Wales has no hospices in the dataset — its source is a data request currently pending, and this cycle PROCEEDS with Wales hospices as a documented gap** (operator decision; Methodology must state it). *Practice* presence: England (9,260), Scotland (911, landed), NI (304, cycle-1 OSM extract) — **Wales practices are the remaining source gap** (§1.3). Until §1.1 lands, NI shows *practices without hospice anchors*; `validate:tessellation` must not fail on that (it is a data-coverage choice, not a defect); Methodology notes it. Flagged so QA doesn't treat it as a regression.
- **Licence boundary (per ODbL/OGL rule, unchanged):** ODbL → OSM-derived land boundary + charity shops; OGL → Wales (data.gov.wales) and NI (PRA is public-sector/NI, wording to be confirmed by Documentation); Scotland's licence to be **confirmed on the portal page by Documentation** (NHS Scotland data is typically OGL — flag, do not assume).
- **No blocking findings:** all three sources are operator-downloadable and match existing script patterns. Real risks: (i) Scotland name quality (F2 derived names — landed, curation list with James); (ii) Wales Nominatim runtime (operator time, not agent time); (iii) Wales naming curation (risk-accepted).

---

## 2. Item 2 — Map performance ("quite heavy")

### 2.1 Verified cost model

Layer inventory on the single `MapContainer` (`src/components/MapView.tsx`):

| Layer | Count | Rendered as |
|---|---|---|
| GP practice markers | **10,475** (≈10,463 placed) | `<CircleMarker pathOptions={…}>` — **canvas** rendering (`MapContainer` has `preferCanvas={true}`) + per-practice `<Tooltip>` |
| Hospice markers | **155** | `<Marker icon={divIcon}>` + per-marker `<Popup>` (P3-relevant: the divIcon set is small, 155 + 138) |
| Charity-shop markers | **138** | `<Marker icon={divIcon}>` + `<Tooltip>` |
| Catchment polygons | **155** (hulls, `catchments.json` 6.79 MB — largest published asset) | `<Polygon>` |

≈ **10,768 interactive layer objects** + 155 polygons, at every zoom, with no clustering/LOD/culling.

Hot spots confirmed by source read:

1. **O(n²) ×3 per data/keystroke change.** `hospices.find((h) => h.id === …)` — the join on `hospiceId` — runs separately in three passes in `src/components/MapView.tsx`: the catchment colour pass, the `visiblePractices` pass, and the `visibleShops` pass. 10,475 × 155 ≈ **1.62M linear scans per pass → ~4.9M per interaction**, on the main thread, per keystroke (search is *not* debounced: the query maps straight into the `visiblePractices`/`visibleShops` filter passes — no memo). **This is the single largest CPU cost.**
2. **Per-marker `<Tooltip>`** on all 10,475 practice markers → 10,475 `L.Tooltip` instances attached (DOM/JS object count is real even if only visible on hover).
3. **No clustering / LOD / viewport culling** — at zoom 6 (whole UK) ~10,450 tiny canvas dots overlap into noise and full paint cost.
4. **Payload:** `public/data/practices.json` 3.04 MB, 2-space-indented (145,067 lines; JSON whitespace ≈ 1 MB+ of the 10,475 objects). Minifying to 0-space in `scripts/build-data.mjs`'s `writeJson` is a free ~10–15 % size win (build-time, hash-refresh required).
5. **Transfer:** Cloudflare Pages minifies and platform-compresses; JSON compresses ~5–7× → `practices.json` ≈ 400–600 KB even compressed — still the dominant fetch. App shell is already tiny (14.4 KB B2 verified).

### 2.2 Options (ranked impact/effort; none need a framework change)

- **P1 — Index the lookups (cheap, biggest CPU win, zero visual change).** Build `const byHospiceId = new Map(hospices.map(h => [h.id, h]))` once per data load; replace the three `hospiceId` `.find` passes. O(1) lookups kill the ~4.9M linear scans per interaction. Pure data-structure fix; no dependency; preserves hide-not-delete (no records touched).
- **P2 — Grid/bucket clustering at low zoom (medium effort, biggest visual win).** Below zoom ≈ 11: render one aggregate marker per visible grid cell (dependency-free: a ~40-line lat/lon cell-keyed `useMemo` over the visible set, using existing `lat/lon` — no `leaflet.markercluster` dep, ~30 KB and an extra render pass, rejected to keep the bundle flat). ≥ 11: individual markers as today. Turns "~10,450 markers at zoom 6" into "a few dozen buckets". Matches the user expectation set by Google/OSM.
- **P3 — Remove per-marker `<Tooltip>` from practices (cheap, moderate win).** Practitioners' names are already delivered by search results; move the practice detail to the existing panel (the `HospicePanel` pattern). Hospices keep their popups (only 155). Removes 10,475 tooltip objects from the tree.
- **P4 — Debounce search (cheap, small–medium win).** 150–250 ms debounce on `query` before recomputing `visiblePractices`/`visibleShops`. Zero dependency; pairs with P1.
- **P5 — 0-space JSON in `writeJson` (cheap, transfer-only win).** ~10–15 % raw cut on `practices.json` (3.04 MB) + the shops file. Requires byte-identity re-run; QA hash refresh.
- **P6 — Shared `L.divIcon` set (cheap, small win).** Currently a unique icon HTML string per practice; after P3 moves the name out of the icon, ~10,450 unique strings collapse to a handful of (kind × state) shared icons — less string build and per-marker DOM churn.
- **P7 — `preferCanvas: true` (already set on `MapContainer`; escalation/cleanup note).** canvas renders ~10.5k markers fast but kills per-marker DOM hover — **P3 is a precondition for keeping it**. Revisit only if P1–P6 prove insufficient.
- **P2b — Split payload by nation/viewport (large; DEFERRED).** `practices-{nation}.json` conditional fetches would cut initial parse, but complicate cross-UK search (needs a name index), the hash manifest, and QA story. Only revisit if post-P1–P6 profiling still shows > 2 s to interactive on mid-range hardware.

**Recommended set for this cycle: P1 + P2 + P3 + P4 + P5 + P6** (P7 documented escalation; P2b deferred). All dependency-free; all preserve `build-data`/`validate`/hide-not-delete semantics.

### 2.3 Measurements for QA (before/after; devtools Slow 4G + CPU 4× throttle)

1. Interactive → first map paint (P2/P3 win).
2. 5-character search → map re-filter (P1+P4 win, expect the largest delta).
3. `document.querySelectorAll('.leaflet-marker-icon').length` at zoom 6 vs 12 (expect bucketed at 6, individual at 12).
4. navigation → `interactive` (expect sub-3 s with P5; `475675a` before-baseline for QA).

---

## 3. Item 3 — Logo + favicon

### 3.1 Verified state

- `index.html`: **no favicon of any kind** (no `/favicon.ico`, no `rel=icon` PNG, no apple-touch-icon). **No `manifest.webmanifest` file exists in `public/` at all** (item 3 → §3.3 *creates* it, including the `icons` array). Browsers 404 on `/favicon.ico` → effectively no site icon today.
- `src/components/AppShell.tsx` (header ≈ `L27–L49`): header is text-only — `<h1>Hospice Catchment Map</h1>` + `<div className="text-muted small">` subtitle. No `<img>`/SVG/logo anywhere in `src/`; no logo classes in `src/styles.css` (grep-verified); no image assets and no manifest in `public/` (only the five `data/*.json` files).
- **G6 constraint (Cycle 1, standing):** `check-map-layout.mjs` fails on any new `flex-direction` declaration in `styles.css`. New logo CSS **must not add `flex-direction`** — use inline rendering (`<img>`/`<svg>` inside the existing `<h1>`, `margin`/`gap`/`vertical-align`).

### 3.2 Asset set (constraints; exact art is James's creative call)

| File | Size | Purpose |
|---|---|---|
| `public/favicon.ico` | 16/32/48 inside | Legacy + Windows taskbar |
| `public/icons/icon-192.png` | 192×192 | PWA install (Android) |
| `public/icons/icon-512.png` | 512×512 | PWA install (hi-dpi) |
| `public/icons/icon-maskable-512.png` | 512×512, content inside central ≈400 px safe zone | PWA masked shapes |
| `public/icons/apple-touch-icon.png` | 180×180, solid background (iOS rounds) | Safari/iOS home screen |
| `src/assets/logo.svg` | vector | In-app header logo (crisp at all DPIs) |

One mark, one source (SVG); PNGs derived from it. Suggested mark: a location pin containing a cross/heart, using the app's two existing accent colours from `styles.css` (palette reuse, no new colour system). Hand-authored 2-colour SVG keeps it dependency-free and byte-predictable.

### 3.3 Code surface (for Architect)

1. `index.html` head: `rel=icon` lines (ico + 192 + 512), `rel=apple-touch-icon`, plus a `rel=manifest` link (verify against the current head at implementation time — the manifest file does not exist yet).
2. **Create `public/manifest.webmanifest`** (the file does not exist): name/start_url/display plus an `"icons"` array incl. a `purpose: "maskable"` entry.
3. `AppShell.tsx`: `<img class="app-logo" src={logoUrl} alt="">` inside the existing `<h1>` before the text (decorative → empty `alt`; name stays in `<h1>` for a11y).
4. `styles.css`: `.app-logo { width: 28px; height: 28px; margin-right: 8px; vertical-align: middle; }` — **no `flex-direction`** (G6).
5. **Byte-identity:** logo assets are new non-data files; they do *not* enter the data hash chain (hashes cover `data/*.json` only). `npm run build` picks them up automatically; no `validate` change.

---

## 4. Item 4 — Hospice list ordering / filtering

### 4.1 Verified state (`src/components/HospicePanel.tsx`, 103 lines)

- `list = hospices.filter(...)`: filters `hospices` by `nation` + `q` substring on **name/town only** — a **plain non-memoized filter, rebuilt per keystroke** (155 rows — cost is trivial; the heavy list-side work is in `MapView`). **Order is raw `build-data` output order (≈ nation/OSM SU order), not alphabetical.**
- Per-hospice practice counts: a `counts` memo reads `practiceCount` from `catchments.json` — no practice scan (the old per-practice linear-scan claim no longer holds).
- Nation `btn-group` (All/ENG/SCO/WAL/NI) → `nationFilter`.
- `form-control-sm` search input.
- Clickable `panel-item` rows (name + kind + practice count); **no sort control**. A count line ("…{list.length} of {hospices.length} hospices" / "{totalShown} practices") and an empty state already exist.

This is exactly what James flagged: no A–Z, no field choice, no visible purpose.

### 4.2 Proposed UX (for Architect)

- **Default sort: name A–Z** (`localeCompare` `en-GB`) — least-surprising default, matches "A–Z in name".
- **Sort select:** `form-select form-select-sm` with four options — **Name A–Z** (default) / Name Z–A / Town A–Z / Town Z–A. Covers both fields and both directions James offered.
- **Compose cleanly:** nation `btn-group` (region) → search (filter) → sort (order) — the existing controls stay; only the sort control is added (count line and empty state already exist).
- **Count line (already present):** "{list.length} of {hospices.length} hospices" / "{totalShown} practices" above the list — live-filtered orientation already covered; keep as spec.
- **Empty state (already present):** no-match row instead of silent blank — keep as spec.
- **Implementation surface:** `HospicePanel.tsx` only — new `sortKey` state + sort `useMemo` + `<select>` (count line and empty row already exist). No data change, no `build-data` impact, no new dependency, a11y via plain `<select>` (label it).

---

## 5. Item 5 — "Start here" user flow (postcode → practice → hospice)

### 5.1 Concept (James's spec)

A "Where do I belong?" card at the **top-left of the map screen (screen 2)**: user types a postcode (e.g. `GC0 3XX`) → the app answers in plain language: "You're in the catchment of **X Hospice**", with an action to highlight that catchment on the map / open the hospice's info. This is the 10-second entry answer for a stressed patient/relative — the **primary CTA of the site**.

### 5.2 Data feasibility (verified — no new data, no geocoding, no API)

- `public/data/practices.json` carries **`postcode`** per practice (~10,475 rows) → postcode → practice is a direct in-memory string join (normalised form). The Nominatim geocoding (`node scripts/geocode-postcodes.mjs`) was for *placing* practices; this flow is the reverse and is already in the data.
- `practices.json` carries **`hospiceId`** per practice → practice → catchment hospice is a direct join.
- `hospices.json` carries name/town/etc. → display is direct.
- **Edge cases (all data-present, must be handled explicitly):**
  1. **Postcode valid-UK but not in dataset** (rural/no-practice-data): "We don't have a GP practice for that postcode" + point at the existing town search. No invented answer.
  2. **Multiple practices, one postcode** (group buildings): list each, user picks; each carries its own `hospiceId`.
  3. **Practice with `hospiceId === null`** (the 12 unassigned — all on 9 BT postcodes that no geocoder resolves; plus any future fallback rows): "Your practice isn't assigned to a catchment in our data yet" — honest, no fabrication.
  4. **Not-UK / malformed postcode:** the existing postcode utilities already validate; "That doesn't look like a UK postcode."
- **`public/geocoord/`** is not a path in the post-Scotland tree; the flow needs no geocoding artefacts at all (direct join). Retention question → DevOps.

### 5.3 UI surface (verified)

- The map screen renders `<MapView>` (`src/components/MapView.tsx`); top-left is occupied by the Leaflet `ZoomControl` (`MapContainer` has `zoomControl={true}`) → move zoom to `bottomleft` (existing `<ZoomControl position>` prop, no new CSS) and place the card at top-left.
- Card = Bootstrap `.card`: label, `form-control` postcode input, "Find" button, answer area with the hospice name + a "Show catchment" action (reuses the existing hospice-select/pan code path).
- **Personas (from James):** (1) patient/family — one input, one named answer, 10 seconds; (2) fundraiser — which hospice does my area support; (3) clinician — catchment hospice name for referral, plus the kind=curated vs approximated distinction trust signal (ADR-0005 transparency applies: if the matching practice's assignment came from nearest-hospice fallback, say so in a line).
- **Implementation surface:** a new card component inside `MapView.tsx` (or a small sibling component) — `useState` + `useMemo` over already-loaded `practices`/`hospices`. **No new dependencies, no backend, no persistence of the typed postcode** (privacy-positive: nothing stored, nothing sent).
- **Interaction with hide-not-delete:** if the matched practice is a `hidden` record in the public views, the card may still use it (it is a data join, not a list render), but the answer must not leak any "hidden" status — public-safe wording only (ADR-0004).

---

## 6. Cross-cutting risks & human gates

### Risks

- **R1 Byte-identity churn:** items 1 (the two remaining nation sources: NI hospices + Wales practices — Scotland already landed in `475675a`) and 2 (P5) change data files / hash surface → full re-run of the build-data → validate → build chain, QA hash refresh, and a re-run of the `pre-publish-gates` checklist. This is the dominant cost of the cycle and is concentrated in QA/DevOps.
- **R2 Coverage asymmetry:** NI practices (304) exist with no hospice-side anchor / no catchment structure until §1.1 lands; Wales has no hospices at all (data request pending — documented gap, §1.4) — Methodology must state both; QA must not flag them as regressions.
- **R3 Nominatim availability:** Wales run is a few min at 1 req/s (Scotland run already complete: 9,093 of 9,102 in-scope postcodes in `data-raw/postcode-geo.csv`); 429s are handled by the script's resume, but a bad network day blocks the geocode step (operator time).
- **R4 Scotland name quality (F2 — landed):** the derived names can be ambiguous/duplicated → curation list with James (risk-accepted); the F1 option is moot now the register has landed.
- **R5 Performance changes must preserve:** hide-not-delete public rule, DisagreeLink/feedback paths, ADR-0005 fallback transparency, and the existing `validate` gates. P1–P6 are designed not to touch any of these; QA verifies explicitly.
- **R6 G6 trap:** any new CSS for logo/flow must avoid `flex-direction` (check-map-layout.mjs fails otherwise).
- **R7 Host compression assumption:** "Pages compresses JSON 5–7×" is inferred from the verified brotli numbers on other assets, not measured on the final host — QA measures transfer directly (2.3 item 4).
- **R8 Staged `charity-shops-BUILD.json`:** RESOLVED — shops landed as `public/data/shops.json` (45,209 B, ~138 shops; 21 outside catchment); no staged baseline remains.

### Human gates (operator: James)

- **H1 — Downloads (only two pulls remain open):** PRA regulated-services XLSX (NI hospices — exact current register location unverified, confirmed by the operator at pull time; the dead `www.rqia.org.uk` RQIA workbook is **not** the source) → `data-raw/`; Wales main → `data-raw/gp-practices-wales-main-2026-10.csv` (or geojson); Wales branch → `data-raw/gp-practices-wales-branch-2026-10.csv` (or geojson, via data.gov.wales — exact node names unverified). **Scotland — RESOLVED:** landed as F2 (derived names) in `475675a`; tracked as `data-raw/gp-practices-scotland-2026-10.geojson` (single-extension name).
- **H2 — Nominatim runs:** operator runs `node scripts/geocode-postcodes.mjs` (Scotland — complete: 9,093 of 9,102 in-scope postcodes held; Wales — the remaining run, a few min) from a networked machine; the script is resumable and exits non-zero if incomplete — do not force-complete.
- **H3 (carried from Cycle 1): G5 mobile-viewport pass + G7 Overpass freshness confirmation** — re-run at final QA.
- **H4 (new): logo art** — James supplies/approves the mark (or approves the suggested pin-cross spec in §3.2); agents build the file set from it.

---

## 7. Glossary candidates (for the Architect to finalise in GLOSSARY.md)

`catchment`, `tessellation`, `curated (kind)`, `kind: approx`, `hide-not-delete`, `outcode fallback`, `LOD / level-of-detail`, `bucket marker`, `byte-identity ritual`, `named register` (vs `information summary` extracts), `OSM SU`, `OWM` (Official Welsh Map).

---

## 8. What the Architect must decide (pointer, not a decision here)

1. **Scotland register (RESOLVED)** — F2 landed in `475675a` (derived names); curation list with James (risk-accepted).
2. **P2 clustering zoom threshold** — proposed 11; verify against real map feel during implement (QA task).
3. **P3 detail presentation** — practice detail in the existing bottom interaction bar vs an on-click popup (bar preferred: zero new DOM churn).
4. **"Start here" card placement** — zoom control to `bottomleft`, card top-left (proposed); confirm no collision at small widths (G5 covers this).
5. **Sort-control field set** — Name/Town × A–Z/Z–A (proposed); confirm no third field is wanted (postcode rejected — not meaningful to users).
6. **NI coverage note placement** — Methodology + list-screen footnote (proposed).

---

## 9. Completion note

Read-only pass complete. The only file written is this artifact (`.agents/research.md`). No blocking findings: all five items are implementable with existing patterns, operator downloads, and zero new runtime dependencies.

Risks are recorded; gates H1–H4 are queued for the operator. Next stage: **Architect** (`.agents/architecture.md`).

### Unreconcilable citations (carried forward, not invented)

Two citations cannot be reconciled from the tree and are deliberately left to operator action:

1. **The exact PRA register download location** — the PRA (Public Regulation Authority, successor to the defunct RQIA) hosts the NI regulated-services register; the legacy `www.rqia.org.uk` XLSX is dead and is not the source. The current PRA register URL/XLSX location must be confirmed by the operator at pull time (§1.1, §6 H1).
2. **The exact data.gov.wales datanode names** — cycle 1 named the `data.wales` (now a holding page) 'GP Locations' OGL v3.0 datanodes `geonode:gpmainsites_ogl` / `geonode:gpbranchsites_ogl`; the equivalent node names on data.gov.wales are unverified and must be confirmed by the operator at pull time (§1.3, §6 H1).
