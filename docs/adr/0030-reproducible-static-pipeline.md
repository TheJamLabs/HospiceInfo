# ADR 0030 — Hospice Finder is a reproducible end-to-end static pipeline

**Status:** accepted (2026-10-30)

## Context

By end of Cycle 4 the project's production path spans several independently
developed stages: committed OSM-derived inputs, deterministic data builds, a
Vite/React build with a zero-dependency prerender, and a git-connected
deploy. Each of those decisions was made separately (ADR-0004, ADR-0006,
ADR-0008, ADR-0014, ADR-0015, ADR-0029), and the invariants binding them
together (byte-identical rebuilds, fail-fast data builds, `dist/`-only
publication) live scattered across those ADRs, `.agents/ops.md`, and
`docs/MAINTENANCE.md`. Cycle 4's rebrand (W1–W10) makes the contract explicit
enough to state in one place: everything a visitor sees is a pure function of
committed bytes, and no stage needs a secret, a network call, or a runtime
service.

## Decision

The production pipeline is fixed as a reproducible, deterministic, static
chain, each hop a pure function of the committed inputs:

1. **Inputs (committed):** `data-raw/` — 4 nation GP practice files, 4 nation
   hospice files, `postcode-geo.csv` (Nominatim, ADR-0029), `shops-osm.json`
   (Overpass, ADR-0029), `uk-land.json` (OSM land mask, ADR-0006),
   `site-config.json`. SHA-pinned where remote (land mask, G7 re-pin
   2026-10-30).
2. **Data build:** `scripts/build-data.mjs` → `public/data/*.json` (assets).
   Fail-fast: exits non-zero on any missing input/field; fixed input list, no
   directory walking, no timestamps (ADR-0006 build-input discipline).
3. **Site build:** `npm run build` = `tsc -b && vite build && node
   scripts/prerender.mjs` → `dist/` = 171 files (169 `.html` shells + assets +
   `sitemap.xml` + `robots.txt` + `404.html`), byte-identical across
   double-builds (ADR-0015 invariant; `sitemap <loc>` count =
   `hospices.json` length + 7, enforced in code).
4. **Publish:** push to `main` → Cloudflare Pages builds `npm ci && npm run
   build` and serves `dist/` (ADR-0014). No backend, no runtime network.

Guarantees: a fresh clone + `npm ci` + `npm run build` reproduces the exact
deployed bytes with **no API key, no network access, and no environment
difference**; the verification-chain ritual (`build-data` ×2 byte-identity,
`validate-tessellation`, `npm run build` ×2, `check:layout`) is the gate
before any push (`.agents/ops.md` §4); rollback is twofold — restore the
previous Pages deployment, or `git revert` + push (push rebuilds and
re-publishes).

## Alternatives considered

- **Runtime-as-a-service (CF Workers/Functions SSR):** rejected — breaks the
  zero-backend contract, reintroduces nondeterminism (edge runtime versions),
  and nothing in the product needs server-side execution (ADR-0014, ADR-0015).
- **Unpinned remote inputs (fetch at build):** rejected — a Cloudflare Pages
  build must reproduce bytes offline; remote fetches make the publish
  non-reproducible and couple deploy success to third-party availability.
- **Manual single-machine publish (wrangler CLI):** superseded by ADR-0014's
  git-connected publish; the manual path stays only as an emergency override.

## Consequences

**Positive (accepted):** any commit is buildable and deployable from a clean
clone with no secrets; the deploy is auditable byte-for-byte against the
commit; rebranding/data updates are ordinary commits gated by the §4 chain;
total cost is storage + bandwidth on Pages, currently bounded by a 3.14 MiB
max asset against a 25 MiB limit.
**Negative (accepted):** every push to `main` publishes — the pre-push
verification chain is therefore a hard obligation, not a suggestion
(ADR-0014); `data-raw/` bloats the clone (55 MiB land mask); a broken data
re-fetch must be repaired in the raw files, not worked around at build time,
because the raw files are the source of truth between re-fetches (ADR-0029).
