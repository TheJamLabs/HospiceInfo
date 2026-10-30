# ADR 0020 — Wales: G3-tolerant landing path, Wales = 0 this cycle (AC3 disjunct B)

**Status:** accepted (2026-10-29)

## Context

The Wales hospice register (human gate H3-1, source: Care Inspectorate Wales)
has not arrived; `data-raw/wales-hospices-2026-10.csv` is absent on disk
(verified). `scripts/extract-hospices-wales.mjs` already implements gate G3:
absent input file → `data-raw/hospices-wales.json = []`, a log line, exit 0.
`hospices.json` therefore carries **0 Wales hospices** and the build and the
tessellation validator are green. AC3 (Cycle 3) is a *disjunct*: it passes
with either (A) the 12 unplaced NI practices documented (ADR-0021) **or**
(B) a prepared landing script plus a documented pending state for Wales.
The CIW data-request email text is already drafted in `data/README.md`
(2026-10-16); its **send state is unverified** (human step H3-1, arch §10 V3).

## Decision

- **Ship disjunct B:** keep `scripts/extract-hospices-wales.mjs` exactly as
  the G3-tolerant landing path (no new extract machinery). Wales stays 0;
  the pending state is documented in `data/README.md` (register status,
  email draft, send-status field). No fabricated placeholder rows —
  tolerance means `[]`, never dummy data.
- The `wales-r<n>` id fix (ADR-0019) lands **now**, before any Wales content,
  so the first rows that arrive get stable, scheme-conformant ids and no
  live URL churn is possible.
- **Landing chain (when the reply arrives — human step, then mechanical,
  arch §4):** save the reply verbatim as `data-raw/wales-hospices-2026-10.csv`
  → record provenance row (as-of date + source email; ADR-0013) →
  `extract-hospices-wales.mjs` → `merge-hospices.mjs` →
  `geocode-postcodes.mjs` (OSM, key-free) → `npm run build-data` ×2 (byte
  identity; re-baseline anchor) → `validate-tessellation.mjs` → `npm run
  build`. Gate: `hospices.json` shows `wales > 0`; each placed Wales hospice
  gets a cell; unplaced Wales hospices only from documented geocoding gaps.
- **If the reply needs a logged-in download:** human performs the authed
  fetch (H3-3, arch §10 V5); a plain-CSV reply skips that step.

## Alternatives considered

- **Fail-fast on the missing register:** rejected — 0 Wales hospices is a
  valid, documented data state, not a build error; blocking the whole UK
  build on one external reply would freeze the pipeline.
- **Placeholder/dummy Wales rows:** rejected — fabricated data violates the
  provenance rules (ADR-0013) and the hide-not-delete public-safety spirit.

## Consequences

**Positive (accepted):** the pipeline proceeds while the external
dependency is pending; the landing chain is documented and dry-runnable
today (against `[]`, green); AC3 is satisfied this cycle via disjunct B and
does not re-open after Wales lands (the chain is the already-specified
path).
**Negative (accepted):** Wales remains absent from the map until H3-1
closes — user-visible count 0, honestly documented (About page +
`data/README.md`); the send of the drafted email (V3) and any authed fetch
(V5) are unverifiable from the operator's machine and stay human gates.
