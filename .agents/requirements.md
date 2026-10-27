# Requirements (Cycle 2) — 2026-10-26

Stage 4 work list for the Coding stage. Scope source: `.agents/architecture.md` §1–§5 + ADRs 0010–0013,
post-Reviewer (R2-1..R2-4 fixed in-file). Ground truth @ `475675a`: 10,475 practices (en 9,260 / sc 911 /
ni 304 / wales 0), 10,463 assigned, 155 hospices, 138 shops. Coding updates `.agents/implementation.md`
after every item (status, files touched, validation) — not in a batch. Baseline (W1) is QA-owned.

**In scope:** map perf P1–P6 + conditional stride (ADR-0010); logo/favicon/manifest; list ordering +
filter (ADR-0011); start-here card (ADR-0012); Wales-hospices pending-gap disclosure (verify only — W12/W13).

**Out of scope:** new npm dependencies; new routes/pages; payload splitting (revisit only if m1 > 2 s
post-fixes); vertex simplification; Web Worker / server-side pre-aggregation (escalation only, QA record);
re-deriving the Scotland landing (done); the B2/B3 register fetches — **HUMAN-GATED (H1)**, excluded below.

**Binding constraints (any violation is a defect):** no new dependencies; `src/styles.css` keeps exactly
three `flex-direction` declarations (L13/25/167; `npm run check:layout`) — add none; hide-not-delete with
neutral wording (no "unassigned" / "no catchment match" / "data gap"); no TODOs; minimal diffs; Bootstrap
5.3 / react-leaflet 4.x. W7, W10, W11 all touch `HospicePanel.tsx` — one edit per file per step, in
dependency order, re-reading before each.

## Work list

### W1 Baseline instrumentation (owner: QA) — size M
- Description: Before any P1–P6 fix lands, record in `.agents/qa.md §Baseline`, under Slow 4G + 4× CPU:
  exact URL, browser/build version, device preset, and metrics (m1) navigation → first painted
  markers, (m2) 5-char search re-filter latency, (m3) marker count at zoom 6 vs zoom 12, (m4)
  navigation → interactive. No fix acceptance may claim a delta without this table.
- Files: `.agents/qa.md` (QA-owned; Coding does not edit it)
- Acceptance: `grep -n "Baseline" .agents/qa.md` shows a table with all four metrics and the throttle preset.
- Depends on: none; must complete before W2's acceptance is claimed.

### W2 P1 — `hospiceId → Hospice` Map — size S
- Description: In `MapView.tsx`, replace the three per-marker linear `hospices.find(h => h.id === …)`
  passes (catchment polygons, practice markers, shop markers) with one `useMemo` `Map<string, Hospice>`
  keyed by `h.id`, preserving the `?? '#666'` / `?? '#999'` fallbacks. `FitToSelection`'s find is not
  per-marker — leave it (minimal diff).
- Files: `src/components/MapView.tsx`
- Acceptance: `npm run build` exit 0; `npm run check:layout` exit 0; `grep -c 'hospices\.find' src/components/MapView.tsx` returns 1.
- Depends on: W1 (baseline must exist so the delta is measurable).

### W3 P5 — 0-space `public/data/*.json` — size S
- Description: In `build-data.mjs` (L267–270) change the four `writeFileSync` calls from
  `JSON.stringify(x, null, 2)` to `JSON.stringify(x)`. The architecture's "flip the cache-hash" step has
  no target (verified: no cache-buster exists; the app fetches plain `/data/…` paths) — omit it.
  Re-baseline the byte-identity ritual; log before/after sizes of `practices.json` and
  `catchments.json` in the implementation record.
- Files: `scripts/build-data.mjs`; regenerated `public/data/{hospices,practices,catchments,shops}.json`
- Acceptance: `npm run build-data` ×2 → SHA-256 identical; `grep -c ', null, 2' scripts/build-data.mjs` returns 0; `node scripts/validate-tessellation.mjs` exit 0; `npm run build` exit 0.
- Depends on: none; completes before QA's final byte-identity pass.

### W4 P6 — one shared divIcon per colour — size S
- Description: In `MapView.tsx`, build a `useMemo` `Map<colour → L.divIcon>` so `HospiceMarker` and
  `ShopMarker` stop allocating a fresh icon object per marker per render. Canvas `CircleMarker`s use
  plain `pathOptions` — no change.
- Files: `src/components/MapView.tsx`
- Acceptance: `npm run build` exit 0; `npm run check:layout` exit 0.
- Depends on: W2.

### W5 P2 — grid-bucket practice markers — size M
- Description: In `MapView.tsx`, `useMemo` placed practices into grid buckets
  `floor(lon/grid) × floor(lat/grid)`; while zoom < 11 render one `L.divIcon` aggregate per bucket
  showing the practice count; a bucket click zooms in on that bucket so that at zoom ≥ 11 the full
  markers render. No `leaflet.markercluster`. Track zoom via `useMap` + `useMapEvent('zoomend')`.
- Files: `src/components/MapView.tsx`
- Acceptance: `npm run build` exit 0; `npm run check:layout` exit 0; `grep -c 'markercluster' package.json src/components/MapView.tsx` → 0; under `npm run preview` at zoom 6 visible markers ≈ bucket count; clicking a bucket zooms in and reveals its practices.
- Depends on: W2.

### W6 P3 — remove per-practice Tooltips — size S
- Description: In `MapView.tsx`, drop the `<Tooltip>` on the 10,475 `CircleMarker`s (DOM bloat).
  Practice details stay reachable: a click selects the hospice, which surfaces the `app-selection`
  card. Keep the bounded tooltips on catchment polygons (one per cell) and shop markers.
- Files: `src/components/MapView.tsx`
- Acceptance: `npm run build` exit 0; `npm run check:layout` exit 0; `grep -c '<Tooltip' src/components/MapView.tsx` drops from 3 to 2.
- Depends on: W2. QA re-measures between batches per ADR-0010 and may stop the sequence if a fix stops paying.

### W7 P4 — debounce search input (150–250 ms) — size S
- Description: In `HospicePanel.tsx`, the search box holds a local draft state; a `useRef` timer
  debounces 150–250 ms before calling `onQuery(draft)`, so App's `query` state (and hence the list
  re-filter) is not re-rendered on every keystroke. `query` remains owned by `App.tsx`; the panel just
  throttles propagation. Reset the timer on call.
- Files: `src/components/HospicePanel.tsx`
- Acceptance: `npm run build` exit 0; under `npm run preview`, typing a 5-char postcode fires `onQuery` once per ~200 ms, not once per keystroke (observable in the panel's re-filter cadence).
- Depends on: W2..W6 (order: after the map batch so QA's m2 re-measurement is a clean number).

### W8 Conditional — evidence-gated stride (k=1 default) — size M
- Description: **Decision point only — no code by default.** After W2–W7, QA re-measures m1. Only if
  m1 is still > 800 ms post-fixes, add a named constant `STRIDE_K = 1` in `MapView.tsx` with a bounded
  render-time filter (e.g. `practices.filter((_, i) => i % STRIDE_K === 0)`) inside the existing
  `useMemo`, and a one-line provenance entry in `data/README.md §Current state` stating the tripped
  gate, the measured m1, and that stride is data-proportional (rebuild-safe). If the gate does not
  trip, record "stride gate not triggered (m1 = X ms at k=1)" in the implementation record — done, no code.
- Files: `src/components/MapView.tsx` (only if tripped); `data/README.md` (only if tripped); `.agents/implementation.md` (record either outcome)
- Acceptance: implementation record contains the measured m1 and the outcome (added with constant+provenance, or "gate not triggered"). If added: `grep -n "STRIDE_K" src/components/MapView.tsx` shows the constant; `npm run build` + `npm run check:layout` exit 0.
- Depends on: W2–W7 all complete + QA re-measurement.

### W9 Logo + favicon + manifest — size S
- Description:
  - NEW `public/logo.svg` — 64×64 viewBox: map-pin silhouette in `#1d4ed8` (pin head circle centred
    (32,26) r18 + stem triangle (24,30)→(32,54)→(40,30)), white circle r12 in the head, small heart
    (two cubic curves, ~14×14, `#1d4ed8`) centred in the white circle.
  - NEW `public/manifest.webmanifest` — exactly:
    `{"name":"Hospice Catchment Map","short_name":"Hospice Map","start_url":"./","display":"standalone","background_color":"#ffffff","theme_color":"#1d4ed8","icons":[{"src":"/logo.svg","sizes":"any","type":"image/svg+xml"}]}`
  - `index.html`: add `<link rel="icon" type="image/svg+xml" href="/logo.svg">` and
    `<link rel="manifest" href="/manifest.webmanifest">` in `<head>`.
  - `AppShell.tsx`: inline `<img src="/logo.svg" width="24" height="24" alt="Hospice Info" className="d-block me-2">`
    before the `<h1>` text inside the existing flex container (utility classes only — no new CSS rules).
- Files: NEW `public/logo.svg`, NEW `public/manifest.webmanifest`; MODIFY `index.html`, `src/components/AppShell.tsx`
- Acceptance: `npm run build` exit 0; `npm run check:layout` exit 0; `dist/index.html` contains both `<link>` tags; `dist/logo.svg` and `dist/manifest.webmanifest` exist (Vite copies `public/`); browser tab shows the favicon.
- Depends on: none.

### W10 List ordering + filter (ADR-0011) — size S
- Description: In `HospicePanel.tsx` only:
  - Default order = display name A→Z via `String.localeCompare` (case-insensitive), tie-break on
    `hospiceId` for stability.
  - Sort `<select>` (Bootstrap `form-select form-select-sm`), three options: "Name (A→Z)" (default),
    "Name (Z→A)", "Practices (high→low)".
  - One `form-check form-switch` toggle, label "Has published service area", placed under the search
    box: when on, the list is filtered to `kind === 'published'` — the 7 hospices whose service
    area (catchment) is published rather than approximated. Hide-not-delete: approximated rows are
    simply not rendered while the toggle is on. (Lead-corrected 2026-10-26: the earlier "(the 20
    curated)" / "exactly 20 rows" conflated two invariants — the 20-row figure is the
    `curated === true` set asserted in scripts/merge-hospices.mjs (20 = 7 published + 13 approx);
    the toggle per its label and filter expression yields 7 rows.)
  - Sort control and toggle use existing Bootstrap classes; no new CSS rules.
- Files: `src/components/HospicePanel.tsx`
- Acceptance: `npm run build` exit 0; `npm run check:layout` exit 0; under `npm run preview` the panel's default list is A→Z; switching to Z→A reverses it; Practices (high→low) orders by count descending; the toggle yields exactly 7 rows (the `kind === 'published'` set).
- Depends on: W7 (same file — debounce first, so the select/toggle re-filter cost is already bounded).

### W11 Start-here card (ADR-0012) — size M
- Description: NEW `src/components/StartHere.tsx` (props `practices`, `hospices`, `onOpenHospice(id)`,
  `onOpenShopSearch(id)`, `onSearchList(text)`, `onDismiss()`), rendered inside `.app-map` (already
  `position: relative`) with inline `style={{ position: 'absolute', top: 12, left: 36, zIndex: 1000 }}`
  + Bootstrap card classes — no new CSS. Postcode form: label, input (5–7 chars, uppercase), submit
  ≥ 44 px. Resolution = exact match on `practices[].postcode` (no geocoder). Found state (3 lines):
  practice → catchment hospice → "Open in panel" (`onOpenHospice`). Not-found state, **neutral wording
  verbatim**: "We couldn't match that postcode to a GP practice on this map. You can search the list
  instead, or [send us a note]" (link reuses `feedbackMailto` from `src/lib/feedback.ts`). Three
  collapsible persona rows (patient/carer, fundraiser/charity shop, clinician/referral), each ending
  with the ADR-0012 approximation line. Dismiss `×` → `onDismiss()`; "Start here" pill in panel header
  re-opens. **Forbidden phrases (grep-verified): "unassigned", "no catchment match", "data gap".**
  `App.tsx`: `startHereOpen` state (default `true`), render `div.app-map`, wire `onOpenHospice={select}`.
  `HospicePanel.tsx`: "Start here" pill (prop `onStartHere()`), visible only when the card is closed.
- Files: NEW `src/components/StartHere.tsx`; MODIFY `src/App.tsx`, `src/components/HospicePanel.tsx`
- Acceptance: `npm run build` exit 0; `npm run check:layout` exit 0; `grep -c 'unassigned\|no catchment match\|data gap' src/components/StartHere.tsx` → 0; under `npm run preview`: an assigned postcode (e.g. any fielded practice postcode) shows the 3-line found state and "Open in panel" selects it; an unmatched postcode shows the neutral not-found message with a working mailto; `×` dismisses and the panel pill re-opens.
- Depends on: W10 (HospicePanel ordering/toggle must be in place before the pill lands in its header; one edit per file per step).

### W12 Disclosure — `data/README.md` Wales-hospices pending gap: VERIFY ONLY — size S
- Description: Verify, do not write. The draft CIW data-request email ("Care Inspectorate Wales data
  request (item 1 / B1 — email to send)", with CIWInformation@gov.wales) and the Current-state line
  "Wales and Northern Ireland show 0 hospices until the remaining fetches/data request below land"
  already exist in `data/README.md`. Do not duplicate or reword; only fix if a verification gap is
  found (then record the fix in the implementation record).
- Files: `data/README.md` (read-only; edit only on a found gap)
- Acceptance: `grep -n "B1" data/README.md` shows the email section; `grep -n "0 hospices" data/README.md` shows the Current-state line; implementation record states "verified, no write" or the specific fix.
- Depends on: none.

### W13 Disclosure — About/Methodology pending-gap note: VERIFY ONLY — size S
- Description: Verify, do not write. `MethodologyText` in `src/components/Methodology.tsx` (the single
  source for both the About page and the Source & Method modal) already contains: "The Wales and
  Northern Ireland registers are not published in bulk, so hospices in those two nations may be
  missing from the map." Both surfaces therefore already disclose the pending gap. Only fix if a
  verification gap is found (then record the fix).
- Files: `src/components/Methodology.tsx` (read-only; edit only on a found gap)
- Acceptance: `grep -n "not published in bulk" src/components/Methodology.tsx` shows the line; implementation record states "verified, no write" or the specific fix.
- Depends on: none.

## HUMAN-GATED (H1) — EXCLUDED from the immediately-executable set

Blocked on human browser fetches (ADR-0013 B2/B3); do not attempt, stub, or pad for them. Once the
files land, **the lead runs the documented chain**: extract → geocode (if new postcodes) → `npm run
build-data` ×2 (byte-identity) → `node scripts/validate-tessellation.mjs` → `npm run build` +
`npm run check:layout`, plus a provenance row in `data/README.md` and a note in `.agents/pipeline.md`.

- **H1a — Wales GP practices (B2).** James fetches `data-raw/gp-practices-wales-{main,branch}-2026-10.{csv,geojson}` from data.gov.wales (candidate portal, `data/README.md` procedure 2). Acceptance: extract exit 0, chain green, `wales:` count > 0 with placed lat/lon non-null, unassigned practices re-derived.
- **H1b — Northern Ireland hospices (B3).** James fetches `data-raw/rqia-regulated-services-2026-06.xlsx` from PRA (`data/README.md` procedure 1). Acceptance: chain green, `ni:` hospice count > 0, curated set still exactly 20.

Wales **hospices** (CIW data request) remain a documented pending gap (zero-set tolerance, ADR-0013),
disclosed by W12/W13, risk-accepted; not part of H1.
