# ADR 0029 — Keyless OpenStreetMap data pipeline at build time

**Status:** accepted (2026-10-30)

## Context

The site's geography comes from OpenStreetMap: GP practice and hospice locational
postcodes are geocoded to coordinates, charity shops are harvested, and the
coastal clip mask (`uk-land.json`, ADR-0006) is an OSM polygon set. The
deploy contract is zero backend and zero runtime network (ADR-0014: Cloudflare
Pages static publish, only `dist/` ships; ADR-0007: client-side app). Site data
must therefore be resolved at build time and shipped as static JSON. The
project has no API keys, no budget for paid geocoding, and no OS (Ordnance
Survey) licence.

## Decision

- **All OSM data flows in at build time through committed scripts, without
  any API key**, and is captured as committed raw files under `data-raw/`:
  - `scripts/geocode-postcodes.mjs` — resolves the union of the 4 nation GP
    practice files + 4 nation hospice files against
    `nominatim.openstreetmap.org` with 1 req/s pacing, 30 s throttled
    back-off on 429/503, and a custom User-Agent. Resumable: postcodes already
    in `data-raw/postcode-geo.csv` are skipped, so re-runs are cheap and
    idempotent; exits non-zero if any in-scope postcode is still missing
    (fail-fast, per `build-data` discipline).
  - `scripts/fetch-shops-osm.mjs` — Overpass query (`shop=charity` /
    `amenity=charity` / `office=charity`) inside a fixed UK bounding box,
    tri-mirror failover (overpass-api.de, overpass.kumi.systems,
    overpass.private.coffee); only charity shops whose name matches one of our
    hospices survive (regex in `scripts/catchment-match.mjs`), each written
    with its OSM `type/id` provenance into `data-raw/shops-osm.json`.
- **Provenance is retained in the raw files** (source URLs / OSM ids); the
  public site may surface derived fields while keeping upstream origin
  machine-checkable. `data/README.md` records what ships.
- **Runtime makes no OSM calls** — the browser renders from the bundled
  `public/data/*.json` only.
- Attribution: OSM data is served under the ODbL licence; the site credits
  OpenStreetMap contributors accordingly (ODbL/OGL split per the project's
  attribution rule).

## Alternatives considered

- **OS Places / OS Open Data (keyed):** rejected — licence cost and key
  management for a hobby-scale dataset; OSM already covers every in-scope
  postcode (the 9 BT outcode gaps were closed by manual geo, ADR-0021).
- **Keyed commercial geocoder (Google/Mapbox):** rejected — same cost/lock-in
  objection, plus Nominatim's 1 req/s pool is sufficient for a once-per-build
  batch of a few hundred postcodes.
- **Runtime geocoding in the browser:** rejected — breaks the zero-runtime-
  network contract (ADR-0014/ADR-0007), is non-deterministic for the
  byte-identical rebuild ritual (ADR-0015), and exposes users to third-party
  API terms.

## Consequences

**Positive (accepted):** no keys, no cost, no vendor lock; the entire
geographic dataset is reproducible from committed scripts + committed `data-raw/`
snapshots; resuming mid-failure is free; ODbL attribution is a single,
stable upstream.
**Negative (accepted):** Nominatim rate limits mean a cold full geocode takes
minutes, and the 9 BT outcodes required human verification (ADR-0021) — the
CSV rows for those are hand-corrected, documented, and pinned (G7 re-pin
2026-10-30); Overpass mirror availability varies, so the fetch script must be
re-rannable; any OSM data change is picked up only when a build-time re-fetch
is deliberately run (the committed CSVs/responses are the source of truth
between re-fetches, and re-fetches are gated by the pre-publish checks).
