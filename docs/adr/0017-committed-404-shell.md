# ADR 0017 — Committed `dist/404.html` shell for Pages 404s

**Status:** accepted (2026-10-29)

## Context

The site is deployed purely static on Cloudflare Pages (ADR-0014, zero
backend). A mistyped or stale URL (e.g. `/hospice/hull-east-york.html`) must
not present a blank page, and Pages natively serves a custom
`dist/404.html` for every unmatched path with no configuration change. The
unknown-hash behaviour in the app already sends unrecognised routes to the
map view (ADR-0007), so the 404 experience should not be a third,
disjoint pattern.

## Decision

- `scripts/prerender.mjs` emits `dist/404.html` (ADR-0015 shell model, arch
  §3.8): per-page `<head>` with title `Page not found — Hospice Finder UK`
  and a neutral description, one canonical (`{SITE_URL}/404.html`,
  self-reference), the standard Open Graph set, and the root
  `Organization` JSON-LD node only (no `HealthCareBusiness`).
- On load, the hash guard (ADR-0016) sees an empty hash → the map view
  shells out — identical to today's unknown-hash behaviour. No new SPA
  route is introduced.
- `404.html` is **not** in `sitemap.xml` (a 404 must not be indexed).
- Emitted by the same idempotent, deterministic script as the other pages:
  one build step, one set of invariants.

## Alternatives considered

- **Pages default 404:** rejected — unbranded, no useful `<head>`, and
  unparseable for social/crawler context.
- **A static branded HTML page without the app:** rejected — a second,
  non-React code path for the same screen; duplicated prose (ADR-0009
  single-source).
- **A server function generating the 404:** rejected — zero-backend
  contract (ADR-0014).

## Consequences

**Positive (accepted):** dead ends route into the map; the page is branded
and crawl-suppressed (absent from the sitemap); deterministic output folded
into the 171-file set and its invariants.
**Negative (accepted):** a 404 load boots the app and fetches the JS bundle
(one extra round-trip on an otherwise dead URL — acceptable); a
self-referencing canonical on a 404 is a non-standard edge case (harmless;
the page is not in the sitemap).
