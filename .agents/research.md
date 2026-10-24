# Research — Make the map public-ready

Stage 1 (Research) of the pipeline for `.agents/feature.md`
("Make the map public-ready", scope confirmed 2026-10-21), 2026-10-21.
**Supersedes the 2026-10-16 research pass** (Lancashire & South Cumbria era:
20 curated hospices, 643 practices, PALETTE i%N, etc. — all superseded by the
current 155-hospice UK build). Everything below is grounded in this session's
direct reads/greps of the current tree; facts the environment cannot confirm
(mostly: network, non-browser) are marked **UNVERIFIED**.

Repo: static Vite 5.4 + React 18 + react-leaflet 4.2 + Bootstrap 5.3 CSS-only
app; Cloudflare Pages target; Node v22.23.1 / npm 10.9.8 (verified earlier in
pipeline). Verification checks used by this repo: `npx tsc -b` +
`npm run build`.

Current scale: 155 hospices (~20 published/curated, rest approximated),
~9,564 GP practices (~9,552 placed with lat/lon), 138 charity shops; 4
generated data files `public/data/{hospices,practices,catchments,shops}.json`
plus ~9,564-row `practices.json`. Generated data SHA-256s are tracked in
`.agents/qa.md` for the byte-identical-rebuild ritual.

---

## 1. Data pipeline (Voronoi, clipping, validation, determinism)

All scripts are plain ESM `.mjs` in `scripts/` (34 files; 7 extract scripts +
`merge-hospices.mjs` + `build-data.mjs` + `validate-tessellation.mjs` +
`geocode-postcodes.mjs` + `catchment-map.mjs` + deprecated research/debug
helpers). No build step; all run with `node`.

### 1.1 `scripts/build-data.mjs` — the core (264 lines)

- **L35**: `const BOX = [-9.5, 49.5, 2.0, 61.5]; // [west, south, east, north]`
  — the rectangular clip box (ADR-0001).
- **L30–33**: curated-override remap — `SLUG_TO_ID` remaps the 20 curated
  CATCHMENTS (from `scripts/catchment-map.mjs`) onto register hospice ids at
  merge time. The curated-override precedent is directly reusable for a
  curation/corrections mechanism if the Architect wants one inside the build.
- **L160**: `Delaunay.from(vertices, (v) => v.lon, (v) => v.lat).voronoi(BOX)`
  — d3-delaunay ^6.0.4 (devDep) tessellates in lon/lat degree space, clipped
  to BOX only.
- **L172–179**: per-hospice cell union via polygon-clipping `union`
  (`const merged = union(rings.map((ring) => [ring]));`) → `Catchment.polygons`
  as `{lat, lon}[][]` (multi-ring = union of disjoint cells).
- **L200**: `pointInRings(lat, lon, rings)` — even-odd point-in-polygon test.
- **L233**: `outsideCatchment: !pointInRings(g.lat, g.lon, rings)` — the flag
  the feature says to keep in data and hide in UI.
- **L251–254**: writes the 4 outputs as `JSON.stringify(x, null, 2)` —
  deterministic output for deterministic inputs (all inputs are committed
  under `data-raw/`), which is exactly what makes the two-run SHA-256
  byte-identical ritual work.
- Prints unassigned/outside stats; `process.exit(1)` on unresolved shop ids.

**Where a coastline clip slots in:** after the per-hospice union (L172–179),
each merged cell can be `intersection(cell, land)` using polygon-clipping
`intersection` (already a devDep, currently used only by the validator — the
`difference` export is unused). Equivalently, clip the raw Voronoi cells
before the union. The `pointInRings` at L200 then runs against the *clipped*
rings, so `outsideCatchment` semantics become "outside the land-clipped cell"
automatically. The rectangular BOX is still needed as the Delaunay clip
arg and as a safety bound; the land polygon becomes the authoritative shape.

**Land polygon file:** must be a committed deterministic input
(`data-raw/uk-land.json` or similar, JSON of `[lon, lat]` rings) so the
rebuild stays offline-reproducible, mirroring `postcode-geo.csv`. Fetching it
is a one-time human step (see §2) — same pattern as the 4 pending fetches in
`docs/MAINTENANCE.md`.

### 1.2 `scripts/validate-tessellation.mjs` (74 lines) — what clipping breaks

- **L11**: duplicates the bbox consts `x0=-9.5, y0=49.5, x1=2.0, y1=61.5`
  (duplication with build-data L35 — candidate refactor).
- **L21–34**: every catchment has non-empty polygons (prints `no polygon: <id>`
  — Basildon `en-1-17708902164` is the known offender).
- **L27–38**: all vertices inside the bbox ±0.01.
- **L40–43**: `mergedUnion = union(...)` over all cells → prints
  `coverage: union/bbox area` (~100.00%, the "complete partition of the box"
  proof; 138 deg² box).
- **L45–58**: pairwise `intersection` area ≈ 0 over all 303 adjacent pairs
  (worst pair printed; current overlap 0.00).

**Clipping to land invalidates two checks and rewrites one:**
- Vertices-in-bbox (L27–38) → should become vertices ⊆ land (still ⊆ bbox as
  an invariant sanity check).
- Coverage `union/bbox = 100%` (L40–43) → sea removal makes union area << box
  area. Must be re-expressed as two checks: (a) every cell ⊆ land
  (`intersection(cell, land)` area ≈ cell area, or `difference(cell, land)`
  area ≈ 0), and (b) `area(land ∩ bbox) ≈ area(mergedUnion)` — i.e. cells
  tile the land, not the box. polygon-clipping `difference`/`intersection`
  are available in the existing devDep; no new dependency needed.
- Pairwise disjointness (L45–58) survives and remains a meaningful check
  (clipping a disjoint partition with a common mask keeps it disjoint).
- New degenerates to expect post-clip: zero-area / sliver remnants (a cell's
  land-intersection collapsing to empty or a hairline, e.g. a cell whose only
  land is an island edge). A zero-area result must not crash `union` of the
  remaining cells nor the polygon-clipping calls; validator should flag
  `polygons: []` and sliver area thresholds (current known sliver: Wisdom
  Hospice 0.0002 deg², QA-4 risk-accepted).

### 1.3 Determinism / byte-identical rebuild

- `public/data/*.json` are committed; two consecutive `node
  scripts/build-data.mjs` runs must produce identical SHA-256 hashes
  (ritual: `certutil -hashfile <file> SHA256`, compared; hashes recorded in
  `.agents/qa.md`). This works today purely because every input (registers,
  `postcode-geo.csv`, `shops-geo.json`, `catchment-map.mjs`) is committed and
  code is deterministic.
- The land polygon must be committed to `data-raw/` the same way; if it is
  only fetched at build time, determinism and the offline re-run chain in
  `docs/MAINTENANCE.md` break.
- The GLOSSARY term "tessellation clip box" (`GLOSSARY.md` L16–18: "Cells are
  clipped to this box, **not to the coastline**") must be updated by the
  Architect (who owns `GLOSSARY.md`) — this feature reverses that sentence.
- ADR-0001 (`docs/adr/0001-uk-wide-voronoi-clip-box.md`) explicitly rejected
  "OSM land-mask clip" — this feature reverses it; `docs/adr/` holds 0001–0005,
  so the next ADR number is **0006**.

### 1.4 MAINTENANCE.md insertion point

`docs/MAINTENANCE.md` documents the re-run chain: 7 extract scripts →
`merge-hospices.mjs` → `geocode-postcodes.mjs` → `build-data.mjs` (run twice;
byte-identical) → `validate-tessellation.mjs` → `npm run build`. The land
polygon needs: (a) a one-time fetch procedure in its human-fetch list (which
already lists RQIA XLSX, Welsh GP layers, Scottish NHS Spatial Hub layer, Welsh
hospices CIW email), (b) the committed filename under `data-raw/`, and (c)
sanity-check text (validator now reports land-coverage %, not box %). Rollback
story stays the same: single commit + `git revert <sha>` (last known good
reset point `5faa12e`).

---

## 2. Coastline data source assessment

Constraints for this stage: **no downloads, no network calls** (also: this
machine has DNS/socket blocks — RQIA, data.wales, Scotland Spatial Hub
unreachability recorded in `.agents/qa.md` DEA-6; Overpass mirrors returned
502/500 during the earlier shops fetch; Nominatim search did work). So the
coastline fetch is a **documented human step**, not code to be run here.

Candidate sources (all ODbL-licensed where OSM-derived; UK land, mainland +
islands, at ~1 m–1 km resolution is adequate):

1. **OSM land polygons via Overpass** — query `natural=coastline` /
   `place=country` relations for the UK (e.g. relation 126 /
   `boundary=administrative` land relations). Most on-license-consistent fit
   ("same ODbL family" per the feature). Fetch via
   `overpass-api.de`/mirror, community-enquiry User-Agent, 1 req/s — exactly
   the pattern of `scripts/geocode-postcodes.mjs` (L UA: `HospiceInfoproto/0.1
   (geocoding research; contact: james)`, 1 req/s `setTimeout`, 8 attempts,
   429/503 → 30 s backoff, resumable append, `process.exit(1)` on missing).
   A new `scripts/fetch-uk-land.mjs` can clone this script shape; it would
   not be run in this pipeline (no network), only committed for the human
   re-run.
2. **OSM UK extract + osmosis/`polygon-clipping` offline derive** —
   geofabrik/openstreetmap.org UK extracts are large (multi-GB pbf); overkill
   for one polygon. Not recommended.
3. **Natural Earth** (public domain, 1:10m/1:50m admin-0 boundaries) — fine
   licence-wise (PD) but ~100 km smoothing is too crude for a UK coastline and
   is a *different* licence family than the feature prefers ("same ODbL
   family"). Rejected on fit, noted for completeness.
4. **OSM-derived "UK land polygon" datasets** published by third parties —
   licence provenance must be checked per dataset; prefer (1) to keep the
   chain single-source.

**Size estimates: UNVERIFIED** — no downloads allowed in this stage, so no
byte/vertex estimates. Expectation from general knowledge (flagged
UNVERIFIED): a 1:10m-grade UK land polygon is low hundreds of KB to a few MB
as GeoJSON/JSON with islands; well within Cloudflare Pages static limits and
Node memory. The Architect should cap committed size sensibly (prefer a
simplified outline; vertex budget e.g. < ~200 k points) and confirm actual
size when the human fetch happens.

**Licensing/attribution:** ODbL requires attribution for OSM-derived data.
The feature's Licences & Attribution page therefore lists OSM (coastline +
tiles + geocoding) and CQC-derived data (registers) under ODbL. Note:
**SEC-4 (risk-accepted) — `data/README.md` currently lacks the ODbL
attribution**; this feature's attribution page is the natural place to fix
it, and `data/README.md` provenance entries get a "source: OSM (ODbL),
fetched <date>" line when the land file is added.

**MAINTENANCE.md procedure shape** (for the Architect's doc): human with
normal DNS runs `node scripts/fetch-uk-land.mjs` (new) once → commits
`data-raw/uk-land.json` (+ SHA-256 recorded) → re-runs
`node scripts/build-data.mjs` twice + validator. Until then the build keeps
using the committed file (or BOX-only) — the feature should pin the exact
behaviour when the land file is absent (open question §OQ3).

---

## 3. Public-safe UI — every place internal issues are surfaced

Feature rule: *public-safe means hide, not delete* — all flags and data stay
in `public/data/*.json`; only presentation changes.

### 3.1 Data that must be KEPT (hide-not-delete inventory)

- `Shop.outsideCatchment: boolean` — `src/lib/types.ts`; written by
  `build-data.mjs` L233; 21 shops flagged (QA-2).
- `Practice.hospiceId: string | null` — `src/lib/types.ts`; 12 unassigned
  (`hospiceId: null`, all `lat: null` — QA-1, OSM-gap postcodes).
- `Catchment.polygons` can be `[]` for Basildon `en-1-17708902164`
  (degenerate cell, QA-3, practiceCount 0); Wisdom Hospice 0.0002 deg² sliver
  (QA-4).
- Build prints (unassigned/outside counts) — stdout only, not public.

### 3.2 Every on-screen surface exposing internal issues (file:line)

1. **`src/App.tsx` L123–126** — selection card:
   `const out = selectedShops.filter((s) => s.outsideCatchment).length;`
   renders `(<span class="fw-semibold text-warning-emphasis">{out} outside
   its own catchment</span>)`. The most prominent indicator; must be removed.
   (The `{selectedShops.length} charity shop(s)` count itself is fine — it is
   not an issue count.)
2. **`src/components/MapView.tsx` L112–133 (ShopMarker)** —
   `color = shop.outsideCatchment ? SHOP_OUTSIDE_COLOR : hospiceColor` (L~114,
   `SHOP_OUTSIDE_COLOR = '#e07b00'` right above) → orange recolor + L120–132
   Tooltip containing `⚠ Outside its own catchment` (L128). Both the colour
   and the warning block must go; **but this is exactly the tooltip the
   feature says must then show the assigned hospice name** (task 2).
3. **`src/components/MapView.tsx` L213–221 (practice CircleMarker Tooltip)** —
   L219: `{p.postcode} → {hosp ? hosp.name : 'no catchment match'}` — the
   `'no catchment match'` leak for unassigned practices. Should become a
   neutral string (e.g. just postcode, or "—") while `hospiceId: null` stays
   in data.
4. **`src/components/HospicePanel.tsx` L32–34, L71** —
   `unassigned = practices.filter(p => p.hospiceId === null && p.lat != null)
   .length` rendered as `· ${unassigned} unassigned` in the panel footer.
   Currently shows 0 (all 12 unassigned have `lat: null` — QA-9 discrepancy),
   but the code exists and must be removed.
5. **`src/components/Methodology.tsx` L30, L58** — `stats.unassigned`
   (filter `hospiceId === null`, no lat check) →
   "of which {unassigned} are not geocoded yet" (L58; also QA-8 stale
   wording). Remove; reword.
6. **`src/components/Methodology.tsx` L32, L62** — `stats.shopsOutside` →
   "of them outside their own catchment" (L62; 21 today). Remove.
7. **`src/components/Methodology.tsx` L96–97** — methodology item 5 explains
   the outside-catchment flag ("A shop is flagged *outside its own catchment*
   when its point falls outside its hospice's catchment polygon…"). Now that
   the flag is internal, the public method description should be reworded to
   describe the *data/pipeline* ("shops are checked against their hospice's
   catchment; a small number of mismatches are tracked privately") — wording
   is an Architect/PM decision.
8. **`src/App.tsx` L36–46 (error state)** — if any of the 4 data fetches
   fails, the page shows an internal instruction "Run `npm run build-data` to
   generate `public/data/*.json`". For a public page this should be a
   generic failure message (the `npm run build-data` script *does* exist —
   `package.json` `"build-data": "node scripts/build-data.mjs"` — so the text
   is factually fine for devs, just not public).

**Already-safe constructs to preserve:**
- `MapView.tsx` catchment render: `if (!rings.length) return null` —
  degenerate cells are already invisible (Basildon safe as-is).
- `HospiceMarker`/`ShopMarker`/`CircleMarker` all guard `lat == null`
  (visiblePractices/visibleHospices filters) — the 12 unassigned practices
  never render.
- Catchment Tooltip L185–187: `"{name} — {practiceCount} GP practice(s)"` is
  fine (public count, not an issue count).

### 3.3 New interactive requirement (task 2) — tooltip content

Current shop tooltip (`MapView.tsx` L120–132): shop name, address, postcode
+ warning. New: shop name, address, postcode, **assigned hospice name**
(`hospices.find(h => h.id === s.hospiceId)` — the hospice is already resolved
in the parent list-render, `const hosp = hospices.find(...)` in the shops
`.map`, so it is in scope; `Shop.hospiceId` is always set for the 138 shops —
unresolved ids fail the build via `process.exit(1)` in build-data). Practice
tooltip L213–221: show `hosp.name` when assigned (already does); neutral
fallback when not. Hover AND tap: Leaflet Tooltip on CircleMarker/Marker works
on touch (taps trigger the same `click`/tooltip path); hover-only `<Tooltip>`
defaults (`direction: 'top'`) are fine, no change needed — touch verification
is a QA item (no browser on this host, §5).

### 3.4 Findings that change the interaction design (dead Bootstrap JS)

- **`src/main.tsx` L3** imports `bootstrap/dist/css/bootstrap.min.css` and
  `leaflet/dist/leaflet.css` — **Bootstrap JS is never imported anywhere**
  (repo-wide grep for `import.*bootstrap` finds only that CSS line).
  Consequences, all verified by code (never browser-tested — "No headless
  browser on this host"):
  - `src/App.tsx` L70: "Source & Method" button uses
    `data-bs-toggle="modal" data-bs-target="#methodologyModal"` — **the modal
    cannot be opened in a real browser as shipped**.
  - `src/components/Methodology.tsx` L50 (btn-close) and L133 (footer Close)
    use `data-bs-dismiss="modal"` — dead for the same reason.
  The feature needs a header nav to ≥6 new pages, so interaction must change
  anyway. Options: (a) import `bootstrap/dist/js/bootstrap.bundle.min.js`
  (enables all `data-bs-*` for free; adds a bootstrapped JS dep to the SPA);
  (b) React-controlled modals/pages (no new runtime code; consistent React
  state for page switching). Architect's call (§OQ2) — noting option (a)
  also fixes #50/#133 dismiss with zero markup change.

---

## 4. Routing / page idiom (no router today)

- **Single-view SPA**: `src/main.tsx` → `<App/>` (`src/App.tsx`), one render
  tree: header (`.app-header`, App.tsx L~50–75) → `.app-body` (aside
  `.app-panel` L78 + main `.app-map` L91) → `Methodology` (L155, a modal
  div). No router of any kind; `package.json` has no react-router.
- `src/lib/useAppData.ts`: `useAppData<T>(path)` fetches `/data/*.json` at
  mount, throws on `!r.ok`, **no 404/empty fallback**. `src/App.tsx` L9–12
  fetch the 4 files and the app gates on all of them (error state L~33–46).
  **Important for corrections.json:** it must NOT join that gate (an empty/404
  corrections file would blank the whole map). Commit a stub
  `public/data/corrections.json` (e.g. `[]`), fetch it *inside* the
  corrections page component, and render a graceful "no corrections yet"
  empty state if fetch fails (defence in depth).
- `vite.config.ts` is default: `plugins: [react()]`, single entry
  (`index.html` → `/src/main.tsx`). Cloudflare Pages serves the static build
  directory; deep paths (`/about`) 404 without SPA fallback (`_redirects` /
  `404.html` would be needed for path-based routes).
- Routing options (for the Architect):
  1. **Hash-based sections within the existing SPA** (e.g. `window.location.hash`
     or simple state switched by nav buttons; no dep added). All pages share
     `useAppData` data, shared CSS, the existing header. Static-host-safe
     (no server rewrites needed), smallest diff, consistent with
     "keep diffs minimal / no new deps" repo norms. Favourite, subject to the
     page count (nav to About, Privacy, Licences, Accessibility, Feedback,
     Corrections ≈ 6 + map).
  2. **Vite multi-entry** (`build.rollupOptions.input`: `index.html`, `about.html`, …)
     — true static pages, but each page needs its own mount; duplicating
     header/footer/`useAppData` is more code; `#/` vs `/` UX differences arise
     only if links are absolute.
  3. **react-router** — new runtime dep in a static-only repo; rejected by the
     repo's minimal-dep norm (only 5 runtime deps today) unless the Architect
     wants full routing.
- Nav placement: no nav and no footer exist today (`App.tsx` header has only
  the title, the shops switch, and the modal button). A header nav
  (Bootstrap `nav`/`d-flex`) + a site footer (which will also carry the
  required attribution line — OSM tiles are already credited in the
  `TileLayer` attribution string, MapView.tsx L~155, and need the ODbL
  human-facing statement on the Licences page + footer).

---

## 5. Mobile behaviour (current)

`src/styles.css` (full file read):

- Layout: `.app {display:flex; flex-direction:column; height:100vh;
  overflow:hidden}`; `.app-header {flex:0 0 auto}`; `.app-body {flex:1 1 auto;
  display:flex; min-height:0; flex-direction:row}`; `.app-panel {flex:0 0
  340px; min-width:280px}`; `.app-map {flex:1 1 auto; position:relative;
  min-width:0}`; `.app-map-canvas {position:absolute; inset:0}` (Leaflet canvas
  is absolute inside).
- **Only one media query**: `@media (max-width:768px)` →
  `.app-body {flex-direction:column}`, `.app-panel {flex:0 0 220px}`,
  `.legend-card {display:none}`. That is it. No overlay/sheet, no
  touch-target enlargement, no `overflow-x` guard, no font-size changes.
- Selection card: `.app-selection {position:absolute; top:10px; left:10px;
  max-width:380px}` — on a 360 px viewport a 380 px card at left:10 px
  overflows (needs `max-width: calc(100% - 20px)` or similar in the responsive
  pass).
- Markers: `.hospice-marker` 12×12 px (divIcon 16×16, 2 px border, `rotate(45°)`),
  `.shop-marker` 10×10 px (divIcon 10×10) — below the ~44 px WCAG/Apple
  touch-target guidance (the feature's accessibility statement must address
  this; enlarge via CSS class in the mobile/AA pass).
- Panel list rows: `.panel-item` padding `0.55rem 0.75rem` (~9 px vertical)
  — small target height (~33 px) vs 44 px guidance.
- `index.html` L5 has a correct viewport meta
  (`width=device-width, initial-scale=1.0`).
- Leaflet `MapContainer` (`MapView.tsx` L~148–153): `zoomControl={true}`
  (default topleft) — zoom works on touch (pinch + zoom buttons) out of the
  box; `bounds` fixed to the UK box. Panel `overflow:auto` region
  (`.flex-grow-1 overflow-auto panel-list`) scrolls; the column layout means
  panel stacks above the map at ≤768 px, **squeezing the map** (220 px panel
  + map filling the rest) — the feature's "overlay/sheet" requirement means
  replacing this with an overlay (e.g. panel as an absolutely-positioned
  sheet over the map, toggled by a nav/hamburger or search tap) and giving
  the map the full viewport.
- `Methodology` modal: `modal-dialog modal-lg modal-dialog-scrollable` —
  Bootstrap `modal-lg` is 800 px; on phones it fits fine (max-width 95 %),
  it already exists and is the pattern to reuse if the modal approach is kept.
- **Verification is impossible on this host** (no headless browser, QA-6):
  the mobile acceptance criteria (no horizontal scroll, readable text,
  tappable markers, working zoom) can only be checked by QA in a
  mobile-emulated browser on a machine that has one — flag this as the
  pipeline's key QA dependency.

---

## 6. Metadata / legal surface

- **`index.html` L6** — `<title>Hospice Catchment Map — Lancashire &amp; South
  Cumbria</title>` is stale (QA-7; app is UK-wide). No `<meta name=
  "description">`, no og tags, no favicon — all candidates for the public-ready
  pass (low risk, pure HTML).
- **`package.json` `description`** — stale, same Lancashire wording (QA-10).
- **No site footer exists** (`App.tsx` ends at `Methodology`, L155) — the
  footer is new; good home for attribution (OSM/ODbL, CQC-derived) and links
  to the legal pages.
- **`data/README.md`** — provenance ledger for all data files; the land
  polygon + corrections.json + `outsideCatchment` semantics + ODbL attribution
  (SEC-4, currently missing) all land here. Also holds the CIW email template
  (Welsh hospices pending) — see §7 for the placeholder-in(shared-source)
  relevance.
- **GLOSSARY.md** — L16–18 "tessellation clip box … Cells are clipped to this
  box, **not to the coastline**" must be rewritten (Architect-owned file).
  Candidate new terms this feature introduces (for the Architect to finalise):
  - **land mask / UK land polygon** — the committed OSM-derived land geometry
    all catchments are clipped against.
  - **land clip** — result of intersecting a catchment cell with the land mask.
  - **corrections log** — public, append-only record of accepted user
    corrections (initially empty); fed by the curation workflow.
  - **curation workflow** — the documented human loop: feedback email →
    review → apply (data-raw file or curated override) → rebuild → append to
    corrections log.
  - **placeholder operator** — the clearly-marked stand-in name/email used in
    one shared source while the real operator is unnamed.
- **Shared placeholder operator source (feature criterion 5: ONE shared
  source).** Evidence that none exists today: `data/README.md`'s CIW email
  template contains *literal* `[name]` / `[contact address]` placeholders;
  every person-facing string (mailtos, About page, Feedback page, corrections
  log "contact" line) currently would need to copy-paste. Recommendation
  (Architect to decide shape/naming): a single module, e.g.
  `src/lib/siteConfig.ts` (value: `operatorName` — placeholder, clearly
  marked, `contactEmail` — placeholder) consumed by every UI page +
  mailto links; the curation script (scripts-side) can read a sibling
  `data-raw/site-config.json` (committed) so UI and log-generation share one
  canonical value. This keeps "clearly-marked placeholder in ONE shared
  source" structurally true.
- **Legal page content checklist the copy must cover** (for the PM/Architect's
  requirements doc — research only, no copy writing): Privacy Policy = UK
  GDPR + DPA 2018, "no cookies, no analytics, no tracking", only personal
  data = the feedback email (address + message) used solely to act on
  corrections; Licences & Attribution = ODbL (OSM coastline + tiles +
  geocoding; CQC-derived register data), per-source data URLs and dates
  (CQC snapshot 14 Oct 2026; CIS 31 Aug 2026 — `data/README.md` caveats);
  Accessibility Statement = WCAG 2.1 AA commitments with an honest note about
  current marker sizes and the feedback channel.

---

## 7. Corrections log plumbing + curation workflow

### 7.1 How the site consumes data (existing pattern)

`public/data/*.json` (Vite `public/` dir → served at `/data/*`) →
`useAppData<T>(path)` fetch at mount → App gates on the 4 core files. So the
**Corrections page = fetch `/data/corrections.json` in its own component**
(same pattern, no gate — §4) + React render. Commit a stub
(`[]` or `{"items": []}`) so first deploy is 200 not 404; render an empty
state ("No corrections have been published yet.") if the fetch or items are
empty. The schema is the Architect's choice; minimal:
`{date, summary, dataChanged: "practices.json", file?: "..."}`
(kind/point id/hospice id optional). Note `useAppData` throws on non-2xx, so
the stub must exist and be valid JSON.

### 7.2 Feedback (task 4)

- **Per-marker mailto**: shop markers (138) and practice markers (~9,564
  placed) get a "Disagree with this data?" link. Building a per-render
  mailto per practice is trivial (`href={...}` with `mailto:<email>?subject=
  ...&body=...`, `encodeURIComponent` on subject/body); include point id
  (`p.id` / `s.id`), name, postcode, and assigned hospice name so the
  curator can locate the record without asking back. The public email is the
  shared placeholder operator email (§6).
  - Consideration: practice tooltips currently have no "actions" area; a
    mailto line appended inside the existing Tooltip works but grows ~9,500
    DOM tooltip payloads (tooltips render on demand in Leaflet — low risk).
    An alternative is putting the link in the hospice selection card /
    feedback page only. Architect's UX call (§OQ5).
- **Feedback page**: form-like page that composes the same mailto (name,
  location/postcode, message → `mailto:`), plus the plain address in text.
  No backend (out of scope) — mailto is the only transport.

### 7.3 Curation workflow (documented internal process)

Slots into the existing documented machinery:
- **Scripts:** a new `scripts/add-correction.mjs` (template: the curated-
  override precedent — `catchment-map.mjs` CATCHMENTS + `SLUG_TO_ID` merge in
  `build-data.mjs` L30–33) that edits the appropriate `data-raw/` file
  (address/postcode fix → extract output; assignment fix → curated override)
  and appends one entry to the corrections data file, then the human runs the
  normal chain (build-data ×2, validator, `npm run build`). Alternatively the
  curator edits `data-raw/` directly and hand-appends the log entry — the
  script is a convenience, not required by the feature; the *documentation*
  is required.
- **Docs:** `docs/MAINTENANCE.md` gains a "Corrections workflow" section
  (receive feedback → verify against source register/source data → apply in
  `data-raw/` → rebuild (byte-identical ritual) → append corrections log entry
  → commit). `data/README.md` gains the `corrections.json` provenance line.
- **Corrections data file:** lives where the log is committed (
  `public/data/corrections.json` IS the feed for the public page — the
  internal source file can be the same file, edited by the curation step,
  since it's shipped verbatim). This is the simplest design: one file,
  committed, human-edited, published. Square-bracket placeholder convention
  is already used in `data/README.md` (`[name]`/`[contact address]`) if the
  email is still a placeholder at publish time.
- **Initial state:** intentionally empty (schema stub only).

### 7.4 Deps check

Nothing new is strictly required: polygon-clipping (clip), react/leaflet
(maptiles), bootstrap (nav/footer), Vite (multi-entry if chosen). A tiny
corrections EDL (e.g. `src/lib/corrections.ts` types) is internal only.

---

## 8. Data-shape reference (reused from prior research where still true)

- `src/lib/types.ts`: `Nation = 'en' | 'sc' | 'wales' | 'ni'`;
  `Hospice {id, name, town, postcode, lat?, lon?, nation, kind: 'published' |
  'approx', curated?, color, website?, cqcUrl, source}`;
  `Practice {id, name, address[], postcode, lat?, lon?, nation, hospiceId:
  string | null}`;
  `Catchment {hospiceId, name, nation, practiceCount, polygons: {lat,lon}[][]}`
  ("One or more rings (Voronoi-derived; multi-ring = union of cells)");
  `Shop {id, name, address, postcode, lat, lon, hospiceId, outsideCatchment}`
  (`outsideCatchment` **stays** in the data per hide-not-delete).
- Generated `catchments.json` carries 155 cells; unions computed at build
  time (not shipped raw).

---

## 9. Risks and open questions

### Risks (carry to Architect/Reviewer; file evidence cited)

1. **Multi-ring land clipping** — per-hospice cells are multi-ring unions
   (`build-data.mjs` L172–179; `types.ts` `polygons {lat,lon}[][]`);
   intersecting multi-ring polygons with the (multi-ring, island-laden) UK
   land polygon via polygon-clipping is the geometrically heavy path.
   Residual risks: empty results for near-coastal cells, sliver creation, and
   increased vertex counts (perf: `public/data/catchments.json` already
   ~0.35 MB; UK land adds geometry to the build, not necessarily the output —
   cells that shrink are fine, cells that gain water-proxy edges are not
   expected).
2. **Zero-area / sliver degenerates post-clip** — cells touching the sea edge
   (c. 25 coastal hospices) may clip to empty or hairline polygons. The
   validator must (a) not crash on empty `polygons`, (b) flag
   `polygons: []` and slivers by area threshold (Wisdom 0.0002 deg² is the
   current accepted baseline), (c) keep Basildon `en-1-17708902164`'s
   `polygons: []` invisible (MapView `if (!rings.length) return null` already
   safe). polygon-clipping `intersection` of disjoint cells with a shared
   mask should stay disjoint, but floating-point edge cases (coastal grid
   lines running exactly through a vertex) can produce 1–2 µdeg² slivers —
   the existing 0.00-overlap tolerance in `validate-tessellation.mjs` L45–58
   should be kept and the new land-coverage check given a matching tolerance.
3. **OSM coastline granularity + build-time/file-size** — ODbL + UK land at
   ~1 km vs ~100 m detail produces very different vertex counts and JSON
   sizes; the fetch must pick an appropriate simplification level (generalised
   vs raw) and the commit.getSize budget is **UNVERIFIED until the human
   fetch**. A too-fine polygon inflates build time (155 × polygon-clipping
   intersections) and `catchments.json` size; a too-coarse one makes
   "no cell extends into the sea" visibly wrong at coastal zoom. Mitigation:
   validate visually + area-ratio sanity in the validator (land-coverage %
   of land polygon within tolerance).
4. **Validator invariant re-expression** — the "100% coverage of the box"
   proof (`validate-tessellation.mjs` L40–43) is void once land is removed;
   the new invariant ("cells tile the land") needs both sub-checks (cell ⊆
   land; union ≈ land∩bbox). Getting this tolerance wrong silently either
   accepts sea cells or rejects valid coastal clips. The Architect should
   specify the exact checks + tolerances in the architecture doc.
5. **corrections.json gating the map** — if the corrections fetch is added to
   `App.tsx`'s 4-fetch gate (L9–12/L33–46), any 404/validation failure
   blanks the entire map (`src/lib/useAppData.ts` throws on `!r.ok`). It
   must be page-local + stub-committed (requirement, not preference).
6. **SEC-4 ODbL attribution** — `data/README.md` lacks it today; the feature
   must fix it in one coherent place (Licences page + data/README +
   `MAINTENANCE.md` land-file provenance). Forgetting it re-introduces the
   accepted risk on a now-pan-public site.
7. **Mobile first-paint load** — the map renders ~9,552 placed practices as
   SVG `CircleMarker`s (`MapView.tsx` L~204–221) + 138 shop Markers + 155
   catchment polygons. This is the same first-paint load as today (no change
   from the feature itself), but mobile hardware is slower; the new overlay/sheet
   panel must not re-trigger this on toggle (keep panels in mounted DOM,
   toggle visibility only). `preferCanvas` remains the pre-agreed remedy if
   QA measures first-paint as too slow on mobile emulation (not measurable on
   this host — QA-6).
8. **No browser on this host** (QA-6) — mobile acceptance, tooltip-tap
   behaviour, the Bootstrap-JS modal decision, and hash-routing behaviour
   cannot be verified in candles; all are QA gate items on a browser-equipped
   machine. The findings "Bootstrap JS is not imported, so the modal is dead"
   and "tooltips work on touch" are code-inference, not browser-verified.
9. **Overpass-down fetch risk** — Overpass mirrors were 502/500 during the
   earlier shops fetch and Nominatim worked; the land-file human fetch may
   need a retry / alternate source (e.g. a saved OSM relation extract or
   another mirror). The procedure doc should list at least two source options
   and the exact output filename so a re-fetch from a different day produces
   a different file → a note in MAINTENANCE.md that the SHA-256 of the land
   file is recorded once and re-fetched files are a *rebuild event* (byte
   identity is per-input-set).
10. **Placeholder-operator divergence** — if the mailto address, About page
    and corrections log copy each hard-code the placeholder, the "ONE shared
    source" criterion is structurally unenforceable. The shared-module
    design (e.g. `src/lib/siteConfig.ts` + `data-raw/site-config.json` for
    scripts) is the prevention; Research flags it as an Architect decision.

### Open questions for the Architect

- **OQ1 — Routing**: hash-sections in the existing SPA (favourite, no deps,
  static-safe) vs Vite multi-entry vs react-router — decide and document the
  nav component + footer owner (which component renders both).
- **OQ2 — Bootstrap JS**: import the bundle (fixes dead modal + free
  `data-bs-*`) vs React-state modals/pages — decide once; it drives the
  Methodology rewrite.
- **OQ3 — Land file contract**: exact committed path/name
  (`data-raw/uk-land.json`?), format (`[lon,lat][]` rings, outer CW?),
  expected simplification level, and build behaviour when the file is absent
  (fail-fast vs fall back to BOX-only) — the feature should not silently
  regress to box-only on a real build.
- **OQ4 — Validator spec**: exact new checks (cell ⊆ land, union ≈ land∩bbox,
  sliver threshold, empty-cell report) + tolerances; whether the old
  box-coverage line is kept for reference (it would now report < 100 %).
- **OQ5 — Mailto UX**: per-shop and per-practice mailto in tooltip (DOM
  payload) vs selection-card / feedback-page only; exact subject/body format
  (which point fields: id, name, postcode, hospice name); who owns the
  `encodeURIComponent` helper (shared `src/lib/` util).
- **OQ6 — Corrections schema**: stub shape (`[]` vs `{items: []}`), entry
  fields, whether `corrections.json` is edited by hand or by
  `scripts/add-correction.mjs`; whether the curation script is in scope
  (feature says "scripts/ + docs") — Research reads that as: at least one
  script helper *and* docs, but the script may be minimal.
- **OQ7 — Mobile mechanics**: overlay/sheet panel implementation (CSS
  `position:fixed` + toggle vs Bootstrap offcanvas if bundle is imported),
  marker size bumps (44 px guidance vs current 12/10 px), selection-card
  overflow fix, and which screens QA must verify in mobile emulation (exact
  viewport list for the QA stage).
- **OQ8 — Methodology rewording**: which sentences change (L58 "not geocoded
  yet" QA-8, L62 outside-catchment count, L96–97 flag explanation, L116
  Wales/NI 0-hospices caveat — should this caveat stay or soften now that
  Welsh/NI registers are documented-pending?), in whose voice (public-facing
  plain language).
- **OQ9 — GLOSSARY + ADR**: new terms to add (list at §6: land mask, land
  clip, corrections log, curation workflow, placeholder operator); ADR-0006
  to record the ADR-0001 reversal (rectangular → land-mask clip) with the
  alternatives (bbox-only, Natural Earth, raw OSM) and consequences
  (validator rewrite, new input file, ODbL attribution).
- **OQ10 — Surface**: new `<title>` + meta description wording; favicon
  decision (option: `data:` URI SVG, no new asset); whether the About/Privacy/
  Licences/Accessibility/Feedback/Corrections nav lives in header only,
  footer only, or both, and the canonical page order.

---

*Research pass complete. All 7 named areas have file-path/line evidence from
this session's reads/greps. Read-only: no working-tree files modified other
than `.agents/research.md`. No downloads, no network calls.*
