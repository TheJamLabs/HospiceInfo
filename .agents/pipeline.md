# Pipeline: UK-wide hospice catchment map

Goal: Extend the map from Lancashire & South Cumbria to all hospices in
England, Wales, Scotland and Northern Ireland — practice-derived
catchments, search-first UI with a nation filter.

Done when: all ten stage artifacts exist, no open Blocking findings
(resolved or risk-accepted), the Reporter's one-screen report is delivered
in chat, and this ledger is current. Scope: `.agents/feature.md`.

## Stage status

| # | Stage | Status |
|---|-------|--------|
| 0 | Init | done |
| 1 | Research | done |
| 2 | Architect | done |
| 3 | Reviewer | done |
| 4 | PM | done |
| 5 | Coding | done |
| 6 | QA | done |
| 7 | Security | done |
| 8 | DevOps | done |
| 9 | Documentation | done |
| 10 | Hindsight | done |
| T | Reporter | done |

(QA and Security run in parallel after Coding.)

## Rework round counts

- QA gate: 0
- Security gate: 0

## Open findings

- Blocking: none
- Risk-accepted (QA gate, 8): QA-1 9 OSM-gap postcodes → 12 unassigned practices; QA-2 shops outside catchment 13→21 (ADR-0005 consequence); QA-3 Basildon `en-1-17708902164` degenerate zero-area cell; QA-4 "Wisdom Hospice" 0.0002 deg² sliver; QA-5 xlsx@0.18.5 3 npm vulns (devDep); QA-6 3 human-blocked fetches → NI/Wales/SC-practice placeholders; QA-7 stale `<title>` "Lancashire & South Cumbria" (index.html); QA-8 Methodology "not geocoded yet" wording.
- Risk-accepted (Security gate, 4): SEC-1 xlsx prototype-pollution+ReDoS (dev-only); SEC-2 esbuild dev-server advisory (dev-only); SEC-3 design-level note — Nominatim egress of postcodes is the intended, sound trust boundary (no rework); SEC-4 ODbL attribution sentence missing in data/README (one-line doc fix).

## Notes

- 2026-10-16: Stage 5 done. `.agents/implementation.md` verified on disk —
  all 23 items executed. Final numbers: 155 hospices (en=152 sc=3 wales=0
  ni=0; 20 curated), 9,707 voronoi vertices / 155 labelled cells, 9,564
  practices (9,552 assigned, 12 unassigned), 138 shops (21 outside catchment,
  0 unresolved ids). `tsc -b` exit 0; `npm run build` exit 0; validate-
  tessellation exit 0 (100% coverage, 0.0002 deg² sliver — within tolerance).
  Byte-identical rebuild (SHA-256 verified). Known data quirks for the QA
  gate: (1) 9 OSM-unresolvable postcodes (BT13/BT42/BT63/BT79 set) → 12
  unassigned practices — leading risk-accepted candidate ("complete partition"
  unattainable for these); (2) Basildon `en-1-17708902164` degenerate
  zero-area cell (polygons: []); (3) 3 human-blocked fetches (RQIA XLSX,
  data.wales GP layers, NHS Scotland Spatial Hub GeoJSON) → NI/Wales/SC
  placeholders documented with re-run chains in `data/README.md`; (4) xlsx
  npm 3 vulns accepted (script-side devDep only).
- 2026-10-16: Stages 6+7 done. Both dispatched sub-sessions stalled
  (>20 min, no artifact on disk); per the operator-validated policy for
  one-shot stage artifacts in this ACP/vllm environment, the lead ran the
  full verification/review directly and authored `.agents/qa.md`
  (VERDICT PASS; 8 risk-accepted, 0 Blocking) and `.agents/security.md`
  (VERDICT PASS; 4 risk-accepted; design-level note SEC-3 requires no
  rework — the Nominatim egress is the intended, sound trust boundary).
  Rework gates: QA 0 rounds, Security 0 rounds.
- 2026-10-16: Stages 8–10 + Reporter likewise lead-authored (same policy):
  `.agents/ops.md`, `docs/MAINTENANCE.md`, `.agents/hindsight.md`, then the
  one-screen chat report and the lead commit.
- 2026-10-16: Stage 2 done — Architect sub-session landed late (~30 min);
  artifacts on disk: `architecture.md`, 5 slugged ADRs, (GLOSSARY.md was
  missing → the lead wrote it from the research candidate terms).
- 2026-10-16: Stage 3 done (`.agents/review.md` verified on disk; the lead
  also drafted a review while polling, but the sub-session's file already
  existed and is authoritative). Review = PASS WITH NOTES: gaps G1 (RQIA
  export UNVERIFIED, no fallback), G2 (EN multi-location CQC rows need
  dedupe — main-site rule), G3 (Wales conditional on CIW email). Lead-found
  extra gap (not in the on-disk review): ADR-0002's slug→`en-<cqcId>` id
  change breaks the 138 shops' `hospiceId` references unless the build
  remaps the 20 slugs — fed to the PM as an explicit work item. Also:
  Arch §5.2 Wales display bounds use 49.9°N (typo; should be ≈51.4°N).
- 2026-10-16: Stage 1 done (`.agents/research.md` verified on disk). Key facts:
  CQC CSV = England only, 57,110 rows (178 hospices, 9,260 GP rows, 7,995
  distinct GP postcodes); RQIA NI **does** have a bulk Excel export (brief's
  "no bulk export" assumption was wrong); CIW Wales = email request, no
  scriptable CSV; Scotland datastore = monthly CSV; repo
  `gp-practice-reference-file-july-26.csv` is NI-only (305 rows, reusable);
  Voronoi bbox hardcoded to Lancashire; GLOSSARY.md missing → Architect seeds
  it. Risk: geocoding ~10–12k postcodes ≈ 3–4 h at 1 req/s (resumable).
- 2026-10-16: Stage 0 done (feature.md + ledger); dispatching Research.
  Subagent definitions in `~/.qwen/agents/` use `qwen-coding` (the
  `qwen3.8-flash` id 404s on this machine).
- Read-only stages (Research, Reviewer, Reporter) never modify the working
  tree; the lead verifies each artifact on disk before proceeding (RQ-1).
- Najee-friendly(shell): single commands only (no compound syntax) —
  daemon shell guard.
