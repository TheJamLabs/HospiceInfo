2 2026-10-26 dc261185 e11322ba 2a87a374 5628d8f7
3 2026-10-29 65818ace cc096f17 f7df12fd dd19e8ae
4 2026-10-30 65818ace cc096f17 f7df12fd dd19e8ae

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
