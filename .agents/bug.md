# Bug report intake — 2026-10-24

## Verbatim report

> map not rendering on desktop

(Provided via `/bugfix map not rendering on desktop`; no additional details,
URL, browser, environment or screenshot were supplied with the report.)

## Intake (lead)

- **Symptom:** on desktop, the map does not render on the map route (`#map`,
  the catch-all default route).
- **User-reported repro:** unknown — no environment (local `npm run dev` vs.
  deployed Cloudflare Pages), no browser, no description of what is visible,
  no console output.
- **Expected behaviour:** the interactive Leaflet map (base tiles, catchment
  polygons, GP-practice/hospice/shop markers) renders to the right of the
  filtered-hospice panel on desktop.
- **Severity:** blocking — the map is the app's primary content.

## Environment context (from repository state at intake)

- SPA: Vite 5 + React 18 + TypeScript; Leaflet 1.9.4 / react-leaflet 4.2.1;
  deployed to Cloudflare Pages.
- The desktop layout (`AppShell` header/main/footer, `.app` sizing chain) was
  introduced by commit `e4b8503` ("public-ready map", 2026-10-21) and has
  **never been live-verified on desktop**: the previous pipeline's live pass
  gate G5 covers mobile only and is still open.
- No test infrastructure exists in the repo (no vitest/jest config or
  scripts) — relevant to the Stage 3 regression-test requirement.

## Gate (per bugfix skill)

Stage 2 (Root Cause) must not be dispatched until Stage 1 (Research) has
either **reproduced** the bug or produced a **confident root-cause analysis
backed by code evidence**. If reproduction is not achievable, Research returns
what it still needs from the user and the lead asks the user specific
questions — never guess at the root cause.
