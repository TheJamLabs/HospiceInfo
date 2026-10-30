# ADR 0016 — Hash-redirect guard for real-path loads (closes R1)

**Status:** accepted (2026-10-29)

## Context

The router is the hash router (ADR-0007): `window.location.hash`, no router
library, unknown/empty hash → map view. Cycle 2 security pass finding R1
(Blocking): a direct load of a real path (e.g. `/about.html`) arrives with
an empty hash, so the app renders the map — not the page. Once prerender
(ADR-0015) ships real `.html` pages, the mismatch becomes visible: the
document `<title>` says "About" while the loaded app shows the map. The fix
must not introduce a router library (ADR-0007), must not read query strings
(ADR-0005/Q1 consistency), and must keep the six existing page components
untouched.

## Decision

A ~10-line IIFE in `src/main.tsx`, before `createRoot(...)` (exact code in
`.agents/architecture.md` §3.5):

- if `location.hash` is non-empty → return (SPA navigation already handled);
- strip leading/trailing slashes from `pathname`;
- `''` → return (home → map, as today);
- `'hospice'` → return (placeholder shell → map, R12);
- `'hospice/…'` → `location.replace('#/hospice/<id>');`
- any other path → `location.replace('#/' + path)` (the six info pages);
- **replace, not push** — history stays clean: back from `/about.html`
  leaves the site, matching external-link expectation.

`404.html` loads with an empty hash → guard returns → map view (consistent
with unknown-hash behaviour; no SPA 404 route). The guard is the *only*
route-shipping mechanism; no route is added to the app.

## Alternatives considered

- **History- API routing + Pages `_redirects` rewrites:** rejected — rewrites
  the routing core (breaks ADR-0007), requires a rewrites file for every
  page, and adds a moving part for the same outcome.
- **Per-page inline redirect scripts in the emitted HTML:** rejected —
  routing logic would live outside the app code (two sources of truth).
- **Server-side 301 redirects:** not applicable — zero backend (ADR-0014).

## Consequences

**Positive (accepted):** R1 (Blocking) is closed with a single small,
testable snippet in one file; direct loads land on the intended route; back
button semantics are correct (replace); no query-string surface is
introduced.
**Negative (accepted):** `/hospice/<id>.html` lands on the map view with no
selected panel (R12 documented decision — the page's value is its `<head>`;
"open on the map at this hospice" is *not* promised in Cycle 3 and is filed
as a Cycle 4 candidate, arch §3.5/§11.2); on a real-path load the app boots,
detects the empty hash, and replaces the URL before the first paint of the
map — a single synchronous step, no perceptible flash.
