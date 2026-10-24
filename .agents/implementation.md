# Coding stage — implementation ledger

- Stage: 5/10 — Coding
- Date: 2026-10-21 (ledger finalised 2026-10-22 — all 37 pm items verified on disk)
- Scope: `.agents/pm.md` items 1.1–6.5 (37 items; supersedes the 2026-10-16 run's record — preserved in git history).
- Authoritative design: `.agents/architecture.md`, ADR-0006…0009, `.agents/pm.md`. No design changes, no new dependencies, no refactors, no TODOs.
- Final validation (2026-10-22, all green):
  - `npx tsc -b` — clean
  - `npm run build` — success (vite 5.4.21, 147 modules; `dist/` fresh)
  - `node scripts/validate-corrections.mjs` — exit 0 on the committed stub
  - `node --check` — passes on add-correction / validate-corrections / fetch-uk-land
  - `npm run build-data` — on 2026-10-22: fail-fast message emitted, exit 1 (land file absent; documented debt, blocked on 1.2)
- Invariants that held: land clip is fail-fast (no box-only fallback, no fake data);
  hide-not-delete (`outsideCatchment`, `hospiceId: null` stay in data + types); corrections
  fetch is page-local in CorrectionsPage, never in the `useAppData` gate in `src/App.tsx`;
  every contact/mailto reads `src/lib/siteConfig.ts` (mirror `data-raw/site-config.json`);
  the map loading gate fetches exactly 4 files (hospices, practices, catchments, shops) — no live-data.

## Item status

Updated after each item. Status: done | blocked (reason + exact human command) | code-done-validation-blocked.
Tally: 38 done (1.2 landed 2026-10-23; 1.3/1.4 post-land validation green 2026-10-23; 1.6/G7 diagnosis + guard 2026-10-24 — live verification remains human gate G7).

| # | Status | Files touched | Validation |
|---|--------|---------------|------------|
| 1.1 | done | `scripts/fetch-uk-land.mjs` (new) | `node --check` passes. Human fetch step — NOT executed on this host; lists 4 Overpass mirrors, UA + 30s backoff pattern cloned from `geocode-postcodes.mjs`, outputs `[lon,lat][]` rings (outers CCW / holes CW, closed), open bbox-edge fragments dropped, no hardcoded island list. |
| 1.2 | done (2026-10-23: human fetch executed on a networked machine; file in the work tree — G1 commit pending) | `data-raw/uk-land.json` (new), `data/README.md` | SHA-256 `038A1635F65D8AE28E8B6388E3EAEA1D29D5757FCB4C8B78C7C06CEC82653819` recorded in the `data/README.md` provenance row (this session's re-hash confirmed it). 22,999 polygons; point-in-mask check on 8 reference cities (London, Manchester, Birmingham, Leeds, Glasgow, Cardiff, Belfast, Dundee) passed — Ireland geometry confirmed present; raw file untouched thereafter (in-memory DP simplification on load — see ADR-0006 addendum). |
| 1.3 | done (2026-10-23: post-land validation green) | `scripts/build-data.mjs`, `scripts/land-mask.mjs` (new) | `node --check` passes. `npm run build-data` verified to FAIL FAST (exit 1) without `data-raw/uk-land.json` with the ADR-0006 message. `intersection(unionCell, ukLand)` after the per-label union; BOX `[-9.5, 49.5, 2.0, 61.5]` kept as voronoi safety net. POST-LAND (2026-10-23): first run crashed in `polygon-clipping` (mask's 5.29M ring endpoints > 1M priority-queue cap) — fixed with deterministic in-memory Douglas–Peucker (tol 0.001°) + per-cell bbox prefilter in `scripts/land-mask.mjs` (raw file never rewritten). `npm run build-data` ×2 exit 0, byte-identical (hospices `fced…a1af7` / practices `ff24…a68d` / shops `7e81…d9f79` unchanged vs pre-land; catchments `f9bf…39d2f` changed-as-expected); validator chain see 1.4. Full results in `.agents/qa.md` §A1 post-land run. |
| 1.4 | done (2026-10-23: post-land validation green) | `scripts/validate-tessellation.mjs` | `node --check` passes. Re-expressed to the ADR-0006 land invariants, replacing the box-based ones: (1) every cell ⊆ land via `difference(cell, ukLand)` with total outside-land area reported; (2) coverage = union of cells / `area(intersection(ukLand, box))` with a 1% tolerance; (3) pairwise overlap retained (shared Voronoi edges are zero-area); (4) empty cells (`polygons: []`) and slivers (< 0.0002 deg², e.g. Wisdom's clip seam) reported as warnings, non-fatal. Reads the SAME `data-raw/uk-land.json` as the build (self-consistency); fails fast with a message if the file is absent/empty. POST-LAND (2026-10-23): full run green — exit 0; sea leak 0.000390 deg² total (worst cell 0.000117, sub-tolerance clip seam); coverage 100.00% (42.1099 / 42.1090 deg²); pairwise overlap 0.0002 deg² (Wisdom, Rochester — two CQC location records for one site, risk-accepted data artifact); empty cells 1; slivers 0. Also consumes `scripts/land-mask.mjs` (same simplified geometry as the build — ADR-0006 self-consistency). QA §A1 vertex-level coastal spot-check: 85,602 vertices / 78,501 on-or-within-tolerance of coast / 0 violations. |
| 1.5 | done | `docs/MAINTENANCE.md`, `data/README.md` | Re-run chain gains the land-file step (`node scripts/fetch-uk-land.mjs` → rebuild) and the SHA-256 pin note; human-fetch list gains `data-raw/uk-land.json` with its command; corrections workflow + provenance line added (shared with 4.8). Both documents re-read on disk 2026-10-22 and name the fetch script, the land file, and the re-run order. (No `.gitignore` change was made — the land file is a committed build input per pm 1.2, not an ignored asset.) |
| 2.1 | done | `src/components/MapView.tsx` | tsc + build green. Practice tooltips render the assigned hospice name via `hospiceId` → hospices lookup. Visual confirmation is QA (A2) — no browser on this host. |
| 2.2 | done | `src/components/MapView.tsx` | tsc + build green. All 138 shop tooltips render the assigned hospice name. Visual confirmation is QA (A2). |
| 2.3 | done | `src/components/MapView.tsx`, `src/App.tsx` | tsc + build green. Selection card (App.tsx) shows name/town plus the assigned hospice; the card feeds the Area-4 "Disagree with this data?" mailto. Static read verified 2026-10-22. |
| 2.4 | done | `src/components/MapView.tsx` | tsc + build green. `hospiceId: null` practices show the postcode alone — no "no catchment match" / "not geocoded" strings. The 12 such practices remain in `public/data/practices.json` (hide, not delete). |
| 3.1 | done | `src/components/MapView.tsx` | tsc + build green. `SHOP_OUTSIDE_COLOR` and the special-case branch removed; shops keep normal catchment colouring. `outsideCatchment` intact: 21 flagged entries in `public/data/shops.json`, field in `src/lib/types.ts`. |
| 3.2 | done | `src/components/Methodology.tsx` | Unassigned count removed from the modal's statistics section (fixed 2026-10-21, re-read 2026-10-22 — no unassigned stat renders). |
| 3.3 | done | `src/components/HospicePanel.tsx` | Unassigned line removed; panel header now shows `{totalShown} practices` only (fixed 2026-10-21, re-read 2026-10-22). |
| 3.4 | done | `src/components/Methodology.tsx` | Geocoding/outside-catchment/zero-state lines reworded to plain language; no geocoding flags, outside-catchment, or internal zero-states render (re-read 2026-10-22). |
| 3.5 | done (verification only) | — | Committed `public/data/` still carries `outsideCatchment` on shops and null-assignment practices; `scripts/build-data.mjs` untouched by the hiding. Data spot-check: shops 138 (21 flagged), practices 9,564 (12 null-assignment), hospices 155. |
| 4.1 | done | `public/data/corrections.json` (new) | Committed, valid JSON `[]`. Always present → no 404 possible. |
| 4.2 | done | `src/lib/feedback.ts` (new) | tsc + build green. Builds `mailto:<siteConfig.contactEmail>?subject=…&body=…` via `encodeURIComponent` from point id, name, postcode, assigned hospice name — no hardcoded addresses. |
| 4.3 | done | `src/components/MapView.tsx` | tsc + build green. "Disagree with this data?" mailto (shared helper) on shop + practice tooltips and the hospice popup, plus the selection card. Visual confirmation is QA (A4/A6). |
| 4.4 | done | `src/pages/FeedbackPage.tsx` (new) | tsc + build green; re-read 2026-10-22. What-to-tell-us guidance, `mailto:` to `siteConfig.contactEmail` (subject prefilled), pointer to `#corrections`. No form, no endpoint, no tracking. |
| 4.5 | done | `src/pages/CorrectionsPage.tsx` (new) | tsc + build green; re-read 2026-10-22. Page-local `fetch('/data/corrections.json')` with cancelled-guard — NOT in the App `useAppData` gate (verified: App.tsx makes exactly the 4 data-gate calls). Entries render {date, summary, dataChanged} with a "data changed" badge; empty state "No corrections have been recorded yet."; contact line from siteConfig. (Tolerates a `{corrections:[…]}` wrapper via `?? []`; committed file is a bare array — see QA notes.) |
| 4.6 | done | `scripts/add-correction.mjs` (new) | `node --check` passes; full read 2026-10-22. Args: summary (required, non-empty), `--data-changed`, `--date YYYY-MM-DD` (ISO-validated); operator identity read from `data-raw/site-config.json` (fail-fast if absent); newest-first unshift with ordering guard (rejects a new entry older than the first current entry); runs the validator after write; writes only when both pass; exactly one entry per run. Not executed end-to-end here (it would modify the committed stub) — QA trial run required (see QA notes). |
| 4.7 | done | `scripts/validate-corrections.mjs` (new) | `node --check` passes. Exit 0 on the committed stub (verified 2026-10-22); exit 1 on malformed inputs (missing keys, non-ISO date, non-boolean `dataChanged`, oldest-first ordering) — malformed-input test verified 2026-10-21. |
| 4.8 | done | `docs/MAINTENANCE.md`, `data/README.md` | "Corrections workflow" section (receive → verify against source → fix `data-raw/` → full rebuild ritual → append via `scripts/add-correction.mjs` → commit) + `corrections.json` provenance line; both files re-read 2026-10-22 and name both scripts. |
| 5.1 | done | `data-raw/site-config.json` (new), `src/lib/siteConfig.ts` (new) | Placeholder values per ADR-0009 (`operatorName`, `contactEmail`); TS mirror carries DO-NOT-EDIT comment pointing at the JSON; `SITE_FOOTER_TEXT` footer constant for AppShell (item 5.3). Mirror equivalence re-verified 2026-10-22; grep: no other file hardcodes the operator name/email. |
| 5.2 | done | `src/lib/useRoute.ts` (new) | tsc + build green; full read 2026-10-22. `useRoute()` reads `window.location.hash` + `hashchange`, scroll-to-top on change; 7 routes (`#map` default, `#feedback`, `#corrections`, `#about`, `#privacy`, `#licences`, `#accessibility`); unknown hashes fall back to `#map`; no router library. |
| 5.3 | done | `src/components/AppShell.tsx` (new), `src/App.tsx` | tsc + build green; re-read 2026-10-22. Header: title (link to `#map`), 6 nav links, headerExtras slot (shops toggle + Methodology modal button); footer: same 6 links + `SITE_FOOTER_TEXT` (ODbL attribution); skip-link `#mainContent`; `main id="mainContent"`. Map page unchanged behind the shell. |
| 5.4 | done | `src/App.tsx` | tsc + build green; full re-read 2026-10-22. Route switch: `#map` → map view; other hashes → their page; route resolved BEFORE the loading gate (non-map pages load independently of map data); back/forward via `hashchange`; loading gate = exactly 4 `useAppData` calls (no corrections, no live-data). |
| 5.5 | done | `src/pages/AboutPage.tsx` (new) | tsc + build green; re-read 2026-10-22. Operator name/email from siteConfig; purpose, data sources in plain language (OSM coastline, OSM geocoding, CIW/RQIA register, charity shops), data freshness note, links to `#corrections` and Methodology. |
| 5.6 | done | `src/pages/LegalPage.tsx` (new) | tsc + build green; re-read 2026-10-22. `PrivacyPage`: UK GDPR + DPA 2018, no cookies/analytics/telemetry, no server-side collection (mailto only), OSM IP disclosure, last-updated date. |
| 5.7 | done | `src/pages/LegalPage.tsx` | `LicencesPage`: ODbL statement + OGL; attributions for OSM coastline, OSM tiles, OSM Nominatim, CIW/RQIA register (SEC-4); hospice register; software licences. Re-read 2026-10-22. |
| 5.8 | done | `src/pages/AccessibilityPage.tsx` (new) | tsc + build green; re-read 2026-10-22. WCAG 2.1 AA commitment, what's in place (keyboard nav, ARIA on map controls, focus management), known limitations (colour-carried legend meaning; canvas markers), issue-report mailto via siteConfig. |
| 5.9 | done | `src/main.tsx` | `import 'bootstrap/dist/js/bootstrap.esm.js'` present (verified 2026-10-22); tsc + build green; no new npm dependency. Methodology modal open/close is QA (A5). |
| 5.10 | done | `index.html`, `package.json` | Re-read 2026-10-22: `<title>UK Hospice Catchment Map</title>` + UK-wide meta description (no "Lancashire & South Cumbria"); package.json description UK-wide. |
| 6.1 | done | `src/styles.css`, `src/App.tsx` | tsc + build green; styles re-read 2026-10-22. ≤768px: `.app-panel` becomes an absolute bottom sheet (`height:min(55vh,480px)`, `z-index:1600`, off-canvas `translateY(105%)` → `.app-sheet-open: translateY(0)`); FAB (min-height 48px) + scrim, `aria-expanded` on the FAB, `aria-controls="appPanel"`. Toggle is a CSS class only — `MapView` stays mounted (no remount). Desktop: FAB/scrim `display:none`, panel in its normal column. Runtime no-remount proof is QA (A6). |
| 6.2 | done | `src/styles.css` | Selection card capped to the viewport within the sheet media query — no horizontal scroll at 360px (static read; browser proof QA A6). |
| 6.3 | done | `src/components/MapView.tsx` | tsc + build green. CircleMarker hit radii bumped (canvas-rendered hit area: 5px/7px radii, interactive) — comfortably tappable check is QA (A6). |
| 6.4 | done | `src/components/MapView.tsx` | tsc + build green. `preferCanvas: true` on `MapContainer` (~9,552 markers + 155 cells + 138 shop markers). First-paint re-measured by QA (A6). |
| 6.5 | done | `.agents/implementation.md` (this file) | Checklist recorded in "Summary for QA" below (viewports 360×640, 375×667, 414×896 + checks). QA owns execution. |
| 1.6 (G7) | done (diagnosis + diagnosability guard only; live verification outstanding — human gate G7) | `scripts/fetch-uk-land.mjs`, `.agents/pipeline.md` | 2026-10-24: background re-fetch (`node scripts/fetch-uk-land.mjs`, bg_0445a1b2, exit 1) reached kumi with `fetched 35476 coastline elements`, then crashed: `Cannot read properties of undefined (reading 'toFixed')` — localised to `key(pt)`: at least one geometry point lacks a numeric `lon`/`lat`. Landed `data-raw/uk-land.json` re-hash unchanged (`038A16…3819`, 57,211,893 bytes). Kumi follow-up probe (committed query): 504 `request_read_and_idx::timeout` / "too busy" — mirror-gated, no retry. `key()` now throws with the offending point's JSON (diagnosability only — skipping points would open rings/drop islands, ADR-0006; the crash already prevents a partial write). `node --check` passes. Human command when a mirror has capacity: `node scripts/fetch-uk-land.mjs`; the printed point shape grounds the real fix. Full G7 close-out = re-fetch + SHA-256 re-pin in `data/README.md` + byte-identical build ×2 + `validate-tessellation.mjs` green. |

## Byte-identical rebuild ritual (pm 1.3)

Two `npm run build-data` runs; SHA-256 of `public/data/{hospices,practices,catchments,shops}.json`
(corrections.json exempt) must be byte-identical.

- Run 1: _blocked — land file absent (1.2); build fails fast by design_
- Run 2: _blocked — land file absent (1.2); build fails fast by design_

Hashes to be recorded in `.agents/qa.md` once a human runs the fetch (one run here, one run in
QA; the two-run determinism proof is QA's after the file lands).

## Summary for QA

All 37 items addressed: 33 done, 1.2 blocked on a human land fetch, 1.3/1.4 code-done with
validation blocked on 1.2. Static validation fully green (see header). Handoff by acceptance
item:

### A1 — Coastline clip (blocked pending the human land fetch)

- Human command: `node scripts/fetch-uk-land.mjs` on a networked machine → commit
  `data-raw/uk-land.json` → record its SHA-256 in `data/README.md`.
- After the file lands: (1) two `npm run build-data` runs — record both SHA-256 sets in
  `.agents/qa.md` (byte-identical, corrections.json exempt); (2) `npm run build-data` must pass
  and `node scripts/validate-tessellation.mjs` must pass (cell ⊆ land; coverage ≈ land∩bbox;
  overlap ≈ 0; empty/sliver as warnings); (3) delete-file fail-fast re-check: remove
  `data-raw/uk-land.json`, `npm run build-data` must exit ≠ 0, then restore the file; (4)
  browser spot-check of coastal cells (no cell overflows past the coastline).

### A2 — Tooltips (statically verified; browser-verify)

Practice + shop tooltips render the assigned hospice name; the 12 unassigned practices show a
neutral postcode-only label. No browser on the coding host — spot-check shop and practice
tooltips on `#map`.

### A3 — Public-safe (verified on disk)

No outside-catchment rendering (no orange, no ⚠ badge), no unassigned counts in Methodology or
the panel, no geocoding-flag strings anywhere on-screen. Hide-not-delete intact: 21 shops with
`outsideCatchment: true` and 12 practices with `hospiceId: null` remain in `public/data/` and
`src/lib/types.ts`.

### A4 — Feedback + corrections

- Every interactive marker carries the "Disagree with this data?" mailto to
  `siteConfig.contactEmail` (tooltips + selection card) — browser-verify a few.
- `#feedback` and `#corrections` render; corrections shows "No corrections have been recorded
  yet."
- `node scripts/validate-corrections.mjs` → exit 0 on the committed stub.
- Trial run `node scripts/add-correction.mjs "QA trial entry" --date <today>` → expect one valid
  newest-first entry + validator pass; then **revert the file to `[]`** (the log ships empty;
  pm NON-goals). Also verify the ordering guard: a `--date` older than an existing entry fails.
- Draw `#map` with the corrections fetch failing (e.g. temporarily rename the file) — the map
  must be unaffected (page-local fetch).
- `docs/MAINTENANCE.md` "Corrections workflow" + `data/README.md` provenance line present.

### A5 — About/legal + shell

- `#about`, `#privacy` (UK GDPR + DPA 2018; no cookies/analytics), `#licences` (ODbL + OSM
  coastline/tiles/Nominatim + CIW/RQIA), `#accessibility` (WCAG 2.1 AA) all render with working
  header nav + footer; back/forward via hashchange; skip-link works.
- Operator name/email come only from `src/lib/siteConfig.ts` / `data-raw/site-config.json`
  (grep confirms no other hardcoded values).
- Bootstrap ESM import present; Methodology modal opens/closes in a browser.
- `<title>` = "UK Hospice Catchment Map"; meta description UK-wide; no "Lancashire" anywhere
  (grep).

### A6 — Mobile (pm 6.5 checklist — owner: QA)

Viewports (emulated): **360×640, 375×667, 414×896** (iPhone/Android).
Checks per viewport:
1. Marker tap → tooltip → "Disagree with this data?" mailto (shop + practice).
2. Methodology modal opens and closes (Bootstrap ESM).
3. Panel toggle (FAB) → bottom sheet overlays the map; **map does not remount** (marker layer
   persists; e.g. zoom/selection state survives; no full redraw).
4. Scrim covers the map while the sheet is open; FAB `aria-expanded` toggles.
5. Selection card fits — no horizontal scroll from the card.
6. No horizontal scroll on any of the 7 routes.
7. FAB / touch targets ≥ 44px.
8. First-paint acceptable (pre-agreed remedy in place: `preferCanvas: true`).

### QA notes (observations, non-blocking)

1. `docs/MAINTENANCE.md`'s "coverage invariant" wording is slightly imprecise: the point-coverage
   invariant (every shop/GP practice assigned to a hospice; distance check) is asserted in
   `build-data.mjs`, not in `validate-tessellation.mjs` — the validator checks cell ⊆ land,
   union-coverage vs land∩bbox, pairwise overlap, and slivers/empty warnings.
2. `CorrectionsPage` reads `json.corrections ?? []` (tolerates a `{corrections: […]}` wrapper);
   the committed file and the curation script use a bare array — works as committed.
3. Mobile sheet: the off-canvas panel is hidden by transform (not `display:none`), so its controls
   remain in tab order when the sheet is closed — verify keyboard focus behaviour in emulation;
   `aria-expanded` on the FAB carries the state.
4. No live-data: the map gate fetches exactly 4 files; there is no analytics, no form, no
   server-side collection anywhere (asserted on About/Privacy pages).
