# Feature: Make the map public-ready

Take the UK-wide hospice catchment map into public release: coastline-clipped
catchments, per-point hospice tooltips, public-safe UI, a data feedback and
corrections mechanism, About/legal pages (UK regulatory compliance), and a
verified mobile experience. Hosting target: Cloudflare Pages.

## Confirmed scope (grill session, 2026-10-21)

### Acceptance criteria

1. **Coastline** — practice-derived Voronoi catchments are clipped to the UK
   land/coastline polygon (OSM `natural=coastline`, same ODbL family as the
   existing OSM data). No catchment cell extends into the sea. The data build
   and tessellation validation are updated for the clipped output and the
   rebuild remains byte-identical on re-run.
2. **Tooltips** — hovering/tapping a charity-shop or GP-practice marker shows
   the name of the hospice it is assigned to. Existing catchment-polygon
   interaction is preserved.
3. **Public-safe UI** — no on-screen indicator, count, or list entry
   highlights internal data issues: shops outside their own catchment,
   unassigned practices, degenerate cells, etc. These flags remain in the
   build/data for internal curation only.
4. **Feedback + corrections** — every interactive marker carries a
   "Disagree with this data?" affordance opening a mailto to the public
   contact address with the point/hospice identified. A feedback page explains
   what can be challenged and how to do it. A public **Corrections log** page
   (empty initial state, with a note that entries are added when corrections
   are applied). A documented internal curation workflow (script(s) in
   `scripts/` + docs) for applying amendments to the underlying data and
   re-running the pipeline, with the applied correction recorded in a
   corrections data file that feeds the public log page.
5. **About + legal** — an About page covering: what the site is and what it's
   for, who runs it (named individual — placeholder name until the operator
   provides their exact name), how the data is built (method summary), and
   where the data comes from (CQC, Care Inspectorate Wales, RQIA, data.wales,
   OSM, the geocoder). Legal pages compliant with UK law: Privacy Policy
   (UK GDPR + Data Protection Act 2018 — no cookies, no analytics/tracking,
   the only personal data is feedback sent by email), Licences & Attribution
   (ODbL attribution for OSM-derived data and CQC-derived data), Accessibility
   Statement (target WCAG 2.1 AA). Navigation links all new pages.
6. **Mobile** — the site works well on mobile: side panel/controls adapt
   (overlay/sheet behaviour on small screens), markers are tappable, zoom
   controls work, no horizontal scroll, text readable. Verified by building
   and checking in a mobile-emulated browser.

### Out of scope

- No backend, form service, analytics, telemetry, or authentication.
- Applying any actual data corrections (mechanism and workflow only).
- Closing the existing Wales/NI register gaps (remain documented as before).
- Changing hospice/GP data sources or the catchment method for existing data.
- Changes to the pipeline contract (QWEN.md) or agent definitions.

### Key decisions (with rationale)

- **OSM coastline for clipping** (grill session) — consistent with the
  existing ODbL OSM-derived data; no new licence; `polygon-clipping` is
  already a devDependency.
- **Email + public corrections log** (user choice) — mailto requires no
  backend and keeps the UK GDPR surface minimal; the published corrections
  log gives visitors accountability for what was challenged and fixed.
- **Named individual operator, placeholder for now** (user choice) — legal
  pages and all mailto links use placeholders (clearly marked) that the
  operator swaps in before publishing.
- **Cloudflare Pages hosting** (user choice) — static deploy; the privacy
  policy states hosting by Cloudflare (multi-region edge including UK).
- **Public-safe means hide, not delete** (grill session) — issue flags stay
  in the data build so curation validation is unchanged; the UI simply
  stops rendering them.
