# ADR 0003 — First-run column discovery on unverified extracts

**Status:** accepted (2026-10-16)

## Context

Research marked the column layouts of three of the new sources
**UNVERIFIED** (research §3, open questions):

- Care Inspectorate Scotland datastore CSV — do rows carry postcode and/or
  lat/lon? what is the Name/column order?
- RQIA "All Registered Services" XLSX — exact column list (name? service
  type? postcode?).
- DataMap.wales geonode GP layers — download format (CSV vs GeoJSON) and the
  field names.

The extract scripts must be written *before* the files are downloaded (the
pipeline runs in one Coding pass), so they cannot assume a column layout.

## Decision

Each of `extract-hospices-{sc,ni,wales}.mjs` and
`extract-gp-practices-{sc,wales}.mjs` does a **first-run discovery pass**:

1. On first run (no output file present), log the raw file's header row (CSV)
   or first record's keys (XLSX/GeoJSON) plus a sample row to the console.
2. Map the logged fields to the common shape by **named access** (a lookup
   table `column → field`: e.g. `{'Location Name' → 'name', 'Postcode' →
   'postcode'}`, case-insensitive, trimmed) — not by position.
3. If a required field (name, postcode for practices; name for hospices) has
   no match in the header, the script **exits non-zero with the header
   printed** — it does not guess. The Coding stage (or a human) then adjusts
   the mapping table in the committed script and re-runs.
4. lat/lon: *prefer* a latitude/longitude already in the extract (research §3
   preference (a)); fall back to Nominatim postcode-unit geocoding (preference
   (b)), then Nominatim full address (preference (c)). The geocode script's
   existing unit→outcode fallback covers (b)→(c).

The mapping table for each source is committed in the script's header; the
first-run log of the actual header is recorded in `data/README.md` so the
mapping is auditable.

## Alternatives considered

- **Positional parsing (CSV column index).** Fragile to source updates and to
  the four sources differing. Rejected.
- **Human-downloads-then-inspects, then the script is written.** Delays the
  pipeline and breaks the "one Coding pass" structure; the four sources are
  independent, so positional-vs-named is a per-script concern that discovery
  handles. Rejected.

## Consequences

- **Positive:** scripts are correct on the first *verified* run and fail
  loudly (not silently) when the assumption is wrong — no mis-mapped field
  flows into `hospices-all.json` unnoticed.
- **Positive:** no new dependency beyond `xlsx` (already planned) for the
  XLSX path.
- **Negative:** each extract script carries a small mapping-table constant;
  a source format change means a one-line mapping fix + re-run. Acceptable.
- **Negative (accepted, flagged):** the Coding pass must treat the first-run
  header log as the source of truth and *not* ship a `hospices-{sc,ni,
  wales}.json` whose `name`/`postcode` were mapped from an unverified layout.
  QA verifies the mapping table matches the committed header in
  `data/README.md`.
