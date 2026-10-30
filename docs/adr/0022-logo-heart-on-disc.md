# ADR 0022 — Logo: white heart on blue disc, 3 elements, centred heart

**Status:** accepted (2026-10-29)

## Context

AC4 (Cycle 3) refines the site mark for the "Hospice Finder UK" identity
(ADR-0023). The current `public/logo.svg` is a 52×52 disc with a white heart
plus a visible white ring (a `circle` at `r=12`-class scale) that reads as a
separate decorative element at small sizes, and the heart sits high in the
disc (lobes to tip not centred on the disc centre). Refinement is structural
(decorative element removed, heart optically centred), not a new artwork —
the palette and geometry language stay.

## Decision

One in-place edit to `public/logo.svg` (exact new file in arch §6). The
Coding stage replaces the full contents of `public/logo.svg` with that
exact file:

- **Delete the white decorative `circle`** — element count 4 → 3
  (background blue disc `r=26`, heart path, nothing else).
- **Shift the heart path by −0.5 y** so it is optically centred: lobes
  20.5–31.5, tip at 31.5, heart centroid on disc centre `y=26` (heart
  optics sit slightly above geometric centre).
- **Palette unchanged:** background `#1d4ed8` (blue disc), heart `#ffffff`.
- **Accessibility:** the root `<svg>` carries
  `aria-label="Hospice Finder UK"` (previously the catchment-map name).
- **SVG only:** no rasterisation, no favicons/png derivatives this cycle —
  the mark is consumed by the app, `manifest`, and (as-is, not as
  `og:image`) future assets. `og-image.png` (ADR-0018) is a separate,
  operator-supplied 1200×630 asset.

Acceptance (deterministic, arch §9 check 9):
`grep -c "circle" public/logo.svg` → `1` (only the background disc).

## Alternatives considered

- **Keep the ring, recolor it:** rejected — at 16–32 px the ring fuses with
  the heart edge; simplest correct mark has 3 elements.
- **Full mark re-draw (new path data):** rejected — the heart geometry is
  already well-formed; only element deletion + a 0.5-unit y-shift are
  needed, which keeps the diff to one file and the visual language stable.
- **Rasterised PNG set (favicons, etc.):** rejected — scope expansion;
  the SVG covers every in-app surface and browser favicons render from the
  existing icon files unchanged this cycle.

## Consequences

**Positive (accepted):** the mark matches the ADR-0023 name at every
surface (aria-label, page titles, manifest); the deletion-only edit is
trivially auditable (grep-count acceptance); zero new assets in `public/`.
**Negative (accepted):** the heart is now the sole figure on the disc — a
less "framed" look; accepted as cleaner at small sizes. A future cycle may
derive raster assets (og-image final mark, V2) from this SVG.
