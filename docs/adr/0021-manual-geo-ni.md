# ADR 0021 — NI: manual pin file `data-raw/manual-geo-ni.json`, H3-2 retired (AC3 disjunct A)

**Status:** accepted (2026-10-29)

## Context

12 Northern Ireland practices (10 practices / 2 shared rows — 12 list rows,
9 distinct postcodes) cannot be geocoded by any available service: three
geocode passes (2026-10-24: ODBL mirror → OSN nominatim → unit + outcode)
exhausted the free options, and the OS Places key (human gate H3-2) is now
**retired** — the operator has decided not to obtain a commercial key.
AC3 (Cycle 3) is a *disjunct*; disjunct A is: the 12 unplaced NI practices
are **documented** and the unplaceable residual is reduced by manual
pinning where the operator can. The site's public-safety rule
(hide-not-delete, ADR-0004) means unplaced practices must never show a
wrong location — absence of `lat`/`lon` is the only honest representation.

## Decision

- **Manual pin file:** new `data-raw/manual-geo-ni.json`
  (`{ "asOf": "2026-10-29", "source": "...", "entries": [...] }`, each entry
  `{ "postcode", "lat", "lon" }` — the 9 distinct BT postcodes, arch
  §5 Appendix A). The file **ships with `entries: []`** this cycle; the
  operator (human step H3-2-fallback, arch §10 V4) fills coordinates from
  desk knowledge only where certain; `asOf` is an operator-fact (when the
  pins were chosen), not a build timestamp — it does not vary between
  builds of the same file, so byte-identity (arch §3.2) is intact.
- **Merge point:** `scripts/build-data.mjs` reads the file (optional;
  absent file ≡ `entries: []`) **after** the `postcode-geo.csv` loop and
  **before** `geoOf`/nearest-hospice, pulling each matching postcode out of
  the unplaced set. Fail-fast validation: parse, entries sorted by
  postcode, each lat/lon within the UK range (−12 < lon < 3, 49 < lat < 60);
  on violation the build stops with the offending postcode named.
- **H3-2 status: retired (not open, not blocked).** The OS Places path is
  removed from the landing story; it is **retained as a documented
  fallback** (arch §5, A2) only if a future Wales/NI gap reproduces this
  situation and free geocoding fails again.
- **Residual:** practices not in `entries` stay unplaced (hidden on the map,
  listed in the About page with their postcode, hide-not-delete). AC3
  disjunct A is satisfied by this documentation + mechanism (arch §5).

## Alternatives considered

- **Obtain an OS Places key (the original H3-2):** retired by operator
  decision — a paid commercial dependency for 9 postcodes is not justified;
  the key path is demoted to an optional fallback, not a gate.
- **Estimate/interpolate coordinates to a pin:** rejected — a guessed
  location for a palliative-care service is a public-safety violation
  (ADR-0004 hide-not-delete exists precisely for this).
- **Hard-code the 9 postcodes in `build-data.mjs`:** rejected — data belongs
  in `data-raw/` (ADR-0009 single source of truth), keeping the script
  nationally generic and the pins operator-editable without code changes.

## Consequences

**Positive (accepted):** the unplaceable residual becomes a first-class,
data-driven input — filling the JSON and rebuilding is the entire landing
step; fail-fast on out-of-UK coordinates stops bad pins at build time; AC3
closes via disjunct A without any external dependency; the byte-identity
ritual is unchanged (input file is a fixed list member).
**Negative (accepted):** pins are operator knowledge, not surveyed
positions — acceptable for the map's stated precision (town-level);
practices absent from `entries` remain invisible on the map until and only
until an operator pin lands (honest, documented).
