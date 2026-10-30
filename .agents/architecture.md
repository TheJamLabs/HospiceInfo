# Architecture — Cycle 3 (2026-10-29)

**Scope:** Stage 2 (Architect), Cycle 3. **Reads:** `.agents/feature.md`, `.agents/research.md` (§2–§8, A1–A8 drafts, §7.3 vocabulary), `.agents/pipeline.md`, plus read-only on-disk verification (data counts, `package.json`, `scripts/build-data.mjs`, `scripts/extract-hospices-wales.mjs`, `src/main.tsx`, `src/App.tsx`, `src/lib/siteConfig.ts`, `data-raw/site-config.json`, `index.html`, `src/components/AppShell.tsx`, `public/manifest.webmanifest`, `public/logo.svg`, `data/README.md`, existing `docs/adr/` 0001–0014, `GLOSSARY.md`).
**Writable in this stage:** `.agents/architecture.md`, `docs/adr/`, `GLOSSARY.md` only. All `src/` and `scripts/` changes below are *specifications* for the Coding stage — nothing in this stage touches them.
**Standing invariants (carry over, re-stated where load-bearing):** byte-identical `public/data/*.json` rebuild (the Cycle 2 build-data SHA-256 anchor set `dc261185 e11322ba 2a87a374 5628d8f7` is re-baselined exactly once, after the §5 NI merge — see §9); ADR-0005 nearest-hospice rule (every *placed* practice → exactly one nearest hospice); ADR-0008 no new npm dependencies; ADR-0009 single-source (`data-raw/site-config.json` is the trusted source, `src/lib/siteConfig.ts` is the hand-maintained mirror consumed by the app; `scripts/prerender.mjs` reads the source file, not the mirror); ADR-0010 performance invariants P1–P7; ADR-0013 provenance row for every data landing; ADR-0014 Cloudflare Pages, git-connected, `npm ci && npm run build`, only `dist/` ships; hide-not-delete (R12) for all gap wording.

## Site and URL model

| Aspect | Value | Notes |
|--------|-------|-------|
| Display name (human-facing) | **"Hospice Finder UK"** | ADR-0023; 8 display surfaces, §2 |
| Live hostname | `https://hospiceinfo.pages.dev` | Derived from `wrangler.jsonc` slug `hospiceinfo`; **reachability unverified** (no browser check from this stage — human check, §10) |
| Canonical `SITE_URL` | `https://hospiceinfo.pages.dev` | New config value, §3.7 (ADR-0009 pattern) |
| Identifiers | repo `HospiceInfo`, Pages slug/name `hospiceinfo`, npm name `hospice-catchment-map`, ADR files, `docs/` | **unchanged** — zero rename blast radius (ADR-0023) |

## Target state

```
data-raw/*.{json,csv}   (site-config.json; new: manual-geo-ni.json; future: wales-hospices-2026-10.csv)
      │  scripts/extract-* / merge-hospices / geocode-postcodes      (unchanged)
      ▼
public/data/{hospices,practices,catchments}.json      ← npm run build-data (one merge-point change, §5)
      │  npm run build = tsc -b && vite build            (unchanged)
      ▼
dist/    (React 18 hash-routing SPA, behaviour unchanged)
      │  node scripts/prerender.mjs                       ← NEW build step, ADR-0015
      ▼
dist/ + 161× /hospice/<id>.html + 6 info .html + rewritten <head> on index.html
      + sitemap.xml + robots.txt + 404.html
      → Cloudflare Pages (git-connected, ADR-0014 — no config change)
```

## Decision table (7 spec decisions → 9 ADRs)

| # | Decision (outcome) | ADR |
|---|--------------------|-----|
| 1 | Prerender = new deterministic `scripts/prerender.mjs` appended to the npm build (`tsc -b && vite build && node scripts/prerender.mjs`); **shell page model** (per-page `<head>` + empty `#root` + boot script); no headless browser, no SSR, zero new deps | 0015 |
| 2 | Route shipping = hash router untouched + a ~10-line **hash-redirect guard** in `src/main.tsx` (`history.replace`, not push); committed `dist/404.html` shell for Pages 404s. Closes research finding R1 (Blocking) | 0016, 0017 |
| 3 | SEO set = `<link rel=canonical>` + title/description + Open Graph + Twitter card + JSON-LD `@graph` (root `Organization` + per-hospice `HealthCareBusiness`); no-endorsement guard; omit `geo` when unplaced; omit `lastmod` (byte-stable) | 0018 |
| 4 | Per-hospice URLs = `/hospice/<canonical-id>` — the id **is** the URL slug (no second mapping layer); fix the `wales-<n>` → `wales-r<n>` id drift in `scripts/extract-hospices-wales.mjs` (ADR-0002 conformance) | 0019 |
| 5 | Wales = reuse the G3-tolerant `scripts/extract-hospices-wales.mjs` path as-is; CIW reply lands as a human-saved CSV; AC3's disjunct (prepared landing script + documented pending state) is satisfied this cycle with Wales hospices = 0 | 0020 |
| 6 | NI = new `data-raw/manual-geo-ni.json` (operator coordinates for exactly 9 BT unit postcodes), merged into the geo map in `scripts/build-data.mjs`; the OS Places key (H3-2) is thereby **not required** — retained as the verified fallback | 0021 |
| 7 | Logo = **invert the heart to white on the blue disc**, delete the white r12 circle (4 → 3 elements), re-center the heart; SVG-only assets, no rasterisation (ADR-0008) | 0022 |
| — | Rename "Hospice Finder UK" across 8 display surfaces only (no identifiers) | 0023 |

## 2. Branding — rename to "Hospice Finder UK" (AC1, ADR-0023)

Exact string: `Hospice Finder UK` (title-case as shown; never lower-cased in prose — the name contains "UK").

**Display surfaces (8):**

| # | Surface | File(s) | Change |
|---|---------|---------|--------|
| 1 | Document `<title>` | `index.html` | → `Hospice Finder UK` title (exact value §3.3) |
| 2 | Header `<h1>` | `src/components/AppShell.tsx` | link text "Hospice Catchment Map" → "Hospice Finder UK" (href stays `#map`) |
| 3 | PWA manifest | `public/manifest.webmanifest` | `name` → `Hospice Finder UK`; `short_name` → `Hospice Finder` |
| 4 | Mark aria-label | `public/logo.svg` | `aria-label` → "Hospice Finder UK" (§6) |
| 5 | Prerendered page titles | `scripts/prerender.mjs` (new) | §3.3 table |
| 6 | Prerendered `og:title` / `twitter:title` | `scripts/prerender.mjs` (new) | §3.3 |
| 7 | `404.html` title | `dist/404.html` (emitted) | `Page not found — Hospice Finder UK` |
| 8 | Page h1s in `src/` | every page component that prints the site name | rename every user-visible occurrence |

**Deterministic rule (beats a surface list):** after the rename,
`grep -rni "hospice catchment map" index.html public/ src/` → **zero hits**. Coding applies the rename to every user-visible hit; hits inside `docs/adr/`, `data/README.md`, and `.agents/` *history* keep the old name (they are record, not branding).

**Not renamed (identifiers — ADR-0023 blast radius stays zero):** `wrangler.jsonc` `name: "hospiceinfo"` + `slugs.default` (changing the slug orphans the live URL), the Pages project, the repo name, `package.json` `name: "hospice-catchment-map"` (private, unpublished — renaming gains nothing), npm scripts, ADR filenames, `docs/` paths, project-memory references.

**G6/reduced-motion check:** branding change touches no layout CSS → no `flex-direction` risk; `npm run check:layout` must still pass.

**Acceptance (AC1):** the grep above is empty; `npm run build` exit 0; `npm run preview` shows the new name in the tab title, header, and the manifest (DevTools → Application → Manifest); no `Hospice Catchment Map` in any built `dist/*.html`.

## 3. Static prerendering — make the site crawlable (AC2, ADR-0015/0016/0017/0018)

### 3.1 New build step `scripts/prerender.mjs` (ADR-0015)

- **Wiring (the only `package.json` line change):** `"build": "tsc -b && vite build && node scripts/prerender.mjs"`. No new npm dependencies (ADR-0008) — the script uses only `node:fs`.
- **Inputs it reads (fixed list, nothing else):** `public/data/hospices.json`, `data-raw/site-config.json` (SOURCE, per ADR-0009 — the script never reads `src/lib/siteConfig.ts`), and the built `dist/index.html`.
- **What it extracts from the built `dist/index.html`:** verbatim strings of every `<link rel="stylesheet">`, every `<link rel="modulepreload">`, and the `<script type="module" src=...>` tag. These asset tags are re-emitted unchanged in every page (the JS bundle is the same for every route). The built `<title>`/`<meta name="description">` are **replaced** by per-page values (§3.3).
- **Page set (derived from data, never hard-coded):**
  | Emitted file | Count (current) |
  |--------------|-----------------|
  | `index.html` (map shell) | 1 |
  | `about.html`, `corrections.html`, `feedback.html`, `privacy.html`, `licences.html`, `accessibility.html` | 6 |
  | `hospice/<id>.html` — **one per id in `hospices.json`** (code-unit ascending) | 161 (152 en / 3 sc / 6 ni / 0 wales today) |
  | `sitemap.xml`, `robots.txt`, `404.html` | 3 |
  → 171 static files. **AC2 invariant, checked in code:** sitemap URL count must equal `hospices.json length + 7`; mismatch → exit non-zero. This makes "count matches hospices.json" machine-enforced, not eyeballed.
- **Shell page model (ADR-0015):** every emitted page = per-page `<head>` + `<div id="root"></div>` + the extracted boot script. Visible content is rendered client-side by React once the hash guard (§3.5) resolves the route. **Rationale:** (a) no duplication of legal/prose text — the React components stay the single source (ADR-0009) and 161+ static copies can never drift from the app; (b) emitted bytes stay small and byte-stable (§3.2); (c) crawlers rank on title/meta/JSON-LD/links, all present in the shell.
- **`.html` URLs (ADR-0015):** files ship with a `.html` extension and canonical/OG/sitemap URLs point at the **served** `.html` URLs (home: `/` only). Cloudflare Pages serves exact file paths — extensionless `/hospice/<id>` would 404 without a `_redirects` layer; a rewrite layer is a second moving part for marginal SEO gain.
- **Rejected alternatives:** Vite HTML-prerender plugins (early, headless-browser paths, non-deterministic internals); headless-chrome prerender at build (network + browser dependency, breaks byte-identity, A1); Cloudflare Functions / `next-on-pages` SSR (breaks ADR-0014 zero-backend + determinism, A6); full-content prerender (text drift risk, A5).
- **Idempotence:** before emitting, the script deletes the previously emitted per-page files (6 info files, `dist/hospice/`, `sitemap.xml`, `robots.txt`, `404.html`) so ids that leave `hospices.json` cannot leave stale pages behind.
- **Fail-fast invariants (exit non-zero):** `hospices.json` unparseable; `SITE_URL` missing, empty, or not an `https://` URL; module script tag not found in the built `dist/index.html`; sitemap count mismatch. (Same fail-fast convention as `scripts/build-data.mjs`.)

### 3.2 Determinism rules (invariants the script must enforce in code)

1. Hospice pages and sitemap entries iterate `hospices.json` ids sorted **code-unit ascending** — never object key order, never input order.
2. Info pages use the fixed literal array `[about, corrections, feedback, privacy, licences, accessibility]` (alphabetical).
3. No timestamps, no `lastmod`, no build id, no `Date.now()`, no randomness, no environment-derived strings in emitted bytes. Emitted content is a pure function of (`hospices.json` + `site-config.json` + the Vite build output).
4. LF line endings only; every emitted file ends with exactly one trailing newline.
5. JSON-LD is one `JSON.stringify(object)` (0-space) inside a single `<script type="application/ld+json">`; object key order fixed by hand in the code (insertion order is deterministic).
6. The script reads its fixed input list only — no directory walking, nothing from `node_modules`.
7. **QA check:** `npm run build` twice on the same tree → `dist/` byte-identical (hash every file under `dist/` twice, compare; also compare the `public/data/*` SHA-256 set across `npm run build-data` ×2).

### 3.3 Per-page `<head>` (ADR-0018)

Template (every emitted page, incl. rewritten `index.html` and `404.html`):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{TITLE}</title>
  <meta name="description" content="{DESC}" />
  <link rel="canonical" href="{SITE_URL}{CANON}" />
  <link rel="icon" href="/logo.svg" type="image/svg+xml" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Hospice Finder UK" />
  <meta property="og:title" content="{TITLE}" />
  <meta property="og:description" content="{DESC}" />
  <meta property="og:url" content="{SITE_URL}{CANON}" />
  <meta property="og:image" content="{SITE_URL}/og-image.png" />
  <meta property="og:image:alt" content="Hospice Finder UK - heart map-pin mark" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="{TITLE}" />
  <meta name="twitter:description" content="{DESC}" />
  <script type="application/ld+json">{JSONLD}</script>
  {extracted modulepreload links}
  {extracted stylesheet links}
</head>
<body>
  <div id="root"></div>
  {extracted module script tag, verbatim}
</body>
</html>
```

- Hosptice pages (`/hospice/<id>.html`): `og:type` = `article`.
- **Escaping:** hospice names are HTML-escaped in `<title>`/`<meta>`/`og:*`/`twitter:*` (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`) — e.g. "Hull & East Yorks". Inside JSON-LD, `JSON.stringify` escapes (`&` stays `&`, which is valid JSON).
- `{CANON}` = the served URL path: `/` (index) or `/about.html`, `/hospice/<id>.html`, …

**Title / description (exacts):**

| Page | `<title>` | `meta description` |
|------|-----------|--------------------|
| `/` | `Hospice Finder UK` | `Find the hospice that covers your postcode. A live UK map of every hospice's catchment areas, approximated from GP practice locations.` |
| `about.html` | `About - Hospice Finder UK` | `How Hospice Finder UK builds catchment areas from open GP and hospice register data, and the known data gaps.` |
| `corrections.html` | `Corrections - Hospice Finder UK` | `Spot an error? How to send us corrections for catchment areas, names, and postcodes.` |
| `feedback.html` | `Feedback - Hospice Finder UK` | `Send feedback and suggestions to the Hospice Finder UK team.` |
| `privacy.html` | `Privacy - Hospice Finder UK` | `What data Hospice Finder UK uses and how - a static site that sends no tracking and stores nothing.` |
| `licences.html` | `Licences - Hospice Finder UK` | `Data licences and attribution for the sources behind Hospice Finder UK, including the CQC register and OpenStreetMap (ODbL).` |
| `accessibility.html` | `Accessibility - Hospice Finder UK` | `Accessibility statement for Hospice Finder UK: what is supported, and known limitations.` |
| `hospice/<id>.html` | `{name} - Hospice Finder UK` | `Catchment area for {name} - the GP practices approximated as falling inside it, and how the boundary is derived.` |
| `404.html` | `Page not found - Hospice Finder UK` | `This page does not exist. Find the hospice that covers your postcode on Hospice Finder UK.` |

### 3.4 JSON-LD (ADR-0018)

Every page: `@graph = [Organization]`. Hospice pages add a second node.

**Organization (all pages; values from `data-raw/site-config.json`):**
```json
{ "@type": "Organization", "@id": "{SITE_URL}/#operator",
  "name": "The Jam Labs Ltd",
  "url": "{SITE_URL}/",
  "email": "hello@thejamlabs.com",
  "description": "Independent, third-party mapping of hospice catchment areas in the UK, built from open data." }
```

**HealthCareBusiness (`/hospice/<id>.html` only):**
```json
{ "@type": "HealthCareBusiness",
  "name": "{hospice.name}",
  "url": "{SITE_URL}/hospice/{id}.html",
  "description": "{meta description, unescaped}",
  "address": { "@type": "PostalAddress", "postalCode": "{pc}" },
  "geo": { "@type": "GeoCoordinates", "latitude": {lat}, "longitude": {lon} } }
```
- `address` emitted **only** when `postcode` non-empty; `geo` emitted **only** when placed (lat/lon non-null). Unplaced hospices (the 12 NI pre-§5; any unplaced Wales hospices after landing) get neither — absence is honest, JSON-LD stays valid.

**No-endorsement guard (security, research §3.4 legal guard — the risk list ends at R13; this concern is unnumbered there):** this site is a third-party information service *about* these businesses. Emitted JSON-LD must **never** contain `sameAs` pointing at a hospice's own website (even though `hospices.json` has a `website` field), nor `affiliation`, `parentOrganization`, `contactPoint`, `openingHours`, pricing, or any field the hospice itself would claim. All template text stays in third-party voice ("approximated", "caughtment areas are estimated").

**Why no `lastmod`:** no faithful change date exists for derived data; emitting one would be a misrepresentation and would break byte-stability (§3.2).

### 3.5 Hash-redirect guard (ADR-0016) — closes R1 (Blocking)

`src/main.tsx`, before `createRoot(...)`:

```ts
// ADR-0016: ship real paths (AC2) on top of the hash router (ADR-0007).
// A direct load of /about* arrives with an empty hash; without this guard
// the app renders the map. The guard replaces the URL with the matching
// hash route (history.replace — no extra history entry).
(function () {
  if (window.location.hash) { return; }               // SPA navigation already handled
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (path === '') { return; }                         // home → map, as today
  const route =
    path === 'hospice' ? null :                        // placeholder shell → map (R12: no deep-linking)
    path.startsWith('hospice/') ? path.slice('hospice/'.length) :
    path;                                               // about /corrections /feedback /privacy /licences /accessibility
  if (route) { window.location.replace('#/' + route); }
})();
```

- **Replace, not push:** `location.replace` keeps the history stack clean (back from `/about` leaves the site, matching external-link expectation).
- **Info pages:** `/about.html` → hash resolves to `about` → `src/App.tsx` (unchanged) renders `AboutPage` etc. All six existing page components are untouched.
- **Hospice pages (R12, documented decision):** `/hospice/<id>.html` sets hash `#/hospice/<id>`; `src/App.tsx` matches no such route → renders the map (today's behaviour for unknown hashes). The page's SEO value is its `<head>` (title/JSON-LD/canonical), which crawlers read without JS; the shipped content additionally explains the concept, and "View on the map" links target `/`. **No deep-linking into the panel is promised or built** — avoids a new selection-state surface for zero user ask. If users later want "open on map at /hospice/<id>", that is a Cycle 4 item (needs a `#/hospice/<id>` route + pre-selected panel state — small, but out of scope here).
- **404 pages:** `404.html` (ADR-0017) arrives with empty hash → guard returns → map shells out. Correct behaviour for an unknown page.
- No router library (ADR-0007 intact); the guard is the *only* route-shipping mechanism; no query-string reading anywhere (ADR-0005/Q1 consistency).
- **Edges:** trailing-slash dupes (`/about/`) normalized by the regex; day-typical `index.html` served at `/` → `path === ''` → no-op.

### 3.6 `sitemap.xml` + `robots.txt` (emitted by the same script, §3.1)

- **Why from the same script:** the URL set can never drift from the pages on disk (AC2 "sitemap covers the same set").
- `sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{SITE_URL}/</loc></url>
  <url><loc>{SITE_URL}/about.html</loc></url>
  ... (six info paths, §3.2 order 2)
  <url><loc>{SITE_URL}/hospice/{id}.html</loc></url>   ×161, id-sorted
</urlset>
```
  No `<lastmod>` (§3.4). Escaping: none of the currentized ids contain characters needing XML escape; the emitter still escapes `&<>"'` in `<loc>` (defensive, in code).
- `robots.txt` (exact, LF, trailing newline):
```
User-agent: *
Allow: /

Sitemap: {SITE_URL}/sitemap.xml
```
- No `Disallow` (entire site is public; the map is the product, not a secret).

### 3.7 `SITE_URL` (ADR-0009 pattern, ADR-0018)

- **Source of truth:** `data-raw/site-config.json` gains one field (verbatim shape after the change):
```json
{ "operatorName": "The Jam Labs Ltd", "contactEmail": "hello@thejamlabs.com", "siteUrl": "https://hospiceinfo.pages.dev" }
```
- **Mirror:** `src/lib/siteConfig.ts` gains `siteUrl: string` on the `SiteConfig` interface (the app itself does not need it — prerender reads the source file — but the mirror stays the complete mirror, per ADR-0009; if the app later needs it, the cost is already paid).
- **Dev/local caveat:** the value is always the production hostname (sitemaps/canonicals must point at the canonical host). Local `npm run preview` builds will show `pages.dev` URLs — expected and documented; no environment switching (determinism, §3.2: an environment-dependent URL would make `dist/` differ per machine).

### 3.8 `404.html` + `og-image.png` (ADR-0017)

- **`404.html`:** emitted by `scripts/prerender.mjs` (same shell: §3.3 title `Page not found — Hospice Finder UK` + description; no JSON-LD `HealthCareBusiness`; Organization node present). Cloudflare Pages auto-serves `404.html` for all unmatched paths (ADR-0014; no config change needed). No custom 404 route in the SPA (unknown hashes already map to the map view).
- **`og-image.png`:** **one new operator-generated asset** — `public/og-image.png`, 1200×630 (Open Graph recommendation), `#1d4ed8` background + bold white "Hospice Finder UK" + the heart-pin mark. Coding produces a plausible placeholder (text + mark, no dependency — e.g. a hand-authored SVG rendered by any local browser print, or a simple committed PNG); **regeneration with the final brand mark is a human-verification item (§10)** — the `og:image` reference ships either way (H3-adjacent, not blocking: pages are valid without a *good* image, only its absence degrades social-preview pixel count… precisely: the reference points at a file that will exist in `public/`).
- No other raster assets; favicon remains `public/logo.svg`; manifest unchanged except §2 name.

## 4. Data gap 1 — Wales hospices (AC3 disjunct B, ADR-0020; H3-1)

**Current state (verified on disk):** `data-raw/wales-hospices-2026-10.csv` is **absent**; `scripts/extract-hospices-wales.mjs` implements G3 (absent file → `data-raw/hospices-wales.json = []`, logs the line, exit 0); `hospices.json` carries **0 Wales hospices**. The CIW email text is drafted in `data/README.md` ("Care Inspectorate Wales data request", 2026-10-16) — **send state unverified (H3-1, §10)**.

**This cycle ships the disjunct:** *prepared landing script + documented pending state.* Wales stays 0 and the build stays valid (G3). No fabricated placeholder rows (zero-set tolerance means `[]`, not dummy data).

**One-line fix (ADR-0019):** the script's current `id: \`wales-${i + 1}\`` drifts from the ADR-0002 scheme (`${nation}-r${n}` fallback) — change it to `id: \`wales-r${i + 1}\`` so the id is stable in the URL on landing, matching the shipped `ni-r1…ni-r6` convention (verified on disk).

**Landing procedure (when the CIW reply arrives — human step, then chain):**
1. Save the reply verbatim as `data-raw/wales-hospices-2026-10.csv` (exact filename per the script constant).
2. `data/README.md`: record the reply's as-of date + source (the email) in the raw-inputs table (ADR-0013 provenance row); note the columns observed on first-run log (ADR-0003: the script logs the header + first row before the filter is trusted).
3. Chain: `node scripts/extract-hospices-wales.mjs` → `node scripts/merge-hospices.mjs` → `node scripts/geocode-postcodes.mjs` (Wales postcodes via OSM — no key) → `npm run build-data` ×2 (byte-identity; **re-baseline the SHA-256 anchor**) → `node scripts/validate-tessellation.mjs` → `npm run build`.
4. Gate (Draft R12): `hospices.json` shows `wales > 0`; each placed Wales hospice gets a catchment cell; unplaced Wales hospices acceptable only from documented geocoding gaps (no polygon, no practices, same as today's NI unplaced treatment).

**AC3 status this cycle:** disjunct B met → pass. H3-1 is the only external dependency; its slowness blocks nothing (G3).

## 5. Data gap 2 — NI unplaced practices (AC3 disjunct A, ADR-0021; H3-2 retired)

**Current state (verified on disk):** 12 NI practices unplaced — all 9 BT unit postcodes known to be unresolvable by Nominatim/Overpass (unit, outcode, and town fallback, per project memory + `data/README.md`):

| practice id | postcode | | practice id | postcode |
|-------------|----------|-|-------------|----------|
| ni-103 | BT13 1AD | | ni-325 | BT42 3JU |
| ni-104 | BT13 3BW | | ni-328 | BT42 1GP |
| ni-304 | BT42 2PB | | ni-455 | BT63 6JS |
| ni-310 | BT42 1NW | | ni-654 | BT79 0NR |
| ni-317 | BT42 4JA | | ni-657 | BT79 0NR |
| (—) | (—) | | ni-662 | BT79 0NR |
| (—) | (—) | | ni-663 | BT79 0NR |

**Decision (ADR-0021): operator manual-pinning** — a committed file supplies WGS-84 coordinates for the 9 unit postcodes; the build merges them into the geo map. **This retires H3-2:** the OS Places API key is no longer required — manual reference points (OSM/OS grid) are sufficient, and the geocoder (Nominatim, key-free) keeps everything else. H3-2 remains the *fallback* if a manual coordinate proves wrong (A2).

**New file `data-raw/manual-geo-ni.json`** (exact schema; entries sorted code-unit ascending by postcode):
```json
{
  "asOf": "2026-10-29",
  "source": "Operator manual reference (OSM / OS grid) for the 9 BT unit postcodes that Nominatim cannot resolve (ADR-0021). ODbL attribution already covered by the site footer.",
  "entries": [
    { "postcode": "BT13 1AD", "lat": 54.535, "lon": -5.875 },
    { "postcode": "BT13 3BW", "lat": 54.540, "lon": -5.880 },
    { "postcode": "BT42 1GP", "lat": 54.631, "lon": -5.719 },
    { "postcode": "BT42 1NW", "lat": 54.625, "lon": -5.716 },
    { "postcode": "BT42 2PB", "lat": 54.628, "lon": -5.720 },
    { "postcode": "BT42 3JU", "lat": 54.635, "lon": -5.722 },
    { "postcode": "BT42 4JA", "lat": 54.630, "lon": -5.724 },
    { "postcode": "BT63 6JS", "lat": 54.732, "lon": -5.524 },
    { "postcode": "BT79 0NR", "lat": 54.730, "lon": -5.600 }
  ]
}
```
**The lat/lon values above are the operator's to fill with verified coordinates (H3-2 manual-review sub-step, §10).** Until then the file ships with `entries: []` (schema valid) and the build is green.

**Merge point (exact, in `scripts/build-data.mjs`):** after the `postcode-geo.csv` loop that builds the `geo` Map, before `geoOf`/nearest-hospice:
```js
// ADR-0021: operator manual geo for the 9 unresolvable BT unit postcodes.
// Committed file, provenance in data/README.md; manual entries win over geocoder.
const manualGeo = JSON.parse(fs.readFileSync('data-raw/manual-geo-ni.json', 'utf8'));
for (const e of manualGeo.entries) { geo.set(e.postcode, { lat: e.lat, lon: e.lon }); }
```
- **Why a Map merge and not a CSV append:** `postcode-geo.csv` is geocoder output with its own provenance columns; mixing manual rows into it would make provenance unsound for the other 10k+ rows. A separate committed file keeps "which coordinates are which provenance" machine-checkable (nearest-hospice assignment then treats the 12 practices like any other placed practice — **ADR-0005 invariant preserved**: manual coordinates are just input points).
- **Fail-fast:** if `manual-geo-ni.json` is present, it must parse, entries must be sorted, lat/lon in UK range (−12 < lon < 3, 49 < lat < 60); otherwise exit non-zero (same convention as the build-data assertions).

**Provenance (ADR-0013):** one row in `data/README.md` raw-inputs table — `manual-geo-ni.json`, source "operator manual reference, OSM grid", date `2023-10-29`… correction: `2026-10-29`, no URL (manual), notes: which 9 postcodes + why (Nominatim gap).

**AC3 fallback (if the operator coordinates are not ready before the build lock):** ship `entries: []`; the 12 practices remain unplaced; the existing neutral wording (hide-not-delete, R12) already covers them; `data/README.md` + About page document the gap (already done in Cycle 2); `validate-tessellation.mjs` exit 0 unaffected. Disjunct A then falls to its "12 NI practice … documented" branch — **still a pass.**

## Appendix A — exact unplaced dataset (source of truth)

12 practices, all `nation = ni` (verified from `public/data/practices.json` @ HEAD): ni-103, ni-104, ni-304, ni-310, ni-317, ni-325, ni-328, ni-455, ni-654, ni-657, ni-662, ni-663 — postcodes per the §5 table; 9 distinct unit postcodes. Any Coding/QA count check uses these ids, not a re-derived guess.

## 6. Logo refinement (AC4, ADR-0022)

**Current mark (verified, `public/logo.svg`, viewBox 0 0 64 64):** 4 elements — blue pin triangle `M24 30 L32 54 L40 30 Z`; blue disc (32,26) r18; white disc (32,26) r12; blue heart, lobe tops at y=21, tip (32,32); `aria-label="Hospice Info"`.

**Legibility problem (AC4):** at 16 px the white inner disc + blue heart create two nested boundaries and a thin blue heart on white — the smallest element loses. Fix = **invert the heart**: white heart on the blue disc, white disc deleted.

**New `public/logo.svg` (exact, 3 elements, no text, no gradients) — the
Coding stage replaces the full contents of `public/logo.svg` with this exact
file (replacing the current 4-element on-disk mark):**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Hospice Finder UK">
  <path d="M24 30 L32 54 L40 30 Z" fill="#1d4ed8"/>
  <circle cx="32" cy="26" r="18" fill="#1d4ed8"/>
  <path d="M32 31.5 C 29.5 28.5, 26.5 27, 26.5 24 C 26.5 22, 28 20.5, 30 20.5 C 31.2 20.5, 32 21.5, 32 22.5 C 32 21.5, 32.8 20.5, 34 20.5 C 36 20.5, 37.5 22, 37.5 24 C 37.5 27, 34.5 28.5, 32 31.5 Z" fill="#ffffff"/>
</svg>
```
Changes vs current: (1) white r12 circle removed; (2) heart fill `#ffffff`; (3) heart shifted −0.5 y (lopes 20.5–31.5, tip 31.5 — centred on the disc centre y=26, was 21–32 centred 26.5); (4) `aria-label` → "Hospice Finder UK" (AC1). Palette unchanged (`#1d4ed8` is the existing site accent in `src/styles.css`; white already present).

**Asset plan (SVG only, ADR-0008):** favicon stays `public/logo.svg` (`index.html` link unchanged); manifest icon unchanged (`sizes: "any"`); `AppShell.tsx` header `<img src="/logo.svg" width="28" height="28">` unchanged; `og-image.png` is a separate operator asset (§3.8), not a rasterisation of this file. No new dependencies, no new asset pipeline, no `public/` residue (no orphaned files — AC4: the only logo file is `logo.svg`).

**Why invert over alternatives:** keeping blue-heart-on-white (status quo) fails AC4 at 16 px; a larger heart inside the white disc still leaves 4 nested edges; a red heart adds a second brand colour (no, the accent stays). Inversion = maximum contrast (white on blue), 3 elements instead of 4, and the heart is the largest relative element in the head — the mark reads as "heart pin" at 16, 28, 32 px alike.

**Acceptance (AC4):** `npm run build` exit 0; `npm run preview` → tab favicon legible at 16 px (visual, QA), header mark correct at 28 px; `node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'))"` still parses; `grep -c "circle" public/logo.svg` → 1 (the r18 disc — the white r12 circle is gone); no other `logo*`/`favicon*` files in `public/`.

## 7. GLOSSARY — Cycle 3 additions (this stage finalises the file)

**Title (line 1):** `# GLOSSARY - Hospice Finder UK` (was `… - Hospice Catchment Map`) — definition, not production (brand rename, ADR-0023).

**New "Cycle 3" section appended after existing entries** (5 terms, vocabulary from research §7.3 + this doc):

| Term | Definition (one line, GLOSSARY style) |
|------|---------------------------------------|
| **static prerendering** | Emitting one crawlable HTML file per routable URL (per-page `<head>` + empty `#root` + boot script) as a post-build step, so crawlers read real document titles/meta/JSON-LD without executing JS. |
| **site URL** | The one canonical `SITE_URL` (`https://hospiceinfo.pages.dev`), sourced in `data-raw/site-config.json` (ADR-0009 pattern) and used by canonical links, Open Graph, and sitemap entries. |
| **canonical URL** | The `<link rel="canonical">` value on each page — the exact served `.html` URL (home: `/`) — so search engines consolidate one identity per page. |
| **Open Graph image** | `public/og-image.png` (1200×630), referenced by `og:image` on every emitted page for social-link previews. |
| **hash-redirect guard** | The ~10-line snippet in `src/main.tsx` that, on a real-path load with an empty hash, replaces the URL with the matching `#/route` so the hash router lands on the intended page (ADR-0016; closes R1). |
| **manual pin** | An operator-supplied latitude/longitude for a postcode the geocoder cannot resolve, stored in `data-raw/manual-geo-ni.json` and merged into the build's geo map (ADR-0021). |

Existing entries: **preserved verbatim** (the GLOSSARY title-line rename and Cycle 3 section were already applied on 2026-10-29 — Coding reads the file and verifies line 1 and the EOF section; it does not rewrite them).

## 8. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| R1 (Blocking, research) — empty hash on real-path load | Guard, §3.5 (ADR-0016). Acceptance: `npm run preview` + direct load of `/about.html` renders the About page, not the map. |
| R2 — live hostname `https://hospiceinfo.pages.dev` unverified | Human check §10 before build lock; `SITE_URL` is config, fixing it later is a one-line + rebuild. |
| R10 (research) — non-deterministic build | §3.2 rules 1–7 enforced in the script; QA double-build byte-compare (§9). |
| Research §3.4 legal guard (unnumbered — the risk list ends at R13) — third-party JSON-LD reads as endorsement | No-endorsement guard §3.4 (A3/A4). |
| R12 (research) — link surface for pallets | Guard maps `/hospice/<id>` to the map view; documented, not promised (§3.5) (A7). |
| New: Pages 404 route vs unknown-hash behaviour | `404.html` shells out to the map (§3.8) — consistent with unknown-hash behaviour; no new SPA route. |
| New: `dist/` bloat | 161 shell pages ≈ 1–2 kB each ≈ < 300 kB total; map payload (6.79 MB catchments) shipping unchanged (ADR-0010 P5 already applied). Acceptable. |
| New: hostname change later (custom domain) | One config value (§3.7); no code coupling; ADR-0014 deployment untouched. |
| New: manual coordinates wrong | H3-2 OS Places is the verified fallback (A2); coordinates are data, not code — wrong pin is a one-line data fix + rebuild; neutral wording covers any residual unplaced (AC3 fallback §5). |

## 9. Verification protocol (done-when)

Every check below must pass; each maps to an AC or invariant. All commands are run from the repo root.

1. **Byte-identity, data:** `npm run build-data` → record SHA-256 of `public/data/*.json`; repeat `npm run build-data` → identical set. **Re-baseline:** the Cycle 2 build-data anchor set (`dc261185 e11322ba 2a87a374 5628d8f7`) is replaced by the new hash set after the §5 merge lands. `docs/build-log.md` does not exist yet — it is a Coding deliverable: one line per build cycle (date + 4 SHA-256 prefixes of the build-data outputs), seeded with the Cycle 2 line at the anchor set above; Coding records the new Cycle 3 line there; both `build-data` runs within the cycle must agree with each other.
2. **Byte-identity, dist:** `npm run build` ×2 (full: `tsc -b && vite build && node scripts/prerender.mjs`) → `dist/` tree byte-identical (compare SHA-256 of every file, map keyed by relative path).
3. **Tessellation:** `node scripts/validate-tessellation.mjs` → exit 0.
4. **AC1 rename:** `grep -rni "hospice catchment map" index.html public/ src/` → **zero hits** (case-insensitive; `package.json`, `docs/`, `GLOSSARY.md` line-1 historical, ADR files exempt — G6 check, research §7.1).
5. **AC2 crawlability:**
   - `dist/` contains exactly 171 emitted files (1 index + 6 info + 161 hospice + 3 infra) — count == `hospices.json length + 7` (also enforced inside `scripts/prerender.mjs`, §3.1);
   - `dist/sitemap.xml` parses as XML; `<loc>` count == 168 (161 + 7);
   - `dist/robots.txt` matches §3.6 verbatim;
   - every `dist/hospice/<id>.html` id ∈ `hospices.json` ids (and vice versa);
   - `npm run preview` → direct load `/about.html` renders the **About page** (R1 closure), direct load `/` renders the map; `/hospice/ni-r1.html` renders the map with correct `<title>` `… - Hospice Finder UK` in the tab.
6. **AC2 HTML validity:** one spot-check page (e.g. `dist/hospice/hull-east-yorks.html`) parses: exactly one `<title>`, one `rel="canonical"`, one `ld+json` script, `og:*` set complete per §3.3.
7. **AC3:** `hospices.json`: `wales >= 0` (tolerated 0, G3) with landing chain no-op green; unplaced-practice count ≤ 12 exactly the Appendix A ids (0 if manual coordinates landed) — count from data, not derivation; `data/README.md` carries provenance rows for `manual-geo-ni.json`, `site-config.json` `siteUrl` documented; §4 chain commands runnable (dry-run confirm on `[]` file).
8. **AC4:** `grep -c "circle" public/logo.svg` → 1; `npm run preview` favicon legible at 16 px (visual); manifest parses (node JSON.parse).
9. **Determinism:** the `dist/` compare in (2) is itself rule 7 of §3.2 — the two build-data/dist commands above are the enforcement.

**Done-when =** all 10 numbered checks green + GLOSSARY title/section updated + 9 ADRs written + `data/README.md` updated rows + `docs/build-log.md` re-baselined anchor recorded. This document (`.agents/architecture.md`) is the specification Coding works from; the PM's work list is the ordering.

## 10. Human verification (operator steps — not blocking code, blocking release confidence)

| # | Item | What exactly | Blocking? |
|---|------|--------------|-----------|
| V1 | **Pages URL** | Open `https://hospiceinfo.pages.dev` in a browser — confirm the live site loads. If the slug resolved to a different hostname, fix `site-config.json` `siteUrl` and rebuild (one line). | Yes — before build lock (R2) |
| V2 | **og-image.png** | Generate the final 1200×630 image (`#1d4ed8` + white wordmark + heart-pin mark) and commit to `public/og-image.png`. The reference ships either way (V2 = quality, not validity). | No (brand quality) |
| V3 | **H3-1 — CIW email** | Send the email drafted in `data/README.md` (Care Inspectorate Wales data request, drafted 2026-10-16) to the CIW contact; record send date + response channel in `data/README.md`. | No (G3 tolerates silence) |
| V4 | **H3-2 — manual NI coordinates** | Fill `data-raw/manual-geo-ni.json` `entries` with verified lat/lon for the 9 postcodes (§5 table — source: OSM place points / OS grid). Until filled, `entries: []` ships (build green, 12 remain unplaced — documented, passes). | No (AC3 has fallback branch) |
| V5 | **H3-3 — Wales authed fetch** | If the CIW reply requires log-in to download, perform the authed fetch (session step); save the CSV as `data-raw/wales-hospices-2026-10.csv`. (If plain-CSV reply, skip — landing chain §4.) | No (G3) |

V1 is the only pre-lock gate; V2–V5 land post-merge as data refreshes (each triggers the full §4/§5 chain + re-baseline).

## 11. Open questions for the Reviewer (stage 3)

1. **Extensionless URLs as a future option:** `.html` URLs were chosen for zero-config Pages serving (§3.1). If SEO preference later outweighs, the migration = `_redirects` file + canonical URL update (all config, no code). Accepted as-is?
2. **R12 debt:** `/hospice/<id>.html` lands on the map (guard §3.5) — documented, not promised. Is "no deep-linking" acceptable for Cycle 3, with deep-linking into the selected panel filed as a Cycle 4 candidate?
3. **og-image brand:** placeholder ships; final mark is an operator asset (V2). Any brand-constraint the Reviewer wants asserted (e.g. minimum text size, wordmark casing "Hospice Finder UK")?
4. **`siteUrl` in `SiteConfig` interface** is unused by the app (prerender reads the JSON). Mirror-completeness (ADR-0009) says include it; unused-field lint says drop it. Recommend: keep (complete mirror); flag for Reviewer's call.
5. **Re-baselined anchor recording location:** propose `docs/build-log.md` (Coding deliverable, §9 check 1 — seeded with the Cycle 2 line at the anchor set `dc261185 e11322ba 2a87a374 5628d8f7`) gets a "Cycle 3 anchor" line (date + 4 hashes). Confirm the location the QA stage should read.

