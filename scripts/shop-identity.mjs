// ADR-0043 — shop identity pass-through in the data build.
// Pure, side-effect-free: imported by scripts/build-data.mjs and
// tests/shop-identity.test.mjs.
//
// Resolution order:
//   1. the legacy SLUG_TO_ID table (20 catchment slugs -> en-<cqcId>) wins,
//      unchanged semantics;
//   2. else membership in the canonical id set from data-raw/hospices-all.json;
//   3. else null — the caller's existing unresolved path (build exits 1).
//
// No blind `?? inputId` fallback: a typo'd or foreign id resolves to null so
// the build fails loudly instead of attributing a shop to a non-existent
// hospice.

export function resolveShopId(inputId, canonicalIds, slugToId) {
  const legacy = slugToId[inputId];
  if (legacy !== undefined) return legacy;
  return canonicalIds.has(inputId) ? inputId : null;
}
