# ADR 0027 — Dark theme for the map: CSS overrides only, tiles unchanged

**Status:** accepted (2026-10-30)

## Context

Cycle 4 item 4 ships a dark theme; the map must stay legible in both
themes. Leaflet 1.9.4 / react-leaflet is a pinned npm dep (ADR-0008 — no
new deps), `leaflet/dist/leaflet.css` is a pipeline-managed file we never
hand-edit, and base tiles are OSM standard (light).

## Decision

- **Map chrome (controls, popups, container):** all dark styling lives in
  new `[data-bs-theme="dark"]`-scoped rules in `src/styles.css`, overriding
  only the specific properties of `.leaflet-container`,
  `.leaflet-control-zoom`, `.leaflet-control-attribution`,
  `.leaflet-popup-content-wrapper`, and `.leaflet-popup-tip`. We never edit
  `leaflet.css`; our scoped selectors win the cascade on those properties.
- **Tiles:** `https://tile.openstreetmap.org/{z}/{x}/{y}.png` stays in
  **both** themes. No dark tile provider is committed. If a dark provider
  is wanted later it is a one-line `TileLayer` `url` change behind a
  follow-up decision — risk-accepted debt (OQ7).
- **App-owned map chrome** (divIcon colours, legend card, sheet-fab, popup
  body) inherits the dark palette through the ADR-0028 tokens, so most of
  the dark-mode map work is done by the token plan.
- **QA gate:** pixel/contrast pass in light and dark at 375/1024/1280/1440
  (risk R6 — residual gaps are fix-pass tweaks, not architecture).

## Alternatives considered

- **Dark tiles by default (e.g. CARTO / esri dark):** rejected — new
  attribution surface, new CSP surface, ODbL provenance text is tied to the
  OSM light layer; owner locked "no tile-provider commitment".
- **Edit `leaflet.css`:** rejected — pinned npm package file inside the
  build pipeline; hand-edits would break reproducibility.
- **JS `L.Control` theme-toggle layer:** rejected — the CSS cascade already
  covers the needed properties; no runtime machinery needed.

## Consequences

**Positive:** zero new deps; attribution/provenance untouched; AC7
unaffected (styles are static CSS).
**Negative (accepted):** light tiles under a dark UI look banded, not
fully dark; some Leaflet-internal classes may retain light styling (R6,
QA pass).
