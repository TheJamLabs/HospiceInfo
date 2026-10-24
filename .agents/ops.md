# Ops — public-ready hospice catchment map (stage 8, 2026-10-22)

Supersedes the 2026-10-16 ops file (whose deploy assumption — "any static
host" — predates the Cloudflare Pages decision). Author: the Engineering
Lead (inline; the gate sub-sessions in this environment are timeout-prone —
QA/Security both died with zero writes, precedent 2026-10-22). User-facing
summary: `docs/MAINTENANCE.md` (Docs stage refreshes it from this file).

## Host

Cloudflare Pages (grill decision). Static site, **no backend, no
environment variables, no build-time secrets, no form endpoint** — the only
runtime egress is OSM tile requests and user-initiated `mailto:` links
(`.agents/security.md` trust-boundary statement). Hash routing (ADR-0007)
means the server only ever serves `index.html`: fragments never reach it, so
no SPA rewrites, no `_routes.json`, no 404 page are needed.

## Running the app

- `npm install` (new machine), then:
  - Dev: `npm run dev` — Vite on `http://localhost:5173` (auto-increments
    if a prior session holds the port).
  - Production: `npm run build` → `dist/` (`dist/data/*.json` copied from
    `public/data/` by Vite — verified present after the 2026-10-22 build).
    Deploy `dist/`.

## Deploying to Cloudflare Pages (operator-run)

1. One-time: `npm i -D wrangler` (wrangler is a dev tool, not a runtime
   dep), `npx wrangler login`.
2. One-time: `npx wrangler pages project create hospiceinfo` (then proceed
   to 3; a git-connected project is not required — directory deploys keep
   the operator's hand on every publish).
3. Publish:
   ```bat
   npm run build
   npx wrangler pages deploy dist --project-name=hospiceinfo
   ```
4. Preview a build before promoting: `npm run preview` (local) or publish
   to a branch: `npx wrangler pages deploy dist --branch-name=test` → the
   `…--test` preview URL; nothing touches the production URL.
5. Custom domain: operator configures in the Pages dashboard when chosen;
   none is required for the site to function.

## Pre-publish gate — BLOCKING (do not publish public until all green)

| # | Item | Owner | Status at 2026-10-22 |
|---|------|-------|----------------------|
| G1 | Commit this cycle's changes — currently **all uncommitted** (`git status`): 19 modified tracked files + new `src/pages/`, `src/lib/{useRoute,siteConfig,feedback}.ts`, 4 new scripts, 4 new ADRs, `data-raw/site-config.json`, `public/data/corrections.json` | lead/human | open |
| G2 | `data-raw/uk-land.json` fetched on a networked machine, committed, SHA-256 + polygon count recorded in `data/README.md`; `npm run build-data` twice byte-identical; `node scripts/validate-tessellation.mjs` exit 0; coastal spot-check (procedure in `qa.md` §A1 remainder) | human | open (defers A1 full clip gate) |
| G3 | SEC-F1: ODbL attribution corrected (LegalPage "OS Open Data" section → OSM `natural=coastline` contributor credit; Nominatim coordinates into OSM section; registers section; `data/README.md` ODbL line) | Docs stage (9) | open |
| G4 | Real operator name + contact email in `data-raw/site-config.json` **and** `src/lib/siteConfig.ts` (ADR-0009 lockstep) | operator | open (placeholders) |
| G5 | 8-point mobile live pass (`qa.md` §A6 checklist) | human | open |
| G6 | `npm run build` exit 0; `node scripts/validate-corrections.mjs` exit 0 | lead/human | green now (re-run after G1–G5) |

## Data refresh (canonical chain, in order)

1. One-time only: `node scripts/fetch-uk-land.mjs` (networked machine) →
   commit `data-raw/uk-land.json` (ADR-0006; while absent, steps 4–5 fail
   fast by design — no box-only fallback).
2. Nation extracts (each exits 0; absent input files → documented `[]`
   placeholder + procedure log):
   `extract-gp-practices.mjs`, `extract-gp-practices-sc.mjs`,
   `extract-hospices-sc.mjs`, `extract-gp-practices-ni.mjs`,
   `extract-hospices-ni.mjs`, `extract-gp-practices-wales.mjs`,
   `extract-hospices-wales.mjs` (all under `scripts/`).
3. `node scripts/merge-hospices.mjs` (asserts exactly 20 curated, unique ids).
4. `node scripts/geocode-postcodes.mjs` — the long pole. 1 req/s to OSM
   Nominatim, resumable append, exits non-zero on coverage gaps. Monitor >1 h
   batches.
5. `node scripts/build-data.mjs` — run **twice**; `public/data/*.json` must
   be byte-identical (SHA-256).
6. `node scripts/validate-tessellation.mjs` — exit 0 (100% land coverage;
   known printed quirks: Basildon degenerate cell, "Wisdom Hospice" sliver).
7. `npm run build` — tsc + vite, exit 0.
8. Commit `data-raw/` + `public/data/` (plus any touched scripts); publish
   per the deploy steps above.

Pending human fetches (4 files + 1 email; exact steps in `data/README.md`):
RQIA XLSX (NI hospices), data.wales GP layers, NHS Scotland GP GeoJSON, CIW
email reply (Welsh hospices). On receipt: run the extract → (merge for
hospice files) → geocode → build → validate, then commit + publish.

## Corrections log (public, post-deploy)

Any data fix after launch: `node scripts/add-correction.mjs "summary"
[--data-changed]` → `validate-corrections.mjs` → commit → publish. The site
renders the log at `#corrections` (page-local fetch only).

## Validation (definition of healthy)

- `npm run build` exit 0; `validate-tessellation.mjs` exit 0 (after G2).
- Double `build-data.mjs`: SHA-256 of the four `public/data/*.json`
  identical across runs. (Hashes recorded in the 2026-10-16 ops file are
  stale — pre-land-file build; re-record after G2 lands.)
- Build invariants: `hospices: 155 (unplaced: 0)`; `assigned: 9552,
  unassigned: 12` (the 9 OSM-gap postcodes); `shops: 138, unresolved ids: 0`.
- `data-raw/postcode-geo.csv`: 8,364 rows of 8,373 in scope.

## Rollback

- **Live site:** Cloudflare Pages keeps every deployment; roll back by
  re-deploying the previous deployment (dashboard → Deployments → restore,
  or `npx wrangler pages deploy dist` from the prior git commit after
  `git revert`). Blast radius: the published URL only.
- **Repository:** the feature will land as one commit on `main`; `git
  revert <sha>` (or reset to `5faa12e`) restores the previous pilot-scope
  state (`docs/MAINTENANCE.md` rollback section).
- **Data:** `public/data/*.json` regenerate byte-identically from committed
  `data-raw/` — a bad data set rolls back by re-running the chain, no code
  rollback needed.
- No migrations, no shared state, no external writes beyond the publish
  itself.

## Known operational risks

- Geocoding wall time (hours) — resumable; 429/503 backoff can stretch it.
- The 9 OSM-gap postcodes persist until OSM coverage changes — the geocoder
  exiting 1 on them is documented, do not loop.
- `npm audit`: 3 advisories (xlsx devDep high ×2, esbuild dev moderate ×1)
  — unaffected advisory set, dev-only, not in `dist/` (SEC-5).
- Port 5173 frequently held by a prior session's server; Vite auto-increments.
- `wrangler` is not pinned in `package.json` when installed ad-hoc — pin it
  as a devDependency at G1 time so deployment is reproducible.
