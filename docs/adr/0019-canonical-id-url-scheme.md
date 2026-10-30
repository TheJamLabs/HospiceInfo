# ADR 0019 — `/hospice/<canonical-id>` URL scheme (ids are slugs; `wales-r<n>` fix)

**Status:** accepted (2026-10-29)

## Context

Each prerendered per-hospice page (ADR-0015) needs a stable, stable-on-landing
URL slug. Hospice ids are already deterministic per ADR-0002:
`{nation}-{registerId}`, with a `r<n>` fallback when the register row id is
unusable (shipped `ni-r1…ni-r6` verified on disk). Problem found in
read-only verification: `scripts/extract-hospices-wales.mjs` synthesises
`id: \`wales-${i + 1}\`` — a row-order id that (a) drifts from the ADR-0002
scheme and (b) would turn over every Wales URL when the register file gains
rows (row order shifts suffixes) — exactly the class of instability the
URLs must not have.

## Decision

- **The id is the URL slug:** every per-hospice page ships at
  `/hospice/<canonical-id>.html` and sitemaps/canonicals use that exact
  path. No second mapping layer (no name→slug table to drift, no translation
  of ids).
- **One-line fix (ADR-0019, lands with the data chain):**
  `scripts/extract-hospices-wales.mjs` changes
  `id: \`wales-${i + 1}\`` → `id: \`wales-r${i + 1}\`` — conforms to the
  ADR-0002 `r<n>` fallback and matches the shipped `ni-r1…ni-r6` convention.
  It lands *before* any Wales content, so live URLs never churn (Wales
  currently ships 0 rows; ADR-0020). Part of this cycle's single anchor
  re-baseline (arch §9 check 1).
- Sort order in emitted artifacts is code-unit ascending over ids (ADR-0015
  determinism rule 1).

## Alternatives considered

- **Name-derived slugs:** rejected — hospice names are not unique and not
  stable (renames would break every URL); would require a maintained
  name→slug mapping table (a second source of truth, ADR-0009 conflict).
- **Numeric global index:** rejected — row-order churn is precisely the bug
  being fixed; opaque and unstable across register revisions.
- **Per-nation ordering indexes:** rejected — the id already encodes nation
  and register provenance; re-deriving an index is redundant and equally
  order-sensitive.

## Consequences

**Positive (accepted):** stable deep links with no mapping maintenance;
machine-checkable id↔page invariant (arch §9 check 5: every
`dist/hospice/<id>.html` id ∈ `hospices.json` and vice versa); Wales
URLs are stable at the moment content lands.
**Negative (accepted):** ids are opaque (e.g. `en-1-17708902164`) —
acceptable because the human-facing title is the hospice name and search
presentation carries it; the one-line `wales-r<n>` fix changes the *scheme*
of not-yet-shipped ids only (zero live URLs affected).
