# Coding stage — implementation ledger (Cycle 2: performance fix-set + list sort/filter + start-here card)

- Stage: 5/10 — Coding
- Date: 2026-10-25
- Inputs: `.agents/requirements.md` (W1–W13), `.agents/architecture.md`, `docs/adr/0010-0013`, `GLOSSARY.md`
- Branch: `main`, base `475675a`
- Rules honored: no new npm deps; no new routes/pages; no payload splitting / vertex simplification / Web Worker; `src/styles.css` keeps exactly three `flex-direction` declarations (checked by `npm run check:layout`); neutral hide-not-delete wording (no "unassigned" / "no catchment match" / "data gap" in W9–W11 output); no TODOs; one edit per file per step (re-read before each step for `HospicePanel.tsx`).

## Item status

| # | Work item | Status | Files touched |
|---|-----------|--------|---------------|
| W1 | QA baseline (Slow 4G m1–m4, `.agents/qa.md`) | not done (QA-owned — noted only, not written by this stage) | — |
| W2 | MapView O(1) `hospiceId → Hospice` Map | done | `src/components/MapView.tsx` |
| W3 | `build-data.mjs` 0-space `JSON.stringify` | done | `scripts/build-data.mjs` (+ rebuilt `public/data/*.json`) |
| W4 | Shared `divIcon` per colour (Hospice/Shop markers) | done | `src/components/MapView.tsx` |
| W5 | Grid-bucket LOD practice markers (zoom<11) | done | `src/components/MapView.tsx` |
| W6 | Drop per-practice `Tooltip` | done | `src/components/MapView.tsx` |
| W7 | Search debounce (~150–250 ms) in HospicePanel | done | `src/components/HospicePanel.tsx` |
| W8 | LOD stride k>1 | recorded-deferred (evidence-gated; see W8 section) | — (record only) |
| W9 | Favicon + manifest + header logo | done | `public/logo.svg` (new), `public/manifest.webmanifest` (new), `index.html`, `src/components/AppShell.tsx` |
| W10 | List sort select + published toggle (HospicePanel) | done | `src/components/HospicePanel.tsx` |
| W11 | Start-here landing card | done | `src/components/StartHere.tsx` (new), `src/App.tsx`, `src/components/HospicePanel.tsx` |
| W12 | Verify data/README B1 + 0-hospices notes | done (verified, no write) | — (verify only) |
| W13 | Verify Methodology "not published in bulk" line | done (verified, no write) | — (verify only) |

## W1 — QA baseline (noted only)

Status: **not done — QA-owned.** The m1–m4 baseline (network throttled to "Slow 4G",
4× CPU) belongs to stage 6 (`.agents/qa.md §Baseline`) and is out of scope for this
pass; it is recorded here as a precondition only. No files written by this stage.

Baseline sanity at `main @ 475675a` (pre-change, local): `npm run build` exit 0
(147 modules; `dist/index.html 0.61 kB`, CSS `250.47 kB`, JS `409.61 kB`).

## W2 — MapView O(1) lookup

Status: **done**

Files touched: `src/components/MapView.tsx`

Change: added `hospiceById = useMemo(() => new Map(hospices.map(h => [h.id, h])), [hospices])`
(next to the existing `visible*` memos); replaced the three per-render linear
`hospices.find((h) => h.id === …)` calls in the catchment, practice and shop
render loops with `hospiceById.get(…)`. The single remaining `hospices.find`
is in `FitToSelection` (kept by mandate).

Validation:
- `node -e …` count of `hospices.find` in `src/components/MapView.tsx` → **1** ✓
- `npm run build` → **exit 0** (147 modules; JS `409.66 kB`)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`)

## W3 — `build-data.mjs` 0-space `JSON.stringify`

Status: **done**

Files touched: `scripts/build-data.mjs`; rebuilt `public/data/hospices.json`,
`public/data/practices.json`, `public/data/catchments.json`, `public/data/shops.json`.

Change: the four `fs.writeFileSync` calls now use `JSON.stringify(xOut)`
(previously `JSON.stringify(xOut, null, 2)`). No other script logic changed;
the mandated "flip cache-hash" step is omitted (no cache-hash target exists).
Data files regenerated with `npm run build-data` (deterministic inputs,
seeded RNG inside Voronoi-only code paths — no random output here).

Byte sizes (before → after):
- `practices.json`: 3,037,217 B → **2,210,311 B** (−27.2%)
- `catchments.json`: 6,791,072 B → **3,109,910 B** (−54.2%)
- `hospices.json`: 81,573 B → 60,659 B; `shops.json`: 47,555 B → 36,928 B

Build-data run log (identical across both runs):
- `hospices: 155 (unplaced: 0)`
- `voronoi: 10618 vertices, 155 labelled cells`
- `practices: 10475 (geocoded 10463, missing 12)`
- `assigned: 10463, unassigned: 12`
- `per-nation practices: en=9260 sc=911 ni=304 wales=0`; `per-nation assigned: en=9260 sc=911 ni=292 wales=0`
- `shops: 138 (geo missing 0); outside own catchment: 21; unresolved ids: 0`

Validation:
- Two consecutive `npm run build-data` runs → SHA-256 byte-identical across all four JSONs (`a974d549…`, `9275d863…`, `889c03ec…`, `dd19e8ae…`) ✓
- `node -e …` count of `, null, 2` in `scripts/build-data.mjs` → **0** ✓
- `node scripts/validate-tessellation.mjs` → **exit 0** (155 catchments, 2 empty-cell warnings, coverage 100.00%, pairwise overlap 0.0000) ✓
- `npm run build` → **exit 0** (147 modules; JS `409.66 kB`) ✓
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`) ✓

Ground truth preserved: 10,475 practices / 10,463 assigned / 155 catchment cells / 138 shops ✓

## W4 — Shared `divIcon` per colour

Status: **done**

Files touched: `src/components/MapView.tsx`

Change: `HospiceMarker` and `ShopMarker` no longer build a `L.divIcon` per
render; MapView now builds one memoised `Map<colour, L.DivIcon>` for hospice
markers (16×16) and one for shop markers (10×10), keyed by colour, created
once per data change. Opacity moved off the icon `html` — it is now applied
to the marker's own DOM element via a `useRef`/`useEffect` on the
react-leaflet `Marker` ref (`ref.current.getElement().style.opacity`), which
gives the same visual result as the old inner-span opacity while keeping the
shared icons pristine.

Validation:
- `npm run build` → **exit 0** (147 modules; JS `410.16 kB`; tsc initially failed
  with TS2779 on `current?.getElement()?.style.opacity = …` — left-hand optional
  chain — fixed by assigning via a local `el` constant)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`)

## W5 — Grid-bucket LOD practice markers (zoom < 11)

Status: **done**

Files touched: `src/components/MapView.tsx`

Change: new `PracticeLayer` child component (mounted inside `MapContainer`,
so `useMap`/`useMapEvent('zoomend')` work) wraps the practice rendering.
`const [zoom, setZoom] = useState(() => map.getZoom())` is refreshed on
`zoomend`. Buckets: `Map<'${Math.floor(lon/0.5)}:${Math.floor(lat/0.5)}',
{count, latSum, lonSum}>` over `visiblePractices` (memoised). Below
`ZOOM_LOD = 11`: one `Marker` per bucket at its centroid with a shared
memoised `L.divIcon` (28×28 blue circle `#1d4ed8`, white count, inline
styling — no `styles.css` change); click → `map.flyTo([lat, lon], 11)`.
At zoom ≥ 11: the full, unchanged `CircleMarker` set (same radius, colours,
dim/fillOpacity, click behaviour, Tooltip). The MapView body now renders
`<PracticeLayer practices={visiblePractices} hospiceById={hospiceById} selectedId … nation …/>`
in place of the inline practice loop. `hospices.find` stays at 1 (only
`FitToSelection`). No new dependencies, no
simplification/subsampling — all 10,463 placed practices are present at
full zoom; stride k stays 1 (W8 evidence-gated).

Validation:
- `npm run build` → **exit 0** (147 modules; JS `411.44 kB`)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`)
- `node -e …` counts in `src/components/MapView.tsx`: `hospices.find` → **1** ✓ (the
  `FitToSelection` one, preserved), `GRID = 0.5` → **1** ✓, `flyTo` → **1** ✓

## W6 — Drop per-practice `Tooltip`

Status: **done**

Files touched: `src/components/MapView.tsx`

Change: the `<Tooltip>` child of the practice `CircleMarker` (inside
`PracticeLayer`) is removed; the marker is now self-closing. Hover detail for
practices moves to the panel/lookup path per the req (the map keeps the
bounded, one-per-cell catchment sticky tooltip and the per-shop tooltip).
The shared `DisagreeLink` helper is retained (hospice popup + shop tooltip).
The `Tooltip` import is still used (catchment ring + `ShopMarker`).

Validation:
- `npm run build` → **exit 0** (147 modules; JS `411.13 kB`)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`)
- `node -e …` count of `<Tooltip` in `src/components/MapView.tsx` → **2** ✓
  (was 3); `DisagreeLink` references = 3 (definition + 2 uses) ✓

## W7 — Search debounce (200 ms)

Status: **done**

Files touched: `src/components/HospicePanel.tsx`

Change: the search input now writes to local `draft` state; a trailing
`200 ms` `setTimeout` pushes `draft` to the parent via `onQuery` (the
stable `setQuery` setter, so the effect's dependency list is safe). A
mirror effect re-syncs `draft` if the parent ever changes `query`
externally. The list (and anything downstream in the parent) only
recomputes once ~200 ms after the last keystroke. No other panel
behaviour changed; no new CSS.

Validation:
- `npm run build` → **exit 0** (147 modules; JS `411.29 kB`)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`)

## W8 — LOD stride k>1

Status: **recorded-deferred (evidence-gated follow-up; no code)**

Decision: the grid-bucket LOD from W5 ships with stride k = 1 — all 10,463
placed practices are present at full zoom; no subsampling is applied and no
stride code exists. The follow-up is evidence-gated: QA re-measures m1 (map
interaction mid-zoom, "Slow 4G" network, 4× CPU) in the stage-6 baseline
after this fix set lands; stride k>1 is added **only if m1 > 800 ms**. No
files are touched by this item, and no TODO is left in code.

## W9 — Favicon + manifest + header logo

Status: **done**

Files touched: `public/logo.svg` (new), `public/manifest.webmanifest`
(new), `index.html`, `src/components/AppShell.tsx`

Change: `public/logo.svg` — 64×64 pin + heart: stem triangle
(24,30)→(32,54)→(40,30) and head circle (32,26) r18 in `#1d4ed8`,
white circle (32,26) r12, blue heart (~14×14) at the head centre
(ADR-0012). `public/manifest.webmanifest` — the exact ADR-0012 JSON
(standalone, `#1d4ed8` theme, `/logo.svg` any-size icon). `index.html`
head gains the favicon and manifest `<link>` tags. `AppShell.tsx`
header: 28×28 `<img src="/logo.svg">` (decorative: empty `alt`,
`aria-hidden`) before the title, in a `d-flex align-items-center
gap-2` wrapper (row is the default direction — no new `flex-direction`
declaration; G6 count unchanged).

Validation:
- `npm run build` → **exit 0** (147 modules; JS `411.46 kB`)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`)
- `node -e …` on `dist/`: `link icon` → **true**, `link manifest` →
  **true**, `dist/logo.svg` → **true**, `dist/manifest.webmanifest` →
  **true** (public/ assets copied by Vite)

## W10 — List sort select + published toggle

Status: **done**

Files touched: `src/components/HospicePanel.tsx` (only)

Change (ADR-0011, all panel-local, no new CSS, Bootstrap utilities only):
- New `SortMode = 'name-asc' | 'name-desc' | 'practices-desc'` type;
  state `sortMode` (default `name-asc`) and `publishedOnly` (default
  `false`).
- `form-select form-select-sm` control with options verbatim
  "Name (A→Z)" / "Name (Z→A)" / "Practices (high→low)".
- `form-check form-switch` "Has published service area" — when on,
  filters to `h.kind === 'published'` (curated rows).
- Sort applied to the filtered list as a copy (`sorted`): name modes use
  `String.localeCompare(a.name, b.name)` (`Z→A` negated), tie-break
  `id.localeCompare`; `practices-desc` orders by catchment
  `practiceCount` descending (missing counts treated as 0), then name.
- Counts and empty state now read off `sorted`; empty state is query-aware
  ("No hospices match …" vs "No hospices match the current filters.").

Validation:
- `npm run build` → **exit 0** (147 modules; JS `412.44 kB`)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`) — G6:
  `src/styles.css` untouched, still exactly three `flex-direction`
  declarations

## W11 — Start-here landing card (ADR-0012)

Status: **done** (completion pass — the interrupted pass had already written
all three files to a complete state; this pass verified every acceptance
point against disk and recorded the validation; **no code edit was needed**)

Files touched (by the interrupted pass, verified here): `src/components/StartHere.tsx`
(new), `src/App.tsx`, `src/components/HospicePanel.tsx`

Implementation (as found on disk — all W11 acceptance points present):
- New `src/components/StartHere.tsx` with the mandated props (`practices`,
  `hospices`, `onOpenHospice`, `onOpenShopSearch`, `onSearchList`,
  `onDismiss`).
- Rendered inside `div.app-map` (`.app-map` is already `position: relative`,
  `src/styles.css:128`) with inline `style={{ position: 'absolute', top: 12,
  left: 36, zIndex: 1000 }}` (+ `width: 320, maxWidth: 'calc(100% - 48px)'`
  small-screen bound) and Bootstrap `card shadow-sm` classes — no new CSS;
  G6 count unchanged (`check:layout` OK).
- Postcode form: `<label>` ("Your postcode"), text input (pattern
  `[A-Z0-9 ]{5,7}`, `maxLength 7`, uppercase-forced on change), submit button
  `minHeight: 44` px ("Find your hospice").
- Resolution: memoised exact-match map over `practices[].postcode`
  (normalised — case/space-insensitive); no geocoder, no network call.
- Found state (3 lines): practice (`{name} · {postcode}`) → catchment hospice
  (`{name} · {town}` via the memoised `hospiceById`) → "Open in panel" button
  calling `onOpenHospice(hospice.id)`.
- Not-found state, neutral wording verbatim per W11: "We couldn't match that
  postcode to a GP practice on this map. You can search the list instead, or
  send us a note" — the link reuses `feedbackMailto` from
  `src/lib/feedback.ts` (prefilled point details); a "Search the list" button
  additionally calls `onSearchList(submitted)`. No internal flag exposed.
- Three collapsible persona rows (Bootstrap `accordion accordion-flush`,
  collapsed by default): patient/carer, fundraiser/charity shop (with
  "See this hospice's shops" → `onOpenShopSearch` once a hospice is found),
  clinician/referral (includes the ADR-0012 "For real referral decisions,
  confirm with the hospice" line). Each row ends with the ADR-0012
  approximation line: "This map is drawn from the data we have today;
  boundaries shown are an approximation, not official catchment areas."
- Dismiss `×` (btn-link, `aria-label="Dismiss start-here card"`) →
  `onDismiss()`. `App.tsx` carries `startHereOpen` state (default `true`),
  renders the card inside `div.app-map`, and wires
  `onOpenHospice={select}`, `onOpenShopSearch={select}`,
  `onSearchList={setQuery}`, `onDismiss={() => setStartHereOpen(false)}`.
- `HospicePanel.tsx` "Start here" pill: optional prop `onStartHere`, rendered
  only when supplied — App passes it only while the card is closed
  (`startHereOpen ? undefined : () => setStartHereOpen(true)`), so the pill
  is visible exactly when the card is dismissed.

Validation (this pass):
- `npm run build` → **exit 0** (148 modules; `dist/index.html 0.73 kB`, CSS
  `250.47 kB`, JS `417.85 kB` / gzip `127.47 kB`)
- `npm run check:layout` → **exit 0** (`check-map-layout: OK`; exactly three
  `flex-direction` declarations in `src/styles.css`)
- `node -e` count of `unassigned|no catchment match|data gap` in
  `src/components/StartHere.tsx` → **0** ✓
- `npm run preview` **not run** (headless box, per dispatch note) — static
  validation + code review; runtime behaviour of found/not-found states and
  pill re-open is routed to QA (stage 6) under a real browser.

Note: the not-found wording follows the W11 verbatim spec in
`.agents/requirements.md`, which supersedes the draft phrase in ADR-0012.

## W12 — Verify `data/README.md` B1 + 0-hospices notes

Status: **done — verified, no write**

Verification (both lines present; no edit made):
- `grep -n "B1" data/README.md` → line 122: "## Care Inspectorate Wales data
  request (item 1 / B1 — email to send)" ✓
- `grep -n "0 hospices" data/README.md` → line 60: "…Northern Ireland show 0
  hospices until the remaining fetches/data request…" (Current-state line) ✓

## W13 — Verify Methodology "not published in bulk" line

Status: **done — verified, no write**

Verification (line present; no edit made):
- `grep -n "not published in bulk" src/components/Methodology.tsx` → line 51:
  "The Wales and Northern Ireland registers are not published in bulk, so
  hospices in those two nations may be missing from the map." ✓
  `Methodology`Text is the single source for both the About page and the
  Source & Method modal, so both surfaces disclose the pending gap.

## Final validation sweep + completion

Full sweep (all executed this pass, after W11 verification):

| Check | Result |
|-------|--------|
| `npm run build` (tsc -b + vite build) | exit 0 — 148 modules, JS `417.85 kB` |
| `npm run check:layout` | exit 0 — `check-map-layout: OK` (exactly 3 `flex-direction`) |
| Forbidden phrases in `StartHere.tsx` (`unassigned\|no catchment match\|data gap`) | 0 |
| `data/README.md` "B1" email section | present (line 122) |
| `data/README.md` "0 hospices" Current-state line | present (line 60) |
| `Methodology.tsx` "not published in bulk" | present (line 51) |

Ground truth preserved (unchanged on disk; last re-derived in W3): 10,475
practices (en 9,260 / sc 911 / ni 304 / wales 0), 10,463 assigned / 12
unassigned; 155 hospices (20 published/curated, 0 Wales); 138 shops; 155
catchment cells.

Runtime note: `npm run preview` was not run on this pass (headless box, per
dispatch note); runtime verification of W5/W7/W10/W11 is routed to QA (stage
6).

**Coding pass complete — items W1 (QA-owned, noted), W2–W13 done** — W8
recorded as an evidence-gated deferral (k=1 in effect, no code).
