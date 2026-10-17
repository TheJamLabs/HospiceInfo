# ADR 0004 — Hash-derived per-hospice colour, no stable 300-colour identity

**Status:** accepted (2026-10-16)

## Context

The current map colours the 20 catchments with a fixed 20-swatch `PALETTE`
index (`PALETTE[i % PALETTE.length]`). UK-wide there are ~300 hospices. A
stable per-hospice colour identity for 300 entities is not buildable: 300
distinguishable hues do not exist, a legend of 300 entries is unusable
(feature.md rule 5 rejects it), and a re-fetch of a register that reorders
rows would silently recolour everything if the palette is index-based.

## Decision

Generate one colour per hospice from a **stable hash of its `id`**:

```
hue  = FNV-1a(id) mod 360
colour = hsl(hue, 65%, 45%)   → hex, committed in public/data/hospices.json
```

- FNV-1a (32-bit), the same id that ADR 0002 fixes — so the colour is
  **stable across rebuilds from committed files** and **independent of list
  order**.
- Fixed S=65% / L=45% keeps every hue legible on both light and dark map
  tiles; the exact S/L are a display constant, not per-hospice data.
- The colour is used **only** for: the selected hospice's polygon/marker, the
  hovered/selected practice dots (existing `hosp?.color` pattern), the
  hospice marker, and the shop markers of that hospice. There is no
  map-wide 300-colour display.
- The old 20-swatch `PALETTE` is retired. The 20 curated catchments get their
  hash colours like every other hospice.

## Alternatives considered

- **Committed 300-colour palette file (e.g. an extended `PALETTE`).** Fails
  the "no 300-entry legend" rule, and any re-fetch that changes row order
  recolours the whole map (the exact failure mode the id-hash avoids).
  Rejected.
- **Per-nation palette (4 palettes of 75).** Indistinguishable within a
  nation at map scale, and the nation filter already groups by nation, so a
  single hue per hospice is the relevant distinction. Rejected.
- **Colour only on selection, neutral grey otherwise.** Matches feature.md,
  but the practice-dot colour-by-catchment is an existing, valued pattern
  (the Legend note says "coloured by catchment"); keeping it for the
  selected/hovered subset preserves the interaction without a 300-colour
  display.

## Consequences

- **Positive:** stable, order-independent, reproducible (a pure function of
  `id`); zero new UI surface; the 20-colour legend fits in the modal as a
  20-row list.
- **Positive:** a hospice added in a future phase keeps the same colour only
  if its id is unchanged — the id (ADR 0002) is the stable anchor, not the
  colour.
- **Negative (accepted):** two same-nation hospices can hash to similar hues
  (300 hues into 360). The colour is never the *only* discriminator — name
  and town always accompany it (panel row, tooltip, selection banner).
- **Negative (accepted):** the 20 original catchments lose their familiar
  colours. Documented in the Methodology modal ("the 20 original colours are
  replaced by hash colours; the old palette is retired").
