# Ops — HospiceInfo, Cycle 3 (stage 8, 2026-10-29)

Cycle 3 pre-launch ops. Supersedes the 2026-10-26 Cycle 2 ops file; the
Cycle 2 pre-launch sections below are preserved with their gates carried
forward, and the Cycle 1 Cloudflare Pages playbook that remains valid is
preserved at the end of this file ("## Cycle 1 playbook (preserved)").

## Cycle 3 pre-launch

DevOps (stage 8) done 2026-10-29. Cycle 3 (brand rename to "Hospice Finder
UK", deterministic static prerendering, SEO surface — `sitemap.xml` +
`robots.txt` — and the hash-redirect guard; ADR-0015/0016, ADR-0023) is
deploy-neutral in the same sense as Cycle 2: the git-connected Pages build
(Cycle 2 §1) now also runs the prerender step, so every push to `main`
publishes the full emitted set. Outstanding pre-launch items: the Cycle 2
human-gated verifications (Cycle 2 §3 — G5/W8/G7; H1a/H1b done) plus the
Cycle 3 gates in §3 below.

### 1. What changed for operators in Cycle 3

- **Build chain:** `npm run build` is now `tsc -b && vite build && node
  scripts/prerender.mjs` (zero new dependencies; `prerender.mjs` uses only
  node:fs/path/url). The Pages build command (`npm ci && npm run build`) and
  the output directory (`dist/`) are unchanged (ADR-0014, `wrangler.jsonc`).
- **Emitted file set:** the build now emits **171 files** into `dist/` —
  one crawlable HTML shell per routable URL + `sitemap.xml` + `robots.txt`
  (169 `.html` = 1 index + 6 info + 161 `hospice/<id>.html` + `404.html`;
  ADR-0015). The page set is derived from `public/data/hospices.json`; the
  script asserts `sitemap <loc> count === hospices.json length + 7` (168)
  and exits non-zero otherwise. Output is deterministic: LF endings, one
  trailing newline, no timestamps / `<lastmod>`, idempotent (deletes prior
  emitted output before re-emitting) — a double build is byte-identical.
- **Brand:** the site is now "Hospice Finder UK" (ADR-0023).
  `grep -rni "hospice catchment map" index.html public/ src/ dist/` →
  **0 hits**. The `package.json` name `hospice-catchment-map` is
  intentionally untouched. (A repo-wide grep will additionally hit
  `README.md`, `docs/MAINTENANCE.md` and `docs/adr/0023-…` — those are repo
  documents, not the `dist/` deliverable; the gate covers deliverables only.)
- **New verification gates:** the Cycle 3 pre-publish gate table in §3 and
  the post-deploy verification in §4.

### 2. Deploy artifact and file inventory

The deploy artifact is unchanged: `dist/` (git-connected ADR-0014;
`pages_build_output_dir` in `wrangler.jsonc`). A Cycle 3 `dist/` holds
**181 physical files**: the 171 emitted files + 10 Vite build outputs
(`assets/` ×2, `data/*.json` ×5, `logo.svg`, `manifest.webmanifest`,
`og-image.png`). Do not be alarmed by the 181-vs-171 difference — the
latter is the prerender's emitted set only; the former counts Vite's asset
bundles and the `public/` + `data/` copies (the requirements' working
count of 180 predates the final tree). Expected tree:

- `dist/*.html` — 169 shell pages: 1 `index.html` + 6 info pages
  (`about`, `corrections`, `feedback`, `privacy`, `licences`,
  `accessibility` — fixed emit order) + 161 `hospice/<id>.html` (id
  ascending by code units) + `404.html`.
- `dist/sitemap.xml` — 168 `<loc>`, all
  `https://hospiceinfo.pages.dev/`-prefixed, 0 `<lastmod>`.
- `dist/robots.txt` — exactly 75 bytes (verbatim content in gate C3-5).
- `dist/assets/index-mKHWy8cd.js` (418.07 kB) +
  `dist/assets/index-DXBOPrrL.css` (250.47 kB);
  `dist/data/{catchments,corrections,hospices,practices,shops}.json`;
  `dist/{logo.svg,manifest.webmanifest,og-image.png}` (og-image 1200×630,
  3161 B, referenced via `og:image` on every emitted page).

Each shell page carries a per-page head (title, description,
`link rel=canonical`, Open Graph/Twitter tags, JSON-LD `@graph`) + an empty
`#root` + the boot script plus asset tags extracted verbatim from the
built `dist/index.html`. The hash-redirect guard in `src/main.tsx`
(ADR-0016) turns a real-path load with an empty hash into the matching
`#/route` so the hash router lands on the intended page.

### 3. Pre-publish gates (Cycle 3)

The Cycle 1 G1–G6 snapshot is closed; G5/W8/G7 carry forward from the
Cycle 2 gate table (Cycle 2 §3) with their statuses intact (H1a/H1b done
2026-10-27). Every value below was re-verified on disk 2026-10-29
(RQ-1 discipline — measure, don't trust claims):

| # | Gate | Exact check | Expected value |
|---|---|---|---|
| C3-1 | Build chain | `npm run build` | exit 0; log ends `emitted 171 files (161 hospice pages)` |
| C3-2 | Emitted count | Node recursive walk of `dist/`; count `.html` | 169 html (1 index + 6 info + 161 hospice + 404); 181 physical files total |
| C3-3 | Boot-script balance (SEC-3-01 fix) | count `<script` vs `</script>` across the 169 emitted pages | 338 / 338, 0 mismatching (2/2 per page) |
| C3-4 | Sitemap | inspect `dist/sitemap.xml` | 168 `<loc>` (= 161 + 7), 0 `<lastmod>`; first `https://hospiceinfo.pages.dev/`, last `https://hospiceinfo.pages.dev/hospice/sc-CS2023000094.html` |
| C3-5 | robots.txt | read `dist/robots.txt` | exactly 75 bytes, verbatim: `User-agent: *` + `Allow: /` + blank line + `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml` (LF line endings, one trailing LF) |
| C3-6 | Byte-identity (double build) | `npm run build` ×2; SHA-256 per file, then over the whole tree | dist tree `170036dafcd4de8c5600bb49b58678b06c8d381fd24a18cf65df2a2ea47a6536`; emitted-only (171 files) `9916acb627b9da4b13dfca6e76ff449b2988c641e2218d15621507d6544facdd` — identical across runs |
| C3-7 | Brand rename | `grep -rni "hospice catchment map" index.html public/ src/ dist/` | 0 hits |
| C3-8 | Logo | count `<circle` in `public/logo.svg` | 1 |
| C3-9 | Data anchors | `npm run build-data` ×2; SHA-256 prefixes of `public/data/*.json` | byte-identical across runs: catchments `f7df12fd`, hospices `65818ace`, practices `cc096f17`, shops `dd19e8ae` |
| C3-10 | Layout | `npm run check:layout` | exit 0 (styles.css keeps exactly 3 `flex-direction`) |

Carry-forward gates (Cycle 2 §3, unchanged): G5 (Chrome mobile pass —
human), W8 (stride gate, decided off G5 m1), G7 (Overpass re-fetch,
non-blocking carry).

### 4. Post-deploy verification

Run against the production URL (`https://hospiceinfo.pages.dev`) once the
git-connected build has published, or against a branch preview for
pre-promote checks:

1. `curl -s -I https://hospiceinfo.pages.dev/` → `200`; body contains
   "Hospice Finder UK".
2. Sample hospice page (id with no ampersand in the path):
   `curl -s https://hospiceinfo.pages.dev/hospice/en-1-120960209.html` →
   200. Verify in the body:
   - tail ends with a balanced final `</script>`, i.e.
     `…></script>` then `</body>` then `</html>` on the last lines;
   - `<link rel="canonical" href="https://hospiceinfo.pages.dev/hospice/en-1-120960209.html">`
     present;
   - an `application/ld+json` block present with a `HealthCareBusiness`
     node;
   - title contains "LOROS The Leicestershire &amp; Rutland Hospice -
     Hospice Finder UK" (NBSP caveat F-QA-2: hospice names may contain
     no-break spaces — do not assert byte-exact name matches from curl
     output).
3. `curl -s https://hospiceinfo.pages.dev/sitemap.xml` → 200; count of
   `<loc>` = **168**.
4. `curl -s https://hospiceinfo.pages.dev/robots.txt` → 200; body matches
   the verbatim 75-byte file (gate C3-5) — spot-check the closing
   `Sitemap:` line points at `https://hospiceinfo.pages.dev/sitemap.xml`.
5. Info-page spot: `curl -s -I https://hospiceinfo.pages.dev/about.html` →
   `200`.
6. Second hospice spot: `curl -s -I https://hospiceinfo.pages.dev/hospice/ni-r1.html`
   → `200`; body title contains "Foyle Hospice (10627) - Hospice Finder UK".

### 5. Rollback story (Cycle 3)

- **Live site:** Cloudflare Pages keeps every deployment; rollback =
  redeploy the previous release from the Pages dashboard (Deployments →
  restore). The Cycle 3 prerender changes are **build-time only** — a prior
  deployment predates the prerender step, so a redeploy fully reverts the
  published content (the 169 pre-rendered shells, `sitemap.xml`,
  `robots.txt`) to the prior build. No backend, no migration and no
  data-file change means no extra steps beyond the single dashboard action.
  Blast radius: the published URL only.
- **Code:** git. `git revert <sha>` + a James-approved push to `main`
  rebuilds and re-publishes the previous state (ADR-0014). No
  agent-initiated pushes; James approves each push.
- **Data:** `public/data/*.json` regenerate byte-identically from committed
  `data-raw/` — a bad data set rolls back by re-running the chain, no code
  rollback needed; the prerendered page set re-derives from the restored
  data on the next build.
- No migrations, no shared state, no external writes beyond the publish
  itself.

## Cycle 2 pre-launch

DevOps (stage 8) done 2026-10-26. The Cycle 2 working tree is
deploy-neutral for Cloudflare Pages; **deploy mode changed 2026-10-27 to
git-connected (ADR-0014)** — every push to `main` builds and publishes the
site, so everything outstanding is the human-gated verification in §3 plus
the pre-push build-chain re-run in §4.

### 1. Deploy procedure — git-connected (ADR-0014)

The Pages project `hospiceinfo` is git-connected to `main`: every push runs
the project build command `npm ci && npm run build` and publishes `dist/`
(`pages_build_output_dir` in the repo's `wrangler.jsonc`). No local `wrangler
login` or deploy command is needed for a publish — an approved push to `main`
is the publish. `data-raw/` stays committed (rebuildability, ADR-0006/0008);
it is excluded from the deployment by the output directory, not from the
repo. Branch previews for pre-promote checks: push the branch and open its
preview URL in the Pages dashboard (formerly `npx wrangler pages deploy dist
--branch-name=test`). No new routes, no server, no env vars, no form
endpoints — the deploy topology is unchanged for Cycle 2 and Cycle 3 (Cycle 3's prerender adds files to `dist/`, not routes, not server needs). The Cycle 1
manual-deploy playbook preserved at the end of this file is superseded for
deploys (kept for the correction/data-refresh patterns).

### 2. Cycle 2 delta checklist

**What changed** (committed to `origin/main` 2026-10-27; the pre-landing
SHA prefixes below are the Cycle 2 snapshot — the post-landing ones are
recorded in §4/§5.1):
- NEW `public/logo.svg` + `public/manifest.webmanifest` — Vite copies
  `public/` into `dist/` (lead-verified present in `dist/`).
- Regenerated `public/data/{catchments,hospices,practices,shops}.json`
  (0-space format); `npm run build-data` ×2 byte-identical (SHA-256 prefixes
  `dc261185` / `e11322ba` / `2a87a374` / `5628d8f7`);
  `validate-tessellation` exit 0 (100.00% land coverage, 0 slivers, 2 known
  empty cells).
- Modified: `index.html`, `scripts/build-data.mjs`, `src/App.tsx`,
  `src/components/{AppShell,HospicePanel,MapView}.tsx`; NEW
  `src/components/StartHere.tsx`.

**Why deploy-neutral:** Cloudflare Pages serves the static SPA; every delta
is static assets plus page-local JSON fetches at the same `/data/…` paths.
No new dependencies (git dep-diff clean), no new routes, no backend, no env
vars.

**Verify in the live preview after deploy** (can be done inside the G5
browser session):
- [ ] Tab shows the favicon (heart + pin from `logo.svg`).
- [ ] `GET /logo.svg` and `GET /manifest.webmanifest` resolve (200) —
      installability is not required; icon links must resolve.
- [ ] `GET /data/{catchments,hospices,practices,shops}.json` return 200 and
      each SHA-256 matches the committed `public/data/` snapshot.
- [ ] Map renders buckets/markers; the landing "start here" card is present.

**Post-landing confirmation (2026-10-29):** all cycle-dist gates green —
`npm run build` exit 0; `dist/` tree SHA-256 `9916acb6…` ×2 byte-identical;
171 files emitted, log tail `emitted 171 files (161 hospice pages)`; data
anchors `f7df12fd`/`65818ace`/`cc096f17`/`dd19e8ae` unchanged post-H1a/H1b
landing (stable across re-publish).

### 3. Pre-launch gates (owner + acceptance)

| Gate | Item | Owner | Acceptance |
|---|---|---|---|
| G5 | Chrome mobile pass, Slow 4G + 4× CPU: post-fix m1/m2/m4 vs baselines 1677 / 435 / 1391 ms (m3 already verified: 186 buckets at zoom < 11, 10,463 markers at zoom ≥ 11 — measured at the 2026-10-26 snapshot; the 2026-10-27 data landing puts placed practices at 11,002, so re-verify m3 against the new count); live checks W5 (bucket click flies to zoom 11), W7 (~200 ms debounce cadence), W10 (sort A→Z / Z→A / practices-desc + "Has published service area" toggle → EXACTLY 7 rows), W11 (postcode flow: real postcode BD14 6NF → found state → "Open in panel" selects; unmatched → neutral not-found + working mailto; × dismiss re-opens via panel "Start here" pill). Full checklist: `.agents/qa.md` §G5. | James (human) | All 8 checklist rows pass; post-fix m1/m2/m4 values recorded. |
| W8 | ADR-0010 stride gate, decided after G5: if post-fix m1 > 800 ms ⇒ add `STRIDE_K` follow-up (named constant + bounded render-time filter in `MapView.tsx` + provenance line in `data/README.md`); otherwise record "gate not triggered (m1 = X ms at k=1)". | lead (code) — decision data from James's G5 m1 | Outcome recorded in the implementation record. If tripped: `grep -n "STRIDE_K" src/components/MapView.tsx` shows the constant; `npm run build` + `npm run check:layout` exit 0. |
| G7 | Overpass re-fetch when a mirror has capacity (carried from Cycle 1, pre-launch): `node scripts/fetch-uk-land.mjs` on a networked machine (malformed-point diagnosability guard already in the script; kumi served the committed query when it had capacity, 2026-10-24). Any successful re-fetch is a rebuild event: re-pin the SHA-256 in `data/README.md`, `build-data` ×2 byte-identical, `validate-tessellation.mjs` exit 0, then publish. G2 stays done (landed file SHA-256 unchanged). | James (human) | Re-fetch green + rebuild chain green + SHA re-pinned — OR one "mirror at capacity" diagnosis recorded (feed-unavailable rule: no retry loop; stays a non-blocking carry-over). |
| H1a | Wales GP practices landing: James browser-fetches the DataMap layers `geonode:gpmainsites_ogl` + `geonode:gpbranchsites_ogl` (candidate portal `data.gov.wales`; `data.wales` is a holding page — record the exact URL + as-of date on fetch) → `data-raw/gp-practices-wales-{main,branch}-2026-10.{csv,geojson}` per `data/README.md` procedure 2. Lead then runs the §5 chain. — **DONE 2026-10-27** (GeoJSON file as provided; 539 practices, 369 main + 170 branch, all placed from source coordinates; §5 chain steps 1–6 green — record in §5). | James (fetch) → lead (chain) | met: `wales` count 539, lat/lon non-null; §5 chain green; provenance row + ledger note recorded. |
| H1b | NI hospices landing: James browser-fetches the Public Regulation Authority (RQIA's successor) register export ("All Registered Services" XLSX; record exact URL + as-of date) → `data-raw/rqia-regulated-services-2026-06.xlsx` per `data/README.md` procedure 1. Lead then runs the §5 chain. — **DONE 2026-10-27** (`rqia-regulated-services-2026-06.xlsx`, header row 3, 6 services; §5 chain steps 1–6 green — record in §5). | James (fetch) → lead (chain) | met: `ni` hospice count 6 (ids `ni-r1`–`ni-r6`), curated set still EXACTLY 20 (merge asserts unique ids); §5 chain green; provenance row + ledger note recorded. |

Non-gating note: the Care Inspectorate Wales hospices data request remains a
documented pending gap (proceed per James, 2026-10-24; the extract script is
wired for the reply).

### 4. Validation + rollback story

Pre-push chain (lead — final G6-equivalent; runs before every push, since §1
auto-publishes on push):
1. `npm run build-data` ×2 → `public/data/*.json` byte-identical (record
   SHA-256).
2. `node scripts/validate-tessellation.mjs` → exit 0.
3. `npm run build` → exit 0; `npm run check:layout` → exit 0 (styles.css keeps
   exactly 3 `flex-direction`) — since Cycle 3, `npm run build` also runs
   `node scripts/prerender.mjs` (expected log tail `emitted 171 files (161
   hospice pages)`; Cycle 3 §1/§3).
4. Push to `main` (James-approved) — the git-connected build publishes per §1.

Rollback:
- **Live site:** Cloudflare Pages keeps every deployment; rollback =
  redeploy the previous release from the Pages dashboard (Deployments →
  restore). Blast radius: the published URL only.
- **Cycle 3 prerender delta:** build-time only — a dashboard redeploy of the
  previous deployment fully reverts the emitted shells/sitemap/robots (see
  Cycle 3 §5); no migrations, no data-file extras.
- **Code:** git. The Cycle 2 tree is committed to `origin/main` (2026-10-27
  data landing `816b609`); `git revert <sha>` + push restores the previous
  published state (the push rebuilds and re-publishes, ADR-0014). No
  agent-initiated pushes; James approves each push.
- **Data:** `public/data/*.json` regenerate byte-identically from committed
  `data-raw/` — a bad data set rolls back by re-running the chain, no code
  rollback needed.
- No migrations, no shared state, no external writes beyond the publish
  itself.

### 5. Post-data-landing re-run checklist (H1a / H1b)

When James's file(s) land, run in order (lead):
1. Extract: `node scripts/extract-gp-practices-wales.mjs` (H1a) /
   `node scripts/extract-hospices-ni.mjs` (H1b); H1b only: then
   `node scripts/merge-hospices.mjs` (asserts exactly 20 curated, unique ids).
2. `node scripts/geocode-postcodes.mjs` — only if the landing introduced new
   postcodes (1 req/s to Nominatim, resumable append; monitor >1 h batches;
   exits non-zero on coverage gaps — do not loop).
3. `npm run build-data` ×2 — `public/data/*.json` must be byte-identical
   (SHA-256).
4. `node scripts/validate-tessellation.mjs` — exit 0.
5. `npm run build` + `npm run check:layout` — both exit 0.
6. Provenance row in `data/README.md` (source URL + as-of date, SHA-256 where
   applicable) + note in `.agents/pipeline.md`.
7. Commit; the James-approved push to `main` auto-publishes per §1 (ADR-0014) —
   run the §4 pre-push chain first.

### 5.1 Data-landing run record (2026-10-27, H1a + H1b)

Steps 1–6 ran green; step 7's commit landed to `origin/main`. Publish is now
automatic on push (git-connected, ADR-0014) — the first git-connected build
failed validation (25 MiB per-file limit: no build command was configured, so
Pages deployed the repository root, including `data-raw/uk-land.json` at
54.6 MiB). Fix per ADR-0014: build command `npm ci && npm run build` + output
dir `dist`. G5/W8/G7 remain open verification gates; they no longer block
publication:
1. Extracts: `extract-hospices-ni.mjs` → 6 services (`ni-r1`–`ni-r6`, all
   geocoded from postcodes); `extract-gp-practices-wales.mjs` → 539
   practices (369 main + 170 branch) from the two DataMap GeoJSON layers,
   placed from source lat/lon (the layers carry no postcodes → geocoder
   not needed for them).
2. `geocode-postcodes.mjs` (fourth pass): 5 new NI hospice postcode units,
   0 new practice units, 0 throttled; exit 1 on the known 9-postcode
   OSM gap (documented, non-blocking; no loop per feed-unavailable rule).
3. `npm run build-data` ×2 — byte-identical (SHA-256 recorded in §4).
4. `validate-tessellation.mjs` — exit 0.
5. `npm run build` + `npm run check:layout` — both exit 0; largest dist
   asset 3.14 MiB (Cloudflare's 25 MiB per-file limit is not approached).
6. Provenance: `data/README.md` rows for both files (source name +
   retrieved date + SHA-256; exact URLs pending James's confirmation) +
   notes in `.agents/pipeline.md` and `.agents/hindsight.md`.
7. Commit done (SHA recorded in `.agents/pipeline.md`); publish is automatic
   on push to `main` (git-connected, ADR-0014) — the blocked-manual-publish
   convention is superseded (it was never ADR-0009, which on disk is
   site-config single source). The first git-connected build failed
   (repo-root deploy, 25 MiB); the ADR-0014 build settings resolve it.

## Cycle 1 playbook (preserved)

Preserved from the 2026-10-22 ops file (Cycle 1, stage 8). Its pre-publish
gate table is a 2026-10-22 snapshot and is superseded for pre-launch by the
gate tables in Cycle 2 §3 and Cycle 3 §3; the data-refresh, corrections,
validation, rollback, and risk playbooks below remain valid and unchanged
for Cycle 2 and Cycle 3, while the deploy playbook is superseded by the
git-connected procedure in Cycle 2 §1 (ADR-0014).
Supersedes the 2026-10-16 ops file (whose deploy assumption — "any static
host" — predates the Cloudflare Pages decision). User-facing summary:
`docs/MAINTENANCE.md` (Docs stage refreshes it from this file).

### Host

Cloudflare Pages (grill decision). Static site, **no backend, no
environment variables, no build-time secrets, no form endpoint** — the only
runtime egress is OSM tile requests and user-initiated `mailto:` links
(`.agents/security.md` trust-boundary statement). Hash routing (ADR-0007)
means the server only ever serves `index.html`: fragments never reach it, so
no SPA rewrites, no `_routes.json`, no 404 page are needed.

### Running the app

- `npm install` (new machine), then:
  - Dev: `npm run dev` — Vite on `http://localhost:5173` (auto-increments
    if a prior session holds the port).
  - Production: `npm run build` → `dist/` (`dist/data/*.json` copied from
    `public/data/` by Vite — verified present after the 2026-10-22 build).
    Deploy `dist/`. Since Cycle 3, `npm run build` also runs
    `node scripts/prerender.mjs` and emits 171 files (Cycle 3 §2).

### Deploying to Cloudflare Pages (operator-run)

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

### Pre-publish gate (Cycle 1 snapshot, 2026-10-22 — superseded by the Cycle 2 §3 / Cycle 3 §3 gate tables)

| # | Item | Owner | Status at 2026-10-22 |
|---|------|-------|----------------------|
| G1 | Commit this cycle's changes — currently **all uncommitted** (`git status`): 19 modified tracked files + new `src/pages/`, `src/lib/{useRoute,siteConfig,feedback}.ts`, 4 new scripts, 4 new ADRs, `data-raw/site-config.json`, `public/data/corrections.json` | lead/human | open |
| G2 | `data-raw/uk-land.json` fetched on a networked machine, committed, SHA-256 + polygon count recorded in `data/README.md`; `npm run build-data` twice byte-identical; `node scripts/validate-tessellation.mjs` exit 0; coastal spot-check (procedure in `qa.md` §A1 remainder) | human | open (defers A1 full clip gate) |
| G3 | SEC-F1: ODbL attribution corrected (LegalPage "OS Open Data" section → OSM `natural=coastline` contributor credit; Nominatim coordinates into OSM section; registers section; `data/README.md` ODbL line) | Docs stage (9) | open |
| G4 | Real operator name + contact email in `data-raw/site-config.json` **and** `src/lib/siteConfig.ts` (ADR-0009 lockstep) | operator | open (placeholders) |
| G5 | 8-point mobile live pass (`qa.md` §A6 checklist) | human | open |
| G6 | `npm run build` exit 0; `node scripts/validate-corrections.mjs` exit 0 | lead/human | green now (re-run after G1–G5) |

### Data refresh (canonical chain, in order)

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

Pending human fetches (exact steps in `data/README.md`): CIW email reply
(Welsh hospices) — the only one outstanding as of 2026-10-27 (RQIA XLSX and
the data.wales GP layers landed that day; the NHS Scotland GP file landed
2026-10-24). On receipt: run the §5 chain, then commit; the James-approved
push to `main` auto-publishes per §1 (ADR-0014).

### Corrections log (public, post-deploy)

Any data fix after launch: `node scripts/add-correction.mjs "summary"
[--data-changed]` → `validate-corrections.mjs` → commit → publish. The site
renders the log at `#corrections` (page-local fetch only).

### Validation (definition of healthy)

- `npm run build` exit 0; `validate-tessellation.mjs` exit 0 (after G2).
- Double `build-data.mjs`: SHA-256 of the four `public/data/*.json`
  identical across runs. Post-data-landing hashes recorded 2026-10-27
  (prefixes `f7df12fd` / `65818ace` / `cc096f17` / `dd19e8ae` —
  catchments / hospices / practices / shops); the 2026-10-16 and
  2026-10-26 prefixes (`dc261185` / `e11322ba` / `2a87a374` / `5628d8f7`)
  are the pre-landing snapshot.
- Build invariants: `hospices: 161 (unplaced: 0)` (en 152 / sc 3 / ni 6 /
  wales 0); `assigned: 11,002, unassigned: 12` (all 12 sit in the 9 OSM-gap
  NI practice postcodes: 8 units × 1 practice + 1 unit × 2 practices);
  `shops: 138, unresolved ids: 0`.
- `data-raw/postcode-geo.csv`: 9,098 rows of 9,107 in scope.

### Rollback (Cycle 1)

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

### Known operational risks

- Geocoding wall time (hours) — resumable; 429/503 backoff can stretch it.
- The 9 OSM-gap postcodes persist until OSM coverage changes — the geocoder
  exiting 1 on them is documented, do not loop.
- `npm audit`: 3 advisories (xlsx devDep high ×2, esbuild dev moderate ×1)
  — unaffected advisory set, dev-only, not in `dist/` (SEC-5).
- Port 5173 frequently held by a prior session's server; Vite auto-increments.
- Deploys are reproducible from the committed `package-lock.json` — Cloudflare
  runs `npm ci` in the git-connected build (ADR-0014); `wrangler` is needed
  only for project-level operations (e.g. `npx wrangler pages project update`),
  not for publishing.

