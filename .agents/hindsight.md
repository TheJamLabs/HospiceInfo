# Hindsight — UK-wide hospice catchment map (stage 10, 2026-10-16)

Authored by the Engineering Lead (one-shot stage artifact; sub-session
policy). The Hindsight MCP daemon is blocked by App Control on this machine
(known from prior runs), so no knowledge pages were updated via MCP; this
file is the durable record for the next session to ingest.

## What happened

The map was widened from 20 curated Lancashire/South Cumbria hospices to all
hospices in England, Wales, Scotland and Northern Ireland, with
practice-derived Voronoi catchments everywhere and a search-first UI with a
nation filter. Final state: 155 hospices (en 152 / sc 3 / wales 0 / ni 0),
9,564 GP practices (9,552 assigned, 12 unassigned), 138 charity shops
(21 outside their own catchment), 9,707-vertex tessellation over the UK box.
QA and Security passed with 0 Blocking; 12 findings risk-accepted.

## What worked

- **RQ-1 disk verification** at every stage transition — the single most
  load-bearing habit. Every "stage done" claim was checked against bytes on
  disk before proceeding.
- **Fire-and-forget sub-sessions + disk polling** for long stages
  (Research/Architect/Coding eventually landed this way); first-turn mode
  times out reliably on this machine.
- **Byte-identical rebuilds as a correctness criterion** — SHA-256 pairs
  caught nothing this time (all clean), but the invariant is cheap and
  makes "reproducible" mean something verifiable.
- **Zero-set tolerance by design** (G3/B2): the build stayed valid while
  three sources were unreachable; placeholders carried the fetch procedures
  forward into the docs instead of blocking the pipeline.
- **The lead-write takeover** when sub-sessions stalled: requirements (PM),
  then QA and Security all landed as lead-authored artifacts after >20 min
  of silence. This is now the operator-validated pattern for one-shot
  stage artifacts in this environment.
- **GRILL at scope-set time** caught two real gaps before coding (the
  shop-id remap for ADR-0002; the Wales bounds typo) — both were one-liners
  at fix time because they were found in review, not in QA.

## What was hard

- **Chronic sub-session stalls** (Research timed out twice; Architect/PM/QA/
  Security all >20–30 min). Cost: wall-clock time, not correctness.
- **DNS-blocked sources** (publicregulation.gov.uk, data.wales, Spatial Hub
  portal) — three of the four registers' nicest inputs required a human
  fetch. Execution rule 3 (no loop; document the exact command, use a
  placeholder) kept the pipeline moving.
- **10 k-postcode geocoding** (~3 h at 1 req/s with backoff) — the long
  pole; resumability + the end-of-run guard made it tolerable.
- **Loop-detection** killed one long polling turn — consolidate polls
  (longer single waits, one check) rather than rapid identical cycles.

## Decisions made (ADRs on disk)

0001 UK Voronoi clip box; 0002 `nation-registerId` ids (curated matched by
CQC id); 0003 first-run column discovery for unverified extracts; 0004
deterministic hash colour (retire the 20-swatch palette); 0005 retire
outcode assignment for the 20 curated (practice-derived everywhere).

## Debt carried forward (already risk-accepted; do not re-litigate next round)

- 9 OSM-unresolvable postcodes → 12 unassigned practices (re-check if OSM
  coverage improves; the geocoder's exit 1 on them is expected).
- 21 shops outside their own catchment (re-verify flags when any shop data
  is touched).
- Basildon degenerate cell; "Wisdom Hospice" sliver — data quirks, no action.
- 3 human fetches + 1 CIW email pending (procedures in `data/README.md`).
- One-line cosmetic fixes queued: `index.html` `<title>` (still says
  "Lancashire & South Cumbria") and the Methodology "not geocoded yet"
  phrase; ODbL attribution sentence in `data/README.md`.
- xlsx/esbuild advisories accepted (dev-only).

## For the next session's memory

Project memory to save: the map is UK-wide as of this commit; the four
pending human inputs (RQIA XLSX, data.wales GP layers, Scotland Spatial Hub
GeoJSON, CIW email) each have a documented re-run chain in
`data/README.md`; the "complete partition" criterion is intentionally
satisfied except for the 12 OSM-gap practices.
