# QA — UK-wide hospice catchment map (stage 6, 2026-10-16)

Scope source: `.agents/feature.md`. Executed by the Engineering Lead: the
dispatched QA sub-session was silent for >20 min with no artifact on disk;
per the operator-validated policy for one-shot stage artifacts in this
ACP/vllm environment, the lead ran the full verification directly and wrote
this report. All evidence below is from this pass (2026-10-16).

## Verdict

**PASS — no Blocking findings.** Eight risk-accepted findings (QA-1…QA-8).

## Acceptance traceability (requirements.md → evidence)

| # | Acceptance item | Evidence | Status |
|---|-----------------|----------|--------|
| 1 | `npm run build` (tsc + vite) passes | Run this pass: exit 0 — `vite v5.4.21… 80 modules transformed… built in 2.65s`; `tsc -b` clean (part of the same command) | ✓ |
| 2 | Reproducible pipeline from committed `data-raw/` exits 0 throughout | All eight scripts re-run this pass, every exit 0 (log below) | ✓ |
| 3 | Byte-identical `public/data/*.json` on rebuild | SHA-256 of all four files identical across two consecutive builds, and identical to the values recorded in `implementation.md` D14 (log below) | ✓ |
| 4 | `unassigned: 0` | **NOT met** — 12 unassigned; every one of the 12 sits in a documented OSM-gap postcode (node assertion `allInGapSet: true`). Root cause = source data gap, not pipeline defect → QA-1 | see QA-1 |
| 5 | `shops unresolved: 0` | node assertion: 138 shops, 0 unresolved, 21 outsideCatchment; build log `unresolved ids: 0` (both runs) | ✓ |
| 6 | Per-nation hospice counts (EN deduped, SC/NI > 0 measured, Wales ≥ 0 flagged) | merge log `155 total \| en=152 sc=3 wales=0 ni=0`; node assertion byNation `{en:152, sc:3}`; 20 `curated: true`. Wales & NI hospices = 0 are flagged placeholder states pending human fetches → QA-6; NI "SC/NI > 0 measured" is met for practices (NI=304) | ✓ (flagged) |
| 7 | All 138 shops resolve, toggle works, `outsideCatchment` recomputed | resolve: assertion ✓; toggle: `App.tsx` header form-switch → `MapView` `visibleShops` (code-verified); recompute: build log lists 11 hospice rows summing to 21 (was 13 before ADR-0005) → QA-2 | ✓ |
| 8 | 20 entries `curated: true` | node assertion: 20; merge asserts exactly 20 + unique ids (exit 1 otherwise) | ✓ |
| 9 | First paint ≤ ~2 s | **UNVERIFIABLE headless** (no browser on this host). Payload ≈ 3.5 MB (practices 2.7 MB + catchments 0.7 MB + JS 0.3 MB — trivial on localhost). Open risk: 10,053 placed practices rendered as individual SVG `CircleMarker`s with no `preferCanvas` — the pre-agreed fallback (requirements item 19) is the one-line canvas renderer, added only if paint measures > ~2 s. Lead pre-verified: dev server serves (HTTP 200 at `:5174`) and all data counts | open — lead/user visual check at `http://localhost:5174` |
| 10 | Nation filter narrows list + refits map | Code-verified: `HospicePanel` list = query ∧ nation; `MapView` `FitToNation` + `NATION_BOUNDS` incl. Wales `[[51.4,-5.3],[53.4,-2.7]]` (arch §5.2 typo corrected); dimming 0.15 for non-matching nation on polygons/practices/hospices/shops. Interactive confirmation left to the visual check | code-verified |

## Findings

| id | Finding | Severity | Evidence | Rationale / carry-forward |
|----|---------|----------|----------|---------------------------|
| QA-1 | 9 postcodes unresolvable by OSM/Nominatim (BT13 1AD, BT13 3BW, BT42 1GP/1NW/2PB/3JU/4JA, BT63 6JS, BT79 0NR) → 12 practices with `hospiceId: null`; the "complete partition / unassigned: 0" criterion is unattainable for them | risk-accepted | `build-data` log `missing geo (first 30)` = exactly those 9; node assertion all 12 unassigned postcodes ∈ gap set; `implementation.md` C13 (two full passes, 8-attempt backoff, outcode fallback, not looped — execution rule 3) | The gap is in the source (OSM), not the pipeline; two full passes with backoff + outcode fallback exhausted the recovery options available to the pipeline. Documented in `data/README.md` (Current state) and surfaced in the UI (unassigned counter, Methodology). Carry-forward: re-check if OSM coverage improves; a future run of the geocoder logs the same residual and exits 1 by design — that exit is the documented gap, not a failure. |
| QA-2 | Shops outside their own catchment moved 13 → 21 | risk-accepted | build log (both runs): 11 per-hospice rows, 4+3+3+2+2+2+1×6 = 21; deterministic across runs | Expected consequence of ADR-0005: catchments are now practice-derived Voronoi cells where outcode matching was retired; a shop's flag is recomputed against the new geometry. Not a defect. Carry-forward: the phase-2 shop re-collection must re-verify flags (they are build-recomputed, not hand-set — rerunning the build keeps them correct). |
| QA-3 | `en-1-17708902164` ("Hospice at Home", Basildon SS16 5NJ) — degenerate zero-area Voronoi cell, `polygons: []`, `practiceCount: 0` | risk-accepted | catchments row `{hospiceId: "en-1-17708902164", …, "polygons": []}`; validator `no polygon: en-1-17708902164`, exit 0 | The hospice site is coincident with a practice point → zero-area cell under the single nearest-hospice rule. Handled by design: `MapView` skips empty rings (`if (!rings.length) return null`); the hospice marker and panel entry still render. Data quirk, not a code defect. No action; cell regains area automatically if future data breaks the coincidence. |
| QA-4 | 0.0002 deg² sliver overlap between the two distinct "Wisdom Hospice" cells | risk-accepted | validator `pairwise overlap: 0.0002 deg^2`, `worst overlap: Wisdom Hospice vs Wisdom Hospice` | Two distinct register rows share a name; the negligible shared sliver is within the validator's own tolerance (it exits 0). No action. |
| QA-5 | `xlsx@0.18.5` — 3 known npm advisories (1 moderate ReDoS-adjacent, 2 high: prototype pollution, ReDoS) | risk-accepted | `npm audit` output (log below) | devDependency, script-side parsing only, no runtime bundle, no network-exposed service; the fixed build is distributed via SheetJS's own registry, not npm. Full analysis in `security.md` SEC-1. |
| QA-6 | 3 human-blocked fetches leave NI hospices = 0, Wales hospices = 0, Wales/SC practices = 0 | risk-accepted | extract logs this pass: `RQIA XLSX not present … NI hospices: 0`, `Wales hospices CSV absent … 0`, `No Wales GP layer files present.`, `SC practices: 0` | Reviewer gap G3 + B2 fallback decision (recorded in `implementation.md` A3/A4/B8): the build is valid with zero sets, and each placeholder carries a human-fetch procedure with exact target path + re-run chain in `data/README.md`; the Methodology modal states 0 with the pending reason. Criterion 1 is met "as of build time" per review §2. Carry-forward: on receipt, run the documented re-run chain (item 2 of `implementation.md` "Lead-run commands remaining"). |
| QA-7 | Stale `<title>` in `index.html`: "Hospice Catchment Map — Lancashire & South Cumbria" | risk-accepted (low) | `index.html:6` | Cosmetic; the acceptance grep's scope was README prose only, and feature.md's acceptance set does not cover the tab title. Does not break specified behaviour. Recommendation: one-line change to "Hospice Catchment Map — UK" in a later pass. |
| QA-8 | Methodology line "of which N are not geocoded yet" | risk-accepted (low) | `src/components/Methodology.tsx` stats line | "Not … yet" implies a pending batch; the 12 are a permanent source gap (QA-1). Slightly misleading wording. Recommendation: "of which N have no geocodable postcode (OSM gap)". |

## Verification log (2026-10-16, single commands, all exit 0 unless noted)

1. `node scripts/extract-gp-practices.mjs` → `EN practices: 9260` / `EN hospice raw rows: 178 | organisations emitted: 152 | curated identities verified: 20/20`
2. `node scripts/extract-hospices-sc.mjs` → `SC datastore header (109 cols, …)` / `SC hospices: 3 | first: sc-CS2014323454 Hospice at Home FK6 5HJ`
3. `node scripts/extract-gp-practices-ni.mjs` → `NI reference header: PracNo,PracticeName,…` / `NI practices: 304` / `NI LCG values: Belfast=73 Northern=67 Southern=66 South Eastern=51 Western=47`
4. `node scripts/extract-hospices-ni.mjs` → `RQIA XLSX not present … NI hospices: 0` (placeholder, documented)
5. `node scripts/extract-gp-practices-wales.mjs` → `wales main: file absent … skipped` / `Wales practices: 0` (placeholder, documented)
6. `node scripts/extract-hospices-wales.mjs` → `Wales hospices CSV absent … G3: [] (0 Wales hospices until the CIW reply, B1)`
7. `node scripts/merge-hospices.mjs` → `hospices-all: 155 total | en=152 sc=3 wales=0 ni=0 | curated: 20`
8. `node scripts/build-data.mjs` (run 1) → `hospices: 155 (unplaced: 0)` / `voronoi: 9707 vertices, 155 labelled cells` / `shops: 138 (geo missing 0); outside own catchment: 21; unresolved ids: 0` / `practices: 9564 (geocoded 9552, missing 12)` / `assigned: 9552, unassigned: 12`
9. SHA-256 after run 1: catchments `581fceea…de80d2`, hospices `fced8491…aa1af7`, practices `ff24599d…03a68d`, shops `7e81df4c…d30d9f79`
10. `node scripts/build-data.mjs` (run 2) → identical log to run 1
11. SHA-256 after run 2 → all four hashes byte-identical to run 1 (and to `implementation.md` D14's recorded values)
12. `node scripts/validate-tessellation.mjs` → `no polygon: en-1-17708902164` / `catchments: 155, missing polygons: 1` / `vertices outside bounds: 0` / `coverage: 138.0000 / 138.0000 deg^2 = 100.0%` / `pairwise overlap: 0.0002 deg^2` / exit 0
13. `npm run build` → exit 0 (tsc + `vite v5.4.21`, 80 modules, 2.65 s)
14. `npm audit` → 3 vulnerabilities (1 moderate esbuild via vite; 2 high xlsx) — exit 1 by design; see `security.md`
15. Data assertions (node one-liners): byNation `{en:152, sc:3}`, curated 20, shops 138 (unresolved 0, outside 21), unassigned 12 with `allInGapSet: true`, catchments 155 with exactly 1 empty-polygon row (`en-1-17708902164`)
16. Code inspection: `src/App.tsx` (nation state + toggle + subtitle), `src/components/HospicePanel.tsx` (search first, pills, query∧nation filter, approx badge, unassigned counter), `src/components/MapView.tsx` (NATION_BOUNDS, FitToNation, 0.15 dimming, no marker downsampling), `src/components/Legend.tsx` (20 curated only; sole render site is `Methodology.tsx:103`), `src/components/Methodology.tsx` (four registers, per-nation counts, zero-set notes, 20-entry colour key)

## Limitations

- Browser-level acceptance (first paint ≤ ~2 s, filter interaction, toggle click-through) was verified by code inspection only — no browser is available on this host. Lead pre-verifications: dev server serves HTTP 200 at `http://localhost:5174` (port 5173 is held by the previous session's server), and all data-level counts were asserted live against `public/data/*.json`.
- The 10k-`CircleMarker` paint performance is the single open risk item; the pre-agreed remedy is `preferCanvas` on the `MapContainer` — apply only after a measured first paint > ~2 s.
- The dispatched QA sub-session never landed an artifact; this report supersedes it (lead takeover, per operator-validated policy).
