# QA — Cycle 2

- **Date:** 2026-10-26 (QA re-verification pass)
- **Scope:** `475675a + uncommitted Cycle-2 working tree`
- **Method:** independent re-verification of the core subset by direct command /
  file inspection; heavy tesselation + byte-identity chain cited from the
  lead's 20:50 re-run per dispatch (not re-run by QA). No commits, no new
  deps, only this file + `hindsight.md` touched.
- **Supersedes:** the earlier Cycle-2 QA report previously in this file
  (same stage, prior context window); this is the final Cycle-2 report.

## QA-fresh re-checks (2026-10-26, this pass)

| Check | Result |
|---|---|
| `npm run build` | exit 0 (tsc -b + vite, 148 modules) |
| `npm run check:layout` | exit 0 (`src/styles.css` unchanged) |
| W2 `hospices.find` in MapView.tsx | 1 (line 72, FitToSelection); only other src hit is pre-existing `App.tsx:47` panel lookup — consistent with lead fact |
| W4 `markercluster` in package*.json | 0 matches |
| W6 `<Tooltip` in src | 2 (MapView.tsx:130, 348) |
| G6 `flex-direction` in styles.css | 3 (L13 column, L25 row, L167 column) |
| W11 absent phrases (`unassigned`/`no catchment`/`data gap`) in src | 0 matches |
| W11 network APIs in `src/lib/feedback.ts` (fetch/XHR/WebSocket/navigator) | 0 matches |
| W11 `onOpenHospice` wiring | App.tsx:186 passes `select`; StartHere.tsx:15/28/105 defines, receives, uses |
| W12 `data/README.md` | L122 B1 email section; L60 "…show 0 hospices until…" current-state line |
| W13 `Methodology.tsx` | L51 "not published in bulk" present |
| m3 vs `dist/data/practices.json` (QA node script, 0.5° buckets; `GRID = 0.5`, `ZOOM_LOD = 11`) | 10,475 records, 10,463 placed, 186 distinct buckets |
| W10 vs `dist/data/hospices.json` (QA node script) | 155 hospices, 7 `kind==="published"` |
| W7 debounce | `SEARCH_DEBUNCE_MS = 200`, trailing `setTimeout` → `onQuery` (HospicePanel.tsx:17/54) |
| W9 PWA in dist | `dist/index.html` links `/manifest.webmanifest` + `/logo.svg`; both files exist in dist |
| Tesselation / byte-identity | not re-run (heavy chain); cited: lead re-run 2026-10-26 20:50 — `build-data` exit 0, 4× SHA-256 byte-identical (dc261185 e11322ba 2a87a374 5628d8f7), `validate-tessellation` exit 0 |

No disagreement with any lead-verified fact was found.

## W1 baseline (prior QA, Chrome: Slow 4G + 4× CPU)

| Metric | Value |
|---|---|
| m1 navigation → first painted markers | 1677 ms |
| m2 5-char search re-filter latency | 435 ms |
| m3 markers rendered | 10,475 (every practice as an individual marker, pre-fix) |
| m4 navigation → interactive | 1391 ms |

## Post-fix status

- **m3 — verified:** zoom < 11 renders **186** 0.5° grid buckets (one marker per
  bucket, no per-practice DOM); zoom ≥ 11 renders **10,463** CircleMarkers
  (full placed set; `GRID = 0.5`, `ZOOM_LOD = 11`, MapView.tsx:153–154, 204).
  QA computed the bucket count directly over the shipped dist data.
- **m1 / m2 / m4 — post-fix values pending the human G5 Chrome pass**
  (Slow 4G + 4× CPU); baselines above remain the comparison reference.

## Per-item acceptance (W1–W13)

| Item | Acceptance | Status | Evidence |
|---|---|---|---|
| W1 | Perceived-load baseline table recorded; m3 re-measured | PASS (m3) / pending G5 (m1, m2, m4) | Baseline table above; m3 = 186 buckets / 10,463 markers below |
| W2 | MapView uses `hospices.find` exactly once (FitToSelection) | PASS | grep: 1 hit in MapView.tsx:72; second src hit (App.tsx:47) is pre-existing panel lookup, out of MapView scope |
| W3 | `build-data` fail-fast, byte-identity (0 `', null, 2'` in script) | PASS (cited) | Lead re-run 20:50: exit 0, 4× SHA-256 identical; grep `', null, 2'` = 0 per lead |
| W4 | No markercluster dependency | PASS | 0 matches in package.json + package-lock.json |
| W5 | Bucket click flies to full markers | PASS (code) / live click in G5 | MapView.tsx:212 `map.flyTo([b.lat, b.lon], ZOOM_LOD)` on bucket click |
| W6 | Exactly 2 `<Tooltip>` | PASS | grep: 2 (MapView.tsx:130, 348) |
| W7 | Search debounces 200 ms before `onQuery` | PASS (static) / live cadence in G5 | `SEARCH_DEBUNCE_MS = 200`, trailing timer (HospicePanel.tsx:17, 54) |
| W8 | Stride gate decision | DEFERRED (by design) | Awaits G5 post-fix m1 vs baseline 1677 ms; decision recorded pending |
| W9 | PWA-ready: icon + manifest wired, files ship | PASS | `dist/index.html` links manifest + icon; `dist/logo.svg`, `dist/manifest.webmanifest` present |
| W10 | Panel sorts A→Z default, Z→A, practices desc; published toggle → exactly 7 rows | PASS (data + logic) / live toggle in G5 | 7 `kind==='published'` in dist data; filter `h.kind === 'published'`, sort modes `name-asc`/`name-desc`/`practices-desc` (HospicePanel.tsx:19, 58–80, 71) |
| W11 | Start-here card: no absent phrases; no network in feedback module; open-hospice wired | PASS | 0 matches for absent phrases across src; 0 network APIs in `src/lib/feedback.ts`; `onOpenHospice` wired (App.tsx:186 → StartHere.tsx:105) |
| W12 | `data/README.md` B1 email section + "0 hospices" current-state line | PASS | L122, L60 (verified above) |
| W13 | Methodology discloses bulk-availability inequality | PASS | `Methodology.tsx:51` "not published in bulk" |
| G6 | Layout guard green; `styles.css` has exactly 3 `flex-direction` | PASS | `npm run check:layout` exit 0; count = 3 |
| Build | `npm run build` green | PASS | exit 0, re-run this pass |

## G5 pre-run checklist (human Chrome pass, Slow 4G + 4× CPU)

| # | Check | Baseline | Verified by | Remaining for human pass |
|---|---|---|---|---|
| 1 | m1 navigation → first painted markers | 1677 ms | — | Measure post-fix value |
| 2 | m2 5-char search re-filter latency | 435 ms | — | Measure post-fix value |
| 3 | m3 markers rendered | 10,475 | **PASS — lead + QA** (186 buckets at zoom < 11; 10,463 CircleMarkers at zoom ≥ 11) | None |
| 4 | m4 navigation → interactive | 1391 ms | — | Measure post-fix value |
| 5 | W5: click a grid bucket → flies to zoom 11, full markers appear | — | Code verified (MapView.tsx:212) | Live click |
| 6 | W7: typing shows ~200 ms debounce cadence before re-filter | — | Static verified (SEARCH_DEBUNCE_MS = 200) | Live cadence |
| 7 | W10: sort A→Z default, Z→A, practices desc; toggle "Has published service area" → EXACTLY 7 rows | — | Data + logic verified (7 published in dist data; filter `kind==='published'`) | Live toggling |
| 8 | W11: postcode search flow (e.g. BD14 6NF — verified real by lead) → start-here card → "Open" button selects hospice | — | Static verified (wiring + not-found wording) | Live postcode flow |

**W8 stride gate:** decision deferred until G5 row 1 (m1) returns; if post-fix
m1 meets the strategy in ADR-0010, the gate closes without code changes.

## Findings

1. **F-1 — Risk-accepted (carried over, confirmed this pass):** `kind='published'`
   count is **7**, not the 20 curated hospices. `scripts/catchment-map.mjs` marks
   only the 7 of 20 whose service area is stated on the hospice's own website.
   Data is internally consistent and matches the lead's ground truth; the panel's
   "Has published service area" toggle intentionally resolves to exactly 7 rows.
   Documented debt, does not block.
2. No new findings. Every QA-fresh re-check agreed with the lead-verified facts;
   zero disagreements.

## Verdict: **PASS**

Zero Blocking findings. m1/m2/m4 post-fix measurements and the W5/W7/W10/W11
live interactions are gated on the human G5 Chrome pass (checklist above);
W8 awaits G5's m1. None of these are blocking defects — they are the
pre-defined human-gated verification for this cycle.

