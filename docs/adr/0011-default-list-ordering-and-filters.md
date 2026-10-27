# ADR 0011 — Default list ordering (name A→Z, case-insensitive) and filter set

**Status:** accepted (2026-10-25)

## Context

HospicePanel renders the hospice list **unsorted**, with a nation filter and a
name/town substring search. James delegated the default sort ("you decide,
justify, ADR if non-trivial") and asked for the filter set beyond the existing
nation + name/town controls. A default ordering and a bounded filter set are
non-trivial because they pin the user's mental model for every listing change
in later cycles.

## Decision

- **Default sort: hospice name A→Z, case-insensitive**, via
  `String.prototype.localeCompare(nameA, nameB)`, `undefined`-safe tie-break on
  `hospiceId` for determinism.
- **Sort options** (one `<select>` next to the nation filter, default A→Z):
  1. Name A→Z (default)
  2. Name Z→A
  3. Practice count, high → low (biggest catchment first)
- **Filter set** — the one control added beyond nation + name/town search:
  **"Has published service area"** (toggle, off by default) =
  `hospice.kind === 'published'` (the 20 curated catchments). `approx` rows stay
  visible by default. No other filters are exposed.
- **Hiding of curation state** (provenance/source, website presence, unplaced)
  is enforced — those fields exist in the data but are never rendered (the
  hide-not-delete rule).
- **Location of change:** `src/components/HospicePanel.tsx` only; `useAppData`
  is untouched.

## Alternatives considered

- **Nation, then name (default):** rejected — re-orders the visible head of the
  list on every nation-filter toggle, and four groups of very different sizes
  mean most sessions show mixed nations anyway (the default view is all-nations).
- **Practice count, high → low (default):** rejected *as a default* — a
  reasonable secondary view, but it hides the alphabet the search already
  implies; kept as option 3.
- **More filters (source/website/unplaced):** rejected — curation state;
  exposing it violates the public-safe rule and grows surface area without a
  user need this cycle.

## Consequences

**Positive (accepted):** every session starts from the same predictable order;
lexicographic default matches the existing search model; the toggle answers the
one real distinction (curated vs geometric) without exposing internal flags;
change is confined to one component.
**Negative (accepted):** ties in practice count fall back to name order, so two
hospices with equal counts are not in "true" rank order; `localeCompare`
ordering is locale-dependent (the build tests on one Node/browser locale, which
is enough for a public list); the one added toggle is off by default, so
"published service areas" is not the first thing a user sees.
