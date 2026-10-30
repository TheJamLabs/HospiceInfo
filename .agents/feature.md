# Feature: Cycle 3 — name, SEO/crawlability, data gaps, logo

Renaming the live UK hospice catchment map to **Hospice Finder UK**, adding
full static prerendering for crawlability/SEO/AI-friendliness (real paths,
per-hospice pages, meta/OG/JSON-LD, sitemap/robots), filling the two remaining
UK data gaps (Wales hospices, 12 unplaced NI practices), and refining the
heart+pin logo mark.

## Agreed scope (James, 2026-10-29)

1. **Name** — "Hospice Finder UK": replace the site name in the
   `index.html` title, the app header (`src/components/AppShell.tsx`),
   `public/manifest.webmanifest` (name/short_name), and meta/OG strings. The
   Cloudflare Pages slug/hostname (`hospiceinfo`) does not change.
2. **SEO/AI-friendliness (full prerendering)**:
   - Info pages that are hash routes today (`#about` → `/about`,
     `#corrections` → `/corrections`, `#feedback` → `/feedback`,
     `#privacy` → `/privacy`, `#licences` → `/licences`,
     `#accessibility` → `/accessibility`) become real paths, served as
     prerendered HTML.
   - One static page per hospice (~161 URLs, e.g. `/hospice/<id>`) with the
     hospice name, town, nation, data-derived description, catchment summary,
     and source/provider links.
   - Every prerendered page carries: title, canonical, meta description,
     Open Graph + Twitter cards, JSON-LD (Organization on the root; an
     appropriate schema type per hospice — Research decides the best fit).
   - `sitemap.xml` (all prerendered URLs) and `robots.txt` in `dist/`.
   - The interactive map remains the root page (`/`), client-rendered; hash
     state inside the map is interaction, not content. Unknown paths fall back
     sensibly (Research/Architect decide: 404 vs root redirect).
3. **Data gaps (2, code-side work only; human fetches are gates)**:
   - **Wales hospices (0 today).** Re-send/escalate the Care Inspectorate
     Wales data request (HUMAN GATE, James's browser, text in
     `data/README.md`) and/or source Wales hospices from an alternative
     public register so the count is real. Landing follows the documented
     chain (`extract → merge → geocode → build-data → validate-tessellation →
     build`) with provenance in `data/README.md`. No fabricated rows: if the
     human gate does not clear in this cycle, the cycle records the prepared
     fetch spec + reply-landing script as the completion state for this item.
   - **NI practices (12 unplaced; 9 BT postcodes with no OSM/Nominatim
     coverage).** Place them via an alternative geocoder (OS Places free-tier
     — key is a HUMAN GATE — or documented manual pinning), keeping the single
     nearest-hospice assignment rule invariant. Update `postcode-geo.csv`
     provenance and `data/README.md`.
4. **Logo** — refine the existing heart+pin mark in `public/logo.svg`
   (cleaner heart shape and pin silhouette, keep blue `#1d4ed8`), regenerate
   the favicon/OG assets it feeds, and keep recognisable continuity. No new
   mark concept.

## Acceptance criteria

- **AC1 (Name)**: "Hospice Finder UK" appears in the built `dist/` page
  title, app header markup, and manifest; no stale "Hospice Catchment Map"
  branding strings in `dist/` (docs/comments may retain historical mentions).
- **AC2 (SEO)**: `npm run build` emits static HTML for every info path and
  every `/hospice/<id>` URL (count matches `hospices.json`); `sitemap.xml`
  and `robots.txt` are in `dist/` and cover the same URL set; prerendered
  pages contain canonical + OG + JSON-LD; verified against the built `dist/`
  without a running server.
- **AC3 (Data)**: Wales hospices land via the documented chain with provenance
  (count > 0), or the cycle records the human-gate + prepared landing script
  with the exact pending state; the 12 NI practices are placed (or each is
  documented with the specific failed attempt); `node scripts/validate-tessellation.mjs`
  exits 0; a re-run build is byte-identical.
- **AC4 (Logo)**: refined `public/logo.svg` renders legibly at 16px/32px
  (favicon) and scales to the OG image size; wired into `index.html` and
  `manifest.webmanifest`; no orphaned legacy assets.

## Out of scope

- Changing the Cloudflare domain/slug.
- Shop re-scrape of the 3 unreachable curated hospital websites (deferred).
- Pre-launch verification gates G5/W8/G7 (human, tracked in
  `docs/MAINTENANCE.md`).
- Any change to the catchment assignment rule (nearest-hospice haversine —
  an ADR invariant).
- Mobile performance work (Cycle 2; W8 awaits G5's m1).

## Human gates (Cycle 3)

- **H3-1**: James re-sends/escalates the CIW data request (browser) once
  Research confirms the exact text + channel.
- **H3-2**: OS Places API key (free tier) for the NI BT postcodes, if the
  chosen geocoding path needs one.
- **H3-3**: James's browser fetch of a Wales alternative source, if Research
  identifies one that needs a login/authenticated session.
