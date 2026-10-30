# ADR 0023 — Rename to "Hospice Finder UK" across the 8 display surfaces (identifiers untouched)

**Status:** accepted (2026-10-29)

## Context

AC1 (Cycle 3) renames the product to **Hospice Finder UK**. The site's
technical identity — slug `hospiceinfo` (Cloudflare Pages project), repo
name `HospiceInfo`, `package.json` name `hospice-catchment-map`,
`wrangler.jsonc` `name`/`slug` — must **not** change (Pages slugs are
immutable in place; renaming breaks the live URL contract). Only
user-*visible* (display) surfaces change, so the rename is a string
replacement across a fixed, enumerable set — no identifier, URL, id, npm
script, or deployment target moves.

## Decision

Exactly **8 display surfaces** change (full table: arch §2):

1. `index.html` — `<title>` (and the in-app document title it seeds).
2. `src/AppShell` (or equivalent, per arch §2) — the `<h1>` / header link text.
3. `public/manifest.webmanifest` — `name` and `short_name`.
4. `public/logo.svg` — `aria-label` (lands with ADR-0022).
5. Prerender **page titles** — all 171 emitted `<title>` tags (template text
   in `scripts/prerender.mjs`, arch §3.3).
6. Prerender **`og:title` / `twitter:title`** — same template.
7. Prerender **404 title** — `Page not found — Hospice Finder UK`.
8. `src/` **page `<h1>`s** (index, about, corrections, feedback, privacy,
   licences, accessibility) — the six info h1s + the index h1.

Determinism guard (arch §9 check 8):
`grep -rni "hospice catchment map" index.html public/ src/` → **zero hits**
after the pass. Because every name occurrence is a constant in the
templates/source (no build-time interpolation), the rename is
byte-deterministic and covered by the existing double-build ritual.

**Not renamed (explicit non-goals):** `wrangler.jsonc` `name`/`slug`
(`hospiceinfo`), the Pages project, the repo `HospiceInfo`, `package.json`
`name` (`hospice-catchment-map`), npm script names, ADR file names, `docs/`
paths, file names, and all hospice/practice ids.

## Alternatives considered

- **Rename the Pages slug too:** rejected — `hospiceinfo` lives in
  `wrangler.jsonc` and is part of the deployment contract; changing it
  requires a new project and breaks the existing published URL base.
- **Rename repo / package name too:** rejected — churn for zero user-facing
  benefit; `package.json` name is not user-visible.
- **Single global find-replace over the whole tree:** rejected — would
  corrupt identifiers (e.g. `wrangler.jsonc`, file names); the 8-surface
  fixed list keeps the change enumerable and reviewable.

## Consequences

**Positive (accepted):** the product name is consistent for users
(browser tab, header, manifest, logo a11y, search titles, OG cards, 404)
while the technical identity stays stable — no URL churn, no deployment
change, zero effect on the byte-identity ritual.
**Negative (accepted):** two names now coexist (display "Hospice Finder UK"
vs internal `hospiceinfo` / `hospice-catchment-map`) — accepted: the
internal name is invisible to users and the split is deliberate and
documented here and in arch §2.
