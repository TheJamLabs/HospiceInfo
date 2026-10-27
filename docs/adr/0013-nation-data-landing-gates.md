# ADR 0013 — Nation data landing verification gates and the provenance pattern

**Status:** accepted (2026-10-25)

## Context

Three nation landings remain on the Cycle 2 work list: **Wales practices**
(`gp-practices-wales.json` is a placeholder — the Wales DataMap catalog moved
off `data.wales`; candidate portal `data.gov.wales`), **NI hospices**
(`hospices-ni.json` placeholder — `publicregulation.gov.uk` no longer exists;
the register is now the **Public Regulation Authority**), and **Wales hospices**
(Care Inspectorate Wales has no bulk export; a data request is pending).
Landing a register is a one-way data change (counts, assignment, tessellation
all shift); an unverified landing would silently invalidate the byte-identity
baseline and the current-state numbers in `data/README.md`.

## Decision

- **Each landing is gated** on a verification gate that must pass before the
  work-list item is marked done:
  - **Wales practices (B2):** the two raw files
    (`gp-practices-wales-{main,branch}-2026-10.{csv,geojson}`) exist and are
    non-empty; the exact catalog URL + as-of date are recorded in
    `data/README.md`; `node scripts/extract-gp-practices-wales.mjs` exits 0
    (first-run header discovery per ADR-0003, logged verbatim); the full chain
    (extract → `geocode-postcodes.mjs` → `build-data` ×2 byte-identical →
    `validate-tessellation.mjs` → `build`) is green; the report shows
    `wales > 0` AND the placed Wales practices (lat/lon non-null) — unplaced rows
    are acceptable only from documented geocoding gaps; the unassigned count is
    re-derived, not assumed.
  - **NI hospices (B3):** `data-raw/rqia-regulated-services-2026-06.xlsx` is
    fetched from the PRA with the exact download URL + as-of date recorded;
    `node scripts/extract-hospices-ni.mjs` exits 0 (exits 1 with the header on
    mismatch); `node scripts/merge-hospices.mjs` preserves its assertions
    (exactly 20 curated, unique ids, all 20 curated ids present); full chain
    green; report shows `ni hospices > 0`.
  - **Wales hospices: documented pending gap (proceed).** This is *not* a gate
    and does not block the pipeline. The build tolerates the `[]` placeholder
    (zero-set tolerance), the site renders the 155 non-Wales hospices, and the
    gap is stated in `data/README.md` and the About/Methodology pages. The
    landing is unblocked when the CIW data-request reply lands (procedure in
    `data/README.md`); it then runs through the same gate as B3.
- **Provenance pattern (every landing):** append one row to the `data/README.md`
  raw-inputs table (file, source, date, notes — exact URL + as-of date), one
  note to `.agents/pipeline.md`, then re-run the byte-identity ritual
  (`npm run build-data` ×2, SHA-256 compare). A landing is *not accepted*
  without its provenance row.
- **Scotland is DONE** (911 practices, all geocoded and assigned) — the gate
  discipline does not re-run for it; its provenance row is the template for the
  other landings.

## Alternatives considered

- **Land what arrives, patch prose after:** rejected — counts in
  `data/README.md §Current state` are load-bearing for QA and Hindsight;
  landing without the gate desynchronises them and forces a silent re-baseline
  of the byte-identity ritual.
- **One generic gate (chain green + row in README):** rejected — B2/B3 have
  source-specific failure modes (moved DataMap catalog, RQIA → PRA, header
  discovery) that a generic gate would not catch; per-nation gates name the
  exact artifacts and assertions.
- **Block the pipeline on Wales hospices:** rejected — it is a *documented
  pending gap*; the build and the public map are correct at 0 Wales hospices,
  and the gap is disclosed where an operator (and a user's "let us know") can
  see it.

## Consequences

**Positive (accepted):** every accepted landing is traceable to a URL, a date,
and a green chain; the byte-identity baseline is re-established per landing,
never silently invalidated; the two blocked sources have a concrete,
named next step; the pending gap is carried forward as documented debt, not
hidden.
**Negative (accepted):** the gates make a landing slower (human fetch + full
run of the chain + provenance row) — cost accepted over data-state risk; if the
PRA or the `data.gov.wales` candidates turn out to be the wrong portals, the
gates block acceptance (correct behaviour) but the operators must update the
procedures in `data/README.md` first; zero-set tolerance means the *map* does
not visually signal the Wales/NI hospice gaps — the README and the
About/Methodology wording are the only on-site signal.
