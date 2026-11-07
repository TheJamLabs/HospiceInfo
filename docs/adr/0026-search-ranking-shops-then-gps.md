# ADR 0026 — Search ranking: shops before GPs, sectioned results (and muted GP markers)

**Status:** accepted (2026-10-30)

## Context

Cycle 4 item 2 (owner-locked precedence "shops take precedence over GPs")
applies to layer-control order, search ranking, and marker styling. Today
search is hospice-only: `HospicePanel` filters `hospices` by name/town
substring with a 200 ms debounce; shops and GPs do not appear in results.

## Decision

**Control order (all surfaces):** Charity shops → GP practices →
Source & Method. Shops-block-first is the single source of truth — header
controls, search sections, and legend rows all follow it.

**Search ranking (settles OQ2):**
- **Empty query:** results unchanged — hospice list as today.
- **Non-empty query:** results render as **three sections in fixed order:
  1 Charity shops, 2 Hospices, 3 GP practices.** Matching is
  case-insensitive substring (shop name/town; GP practice name/postcode).
- **Ordering within each section:** name `localeCompare`, then id
  (shops) / postcode (GPs) as tiebreak — a total, deterministic order with
  no tuneable numeric scoring.
- The existing nation filter applies to all three sections.
- **Hide-not-delete (ADR-0012):** unassigned GPs (null lat/lon) are never
  listed, even when matched.

**Marker hierarchy (settles OQ6, exact numbers):**
- Hospice divIcon: unchanged (16 px / 12 px diamond, `var(--hf-primary)`).
- Shop divIcon: unchanged (10 px).
- GP bucket divIcon: 28 px → **20 px**; colour `#1d4ed8` →
  `var(--hf-gp-fill)` (initial `#64748b`, slate — "muted").
- GP CircleMarker radii: 5/7 → **4/6**; base `fillOpacity` 0.85 → **0.55**
  (hover/selection states keep their relative step-up).
- LOD constants (`GRID = 0.5`, `ZOOM_LOD = 11`) unchanged → AC2
  structurally preserved.
- Legend rows reorder: shops block before GP block.

## Alternatives considered

- **Numeric relevance scoring (weighted field/word matches):** rejected —
  a tunable knob with no spec authority, invisible to users; the fixed
  section order already expresses the precedence.
- **Interleaved results by relevance:** rejected — interleaving would break
  the visible shops-over-GPs precedence in the list.
- **Markers unchanged:** rejected — the spec makes GPs smaller *and* muted;
  exact numbers remove coding-side judgement.

## Consequences

**Positive:** precedence is visible on all three surfaces (controls,
search, markers); deterministic listing; GP data retained, only visually
subordinated.
**Negative (accepted):** slate GP markers on light tiles need a contrast
check (covered by the QA light/dark pass); query results group by section,
so a shop hit and an equally-typed practice never appear side-by-side.
