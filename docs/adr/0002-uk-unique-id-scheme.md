# ADR 0002 — UK-unique stable hospice id: `${nation}-${registerId}`

**Status:** accepted (2026-10-16)

## Context

Hospices are now sourced from four national registers (CQC, Care Inspectorate
Scotland, RQIA, Care Inspectorate Wales), each with its own ID format and
URL pattern. The current map uses short slugs (`stcatherines`, `pendleside`)
that are not stable against a register re-fetch and carry no provenance.
`shops.json` references `hospiceId`, and `practices.json` / `catchments.json`
do too — id must be UK-unique and stable across rebuilds.

## Decision

`hospiceId = ${nation}-${registerId}` where:

- `nation ∈ { en, sc, wales, ni }` (matches the `nation` field).
- `registerId` is the register's own per-record ID where one exists:
  - **England:** the CQC location ID, already present in `cqcUrl`
    (`cqc.org.uk/location/<id>`) and the CSV's "CQC Location ID" column.
  - **Scotland / NI / Wales:** the register's record ID column, read in the
    first extract run (header logged by the script; see ADR 0003 on
    unverified columns).
- **Fallback:** if a register has no per-record ID, use the row's 1-based
  index in the committed raw file: `${nation}-r${n}`. Row order in a committed
  CSV/XLSX is stable, so the id is stable across rebuilds from the *same*
  committed file. (A future re-fetch of that register may shift row indices —
  documented in `data/README.md`; acceptable for a display map.)

## Alternatives considered

- **Keep the 20 slug ids, mint slugs for the ~280 new hospices.** Slugs are
  hand-made, collide-prone, and carry no provenance; a re-fetch can silently
  orphans a slug. Rejected.
- **UUIDs.** Not stable across re-fetches (a new UUID per build). Rejected.
- **Hash of name+postcode.** Stable, but opaque and collision-prone on name
  drift ("Hospice X" vs "Hospice X (New)"). Rejected.

## Consequences

- **Positive:** id is self-describing (nation + register provenance) and
  survives re-runs of `merge-hospices.mjs` / `build-data.mjs` from committed
  files — required for the "reproducible pipeline" acceptance criterion.
- **Positive:** the 20 curated ids change from slug to `en-<cqcId>`; the old
  slugs are retired. The 20 are identified *by CQC location ID match* in
  `merge-hospices.mjs` (the `cqcUrl` in `catchment-map.mjs` carries the ID),
  so the mapping is exact, not fuzzy.
- **Negative:** id is longer; it appears in `public/data/*.json` and in the
  ID-scheme note. Acceptable.
- **Negative:** a register re-fetch can change `en-<cqcId>` values only if the
  register reassigns IDs (CQC does not) — for the row-index fallback nations,
  a re-fetch can shift ids. Documented; not a blocker for this phase.
