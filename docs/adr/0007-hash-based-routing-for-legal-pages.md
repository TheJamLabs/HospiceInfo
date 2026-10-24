# ADR 0007 — Hash-based routing for public pages (no new deps)

**Status:** accepted (2026-10-21)

## Context

The feature requires several new public-facing pages: Feedback, Corrections log,
About, Privacy Policy, Licences & Attribution, Accessibility Statement. The
existing app is a single-view SPA without a router (React-Leaflet app), with
all navigation handled by a modal for Methodology. The app currently has no
routing, and the new pages must be integrated without introducing new runtime
dependencies on Cloudflare Pages.

Options for integrating multiple views:

1. **Hash-based sections in a single entry app**: new pages rendered via URL
   fragments (e.g. `#feedback`, `#corrections`, `#about`). No router library,
   no multi-entry. Hash fragments never reach the server; unknown hashes are
   handled client-side by rendering the default (map) view, so no server-side
   catch-all is needed.
2. **Vite multi-entry**: separate `index.html` files per page, reusing a shared
   component library (header, footer, panel, map). Some duplication in the
   shared components.
3. **React Router**: dedicated router library; would add a runtime dependency.

The site targets Cloudflare Pages (static only for data; map tiles are fetched
at runtime). Any `#page` deep link loads `/index.html` (the server only ever
sees the path, never the fragment) and the client renders the page — no
fallback configuration is required.

## Decision

**Use hash-based routing in the existing single-entry SPA**. The requirement is
to minimise new runtime deps (only the OSM map tiles are fetched) and keep the
architecture simple for Cloudflare Pages.

**Important:** Hash fragments (`#...`) are never sent to the server. They are
handled entirely client-side by the browser. This means:

- A URL like `https://example.com/#feedback` shows the Feedback page without
  any server-side routing.
- Cloudflare Pages (or any static server) does not see the hash. The server only
  receives `/` (the path without the hash).
- Vite's default catch-all on the server is **not involved** in hash routing.
  It would only be used for requests like `/unknown-route` (no hash), where
  the server routes to `index.html`. For hash-based routing, the server simply
  serves `index.html` for any path, and the browser handles the hash.

### Implementation

- A shared `<AppShell>` component renders header/navbar and footer plus
  `<MapView>`, `<HospicePanel>`, `<Legend>`, `<Methodology>`.
- New pages (`FeedbackPage`, `CorrectionsPage`, `AboutPage`, `LegalPage`,
  `AccessibilityPage`) are separate React components.
- A simple `useRoute()` hook reads `window.location.hash` (or `#` if none)
  and returns the page key.
- If the hash is not a known page, render the default (map) page.
- Each new page renders its content in the main body area; no router state.
- The header renders a nav with links like `<a href="#feedback">Feedback</a>`
  that update the hash; `useRoute()` renders the default (map) view for
  unknown hashes, so deep links always yield content.

### Navigation and footer

Header: new nav bar with links to all pages (spaced evenly, no bootstrap
`data-bs-*` for now).

Footer: links to all pages plus attribution (OSM, ODbL, CQC, Care Inspectorate)
and acknowledgements. The footer text lives in a constant in `src/lib/siteConfig.ts`
(the shared operator source).

### Why not Vite multi-entry?

Multi-entry would duplicate the header, footer, and useAppData fetch logic
across files; more code to manage and test. The single-entry pattern is already
in place for the map app and works for this purpose.

### Why not React Router?

Adds a runtime dependency; the team's design rule is to avoid new deps unless
truly required. Hash-based routing is sufficient for this feature.

### Open risks

- Deep linking to an unknown hash: the client-side `useRoute()` fallback
  renders the default (map) view.
- Browser back/forward navigation: `useRoute()` listens to the `hashchange`
  event; optionally scroll to top on hash change.

## Alternatives considered

1. **Multi-entry (rejected)**: redundancy and complexity for minimal gain.
2. **React Router (rejected)**: an extra runtime dependency; unnecessary.

## Consequences

### Positive

- **Zero new runtime deps**: keeps the build footprint minimal.
- **Single source** for layout: header, footer, panel, map shared.
- **Simple to implement**: the feature's work list stays focused; no new
  architectural patterns to learn.

### Negative (accepted)

- **No state hydration on reload**: user must refresh to get back to the app
  state; map state is lost on reload (existing pattern).
- **Hash visible in URL**: stakeholders may consult a cleaner URL scheme; for
  now this is acceptable and low-risk.
