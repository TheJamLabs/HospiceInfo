# ADR 0025 — First-load layer state: charity shops and GP practices both OFF

**Status:** accepted (2026-10-30)

## Context

Cycle 4 item 1 (owner decision): both the shop layer and the GP layer are
**off** on first load. Today `src/App.tsx` holds `showShops =
useState(true)`; there is no GP toggle — `MapView` renders every placed
practice via the placement-only `visiblePractices` gate (L251–254). The
choice is a per-session map-clutter setting, not a user preference worth
persisting (OQ4).

## Decision

- `src/App.tsx`: `showShops` flips to `useState(false)`; new
  `showGps = useState(false)` (name per feature text).
- **In-memory only** — not persisted; a refresh resets to both-off. The
  theme key `hfuk-theme` is the app's only persisted preference.
- `MapView` receives a `showGps` prop; the GP render list is gated exactly
  the way `visibleShops` works (L265): when false, the rendered list is
  empty → no GP bucket divIcons, no GP CircleMarkers, no GP popups.
- **Catchment polygons are not layer-gated** (OQ1): the item text is about
  *markers*; the tessellation is the product's core content and stays
  visible with both layers off.
- Header `headerExtras` = switch "Charity shops" → switch "GP practices"
  (`id="gpsToggle"`) → Source & Method button (order per ADR-0026).
- **Hide-not-delete (ADR-0012) intact:** all data is still fetched and
  parsed; the switches gate rendering only.

## Alternatives considered

- **Persist the layer choices:** rejected — session-scoped clutter setting;
  more persistence surfaces, more code, more flash sources for no spec ask.
- **Gate catchments by the GP toggle:** rejected — would hide the
  product's core content on first load.
- **Shops ON / GPs OFF (ship only the GP toggle):** rejected — owner
  decision is both OFF; the shop default change ships with it.

## Consequences

**Positive:** clean hospice-only first paint; one explicit opt-in per
optional layer; consistent with "hide-not-delete" (data intact).
**Negative (accepted):** users must flip two switches to see non-hospice
content — deliberate, per item 1.
