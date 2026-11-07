# Maintenance — Hospice Finder UK

Operator-facing guide for running, building, deploying, and validating
Hospice Finder UK. Provenance detail per file:
[`data/README.md`](data/README.md). Design rationales: [`docs/adr/`](docs/adr/).
Vocabulary: [`GLOSSARY.md`](GLOSSARY.md).

Cycle 3 (2026-10-29) — deterministic static prerendering, SEO surface
(`sitemap.xml` + `robots.txt`) and hash-redirect guard.

## What you'll see

- **Diamond markers** — hospice sites (colour is a deterministic hash of the
  hospice id, so it is stable across rebuilds)
- **Point markers** — each GP practice, colour-coded by catchment
- **Polygons** — each hospice's catchment: a Voronoi tessellation clipped to
  the UK coastline
- **Square markers** — charity shops (toggleable). Non-matching-nation shops
  are dimmed on the map based on the selected tab
- **Grid-bucket markers** — at low zoom one marker per 0.5° grid cell
  stands in for its practices; clicking a bucket flies to zoom 11, where
  that area renders individual practice markers

## Start here

Use the **Start here** card on the landing page (postcode lookup) or load
practices directly on map load with the data present. Interact with the
card via a pill; unknown routes default to the landing card.

## Quick start

Requires Node 18+ (tested on Node 22). The app is a static single-page app;
no server required.

```bat
npm install      :: once, per machine
npm run dev      :: dev server → http://localhost:5173
```

In a new terminal from the same folder:

```bat
npm run build    :: tsc -b && vite build && node scripts/prerender.mjs → dist/
                  :: emits 169 static shells + sitemap.xml + robots.txt (181 files total)
```

To test the built app locally (the published site is the `main` build — see
Deploy):

```bat
npm run preview   :: local test of the shipped static file
```

## Providing feedback

The `#feedback` route opens your default mail client with a stub body and
recipient placeholder. No data is sent or collected.

## Updating data

The site has no forms: feedback is a user-triggered `mailto:` only — no
outbound connections beyond OSM tiles and the user's own mail client.

1. Refresh the raw registers as documented in [`data/README.md`](data/README.md),
   which records exact URL/as-of info, then re-run the extract scripts in
   order. A missing source file yields a documented `[]` placeholder.
2. `node scripts/merge-hospices.mjs`, then `node scripts/geocode-postcodes.mjs`
   (Nominatim = 1 req/s, resumable; takes roughly 2.5h for ~8,400 areas).
3. `node scripts/build-data.mjs` (run **twice** and check byte-identity of each
   output), then `node scripts/validate-tessellation.mjs`, then `npm run build`.

The extract scripts exit 0 on success and log the register header;
Nominatim backs off on 429/503, so a fresh run is safe to leave unattended.

## Pre-publish gates

The pre-launch gates table tracks the final checks before publish. Each gate
has an owner and acceptance criteria; all gates must be green before the
first live deploy. See [.agents/ops.md](.agents/ops.md) for the full Cycle 3 gate table.

| Gate | Item | Owner | Acceptance |
|---|---|---|---|
| C3-1 | Build chain | `npm run build` | exit 0; log ends `emitted 171 files (161 hospice pages)` |
| C3-2 | Emitted file counts | Node walk of `dist/` | 169 `.html` (1 index + 6 info + 161 hospice + 404), 181 physical files total (171 emitted + 10 Vite outputs) |
| C3-3 | Boot-script balance | 338 `<script` / 338 `</script>` | 338 / 338, 0 mismatching (2/2 per page) |
| C3-4 | Sitemap | `dist/sitemap.xml` | 168 `<loc>` entries (161 hospice pages + 7 others), 0 `<lastmod>` |
| C3-5 | `robots.txt` | `dist/robots.txt` | exactly 75 bytes, LF endings, one trailing LF |
| C3-6 | Byte-identical double-build | Double SHA-256 of `dist/` tree | base: `170036dafcd4…53819`; emitted: `9916acb6…` |
| C3-7 | Brand rename | `dist/index.html` | 0 hits for "catchment map", 100% for "Hospice Finder UK" |
| C3-8 | Logo circle | Validate HTML | `<circle` = 1 (SVG) |
| C3-9 | Data anchors | All sitemap `<loc>` entries | `f7df12fd/65818ace/cc096f17/dd19e8ae` |
| C3-10 | Layout check | `npm run check:layout` | exit 0 (styles.css keeps exactly 3 `flex-direction`) |

### Rollback

- **Live site:** Cloudflare Pages keeps every release; rollback = redeploy the
  previous release from the Pages dashboard (Deployments → restore). The Cycle 3
  prerender changes are build-time only — a prior deployment predates the
  prerender step, so a redeploy fully reverts the published content (the 169
  pre-rendered shells, `sitemap.xml`, `robots.txt`) to the prior build. No
  backend, no migration and no data-file change means no extra steps beyond the
  single dashboard action.
- **Code/git:** `git revert <sha>` + a James-approved push rebuilds and
  republishes the previous state (ADR-0014).
- **Data:** `public/data/*.json` regenerate byte-identically from committed
  `data-raw/` — a bad data set rolls back by re-running the chain, no code
  rollback needed; the prerendered page set re-derives from the restored data
  on the next build.

## Deploy (Hospice Finder UK) — git-connected (ADR-0014)

The site is static: `npm run build` produces `dist/`. The Pages project
`hospiceinfo` is git-connected to `main`: every James-approved push runs the
build command `npm ci && npm run build` and publishes `dist/` (`pages_build_output_dir`
in the repo's `wrangler.jsonc`). No local `wrangler login` or deploy command is
needed — the approved push triggers a rebuild of 181 files and publishes them
automatically. `data-raw/` stays committed; it is excluded from the deployment
by the output directory (only `dist/` ships). Branch previews for
pre-promote checks: push the branch and open its preview URL in the Pages dashboard.

**Post-deploy verification**

Run these against the production URL (`https://hospiceinfo.pages.dev`) once the
publish completes:

1. `curl -s -I https://hospiceinfo.pages.dev/` → `200`; headline contains
   "Hospice Finder UK".
2. Sample hospice page (id without ampersand):
   `curl -s https://hospiceinfo.pages.dev/hospice/en-1-120960209.html` → 200;
   body contains:
   - balanced `</script>` closing;
   - `<link rel="canonical" href="...">`;
   - `application/ld+json` block with a `HealthCareBusiness` node;
   - title includes the hospice name and "Hospice Finder UK".
3. `curl -s https://hospiceinfo.pages.dev/sitemap.xml` → 200; count of
   `<loc>` entries is **168**.
4. `curl -s https://hospiceinfo.pages.dev/robots.txt` → 200; the 75-byte body
   matches gate C3-5.

**Rollback**

- **Live site:** Cloudflare Pages keeps every prior release; restore the
  previous deployment from the Dashboard (Pages → project → Deployments).
- **Code:** `git revert <sha>` + James-approved push rebuilds and republishes
  the prior state (ADR-0014).
- **Data:** `public/data/*.json` are regenerated byte-identically from
  `data-raw/` — a bad data set rolls back by re-running the data chain, no
  code rollback needed; the prerendered page set re-derives from the restored
  data on the next build.


## Land file — `data-raw/uk-land.json` (ADR-0006)

The tessellation is clipped to the committed OSM land file
[`data-raw/uk-land.json`](data-raw/uk-land.json).

The committed version is SHA-256
`038a1635f65d8ae28e8b6388e3eaea1d29d5757fcb4c8b78c7c06cec82653819` (22,999
polygons), recorded in `data/README.md`. Both `build-data.mjs` and
`validate-tessellation.mjs` fail fast if the file is absent. Do not weaken
the coverage check.

Site contact details: [`data-raw/site-config.json`](data-raw/site-config.json)
(the operator-controlled source that `src/lib/siteConfig.ts` mirrors).

### Fetching guidelines

The OSM coastline was fetched once via Overpass:
```bat
node scripts/fetch-uk-land.mjs  :: networked machine only
```

Re-fetching (e.g. the carried G7 re-check) is a rebuild event: re-pin the
SHA-256 in `data/README.md`, re-run the byte-identity and tessellation
checks, then publish. Once the file is committed, subsequent builds use it
as-is.

## Corrections log

`public/data/corrections.json` is a committed array, newest first, storing
a `date`, `summary`, and `dataChanged` flag. To add one:

```bat
node scripts/add-correction.mjs "summary" [--data-changed]
```

Then validate with `node scripts/validate-corrections.mjs`, commit, and
publish. The site renders the log at `#corrections` (page-local fetch only).

## Sanity checks for a healthy build

- `hospices: 161 (unplaced: 0)` and the per-nation counts in the modal.
- `unassigned: 12` — see `data/README.md`; do not chase them in the geocoder.
- `shops: 138, unresolved ids: 0`.
- SHA-256 of the four `public/data/*.json` identical across two builds.
- Validator: 100% coverage (the Basildon degenerate cell and "Wisdom
  Hospice" sliver entries are known, accepted quirks).
- `npm run check:layout` exits 0 (styles.css keeps exactly 3
  `flex-direction`).

## Cycle 4 (2026-10-30) — BEACON ops runbook

Cycle 4 (2026-10-30) — BEACON rebrand (10 `--hf-*` design tokens, ADR-0028;
display name remains **Hospice Finder UK**, ADR-0023), Auto/Light/Dark theme
picker (ADR-0024 + ADR-0027 dark Leaflet CSS), GP and charity-shop layers OFF
on first load (ADR-0025), de-emphasised GP layer (ADR-0026), removal of the
"Has published service area" filter, and three self-hosted OFL 1.1 fonts
(`public/fonts/`). The Cycle 3 sections above remain the base guide; where
this section states larger counts (184 files, 507/507 scripts), those are the
current values. Full Cycle 4 ops detail:
[.agents/ops.md](.agents/ops.md) (supersedes the Cycle 3 file at that path;
the Cycle 3/2/1 text is in git history: `git show c6da9d3:.agents/ops.md`).

**Standing pre-push chain** (ops.md §7.1 — every future push, in this order):

```bat
npm run build-data                 :: twice; outputs byte-identical
                                    :: (SKIP only when data/ + data-raw/ are
                                    :: untouched in the diff — checked first)
node scripts/validate-tessellation.mjs   :: exit 0
npm run build                      :: twice; dist/ trees byte-identical (SHA-256)
npm run check:layout               :: exit 0
```

then commit → James-approved push to `main` → Pages auto-publish.
`validate-tessellation` is the long pole (~110–160 s); run it as a background
job, never foreground. `npm ci` (not `npm install`) is the reproducible
install — reproducibility is pinned by `package-lock.json` (ADR-0030).

**Dist invariants** (re-asserted on every push; Cycle 4 values):

| Invariant | Check | Expectation |
|---|---|---|
| Physical files | Node walk of `dist/` | **184** (171 emitted: 169 `.html` shells + `sitemap.xml` + `robots.txt`; + 13 Vite-copied: 2 assets, 3 woff2, `logo.svg`, `manifest.webmanifest`, `og-image.png`, 5 `data/*.json`) |
| Sitemap | `dist/sitemap.xml` | **168** `<loc>` (161 hospice + 7), 0 `<lastmod>` — asserted in `scripts/prerender.mjs`, non-zero exit on violation |
| Boot snippet | grep `hfuk-theme` in all emitted shells | present in **169/169** HTML shells |
| Script balance | count across `dist/**/*.html` | **507** `<script` / **507** `</script>`, 0 mismatches (SEC-3-01 re-check) |

**Theme boot snippet — two-file rule.** The no-flash theme-boot snippet is
frozen and byte-identical in the app shell `index.html` and the prerender
twin `scripts/prerender.mjs` (381-char snippet). Any edit to it is a
**two-file edit** — both files, byte-for-byte — and then re-run the 169-shell
assertion above (QA gate 10). A one-sided edit silently desyncs all 169
emitted shells. The only persisted user preference on the site is the
`hfuk-theme` localStorage key: `"light"` / `"dark"`, absent = auto (follows
`prefers-color-scheme`, re-resolved live via a `matchMedia` listener); values
are whitelisted on read (ADR-0024, SEC-4-D1 — do not add a second
localStorage key without a security review).

**Data refresh** (ops.md §7.2 — only when `data/` or `data-raw/` change):
fetch fresh inputs only through the committed scripts, then `npm run
build-data` (double-run byte identity) → `node scripts/validate-tessellation.mjs`
(exit 0; ~110–160 s, background job) → `npm run build` (double-build
identity) + `npm run check:layout` (exit 0) → commit data assets and raw
inputs together (never split) → push. Provenance — SHA-256 of every remote
input — is recorded in [`data/README.md`](data/README.md) before the push
(push = publish; SEC-4-D2: no external writes into `data-raw/`).

**Deploy & rollback** (ADR-0014, ADR-0030). A James-approved push to `main`
runs `npm ci && npm run build` on Cloudflare Pages and publishes `dist/` — the
push **is** the publish; no local deploy command, no secrets, no build-time
network. A failed Pages build does not replace the live site — the previous
deployment stays up. Rollback is twofold:

- **Code:** `git revert <sha>` + James-approved push. Because the build is
  deterministic (a fresh clone + `npm ci` + `npm run build` reproduces the
  deployed bytes offline), rollback reproduces the previously published
  output **byte-for-byte** — no drift between reverted code and what was
  served.
- **Live site (immediate, no code change):** restore the previous deployment
  from the Pages dashboard (Deployments → restore); blast radius is the
  published URL only. Then follow with the `git revert` so tree and site
  agree.

Post-publish smoke checks: ops.md §5 (169 pages/`hfuk-theme` shells, 168
`<loc>`, `robots.txt` 75 bytes, three woff2 served at
14,508 / 14,632 / 14,592 bytes).
