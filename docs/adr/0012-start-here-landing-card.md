# ADR 0012 — Start-here landing card on the map (not a page); neutral not-found wording

**Status:** accepted (2026-10-25)

## Context

A first-time visitor lands on the map with no orientation: no explanation of
what the dots mean, no entry point from "my postcode" to "my hospice". James
bound the shape: a **card on the map** (not a dedicated page), running
postcode → practice → catchment → hospice, with persona sections for patient,
fundraiser, and clinician. The not-found case must follow the hide-not-delete
rule — a postcode with no practice must not expose an internal flag.

## Decision

- **One landing card**, `src/components/StartHere.tsx`, anchored top-left of the
  map viewport (`position: absolute; top: 12px; left: 36px; z-index: 1000`;
  above the Leaflet pane, below the zoom controls; no new `flex-direction`, so
  the G6 layout invariant holds). Dismissible via ×; re-openable from a
  "Start here" pill in the panel header.
- **Main flow:** one form (postcode input with `<label>`, "Find your hospice"
  submit, ≥ 44 px target). Lookup is by normalized postcode over
  `useAppData.practices` — no network call.
  - **Found:** 3 lines — practice (`{p.name}, {p.town/pc}`) → catchment
    (`{hospice.name}, {hospice.town}`) → "Open in panel" button that sets the
    panel to that hospice. The assigned hospice is the catchment (single-nearest
    rule, ADR-0005); no separate catchment object is shown.
  - **Not-found:** one neutral line — *"No practice at that postcode. It may be
    outside the mapped area or a new registration. You can search the list or
    let us know."* — with a mailto to the existing `feedbackMailto`
    (`src/lib/feedback.ts`). **Never** the phrases "unassigned", "no catchment
    match", "data gap", or any internal flag.
- **Persona sections:** three collapsible rows in the card body —
  *Patient / carer* (main flow), *Fundraiser / charity shop* (button that sets
  the panel search to the user's shop name; shops keep their normal catchment
  colour, `outsideCatchment` stays hidden), *Clinician / referral* (same lookup
  as patient, plus the line "For real referral decisions, confirm with the
  hospice — the line here is an approximation").
- **No new route, no new page file, no new dependency.** Data is all from
  `useAppData`; the card is offline-safe after initial load.

## Alternatives considered

- **Dedicated `#start-here` page:** rejected — James bound the card shape, and a
  page bounces the user off the map to start an interaction the map already
  hosts.
- **Search-as-you-type (no submit):** rejected — an extra per-keystroke lookup
  over 10,475 rows compounds the search-debounce work (ADR-0010 P4); one submit
  is the unit.
- **Live geocoding in the card (Nominatim call):** rejected — breaks the
  offline-after-load guarantee, adds a runtime API the build does not own, and
  is not needed for the flow.

## Consequences

**Positive (accepted):** one entry point runs the whole postcode → hospice
journey; not-found is public-safe by construction (card source is greppable for
forbidden phrases); the card is a single presentational component with no data
migration; the ADR drives a testable AC (found vs not-found wording).
**Negative (accepted):** the card overlaps the map at small widths (mitigated by
the dismissible × and a max-width on the card); persona sections add card height
(mitigated by the collapsed-by-default rows); "let us know" mailto resolves
through `siteConfig` (ADR-0009), which carries the real operator address.
