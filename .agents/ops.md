# Ops — HospiceInfo, Cycle 4 (stage 8, 2026-10-30)

DevOps (stage 8) done 2026-10-30. Supersedes the Cycle 3 ops file at this
path (full Cycle 3/2/1 text remains in git history: `git show
c6da9d3:.agents/ops.md`). Everything still true from Cycle 3 is carried
forward in §7. Cycle 4 (BEACON rebrand, Auto/Light/Dark theme system,
first-load layers both OFF, search tiers shops→hospices→GPs, removal of
the "Has Published Service Area" UI filter, self-hosted woff2 fonts, dark
Leaflet CSS overrides, reproducible static build chain; ADRs 0024–0030)
is **UNCOMMITTED** in the working tree on top of HEAD `c6da9d3` ("G7
re-fetch: re-pin land-mask SHA b9b313ab… + rebuild"). QA (stage 6) and
Security (stage 7) are CLOSED: both PASS, 0 Blocking, 0 rework rounds.

State verified read-only, 2026-10-30: `git status --short` = 26 tracked
modifications (now incl. `.gitignore`) + untracked Cycle 4 set
(`public/fonts/`, `src/lib/theme.ts`, ADRs 0024–0030, `.agents/design.md`
plus concept screens); the scratch dirs `.qwen/` / `.tmp/` no longer
appear (pre-push item a, done this pass — §3); `data/` and `data-raw/`
are untouched, so the Cycle 4 data anchors are unchanged (catchments
`f7df12fd`, hospices `65818ace`, practices `cc096f17`, shops `dd19e8ae`).
`dist/` and `node_modules/` are gitignored: the repo never carries the
deploy artifact — Cloudflare Pages builds it from committed source only.

## 1. Build story

**Exact commands** (all from `package.json`; wrangler is out of scope for
publishing, ADR-0014):

| Command | What it is | Cycle 4 expectation |
|---|---|---|
| `npm ci` | clean install pinned by `package-lock.json` (exactly the first hop of Cloudflare's build command) | exit 0; no `package.json` change this cycle (ADR-0008 holds) |
| `npm run build` | `tsc -b && vite build && node scripts/prerender.mjs` | exit 0; log tail `[prerender] emitted 171 files (161 hospice pages)`; emits `dist/assets/index-BOH5bNkE.js` (420.69 kB) + `dist/assets/index-50GQAEoY.css` (253.16 kB) |
| `npm run check:layout` | `node scripts/check-map-layout.mjs` | exit 0, "check-map-layout: OK" |
| `node scripts/validate-tessellation.mjs` | geometry validation; long pole ~110–160 s (observed 151 s in the coding gate, 163 s in QA) — run as a background job, never foreground | exit 0; "catchments: 161, empty cells: 3" (same set as Cycle 3), "sliver cells: 0", coverage 100.00%, pairwise overlap 0.0000 |
| `npm run build-data` | `node scripts/build-data.mjs` → `public/data/*.json` | **not required this cycle** — zero `data/`/`data-raw/` diff (verified); required again on any future data landing (§7.2) |

**What is emitted.** `dist/` = **184 physical files**: the 171 prerender
emitted files — 169 `.html` shells (1 `index.html` + 6 info pages: about,
corrections, feedback, privacy, licences, accessibility; + 161
`hospice/<id>.html` + `404.html`), `sitemap.xml` with 168 `<loc>` = 161 +
7 (enforced in `scripts/prerender.mjs`, non-zero exit on violation), and
`robots.txt` exactly 75 bytes (verbatim) — plus 13 static files Vite
copied: 2 assets, 3 woff2 fonts (`dist/fonts/` — Archivo-700.woff2
14,508 B, PublicSans-400.woff2 14,632 B, PublicSans-600.woff2 14,592 B,
wired by 3 `@font-face` rules with `font-display: swap`), `logo.svg`
(BEACON recolour, ADR-0022), `manifest.webmanifest` (theme_color
`#163a5f`), `og-image.png` (1200×630), and 5 `dist/data/*.json` assets.

**Determinism guarantees.**

- **Byte-identity (ADR-0015):** LF endings, one trailing newline, no
  timestamps, no `<lastmod>`, idempotent emit (output deleted before
  re-emit); a double build is byte-identical — QA gate 4 measured this
  cycle: SHA-256 manifest over all 184 dist files, 184/184 match.
- **SHA-pinned inputs (ADR-0029):** remote raw inputs are pinned and
  committed under `data-raw/`; the 2026-10-30 (G7) land-mask re-pin is
  `b9b313ab7dac80c45c48aea900469cf61043f7b9a0665cde79dfec63e0075b55`
  (22,999 polygons), recorded in `data/README.md` (line 35) and landed in
  HEAD `c6da9d3`. Note: the one-off re-pin script
  `scripts/g7-repin.mjs` was a scratch script, deleted after use
  (verified on disk and in git history — never tracked); the durable
  record of the pin is the SHA-256 in `data/README.md`, not a script.
- **Secret-free chain (ADR-0030):** committed inputs → deterministic
  data/site build → git-connected publish. No stage needs a secret, a
  network call, or a runtime service. **A fresh clone + `npm ci` +
  `npm run build` reproduces the deployed bytes offline** — the
  operational definition of "the build is reproducible", and the reason
  rollback is byte-exact (§4).
## 2. Gate checklist (Cycle 4)

**Prior gate status (carried from the Cycle 3 file).**

| Gate | Item | Status |
|---|---|---|
| G1–G6 | Cycle 1/2 pre-launch snapshots (commit, land-mask pin, ODbL attribution, `site-config` operator fields, mobile build pass, build + corrections) | closed (Cycle 3 close, 2026-10-30) |
| W8 | ADR-0010 stride gate (decision data from G5) | closed (per Cycle 3 close / lead handoff; decision recorded in the Cycle 3 ledger) |
| G7 | Overpass re-fetch + land-mask SHA re-pin | closed 2026-10-30 — re-fetched via `overpass-api.de`, SHA re-pinned (`b9b313ab…`), committed in `c6da9d3`, provenance row in `data/README.md` |
| CIW | Care Inspectorate Wales hospices extract | non-blocking carry — pending email reply; on receipt run the §7.2 chain |

**Cycle 4 QA verification gates (stage 6, `.agents/qa.md` — all PASS, 0
Blocking).**

| # | Gate | Result | Key evidence |
|---|------|--------|--------------|
| 1 | `npm run build` | PASS | exit 0; "emitted 171 files (161 hospice pages)"; assets 420.69 kB / 253.16 kB |
| 2 | `npm run check:layout` | PASS | "check-map-layout: OK", exit 0 |
| 3 | `node scripts/validate-tessellation.mjs` | PASS | exit 0 in 163 s; 161 catchments, 0 slivers, 3 known empty cells, coverage 100.00%, overlap 0.0000 |
| 4 | Double-build byte-identity | PASS | SHA-256 manifest over all 184 dist files — 184/184 match across two full builds |
| 5 | No `#1d4ed8` in `src/` | PASS | 0 grep matches |
| 6 | No CDN font/script links | PASS | 0 matches across `src/` + `index.html` + `public/` (googleapis/gstatic/unpkg/jsdelivr/cdnjs) |
| 7 | 3 self-hosted woff2 | PASS | `public/fonts/` + `dist/fonts/` = 3 files each; 3 `@font-face` rules, `font-display: swap` |
| 8 | Sitemap `<loc>` count | PASS | `dist/sitemap.xml` → 168 |
| 9 | Boot snippet in every emitted shell | PASS | `hfuk-theme` in 169/169 shells |
| 10 | **Theme-boot twin identity** (detail below) | PASS | 381 = 2 + 379 chars |
| 11 | Source verification of all 7 features | PASS | layers default both OFF (App.tsx); footer fix; 7 back-to-map links; theme system; published/approx removal (KEEP-set only); muted GPs; BEACON tokens (10 `--hf-*` per theme block) |

**Theme-boot twin-identity gate (QA gate 10 — the Cycle 4-critical new
gate).** The no-flash theme boot snippet (`index.html:17-24`, closed
IIFE: reads `hfuk-theme` in try/catch, whitelists `light`/`dark`, absent
= auto, sets `data-bs-theme` only to fixed strings) is **byte-identical
across the frozen `index.html` ↔ `scripts/prerender.mjs` twin**, so all
169 emitted shells match the source. Verified: the `out.push` literal at
`scripts/prerender.mjs:179-189` = 2-space indent prefix + the 379-char
`index.html` snippet (381 chars total); the `dist/index.html` twin was
re-verified byte-identical across a rebuild (Security verification rows
10/17). **Operational rule:** any future edit to the boot snippet is a
two-file edit (both `index.html` and `scripts/prerender.mjs`) that
re-runs gate 10 — a one-sided edit silently desyncs all 169 shells.
Recommended (QA carry, non-blocking): a small repo script that asserts
the identity so gate 10 stops being manual, plus grep guards for
`#1d4ed8` / CDN domains (gates 5–6).
## 3. Deploy story

**Topology (unchanged from Cycles 2–3).** The Cloudflare Pages project
`hospiceinfo` is **git-connected to `main`** (ADR-0014): every push runs
the project build command `npm ci && npm run build` and publishes `dist/`
(`wrangler.jsonc` → `pages_build_output_dir: "dist"`). An approved push to
`main` **is** the publish — no `wrangler login`, no deploy command, no env
vars, no form endpoints, no rewrite rules (ADR-0007 hash routing). Per
ADR-0030 hop 4: **no secrets, no build-time network, no runtime service**
— the Pages build runs the same offline chain as a local build, and
runtime egress is keyless OSM tiles plus user-initiated `mailto:`.
Pre-promote checks: push a branch and use its Pages preview URL.
`wrangler` sees project-level operations only, never publishing.

**Pre-push checklist (exact, in order) — all three must be true before the
single Cycle 4 commit is pushed:**

1. **(a) FQ4-3 — scratch-dir gitignore.** DONE by this stage on
   2026-10-30: two lines appended to `.gitignore` (`.qwen/`, `.tmp/`);
   verified `git status --short` no longer lists the scratch dirs and
   `git diff -- .gitignore` shows exactly those two additions. Untracked
   scratch files can never reach `dist/` (Pages builds from git commits
   only) — hygiene, not a publish blocker — but it keeps the Cycle 4
   commit clean.
2. **(b) SEC-4-01 — OFL font licence/attribution.** The three shipped
   OFL-licensed woff2 fonts have no licence text in the repo (no `LICEN*`
   file, no attribution anywhere — verified by Security). Content owned
   by **Stage 9 (Docs) — the Licences page / `docs/` attribution**.
   Before the Cycle 4 commit is **pushed**, verify the OFL notice + font
   attribution (Archivo, Public Sans) is present in the shipped Licences
   page source. Risk-accepted (Low, non-blocking for the pipeline stages)
   — but push = publish, so it is a condition of *this* publish.
3. **(c) James's human browser pass, items 8–9.** Visual/contrast in
   light + dark at 1024/1280/1440/375 and theme persistence (fresh →
   auto = OS match; light/dark persist; auto tracks OS live). This host
   has **no browser** — items 8–9 pass at code/spec level only (recorded
   in `.agents/qa.md`); the step is human-confirmed by James (preview URL
   or a local `npm run preview`).

After all three: one commit containing the full Cycle 4 work (ADRs
0024–0030 included in the same commit), then the James-approved push —
auto-publish. If anything changes in the tree after this checklist,
re-run the standing pre-push chain first: `npm run build-data` ×2
byte-identical (skip only when `data/`/`data-raw/` are untouched, as this
cycle) → `node scripts/validate-tessellation.mjs` exit 0 → `npm run build`
×2 (double-build identity) → `npm run check:layout` exit 0.

## 4. Rollback notes

Cycle 4 lands as **one commit on `main`**. Rollback is twofold:

- **Code:** `git revert <cycle-4-sha>` + the James-approved push. Pages
  rebuilds from the restored commit; because the build is deterministic
  (§1), **rollback reproduces the previously published output
  byte-for-byte** — no drift between "reverted code" and "what was
  served". If the cycle is found broken *before* push: nothing has
  published; the working tree simply resets to `c6da9d3` and the live
  site is untouched.
- **Live site (no code change):** Cloudflare Pages keeps every
  deployment; rollback = Deployments → restore the previous deployment
  (blast radius: the published URL only). Use it to stop the bleeding
  immediately, then follow with the `git revert` so tree and site agree.

**No database, no migrations, no runtime state, no feature flags to
flip.** The theme preference lives in each user's own browser
(`hfuk-theme` in localStorage, read through a fixed-value whitelist) — a
site rollback cannot strand users in a broken state. No data-file change
was made in Cycle 4, so no data rollback applies here; standing rule:
`public/data/*.json` always regenerate byte-identically from committed
`data-raw/`, so a bad data set rolls back by re-running the §7.2 chain —
no code rollback needed.
## 5. Observability

Fully static: **no telemetry, no logs, no analytics of its own** — the
site emits nothing.

**Signals.**

- **Cloudflare Pages build log** (primary): every push runs `npm ci &&
  npm run build`; success ends with `[prerender] emitted 171 files (161
  hospice pages)`. A failed build does **not** replace the live site —
  the previous deployment stays up (the safety net for a bad commit).
- **Pages 404s and analytics** (dashboard): detect firing of the
  `404.html` shell (soft 200) and traffic. No server logs exist to
  shard — Pages log files are the only host-side record.
- **Build-time assertions** (the real monitoring, run on every change):
  prerender's `<loc>` count assertion, `validate-tessellation`,
  `check:layout`, and the double-build byte-comparison. A regression is
  caught at CI/build time, not in production.

**Post-publish smoke checks (Cycle 4, run against the live
URL after the push):**

1. `GET /` → 200, body contains "Hospice Finder UK".
2. Script-tag balance across 169 pages: 507 `<script` / 507 `</script>`,
   0 unbalanced (regression check for SEC-3-01).
3. `hfuk-theme` boot snippet present in all 169 shells (grep count 169).
4. Fonts served: `GET /fonts/Archivo-700.woff2`, `/fonts/PublicSans-400.woff2`,
   `/fonts/PublicSans-600.woff2` → 200 with expected byte sizes
   14,508 / 14,632 / 14,592.
5. `GET /sitemap.xml` → 168 `<loc>`; `GET /robots.txt` → 200, 75 bytes.
6. 171-file survey: index, 6 info pages, 161 `hospice/*.html`, `404.html`,
   `sitemap.xml`, `robots.txt` all present; sample a couple of hospice
   pages + `about.html` → 200.

## 6. Risk-accepted items (with operational consequence)

Carried from `.agents/security.md` + `.agents/qa.md` (both: 0 Blocking).

| ID | Finding | Ops consequence |
|---|---|---|
| SEC-4-01 (Low) | OFL licence text/attribution not shipped for the 3 woff2 fonts | — pre-push checklist item (b): **verify attribution in the Licences page before the Cycle 4 push**; content owned by Stage 9 Docs |
| SEC-4-02 (Info) | Scratch dirs `.qwen/` / `.tmp/` untracked | — **done this pass** (`.gitignore` two lines, pre-push item a, verified via `git status` + `git diff`) |
| SEC-4-03 / RQ3-1 (Info, carried) | Dark tiles debt — light OSM tiles in both themes | — no security impact; follow-up is a one-line tile-URL change per ADR-0027 §4.5; non-blocking |
| SEC-4-D1 (Low, new) | `hfuk-theme` localStorage key (self-only, whitelisted on read) | — no active consequence; documented; do **not** add a second localStorage key without a security review |
| SEC-4-D2 (Medium, carried) | Curated JSON trust boundary — human curation is the control | — data landings must go through the §7.2 gate chain with provenance recorded in `data/README.md` before push (push = publish; no external writes into `data-raw/`) |
| SEC-4-D3 (Info, carried) | No CSP header (fully static; inline JS = frozen boot snippet only) | — any future **inline-JS addition** (e.g. extending the boot snippet) forces a gate-10 twin re-check and should re-raise the CSP question |

Informational, no ops consequence (from QA): FQ4-1 (raw `rgba(15,23,32,0.8)`
in the W6 block — consistency note), FQ4-2 (stale GLOSSARY `kind` sentence
— one line, Architect-owned, carried to the docs pass), FQ4-4 (CRLF
warnings on `logo.svg`/`manifest.webmanifest` — benign, files
byte-identical across builds, gate 4 unaffected).
## 7. Carry-forward (from the Cycle 3 ops file; unchanged by Cycle 4)

Full Cycle 3/2/1 text: `git show c6da9d3:.agents/ops.md`. What remains
true and is retained here:

**7.1 Pre-push standing chain (every future push).**
`npm run build-data` ×2 (byte-identical) → `node
scripts/validate-tessellation.mjs` (exit 0) → `npm run build` ×2
(double-build byte-identity) → `npm run check:layout` (exit 0) →
commit → James-approved push (apply Cycle 4; `build-data` may be skipped
when `data/`/`data-raw/` are untouched, as this cycle, with that
checked). Cloudflare Pages then publishes `dist/` automatically.

**7.2 Data refresh — canonical chain.**
1. Fetch fresh OSM data **only through** the committed scripts
   (`scripts/fetch-uk-land.mjs`, `scripts/fetch-extracts.mjs`,
   `scripts/merge-hospices.mjs` — 20 curated hospices, `scripts/geocode-postcodes.mjs`
   — 1 req/s, resumable, fail-fast on any missing postcode).
2. Run `npm run build-data` → `public/data/*.json` (double-run byte
   identity).
3. `node scripts/validate-tessellation.mjs` (exit 0).
4. `npm run build` (double-build identity) + `npm run check:layout`.
5. Commit (data assets + raw inputs together) → push → publish.
Provenance recorded in `data/README.md` (SHA-256 of every remote input),
and in the §7.1 chain. **TBC:** any CIW (Care Inspectorate Wales)
response (gate CIW) goes through this same chain.

**7.3 Corrections log (user-driven changes, no process change).**
Editor-run edits: `scripts/add-correction.mjs` → `scripts/
validate-corrections.mjs` → commit → publish, with the §7.1 chain.

**7.4 Definition of healthy.**
- 161 UK hospices (en 152, sc 3, ni 6, wales 0).
- 11,002 GP practices assigned to catchments; 12 unassigned (9 from the
  OSM gap BT postcodes — documented, no loop, human-verified).
- 138 charity shops on the map, 0 unresolved.
- Catchments: 161 polygons, coverage 100.00%, pairwise overlap 0.0000
  deg², 3 known empty cells, 0 slivers.

**7.5 Known operational risks (unchanged).**
- **Geocode wall-time:** Nominatim 1 req/s means a cold full pass takes
  minutes (a few hundred postcodes); the resumable `geocode-postcodes.mjs`
  makes re-runs cheap.
- **9 OSM-gap postcodes:** Nominatim/Overpass cannot resolve them at
  unit or outcode level; the hand-corrected CSV rows are pinned and
  documented (ADR-0021); `geocode-postcodes.mjs` exits 1 if any
  in-scope postcode is still missing — no retry loop, fix in the raw
  file.
- **`npm audit`:** 3 dev-only advisories (vite, esbuild, postcss); no
  runtime/production exposure; not a blocker.
- **Local dev port 5173:** `npm run dev`/`preview` bind to 5173; if
  occupied, change the port in `vite.config.js` (gitignored — local
  only).
- **Reproducibility is from `package-lock.json`:** a `npm install`
  (no-`ci`) on a clean machine can drift; use `npm ci`.
- **CIW pending:** gate is non-blocking; the Wales row in the map shows
  0 until the extract lands.
- **Post-data-landing re-run checklist** (Cycle 2 §5, unchanged):
  update `site-config.json` (counts, `generated`), `data/README.md`
  (anchors, SHA-256 pins, provenance), re-run the §7.1 chain, **then**
  commit — data-asset and raw-input commits go together, never split.

---
*Stage 10 (Hindsight) — `docs/` (Stage 9, Docs) — will consume this
file. The pre-push checklist (§3) is the single point of
publish-gating; rollback (§4) is the single point of crisis response;
the smoke checks (§5) are the acceptance test after every push.*
