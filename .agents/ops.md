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

## Cycle 5 — Landing (2026-11-08)

Stage 8 re-pass for the 2026-11-08 data landing (Scotland register
re-fetch + OSCAR 29 rows + PCS 2 rows ingested; Wales final gate H5-1
closed). QA (stage 6) and Security (stage 7) both **CLOSED — PASS,
0 Blocking, 0 new risk-accepted, 0 rework rounds**. State verified
read-only 2026-11-08: working tree = 19 tracked modifications +
untracked landing set (28 `git status --short` entries) on top of HEAD
`e1fbc1b` — **UNCOMMITTED** (deploy posture below). Everything in
§1–§7 above that is not overridden here (deploy topology, ADR-0014
git-connected publish, §4 rollback model, §7 standing chain) remains
in force.

**Landing figures (disk-verified 2026-11-08).** **192 hospices:
en 152, sc 34, ni 6, wales 0** (20 curated rows unchanged). Scotland
34 = 3 CS register + 29 OSCAR + 2 PCS (sc-pcs-30 Edinburgh,
sc-pcs-58 Dunfermline). Wales gate H5-1: the NHS Wales P&I page was
fetched directly and SHA-pinned (below) — the page is an under-review
shell with the list absent, so **0 is the verified final value, not an
unanswered request** (ADR-0020 zero-set); re-poll when the review lifts.

**Post-landing re-run chain (fresh 2026-11-08 pass — the results QA
(stages 6) gated on).**

| Step | Result |
|---|---|
| `node scripts/merge-hospices.mjs` | exit 0; 192 merged, 0 duplicates |
| `node scripts/geocode-postcodes.mjs` | exit 1 — **by design** (A-4 no-loop posture): 0 new gaps; the 9 known OSM-gap BT postcodes remain the only in-scope misses (documented, human-verified) |
| `npm run build-data` | exit 0; 192 hospices; voronoi 11,180 vertices / 178 labelled cells; 138 charity shops; 11,014 practices → 11,002 geocoded, 12 unplaced (9 BT + 3 non-BT) |
| `node scripts/validate-tessellation.mjs` | exit 0; 178 catchments; 1 empty cell (ni-r5); 0 slivers; sea leakage max 0.000478 deg²; coverage 100.00%; pairwise overlap **0.0060 deg²** (up from 0.0000 — FQ5-L1, Informational, no action; `.agents/qa.md`) |
| `npm run build` ×2 | exit 0; **byte-identical**; dist = **200 `.html` shells** (1 index + 6 info + 192 hospice + 1 404), **199 `<loc>`** = 192 + 7 (prerender self-assert), **215 dist files** (202 prerendered + 13 static) |
| `npm run check:layout` | exit 0, "check-map-layout: OK" |

**Count-scripture note (Informational, no action).** The Cycle 4
template counters carried in `qa.md` / `implementation.md` gate prose
(169 shells / 177 pages / 193 loc / 171 files) disagree with the
disk-verified landing truth (200 shells / 192 hospice pages / 199 loc /
215 files). The gates themselves — build exit 0, prerender `<loc>`
self-assert, double-build byte-identity — are unaffected and PASS; the
discrepancy is a stale template carry-forward, not a build defect. This
ops file cites the disk-verified numbers.

**SHA pins (landing, full in `data/README.md`).**

| File | SHA-256 |
|---|---|
| `data-raw/hospices-all.json` (merged, deduped 192) | `DACD44268FAA63BD455383028D38D4B7508052E5813CB49621BF0A3B6A086C0F` |
| `data-raw/extracts/hospices-sc-normalised.json` (29 OSCAR) | `8f7485d2ff4a20acc71173753acacdb94866615ecd722ea019eb22a1cab791e0` |
| `data-raw/extracts/scotland-oscar-hospices-latest.html` (Wayback 20260514160126, 17,723 B) | `D768069C85B5F716F4E34764970F7A1EFD820C3E92CEA8C8E7402F71121EE9DB` |
| `data-raw/nhs-wales-hospices-2026-11.html` (live fetch, 61,852 B) | `8055D93604661A466551C5543ABD200E35102DA9A95280712A89C19A3941B3AB` |
| `data-raw/uk-land.json` (land mask) | `b9b313ab7dac80c45c48aea900469cf61043f7b9a0665cde79dfec63e0075b55` — **unchanged** (G7 pin) |
| `public/data/hospices.json` (192, 72,265 B) | `50B989CC24358AA21D1EB2041C686918AD571D6AE293908D60FDD56E7494FEC5` |
| `public/data/hospices-sc.json` (34, 26,087 B) | `85474C85110946AAAB8511F9B074B6B2ABE910C6AFA9A633D5B438CCEA039D63` |

Provenance record hygiene, done this pass: `data/README.md` tables
were already landing-complete; the narrative was refreshed (header date
→ 2026-11-08; Wales sentence → H5-1 verified-negative wording, ADR-0020)
so the shipped provenance file is accurate before push.

**Deploy posture.** The landing is **UNCOMMITTED on `e1fbc1b`**. The
§7.1 pre-push standing chain is complete for this cycle (build-data ×2
byte-identity, tessellation exit 0, build ×2 byte-identity,
check:layout — the re-run chain above). Next action is **James's human
gate: one commit (data assets + raw inputs + ADRs together, never
split — §7.2 rule 5) + push → Cloudflare Pages auto-publishes
`dist/`**. Rollback unchanged from §4 (git revert + push; deterministic
build ⇒ byte-exact); live-site restore via Pages Deployments for
immediate stop-the-bleed.

**Post-publish smoke checks (Cycle 5, against `https://hospiceinfo.pages.dev`):**

1. `GET /` → 200, "Hospice Finder UK".
2. `GET /sitemap.xml` → **199 `<loc>`**; `GET /robots.txt` → 200, 75 bytes.
3. **200 shell survey**: index, 6 info pages, **192 `hospice/*.html`**,
   `404.html` all present; sample 2 new Scotland pages (e.g.
   `sc-pcs-30`, `sc-pcs-58`) + a legacy England page → 200.
4. Map smoke: Scotland count shows 34, Wales shows 0 (verified
   zero-set), 178 catchment polygons render.

**Definition of healthy — updated for Cycle 5.** 192 UK hospices
(en 152, sc 34, ni 6, wales 0); 178 catchment polygons, coverage
100.00%, pairwise overlap 0.0060 deg² (FQ5-L1 informational), 1 known
empty cell (ni-r5), 0 slivers; 11,002 of 11,014 GP practices placed
(12 unplaced = 9 OSM-gap BT + 3 non-BT); 138 charity shops, 0
unresolved. All other entries in §7.4 (geocode wall-time, audit
advisories, port 5173, `npm ci` rule) unchanged.

---
*Stage 10 (Hindsight) — `docs/` (Stage 9, Docs) — will consume this
file. The pre-push checklist (§3) is the single point of
publish-gating; rollback (§4) is the single point of crisis response;
the smoke checks (§5) are the acceptance test after every push.*
---

## Cycle 6 — Landing (2026-11-13)

Stage 8 re-pass for the Cycle 6 delta (2026-11-10 coding pass): the
site-owner's four issues — C6-1 NI catchments clipped to the NI admin
ring, C6-2 Scottish border fit (adjacent-only edge merge + jitter),
C6-3 postcode-search normaliser, C6-4 children's mode (per-kind
tessellation, ADR-0035). QA (stage 6) **PASS, 0 Blocking** (Q6-1/Q6-2/
Q6-3 Informational — `.agents/qa.md`); Security (stage 7) **PASS, 0
Blocking** (SEC6-01..04 risk-accepted debt — `.agents/security.md`).
State verified read-only 2026-11-13: working tree = **22 tracked
modifications + 5 new untracked paths** on top of HEAD `f141a71` — the
C6 work is **UNCOMMITTED**, and `f141a71` ("Land ADR-0033 Wales",
human-approved 2026-11-08) is itself **unpushed**: local `main` is 1
ahead of `origin/main` (`a6791d5`). `f141a71` is part of the pending
push, not a defect (see publish plan). Everything in §1–§7 above that
is not overridden here (deploy topology, ADR-0014 git-connected
publish, §4 rollback model, §7 standing chain) remains in force.

**Landing figures (disk-verified 2026-11-13).** **208 hospices:
en 152, sc 33, wales 17, ni 6** (209 at `f141a71` minus the CHAS
umbrella row, removed per James's scope gate). 20 rows carry the
`children` flag, stamped by `scripts/merge-hospices.mjs` (static
CHILDREN_IDS list; St Andrew's, Grimsby, in BOTH modes per gate
2026-11-08). `public/data/hospices.json` = 208 rows;
`public/data/catchments.json` = 194 entries. New raw input
`data-raw/roi-border.json` (C6-1 clip ring): OSM relation 156393
(admin_level 4, Northern Ireland / Tuaisceart Éireann), 18,422 ring
nodes, areaDeg2 2.685914, ODbL v1.0, fetched 2026-11-10, 878,999 B —
SHA-256 pinned in `data/README.md:44`. C6 jitter applied at build (from
the pre-crash log lines below): 2,445 co-located vertices (±1e-4 deg)
+ 7,700 others (±1e-5 deg). Expected post-build: **216 shells** (208
hospice + 8) and **215 `<loc>`** = 208 + 7 (prerender self-assert).
The `f141a71` baseline (pre-C6, `pipeline.md` ledger): 209 rows / 195
cells / pairwise overlap 0.0269 deg² (pre-jitter) / 3 empty cells /
11,002 of 11,014 placed / 138 shops / 216 `<loc>` (209 + 7).

**Post-landing re-run chain (fresh 2026-11-13 pass — Step 2 BLOCKING).**

| Step | Result |
|---|---|
| `node scripts/merge-hospices.mjs` | exit 0; 208 merged (en 152, sc 33, wales 17, ni 6), curated: 20, CHAS excluded, `children` flagged on 20, count-mismatch exit-1 guard in place; re-run idempotent — output SHA-1 unchanged |
| `npm run build-data` | **exit 1 — BLOCKING.** `Error: mergeTwo: chain of 9 edges did not close` thrown at `scripts/build-data.mjs:676` (mergeTwo), call chain `tessellate:845 ← main:886`, Node v22.23.1. Reproduced twice (2026-11-13) on byte-identical inputs (~110–180 s); deterministic (green-green crash, disk unchanged). Pre-crash log: `roi border: relation 156393 (Northern Ireland / Tuaisceart Éireann), 18423 ring points, fetched 2026-11-10` / `hospices: 208 (unplaced: 14)` / `tessellation offsets: 2445 co-located vertices (±1e-4 deg) + 7700 others (±1e-5 deg)`. Throws before any `public/data/` write — committed data SHAs re-verified unchanged after the runs |
| `node scripts/validate-tessellation.mjs` | **not run** — chain stops at Step 2 (§7.1 fail-fast) |
| `npm run build` ×2 | **not run** — chain stops at Step 2 |
| `npm run check:layout` | **not run** — chain stops at Step 2 |
| `npm test` | exit 0; 3/3 pass (~0.5 s) — C6-3 `normalisePostcode` vectors: LS1 4AP positive resolution via committed `public/data/practices.json`; CF11 9HD and BT15 3LH clean not-found (no throw) |
| `npm audit --omit=dev` | 0 vulnerabilities (re-verified this pass; SEC6-01 dev-only xlsx@0.18.5 HIGH / esbuild MEDIUM debt unchanged, out of gate scope) |

**Chain verdict — ship gate BLOCKED on Step 2 (Blocking, documented;
ops does not fix).** The C6 `public/data/*.json` in the working tree is
what the 2026-11-10 coding pass built (QA/Security verified it on
disk), but ADR-0030's reproducibility claim — fresh clone + canonical
chain reproduces the deployed bytes — now **fails at build-data**, so
those bytes cannot be re-produced by the chain that must own them. A
**Coding fix pass (lead-directed)** to root-cause and fix the mergeTwo
open-chain throw, followed by the full §7.1 chain green (including the
two new C6 gates `npm test` and `npm audit --omit=dev`), is required
before the C6 commit is carved. Evidence boundary: QA's vm-sandbox
slice harness over `mergeTwo` (Q6-1) **PASSED** — the adjacency rule is
verified on the classified L/L corner inputs — but the full
tessellation run throws on a 9-edge open chain, i.e. **the failing
input is outside the harness's classified set**; expected same
degeneracy family as C6-2 (L/L corner / T2 stub; Q6-1/Q6-2). This
section is read-only: no code changed, no fix applied.
**SHA pins (C6 delta, measured 2026-11-13; `data/README.md` re-pin
remains due once the chain is green).**

| File | Pin |
|---|---|
| `data-raw/roi-border.json` (NEW, 878,999 B, OSM rel 156393, ODbL v1.0) | SHA-256 `b34313501e28bd6429857646b48da6136309c057685b606e7378ed27572f98c6` |
| `data-raw/hospices-all.json` (merged, 208) | SHA-1 `c06de9b9a260938d65350cd973c2c1dd1e4f989d` |
| `public/data/hospices.json` (208 rows) | SHA-1 `a32230eee8843ee1ad11cfa1667b1473ffaf2f0c` |
| `public/data/catchments.json` (194 entries) | SHA-1 `b74e5769db46e6361715ca63130b841d7a841757` |
| `public/data/practices.json` | SHA-1 `088d08ef8fd180a9c00bec4e7336a6119bb5446e` |
| `public/data/shops.json` (138) | SHA-1 `2d631214cfa12c16a8155e8c27e5ecdf693c93b1` |

All six pins are stable across the crashing runs (re-verified
before/after). The `public/data/*` rows hash the coding-pass disk
bytes; when the C6 chain first goes green, build-data output may
re-write them and the `data/README.md` pins must be re-verified against
the final byte-identical output (ADR-0030: pin the shipped bytes).

**Publish plan (gated — see chain verdict; do not ship while Step 2 is
red).** Commit scope = the verified C6 delta, 22 tracked modifications
+ 5 new untracked paths: `scripts/build-data.mjs`,
`scripts/validate-tessellation.mjs`, `scripts/merge-hospices.mjs`,
`src/App.tsx`, `src/components/StartHere.tsx`, `src/lib/types.ts`,
`src/lib/postcodes.ts` (NEW), `tests/postcodes.test.mjs` (NEW, under
`tests/`), `data-raw/hospices-all.json`, `data-raw/roi-border.json`
(NEW), `public/data/hospices.json`, `public/data/catchments.json`,
`public/data/practices.json`, `public/data/shops.json`, `data/README.md`,
`package.json` (C6 diff = the `"test": "node --test"` script only —
SEC-4-01 closed), `docs/adr/0034-ni-clip-and-sc-jitter-acceptance.md`
(NEW), `docs/adr/0035-per-kind-tessellation-childrens-mode.md` (NEW),
`.agents/research.md`, `.agents/architecture.md`, `.agents/feature.md`,
`.agents/implementation.md`, `.agents/qa.md`, `.agents/security.md`,
`.agents/pipeline.md` (7), `GLOSSARY.md`, `QWEN.md`. The push carries
**two commits** on top of `origin/main` (`a6791d5`): `f141a71` (ADR-0033
Wales landing — approved 2026-11-08, rides along as part of the pending
push, not a defect) + the C6 commit. ADR-0014: the push to `main` IS
the publish — Cloudflare Pages project `hospiceinfo` (git-connected)
runs `npm ci && npm run build` and publishes `dist/`; a failed Pages
build does not replace the live site. Human ship gate: James
(commit + push, ledger gate 1) — **currently BLOCKED** by Step 2 above.
Post-push publish truth = the Pages deploy log (no CI to consult — see
tooling gaps below); run the smoke checks below only after the deploy
reports success.
**Post-publish smoke checks (Cycle 6, against `https://hospiceinfo.pages.dev`):**

1. `GET /` → 200, "Hospice Finder UK".
2. `GET /sitemap.xml` → **215 `<loc>`** = 208 + 7 (prerender self-assert); `GET /robots.txt` → 200, 75 bytes (unchanged).
3. **216 shell survey**: index, 6 info pages, **208 `hospice/*.html`**, `404.html` all present; sample 1 new Wales page (the `f141a71` landing, `ww-` id), an NI page (`ni-*`), the two SC St Michael's / St Michaels pages (C6-2 fit), one children's hospice page → 200.
4. **NI border (C6-1)**: every NI cell lies **inside the NI admin ring** — no polygon fill crossing into ROI or out to sea on the ROI side of the border; Belfast Lough region eyeballed.
5. **No RI bleed (C6-1 Amendment 2 Option A residual)**: no new RI bleed beyond the documented en/wales residual (3.5658 / 0.3100 deg², SEC6-03 accepted debt) — en/wales cells do not visibly touch Irish land.
6. **Children's mode (C6-4)**: default OFF → children's rows filtered out of all four datasets; toggle ON (`#childrenToggle`) → children's catchments only (20, incl. St Andrew's Grimsby), no interleave with adult catchments (per-kind tessellation); selection clears on toggle; toggle back restores the adult view.
7. **Postcode search (C6-3)**: type `ls1 4ap` (lowercase, no space) → normalised, resolves to a practice → catchment → hospice card; `CF11 9HD` and `BT15 3LH` → clean not-found, no exception.
8. Map counts: England 152, Scotland 33, Wales 17, NI 6; 194 catchment polygons render in adult mode.

**Definition of healthy — updated for Cycle 6.** 208 UK hospices
(en 152, sc 33, wales 17, ni 6); 20 rows children's-flagged (St
Andrew's Grimsby in both modes); 194 catchment cells; NI spill
**0.000000 deg²** (invariant 5, `area(difference(cell, roiRing))`
form, GREEN at the 2026-11-10 coding pass); SC pairwise overlap gate
**< 1e-6** (invariant 6 — post-jitter measured value **pending** the
full validator run, currently blocked behind the Step-2 fix; the
`f141a71` pre-jitter baseline 0.0269 deg² / worst pair St Michael's vs
St Michaels 0.0136 deg² is documented as pre-fix state, superseded once
green); coverage 100.00% against the UK-land-only target (Amendment 2
Option A); documented residual: en/wales ROI spill 3.5658 / 0.3100
deg² (SEC6-03, accepted debt); 3 empty cells (incl. ni-r5); 0 slivers;
11,002 of 11,014 GP practices placed (12 unplaced = 9 known BT OSM gap
+ 3 non-BT); 138 charity shops, 0 unresolved; `npm audit --omit=dev`
= 0. All other entries in §7.4 unchanged.
**Rollback (Cycle 6).** Model unchanged (§4): ADR-0012 — no changelog;
rollback is a bare `git revert <sha>` + push. ADR-0030 — deterministic
rebuild; Pages re-builds `dist/` byte-for-byte from the reverted tree.
Pages Deployments restore remains available for immediate
stop-the-bleed. C6 specifics:

- A C6 push lands **two commits in one deploy** (`f141a71` then C6),
  so live jumps `416d28a` (Cycle 5 published) → C6 state in one step.
  Reverting the C6 commit leaves live at `f141a71` (17 Wales rows, 209
  total incl. CHAS, no NI clip, no children's mode); reverting both
  `f141a71` + C6 restores the current Cycle 5 state — or restore the
  `416d28a` deployment directly from Pages Deployments without any git
  movement.
- Data-only rollback: re-run the canonical chain from the pinned
  `data-raw/` of the target commit — `merge-hospices` is deterministic
  per script version, and the CHAS exclusion + `children` stamps live
  in the C6 script, so reverting the scripts reverts the data with them.
- The new pin `data-raw/roi-border.json` is tracked; on a full C6
  revert it disappears from the branch, and the build/validator
  fail-fast ring load cannot fire — no dangling state.
- `npm test` / `npm audit --omit=dev` are additive gates with no
  rollback surface. Changelog: none (ADR-0012) — the Pages Deployments
  history is the audit trail.
- Blocked-state caveat: while Step 2 is red, **no C6 commit should be
  carved** (ADR-0012 + ADR-0030 — a commit is a publish candidate;
  committing then pushing while the chain is red publishes bytes the
  canonical chain cannot reproduce).

**Tooling gaps recorded (platform MCP, per pipeline rule).** No
GitHub / Azure / Bicep / MAUI MCP servers are configured in this
session: the repo is GitHub-hosted (`origin` =
`git@github.com:TheJamLabs/HospiceInfo.git`) but has **no GitHub
Actions CI** — publish truth is the Cloudflare Pages deploy log
(verified post-push), so PR/CI status cannot be checked via tooling
here; no `.bicep` files; no MAUI. `semgrep` unavailable (Security
already recorded the grep sweep). Recorded for Hindsight (stage 10).

---
*Stage 10 (Hindsight) — `docs/` (Stage 9, Docs) — will consume this
section as well. The pre-push checklist (§3) is the single point of
publish-gating; rollback (§4) is the single point of crisis response;
the smoke checks (§5) are the acceptance test after every push.*
