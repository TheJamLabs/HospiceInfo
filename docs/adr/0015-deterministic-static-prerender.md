# ADR 0015 — Deterministic static prerender (shell pages, `.html` URLs, zero deps)

**Status:** accepted (2026-10-29)

## Context

AC2 (Cycle 3) requires every routable page to exist as a real, crawlable
document: CSS, meta, and JSON-LD must be present without executing JS. Today
the site is a pure hash-routing SPA (ADR-0007): the only HTML on the wire is
`dist/index.html` with an empty body. A sitemap of real per-hospice URLs is
impossible without emitting files. Standing constraints: ADR-0004/ADR-0014 —
zero backend, Cloudflare Pages git-connected, only `dist/` ships, build
command `npm ci && npm run build` (no Pages config change); ADR-0008 — no new
npm dependencies; the byte-identical rebuild ritual (ADR-0006 build-input
discipline, §3.2 of `.agents/architecture.md`).

## Decision

- New build step `scripts/prerender.mjs` (zero dependencies — `node:fs`
  only), wired by the single `package.json` line
  `"build": "tsc -b && vite build && node scripts/prerender.mjs"`.
- **Shell page model:** every emitted page = per-page `<head>` (title, meta
  description, canonical, Open Graph/Twitter, JSON-LD — ADR-0018) +
  `<div id="root"></div>` + the boot script and asset tags extracted verbatim
  from the built `dist/index.html`. The React app renders the body on load;
  the app's components stay the single source of user-visible prose.
- **Page set (derived from data, never hard-coded):** `index.html` + 6 info
  pages (fixed array) + one `hospice/<id>.html` per id in
  `public/data/hospices.json` (161 today: 152 en / 3 sc / 6 ni / 0 wales) +
  `sitemap.xml` + `robots.txt` + `404.html` = 171 files. In-code invariant:
  sitemap `<loc>` count must equal `hospices.json` length + 7, else exit
  non-zero.
- **`.html` URLs:** files ship with the `.html` extension and every canonical /
  Open Graph / sitemap URL points at the served `.html` URL (home: `/`
  only). No `_redirects` layer (Pages serves exact paths; a rewrite layer is
  a second moving part for marginal SEO gain — open question for Reviewer,
  `.agents/architecture.md` §11.1).
- **Determinism (enforced in code, arch §3.2):** ids iterated code-unit
  ascending; fixed info array; no timestamps / `lastmod` / `Date.now()` /
  randomness / environment-derived strings; LF endings, one trailing newline;
  fixed input list (`hospices.json`, `data-raw/site-config.json`, built
  `dist/index.html`) — no directory walking.
- **Idempotence:** before emitting, the previously emitted per-page files
  (6 info, `dist/hospice/`, `sitemap.xml`, `robots.txt`, `404.html`) are
  deleted so ids that leave `hospices.json` cannot leave stale pages behind.

## Alternatives considered

- **Vite HTML-prerender plugins:** rejected — young ecosystem, headless-browser
  code paths, non-deterministic internals, new dependency (ADR-0008).
- **Headless-chrome prerender at build:** rejected — browser + network
  dependency at build time breaks byte-identity and offline rebuildability.
- **Cloudflare Functions / SSR (`next-on-pages` etc.):** rejected — breaks
  ADR-0014 zero-backend, adds a server runtime to a static contract, and
  nothing here needs server-side rendering.
- **Full-content prerender (write rendered text into each file):** rejected —
  duplicates legal/prose text into 161+ static copies that can drift from the
  React components (violates the ADR-0009 single-source discipline); bytes
  become much larger and harder to stabilise.

## Consequences

**Positive (accepted):** crawlers read real document titles, meta, canonical,
and JSON-LD without executing JS; the "count matches `hospices.json`" AC2
invariant is machine-enforced inside the script, not eyeballed; zero new
dependencies; emitted bytes are a pure function of their inputs (ADR-0015
§3.1–3.2, arch §9 check 2 double-build byte-compare).
**Negative (accepted):** first paint on a direct page load is an empty shell
until JS runs — the SEO value of the pages is the `<head>`; ~170 files of 1–2
kB each (< 300 kB total) are added to `dist/` (25 MiB asset limit untouched);
asset-tag extraction couples the script to the structure of the built
`dist/index.html` (Vite's output contract — stable for Vite 5).
