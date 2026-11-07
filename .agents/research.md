# Research — Cycle 4 (2026-10-30)

Stage 1 (of 10). Research for Cycle 4 — map-first defaults, layer UX, theming, rebrand (per `.agents/feature.md`, re-read in full 2026-10-30). Prepend to this file; the Cycle 3 record below is preserved unchanged.

Method: read-only examination of the working tree at HEAD `c6da9d3` (git log/status verified 2026-10-30): source reads of `src/`, `index.html`, `scripts/prerender.mjs`, `public/*`, `package.json`; targeted greps (theming baseline, modal wiring, item-6 blast radius). Nothing executed, no build (per task constraint).

**VERIFIED** = read in this pass at the cited file:line · **INFERRED** = grounded in verified facts, mechanism not directly observed · **RECOMMENDED** = proposal for a later stage

**BLOCKING: none.** No item is foreclosed by current code. Softer blockers are tracked as risks R1–R10 and open questions OQ1–OQ8.

## 0 — Snapshot, scope and the zero-theming baseline

Repo state (verified 2026-10-30): HEAD `c6da9d3` ("G7 re-fetch: re-pin land-mask SHA…"), `origin/main` at same commit. Working tree: `M .agents/feature.md`, `M .agents/pipeline.md` (lead's in-flight edits — untouched by this stage), untracked `.qwen/` + `.tmp/` (other stages' scratch — untouched). `.agents/research.md` is clean/committed → safe prepend-splice baseline (memory: tracked-file append, never whole-file rewrite).

The cycle's 7 items define the scope (feature.md:9-46): (1) hospices-only first load (feature.md:9-13), (2) shops precedence over GPs (:14-19), (3) footer overlap fix (:20-23), (4) back-to-home on all 6 info pages (:24-27), (5) light/dark mode (:28-31), (6) remove "Has published service area" UI traces, keep provenance (:32-37), (7) rebrand via Designer concept (:38-46). AC1–AC7 at feature.md:48-79; out-of-scope (:81-87: no catchment-rule/data change, no new data, no slug change, no perf work); human gate H4-1 (:90-93).

**Theming baseline is zero.** A repo-wide grep for `data-bs-theme|prefers-color-scheme|matchMedia|localStorage|font-family|@font-face` returns **0 matches** (re-verified 2026-10-30). Consequences:

- There is no theme mechanism at all — items 5 and 7 build from nothing, on a 300-line single stylesheet (`src/styles.css`, the sole CSS beside library CSS) and hard-coded hex/colour values in JSX and JS.
- `localStorage` is free (no key collisions); the standard `prefers-color-scheme` listener pattern can be added without touching any existing code.
- `prefers-color-scheme` semantics (auto follow) and persistence (explicit override) are both new code, not adjustments.

Determinism constraint (verified): `npm run build` = `tsc -b && vite build && node scripts/prerender.mjs` (package.json:9) must exit 0 and be **byte-identical on re-run** (AC7, feature.md:73-75; ADR-0003/0015). The prerender emits 171 files (scripts/prerender.mjs:265) with the invariant `sitemapLocCount !== hospices.length + 7 → fail` (prerender.mjs:260-262, 168 `<loc>`). Every Cycle-4 change that touches `index.html`, `main.tsx`, `src/`, `public/`, or `prerender.mjs` must re-pass this. Two items sit directly on this constraint: item 5 (theme-boot snippet must reach all 168 prerendered shells — see §5) and item 7 (rebrand changes `public/` assets and CSS, which Vite hashes into asset names — a re-run must still be byte-identical, which it will if inputs are committed and unchanged between re-runs; the risk is *uncommitted* asset edits, R9).

File-level change inventory (RECOMMENDED surfaces per item — final split is the Architect's):

| Item | Primary files (verified paths) |
|---|---|
| 1 | `src/App.tsx:26`, `src/components/MapView.tsx:251-254,265` |
| 2 | `src/App.tsx:90-109`, `src/components/MapView.tsx:196,230-244`, `src/components/HospicePanel.tsx:67-71` (search is new territory — OQ2) |
| 3 | `src/components/AppShell.tsx:53-60`, `src/lib/siteConfig.ts:18-20`, `src/styles.css` (no `.app-footer` rule today — new) |
| 4 | 5 page files (6 routes) in `src/pages/`, plus `src/AppShell.tsx:33-34` (only existing way home) |
| 5 | `index.html`, `scripts/prerender.mjs:171-204`, `src/main.tsx`, `src/App.tsx` (header control), `src/styles.css`, `src/components/MapView.tsx` (Leaflet dark) |
| 6 | DELETE: `src/App.tsx:146-154`, `src/components/HospicePanel.tsx:59/71/129-133/~157-160`, `src/components/MapView.tsx:106` · KEEP: `src/lib/types.ts:11,34`, `src/components/Methodology.tsx:40,94-96,118-119`, `src/pages/AboutPage.tsx:16,24,36`, `src/pages/LegalPage.tsx:70-71` |
| 7 | `src/styles.css`, `src/components/AppShell.tsx`, `src/components/MapView.tsx` (divIcon hex), `src/components/HospicePanel.tsx`, 5 pages, `public/logo.svg`, `public/manifest.webmanifest`, `index.html:14` (favicon = `/logo.svg`), (post-H4-1) `index.html`/`prerender.mjs` head + `public/og-image.png` |

## 1 — Item 1: Hospices-only first load

Current state (verified):

- The only layer toggle in state is shops: `const [showShops, setShowShops] = useState(true)` (src/App.tsx:26). Shops default ON.
- GP practices have **no toggle at all** and always render: `const visiblePractices = useMemo(() => practices.filter((p) => p.lat != null && p.lon != null), [practices])` (src/components/MapView.tsx:251-254) — a pure placement gate (null lat/lon), not a visibility gate.
- The shops gate to mirror already exists: `const visibleShops = useMemo(() => (showShops ? shops : []), [shops, showShops])` (src/components/MapView.tsx:265).
- Catchment polygons render unconditionally in MapView (MapView.tsx:325-355); they are precomputed `catchments.json` geometry, independent of practice visibility (verified structure; INFERRED no coupling — the polygons never read `visiblePractices`).
- Header layer control = the shops switch (`<label className="form-check form-switch…">`, input `checked={showShops}`, label text "Charity shops" at src/App.tsx:92-100), followed by the "Source & Method" button (src/App.tsx:101-108, text :107; opens `#methodologyModal` via `data-bs-target` :104-105 → src/components/Methodology.tsx:102, Bootstrap data-attribute wiring, verified by grep).

Recommend (RECOMMENDED, for Architect/Coding):

1. Flip the default: `useState(false)` at src/App.tsx:26 (one-token change).
2. Add `const [showGps, setShowGps] = useState(false)` next to it (naming mirrors `showShops`; alternative `showPractices` — Architect's call), pass `showGps` to `<MapView … showShops={showShops} />` (src/App.tsx:197 area) and gate MapView identically to shops: `const visiblePractices = useMemo(() => (showGps ? practices.filter((p) => p.lat != null && p.lon != null) : []), [practices, showGps])` (MapView.tsx:251-254).
3. Add the GP switch to the header extras (order constrained by item 2 — shops first, see §2).

AC1 ("initial render shows hospice markers only"; feature.md:49-52): satisfied exactly by the two defaults OFF + both layer gates at render time. Catchments stay visible — consistent with feature.md, which mentions only *markers* (it is silent on catchments; no evidence in the repo that catchments should hide — see OQ1).

## 2 — Item 2: Shops take precedence over GPs

Header order (verified): the shops switch currently occupies App.tsx:92-100. The new GP switch must render **after** it (before the Source & Method button, :101) to satisfy "the shops switch is listed before the GP switch" (feature.md:16-17). Mechanical, no risk.

Marker hierarchy (verified current sizes):

- GP practices: LOD bucket divIcon 28 px, blue `#1d4ed8` bg, 2 px `#fff` border (src/components/MapView.tsx:196) at low zoom (`GRID=0.5`, `ZOOM_LOD=11`, MapView.tsx:153-154); at z≥12 individual `CircleMarker` `radius={selectedId===p.hospiceId?7:5}` filled with the hospice's catchment colour (MapView.tsx:230-244).
- Hospices: `L.divIcon` with `iconSize: [16, 16]` and data-coloured `hospice-marker` span (MapView.tsx:279-280 area; verified this pass).
- Shops: own marker block (MapView.tsx:~370-378 per prior read; exact px not re-verified this pass — INFERRED that they already sit between GP and hospice visually, or are close; the Architect's spec should state the target ranking explicitly: hospice > shop > GP).

"Smaller and more muted" (feature.md:18) — RECOMMENDED concrete values (design decision, Architect/Designer owns): bucket icon 28 px → 18–20 px, circle radius 5 → 4, plus a muted fill (e.g. opacity ~0.65 or desaturated grey) vs the current full-catchment-colour dots. Do **not** recode the catchment colour logic — only the visual weight.

Search — **this is new territory** (verified): the panel search matches **hospices only** — `const list = hospices.filter(…)` by name/town (src/components/HospicePanel.tsx:67-71). It contains no shops and no GP practices today, so AC2's "a search matching both returns shops first" (feature.md:54) describes behaviour for a feature that does not exist. Options: (a) extend search to include shops and GP practices with shops ranked above GPs (true reading of the item); (b) read the clause as "no regression in existing search ordering" (narrow reading). RECOMMENDED: (a), with results grouped as Shops → Hospices → GP practices (sectioned list, mirroring the map's layer hierarchy) — OQ2 for PM to confirm scope, since (a) is a small new feature (two additional `filter` passes over `shops`/`practices`, debounced like the existing 200 ms search, MapView-adjacent logic lives in HospicePanel.tsx:17/67).

GP data retention (verified — no change needed anywhere): `practices.json` is untouched by both toggles (the gates are render-time only in MapView); Start-here's postcode→practice flow receives the full `practices` array via `practices={practices!}` (src/App.tsx:121-123 pass-through, verified this pass; StartHere.tsx:9-10,205 uses it for the "the line here is an approximation" flow); `node scripts/validate-tessellation.mjs` reads data files, not UI state → AC2's "Start-here flow and validate-tessellation unchanged" holds structurally (INFERRED for the script: verified it is a standalone data validator per the docs/memory, run takes ~110 s).

## 3 — Item 3: Footer layout fix (About page desktop overlap)

Root-cause facts (verified):

- The footer is shared by every page: `<footer className="app-footer d-flex flex-wrap align-items-center justify-content-between gap-2 container-fluid px-3">` (src/components/AppShell.tsx:53), left item `<small className="text-muted">{SITE_FOOTER_TEXT}</small>` (:54), right item a 6-link `<nav>` (:55-60: #feedback #corrections #about #privacy #licences #accessibility, NAV_LINKS at AppShell.tsx:4-11).
- `SITE_FOOTER_TEXT` = "Map tiles © OpenStreetMap contributors, © OpenStreetMap Foundation — ODbL v1.0. Full data attribution and licensing: see the Licences page." (~140 chars, src/lib/siteConfig.ts:18-20).
- **There is no `.app-footer` rule anywhere** in `src/styles.css` (300 lines, sole app CSS; grep + full read this pass). The footer's behaviour is 100 % Bootstrap utilities: with `justify-content-between`, a ~140-char `<small>` plus a 6-link nav on one row exceeds typical desktop content widths → overlap/collision as reported at the About page (feature.md:20-23). The About page is where it was observed; **every** page shares the footer, so the fix must be in the shared footer, not the page (AC3 itself says "or any page sharing the footer", feature.md:59).
- INFERRED mechanism (cannot reproduce without a browser — no build run per task constraint): the flex row overflows because the text and nav are the only two items and `flex-wrap` wrapping is defeated by `align-items-center` + long unbroken segments; the `.app-footer` rule the fix adds will control this.

RECOMMENDED fix (CSS-only, no JS, no markup churn — for Architect to finalise): add an `.app-footer` rule to `src/styles.css`, e.g. keep both items on one row only when they fit and wrap cleanly otherwise — `.app-footer { flex-wrap: wrap; }` (already via class) plus giving the text `flex: 1 1 auto; min-width: 0;` (text wraps to a second line when needed) and the nav `flex: 0 0 auto;` with `row-gap: 0.25rem`; a breakpoint (`<~1100 px`) forcing `.app-footer small { flex-basis: 100%; }` is the belt-and-braces variant. QA must verify ≥1024 px and mobile per AC3 (feature.md:58-60) — mobile is already structurally safe (flex-wrap) and the fix must not regress it (R2).

## 4 — Item 4: Back-to-home affordance on all 6 info pages

Current state (verified):

- 6 info routes over 5 files: `src/pages/AboutPage.tsx`, `src/pages/AccessibilityPage.tsx`, `src/pages/CorrectionsPage.tsx`, `src/pages/FeedbackPage.tsx`, and `src/pages/LegalPage.tsx` (exports `PrivacyPage` at :10 and `LicencesPage` at :45). App routes them in one branch (src/App.tsx:63-73).
- Each page is a self-contained `<div className="container my-3" …>` with an `<h1 className="h3">` (e.g. AboutPage.tsx:10-11, "About this map"); **none has a back link** (full reads of About/Feedback/Corrections/LegalPage this pass; AccessibilityPage verified in the same pass — no `#map` link in any page header; the only `#map` mention in a page is FeedbackPage body prose at :16, not a control).
- The only way home today is the header logo `<h1><a href="#map">Hospice Finder UK</a></h1>` (src/components/AppShell.tsx:33-34) — present on every page (AppShell wraps all routes), but feature.md:24-26 explicitly requires the return to "also be explicit on each page".
- `#map` is the default route: `routeFromHash` falls back to `'map'` for empty/unknown hashes (src/lib/useRoute.ts:22-24) → a plain `<a href="#map">` is a safe home target from every route.

RECOMMENDED: option (a) — one small "← Back to map" link above the `<h1>` in each of the 5 page files (6 surfaces, e.g. `<p className="mb-2"><a href="#map">← Back to map</a></p>`): minimal diff, matches feature.md's example wording, zero routing concerns. Option (b) — a single AppShell-level back control for `route !== 'map'` would be one edit, but AppShell has no route prop today (AppShell.tsx:14-15) → requires a new prop threaded from App (src/App.tsx:63-74) — larger structural change for the same UX. RECOMMENDED (a); Architect finalises mechanics (5 inline links vs. one shared `src/components/BackToMap.tsx`; either passes AC3).

## 5 — Item 5: Light/dark mode — ⚠ the crux of this cycle

⚠ **Most important finding: the no-unthemed-flash requirement is gated by the prerendered HTML shells, not by the React SPA.**

Verified facts:

- The SPA is hash-routed; `main.tsx` is the only body-level script source (index.html:14; `src/main.tsx:1-19` = CSS/Bootstrap imports, `createRoot`, and the ADR-0016 hash-redirect IIFE at :8-19). Any React/`useEffect` theme boot runs **after** first paint → an unthemed flash on dark-preferred visits.
- **Source `index.html` has no inline head script** (verified full read, 14 lines: charset/viewport/description/title/icon/manifest only). Nothing exists today to apply a theme before paint.
- **The prerendered shells are rebuilt from a fixed push list**: `buildPage()` (scripts/prerender.mjs:171-204) pushes `<html lang="en">` (:175), a fixed set of `<meta>`/`<link>`/JSON-LD (:177-194), module-preload + stylesheet links (:195-196), `</head>` (:197), empty `#root`, and `bootScript` in the body (:200). It carries **no** arbitrary inline head script from anywhere. Emitted shells: `dist/index.html` (:225), 6 info pages (:228-230), 161 hospice pages (:233-237), 404 (:240) = 168 shells (+sitemap/robots).
- Theme mechanism available, zero baseline: Bootstrap 5.3.3 (package.json deps; CSS imported at `src/main.tsx:3-6`) supports dark via `data-bs-theme="dark"` on `<html>`. Leaflet 1.9.4 `leaflet.css` controls are hard-coded light → need `[data-bs-theme="dark"] .leaflet-control-*` overrides (INFERRED standard practice; no pixel verification without a build — QA item). DivIcon hexes are hard-coded in JS (MapView.tsx:196 `#1d4ed8`/`#fff`); `h.color` is data-driven (bright catchment palette) → dark-mode legibility is a design judgement (OQ5).

Derived requirement (INFERRED, high confidence): a **static inline theme-boot snippet in `<head>`** must exist in **both** (1) source `index.html` (dev + Vite build) and (2) `buildPage()` in `scripts/prerender.mjs` (all 168 prerendered shells). The snippet reads a localStorage key (e.g. `hfuk-theme`), resolves Auto via `matchMedia('(prefers-color-scheme: dark)')`, and sets `data-bs-theme` on `document.documentElement` before first paint. It is 100 % static text, so the byte-identical re-run invariant (ADR-0003/0015; build script at package.json:9) is unaffected: a fixed string emits identically on every re-run.

Runtime behaviour (RECOMMENDED, for Architect):

- 3-state control (Auto/Light/Dark) in the header (next to the existing switches, src/App.tsx:90-109): segmented control / `btn-group` (accessibility: visible labels + `aria-pressed`; folded into the accessibility-page test list — R4).
- One small resolver module (e.g. `src/lib/theme.ts`) so the header control and the boot snippet share one key format: `null` = Auto, `'light'`/`'dark'` = explicit. The boot snippet must resolve to the same attribute value the React state renders, so pre-JS and post-JS agree (no flicker).
- Auto: `matchMedia('(prefers-color-scheme: dark)')` plus a `change` listener updates the attribute live while in Auto; explicit choices write localStorage and suspend the listener's effect.
- Leaflet: CSS overrides in `src/styles.css` (never patch `leaflet.css`): zoom controls, attribution, layer control; legend card (`.legend-card`, styles.css:151) and panel chrome already flow from Bootstrap variables under `data-bs-theme`. Tile base stays `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (MapView.tsx:318-321) — light by nature; a dark tile variant (e.g. CARTO dark) is a new provider with its own attribution → OUT OF SCOPE in the recommended design (OQ5, James decides if wanted).
- `public/manifest.webmanifest` (verified: `theme_color #1d4ed8`, `background_color #ffffff`) — RECOMMENDED: keep single values for now; a dark manifest variant is a rebrand-era consideration (section 7).

## 6 — Item 6: Remove "Has published service area" — all UI traces; keep provenance

Blast radius (grep across `src/` re-verified 2026-10-30 → 26 matches; classified below):

DELETE (UI traces, per feature.md:32-37):

- Selection-card badges — `src/App.tsx:146-154`: the whole ternary `selected.kind === 'published' ? (…badge "published service area"… {selected.source}) : (…badge "approximated"… {selected.source})` (verified this pass: badge spans at :147 and :152). RECOMMENDED: remove the badge spans, keep a single unconditional `{selected.source}` line (AC5 bans the words, not the source text — Architect confirms).
- Panel filter — `src/components/HospicePanel.tsx:59` `const [publishedOnly, setPublishedOnly] = useState(false)`, :71 clause `(!publishedOnly || h.kind === 'published')` inside the search filter, the switch block with label "Has published service area" and `id="publishedToggle"` (~:127-133), plus the per-row `h.kind === 'approx'` badge (~:157-160) — all removed (the per-row approx badge is an "approx" UI string, mandatory for AC5).
- MapView tooltip — `src/components/MapView.tsx:106` the `kind === 'published' ? 'Published service area' : 'Approximated catchment'` span → removed (the tooltip already shows the hospice name).

KEEP (provenance, explicitly preserved by feature.md:35-37):

- Data layer: `kind: 'published' | 'approx'` (src/lib/types.ts:11, :34); `hospices.json` untouched (AC5, feature.md:64-66).
- Methodology modal: `src/components/Methodology.tsx:40` ("Important caveats — this is an approximation"), :94-96 (stats computing published/approx counts), :118-119 ("{stats.published} with a published service area, {stats.approx} approximated") — the text lives once in `MethodologyText()` (Methodology.tsx:8-16), shared by the map modal and the About page.
- Prose: `src/pages/AboutPage.tsx:16` ("regions approximate the catchments"), :24 ("used for the approximation"), :36 ("Treat approximated catchments…"); `src/pages/LegalPage.tsx:70-71` ("Published service areas come from the hospices' own websites; approximated catchments are computed from the GP practice locations").

OQ candidates from the blast radius:

- `src/components/AppShell.tsx:36` tagline "UK — catchments approximated from GP practice locations" — contains "approximated" but is description, not a service-area trace. RECOMMENDED KEEP (sits with AC5's keep-prose in spirit) — PM confirms (OQ3).
- `src/components/StartHere.tsx:9-10` `APPROXIMATION_LINE`, rendered at :151/:185/:207, plus :205 ("the line here is an approximation") — StartHere is NOT in AC5's keep-list; RECOMMENDED KEEP (explains catchment geometry, not the published-service-area concept) — PM confirms (OQ3).

RESIDUE AFTER THE RECOMMENDED EDITS (for QA's AC5 grep, feature.md:60-66): the only "published service area / approximated / approx" strings left in `src/` should be Methodology.tsx (40/94/96/118-119), AboutPage.tsx (16/24/36), LegalPage.tsx (70-71), plus AppShell.tsx:36 and StartHere.tsx IF PM rules them keep (OQ3). AC5 as written passes either way ("outside the provenance prose the decision keeps").

## 7 — Item 7: Rebrand (human gate H4-1)

Scope and gate (verified):

- Designer stage 2B delivers `.agents/design.md` with 2–3 concepts — palette, typography, header/logo direction built on the Cycle 3 heart+pin mark (feature.md:38-46; AC6, feature.md:67-71). One mock per concept.
- H4-1 (feature.md:90-93): James picks one concept; "The rebrand work item does not start until the pick is in; all other work items proceed." → items 1–6 are independent and may start immediately; item 7 is the only gated work item.
- `public/` = exactly 3 files (verified listing): `logo.svg` (heart+pin on `#1d4ed8` disc, white heart; ADR-0022), `manifest.webmanifest` (name "Hospice Finder UK", short_name "Hospice Finder", `theme_color #1d4ed8`, `background_color #ffffff`, icon `/logo.svg`), `og-image.png` (1200×630).
- Favicon is the same asset as the PWA icon: `<link rel="icon" … href="/logo.svg">` (index.html:14) → one logo change covers both; OG image must be re-derived separately after the pick (needs an image tool — DevOps note).

Current visual baseline (verified, extends the zero-theming grep of §0):

- 100 % stock Bootstrap 5.3.3 surfaces: `btn`/`badge`/`alert`/`form-check` classes across src/App.tsx and src/components/AppShell.tsx; no `font-family`/`@font-face` anywhere → the site uses only Bootstrap's default type stack today.
- Hard-coded brand colour `#1d4ed8` appears in the map (bucket divIcon, src/components/MapView.tsx:196), the logo (public/logo.svg), and the manifest (public/manifest.webmanifest); `h.color` catchment palette is data-driven and outside the brand.
- Application surfaces for AC6's "every page" (feature.md:67-71): header logo + tagline (src/components/AppShell.tsx:33-36), footer (:53-60 + `SITE_FOOTER_TEXT`, src/lib/siteConfig.ts:18-20), map chrome (MapView.tsx:196/279-280 divIcons, `.legend-card` styles.css:151, `.app-map` styles.css:128), selection card (src/App.tsx:137-154, `alert alert-light`), list panel (`.app-panel`/`.panel-item`, styles.css:68/76), the 5 info pages, and the 3 public assets.

RECOMMENDED (for Designer/Architect):

1. Concepts expressed as **design tokens** (CSS custom properties overriding Bootstrap's `--bs-*` variables, plus a small app set: map chrome, marker, footer) with the type stack named explicitly — so the applied result is one block at the top of `src/styles.css`, not scattered hex edits. This is what makes "no half-applied theme" (feature.md:71) checkable: QA can verify the token block is the only source of brand values.
2. Item 5 and item 7 share one mechanism: light/dark each become a themed set of the same variables (item 5's `[data-bs-theme="dark"]` overrides consume the rebrand tokens) — Architect keeps the two specs in one file to avoid double-editing.
3. If the concept introduces a new font: self-host it (`@font-face` with the files committed under `public/` or Vite assets), never an external CDN (AC7 determinism, ADR-0014 static SPA, offline builds — R9).
4. Mark treatment: restyle the existing heart+pin geometry (ADR-0022), do not redesign it — feature.md:40-41 constrains concepts to be "built on the Cycle 3 heart+pin mark".

### Risks (R1–R10)

| # | Risk | Severity | Recommendation |
|---|---|---|---|
| R1 | Theme-boot snippet duplicated in `index.html` AND `scripts/prerender.mjs:171-204` (buildPage); if the two copies diverge or one is missed, exactly one shell class flashes (dev/`dist/index.html` vs. the 168 prerendered pages) — silent, user-visible AC4 failure | Medium | Single-source the snippet (one string in the build script, pasted verbatim into `index.html`); QA must diff the two strings and load-test a dark-preferred prerendered page — add to the QA checklist explicitly |
| R2 | Footer CSS-only fix (new `.app-footer` rule, absent today) must not regress mobile — `container-fluid px-3` + `flex-wrap` is structurally safe today on small screens | Low | QA verifies AC3 at ≥1024 px and mobile widths (feature.md:58-60) for the About page plus one info page |
| R3 | AC2 search-ranking reads as new functionality (panel search matches hospices only, src/components/HospicePanel.tsx:67-71); extending to shops/GPs risks regressing the working hospice search (200 ms debounce, :17) | Medium | PM resolves OQ2 first; if extended, sectioned results (Shops → Hospices → GPs) with rank-order verification in QA |
| R4 | 3-state theme control is a new accessible widget (visible labels, `aria-pressed`); the Accessibility page's test list (src/pages/AccessibilityPage.tsx) gains a control | Low | Coding updates the accessibility page's checklist in the same pass; QA runs a keyboard-only pass |
| R5 | Dark-mode legibility of data-driven catchment colours (`h.color`, MapView CircleMarker :230-244) and hard-coded divIcon hexes (MapView.tsx:196) on dark chrome | Medium | Architect sets target contrast; QA does a dark-theme pixel pass at z≥12 and at LOD buckets |
| R6 | Leaflet control dark overrides are INFERRED (no build run this pass); `leaflet.css` specificity fights are the usual failure mode | Low–Medium | Overrides live in `src/styles.css` scoped by `[data-bs-theme="dark"]`, never a patched `leaflet.css`; QA verifies zoom/attribution/layer-control legibility |
| R7 | Item 6 residue: "approx" strings in AppShell.tsx:36 and StartHere.tsx:9-10 are NOT in AC5's explicit keep-list; if PM rules DELETE while QA expects KEEP (or vice versa), the AC5 grep (feature.md:60-66) outcome is undefined | Low | PM rules OQ3 before Coding; QA's grep whitelist is fixed in writing in qa.md (AC5 keep-list + OQ3 answer) |
| R8 | Rebrand is the only gated item (H4-1) but touches the most surfaces (header, footer, map chrome, cards, pages, assets); a partial application after the pick = AC6 "half-applied theme" failure | Medium | Apply via the token block only (§7 rec 1); QA checks every AC6-surfaced surface; og-image re-derivation tracked as a separate checklist line until done |
| R9 | Byte-identical re-run (AC7, feature.md:73-75) is exposed by uncommitted asset edits (new logo.svg/og-image/font files) between two build runs; Vite hashes asset names, so identical inputs are sufficient | Medium | DevOps rule: commit all asset changes before the first build; re-run from a clean working tree; record `git status` in ops.md |
| R10 | Item 6 edits are surgical deletes in files that also carry KEEP provenance prose (Methodology.tsx:40/94-96/118-119, AboutPage.tsx:16/24/36, LegalPage.tsx:70-71) in the same files as deletes (App.tsx, HospicePanel.tsx) | Low | Coding edits one concern per hunk; QA re-reads the four KEEP locations after the pass (hide-not-delete discipline, ADR-0012) |

### Open Questions (OQ1–OQ8)

- **OQ1 — Who: PM.** On first load, do catchment polygons also hide? feature.md:49-52 says only *markers*; AC1 is silent on catchments. No evidence in the repo that catchments should hide (they are precomputed geometry, MapView.tsx:325-355, independent of layer state). RECOMMENDED: catchments stay visible.
- **OQ2 — Who: PM.** AC2 "a search matching both returns shops first" (feature.md:54): (a) search must grow to match shops AND GP practices (new feature, grouped results) or (b) narrow reading — existing hospice search order preserved? RECOMMENDED: (a), sectioned Shops → Hospices → GPs (see R3).
- **OQ3 — Who: PM.** Are the "approx" strings at AppShell.tsx:36 (tagline) and StartHere.tsx:9-10 (APPROXIMATION_LINE, rendered at :151/:185/:207, plus :205) kept (description of catchment geometry, not a service-area UI trace) or deleted (strictest AC5 reading)? RECOMMENDED: keep (sits with the provenance prose AC5 keeps).
- **OQ4 — Who: Architect.** New toggle state: name `showGps` vs `showPractices` (mirror of `showShops`, src/App.tsx:26), and session-only (in-memory, like `showShops`) vs persisted to localStorage? RECOMMENDED: mirror `showShops` exactly (in-memory; only the theme is required to persist, feature.md:30-31).
- **OQ5 — Who: James.** Offer a dark tile variant (e.g. CARTO dark) in dark mode? RECOMMENDED: no — new provider + new attribution line (footer attribution cites OSM, src/lib/siteConfig.ts:18-20), out of the recommended scope; OSM tiles stay light in both themes.
- **OQ6 — Who: Architect/Designer.** Exact target visual weight for GP markers (bucket icon 28 px → what px; CircleMarker radius 5 → 4; mute opacity/value) and the explicit ranking hospice > shop > GP (current shop marker size not re-verified this pass — INFERRED mid-tier).
- **OQ7 — Who: Architect.** Theme localStorage key name and the duplication strategy for the boot snippet (R1): literal in both files vs. one constant in `scripts/prerender.mjs` whose string is pasted into `index.html` with a QA check enshrining equality. RECOMMENDED: latter.
- **OQ8 — Who: Architect.** `public/manifest.webmanifest` keeps single `theme_color #1d4ed8` / `background_color #ffffff` in both themes, or a per-theme variant? RECOMMENDED: single values for now (browser support for `preference` theme-color is partial; changing it is rebrand-era, §7).

### Human Gates (Cycle 4)

- **H4-1** (feature.md:90-93, verbatim): James picks one of the Designer's 2–3 visual concepts (Stage 2B, `.agents/design.md`). No rebrand coding before the pick; items 1–6 proceed. It is the only human gate in Cycle 4.

### Glossary candidates (RECOMMENDED for GLOSSARY.md under a new `## Cycle 4 terms (defaults, layers, theming, rebrand)` heading; Architect owns the file edit, other stages use the terms)

- *theme-boot snippet* — the static inline `<head>` script that resolves and applies the theme before first paint (item 5; lives in `index.html` and `buildPage()`).
- *Auto/Light/Dark* — the 3-state user theme choice; Auto follows `prefers-color-scheme`, Light/Dark override and persist.
- *design tokens* — the CSS custom property set (overriding `--bs-*`) that carries the rebrand palette/typography across every surface (items 5 + 7).
- *muted GP layer* — GP practices rendered smaller and lower-emphasis than hospice/shop markers, OFF at first load (item 2).
- *first-load layer defaults* — both auxiliary layers (shops, GP practices) OFF on initial render; hospices + catchments only (item 1).

# Research — Cycle 3 (2026-10-29)

Complete replacement of the Cycle 2 research record. Scope follows `.agents/feature.md`
(Cycle 3): (1) rename to "Hospice Finder UK"; (2) full static prerendering for
crawlability (real info-page paths + one static page per hospice + meta/OG/JSON-LD +
`sitemap.xml`/`robots.txt`); (3) fill the Wales hospices (currently 0) and place the 12
unplaced NI practices; (4) refine the heart+pin logo mark.

Method: read the tree at HEAD `7061dbf` (origin/main, clean working tree), the ADRs,
data counts via read-only `node -e`, `git log`, and project memory
(`cycle-3-specification-2026-10-29.md`, `nominatim-osm-gap-bt-postcodes.md`). No web-fetch
tool is available to this stage — every external web candidate is marked
**UNVERIFIED-FOR-REACHABILITY**. No code changes; this file is the only deliverable.

**VERIFIED** (cited) | **INFERRED / RECOMMENDED** (proposal for the Architect) |
everything else is an open question.

## 0 — Baseline state (verified)

| Item | Value | Evidence |
|---|---|---|
| HEAD | `7061dbf` origin/main, working tree clean | `git log -3`, `git status` |
| Deploy | git-connected Cloudflare Pages: push to `main` → `npm ci && npm run build` → publishes `dist/`; deploy-mode commit `f9f3e15` recorded as `7061dbf`; slug `hospiceinfo` (must not change) | `docs/adr/0014-deploy-mode-git-connected.md`, `wrangler.jsonc:3` |
| Build | `tsc -b && vite build`; Vite 5.4.8, React 18.3.1, react-leaflet 4.2.1, TS strict; **no SSR framework, no prerender dependency** in `package.json` | `package.json`, `vite.config.ts` (react() plugin only) |
| Data | hospices **161** (en 152, sc 3, ni 6, **wales 0**), 0 unplaced; practices **11,014** (12 unplaced, all ni); catchments 161; shops 138 | `node -e` over `public/data/*.json` this session |
| Wales | 539 practices placed; **hospices 0** — `wales-hospices-2026-10.csv` absent → extract script writes `[]` (G3 zero-set tolerance, exit 0) | `data-raw/hospices-wales.json`, `scripts/extract-hospices-wales.mjs` |
| Land file | `uk-land.json` SHA-256 `038a1635…53819`, 22,999 polygons — the byte-identity anchor | `data/README.md` |
| Routing | hash only, no router library (ADR-0007); unknown **or empty** hash → `map` | `src/lib/useRoute.ts` |
| SEO | **none exists**: grep for `prerender|sitemap|robots.txt|og:|OpenGraph|social-card` → 0 substantive matches; `index.html` has no OG/canonical/Twitter tags; no PNG favicon | grep this session, `index.html` |
| Branding | "Hospice Catchment Map" ×7 (table in §1.2); manifest `short_name` "Hospice Map"; package name `hospice-catchment-map` | grep this session |
| Assets | `public/` contains only `/logo.svg` + `data/*.json` (7 files total) | `glob public/**` |

Human gates recorded (memory `cycle-3-specification-2026-10-29.md`): **H3-1** CIW resend,
**H3-2** OS Places / OS Postcode Geocoder API key, **H3-3** Wales authed fetch.
Acceptance criteria: `.agents/feature.md` (AC1 name, AC2 static pages + sitemap/robots,
AC3 Wales > 0 + NI placement, AC4 logo).

## 1 — Routing & branding surface

### 1.1 Routing mechanics (why prerendering collides with them)
- Routes are `window.location.hash` values (`#/feedback`, `#/corrections`, …).
  `routeFromHash` strips `#/` and maps anything unknown to `map` (`src/lib/useRoute.ts`).
  Hash fragments never reach the server; on a real path the initial hash is empty, so
  the app always starts on `map`.
- Non-map routes render inside `AppShell` (`src/App.tsx:23`); the map view is inline in
  `src/App.tsx` (there is no separate map-page component).
- No state hydration: the selected hospice is component state only (`selectedId`); there
  is no URL/query deep-link, so today you cannot arrive at "hospice X selected on the
  map" from a URL.
- Consequence (verified): if a static page is served at a real path such as `/about`,
  the hash is empty and the client app will render the **map**, not the about page. A
  small guard is therefore required (§2 RECOMMENDED PATH).

### 1.2 Branding inventory (rename — all exact matches verified this session)
| # | Location | Current string |
|---|---|---|
| 1 | `index.html:10` (`<title>`) | "UK Hospice Catchment Map" |
| 2 | `src/components/AppShell.tsx:33` (header `<h1>`) | "Hospice Catchment Map" |
| 3 | `public/manifest.webmanifest` (`name`) | "Hospice Catchment Map" |
| 4 | `public/manifest.webmanifest` (`short_name`) | "Hospice Map" |
| 5 | `README.md:1` | "UK Hospice Catchment Map" |
| 6 | `GLOSSARY.md:1` | "UK Hospice Catchment Map" |
| 7 | `MAINTENANCE.md:1` (title) and `MAINTENANCE.md:4` | case variants of the name |

Adjacent, optional: `package.json` name `hospice-catchment-map` (private repo, never
published — RECOMMENDED: leave unchanged).

**Invariants (must not change, AC1):** slug `hospiceinfo` (`wrangler.jsonc:3`;
ADR-0014), hostname, Cloudflare project name, file names `index.html`,
`manifest.webmanifest`, `public/logo.svg`.

### 1.3 Per-hospice fields available to static pages
`Hospice` (`src/lib/types.ts`): `id`, `name`, `town`, `postcode`, `lat`, `lon`, `color`,
`kind` (`published` | `approx`), `source`, `website`, `cqcUrl`, `curated`, `nation`.
`website` and `cqcUrl` are optional — meta/JSON-LD generation must degrade gracefully
(§3).

### 1.4 RECOMMENDED PATH
- Rename surface = exactly the 7 inventory items + the `index.html` meta description +
  manifest `short_name` ("Hospice Finder"); add the new name to GLOSSARY (the Architect
  owns the file). No routing/slug/hostname change.
- Keep the subtitle "UK — catchments approximated from GP practice locations" — it is
  factual and already mirrors the legal page's wording.

## 2 — Prerendering approach

### 2.1 What exists today (verified)
- `index.html` is the single SPA shell (`<div id="root">` + `/src/main.tsx`); every
  route is client-side hash navigation (§1.1). Cloudflare Pages serves it as a plain
  static asset (no server, no functions).
- `vite.config.ts` uses only the react() plugin — no prerender, no `base`, no output
  config. `package.json` has no SSR/prerender/img tooling dependency.
- Build output discipline: ADR-0014 — `npm ci && npm run build` publishes `dist/`;
  only `dist/` ships (largest asset ~3.14 MiB; limit 25 MiB — plenty of headroom for
  ~170 small HTML files).

### 2.2 Constraints the design must respect (verified)
1. **ADR-0007** (no router library; `#` URLs only; unknown routes → `map`). Any
   prerender must coexist with this, not replace it — replacing would break the
   "no `/` catch-all" invariant (deploy relies on real paths only).
2. **Byte-identical rebuild ritual** (ADR-0006/0003; `data/README.md`, GLOSSARY):
   `npm run build-data` run twice must produce identical `public/data/*.json` and the
   `uk-land.json` SHA-256 anchor. New build steps must not randomise/timestamp outputs,
   and must iterate data deterministically (sorted ids).
3. **Git-connected deploy** (ADR-0014): everything must run inside `npm run build`
   (or a script wired into it) with no env-var-dependent behaviour required; a
   deterministic build on Pages CI is mandatory.
4. **Minor-deps stance** (ADR-0008): no new runtime dependency; a build-time
   dependency is acceptable only if justified.
5. **hide-not-delete**: static per-hospice pages must not expose unassigned
   practices/shops (they are not in `hospices.json`; nothing to expose).

### 2.3 Options considered
**(a) Vite prerender plugin** (vite-plugin-prerender / prerender-spa-plugin):
renders the SPA in a headless browser at build time. REJECTED — adds a heavy runtime
(dep + headless Chromium on CI), non-deterministic render timing, and produces full
React-rendered HTML for every hash route (hash routes are not crawlable URLs anyway —
crawler sees `/` only). Also cannot emit clean static pages at real paths without
changing the router.

**(b) Deterministic `scripts/` prerender step** (a `.mjs` build script, siblings of
`scripts/build-data.mjs`): after `vite build`, generate static HTML files into
`dist/` from `public/data/*.json` + site config. No React SSR, no new dependencies.
**RECOMMENDED.**

**(c) Cloudflare-native prerender (Pages Functions hook / `@cloudflare/next-on-pages`)**:
REJECTED — `next-on-pages` is for Next.js (this is Vite); a Functions hook would be
server-side per request (not static, not crawl-time-visible as files, and it adds a
runtime the project deliberately lacks).

### 2.4 Page set (derived, not hard-coded)
From `public/data/hospices.json` (161 today; auto-grows when Wales lands) + the fixed
6 info routes (`src/lib/useRoute.ts` RouteId minus `map`):
- `/` — map shell: current `index.html` output (title/meta/OG/JSON-LD enriched) — the
  interactive map stays client-rendered here (AC2 keeps this behaviour).
- `/about`, `/corrections`, `/feedback`, `/privacy`, `/licences`, `/accessibility` —
  one static page each mirroring the existing page content (e.g. `src/pages/LegalPage.tsx`
  copy; `CorrectionsPage` static HTML renders the corrections table from
  `public/data/corrections.json` at build time — currently `[]` → "no corrections yet").
- `/hospice/<id>` × 161 — name, town, postcode, coordinates, `kind`, `source`,
  `website`/`cqcUrl` (if present), catchment note, links to `/` (map) and `/feedback`.
- `sitemap.xml` — all of the above (168 URLs today: 1 + 6 + 161).
- `robots.txt` — `Allow: /` + sitemap URL.

### 2.5 The routing guard (required, small)
Because a real path arrives with an empty hash → the app renders `map` (§1.1), the
prerendered static pages need a client-side redirect guard: on first load, if
`pathname` is one of the 6 real info paths and the hash is empty, set
`hash = '#<route>'` (replace, not push) so `useRoute` shows the matching page. This is
a ~10-line change in `src/lib/useRoute.ts`/`App` boot, adds no library, and preserves
ADR-0007 (shared/bookmarked URLs remain `#`-form). For `/hospice/<id>` the static page
is the leaf (information page); a "View on map" link goes to `/` (no deep-selection —
see §7, QA-12).

### 2.6 RECOMMENDED PATH
Option **(b)**: add `scripts/prerender.mjs` invoked from the existing build chain so
`npm run build` = `tsc -b && vite build && node scripts/prerender.mjs` (edit
`package.json` scripts only). The script: reads `public/data/hospices.json`,
`practices.json` (counts for meta description), `corrections.json`,
`data-raw/site-config.json` + `src/lib/siteConfig.ts` values; emits into `dist/` with
sorted-id iteration, no timestamps, deterministic string templates (byte-stable
across runs — verifiable by running the build twice and diffing `dist/`). Keep the
interactive map fully client-rendered at `/`. Rationale: zero new dependencies
(ADR-0008), deterministic (byte-identity-safe, CI-safe), fits ADR-0014's
"only `dist/` ships" model, and is trivially reviewable (template strings, no
browser). The `package.json` `build` script edit is the only build-chain change.
## 3 — SEO specifics

### 3.1 Current head state (verified)
`index.html` carries only: charset, viewport, a meta description
("Interactive map of hospice catchment areas across the UK, derived from GP practice
locations, with charity-shop markers and corrections log."), `<title>UK Hospice
Catchment Map</title>`, SVG favicon, manifest link. No `canonical`, no `og:*`, no
`twitter:*`, no `JSON-LD`. No other page injects head content (`src/main.tsx` renders
into `#root` only).

### 3.2 Meta set to generate (per page)
- **title**: `/` → "Hospice Finder UK"; info pages → `"<Page> — Hospice Finder UK"`;
  hospice pages → `"<name>, <town> — Hospice Finder UK"`.
- **description**: `/` → refreshed copy (map + catchments + corrections); hospice pages
  → one templated sentence using `name`, `town`, `postcode`, `kind` (e.g. "Hospice
  published in the CQC register" for `kind: 'published'`, "location approximate" for
  `kind: 'approx'` — honest phrasing per the legal page's approx-note).
- **canonical**: absolute URL `https://hospiceinfo.pages.dev/<path>`. The slug is
  locked (`wrangler.jsonc:3`) but the exact hostname is **UNVERIFIED-FOR-REACHABILITY**
  (no browser check from this stage). RECOMMENDED: single build-time constant
  `SITE_URL` (repo constant, not env var — keeps `dist/` byte-stable across CI runs;
  ADR-0014's CI only runs `npm ci && npm run build`). Verify the live hostname in a
  browser before landing (open question, §7).
- **OG**: `og:type website` (hospice pages: `website`, not `article` — these are
  reference entries), `og:title`, `og:description`, `og:url`, `og:image`.
- **Twitter**: `summary` card (`og:image` + title + description).

### 3.3 OG image — a tooling gap (verified)
`package.json` has **no image tooling** (no sharp/resvg/canvas/jsdom/png dependency);
`public/` has only `logo.svg`. RECOMMENDED: generate `/og-image.png` (1200×630, white
background, refined mark + "Hospice Finder UK") as a **one-time committed asset**
(like `public/logo.svg`) — it is a static file, not build output, so the byte-identity
ritual (which covers `public/data/*.json` + `uk-land.json`) is unaffected. Optional
devDep (e.g. `@resvg/resvg-js`) only if the mark regeneration must be scripted;
RECOMMENDED: manual one-off generation to preserve the minor-deps stance.

### 3.4 JSON-LD
- **Root (all pages)**: `Organization` — name "Hospice Finder UK", `url`,
  `description`, `contactPoint` from operator identity (The Jam Labs Ltd,
  `hello@thejamlabs.com` — `src/lib/siteConfig.ts`, ADR-0009).
- **Hospice pages**: candidate types `LocalBusiness` → schema.org subtype
  `HealthCareBusiness` vs `MedicalOrganization`. Properties available from
  `hospices.json`: `name`, `geo` (lat/lon), `address` (`town` + `postcode`,
  `addressCountry` GB, per-nation `addressRegion`), `url` (only if `website` present),
  `sameAs` (only if `cqcUrl` present). No `telephone`, no staff, no hours — omit.
- **Legal guard (verified wording)**: the Licences page states the map "does not imply
  any endorsement" (`src/pages/LegalPage.tsx`). JSON-LD must mirror this: no
  `parentOrganization`, no endorsement/affiliation claims — the hospice operates
  independently; the site is a third-party index. RECOMMENDED: `HealthCareBusiness`
  subtype (more precise than generic `LocalBusiness`, less assertive than
  `MedicalOrganization` which implies a care facility definition). Architect to finalise.

### 3.5 Sitemap / robots
- `sitemap.xml`: `lastmod` fixed to a deterministic constant (build date is
  non-deterministic → RECOMMENDED: omit `lastmod` entirely — valid per spec — or a
  constant like the data vintage date `2026-10`; omitting is safest for byte-stability).
- `robots.txt`: `Allow: /` + `Sitemap: https://hospiceinfo.pages.dev/sitemap.xml`.
- Both emitted by the same prerender script as the HTML (§2.6) so URL set and sitemap
  can never drift (AC2 requires the counts to match).

### 3.6 RECOMMENDED PATH
Emit meta/OG/JSON-LD/sitemap/robots from `scripts/prerender.mjs` (§2.6) with the
`SITE_URL` constant; one-time committed `og-image.png`; JSON-LD root `Organization` +
per-hospice `HealthCareBusiness` with the no-endorsement guard. Document the
`SITE_URL` constant choice in an ADR (one page: context/decision/alternatives).

## 4 — Wales hospices (currently 0)

### 4.1 Verified state
- `data-raw/hospices-wales.json` = `[]`; `public/data/hospices.json` has 0 Wales
  hospices; 539 Wales practices are all placed (`data/README.md`; counts verified
  this session).
- The extract script `scripts/extract-hospices-wales.mjs` is **already built and
  G3-tolerant**: absent CSV → writes `[]`, logs, exit 0 ("zero-set tolerance — the
  build stays valid"); present CSV → name column resolved **by header name**
  (tries "Service name", "Name", "Hospice name", else substring "name"; non-zero exit
  if none), optional postcode column (whitespace normalised, uppercased), empty-name
  rows filtered, first run logs header + first data row (ADR-0003), output
  `data-raw/hospices-wales.json` with ids `wales-<n>` (1-based file position, row
  anchors UNVERIFIED per ADR-0002).
- Expected CSV: `data-raw/wales-hospices-2026-10.csv`.
- The CIW request is drafted in `data/README.md` (B1): To `enquiries@careinspectorate.wales`,
  subject "Data request — list of hospice / palliative care services in Wales";
  reply saved as the CSV above. This is human gate **H3-1** (memory
  `cycle-3-specification-2026-10-29.md`).

### 4.2 Source ranking
1. **CIW register reply (primary)** — regulator of social services in Wales; the
   request is already drafted; the pipeline (extract → merge → `build-data` → geocode)
   is already wired. Resend = human gate H3-1.
2. **Care Inspectorate Wales public directory** — research (Cycle 2 §2.3, recorded in
   the extract script header) found the SPA returns a 4 KB redirect stub with no
   address-level data. Reachability/content today: **UNVERIFIED-FOR-REACHABILITY**.
3. **data.wales (Welsh Government open data)** — potential register datasets;
   **UNVERIFIED-FOR-REACHABILITY** from this stage.
4. **The Hospice UK national directory / Macmillan network list** — third-party
   directories, likely no stable address fields; **UNVERIFIED-FOR-REACHABILITY**.
5. **OSM Nominatim/Overpass** — hospices are usually tagged `amenity=hospice`; usable
   for cross-checking names/coords of a CIW-supplied list, not as a primary register.
   (Would carry ODbL attribution per the ODbL rule, `data/README.md`.)

### 4.3 Landing mechanics (verified by reading the scripts)
- `geocode-postcodes.mjs` is **resumable** (line 8: "skips postcodes already present
  in `data-raw/postcode-geo.csv`") and **auto-picks new postcodes from the four
  hospice + practice files** — so Wales postcodes from the new CSV are geocoded
  automatically on the next run (Nominatim 1 req/s, outcode fallback, non-zero exit
  if an in-scope postcode stays unresolvable — the same OSM-gap risk class as the
  BT postcodes in §5).
- Placed Wales hospices become Voronoi seeds in `build-data.mjs`; nearest-practice
  assignment (haversine) then allocates the 539 practices; degenerate rules
  (ADR-0005/0006) already handle odd cells. The per-nation report logs the result.
- Byte-identity ritual re-run after landing (double `build-data`, `public/data/*.json`
  equality + `uk-land.json` SHA anchor).

### 4.4 Specific risks in the landing path
- **ID scheme drift**: extract emits `wales-<n>`; ADR-0002's row-index fallback is
  `${nation}-r${n}` (NI shipped `ni-r1`…`ni-r6`). RECOMMENDED: script emits
  `wales-r<n>` (one-line script edit) or record an explicit ADR-0002 note.
- **Postcode-less rows**: the extract script tolerates an absent postcode *column*,
  but rows without postcodes would land as **unplaced hospices** (no Voronoi cell,
  listed with degenerate catchment) — `build-data.mjs` does not fail on unplaced
  hospices (it fails only on unresolved *shops*). RECOMMENDED: on CIW landing, run a
  validation line (new rows all have postcodes) and log exceptions; hide-not-delete
  keeps any exception rows visible in data, out of the map.
- **Pick list (G3)**: if the CIW reply exceeds the dataset (e.g. day centres that are
  not hospices), the mapping stays human-curated — consistent with the
  profile-first/curated-flags convention (`curated` field).

### 4.5 RECOMMENDED PATH
Primary: resend the drafted CIW request (H3-1) → save reply CSV → run the existing
pipeline. Fallbacks (only if CIW is unresponsive beyond a reasonable window):
`data.wales` dataset, then directory cross-check — each **UNVERIFIED-FOR-REACHABILITY**
until a human browser check. AC3 tolerates "prepared fetch spec + landing script" as
the interim state; the script is already landing-ready today.
## 5 — NI unplaced practices (12)

### 5.1 Verified state
- `public/data/practices.json`: **11,014** practices, **12 unplaced** (all `nation: 'ni'`,
  `hospiceId: null`). `data/README.md` corroborates "12 in hospiceId:null".
- Root cause (verified, memory `nominatim-osm-gap-bt-postcodes.md` + 3-pass
  geocode history): an **OSM/Nominatim coverage gap** for specific Northern Ireland
  postcodes — Nominatim returns nothing for the unit code **and** the outcode fallback.
  Three geocode passes (2026-10-15/16/24) with 8-attempt backoff and outcode fallback
  could not resolve them. Execution rule 3 from that memory: **no further loop** —
  the geocoder has exhausted its retry policy, so re-running `geocode-postcodes.mjs`
  will not place these.
- The 12 practices and their postcodes (from `practices.json`; postcodes are the
  blocking factor). Note: the memory's "9,098/9,107" and this session's counts agree
  on the 12 unplaced; the exact postcode list is the definitive set below:
  `ni-103` (Dr. MAGUIRE & PARTNERS), `ni-104` (Dr. HUTCHINSON & PARTNERS),
  `ni-304` (Dr. BUTLER & PARTNERS), `ni-310` (Dr. MCKELVEY & PARTNERS),
  `ni-317` (Dr. REDMOND & PARTNERS), `ni-325` (Dr. GREER & PARTNERS),
  `ni-328` (Dr. JOHNSTON & PARTNERS), `ni-455` (Dr. MAGOWAN & PARTNERS),
  `ni-654` (Dr. HARTE & PARTNERS), `ni-657` (Dr. BRADLEY & PARTNERS),
  `ni-662` (Dr. MOTHERWELL & PARTNERS), `ni-663` (Dr. DEEHAN & PARTNER).
  (Postcode-per-practice confirmed by reading `practices.json` this session; the
  distinct blocking postcodes are the BT set recorded in `data/README.md` +
  `nominatim-osm-gap-bt-postcodes.md`:
  `BT13 1AD, BT13 3BW, BT42 1GP, BT42 1NW, BT42 2PB, BT42 3JU, BT42 4JA, BT63 6JS,
  BT79 0NR` — 9 postcodes covering the 12 practices.)

### 5.2 Why the geocoder cannot fix it (verified)
`scripts/geocode-postcodes.mjs` sources **only** OSM Nominatim (UA
`HospiceInfoproto/0.1`, line 14) with 1 req/s, 429/503 backoff, and an outcode
fallback (line 8 resume note). It has **no second geocoding provider** and no
manual-pin input path. The OSM gap means Nominatim's index simply lacks these
postcodes, so no amount of retrying resolves them (ADR-0003 fail-fast: the script
exits non-zero if an in-scope postcode stays unresolved — but the 12 are already
tolerated as unplaced in `data/README.md`'s standing state).

### 5.3 Options to place the 12
1. **OS Places API / OS Postcode Geocoder** (Ordnance Survey) — authoritative UK
   postcode geocoding; would resolve the gap. Cost/gate: requires an API key = human
   gate **H3-2** (memory `cycle-3-specification-2026-10-29.md`). Reachability/pricing:
   **UNVERIFIED-FOR-REACHABILITY** from this stage.
2. **Manual pinning** — James (operator) supplies coordinates/addresses for the 9 BT
   postcodes (e.g. from the practice websites, OS maps, or local knowledge), recorded
   as a small manual override in the data pipeline (a new `data-raw/` manual-geo
   file or an edit to `practices.json` via the existing curated flow). No external
   dependency, no key. This is the LEAN path and matches the "documented failed
   attempt" fallback AC3 tolerates.
3. **Accept as unplaced** — leave the 12 unplaced (they are already excluded from the
   map per hide-not-delete). AC3's fallback explicitly allows "documented failed
   attempt". This is the zero-effort option but leaves a data gap.

### 5.4 RECOMMENDED PATH
**Manual pinning (option 2)** if the operator can reliably supply the 9 BT postcode
coordinates; otherwise **OS Places/Postcode Geocoder (option 1)** behind gate H3-2.
If neither is feasible in-cycle, **document the failed attempt (option 3)** — AC3
accepts this. The manual-pin route should graduate into the data pipeline as a
first-class, reviewable artifact (e.g. `data-raw/manual-geo-ni.json`) so it is
reproducible and attributed (ODbL does not apply — this is operator-supplied, not
OSM-derived; note the source explicitly). The `geocode-postcodes.mjs` script must
be extended (or a sibling script added) to consume the manual overrides with the same
byte-identity discipline. This is a design decision for the Architect.

## 6 — Logo refine (heart + pin mark)

### 6.1 Current mark (verified, exact geometry from `public/logo.svg`)
`<svg viewBox="0 0 64 64">`:
- Pin triangle: `M24 30 L32 54 L40 30 Z` fill `#1d4ed8`.
- Outer circle: `cx=32 cy=26 r=18` fill `#1d4ed8`.
- Inner circle: `r=12` fill `#fff`.
- Heart: `M32 32 C 29.5 29, 26.5 27.5, 26.5 24.5 C 26.5 22.5, 28 21, 30 21 C 31.2 21,
  32 22, 32 23 C 32 22, 32.8 21, 34 21 C 36 21, 37.5 22.5, 37.5 24.5 C 37.5 27.5,
  34.5 29, 32 32 Z` fill `#1d4ed8`.
- `aria-label="Hospice Info"` (should update to "Hospice Finder UK" on rename).

### 6.2 Current usages (verified)
- `index.html:15` — favicon (`image/svg+xml`).
- `public/manifest.webmanifest` — app icon (`/logo.svg`, `sizes: any`).
- `src/components/AppShell.tsx:29` — header icon, 28×28 px.
- No PNG variants exist (`public/` has only `logo.svg`); no OG image.

### 6.3 AC4 requirements (from `.agents/feature.md`)
- Legible at **16px and 32px**.
- Wired to `index.html` + `manifest`.
- No orphaned assets.

### 6.4 Design observations (INFERRED)
- At 16px, the inner white circle (r=12 in a 64-unit box → 3px at 16px) plus the
  heart (spanning ~12 units wide/11 tall → ~3px) are near the legibility floor. The
  heart's S-curve control points are fine at 32px but may blur at 16px. RECOMMENDED:
  simplify the heart to fewer, bolder curves and/or thicken the pin's silhouette so the
  mark reads as "pin with heart" at 16px.
- Keep `#1d4ed8` (brand blue) — it is the `theme_color` already in the manifest and
  the established codebase colour.
- The mark should stay a single-file `public/logo.svg` (favicon + app icon header) to
  avoid orphaned assets; if an OG image is added (§3.3) it is a **separate committed
  PNG** (`og-image.png`), not a rename of the logo.

### 6.5 RECOMMENDED PATH
Redraw `public/logo.svg` keeping the pin+heart concept and `#1d4ed8`, simplifying the
heart for 16px legibility; update `aria-label` to "Hospice Finder UK"; keep it as the
single favicon/manifest icon; generate a separate 1200×630 `og-image.png` (one-off)
for social cards. Legibility to be verified at 16px/32px by eye + a screenshot after
the edit (operator review — this is a subjective design gate, not an automated check).
No code changes needed beyond the `aria-label`; the file is referenced by path only.
## 7 — Risks & open questions

### 7.1 Risks (classified)
| # | Risk | Class | Evidence / mitigation |
|---|---|---|---|
| R1 | Prerendered real paths load with empty hash → client app renders the **map**, not the page | **Blocking (design)** | §1.1/§2.5 — requires the small hash-redirect guard; must be solved in the Architect plan or AC2 is unmet |
| R2 | `SITE_URL` constant (`https://hospiceinfo.pages.dev`) assumed | Open | slug locked (`wrangler.jsonc:3`) but hostname **UNVERIFIED-FOR-REACHABILITY** — verify in browser before landing SEO copy |
| R3 | `og-image.png`/favicon PNG needs image tooling the repo does not have | Risk-accepted | §3.3/§6 — one-time committed static asset; byte-identity ritual (`data/README.md`) covers `public/data/*.json` + `uk-land.json` only, so unaffected |
| R4 | Wales CIW reply: timing unknown; columns (postcode present/absent) unknown | Open | §4.4 — G3 keeps build green until then (`extract-hospices-wales.mjs` exit 0 on absent CSV); AC3 tolerates prepared landing script (already in place) |
| R5 | Wales rows without postcodes → unplaced hospices (no cell) | Open | §4.4 — `build-data.mjs` fails only on unresolved *shops* (`process.exit(1)`), not unplaced hospices; add a post-landing validation line; hide-not-delete keeps rows visible in data |
| R6 | Wales/NI new postcodes may hit the same OSM Nominatim gap as the 9 BT postcodes | Open | §5.2/§5.3 — geocoder is single-provider (Nominatim, `geocode-postcodes.mjs` line 14/8 note); manual-pin mechanism should be generalised, not BT-specific |
| R7 | 9 BT postcodes: OS-API path needs human gate H3-2 (key, **UNVERIFIED-FOR-REACHABILITY** for pricing/quota) | Risk-accepted | §5.3/§5.4 — manual pinning proposed to avoid the gate; AC3 fallback "documented failed attempt" also available |
| R8 | `wales-<n>` id scheme vs ADR-0002 `${nation}-r${n}` row-index convention (NI shipped `ni-r1`…`ni-r6`) | Open | §4.4 — one-line script edit or explicit ADR-0002 note before Wales lands |
| R9 | Static `/corrections` and `/hospice/<id>` pages show content as of build time; corrections add via curation workflow → rebuild → redeploy | Risk-accepted | matches existing curation posture; `data/README.md` corrections log; no live API by design (no backend) |
| R10 | Prerender HTML byte-stability not yet a checked invariant | Open | §2.6 — RECOMMENDED: run `npm run build` twice, diff `dist/` (add to `MAINTENANCE.md` pre-push chain alongside `validate-tessellation` + byte-identity ritual) |
| R11 | Old name remains in docs headings (`README.md:1`, `GLOSSARY.md:1`, `MAINTENANCE.md:1,4`) until rename lands | Risk-accepted | pure rename surface, §1.2; GLOSSARY updated by the Architect (owns vocabulary) |
| R12 | "/hospice/<id> → View on map" cannot deep-select the hospice (no URL state, ADR-0007) | Risk-accepted | §2.5 — link goes to `/`; optional query-param handling deliberately deferred (not in Cycle 3 scope) |
| R13 | Deployment payload grows by ~170 small HTML files + sitemap | Risk-accepted | ADR-0014 budget: current largest asset ≈3.14 MiB of 25 MiB limit; ~0.8–1 MiB added pages → ample headroom |

### 7.2 Open questions (for lead/Architect)
1. **Routing guard design**: exact behaviour for `/hospice/<id>` static pages on JS load — option A: redirect to `/` (map unselected); option B: add minimal `?hospice=<id>` query handling (breaks ADR-0007's "no state hydration" — needs ADR). RECOMMENDED: A for Cycle 3.
2. **JSON-LD type**: `HealthCareBusiness` (subtype of `LocalBusiness`) vs `MedicalOrganization` vs plain `LocalBusiness` — Architect finalises (§3.4); the no-endorsement guard is non-negotiable (LegalPage wording).
3. **`SITE_URL`**: confirm `https://hospiceinfo.pages.dev` in a browser (open question R2); if a custom domain is configured, the constant must change.
4. **Wales timing**: is gate H3-1 (CIW resend) raised before or after the prerender work lands? Data and structure are independent — either order works (G3)._
5. **Wales id scheme**: `wales-r<n>` (script edit) vs ADR-0002 note (R8).
6. **NI placement**: manual pin by operator (needs coordinates for 9 BT postcodes — does the operator have a trusted source?) vs OS Postcode Geocoder (gate H3-2) vs documented-failed-attempt (R7).
7. **Logo**: 16px legibility is subjective — operator visual sign-off gate (not automatable); who draws the refined SVG (operator file edit vs tooling)?
8. **`package.json` name** `hospice-catchment-map`: rename or leave (RECOMMENDED: leave — private, no registry).
9. **Sitemap `lastmod`**: omit (RECOMMENDED, deterministic) vs fixed data-vintage date.
10. **`build` script chain**: add `node scripts/prerender.mjs` to `build` (RECOMMENDED, §2.6) — confirm no impact on `tsc -b` output.

### 7.3 Glossary candidates (for the Architect to finalise in GLOSSARY.md)
"prerender / static prerender" (build-time emission of static HTML at real paths by
`scripts/prerender.mjs`, complementary to hash routing); "site URL" (build-time
constant for canonical/OG absolute URLs); "OG image" (committed 1200×630 social card);
"hash-redirect guard" (first-load redirect from a real path to its `#` route);
"manual pin" (operator-supplied coordinates for postcodes the geocoder cannot resolve).

### 7.4 Handoff notes for the next agents
- **Architect**: R1 (routing guard) + R12 are the two design decisions that gate AC2;
  the recommended option set is in §2.5/§2.6/§3.6 — keep ADR-0007 (no router library),
  ADR-0008 (minor deps), ADR-0014 (only `dist/` ships), and the byte-identity ritual
  intact. One new ADR expected: prerender mechanism + `SITE_URL` constant.
- **PM / work list**: rename surface is tabled (§1.2); prerender = one script +
  `package.json` build line + head meta in templates; Wales = CIW email (drafted,
  `data/README.md` B1) + landing script already present; NI = 9 BT postcodes
  (§5.1 list) via manual pin or H3-2; logo = single `public/logo.svg` edit + one-off
  `og-image.png`.
- **QA**: verify AC2 counts (static pages = 1 + 6 + `hospices.json` length; sitemap =
  same set), hash-redirect guard on all 6 real paths, `check:layout` still green
  (3 flex-direction declarations — `scripts/check-map-layout.mjs`), byte-identity
  ritual, and 16px/32px logo legibility by eye.
- **Security**: no new trust surface (static files only); ensure JSON-LD carries no
  endorsement claims (§3.4); robots/sitemap correct (no internal paths leaked).

### 7.5 Verification performed this session
Reads: `index.html`, `public/manifest.webmanifest`, `public/logo.svg`,
`src/main.tsx`, `src/App.tsx`, `src/components/AppShell.tsx`, `src/lib/useRoute.ts`,
`src/lib/siteConfig.ts`, `src/lib/types.ts`, `src/pages/*.tsx`, `scripts/build-data.mjs`,
`scripts/geocode-postcodes.mjs`, `scripts/extract-hospices-wales.mjs`,
`scripts/check-map-layout.mjs`, `data/README.md`, `data-raw/hospices-wales.json`,
`wrangler.jsonc`, `vite.config.ts`, `package.json`, ADRs 0001/0002/0004/0005/0006/0007/
0008/0009/0014, `GLOSSARY.md`, `.gitignore`.
Read-only commands: `git log`/`git status`; `node -e` counts over `public/data/*.json`
(161 hospices / 11,014 practices / 161 catchments / 138 shops; 12 unplaced all ni;
wales 0); globs over `public/` and `scripts/`; greps for branding, slug, and SEO tokens
(results as cited above). **No web access**: all external candidates marked
UNVERIFIED-FOR-REACHABILITY.

*End of research record — next: Architect (`.agents/architecture.md`).*
