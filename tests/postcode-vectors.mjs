// Cycle 8 (C8) — C8-PARITY-VECTORS (R-5): the single named vector set shared
// by the function-side suite (tests/handler.test.mjs) and the client-side
// suite (tests/postcodes-client.test.mjs). One table, asserted by both, so
// the two sides can never drift (requirements §3).
//
// Placeholder credentials only (test-base / test-id / test-secret); no real
// values are written anywhere in this pass.

export const VALID_COMPACT = ['LS14AP', 'CF119HD', 'BT153LH', 'PR72TH'];

// Raw spaced inputs and the compact form they normalise to.
export const SPACED_NORMALISES_TO = [
  ['LS1 4AP', 'LS14AP'],
  ['CF11 9HD', 'CF119HD'],
  ['BT15 3LH', 'BT153LH'],
  ['PR7 2TH', 'PR72TH'],
];

export const INVALID = ['ABC', '12345', '!@#', '', 'LS1AA'];

// C8-OPS-2 (2026-11-16): wire-encoded wildcard segments exactly as the
// Pages runtime passes them to context.params (percent-encoded, single
// decode). Function-side only — the client never receives raw segments.
export const WIRE_ENCODED = [
  ['PR7%202TH', 'PR72TH'],
  ['CF11%209HD', 'CF119HD'],
  ['BT15%203LH', 'BT153LH'],
  ['LS1%204AP', 'LS14AP'],
];

// Wire inputs the shape test must reject: a malformed percent sequence
// ("PR7%2G2TH") and a double encoding ("PR7%25202TH" → one decode →
// "PR7%202TH"; only one decode is applied).
export const WIRE_ENCODED_INVALID = ['PR7%2G2TH', 'PR7%25202TH', ''];

// Compact → spaced display form expectations.
export const SPACED_FORM = [
  ['LS14AP', 'LS1 4AP'],
  ['CF119HD', 'CF11 9HD'],
  ['BT153LH', 'BT15 3LH'],
  ['PR72TH', 'PR7 2TH'],
];

export const PLACEHOLDER_CREDS = {
  base: 'test-base',
  clientId: 'test-id',
  clientSecret: 'test-secret',
};
