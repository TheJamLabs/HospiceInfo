# Architecture — Cycle 2: landings, performance, identity, list, flows

**Scope:** Stage 2 (Architect), Cycle 2. **Reads:** `QWEN.md`, `.agents/research.md`, `.agents/pipeline.md`, `data/README.md`, `scripts/build-data.mjs`, `GLOSSARY.md` (finalised by this doc + ADRs 0010–0013).
**Data baseline @ HEAD 475675a:** 10,475 practices (en 9,260 / sc 911 / ni 304 / wales 0), 10,463 assigned, 12 unassigned (9 known BT postcodes), 155 hospices, 138 shops, 155 catchment cells.
**Binding decisions (James):** perf = profile-first, no new deps; landing = card on map (not a page); Wales hospices = documented pending gap (proceed); Scotland is DONE (do not re-derive); default sort = architect's call, ADR if non-trivial.

## 1. Nation data landings: verification gates + provenance pattern

Each nation landing is gated behind one verification gate; the gate passes only when all checks hold (offline where feasible; fetch steps are the documented human procedure in `data/README.md §Human fetch procedures`).

1. **Wales practices (B2)** — gate:
   - `data-raw/gp-practices-wales-{main,branch}-2026-10.{csv,geojson}` exist, non-empty, source URL + as-of date recorded in `data/README.md` (procedure 2; candidate portal `data.gov.wales`, DataMap moved off `data.wales`).
   - `node scripts/extract-gp-practices-wales.mjs` runs (ADR-0003 first-run header discovery; log header verbatim) and exits 0.
   - Full chain green: extract → `node scripts/geocode-postcodes.mjs` → `npm run build-data` (byte-identical ×2) → `node scripts/validate-tessellation.mjs` → `npm run build`.
   - Report shows `wales > 0` AND the placed Wales practices (lat/lon non-null); unplaced rows acceptable only from documented geocoding gaps; the 12-unassigned count is re-derived, not assumed.
2. **NI hospices (B3)** — gate:
   - `data-raw/rqia-regulated-services-2026-06.xlsx` from the **Public Regulation Authority** (RQIA's successor; `publicregulation.gov.uk` confirmed dead), exact download URL + as-of date recorded in `data/README.md` (procedure 1).
   - `node scripts/extract-hospices-ni.mjs` exits 0 (header discovery; exits 1 with the header on mismatch); `node scripts/merge-hospices.mjs` preserves its assertions (exactly 20 curated, unique ids, all 20 curated ids present).
   - Full chain green; report shows `ni hospices > 0`.
3. **Wales hospices — documented pending gap (proceed).** Blocked on the CIW data request (no bulk export; email drafted in `data/README.md`). Beyond B2/B3, no further nation landing is gated on this: the build is zero-set-tolerant (`[]` placeholder), the site renders the 155 non-Wales hospices, and `data/README.md` + the About/Methodology pages must state the gap. Acceptance: merge reports 0 Wales hospice rows; `npm run build-data` and `npm run build` exit 0; `grep -n "Care Inspectorate Wales" data/README.md` shows the pending data request.
4. **Provenance pattern (all landings).** Every landing appends one row to the `data/README.md` raw-inputs table (file, source, date, notes incl. exact URL + as-of date) and one note to `.agents/pipeline.md`; then re-runs the byte-identity ritual (`npm run build-data` ×2, SHA-256 compare). No landing is accepted without its provenance row.

Acceptance (§1): `npm run build-data` ×2 byte-identical; `node scripts/validate-tessellation.mjs` exit 0; `npm run build` exit 0; counts in `data/README.md §Current state` updated for each landed nation.

## 2. Map performance — profile-first, no new deps

### 2a. Baseline instrumentation (before any fix)
- Browser DevTools, **Slow 4G + 4× CPU throttle**; record under `.agents/qa.md §Baseline` with exact URLs, device preset, browser/build version.
- Metrics (QA protocol, fixed set):
  1. `interactive→first paint`: navigation start → map markers + panel first painted.
  2. Search re-filter: 5-char input → results reflected.
  3. Marker count at zoom 6 vs zoom 12 (Chrome DevTools performance panel).
  4. `navigation→interactive` (full page load to first usable interaction).
- The baseline table is the reference for every later claim. No fix ships without its metric delta vs baseline.

### 2b. Prioritized fixes
| # | Fix | Where |
|---|-----|-------|
| P1 | `hospiceId → Hospice` Map (one `useMemo`, O(1) lookup) replacing every per-marker `hospices.find(h => h.id === p.hospiceId)` | `src/components/MapView.tsx` (3 passes: catchments, practices, shops) |
| P2 | Grid-bucket clustering for low zoom (zoom < 11): `useMemo` over placed practices → `floor(lon/grid) × floor(lat/grid)` buckets → one `L.divIcon` aggregate per bucket with count; expand on click. No `leaflet.markercluster` dependency | `src/components/MapView.tsx` |
| P3 | Remove the per-practice `Tooltip` (10,475 DOM tooltips); keep the tooltip on click only (the practice click handler already has the data) | `src/components/MapView.tsx` |
| P4 | Debounce the search input 150–250 ms (`React.useRef` timer) | `src/components/HospicePanel.tsx` |
| P5 | Write `public/data/*.json` with 0-space indent (`JSON.stringify(x)` in `writeJson`, `scripts/build-data.mjs`); flip the cache-hash so the build is bumped; byte-identity ritual re-established | `scripts/build-data.mjs` |
| P6 | Share one `L.divIcon` instance per catchment colour (map of `h.color → icon`) instead of per-marker icon objects | `src/components/MapView.tsx` |
| P7 | Escalation note in `.agents/qa.md`: if > 2 s to interactive persists post-P1–P6, the decision path is Web Worker for the data + server-side pre-aggregation. Not in this cycle | |

**Mandatory:** P1. P2–P6 are sequenced by measured impact between baselines (profile-first: re-measure after each batch; stop a fix if it stops paying). **No new npm dependencies.**

### 2c. Downsampling (evidence-based, reversible)
- **Metric that justifies thinning:** `interactive→first paint` (2a m1) **after** P1–P6 still > 800 ms on the throttled profile. Below that threshold, no downsampling.
- **Mechanism when triggered:** zoom-dependent stride — below a zoom threshold show every `k`-th practice (k chosen so the painted marker count matches the zoom-12 density ceiling from 2a m3); at/above the threshold show the full set. No data is dropped from `practices.json`; thinning is a render-time `useMemo` filter keyed on `(zoom, k)`.
- **Reversibility:** the stride is a single named constant on the map component; resetting `k` to 1 (and `k=1` is the **default**) shows all 10,475. The chosen `k` and the metric that justified it are written into `data/README.md §Current state` provenance.
- **Default = keep all 10,475.** Downsampling ships only with its metric evidence recorded.

### 2d. Payload story for the two big JSONs
- `catchments.json` (6.79 MB) and `practices.json` (3.04 MB): **adopt P5 now** (0-space JSON; expected −30–40 % on both from indent waste alone). Always re-establish the byte-identity ritual after the change.
- **No pre-split.** A `practice-name + hospiceId` / coordinates split (P2b) stays **deferred**: revisit only if `interactive→first paint` is still > 2 s after P1–P6 at default (full) marker set. Do not split on speculation.
- Vertex simplification (Douglas–Peucker on catchment rings) is a data-quality decision (it moves boundaries), not a perf lever — out of scope.

Acceptance (§2): baseline table present in `.agents/qa.md`; P1 delta recorded; `npm run build` exit 0; `npm run check:layout` exit 0 (no new `flex-direction` in `src/styles.css`); data byte-identical ×2 (P5 re-baselined); `practices.json` / `catchments.json` sizes logged before/after P5.

## 3. Logo / favicon — heart + map-pin mark

One implementation file: `public/logo.svg` (viewBox `0 0 64 64`), referenced from `index.html` (`<link rel="icon" href="/logo.svg" type="image/svg+xml">` + `<link rel="manifest" href="/manifest.webmanifest">`) and `AppShell.tsx` header (`<img src="/logo.svg" width="24" height="24" alt="Hospice Info">`, reusing existing `d-flex` utilities — **no new `flex-direction`**).

**Geometry (single file, 3 subpaths, no text, no gradients):**
- Pin body: circular head centred at (32, 26), r = 18; stem tapers from (24, 30) down to a tip at (32, 54) closing to (40, 30), giving the classic pin silhouette. Fill = site accent `#1d4ed8` (already defined in `src/styles.css` — reuse that value, no new palette).
- Head: white circle at (32, 26), r = 12 (`#ffffff`).
- Heart: centred in the head, bounding box ≈ 14×14 px, two lobes via two mirrored cubic arcs meeting at a bottom point near (32, 31); fill `#1d4ed8`. Heart path uses the canonical two-cubic heart form so it reads at 24 px.

`public/manifest.webmanifest` (create; minimal, no service-worker field):
```json
{"name":"Hospice Catchment Map","short_name":"Hospice Map","start_url":"./","display":"standalone","background_color":"#ffffff","theme_color":"#1d4ed8","icons":[{"src":"/logo.svg","sizes":"any","type":"image/svg+xml"}]}
```

Acceptance (§3): `node scripts/check-map-layout.mjs` passes (no new `flex-direction`); `npm run build` exit 0; opening `dist/index.html` (via `npm run preview`) shows the pin + heart favicon in the tab and the 24 px mark in the header; `manifest.webmanifest` parses as JSON (spot check with `node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'))"`).

## 4. List ordering / filtering

Current: nation filter + name/town substring search, hospices rendered **unsorted**.

- **Default sort (justified, ADR-0011): hospice name A→Z, case-insensitive** (`String.localeCompare`, no custom collation). Rationale: (1) matches the existing search's lexical model — a user who types "m" expects near-"m" rows; (2) identical behaviour whether the nation filter is ON or OFF, so there is no leading-visible reorder when toggling filters; (3) stable and deterministic across sessions. Nation-based sort was rejected: it mixes four nation groups of very different sizes and re-orders every row on filter toggle; practice-count sort was rejected as a *default* because it is a secondary view (kept as a select option).
- **Sort options (select, one control, default = name A→Z):**
  1. Name A→Z (default)
  2. Name Z→A
  3. Practice count, high → low (i.e. biggest catchment first)
- **Filter set beyond the existing nation + name/town search:**
  - **One added toggle: "Has published service area"** — `kind === 'published'` (the 20 curated catchments). Off by default. The `approx` rows stay visible unless the toggle is on. No other new filters (provenance/source, website presence, unplaced) are exposed — they are curation state, hidden per the hide-not-delete rule.
- **Where:** `src/components/HospicePanel.tsx` — the sort select sits next to the existing nation filter; the toggle sits under the search input. No change to `useAppData`.

Acceptance (§4): `npm run build` exit 0; `npm run check:layout` exit 0 (no new `flex-direction`); the panel header shows the sort select and the toggle; default listing is A→Z (spot-check two known hospices, e.g. "Hospice at Home Carlisle" vs "Hull & East Yorks"); the `kind === 'published'` toggle narrows to the 20 curated rows; the byte-identity ritual passes.

## 5. User flows — start-here card

A **landing card** (not a dedicated page): a Bootstrap card anchored **top-left of the map viewport** in the map view (absolutely positioned `position: absolute; top: 12px; left: 36px; z-index: 1000` — above the Leaflet map pane, below the zoom controls; `position: absolute` introduces no new `flex-direction`, so G6 holds). Dismissible (×), re-openable via a "Start here" pill in the panel header while dismissed.

**Main flow (postcode → practice → catchment → hospice):**
- The card body is one `form` with a `<label>`-attached postcode input (`inputmode="text"`, 5–7 char UK postcode) + a "Find your hospice" submit button (≥ 44 px touch target).
- On submit: look up the practice by normalized postcode in `useAppData.practices`.
  - **Found (practice → catchment → hospice):** show a 3-line result — "Your practice: **{p.name}, {p.town/pc}**" → "Catchment: **{hospice.name}, {hospice.town}**" → an "Open in panel" button that sets the panel to that hospice (reusing the existing selection state). Catchment is the assigned hospice's cell — no separate catchment object is shown (the assigned hospice *is* the catchment under ADR-0005's single-nearest rule).
  - **Not-found (neutral wording, hide-not-delete):** a single neutral line — "No practice at that postcode. It may be outside the mapped area or a new registration. You can [search the list] or [let us know](mailto:{feedbackMailto})." **Never** the wording "unassigned", "no catchment match", "data gap", or any internal flag. The mailto reuses `src/lib/feedback.ts` (`feedbackMailto`), not a new link.
- No network call in the card — everything is from `useAppData` (offline-safe after load).

**Persona sections (three collapsible rows in the card body, each ~1–2 lines + one action):**
- **Patient / carer** — the main flow: "Find the hospice that covers your postcode".
- **Fundraiser / charity shop** — "Find your shop and its hospice's area"; action = a button that sets the panel search to the user's shop name (reuses the existing panel search state); shops render with normal catchment colour (the `outsideCatchment` flag stays hidden, per the existing rule).
- **Clinician / referral** — "See which catchments a postcode falls in and its assigned hospice"; action = same as patient (the assigned hospice is the referral answer); plus one line: "For real referral decisions, confirm with the hospice — the line here is an approximation".

**Implementation:** one new component `src/components/StartHere.tsx` (presentational; takes `practices`, `hospices`, `onOpenHospice`, `onOpenShopSearch` from the parent map view). No new route, no new page file, no new dependency. `AppShell` header unchanged except the §3 logo.

Acceptance (§5): `npm run build` exit 0; `npm run check:layout` exit 0; with an assigned postcode (pick any from `practices.json`, e.g. an LS8/MD-class unit) the 3-line result + "Open in panel" appear and the panel opens on that hospice; with an absent postcode the neutral line appears (grep the card source for "no catchment match", "unassigned", "data gap" — must be absent); dismissing and re-opening the card works; `npm run build-data` ×2 byte-identical (card changes no data).

## ADRs raised by this cycle

| ADR | Title | Non-trivial? |
|-----|-------|--------------|
| 0010 | Map performance strategy (profile-first, P1–P6, no new deps, no downsampling by default) | yes |
| 0011 | Default list ordering (name A→Z, case-insensitive) and filter set | yes |
| 0012 | Start-here landing card on map + neutral not-found wording | yes |
| 0013 | Nation data landing verification gates + provenance pattern | yes |

Logo = no ADR (single-file asset, no design trade-off beyond §3's geometry).
