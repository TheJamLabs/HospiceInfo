// Cycle 10 — pure normalisation shared by the shop-crawl script (dedupe
// key, postcode emission per D5) and the tests (shop-entry-shape,
// shop-dedupe), so the dedupe key and the shape test share one
// implementation. Side-effect-free; no network.
//
// normalisePostcode matches the geocode-side key scheme
// (scripts/geocode-shops.mjs L14): uppercase, internal whitespace
// collapsed to a single space.

export function normalisePostcode(pc) {
  if (pc === null || pc === undefined) return null;
  return String(pc).toUpperCase().replace(/\s+/g, ' ').trim();
}

const strip = (s) =>
  String(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function normaliseShopKey(name, address) {
  return strip(name) + ' ' + strip(address.join(', '));
}
