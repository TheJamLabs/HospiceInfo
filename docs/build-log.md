2 2026-10-26 dc261185 e11322ba 2a87a374 5628d8f7
3 2026-10-29 65818ace cc096f17 f7df12fd dd19e8ae
4 2026-10-30 bbe4bde
5 2026-11-08 416d28a

## Cycle 4 (2026-10-30)

- 1. GP and charity-shop layers off on first load; hospice markers and
  catchment polygons stay visible; layer state in-memory only, not persisted
  (ADR-0025).
- 2. About-page footer overlap fixed; back-to-map affordance on all info pages
  (arch §3.1–3.2; no dedicated ADR).
- 3. GP and shop precedence de-emphasised: both layers off at load, shops
  ranked before GPs, GPs rendered smaller and muted slate
  (`--hf-gp-fill`) (ADR-0026).
- 4. Auto/Light/Dark theme picker — OS-honouring, user-overridable, `hfuk-theme`
  localStorage key, no-flash boot snippet in `index.html` +
  `scripts/prerender.mjs` (ADR-0024); dark-theme Leaflet CSS overrides
  (ADR-0027).
- 5. "Has Published Service Area" filter removed from all UI; `kind`-based
  provenance (published vs approx catchments) retained in the data and on the
  About page (no dedicated ADR).
- 6. BEACON rebrand: navy `#163a5f` light / `#7dadd6` dark, `--hf-gp-fill`
  `#74879b`/`#8298ad`, self-hosted Archivo 700 + Public Sans 400/600, coral
  `#e06744` on the og-image only, 10 `--hf-*` design tokens (ADR-0028).

Pipeline ADRs this cycle: ADR-0029 (keyless OSM build-time geocoding),
ADR-0030 (reproducible static pipeline).

QA outcome (`.agents/qa.md`): PASS, 0 open Blocking — 11/11 gates green,
including 184/184 SHA-256 double-build match, theme-boot snippet 381 chars in
all 169 HTML shells, 168 `<loc>` in `dist/sitemap.xml`, 507/507 `<script>`
balance in the emitted `index.html`, 3 self-hosted woff2 fonts, and
`npm run check:layout` exit 0.

Security outcome (`.agents/security.md`): PASS, 0 open Blocking. SEC-4-01
(Low — SIL OFL 1.1 licence/attribution missing for the 3 self-hosted woff2
fonts) was fixed in the Stage 9 documentation pass (Licences page,
Typography section, exact OFL attributions). Risk-accepted: SEC-4-02 (Info —
scratch dirs `.qwen/tmp/` + `.tmp/` untracked, zero credentials, gitignored in
the ops pass), SEC-4-03 (Info — dark OSM tileset debt; light tiles in both
themes per ADR-0027), SEC-4-D1 (Low — `hfuk-theme` localStorage
trust-boundary extension, whitelisted on read), SEC-4-D2 (Medium, carried
SEC-F3 — curated JSON trust boundary; human curation is the control),
SEC-4-D3 (Info, carried SEC-F2 — no Content-Security-Policy; the only inline
JS is the frozen theme-boot snippet).

## Cycle 5 (2026-11-08)

- 1. Scotland register append: PalliativeCare Scotland directory (Wayback
  pin 20260514160126, 17,723 B) appended via explicit equivalence mapping
  (ADR-0032): exactly two new rows — `sc-pcs-30` "Marie Curie Hospice",
  Edinburgh and `sc-pcs-58` "Queen Margaret Hospital Hospice Ward (Ward 16)",
  Dunfermline. Scotland 32 → 34 (3 CS + 29 OSCAR + 2 PCS); merged total
  161 → 192 (en 152, sc 34, ni 6, wales 0).
- 2. The 2026-11-08 12:53 partial append (`sc-pcs-76` Ayrshire, `sc-pcs-75`
  Melrose — both register duplicates) is retracted; rows 1–32 remain the
  pre-image oracle (ADR-0032, Context).
- 3. Wales final gate H5-1 resolved VERIFIED-NEGATIVE: the live 2026-11-08
  fetch of the NHS Wales P&I page (SHA-256-pinned in `.agents/
  implementation.md`) confirms the list is under review and absent — 0 is
  the verified final value under ADR-0020 (zero-set, not a skipped
  request). Re-poll when the review lifts.
- 4. Landing chain re-run green: merge 192 / 0 dup; geocode exit 1 by
  design (0 new; 9 pre-existing C3 BT posture gaps); build-data 192 rows /
  178 labelled cells / 138 shops / 11,014 practices (11,002 geocoded,
  12 unplaced); validate-tessellation 100.00% coverage, 0 slivers,
  1 empty cell (ni-r5), overlap 0.0060 deg² (FQ5-L1 informational);
  build ×2 byte-identical (200 shells / 199 `<loc>` / 215 files,
  disk-verified 2026-11-08); `npm run check:layout` exit 0.

Pipeline ADRs this cycle: ADR-0031 (OSCAR primary Scotland source and id
scheme), ADR-0032 (PCS append id scheme and equivalence-mapping dedupe).

QA outcome (`.agents/qa.md`): PASS, 0 open Blocking — 6/6 landing gates
green (gates 2–5 re-run post-landing, 2026-11-08); FQ5-L1 (pairwise
overlap 0.0000 → 0.0060 deg²) classified Informational, no gate impact.

Security outcome (`.agents/security.md`): PASS, 0 open Blocking —
SEC5-L1 (ast-map rect z-ordering), SEC5-L2 (12 unplaced rows hidden by
ADR-0012 policy), SEC5-L3 (Nominatim header in build-data.mjs), SEC5-L4
(land-mask reuse), SEC5-L5 (scratch hygiene) — all Informational. Carried:
SEC-4-02 (scratch dirs), SEC-4-03 (dark-tile debt, ADR-0027).

Landing commit: **`416d28a`** (2026-11-08) — one commit (36 files,
+26,579/−146), pushed to `origin/main`, auto-published by Cloudflare
Pages (ADR-0014). Rollback = `git revert 416d28a` + push (byte-exact
deterministic build).
