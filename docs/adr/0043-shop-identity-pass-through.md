# ADR 0043 — Shop identity pass-through in the data build

**Status:** accepted (2026-11-16)

## Context

`scripts/build-data.mjs` resolves each shop's `hospiceId` through
`SLUG_TO_ID` (L33–36), which maps only the 20 legacy catchment slugs to
`en-<cqcId>`. Cycle 10 appends shop entries carrying **canonical** ids
(`en-1-126365065`, `sc-oscar-005623`, `wales-r4`, …) from
`data-raw/hospices-all.json` (208 rows, ADR-0002). Those ids are not keys
of `SLUG_TO_ID`, so `hospiceId` resolves to `undefined`, `shopsUnresolved`
increments (L1065–L1066), and the build hard-fails (L1082). Without a fix,
no new entry for any register-sourced hospice could ever enter the build.

The build's hard-fail is a safety property: it is what caught every past
data slip. Any fix must keep it.

## Decision

A pure helper `resolveShopId(inputId, canonicalIds, slugToId)` in a new
`scripts/shop-identity.mjs`:

1. `slugToId[inputId]` — the 20-legacy-table path, unchanged semantics
   (table wins, even when the input also resembles a canonical id).
2. else `canonicalIds.has(inputId) ? inputId : null`, where
   `canonicalIds` is the 208-row id set from `hospices-all.json` (already
   loaded in build-data).
3. `null` → the existing unresolved path → build exit 1.

`build-data.mjs` changes at exactly one spot (the L1065 lookup). **No
blind `?? inputId` fallback** — an id that is neither legacy nor in the
record validates to `null`, so a typo or foreign id still fails the build
loudly. The 138 existing entries resolve byte-for-byte as before (proven
by test against a committed baseline fixture).

## Alternatives considered

1. **Blind `?? inputId` pass-through**: rejects nothing; a typo'd id would
   attribute shops to a non-existent hospice with no signal. Rejected.
2. **Drop unresolved shops** (log a warning, skip the entry): silent data
   loss and a weakened build gate. Rejected.
3. **Add canonical ids to `CATCHMENTS`/`SLUG_TO_ID`**: a 208-row second
   slug table that would drift from `hospices-all.json`, which is already
   the source of truth. Rejected.
4. **Name-based reverse lookup**: fragile, duplicates identity logic.
   Rejected.

## Consequences

- The build accepts any valid canonical id and rejects anything else —
  the trust boundary for shop→hospice attribution is now the 208-row id
  set, verified per entry.
- `shop-identity.mjs` is side-effect-free and imported by
  `tests/shop-identity.test.mjs` (the build script itself is not importable
  without running it).
- One-line change in a 1100+-line script; the byte-identical rebuild
  ritual (A-05) plus a pre/post build-summary diff are the non-regression
  proof (certification gates G0/G1).
