# Maintenance — Hospice Finder UK

Operator-facing guide for running, building, deploying, and validating
Hospice Finder UK. Provenance detail per file:
[`data/README.md`](data/README.md). Design rationales: [`docs/adr/`](docs/adr/).
Vocabulary: [`GLOSSARY.md`](GLOSSARY.md).

Cycle 5 (2026-11-08) — data landing: Scotland +2 (PalliativeCare Scotland
directory append, `sc-pcs-30/58`, ADR-0032), Wales verified-negative 0
final (ADR-0020), 192 hospices (en 152, sc 34, ni 6, wales 0).

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
                  :: emits 216 static shells + sitemap.xml + robots.txt (231 files total)
```

To test the built app locally (the published site is the `main` build — see
Deploy):

```bat
npm run preview   :: local test of the shipped static file
```

Cycle 8 (C8) — start-here geocode fallback (Pages Function at
`functions/api/postcodes/[postcode].ts`) local test against the built
output:

```bat
npx wrangler pages dev dist   :: local Pages dev server (wrangler not pinned)
```

The route reads `POSTCODES_IO_BASE`, `POSTCODES_ACCESS_CLIENT_ID` and
`POSTCODES_ACCESS_CLIENT_SECRET` from `.dev.vars` only — that file is
git-ignored and never committed. Without `.dev.vars` the upstream
returns 403, the function returns 502, and start-here shows the
not-found card (documented degradation).

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
needed — the approved push triggers a rebuild and publishes the **231 dist
files** (215 of which are `<loc>`-tracked static pages — 208 hospice pages +
7 others in `sitemap.xml`) automatically. `functions/` ships automatically
with the same push — the C8 Pages Function (`/api/postcodes/{postcode}`) is
part of every build (ADR-0037); there is no separate deploy command.
`data-raw/` stays committed; it is excluded from the deployment by the output
directory (only `dist/` ships). Branch previews for
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
   `<loc>` entries is **215** (208 hospice pages + 7 others).
4. `curl -s https://hospiceinfo.pages.dev/robots.txt` → 200; the 75-byte body
   matches gate C3-5.

**Cycle 8 probes** (C8 Pages Function `GET /api/postcodes/{postcode}`,
ops-cycle8.md §3). Run once the first C8 publish completes; the owner records
results in `.agents/implementation.md` — record only what was observed:

```bat
curl -s -D - https://hospiceinfo.pages.dev/api/postcodes/PR72TH  :: acceptor 1
curl -s https://hospiceinfo.pages.dev/api/postcodes/CF119HD      :: acceptor 2
curl -s https://hospiceinfo.pages.dev/api/postcodes/BT153LH      :: acceptor 3
curl -s https://hospiceinfo.pages.dev/api/postcodes/LS14AP       :: acceptor 4 (tier-1 vector)
curl -s -D - https://hospiceinfo.pages.dev/api/postcodes/ABC     :: malformed shape
curl -s https://hospiceinfo.pages.dev/api/postcodes/AA99AA       :: valid shape, unresolvable
```

Expected results:

- PR7 2TH, CF11 9HD, BT15 3LH, LS1 4AP → `200` with exactly the keys
  `postcode`, `latitude`, `longitude`, and `Cache-Control: no-store`
  (verify `content-type` + `cache-control` on at least one 200 and one
  non-200).
- `ABC` → `400`, body exactly `{"error":"bad-postcode"}`.
- `AA99AA` → `404`, body exactly `{"error":"unknown postcode"}`.
- Run the PR7 2TH command **before the C8 secrets in Quick start are set**
  (or after deleting one) → `502`, body exactly `{"error":"postcode service
  unavailable"}`; start-here in the UI renders the not-found card. Do not
  force a 502 after the secrets are set.

A probe reading `500` is a missing/typo'd env key (SEC-8-02 class) — record
it with that label and re-set the secret; no code change.

**Rollback**

- **Live site:** Cloudflare Pages keeps every prior release; restore the
  previous deployment from the Dashboard (Pages → project → Deployments).
- **Code:** `git revert <sha>` + James-approved push rebuilds and republishes
  the prior state (ADR-0014).
- **Data:** `public/data/*.json` are regenerated byte-identically from
  `data-raw/` — a bad data set rolls back by re-running the data chain, no
  code rollback needed; the prerendered page set re-derives from the restored
  data on the next build.


## Cycle 8 ops: start-here geocode fallback

Cycle 8 (C8) adds a stateless Pages Function, `GET /api/postcodes/{postcode}`
(`functions/api/postcodes/`): no new dependency, no `wrangler.jsonc` change,
no separate deploy command — it ships with `dist/` on the next push to
`main` (ADR-0037). It backs the start-here tier-2 geocode fallback; every
failure (400/404/502/500/timeout) degrades silently to the existing
not-found card. Full ops detail: [.agents/ops-cycle8.md](.agents/ops-cycle8.md).

**Owner secret setup.** The Function reads three env names, by name only
(values are owner-held and never appear in this file):

```bat
wrangler pages secret put POSTCODES_IO_BASE              :: <value>
wrangler pages secret put POSTCODES_ACCESS_CLIENT_ID     :: <value>
wrangler pages secret put POSTCODES_ACCESS_CLIENT_SECRET :: <value>
```

One command per name; each prompts for the value (hidden input). Local dev:
put the same three names in `.dev.vars` at the repo root — git-ignored,
never commit (see the Cycle 8 block in Quick start).

**Rollback.** Restore the prior release `aaee725` (the C6 ship) from the
Pages dashboard (Workers & Pages → `hospiceinfo` → Deployments → Restore),
then lock the repo with `git revert <sha>` + a James-approved push (ADR-0014).
No migration, no env cleanup — the client's silent-degradation chain
(502/404 → not-found card) makes rollback trivially safe, even mid-session.

**Carried findings (documented debt, ops-cycle8.md §5).**
- **SEC-8-01** — `GET /api/postcodes/{postcode}` is an unauthenticated public
  proxy to the owner's self-hosted postcodes.io (capacity/abuse only, no data
  leak): owner sets a rate alert in Cloudflare Analytics for a sustained
  call-rate spike on `/api/postcodes/*`.
- **SEC-8-02** — a function-internal env failure surfaces as workerd's
  generic `500`, not the contract's `502`: owner alerts on the first `500`
  (re-set the secret per the setup above) and may prefer a `502` shim for
  that class.


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

- `hospices: 192 (unplaced: 0)` and the per-nation counts in the modal
  (en 152, sc 34, ni 6, wales 0).
- `unassigned: 12` — see `data/README.md`; do not chase them in the geocoder.
- `shops: 138, unresolved ids: 0`.
- SHA-256 of the four `public/data/*.json` identical across two builds.
- Validator: 100% coverage, 0 slivers; 1 empty cell (ni-r5) is a known,
  accepted quirk.
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

## Cycle 5 (2026-11-08) — Landing ops runbook

Cycle 5 (2026-11-08) is a data-only landing pass: PalliativeCare Scotland
directory append (`sc-pcs-30` Edinburgh, `sc-pcs-58` Dunfermline; id scheme
per ADR-0031, equivalence-mapping dedupe per ADR-0032) — Scotland 32 → 34,
total 161 → 192 (en 152, sc 34, ni 6, wales 0) — and the Wales final gate
H5-1, resolved VERIFIED-NEGATIVE (live 2026-11-08 NHS Wales P&I fetch,
SHA-256-pinned; list under review and absent, so 0 is the verified final
value under ADR-0020 — re-poll when the review lifts). No UI, code, or
config changes.

The Cycle 3/4 sections above remain the base guide; where this section
states larger counts (215 files, 200 shells, 199 `<loc>`), those are the
current values. Full Cycle 5 ops detail:
[.agents/ops.md](.agents/ops.md) — "Cycle 5 — Landing (2026-11-08)"
supersedes the Cycle 4 file at that path.

**Dist invariants** (re-asserted on every push; Cycle 8 values,
disk-verified 2026-11-15):

| Invariant | Check | Expectation |
|---|---|---|
| Physical files | Node walk of `dist/` | **231** (218 emitted: 216 `.html` shells — 1 index + 6 info + 208 hospice + 1 404 — + `sitemap.xml` + `robots.txt`; + 13 Vite-copied: 2 assets, 3 woff2, `logo.svg`, `manifest.webmanifest`, `og-image.png`, 5 `data/*.json`) |
| Sitemap | `dist/sitemap.xml` | **215** `<loc>` (208 hospice + 7), 0 `<lastmod>` — asserted in `scripts/prerender.mjs`, non-zero exit on violation |
| Boot snippet | grep `hfuk-theme` in all emitted shells | present in **216/216** HTML shells |
| Data assets | double `npm run build-data` | byte-identical; SHA-256 pins in [`data/README.md`](data/README.md) |

The standing pre-push chain (ops.md §7.1), the two-file rule for the
theme-boot snippet, the data-refresh chain (ops.md §7.2), and the
deploy & rollback story above all carry over unchanged.

**Definition of healthy** (ops.md §7.4, Cycle 8 values): 208 hospices
(unplaced 0); 178 catchment cells; 100.00% coverage, 0 slivers, 1 empty
cell (ni-r5), pairwise overlap 0.0060 deg²; 138 shops (unresolved 0);
11,014 practices (11,002 geocoded, 12 unplaced = 9 BT + 3 non-BT);
20 curated rows.

**Post-publish smoke checks** (Cycle 8): sitemap 215 `<loc>`; the 216-shell
survey includes both new rows (`/hospice/sc-pcs-30.html`,
`/hospice/sc-pcs-58.html`); map smoke: Scotland 34, Wales 0; `robots.txt`
75 bytes; three woff2 served at 14,508 / 14,632 / 14,592 bytes.

## Cycle 7 (C7) — mobile 375 px layout

Cycle 7 (2026-11-15) is a mobile (≤768 px) layout pass: the Start-here sheet
opens by default (`useState(true)` + `aria-expanded`); the header collapses
to 4 lines at 375 px within a 351 px line budget (nav links hidden, "Source &
Method" moved to the footer link row); the details card is 319 px wide with
a 44 px right band and `max-height:min(75vh, calc(100% − 72px))`, sized
through the new `--hf-sheet-h` token (one definition, two consumers);
`ContainerResizeInvalidator` re-fires `map.invalidateSize()` on resize
(ResizeObserver → invalidate → `disconnect()`, no new dependency); and the
scroll-region budget keeps the map plus at most one reachable surface —
`document.documentElement.scrollHeight <= window.innerHeight` in all five
OQ1 states × dark/light. Desktop (1280 px) is unchanged, and `npm run
check:layout` still enforces the 3-`flex-direction` whitelist in
`styles.css` (L77/L89/L275). Surface: five source files (`src/App.tsx`,
`src/components/AppShell.tsx`, `src/components/MapView.tsx`,
`src/components/StartHere.tsx`, `src/styles.css`) plus ADRs 0038–0041 and
the C7 glossary terms — no data, env, dependency, or deploy-config changes.
Design rationale: ADR 0038–0041 in [`docs/adr/`](docs/adr/).

**Pre-publish chain** — from the repo root, in this order
(ops-cycle7.md §4):

```bash
npm test
npm run check:layout
npm run build
cp -r dist /tmp/dist-a
npm run build
diff -rq /tmp/dist-a dist   # expect: empty output = byte-identical
```

Expected: `npm test` 23/23; `check-map-layout: OK`; both builds exit 0 (231
dist files, 171 prerendered); empty diff. Any diff output stops the push —
determinism (ADR-0015) has broken.

**Post-publish verification**

1. Pages deploy log for the push is green (`npm ci && npm run build`,
   exit 0).
2. Live site returns 200 at the root and on one `/hospice/<id>` page.
3. Deployed `index.html` references `index-Dn97-FzZ.css` and
   `index-D61LFkAW.js` — old hashes present = the C7 build is not live.

**Rollback**

- **Code (primary):** `git revert <C7-commit>` + push to `main`. Static
  site with no data, env, or migration changes — nothing beyond the
  revert is required; the C7 diff is self-contained in the ten
  commit-scope files, so the revert is byte-clean.
- **Live site (secondary):** Pages keeps every prior release; restore the
  previous deployment from the Pages dashboard (Deployments → restore).

**Carried debt (risk-accepted)**

| ID | Finding | Follow-up |
|---|---|---|
| C7-QA-1 | Requirements item-2 wording drift (stale DOM-delta summary; implementation correct) | No code action |
| C7-QA-2 | `ContainerResizeInvalidator` undebounced (per-frame `invalidateSize()` during continuous resize) | One-line `requestAnimationFrame` coalescing, only if owner-gate item 7 shows jank |
| C7-QA-3 | Zero automated 768 px layout coverage (the 23 tests are data/logic only) | Later-cycle Playwright 375×812 pin |
| C7-SEC-2 | Start-here toggle reports "expanded" while the sheet visually occludes the card | Owner-gate item 9 records it as observed behavior; no code action |

Full detail: [.agents/qa-cycle7.md](.agents/qa-cycle7.md) and
[.agents/security-cycle7.md](.agents/security-cycle7.md).

This section — like the Cycle 8 sections above it — ships with the next
commit that includes `MAINTENANCE.md`; the C7 ten-path commit deliberately
excludes it (ops-cycle7.md §5).
