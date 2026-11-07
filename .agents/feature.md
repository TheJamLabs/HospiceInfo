# Feature: Cycle 4 — map-first defaults, layer UX, theming, rebrand

A focused UI/UX cycle on the public-ready Hospice Finder UK map: the map
loads hospices-only by default with shops and GP surgeries as opt-in
layers (shops taking precedence over GPs), every page gets a clear way
back home, the About-page footer overlap is fixed, light/dark theming is
added with system follow-through and user override, all "published
service area" UI traces are removed (provenance stays in the data layer
and Methodology/About), and the whole site is rebranded past the vanilla
Bootstrap look using a Designer-proposed visual concept picked by James.

## Agreed scope (James, 2026-10-30)

1. **Hospices-only first load** — on page load, GP surgeries and charity
   shops are hidden; only hospices render. Each auxiliary layer is
   toggleable from a layer control in the header (`src/App.tsx`). The
   `showShops` default flips true → false; a GP-practice toggle is added
   (practices currently always render).
2. **Shops take precedence over GPs** — both layers stay OFF at first
   load. In the layer controls, the shops switch is listed before the GP
   switch. Search results rank shops above GP practices. GP markers are
   smaller and more muted than hospice and shop markers. GP data stays —
   the Start-here flow and catchment tessellation keep using it.
3. **Footer layout fix** — the About page (desktop) has overlapping
   footer text; the footer (`src/components/AppShell.tsx`,
   `app-footer d-flex flex-wrap align-items-center justify-content-between
   gap-2`) must never collide on any viewport.
4. **Back to home** — every info page (About, Feedback, Corrections,
   Privacy, Licences, Accessibility) offers an obvious way back to the
   map, e.g. a "← Back to map" affordance in the page header (the header
   logo links to `#map` already; the return must also be explicit on each
   page).
5. **Light/dark mode** — a 3-state Auto/Light/Dark control in the header.
   Auto follows `prefers-color-scheme`; an explicit Light/Dark choice
   overrides the system and is persisted across visits (localStorage).
   Applies to the whole SPA including Bootstrap 5.3.3 surfaces and Leaflet
   controls, with no unthemed flash on load.
6. **Remove "Has published service area" — all UI traces** — delete the
   hospice-panel filter switch (`src/components/HospicePanel.tsx`), the
   "published service area"/"approximated" badge on the selection card
   (`src/App.tsx`), the "approx" badges in the list, and the
   "Published service area / Approximated catchment" line in the MapView
   tooltip (`src/components/MapView.tsx`). Provenance is NOT removed from
   the data layer (`kind` field stays), the Methodology modal, or the
   About/Legal prose.
7. **Rebrand (not vanilla)** — the Designer stage (2B) proposes 2–3
   visual concepts — palette, typography, header/logo direction (built on
   the Cycle 3 heart+pin mark, ADR-0022) — with a mock per concept. James
   picks one (H4-1). Coding then applies the chosen concept across header,
   footer, map chrome, cards, info pages, and the logo/favicons where the
   concept changes them. The result must not look like stock Bootstrap.

## Acceptance criteria

- **AC1 (first load)**: initial render shows hospice markers only; shop
  and GP-practice markers are not rendered until their layer switch is
  turned on; both switches default OFF.
- **AC2 (precedence)**: in the layer controls, shops are listed before
  GPs; a search matching both returns shops first; GP markers are
  smaller/muted relative to hospice and shop markers; the Start-here flow
  and `validate-tessellation` are unchanged (practices still feed
  catchments).
- **AC3 (footer + home)**: no footer text/link overlap on the About page
  (or any page sharing the footer) at desktop (≥1024px) and mobile
  widths; every info page has a visible back-to-map control that returns
  to the root map.
- **AC4 (theme)**: on Auto, the site matches the OS light/dark setting;
  an explicit Light/Dark choice overrides the system and survives a full
  page reload (persisted); Leaflet controls, Bootstrap components, and
  all info pages render legibly in both themes; no unthemed white flash.
- **AC5 (published-service-area removal)**: zero "published service
  area" / "approximated" / "approx" UI strings in `src/` outside the
  provenance prose the decision keeps (Methodology modal, About/Legal
  pages, data layer `kind`); the panel filter switch is gone;
  `hospices.json` and the `kind` field untouched; build + tessellation
  green.
- **AC6 (rebrand)**: `.agents/design.md` proposes 2–3 concepts; James's
  chosen concept is applied across every page; the chosen palette and
  typography are visible in the map chrome, cards, header, footer, and
  info pages; `public/logo.svg` and any re-derived favicon/OG assets stay
  consistent with the chosen concept; no half-applied theme.
- **AC7 (regression)**: `npm run build` (`tsc -b && vite build &&
  node scripts/prerender.mjs`) exits 0 and is byte-identical on re-run;
  169 HTML shells / 168 `<loc>` invariant; `node
  scripts/validate-tessellation.mjs` exits 0; 0 new Blocking findings
  from QA/Security.

## Out of scope

- Any change to the catchment assignment rule (nearest-hospice haversine
  — an ADR invariant) or the data layer (`kind` field, provenance).
- Fetching new data; pre-launch verification gates G5/G7/W8 remain open
  (human, tracked in `docs/MAINTENANCE.md`).
- Cloudflare slug/hostname changes.
- Non-UI performance work.

## Human gates (Cycle 4)

- **H4-1**: James picks one of the Designer's 2–3 visual concepts
  (Stage 2B). The rebrand work item does not start until the pick is in;
  all other work items proceed.
