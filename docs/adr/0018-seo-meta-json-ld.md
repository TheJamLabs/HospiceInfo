# ADR 0018 — SEO head set, JSON-LD `@graph`, no-endorsement guard, no `lastmod`

**Status:** accepted (2026-10-29)

## Context

AC2 (Cycle 3) requires the emitted pages to present correctly in search
engines and social links. The site is a **third-party information service
about** hospice businesses — research findings R13/R14 flag that
structured data can read as endorsement/affiliation if it claims fields the
hospice itself would assert. Determinism (the byte-identical rebuild ritual,
`.agents/architecture.md` §3.2) forbids build-time-varying metadata such as
timestamps.

## Decision

Per emitted page (template: arch §3.3; exact title/description table there):

- One `<title>` + one `meta name="description"` (fixed per page, §3.3 table).
- One `<link rel="canonical">` = the exact served `.html` URL
  (`{SITE_URL}/` for home, `{SITE_URL}/about.html`,
  `{SITE_URL}/hospice/<id>.html`); `SITE_URL` is the new `siteUrl` field in
  `data-raw/site-config.json` (ADR-0009 source-of-truth pattern, arch §3.7).
- Full Open Graph set (`og:type` website / `article` for hospice pages,
  `og:site_name`, `og:title`, `og:description`, `og:url`,
  `og:image` = `{SITE_URL}/og-image.png` with `og:image:alt`) and a
  `summary` Twitter card (`twitter:title`, `twitter:description`).
- JSON-LD in one `<script type="application/ld+json">`,
  `@graph` = [ `Organization`, (+ `HealthCareBusiness` on hospice pages) ]:
  - `Organization` (all pages, values from `data-raw/site-config.json`):
    `name`, `url`, `email`, third-party-voice `description`.
  - `HealthCareBusiness` (hospice pages): `name`, `url`, `description`
    (the meta description, unescaped), `address` (PostalAddress) **only**
    when the postcode is non-empty, `geo` (GeoCoordinates) **only** when
    placed (lat/lon non-null).
- **No-endorsement guard (R13/R14):** emitted JSON-LD must **never** contain
  `sameAs` (even though `hospices.json` carries a `website` field),
  `affiliation`, `parentOrganization`, `contactPoint`, `openingHours`,
  pricing, or any field the hospice itself would claim. All template text
  stays in third-party voice ("approximated", "estimated").
- **No `lastmod`:** no faithful change date exists for derived data;
  emitting one would misrepresent provenance and break byte-stability.

Escaping: names HTML-escaped in `<title>`/`<meta>`/`og:*`/`twitter:*`;
`JSON.stringify` handles the JSON-LD document. New operator asset
`public/og-image.png` (1200×630; placeholder ships, final mark is V2).

## Alternatives considered

- **Meta tags only, no JSON-LD:** rejected — weaker search presentation for
  a directory-style product whose pages are business-centric.
- **Association fields (`affiliation`/`sameAs`):** rejected — misrepresentation
  of a third-party site (security, R13/R14).
- **`lastmod` from build time:** rejected — non-deterministic across builds
  and semantically false.

## Consequences

**Positive (accepted):** rich search and social presentation; structured
data stays honest — data absence is omitted, not faked; zero runtime cost
(inline bytes in 171 small files).
**Negative (accepted):** the `Og-image` is a placeholder until the operator
commits the final 1200×630 mark (V2 — quality, not validity); the
no-endorsement guard deliberately narrows what can be expressed (no
hospice websites in the markup) — accepted for accuracy.
