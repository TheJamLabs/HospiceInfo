/**
 * Normalise a UK postcode search input (C6-3): strip everything
 * non-alphanumeric, then upper-case — "ls1 4ap" → "LS14AP". The data files
 * store postcodes in that normalised form, as does the map UI.
 */
export function normalisePostcode(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
}
