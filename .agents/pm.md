# PM work list — public-ready decisions (feature.md, UK-wide)

Source of truth: `.agents/feature.md` (6 acceptance items). Design is fixed by
`.agents/architecture.md` + ADRs 0006–0009. All paths below verified in the repo.
Verification on this host: `npx tsc -b` + `npm run build`; browser checks are QA-stage items.

## 1. Coastline clip (ADR-0006)

| id | Item | Files to touch | Done when |
|----|------|----------------|-----------|
| 1.1 | Write land-file fetch script (human fetch step, NOT run here): Overpass `natural=coastline` within BOX `[-9.5, 49.5, 2.0, 61.5]`, output committed as `[lon,lat][]` rings; no hardcoded island list (file = whatever Overpass returns for the bbox); clone `scripts/geocode-postcodes.mjs` UA / 1 req/s / backoff pattern | create `scripts/fetch-uk-land.mjs` | script exists, is the only documented way to (re)produce `data-raw/uk-land.json`, and lists ≥ 2 source options (Overpass mirrors) for retry |
| 1.2 | Human fetch: run `node scripts/fetch-uk-land.mjs` on a networked machine, commit the land file, record its SHA-256 once as provenance (a re-fetch = rebuild event) | create `data-raw/uk-land.json`; update `data/README.md` (raw-inputs row: source, date, ODbL, SHA-256) | `data-raw/uk-land.json` is committed with a provenance line; build and validator read this exact file |
| 1.3 | Clip per-label unions to land: load land file, `intersection(unionCell, ukLand)` after the per-label union; **fail fast (exit ≠ 0) if the land file is absent — no silent box-only fallback**; keep BOX `[-9.5, 49.5, 2.0, 61.5]` as the voronoi safety net; land file is build input (not shipped) | modify `scripts/build-data.mjs` | two `npm run build-data` runs are byte-identical (SHA-256 match, hashes recorded in `.agents/qa.md`), no cell extends into the sea, and deleting `data-raw/uk-land.json` fails the build |
| 1.4 | Re-express the land invariants: (1) every cell ⊆ land, (2) coverage ≈ `area(land ∩ bbox)` (retire the old 100% box-coverage check), (3) empty cells `polygons: []` reported non-fatally, (4) slivers < 0.0002 deg² (Wisdom: 0.000186) pass with a warning; keep the 0.00 pairwise-overlap tolerance; same land file as the build | modify `scripts/validate-tessellation.mjs` | validator passes on clipped data, flags synthetic sea cells, and reports empty/sliver cells as warnings without failing |
| 1.5 | Provenance + maintenance docs: re-run chain gains the land-file step; human-fetch list gains the land file; note land-file SHA-256 pin | modify `docs/MAINTENANCE.md`; `data/README.md` | MAINTENANCE.md re-run chain and fetch list include `data-raw/uk-land.json` + its fetch command |

## 2. Tooltips show assigned hospice

| id | Item | Files to touch | Done when |
|----|------|----------------|-----------|
| 2.1 | GP/practice markers: tooltip shows the assigned hospice name (look up `hospiceId` → hospices list already in `useAppData`) | modify `src/components/MapView.tsx` | every placed practice tooltip renders its hospice's name (browser-verified by QA) |
| 2.2 | Shop markers (138): tooltip shows the assigned hospice name | modify `src/components/MapView.tsx` | every shop tooltip renders its hospice's name |
| 2.3 | Selection card: assigned hospice name visible on shop/GP selection (card feeds the Area-4 mailto) | modify `src/components/MapView.tsx` | selecting a shop or practice shows the hospice name in the card |
| 2.4 | Neutral unassigned-practice label: tip on `hospiceId: null` practices shows the postcode alone (no "no catchment match", no "not geocoded") | modify `src/components/MapView.tsx` | no internal-state string renders for the 12 unassigned practices |

## 3. Public-safe: hide, don't delete

| id | Item | Files to touch | Done when |
|----|------|----------------|-----------|
| 3.1 | Remove the shop "⚠ Outside its own catchment" badge + `SHOP_OUTSIDE_COLOR = '#e07b00'` (remove the special-case branch so shops keep normal catchment colouring; the `outsideCatchment` field stays in the data and types) | modify `src/components/MapView.tsx` | no orange outside-catchment rendering; `outsideCatchment` still present in `public/data/shops.json` and `src/lib/types.ts` |
| 3.2 | Remove unassigned counts from the Methodology modal | modify `src/components/Methodology.tsx` | no unassigned count renders in Methodology |
| 3.3 | Remove the unassigned line from the hospice panel | modify `src/components/HospicePanel.tsx` | no unassigned count renders in the panel |
| 3.4 | Public-safe rewording of Methodology lines: L58 "not geocoded yet", L62 outside-catchment count, L96–97 flag explanation, L116 Wales/NI 0-hospices caveat — plain language, no internal-state exposure | modify `src/components/Methodology.tsx` | Methodology renders no references to geocoding flags, outside-catchment, or internal zero-states |
| 3.5 | Verify the data build is untouched by the hiding: `outsideCatchment` (build-data L233) and `hospiceId: null` practices remain | no change (verification only: `scripts/build-data.mjs`) | committed `public/data/` still carries `outsideCatchment` on shops and null-assignment practices |

## 4. Feedback + corrections log

| id | Item | Files to touch | Done when |
|----|------|----------------|-----------|
| 4.1 | Commit the corrections stub: `[]` | create `public/data/corrections.json` | committed, valid JSON `[]` (always present in the repo → no 404 possible) |
| 4.2 | Create the shared mailto helper (OQ5 resolution: per-marker tooltip mailto): builds `mailto:<email>?subject=…&body=…` via `encodeURIComponent` from point id, name, postcode, assigned hospice name, and `siteConfig.contactEmail` | create `src/lib/feedback.ts` | helper produces a valid encoded `mailto:` from the point fields + siteConfig |
| 4.3 | Per-marker "Disagree with this data?" mailto on shop + practice markers (tooltip and selection card) | modify `src/components/MapView.tsx` | every interactive shop/practice marker carries the mailto affordance (138 shops + ~9,552 practices) |
| 4.4 | Feedback page (`#feedback`): what to tell us, mailto to `siteConfig.contactEmail`, pointer to the corrections log | create `src/pages/FeedbackPage.tsx` | page renders with a working mailto + link to corrections |
| 4.5 | Corrections page (`#corrections`): **page-local fetch** of `/data/corrections.json` — must NOT join the `useAppData` 4-file gate in `src/App.tsx`; entries render as {date, summary, dataChanged}; empty state "No corrections yet"; contact line from siteConfig | create `src/pages/CorrectionsPage.tsx` | `#corrections` shows the empty state; map never depends on the corrections fetch |
| 4.6 | Curation convenience script: appends one validated entry to `public/data/corrections.json` (reads `data-raw/site-config.json` for operator identity in the entry) | create `scripts/add-correction.mjs` | running it appends a schema-valid entry to the committed file |
| 4.7 | Validator: `public/data/corrections.json` is an array; entries have non-empty `date` (ISO), `summary`, boolean `dataChanged` | create `scripts/validate-corrections.mjs` | exits 0 on the committed stub, exits ≠ 0 on a malformed entry |
| 4.8 | Docs: "Corrections workflow" section (receive → verify against source → fix `data-raw/` → full rebuild ritual → append log entry → commit); `corrections.json` provenance line | modify `docs/MAINTENANCE.md`; `data/README.md` | both sections/lines exist and name the scripts above |

## 5. About / legal pages + placeholder operator

| id | Item | Files to touch | Done when |
|----|------|----------------|-----------|
| 5.1 | Site config single source (ADR-0009): `SiteConfig {operatorName, contactEmail}` interface + exported const with placeholder values and a `DO NOT EDIT HERE` comment pointing at the canonical JSON; every mailto/page/log contact reads this | create `src/lib/siteConfig.ts`; create `data-raw/site-config.json` | one shared source exists; no other file hardcodes the operator name/email |
| 5.2 | Hash routing hook (ADR-0007): `useRoute()` reads `window.location.hash` + `hashchange`; routes `#map` (default, unknown-hash fallback), `#feedback`, `#corrections`, `#about`, `#privacy`, `#licences`, `#accessibility`; scroll-to-top on change; no router library | create `src/lib/useRoute.ts` | hook returns the right route for each hash; unknown hashes fall back to `#map` |
| 5.3 | App shell (ADR-0007): header (existing title + shops toggle + Methodology modal button, now with nav links `#feedback` `#corrections` `#about` `#privacy` `#licences` `#accessibility`) + footer (same links + ODbL attribution text; footer text constant in siteConfig) + page content | create `src/components/AppShell.tsx`; modify `src/App.tsx` | every page renders header nav + footer; map page is unchanged behind the shell |
| 5.4 | Route switch in App: `#map` → existing map view; each other hash → its page component | modify `src/App.tsx` | all 7 hashes render the correct page; back/forward navigate via hashchange |
| 5.5 | About page (`#about`): named placeholder operator (from siteConfig), purpose, data sources in plain language, link to corrections log | create `src/pages/AboutPage.tsx` | page renders the operator name/email from siteConfig |
| 5.6 | Privacy page (`#privacy`): UK GDPR + DPA 2018; no cookies, no analytics, no server-side data collection (mailto only) | create `src/pages/LegalPage.tsx` | page states the GDPR/DPA basis and the no-cookies/no-analytics position |
| 5.7 | Licences & attribution page (`#licences`): ODbL statement + attribution for OSM coastline, OSM map tiles, OSM Nominatim geocoding, and CQC-derived register data (SEC-4); source list matches `data/README.md` provenance | create `src/pages/LegalPage.tsx` | page carries the ODbL license text and all four attributions |
| 5.8 | Accessibility page (`#accessibility`): WCAG 2.1 AA commitment, current known gaps (e.g. map legends, keyboard access), how to report issues (mailto via siteConfig) | create `src/pages/AccessibilityPage.tsx` | page renders with the statement + contact route |
| 5.9 | Bootstrap JS entry (ADR-0008): `import "bootstrap/dist/js/bootstrap.esm.js"` in main (unblocks the `data-bs-toggle="modal"` Methodology modal and any nav/panel components) | modify `src/main.tsx` | import present; `npm run build` passes; modal open/close verified by QA in a browser |
| 5.10 | Stale surface metadata: new UK-wide `<title>` + `meta description` (OQ10); description field in package.json | modify `index.html`; `package.json` | title/description no longer say "Lancashire & South Cumbria" |

## 6. Mobile

| id | Item | Files to touch | Done when |
|----|------|----------------|-----------|
| 6.1 | Panel as overlay/sheet on small screens: the 340px column becomes a `position:fixed` overlay/sheet with a toggle; keep it mounted (visibility toggle only — no remount, so the ~9,552-marker map is not re-rendered); sits on top of the 768px breakpoint | modify `src/styles.css` (toggle markup in `src/components/MapView.tsx` / `AppShell.tsx` if needed) | at 360px width the panel overlays the map instead of squeezing it, and toggling does not remount the map |
| 6.2 | Selection-card fit: card `max-width` overflows 360px viewports — cap it to the viewport | modify `src/styles.css` | no horizontal scroll from the card at 360px |
| 6.3 | Touch targets: bump marker hit size (currently 12/10px CircleMarker radii, vs 44px guidance); canvas-rendered hit area if needed | modify `src/components/MapView.tsx` | markers are comfortably tappable in mobile emulation (QA) |
| 6.4 | `preferCanvas: true` on the MapContainer (pre-agreed mobile first-paint remedy; ~9,552 markers + 155 cells + 138 shop markers) | modify `src/components/MapView.tsx` | prop present and build passes; mobile first-paint re-measured by QA |
| 6.5 | QA mobile checklist: exact viewport list (360×640, 375×667, 414×896 iPhone/Android emulation) + the checks to run (marker tap → tooltip → mailto, modal open/close, panel toggle, no horizontal scroll on any page) | update `.agents/implementation.md` (handoff note — QA owns execution) | checklist recorded for the QA stage |

## Dependency order (strict)

1. **1.2 land file committed first** — 1.3 and 1.4 consume `data-raw/uk-land.json`; the build cannot pass the new invariants before the file lands. (1.1 can be written any time; it is a human-run step.)
2. **4.1 stub + 4.7 validator** before 4.5 (page-local fetch assumes the committed stub exists).
3. **5.1 siteConfig** before 4.2–4.5 and 5.5 (mailto helper, Feedback/Corrections pages, About all read the shared source) and before 4.6 (add-correction reads the JSON).
4. **5.9 Bootstrap JS import** before anything that relies on modal/nav/panel behavior (5.3 shell components, the Methodology modal), and before 2.x/6.x browser verification.
5. **5.2 useRoute + 5.3 AppShell** before 5.4 (route switch), which is before 5.5–5.8 (pages) — pages can be written earlier, but they render only once wired.
6. **5.x pages before the footer/nav content is finalised** — AppShell (5.3) is the nav + footer owner; land in the shell once the page set exists so links point at real routes.
7. **2.x and 3.x both edit MapView.tsx** — order 2 (add hospice name) → 3 (remove badges/strings) to keep the file edits sequential; 3.1 depends on 1.3's data (outsideCatchment recomputed against clipped cells).
8. **4.x after 5.1** (siteConfig) and after 6.3-adjacent tooltip work is stable — the mailto affordance rides on the same tooltip surface as 2.x.
9. **6.x last**: mobile CSS (6.1–6.2) after the shell/panel DOM is final (5.3); 6.4/6.5 after all map-surface edits settle. All 6.x verification is QA-stage.

## NON-goals (explicit)

- No backend, no form service, no analytics/telemetry, no authentication (mailto is the only contact transport).
- No actual corrections applied to the data — the log ships empty; `scripts/add-correction.mjs` is a convenience, the fix itself is a human curation act.
- Wales/NI register gaps remain (placeholder `[]` files, 0-Wales/NI hospices) until the documented human fetches land; no new data sources.
- No catchment-method change: single-nearest-hospice rule stays; ADR-0006 changes the *clip*, not the rule. BOX `[-9.5, 49.5, 2.0, 61.5]` is retained as the voronoi safety net.
- No design changes: architecture.md + ADRs 0006–0009 are fixed; do not re-litigate routing, modal, config, or clip decisions.
- No pipeline contract (QWEN.md) or agent-definition changes.
- No new runtime dependencies allowed; everything must build with the existing `package.json` (browser verification is a QA-stage dependency, not a coding one).

## Done when (QA checklist — maps 1:1 to the 6 feature acceptance items)

- [ ] **A1 Coastline clip**: `data-raw/uk-land.json` committed with provenance + SHA-256; build clips every cell to land and fails fast without the file; two `npm run build-data` runs byte-identical (hashes in `.agents/qa.md`); validator runs the land invariants (cell ⊆ land; coverage ≈ land∩bbox; empty cells reported; slivers warn); no cell overflows past the coastline (spot-check coastal cells in browser).
- [ ] **A2 Tooltips**: every shop marker (138) and GP practice marker tooltip names its assigned hospice; unassigned practices show a neutral postcode-only label.
- [ ] **A3 Public-safe**: no on-screen "outside catchment" badges, no unassigned counts, no geocoding-flag strings in Methodology/panels/tooltips; `outsideCatchment` and null assignments still present in `public/data/` (hide, not delete).
- [ ] **A4 Feedback + corrections**: every interactive marker carries a "Disagree with this data?" mailto to the shared operator address; `#feedback` and `#corrections` pages render (log shows "No corrections yet"); `scripts/add-correction.mjs` + `scripts/validate-corrections.mjs` work; corrections fetch is page-local (map unaffected by its absence); MAINTENANCE.md documents the workflow and `data/README.md` carries the provenance line.
- [ ] **A5 About/legal**: `#about`, `#privacy` (UK GDPR + DPA 2018, no cookies/analytics), `#licences` (full ODbL statement + OSM/coastline/tiles/Nominatim + CQC-derived attribution), `#accessibility` (WCAG 2.1 AA) all render with working header nav + footer; operator name/email come from `src/lib/siteConfig.ts` / `data-raw/site-config.json` only; Bootstrap ESM import present; Methodology modal opens/closes in a browser; title/description no longer claim Lancashire & South Cumbria.
- [ ] **A6 Mobile**: verified in a mobile-emulated browser at 360×640 / 375×667 / 414×896 — panel overlays (no squeeze), selection card fits, markers tappable, modal works, no horizontal scroll on any page; map does not remount on panel toggle; first-paint acceptable (else pre-agreed remedies already in place: `preferCanvas`).

## Notes for Coding (conflicts & caveats — ADRs win over research/architecture)

- **Dangling schema reference**: architecture §7.4 cites a "§5.1 schema" for corrections entries that does not exist in architecture.md — the intended schema is research §7.1: minimal `{date, summary, dataChanged}` (kind/point id/hospice id optional). Use that.
- **Island coverage**: ADR-0006 says the land file covers islands "only if present in the OSM extract" (i.e. whatever Overpass returns for the bbox) — do not hardcode an island list in code or docs.
- **Mailto placement (OQ5)**: resolved to per-marker tooltip mailto by architecture's feature-acceptance mapping ("every interactive marker carries the affordance") — implement via the shared helper in `src/lib/feedback.ts` (item 4.2).
- **validate-corrections.mjs**: architecture §6.1 requires it; research only calls add-correction.mjs "a convenience" — ship both (both are in the work list; docs in item 4.8 are mandatory for feature acceptance).
- **Correction: `scripts/validate-corrections.mjs` is a new file, not an edit** — research's risk-5 gating warning is about `src/App.tsx` only; never add the corrections fetch to the `useAppData` gate.
- **GLOSSARY "clip box → not to coastline" reversal**: architect-owned (GLOSSARY.md already modified at the Architect stage) — not a Coding task.
- **Byte-identity scope**: the two-run ritual compares `public/data/*.json`; `corrections.json` is exempt from determinism (human-edited, shipped verbatim) — see architecture §6.
- **No browser on this host**: items marked (browser-verified by QA) cannot be self-verified here — `npx tsc -b` + `npm run build` is the max coding-stage check; hand the 6.5 checklist to QA.
- **OQ9/GLOSSARY**: Coding should use existing GLOSSARY terms in names and prose; do not invent new vocabulary terms.