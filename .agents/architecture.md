# Architecture — Public-ready map feature

**Scope:** Stage 2 (Architect). **Reads:** `QWEN.md`, `.agents/feature.md`, `.agents/research.md`, `GLOSSARY.md` (finalised).
**Decisions:** ADR-0006 (land mask clip), ADR-0007 (hash routing), ADR-0008 (Bootstrap JS import), ADR-0009 (site config single source).
**Write scope:** `.agents/architecture.md`; ADRs 0006–0009; `GLOSSARY.md`. No other files.

## 1. Goals / non-goals

### Goals
- Expose the existing UK-wide Voronoi map without exposing backend / curation logic.
- Add dedicated public pages: Feedback, Corrections log, About, Privacy, Licences & Attribution, Accessibility.
- Make catchment boundaries **land-clipped** via OSM coastline geometry (no sea cells).
- Provide a public-facing **corrections log** (`public/data/corrections.json`) with graceful empty-state handling.
- Use **hash-based routing** within a single-entry SPA (no router library, no multi-entry).
- Add **Bootstrap JS** to enable `data-bs-*` modals (Methodology) without extra React state.
- Share one **placeholder operator** source (`src/lib/siteConfig.ts` ↔ `data-raw/site-config.json`) for mailto links, corrections contact, and about/corporate fields.
- Ensure **mobile-first touch design** (≥44px targets) and no horizontal scroll on the map.

### Non-goals
- No backend, form processing, analytics or telemetry.
- No live corrections (no DB, no admin UI); the corrections log is static JSON appended to by humans.
- No cookie consent or privacy script; GDPR interpretation: no cookies = no consent screen; mailto recipients are personal data but transmitted by user action (feature.md bounds).
- No authentication / authorization.
- No live rebuild after deploys; data freshness is out of scope for the feature (build artefacts are treated as immutable for the public map).

## 2. High-level design

### 2.1 Single-entry SPA with hash-based routing

- **Entry point:** `index.html` (Vite) → `src/main.tsx` → `<App>`.
- **Routing:** All navigation is via URL fragment (hash). `<App>` reads `window.location.hash` via a simple `useRoute()` hook and renders one of:
  - `#map` (default) — the live catchment map.
  - `#feedback` — Feedback page.
  - `#corrections` — Corrections log page.
  - `#about` — About page.
  - `#privacy` — Privacy page.
  - `#licences` — Licences & Attribution page.
  - `#accessibility` — Accessibility Statement page.
- **Layout:** A shared `<AppShell>` component renders all pages: header (nav), main content, footer. This allows header / footer to link to all pages without duplicating dependencies across files. (ADR-0007 decision).
- **Fallback:** Note that hash fragments are client-side only and never sent to the server. Hash-based routing works because the unknown hash (at `#map`) renders the default map view via the `useRoute()` fallback — see `src/App.tsx`. **NO server-side catch-all is required**; Vite's default handling is not involved in hash routing. Cloudflare Pages needs no special config for it.

### 2.2 Bootstrap JS as runtime dependency

- **Decision:** Import Bootstrap 5.3 JS bundle via `src/main.tsx`:
  ```ts
  import "bootstrap/dist/js/bootstrap.esm.js";
  ```
  This file is the official ESM entry for Vite (verified: `node_modules/bootstrap/dist/js/bootstrap.esm.js` exists; the minified `bootstrap.esm.min.js` is the bundled ESM build). This enables `data-bs-*` attributes (modal toggle/close) without custom React state code. The trade-off is a documented 6th runtime dependency. (ADR-0008 decision).
- **Implementation:** Replace React-managed modal toggles with `data-bs-toggle="modal"` / `data-bs-dismiss="modal"` attributes on the Methodology modal.
- **No horizontal scroll / large payloads:** If map interaction degrades, switch to Canvas markers via Leaflet renderer; not preemptively applied.

### 2.3 Site configuration single source

- **Two files:**
  1. `src/lib/siteConfig.ts`: TypeScript script specifying the interface and exporting a `SITE_CONFIG` constant. UI pages read from this for mailto subjects/emails.
  2. `data-raw/site-config.json`: Human-editable source of truth, consumed by the build scripts (e.g. `scripts/add-correction.mjs`) and read at runtime by `siteConfig.ts`.
- **Structure:**
  ```ts
  interface SiteConfig {
    operatorName: string;  // e.g. "Hospice Info Team"
    contactEmail: string;   // e.g. "hospice-info@example.com"
  }
  const config: SiteConfig = { /* values from JSON */ };
  export default config;
  ```
- **Swap story:** A human edits `data-raw/site-config.json`, rebuilds the chain once (`npm run build-data` → `node scripts/add-correction.mjs` (if applicable) → `npm run build`), and the entire site uses the same name/email. (ADR-0009 decision).
- **Schema:** The JSON schema in `data-raw/site-config.json` mirrors the `SiteConfig` TypeScript interface exactly: `{operatorName: string, contactEmail: string}`.

## 3. Component & data flow

### 3.1 Map

- **Voronoi**: `build-data.mjs` generates `public/data/catchments.json` with **land-clipped** polygons (per ADR-0006).
- **Map:** Leaflet map displays ~9,552 practice events (Canvas markers) + ~155 hospice markers. Each catchment polygon is drawn per hospice.
- **Python?** No backend server is introduced; all data comes from static files in `public/data/`.
- **Marker rendering:** To handle ~9,552 practice markers without DOM thrashing, the `MapContainer` uses `preferCanvas: true` (mobile performance optimization).

### 3.2 Public pages

- **Feedback**: A static form (no form submission); uses a `mailto:` link to an email address using the shared site config.
- **Corrections log**: A read-only table of entries from `public/data/corrections.json`. If empty (array with single empty object or no items), show a polite "No corrections yet" message.
- **About / Privacy / Licences / Accessibility**: Static React components using the shared site config for operator branding & legal notices.

### 3.3 Data sources

- `data-raw/`: static metadata, including the **land mask** (OSM coastline).
- `data/`: derived JSON, including `catchments.json`, `shops.json`, `hospices.json`, etc.
- **No runtime fetch beyond OSM tiles**: All static content is served from `public/`, with OSM tiles fetched at runtime.

## 4. Mobile-first design

### 4.1 Touch targets ≥ 44px

- Bootstrap default controls (buttons in nav pill, modal close) meet 44px minimum.
- Map markers remain clickable via Leaflet's built-in panes and hit detection; the side panel renders as a Bootstrap offcanvas on small screens, so panel and map controls never overlap a marker's touch target.

### 4.2 No horizontal scroll

- Leaflet container uses `height: 100%` and `width: 100%` on mobile; no horizontal overflow; markers live in Leaflet's default marker pane (above the tiles, below the controls), so they do not conflict with the pan/zoom controls.

### 4.3 Overlay-sheet for nations (future)

- A nations menu could be an overlay sheet (footer nav or header button) that slides up, but the hash-based approach avoids complexity.

### 4.4 `preferCanvas` for many markers

- For ~9,552 practice markers, the `MapContainer` uses `preferCanvas: true` prop to switch to Canvas rendering and prevent DOM thrashing. See `src/components/MapView.tsx`.

### 4.5 Accessibility

- Use ARIA roles for panels; semantic HTML (nav, main, footer).
- Keyboard shortcuts: open/close modal with `Enter` or `Space` on focusable elements; tab order follows DOM.

## 5. Safeguardings: neutralising public-safe surfaces

The following live surfaces on the UI need sanitisation to prevent exposing internal data gaps
and unverified states that could mislead end-users or compromise information quality.
Rule: **hide-not-delete** — do not remove data fields; instead, avoid showing them on screen.

1. **Practice tooltip showing "no catchment match"**
   - Surface: `src/components/MapView.tsx`, the GeocodeTooltip that shows
     `{p.postcode} → {hosp ? hosp.name : "no catchment match"}`.
   - Fix: Replace the default "no catchment match" string with a neutral
     placeholder such as the postcode alone: `{p.postcode}`.
   - Rationale: Users should not be exposed to the fact that geocoding may be
     incomplete for some practices.

2. **ShopMarker's "⚠ Outside its own catchment" badge and special colour**
   - Surface: `src/components/MapView.tsx`, the `ShopMarker` tooltip contains
     `<span className="fw-semibold" style={{ color: SHOP_OUTSIDE_COLOR }}>⚠
     Outside its own catchment</span>` and the marker uses
     `SHOP_OUTSIDE_COLOR = '#e07b00'` when `shop.outsideCatchment` is true.
   - Fix: Remove the warning badge and the special `SHOP_OUTSIDE_COLOR` styling.
   - Rationale: Showing an alarm note draws undue attention to a benign
     geographical variance. Shops continue to render with normal catchment
     colouring; their `outsideCatchment` flag may still exist in the data model
     for backend logic, but the UI no longer alerts on it.

3. **Methodology.tsx / HospicePanel.tsx "unassigned" counts**
   - Surface: `src/components/Methodology.tsx` displays
     `{stats.unassigned ? `, of which ${stats.unassigned} are not geocoded yet`
     : ''}` and
     `src/components/HospicePanel.tsx` shows
     `{totalShown} practices{q ? '' : ` · ${unassigned} unassigned`}
     </span>`.
   - Fix: Remove any on-screen text that exposes the count of practices marked
     "unassigned" (hospiceId === null). The validator already knows that
     certain cells are degenerate (e.g. Wisdom, 0.0002 deg²; Basildon's
     `en-1-17708902164` has no ring); users viewing the public map should not
     be informed of these gaps.
   - Rationale: A public-facing map should not signal data incompleteness unless
     the user is actively engaged in curation; this information is intended only
     for internal QA.

These changes ensure that the live UI does not expose incomplete geocoding,
geographical variance that is benign, or internal QA metrics.

## 6. Validation and rollback

### 6.1 Validation

**Shared ritual (all builds):**
On any build, run `npm run build-data` twice in succession. Assert the resulting
SHA-256 of all `public/data/*.json` files (except `corrections.json`, which is
rebuilt each run, AFTER each run ✅) — they must be identical. This
"byte-identical rebuild ritual" is verified via `scripts/byte-identical.mjs`
(DevOps/qa add-on; not required for feature.md). The land mask file
(`data-raw/uk-land.json`) MUST be committed to the repo in order for this
ritual to be deterministic.

- **Per-file validation:**
  - `scripts/validate-tessellation.mjs`: asserts that all catchment polygons
    are within the land mask (`intersection` validator) and that
    `outsideCatchment` flags are valid. Empty polygons are skipped with
    `if (!pi?.length) continue;` — this is the expected, correct behavior.
  - `scripts/validate-corrections.mjs`: asserts that `corrections.json` is
    valid JSON with required fields.

### 6.2 Rollback

- **Manual rollback:** Replace `public/data/` files with the previous commit
  (land file MUST be committed as part of this, per feature.md).
- **Corrections page:** If the latest corrections block user access or cause
  UI rendering failures, manually revert `public/data/corrections.json` to the
  previous commit SHA.
- **Preventive:** The map is static; no runtime state means rollback is trivial;
  no live deployment pipeline changes are needed.

## 7. Feature acceptance mapping

| feature.md # | Acceptance | Design mapping |
|---|---|---|
| 1 | Clip catchments to the OSM `natural=coastline` land mask; no sea; byte-identical rebuild incl. the land file; slivers/degenerate cells tolerated | ADR-0006: `intersection(unionCell, ukLand)` after per-label union; `data-raw/uk-land.json` committed; box-clip remains a bounds safety net; validator re-expressed (land coverage, same land file, slivers non-fatal); `scripts/fetch-uk-land.mjs` is the documented human step. |
| 2 | Tooltips on shops/GPs show the assigned hospice | §3.1/§5: tooltip body = assigned hospice `{name}, {town}` + postcode line; a practice with no catchment match shows the postcode alone (never "no catchment match"). |
| 3 | Public-safe: no highlighting of shops outside area / unassigned gaps | §5 safeguardings: hide-not-delete across the 3 live surfaces (practice tooltip neutralised; ShopMarker ⚠ badge + `SHOP_OUTSIDE_COLOR` removed — shops keep normal catchment colouring; unassigned counts removed from Methodology/HospicePanel). Flags remain in the data model. |
| 4 | Feedback (mailto) + public corrections log | §2.3/§3.2: mailto link built from `siteConfig.contactEmail`; `public/data/corrections.json` (committed stub `[]`) rendered read-only with a "No corrections yet" empty state; entries follow the §5.1 schema. |
| 5 | About / Privacy / Licences / Accessibility pages + named (placeholder) operator | ADR-0007/ADR-0009: hash routes `#about #privacy #licences #accessibility` (+ `#feedback #corrections`); single-source operator name/email in `src/lib/siteConfig.ts` ↔ `data-raw/site-config.json`, cited on About and in the corrections contact line. |
| 6 | Mobile: ≥44px touch targets, no horizontal scroll, works well at ~9,552 markers | §4: Bootstrap controls meet 44px; full-width Leaflet container with no horizontal overflow; `preferCanvas: true` on `MapContainer` (§4.4); ARIA roles + semantic nav/main/footer (§4.5). |
