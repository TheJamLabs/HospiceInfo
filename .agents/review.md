# Review — Cycle 4 (2026-10-30)

**Scope.** Challenged `.agents/requirements.md` L1–167 (W1–W10, Sequencing, A1–A4, Verification gate) against `.agents/architecture.md`, `.agents/research.md`, `.agents/design.md` (BEACON, gate H4-1, Concept 2), `docs/feature.md` AC2/AC5/AC7, ADR-0024…0028 plus standing invariants (0008, 0011, 0012, 0015, 0007/0016), and current source on disk. Every premise below re-verified in code with file:line.

## Per-item review (W1–W10)

**W1 — GP layer gating** — OK (minor cite drift, F7).
- `showShops` `useState(true)`, shops switch, prop passthrough: `src/App.tsx:26,96-97,197` ✓; `visiblePractices` `src/components/MapView.tsx:251-254` ✓ (W1 cite exact); `visibleShops` is L264 (W1 cites L265).
- No `showGps` in src/ (grep 0) ✓. Default-off, in-memory `useState(false)`, filter-parallel hiding unassigned GPs (`hospiceId === null`): consistent with ADR-0025 and hide-not-delete (ADR-0012; `unassigned[]` `src/data/hospices.json` L461).

**W2 — Muted GP markers + search tiers** — issue (step 10 uncheckable, F1); rest OK.
- Premises verified: GP bucket divIcon 28px `#1d4ed8`/`#fff`, `iconSize [28,28]`, `iconAnchor [14,14]` `src/components/MapView.tsx:171-181`; CircleMarker `radius={selectedId === p.hospiceId ? 7 : 5}` + `fillOpacity … : 0.85` L244-245 ✓.
- Step 10 (legend reorder) uncheckable: `src/components/Legend.tsx` is only the 20-catchment curated colour key, rendered solely inside the Methodology modal (`src/components/Methodology.tsx:131`); the persistent map legend was retired in Cycle 2 (Legend.tsx header comment). No shops/GP legend blocks exist in src/. Stale source: the spec line `.agents/architecture.md:26`.
- Search tier rework (step 5): current panel search shows Hospices→Practices→Shops (`src/components/HospiceFilter.tsx:56,89,119`); reorder plus substring/`localeCompare`/tie-break is feasible and matches ADR-0026 for ~918 practices.

**W3 — Footer** — OK.
- `src/components/AppShell.tsx:53` is the only `<footer>`; `.app-footer` has zero rules in `src/styles.css` (grep 0) — "add rule at file top" is a pure addition ✓. `#6c757d` exists today (`src/styles.css` `.app-loading`) so the `var(--hf-text-muted)` mapping is coherent.

**W4 — Back navigation** — OK (cite drift, F7).
- The non-map branch is exactly 6 routes, each `Navigate to="/"` with no back handling: `src/App.tsx:238-249` ✓.
- Link rows verified: `src/pages/StartHere.tsx:100`, `src/pages/CorrectionsPage.tsx:187`, `src/methodology` links at `src/pages/Methodology.tsx:262`. W4 cites `StartHerePage.tsx`; the file is `src/pages/StartHere.tsx`.
- `history.length > 1 → go(-1)` with Navigate fallback is standard; scope is 7 rows, route components and the router/guard (ADR-0007/0016) untouched.

**W5 — Theme boot snippet** — OK (anchor note, F8).
- Current `index.html` (16 lines) has no CSS link — Vite injects the bundle; the real insertion anchor is before the module script at `index.html:14`. W5's "just before the site CSS" phrasing is a dangling anchor but executable (F8).
- Premises hold: no `data-bs-theme` in repo (grep 0), no existing boot snippet in `src/` → ADR-0024 duplication is purely additive. Static inline `<head>` placement is load-order safe; 3-state Auto/Light/Dark with `localStorage` key `hfuk-theme`, auto-only `matchMedia` listener, no React theme state — all consistent with ADR-0024 and the A1 ambiguity resolution.
- Prerender side: `scripts/prerender.mjs` `buildPage()` push-list is the stated target; byte-equality of the two copies is enforced by gate 4 (double build, ADR-0015) — checkable ✓.

**W6 — W5 dark CSS block + token block** — OK (F6: not "extend").
- `src/styles.css` (314 lines) has zero `--hf-*`, zero `data-bs-theme` selectors, zero `font-family`/`@font-face` (grep 0) → W6's "extend the existing dark block" cites a block that does not exist; must be created (F6, risk-accepted — intent unambiguous).
- 10 `--hf-*` tokens × 2 blocks wired to `--bs-body-bg/-color/-border-color` matches ADR-0028; token-swap-only rebrand keeps scope at token-swap + recolour + fonts, per design.md gate H4-1.

**W7 — Published-service-area removal** — issues (F2/F3/F4).
- Gate #6 cites `src/data/types.ts`; the file is `src/lib/types.ts` (`kind` at L11/L34; no `src/data/types.ts` on disk) — as written the gate is unexecutable (F2 **Blocking**).
- KEEP set per A5/AC5 verified present: `Methodology` page, `AboutPage`, `LegalPage`, AppShell tagline at `src/components/AppShell.tsx:36`, `StartHere` page ✓; `kind` retained in `src/lib/types.ts` + provenance only ✓.
- `data/*.json`, `data-raw/`, `scripts/` untouched ✓ (invariants 0011/0015). UI-trace deletions (`kind === 'approx'` → "approx" at `src/components/HospicePanel.tsx:157-160`) verified.

**W8 — Recolour prune sweep** — issues (F5/F6); safe only under W2→W8 sequencing.
- Premise "hospice bucket holds `#64748b`" is wrong: the blue GP bucket divIcon `#1d4ed8` is the target; `#64748b` does not appear in `src/styles.css` (grep 0) → as written W8 never finds its target (F5) and its new bg `var(--hf-primary)` contradicts W2's `var(--hf-gp-fill)` (F5).
- "extend existing dark block" again — none exists (F6). Net-new `[data-bs-theme="dark"]` block in `src/styles.css` is the only coherent reading.
- Scope stays within token-swap + recolour + fonts ✓; `leaflet.css` untouched (ADR-0027 constraint) ✓.

**W9 — Font self-hosting** — OK.
- A1 resolution (stop at record, no CDN fallback; fonts named Archivo 700 + Public Sans 400/600) matches design.md; file placement `src/assets/fonts/` is new (no `fonts/` on disk today, glob 0).
- CSS `@font-face` mono/church-slab treatment is additive to W6's token block ✓. No dep added (ADR-0008) ✓.

**W10 — Beacon palette application** — OK.
- Light `#163a5f` / dark `#7dadd6` / gp-fill `#74879b` & `#8298ad` values match design.md Concept 2 ✓.
- Replacement targets verified: `src/styles.css` `.app-header` L24-27, `.skip-link` L49, `.sheet-fab` bg; `public/manifest.webmanifest` `theme_color`; `public/logo.svg` (4× `#1d4ed8`) ✓.
- Coral `#e06744` is OG-image only, never a token — respected in W10 scope ✓.

## Sequencing soundness

W8→W1→W2→W5→W6→W7→W3→W4→W9→W10 respects all data dependencies: tokens (W6) exist before any recolour (W8/W10); W2's GP fill precedes W8's sweep; gate 4 (byte-equality double build) runs last. No orphan steps. W3/W4/W9/W10 are independent leaves — order among them immaterial.

### Re-review — rework round 1 verification (2026-10-30)

Scope: patched W2/W5/W7/W8 + gate #6 + architecture.md §2. **F1–F8 all RESOLVED** (lead disk-verified reviewer read-verification against on-disk requirements.md, architecture.md, index.html, MapView.tsx, HospicePanel.tsx, styles.css, Lib types.ts). New findings from the re-review, all lead disk-verified against source 2026-10-30:

- **N1 (Blocking)** — W7 step 3 cited a non-existent `publish` const + "Has published service area" popup line in MapView; the live trace is the inline ternary at `src/components/MapView.tsx:106` (`{hospice.kind === 'published' ? 'Published service area' : 'Approximated catchment'}`), which the step never touched → gate #6 unsatisfiable.
- **N2 (risk-accepted)** — W7 step 2 "ml-auto span wrapping it" inaccurate: the "approx" badge is a `<>…</>` fragment at `HospicePanel.tsx` L157–162; the only `*-auto` span is the practice-count badge (L165), which the same step says to keep.
- **N3 (risk-accepted)** — `HospicePanel.tsx` L57 comment `// pm 4.1/W10: list sort + "published service area" filter (ADR-0011).` trips gate #6 after step 2; must be rewritten to `// pm 4.1/W10: list sort (ADR-0011)`.
- **N4 (risk-accepted)** — W5 step 3 cite `index.html:14` drifted to L16 (description meta re-wrapped, file now 18 lines).
- **N5 (risk-accepted)** — W7 step 1: ternary is at App.tsx L145–154 (not L146); no `publish` const in App.tsx (grep: only L145/L147 match); else-branch is a full div, not `''`.

**Verdict: CONDITIONAL PASS — rework round 2/2 (final).** Rework: N1 only; N2–N5 applied in the same patch (lead disk-verified all five in requirements.md 2026-10-30: W7 step 1 → L145–154 whole-ternary removal; step 2 → L73 filter branch, L127–139 form-switch, L157–162 fragment, L57 comment rewrite, L165 count badge kept; step 3 → MapView.tsx L106 verbatim line deletion with curated line preserved; W5 step 3 → `index.html:16`). Re-verify scope: W7 steps 1–3 + gate #6 traceability. A failed round 2 → HUMAN DECISION REQUIRED (2-round cap). Full re-review evidence: `.qwen/tmp/review-c4-re-review.md` (lead disk-verified, 6.6 KB).

### Re-verification — rework round 2/2 (final) (2026-10-30)

Scope: W7 steps 1–3 (requirements.md L90–92) + W5 step 3 (L76) + gate #6 traceability only; F1–F8 not re-adjudicated. All cites reviewer disk-anchored reads 2026-10-30; **lead independently re-verified R2-1/R2-2 against disk** (HospicePanel.tsx filter branch L71 ✓ / form-switch L123–135 + label L133 ✓; `kind` sweep: types.ts L11/L34, Methodology.tsx L93–94, LegalPage.tsx L64 ✓).

**Verdict: FAIL — 2 blocking (text-only; no code or sequencing impact).**

- **R2-1 (Blocking)** — W7 step 2 (L91) carries two off-disk cites: the `publishedOnly` filter branch is at **L71** (step says L73; the variable is `list`, not `visible`), and the form-switch block is at **L123–135** (step says L127–139; label at L133 correct). All other cites verified (L57 ✓, L59 ✓, fragment L157–162 ✓, `ms-auto` L165 ✓).
- **R2-2 (Blocking)** — gate #6 (d) (L94) "`kind` only in types.ts + docs/provenance" is unsatisfiable: after W7 1–3, `kind` remains in Methodology.tsx L93–94 (KEEP-set file for badge patterns; not exempted by this clause) and LegalPage.tsx L64 (prose). The gate would fail even after faithful execution of every step — same failure class as F2.

Verified PASS: W7 step 1 (App.tsx L145–154 verbatim; no `publish` const; `{selected.source}` kept), W7 step 3 (MapView.tsx L106 verbatim + `· curated` line intact), W5 step 3 (`index.html:16` = module script), gate #6 pattern traceability (7 × `published service area`, 21 × `approx` — all accounted).

**Status: RESOLVED 2026-10-30 — Stage 4 CLOSED.** HUMAN DECISION option 1 (lead patches + lead disk-verifies, no third reviewer round — 2-round cap honored): lead applied both one-line patches to `.agents/requirements.md` (W7 step 2: `list` filter L71 + form-switch L123–135; gate #6 (d): `kind` reworded to types.ts L11/L34 + KEEP-set Methodology L93–94 + LegalPage L64 prose) and lead disk-verified both anchors (HospicePanel.tsx L71/L123–135; `kind` sweep = 9 matches exactly accounted). **Stage 4: PASS, closed 2026-10-30.** Escalation options preserved as history in `.agents/pipeline.md` § HUMAN DECISION REQUIRED; evidence: `.qwen/tmp/reverify-r2.md` (lead disk-verified).

# Review — Cycle 3 (2026-10-29)

Reviewer pass over `.agents/architecture.md` (415 L) and ADRs 0015–0023, checked
against `.agents/feature.md` (AC1–AC4, gates H3-1/2/3) and `.agents/research.md`
(475 L). All claims verified against the working tree at HEAD `7061dbf`
(read-only). Per QWEN.md, every Blocking finding below is **design-level
(pre-coding) and routes to the Architect** for a fix pass before Coding.

## D1 — Deterministic zero-dep post-build prerender (`scripts/prerender.mjs`, ADR-0015)

**(a) Spec consistency — PASS.** Feature.md requires 6 info pages + ~161 hospice pages + sitemap/robots + JSON-LD + 404. Arch emits exactly 1 `/index.html` + 6 info + 161 `/hospice/<id>.html` + `sitemap.xml` + `robots.txt` + `404.html` = 171 files. The 161 count is independently verified: `data-raw/hospices-all.json` is 161 entries (en 152, sc 3, ni 6, wales 0; `data/README.md` "Generated app data" table and "Current state"). The only deviation from feature.md's illustrative extensionless URL `/hospice/<id>` is the `.html` extension — an explicit open question (arch §11 Q1), dispositioned in section (e) as accepted.

**(b) Standing invariants — PASS.** Zero new npm deps: ADR-0015 uses `node:fs` only; `package.json` deps/devDeps are untouched (verified: no pre-render tooling exists, so "zero-deps" is real, not cosmetic). Byte-identical data rebuilds: §3.2 rules 1–7 (sorted iterations, no timestamps/lastmod, LF + trailing newline, SHA-256 anchors, double-build `dist/` diff) leave the `build-data` pipeline and its outputs untouched; prerender is a pure function of `public/data/*.json` + the built JS. Client-side data model unchanged (shell page loads the same JS bundle; no SSR). Slug `hospiceinfo` untouched (ADR-0023). ADR-0009 single-source respected (`siteUrl` via `data-raw/site-config.json` + mirror, §3.7). The in-code invariant `sitemap loc count === hospices.json length + 7` (161 + 7 = 168) is the right machine-enforced coupling (ADR-0015).

**(c) Zero-ambiguity — PASS.** Script path, exact `build` chain (`tsc -b && vite build && node scripts/prerender.mjs`), fail-fast on missing inputs, idempotence, the exact head template, and the full title/description table for all 10 page classes are all pinned. No "or" branches in the emit logic.

**(d) QA-testability — PASS.** File count, per-class title/meta presence, sitemap/robots byte match, 404-on-unknown-path, and double-build `dist/` diff are all machine-checkable (grep/diff/curl). AC2 is directly testable.

**Verdict: PASS.**

## D2 — Hash-redirect guard in `src/main.tsx` (ADR-0016)

**(a) Spec consistency — PASS.** Closes research R1 (the named Blocking): static pages must be usable in-app; the guard rewrites real-path loads to the matching hash so the existing router (ADR-0007) behaves as before.

**(b) Standing invariants — PASS.** Hash routing preserved: `location.replace` (not push — no history pollution), no router library added. R12 respected by design: `/hospice/*` → `map` (View on map cannot deep-select; documented in ADR-0016 as a Cycle-4 candidate, matching research R12 risk-acceptance).

**(c) Zero-ambiguity — PASS.** Exact IIFE in arch §3.5, inserted before `createRoot` in `src/main.tsx` — the current file verified as imports + `createRoot` only (no guard present), so the insertion point is unambiguous. The route table covers index → `/`, 6 info routes, `hospice/*` → null → map; unresolvable paths leave the hash empty, which `routeFromHash` already maps to `map` (verified: `useRoute.ts` unknown/empty → `map`). No new dependency. Edges checked: `/hospice` with no id → null → no rewrite → 404 shell → map (safe; no file served at `/hospice/` without an id); `/about.html` → `#/about` ✓.

**(d) QA-testability — PASS.** In-browser: load each emitted URL, assert the hash rewrites to the expected route; history length proves replace-not-push; map-landing for `/hospice/*` observable.

**Verdict: PASS.**

## D3 — SEO meta + JSON-LD `@graph` + Open Graph (ADR-0018)

**(a) Spec consistency — PASS.** Feature.md's SEO requirement (unique titles/descriptions, JSON-LD, social cards) is fully met: complete head set, `@graph` with Organization (from site-config.json) + HealthCareBusiness, per-class title/description table, og:image on every emitted page.

**(b) Standing invariants — PASS.** The no-endorsement guard is airtight: never `sameAs`/`affiliation`/`parentOrganization`/`contactPoint`/`openingHours`/pricing (ADR-0018), matching research §3.4's verified LegalPage wording. `geo` is omitted for unplaced hospices (no fabricated coordinates); no `lastmod` (determinism). `SITE_URL` enters via `data-raw/site-config.json` plus a mirror field in `src/lib/siteConfig.ts` (verified: the source file currently carries only 2 fields; arch §3.7 adds `siteUrl`) — exactly the ADR-0009 single-source pattern. The OG image is a committed placeholder asset behind human gate V2 (research R3 risk-accepted; §3.8 spec: 1200×630, `#1d4ed8`, wordmark).

**(c) Zero-ambiguity — PASS.** Exact head template, per-page title/description table, exact JSON-LD structure, exact OG set are all pinned. (The "R13/R14" citation drift in the endorsement-guard references is doc-only — F2.)

**(d) QA-testability — PASS.** Grep-able: JSON-LD present per hospice page; negative grep for endorsement property names; no `geo` on unplaced pages (currently 0 unplaced hospices / 12 unplaced NI practices — data the guard handles); canonical values exact. AC2 directly testable.

**Verdict: PASS.**

## D4 — Canonical id-is-slug URLs + `wales-r<n>` fix (ADR-0019)

**(a) Spec consistency — PASS.** Feature.md: "one static page per hospice (~161 URLs)". All 161 ids are URL-safe as-is (verified id schemes in `data/README.md`: `en-<cqcId>` e.g. `en-1-136414769`, `sc-CS<n>`, `ni-r1`–`ni-r6`; Wales will be `wales-r<n>` after the fix). The fix resolves research R8 (ADR-0002 row anchor vs the script's positional `wales-<n>`).

**(b) Standing invariants — PASS.** The fix is a one-line id-generation change in `scripts/extract-hospices-wales.mjs`; Wales hospices are 0 rows today (verified: `hospices-wales.json` = `[]` placeholder), so no shipped data changes this cycle and the byte-identity anchor set is unaffected by D4 alone. ADR-0005 untouched. The edit target line is verified present: `.map((e, i) => ({ id: \`wales-${i + 1}\`, ...e }))`.

**(c) Zero-ambiguity — PASS.** Exact one-line edit; landing chain when rows land documented in arch §4; re-baseline mandated after the first run on a present file (ADR-0003 first-run discovery applies).

**(d) QA-testability — PASS.** Future Wales rows must match `^wales-r\d+$`; today the Wales count in `hospices.json` is 0.

**Verdict: PASS.**

## D5 — Wales G3-tolerant landing, 0 ship (ADR-0020)

**(a) Spec consistency — PASS.** Feature.md AC3 disjunct B: ship with Wales = 0, neutral wording. G3 behavior verified in `scripts/extract-hospices-wales.mjs` (absent CSV → write `[]` → exit 0, no placeholder rows); the B1 CIW email draft **is** in `data/README.md` (verified section "Care Inspectorate Wales data request (item 1 / B1 — email to send)"). No fabricated rows; "Current state" already records Wales = 0. Hide-not-delete (R12/A12) preserved: data fields stay, public wording neutral, no internal gap names.

**(b) Standing invariants — PASS.** No data-schema changes; G3 tolerance is existing script behavior; no new deps; neutral wording matches the standing pattern (GLOSSARY "hide-not-delete" term, ADR-0012).

**(c) Zero-ambiguity — PASS.** Landing chain and wording **constraints** are pinned (neutral; never names an internal flag/gap). Exact copy is not pinned verbatim — acceptable: AC3 checks disjunct B (0 Wales, neutral), not the copy; residual ambiguity is stylistic only.

**(d) QA-testability — PASS.** Assert Wales hospice count = 0 in `hospices.json`; negative grep for internal gap terminology on public pages.

**Verdict: PASS.**

## D6 — Manual-pinning `data-raw/manual-geo-ni.json`, H3-2 retired (ADR-0021)

**(a) Spec consistency — PASS.** Feature.md gates NI placement on H3-2 (OS Places key). The Architect retires the key path in favor of operator-supplied manual pins — a **resolved-by-design disposition, not a silent one**: ADR-0021 documents the rationale (research R7: no key / broken-IP risk) plus the public-safety rule (never interpolate coordinates), and explicitly **retains the OS Places path as documented fallback**. Ships `entries: []`, so the shipped state is unchanged: 12 unplaced NI practices remain 12 (verified: `data/README.md` "Current state" lists the 9 BT postcodes, 11,002/11,014 assigned).

**(b) Standing invariants — PASS.** No new npm deps. **Merge point verified in `scripts/build-data.mjs`**: the `geo` Map is filled in the `postcode-geo.csv` loop, then `geoOf = (pc) => geo.get(pc.toUpperCase())`, then hospice placement (`geoOf(h.postcode)`) and practice placement (`geoOf(p.postcode)`) feed the ADR-0005 nearest-haversine assignment. Inserting `geo.set(e.postcode.toUpperCase(), { lat, lon, manual: true })` after the CSV loop is a pure input addition — the assignment logic stays byte-for-byte the same code, so ADR-0005 is preserved; uppercase keys match the existing Map convention. When entries later land, the 12 practices become placed and assignments shift — correctly covered by the re-baseline + double-build byte-identity checks (arch §9.1) and the fail-fast validation (sorted entries, UK bounds −12<lon<3, 49<lat<60). At ship time `entries: []` → zero data change → byte identity trivially holds. ADR-0009 pattern: operator-controlled raw data + mandated provenance row in `data/README.md` (that table structure exists there).

**(c) Zero-ambiguity — PASS.** Exact JSON schema (`asOf`/`source`/`entries` with `postcode`/`lat`/`lon`), exact merge snippet, fail-fast rules, retirement-then-fallback, provenance row — no open branches.

**(d) QA-testability — PASS.** Ship: file parses, `entries: []`, outputs byte-identical to the pre-change anchor set. After landings: unplaced 12 → 0 across those 9 postcodes and the re-baseline moves; fail-fast triggers on malformed entries (unsorted, out-of-bounds) are unit-testable.

**Verdict: PASS.**

## D7 — Branding "Hospice Finder UK" + heart-on-pin logo (ADR-0023, ADR-0022)

**(a) Spec consistency — PASS, with one Blocking defect (F1).** The 8-surface rename matches feature.md; identifiers (`hospice-catchment-map` package name, `hospiceinfo` slug, data ids) are explicitly untouched; ADR-0023 surface #3's wrong filename is a typo (F5). The logo is where the spec **self-contradicts the tree — F1, Blocking**.

**(b) Standing invariants — PASS (conditional on the F1 fix).** Slug `hospiceinfo` unchanged; zero new deps; `public/logo.svg` is a committed static asset **outside the `public/data/*.json` anchor set** — a one-time source edit that does not affect the data byte-identity anchors.

**(c) Zero-ambiguity — FAIL (F1).** ADR-0022 / arch §6 claim the new `public/logo.svg` was "applied by the Architect 2026-10-29; Coding must not re-apply". **Verified false:** `public/logo.svg` on disk is the **old 4-element mark** (triangle + r18 `#1d4ed8` circle + r12 `#fff` circle + blue heart, `aria-label="Hospice Info"`; `grep -c "circle"` = 2, not 1). The Architect's writable scope (`.agents/architecture.md`, `docs/adr/`, `GLOSSARY.md` only) cannot touch `public/logo.svg`, so the claim was never possible. Contrast: the analogous "already applied" claim for `GLOSSARY.md` **is** true on disk (title line `# GLOSSARY - Hospice Finder UK` + "Cycle 3 terms" section present) — confirming the logo claim is a genuine slip, not a scope convention. A coder who trusts "must not re-apply" will skip the logo work; the acceptance check (`grep -c "circle" public/logo.svg` → 1) then fails and AC4 fails.
**Required fix (Architect):** amend ADR-0022 and arch §6 to delete "applied by the Architect… must not re-apply" and state that **Coding** applies the exact SVG from arch §6 (the ADR's end-state acceptance criterion is already correct and stays).

**(d) QA-testability — PASS.** AC1 is machine-checkable: grep "Hospice Finder UK" in `dist/` titles, app header (verified: the only `src/` hit for the old name is `src/components/AppShell.tsx:33`), manifest (`public/manifest.webmanifest` — verified name field), `index.html`; negative grep "Hospice Catchment Map" → 0 hits in `src/` + `public/` + `dist/`. AC4: `grep -c "circle"` = 1, heart path present, old `aria-label` gone.

**Verdict: FAIL (F1 Blocking; everything else PASS).**

## (e) Dispositions of arch §11 open questions (Q1–Q5)

- **Q1 — `.html` extension vs feature.md's illustrative `/hospice/<id>`: ACCEPT.** Cloudflare Pages serves exact file paths with zero config; `.html` is the deterministic, collision-free choice. The page set stays machine-locked by the in-code invariant (sitemap loc count === 168), so the extension cannot drift silently.
- **Q2 — `/hospice/*` deep links land on the map: ACCEPT (documented).** R12 hide-not-delete; no AC requires in-app deep selection. ADR-0016 names in-map hospice direct selection a Cycle-4 candidate.
- **Q3 — OG placeholder ships, final image behind gate V2: ACCEPT.** AC2 only requires og:image presence per page; V2 is spec'd in arch §10 before external distribution; §3.8 pins the placeholder (1200×630, `#1d4ed8`, wordmark).
- **Q4 — `siteUrl` mirror field in `src/lib/siteConfig.ts`: ACCEPT.** ADR-0009 single source is `data-raw/site-config.json`; the TS mirror is the established pattern (verified: it already carries 2 fields). Unused in the app today, harmless.
- **Q5 — `docs/build-log.md` anchor log: ACCEPT, with the F3 caveat.** The file **must be created by Coding** (it does not exist) and its Cycle 2 line must pin the true 4-hash set `dc261185 e11322ba 2a87a374 5628d8f7` (`.agents/qa.md:31`, lead re-run 2026-10-26 20:50) — not the `038a1635…` value arch §9 cites (the uk-land SHA). Line = date + 4 SHA-256 prefixes of the build-data outputs.

## (f) Research coverage — R1–R13, OQ1–OQ10, human gates H3-1–3

| Item | Disposition | Where |
|---|---|---|
| R1 (named Blocking) | Resolved | ADR-0016 (D2) |
| R2 | Resolved — guard replace/edge semantics | arch §3.7, V1 (§10) |
| R3 | Risk-accepted — placeholder OG image | ADR-0018, §3.8, gate V2 |
| R4 | Risk-accepted — Wales 0-ship, G3 tolerant | ADR-0020, AC3-B |
| R5 | Resolved — neutral public wording | arch §4 |
| R6 | Risk-accepted — pins scoped to NI; generalization deferred, OS Places kept as documented fallback | ADR-0021 |
| R7 | Resolved — H3-2 retired with documented fallback | ADR-0021 |
| R8 | Resolved — `wales-r<n>` id scheme | ADR-0019 (D4) |
| R9 | Risk-accepted — build-time content = curation posture | arch §3.2 |
| R10 | Resolved — double-build `dist/` diff per stage; MAINTENANCE chain gap = F4 | §3.2 rule 7, §9 check 2 |
| R11 | Resolved — docs-exempt rule | arch §2 |
| R12 | Risk-accepted — `/hospice/*` → map, hide-not-delete | ADR-0016, §3.5 |
| R13 | Risk-accepted — payload ≈0.8–1 MiB vs 25 MiB budget | ADR-0015 |
| OQ1 | ADR-0016 (guard closes it) |
| OQ2 | ADR-0018 (meta/OG set) |
| OQ3 | V1 verification step |
| OQ4 | G3 tolerance — H3-1 blocks nothing at 0-ship |
| OQ5 | ADR-0019 |
| OQ6 | ADR-0021 |
| OQ7 | V-gate + arch §6 exact SVG (operator visual sign-off, non-automatable) |
| OQ8 | ADR-0023 (keep package name `hospice-catchment-map`) |
| OQ9 | ADR-0018 / ADR-0015 (omit `lastmod`) |
| OQ10 | ADR-0015 (build chain gains prerender) |
| H3-1 | Risk-accepted — human spec in feature.md + arch §10; B1 CIW draft in `data/README.md`; does not block 0-ship |
| H3-2 | Retired by design (ADR-0021), demoted to documented fallback; human spec retained |
| H3-3 | Risk-accepted — Wales authed fetch after CIW response; feature.md gate + arch §10 |

No research item is silently dropped: all 13 risks, 10 open questions, and 3 human
gates carry an explicit disposition above.

## Findings

- **F1 — Blocking.** Logo "already applied by the Architect" claim is false on disk; a coder following it skips the logo and AC4 fails. Evidence: `public/logo.svg` is the old mark (two `<circle>`s, old `aria-label`) vs the ADR-0022 / arch §6 claim. Required disposition (Architect): amend ADR-0022 + arch §6 so Coding applies the exact arch §6 SVG (fix text in D7c).
- **F2 — Risk-accepted.** Doc-only citation drift: "R13/R14" in the endorsement-guard references (research risks end at R13; the concern is unnumbered research §3.4), and arch §8 "R6 (research) — non-deterministic build" which is R10. Evidence: arch §3.4 / §8 vs research.md risk list. Disposition: renumber in the Architect fix pass. Justified — no code/behaviour impact.
- **F3 — Risk-accepted.** arch §9 mis-cites the Cycle 2 anchor `038a1635…` (it is the uk-land SHA, `data/README.md:34`); the true set is `dc261185 e11322ba 2a87a374 5628d8f7` (`.agents/qa.md:31`); and `docs/build-log.md` does not exist. Disposition: Coding creates `docs/build-log.md` with the correct anchors (Q5); Architect corrects §9. Justified — the load-bearing check is the double-build byte agreement, which is intact and machine-enforced; the anchor cite is bookkeeping.
- **F4 — Risk-accepted.** The R10 pre-push chain (`docs/MAINTENANCE.md:140`) should also run the double-build `dist/` diff; it is absent from arch §9 done-when. Disposition: one work-list line — DevOps owns `docs/MAINTENANCE.md`. Justified — per-stage double-build checks (arch §9 check 2) already guard correctness; this is a standing-guard gap, not a correctness gap.
- **F5 — Risk-accepted.** ADR-0023 surface #3 names `public/manifest.json`; the real file is `public/manifest.webmanifest`. Disposition: correct the filename in the ADR. Justified — the zero-hit grep check enforces the rename outcome regardless of the name.

## Verdict: PASS (post-fix verification round 1, 2026-10-29 — supersedes the original FAIL; see addendum below)

Open Blocking (1):
- **F1** (design-level → Architect): ADR-0022 / arch §6 claim the new `public/logo.svg` was already applied — false on disk (old 2-circle mark). Architect must amend ADR-0022 and arch §6 so Coding applies the exact arch §6 SVG; with that fix D7 passes and this review passes.

F2–F5 are Risk-accepted (justified above). D1–D6: ALL PASS. Q1–Q5: ALL ACCEPT.
R1–R13, OQ1–10, H3-1–3: all dispositioned.

## Post-fix verification (rework round 1 — 2026-10-29)

Re-verified the Architect rework pass on disk against the original FAIL verdict above (scope: `.agents/architecture.md`, `docs/adr/0022-logo-heart-on-disc.md`, `docs/adr/0023-rename-hospice-finder-uk.md`, `public/logo.svg` read-only baseline).

- **F1 (Blocking, logo applied-claim): RESOLVED.** Arch §6 (line 328) and ADR-0022 (line 18) now state that the Coding stage replaces the full contents of `public/logo.svg` with the exact SVG from arch §6; the false applied-claim is gone (0 hits for "must not re-apply" / "already applied" in both files). End-state acceptance intact (ADR-0022 line 35): `grep -c "circle" public/logo.svg` → `1` (only the background disc). Baseline: `public/logo.svg` is still the old 4-element mark (`aria-label="Hospice Info"`) — the doc fix is the fix; applying the logo is Coding's task.
- **F2 (research R-citation): VERIFIED.** Arch §3.4 (line 181) and §8 (line 369) cite "research §3.4 legal guard (unnumbered — the risk list ends at R13)"; the §8 non-deterministic-build row (line 368) references `R10 (research)`; 0 hits for "R14" in architecture.md.
- **F3 (SHA anchor set): VERIFIED.** Anchor set `dc261185 e11322ba 2a87a374 5628d8f7` appears 3× in architecture.md (invariants header line 5; §9 check 1 line 380; §11 Q5 line 415); 0 hits for `038a1635`. `docs/build-log.md` named as a Coding deliverable (lines 380, 415).
- **F5 (manifest filename): VERIFIED.** ADR-0023 surface #3 (line 22) = `public/manifest.webmanifest` (`name` and `short_name`).
- **Regression sweep: clean.** The only "already applied" claim in architecture.md is the legitimate GLOSSARY one (§7, line 360: applied 2026-10-29 — Coding reads/verifies, does not rewrite). 171-file prerender count (lines 86, 385), ADR refs 0015–0023, and the `hospices.json length + 7` sitemap invariant (line 86) are intact; D1–D6 design content unchanged in substance.
- **New findings (this round), all doc-only → Risk-accepted:**
  - **N1.** ADR-0022 geometry drift: line 8 "The current `public/logo.svg` is a 52×52 disc" and line 22 "background blue disc `r=26`" vs the on-disk 64×64 viewBox / r=18 disc (also the arch §6 canonical SVG, lines 321–343). Arch §6 is the governing deliverable and the circle-count acceptance is unaffected — no code impact.
  - **N2.** Arch §7 (line 349) says "(5 terms, …)" but the table that follows lists 6 terms (last rows lines 357–358).
  - **N3.** Arch §8 (line 370) R12 row "link surface for pallets" — "pallets" typo (prerendered); mitigation text unchanged, no behavioural impact.

**Final verdict: PASS** — F1 resolved, F2/F3/F5 verified, no regressions; N1–N3 (doc-only) carried forward as risk-accepted. Reviewer rework loop round 1 of cap 2 closed 2026-10-29.
