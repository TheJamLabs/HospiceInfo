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
