# Review (Cycle 2) — 2026-10-26

## Verdict: APPROVE

## Findings

| ID | Class | Finding (with file:line refs) | Fix (one line) |
|----|-------|-------------------------------|----------------|
| R2-1 | Minor | ADR-0012 Consequences claims the "let us know" mailto assumes the *placeholder* operator email ("a real address is a later ops task"). Stale: `src/lib/siteConfig.ts` has `contactEmail: 'hello@thejamlabs.com'` (G4 closed in commit `557e553`, ADR-0009 lockstep) and `src/lib/feedback.ts` `feedbackMailto` builds from `siteConfig.contactEmail`. | In `docs/adr/0012-start-here-landing-card.md` Consequences, replace the placeholder-email sentence with "the mailto resolves through `siteConfig` (ADR-0009), which carries the real operator address". |
| R2-2 | Minor | "154 non-Wales hospices" appears in ADR-0013 (Wales-hospices bullet) and `.agents/architecture.md` §1 item 3; ground truth is 155 total with 0 Wales rows (`public/data/hospices.json`: 155 `"id"` rows, 0 `"nation": "wales"`), so the site renders 155 non-Wales hospices. | Change "154" to "155" in both `docs/adr/0013-nation-data-landing-gates.md` and `.agents/architecture.md` §1. |
| R2-3 | Minor | GLOSSARY.md "LOD bucket marker" says the grid-bucket marker is "an *evidence-gated* mechanism, on only if the §2c metric justifies it"; ADR-0010 makes P2 a bounded fix applied in measured sequence — the 800 ms-gated mechanism is the §2c stride downsampling, not P2. The glossary misattributes the gate. | In GLOSSARY.md "LOD bucket marker", state P2 is a bounded (measured) fix and it is the §2c stride whose activation is evidence-gated. |
| R2-4 | Minor | ADR-0013 / architecture.md §1 B2 gate requires "report shows `wales > 0`" and a re-derived unassigned count, but no placement assertion: a partial geocoding failure produces lat/lon-null rows that pass `wales > 0` yet render invisibly (`MapView.tsx` `visiblePractices` filters out `lat == null`), so a half-landed Wales layer would slip through. | Add to the B2 gate (ADR-0013 + architecture.md §1): "report shows placed Wales practices (lat/lon non-null); unplaced rows only from documented gaps". |
| R2-5 | Dropped | Checklist premise "no `flex-direction` anywhere in `src/styles.css`" is stale: 3 declarations exist (styles.css:13, 25, 167) from the 2026-10-24 map-layout fix; the real invariant is the exact set of three enforced by `scripts/check-map-layout.mjs`, which the design's "no new `flex-direction`" wording respects. | — |
| R2-6 | Dropped | Challenged the P1–P7 sequencing and 800 ms / 2 s gates (ADR-0010): profile-first baseline, mandatory P1, per-batch re-measure, reversible `k=1` default, worker/split deferred — sound; grid-bucket `useMemo` over `leaflet.markercluster` is forced by the no-new-deps bound and covers low zoom. | — |
| R2-7 | Dropped | Start-here card `position:absolute; top:12px; left:36px; z-index:1000` stays G6-safe (absolute positioning adds no `flex-direction`); the anchor resolves to the position-relative Leaflet container / `.app` (styles.css:20), and top-left card vs top-right zoom control do not collide. | — |
| R2-8 | Dropped | ADR-0011 one-toggle filter set vs "richer filtering": source/website/unplaced filters are curation state and would violate the binding hide-not-delete / public-safe rule; the ADR documents the rejection with reasons — correct scope call. | — |
| R2-9 | Dropped | P5 "expected −30–40%" payload saving is an estimate (≈20–25% on the measured 3.04 MB / 2-space-indent file); it is labelled expected and acceptance logs real before/after sizes, so no spec depends on the number. | — |

## Rationale

All five items stay inside the binding constraints (no new npm deps, card-not-page, no new
`flex-direction`, no TODOs, public-safe wording); the four ADRs are one page each with
genuine alternatives. Every code anchor verified against HEAD 475675a: `MapView.tsx`
(`preferCanvas`, per-marker `hospices.find` in catchment/practice/shop passes, per-practice
`Tooltip`, `FitToSelection`, `[55.0,-3.5]`/6), the 103-line unsorted `HospicePanel.tsx`
(nation buttons + name/town substring), bare `index.html` (no icon/webmanifest),
`package.json` (exactly 5 scripts), `useAppData.ts`. All 8 Cycle 2 GLOSSARY terms exist and
cross-references resolve (architecture.md §5, ADR-0010/0012, data/README.md:78 procedures
(1)/(2)). Strongest objections, all Minor and lead-fixable in-file: the stale G4 mailto claim
in ADR-0012 (R2-1), the 154→155 count (R2-2), the GLOSSARY gate misattribution (R2-3), and
the B2 gate's missing placement assertion (R2-4). No Blocking findings.
