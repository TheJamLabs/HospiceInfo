# Maintenance — UK-wide hospice catchment map

Operator-facing guide for running, building, deploying, and validating the
UK-wide hospice catchment map. Provenance detail per file:
[`data/README.md`](data/README.md). Design rationales: [`docs/adr/`](docs/adr/).
Vocabulary: [`GLOSSARY.md`](GLOSSARY.md).

Cycle 2 (2026-10-26).

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
npm run build    :: tsc + vite → dist/ (static site ready for deploy)
```

When the static build is ready and the lead commits after the gates close:

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

## Deploy (Cloudflare Pages)

The site is static: `npm run build` produces `dist/`, and a single
`wrangler` command publishes it.

1. Build: `npm run build` (`tsc` + Vite → `dist/`).
2. Push: `npx wrangler pages deploy dist --project-name=hospiceinfo`
   (a one-time `wrangler login` only; run from a machine with network).
   Hash routing (ADR-0007) means no rewrites, `_routes.json`, or 404 page
   needed.

**Rollback (deployment):** Cloudflare Pages keeps every prior deployment.  To
rollback, click "restore" from the Pages dashboard (Pages → project →
Deployments). No local action is needed. `dist/` is rebuilt from source at
every deploy, so a bad data change is undone by re-running the "Updating the
data" chain.

## Pre-launch gates

The pre-launch gates table tracks the final checks before publish. Each gate
has an owner and acceptance criteria; all gates must be green before the
first live deploy.

| Gate | Item | Owner | Acceptance |
|---|---|---|---|
| G5 | Chrome mobile pass, Slow 4G + 4× CPU: post-fix m1/m2/m4 vs baselines 1677 / 435 / 1391 ms (m3 already verified: 186 buckets at zoom < 11, 10,463 markers at zoom ≥ 11 — baseline measured at the 2026-10-26 snapshot; the 2026-10-27 data landing brings placed practices to 11,002, so re-verify m3 against the new count); live checks W5 (bucket click flies to zoom 11), W7 (~200 ms debounce cadence), W10 (sort A→Z / Z→A / practices desc + "Has published service area" toggle → exactly 7 rows), W11 (postcode search: BD14 6NF found → selects hospice; unmatched → neutral not-found + working mailto). Full checklist: `.agents/qa.md` §G5 (8 rows). | James (human) | All 8 checklist rows pass; post-fix m1/m2/m4 values recorded. |
| W8 | ADR-0010 stride gate, decided after G5: if post-fix m1 > 800 ms ⇒ add the `STRIDE_K` follow-up (named constant + bounded render-time filter in `MapView.tsx`); otherwise record "gate not triggered (m1 = X ms)". | lead (code) — decision data from James's G5 m1 | Outcome recorded in the implementation record. If tripped: `grep -n "STRIDE_K" src/components/MapView.tsx` shows the constant; `npm run build` + `npm run check:layout` exit 0. |
| G7 | Overpass mirror capacity: `node scripts/fetch-uk-land.mjs` on a networked machine (malformed-point guard in script; kumi resolution when available). Any re-fetch triggers a rebuild. G2 remains confirmed. | James (human) | Re-fetch green; build chain green; SHA re-pinned — OR "capacity blocked" non-blocking note. |
| H1a | Wales GP practices: browser-fetch DataMap layers `geonode:gpmainsites_ogl` + `geonode:gpbranchsites_ogl` (candidate portal `data.gov.wales`, record exact URL + as-of date) → `data-raw/gp-practices-wales-{main,branch}-2026-10.{csv,geojson}`. Lead runs §5 chain. — **DONE 2026-10-27.** | James (fetch) → lead (chain) | 539 practices (369 main + 170 branch), all with source lat/lon (no geocoding needed); §5 chain green; provenance rows + ledger note recorded. |
| H1b | NI hospices: browser-fetch Public Regulation Authority (Public Register Services' successor) XLSX ("All Registered Services"; record exact URL + as-of date) → `data-raw/rqia-regulated-services-2026-06.xlsx`. Lead runs §5 chain. — **DONE 2026-10-27.** | James (fetch) → lead (chain) | 6 services (ids `ni-r1`–`ni-r6`), all geocoded from postcodes; §5 chain green; provenance rows + ledger note recorded. |

H1a's and H1b's files landed on 2026-10-27 and the post-data-landing chain
has already run (see the data-landing note in `.agents/pipeline.md`). When
the next pending file lands (the CIW Wales-hospice reply), the lead runs
the chain in `docs/MAINTENANCE.md` again, then commits + publishes.

### Validation + rollback story

Pre-publish, after gates close (lead — final G6-equivalent):

1. `npm run build-data` ×2 → outputs byte-identical (SHA-256 recorded).
2. `node scripts/validate-tessellation.mjs` → exit 0.
3. `npm run build` → exit 0; `npm run check:layout` → exit 0 (3 `flex-direction`).
4. Publish per the procedure above.

**Rollback:**

- **Live site:** restore the previous deployment from the Cloudflare Pages
  dashboard (no local action needed).
- **Data:** re-run `build-data` from committed `data-raw/` — a bad data set
  rolls back by re-running the chain, no code rollback needed.
- **Code:** git — the Cycle 2 tree is uncommitted until the lead commits
  after the gates close; `git revert <sha>` restores the previous published
  state. No commit/push by the agent.

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
