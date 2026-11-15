# Requirements — Cycle 7: Mobile Map Fix (375 px)

**Stage:** 4 (Product Manager) · **Date:** 2026-11-15 · **Mode:** single write; inputs read-only.
**Inputs (section refs):**
- `.agents/architecture.md` (390 lines, reworked): §1 scope; §3 layout-gate table (3 pairs); §4 D1–D6; §5 OQ1–OQ6; §6 change manifest; §7 R1–R8; §8 verification 1–9; §11 ADRs; rework log (round 1 of 2).
- `.agents/review-cycle7.md` § "Rework round 1 re-review (2026-11-15)": B1–B3, RA1–RA5, hard constraints all PASS; OVERALL PASS.
- `GLOSSARY.md` § "Cycle 7 (2026-11-14) — mobile": *Start here card*, *Scroll-region budget*, *layout gate*.

**Rework context.** Original C7 design FAILed review (B1 header math, B2 card geometry, B3 default state; RA1–RA5). Rework round 1 of 2 fixed it in `architecture.md`; re-review PASSed all findings + hard constraints (OVERALL PASS, 2026-11-15). D3 (Scroll-region budget), D4 (map resize), D5 (sheet-height token) were stable through the rework; hard-constraint position stable (3-pair flex-direction set). No prior C7 requirements artifact — this file is the fresh Coding-stage contract.

## ACCEPTANCE (375 px = 375×812; light + dark)

- Map + postcode search (Start here card, default open) own the primary viewport (OQ2: default-closed would fail this).
- Header collapsed to 4 lines (≈180 px).
- "Open list" pill (FAB) no overlap with sheet, selection card, or zoom controls.
- Scroll-region budget holds: ≤2 reachable scrollable regions in every state — map + at most one reachable, non-covered surface (OQ1 definition: `scrollHeight > clientHeight`, `overflow-y:auto|scroll`; a fully covered surface is unreachable and does not count). No third scroll region.
- Desktop 1280 px pixel-unchanged · `npm test` green · `npm run check:layout` (layout gate) exit 0 · byte-identical double build.

## WORK ITEMS (dependency order)

**W1 — D1: 4-line mobile header** (arch §4-D1; re-review B1)
Files: `src/styles.css`, `src/components/AppShell.tsx`.
What: in existing `@media (max-width:768px)` block, header = 4 lines, 351 px line budget (375 − 2×12):
1. logo + h1 + subtitle (add `font-size:.75rem`; subtitle class confirmed at implementation — if absent, add a static class, attribute-level delta).
2. theme group, full-width row (existing rule kept).
3. first two form-checks (layer toggles) ≈300 px; labels `font-size:.875rem`; existing `min-height:44px` kept.
4. third form-check + "Start here" toggle ≈275 px.
`.site-nav-link{display:none}` — footer already carries the identical 6 links (OQ3). "Source & Method" (≈130 px) moves to the footer link row (+1 footer link, `AppShell.tsx`, in surface).
Acceptance: 375 px header ≤4 lines, every line ≤351 px, no horizontal overflow; desktop unchanged (rules media-scoped).
Notes: honest map gain ≈20 px; the "≥60 px" claim is FALSE — never use it in prose, docs, or chat.

**W2 — D2: StartHere mobile geometry** (arch §4-D2; re-review B2)
Files: `src/styles.css`, `src/components/StartHere.tsx`.
What: add class `hf-start-here` to card root; remove inline `style` attribute. Base rule (desktop, mirrors former inline values): `.hf-start-here{position:absolute;top:12px;left:36px;z-index:1000;width:320px;max-width:calc(100% - 48px)}`. In the 768 px block, in this order (sheet-wins rule last):
```css
.hf-start-here{display:none}
.hf-start-here-open .hf-start-here{display:block;position:absolute;top:12px;left:12px;right:44px;max-width:none;max-height:min(75vh, calc(100% - 72px));overflow-y:auto;z-index:1700;padding:12px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.app-sheet-open .hf-start-here{display:none}
.leaflet-top.leaflet-left{left:auto;right:10px}
.app-selection{max-height:min(45vh,260px)}
```
Acceptance: 375 px card 319 px wide, 12 px left margin; 44 px right band clears the "Open list" FAB + top-right zoom; max-height clears the FAB band / map bottom UI; z-order sheet 1600 < card 1700 < FAB 2000; sheet always wins (card hidden while sheet open).
Notes: if `leaflet.css` loads after `styles.css`, scope the zoom rule to `.app-map .leaflet-top.leaflet-left`. Fixed-width box, not full-width sheet — map stays visible/interactable around it.

**W3 — D2-state: default-open disclosure** (arch §4-D2, OQ2; re-review B3)
Files: `src/App.tsx` (toggle button in `headerExtras`; if `headerExtras` is defined in `AppShell.tsx`, the button lands there).
What: `const [startHereMobileOpen, setStartHereMobileOpen] = useState(true)` — deterministically `true` in every environment incl. JSDOM prerender (R4/R6); `.app` gains class `hf-start-here-open` when true; `select()` sets it `false` in the same step as the sheet close — selection never coexists with the card (OQ1 "Selection only", RA1); `startHereOpen` untouched (init `true`, same logic) → element tree identical to today; static "Start here" button `.hf-start-here-toggle` in `headerExtras`, `aria-expanded` bound to the state, always rendered, CSS-shown on mobile only (`display:inline-flex`).
Acceptance: server and client first renders match (no hydration mismatch); card open on mobile load, closable via toggle; selection renders without the card.
Notes: ADR-0038 re-issued — option (b) default open, supersedes round-3 default-closed; geometry identical (re-review B3).

**W4 — D4: map container-responsive recompute** (arch §4-D4, R1, RA4)
File: `src/components/MapView.tsx` only.
What: verify-first — if `MapView.tsx` already calls `invalidateSize()` on window resize + container change, no script change. Else: `ResizeObserver` on the map container → Leaflet `invalidateSize()`.
Acceptance: markers/tiles stay aligned after card open/close, sheet open, resize/rotation (§8.7); script-only, no new dependency, existing Leaflet API only.
Notes: real triggers = window resize/rotation + true container-size change (header compress, card/sheet open-close); overlays do not change the container's flex size (RA4).

**W5 — D5: sheet-height token** (arch §4-D5, R2)
File: `src/styles.css`.
What: in the 768 px block `.app{--hf-sheet-h:min(55vh,480px)}`; consumers `.app-panel{height:var(--hf-sheet-h)}` + `.app-sheet-open .sheet-fab{bottom:calc(var(--hf-sheet-h) + 14px)}` replace today's duplicated `min(55vh,480px)` literals.
Acceptance: computed sheet height / FAB bottom identical to today's values in all 5 states (zero visual delta); one token, two consumers — drift impossible (R2).

**W6 — D6: footer contrast, verify-first** (arch §4-D6, OQ4, R3, RA3)
File: `src/styles.css` (contingent only).
What: measure footer-link contrast in-browser, both themes (record in `qa.md`). Expected ≈7.5:1 both themes → already passing → record, no change. If <4.5:1 in any theme: `.app-footer a{color:var(--hf-footer-link)}` with a new per-theme custom property.
Acceptance: measured values recorded in `qa.md`; no source change if passing; desktop 1280 px pixel-unchanged if the fix is applied.
Notes: contingent fix PRE-SCOPED to `@media (max-width:768px)` only, footer-scoped only — never a global `--bs-link-color` override (OQ4, RA3).

**W7 — 5-file manifest discipline** (arch §6)
Files: exactly the 5 manifest files — `src/App.tsx`, `src/components/StartHere.tsx`, `src/styles.css`, `src/components/MapView.tsx`, `src/components/AppShell.tsx` — nothing outside the list.
What: all source changes land in the manifest; no data, config, dependency, or prerender-pipeline changes.
Acceptance: source diff touches only the 5 files; desktop inline-style→CSS relocation yields identical computed values at 1280 px (`position:absolute;top:12px;left:36px;z-index:1000;width:320px;max-width:calc(100% - 48px)`).

**W8 — verification matrix** (arch §8)
Files: none (runtime verification; results land in `qa.md`).
What: automated items 1–2: `npm run check:layout` exit 0; `npm run build` + prerender — DOM diff vs desktop = exactly +1 header button + StartHere card class/style relocation, no other attribute change (R4/R6).
In-browser-only items 3–9 = James's mobile-visual ship gate (manual; do NOT add a browser-automation dependency):
3. screenshots 375×812, dark + light, 5 OQ1 states: header ≤4 lines; map visible first paint; no element overlap; FAB clear of sheet; zoom controls visible.
4. `documentElement.scrollHeight <= window.innerHeight` in all 5 states (no page scroll).
5. reachable scrollable-region count ≤ 2 in all 5 states (OQ1 definition).
6. footer contrast both themes, values recorded in `qa.md`.
7. markers/tiles aligned after card open/close, sheet open, resize (R1).
8. 320 px: no horizontal overflow; zoom vs selection within accepted R7 condition.
9. a11y: tab order includes the new toggle before the map; `aria-expanded` updates; focus returns to toggle/FAB when its panel closes (R8).

**W9 — ADRs** (arch §11)
Files: `docs/adr/0038–0041` (verify consistency; no rewrites beyond rework alignment).
What: ADR-0038 re-issued (done — reference it; option (b) default open). ADR-0039 (mobile nav carried by footer), ADR-0040 (Scroll-region budget), ADR-0041 (`--hf-sheet-h` token) stand as drafted.
Acceptance: all four present in `docs/adr/`; wording consistent with the reworked decisions (open default, 351 px budget, token, OQ1 matrix).
Notes: the GLOSSARY C7 entry "Start here card … default closed" is pre-rework wording; the re-issued ADR-0038 (default open) supersedes it — do not conform code to the glossary.

## HARD CONSTRAINTS (single source for Coding/QA)

- The layout gate (`scripts/check-map-layout.mjs`) asserts the COMPLETE `flex-direction` set in `src/styles.css` is exactly the existing 3 pairs — ZERO new `flex-direction` declarations anywhere INCLUDING `@media` blocks; ZERO changes/removals of the existing 3 (`.app`: column; `.app-body > .app`: row; `.legend-grid`: column). `npm run check:layout` exit 0.
- Allowed mobile change surface: size / visibility / overflow / position only (display, visibility, position + offsets, width/max-width/height/max-height/min-height, overflow, z-index, border-radius, box-shadow, padding, font-size, and the one custom property `--hf-sheet-h`).
- NO `:has()` — reachability by plain descendant combinators + `display:none`/z-order only.
- Desktop 1280 px pixel-unchanged · byte-identical double build · `npm test` green.

## OUT OF SCOPE

Data files (`public/data`, `data-raw`), new dependencies, Puppeteer/Playwright (in-browser checks are manual), backend, C8 postcodes work; Cycle-8 archive untouched.

## OPEN QUESTIONS (owner/James decides)

1. Ship gate: is the §8.3 5-state screenshot matrix (375 px, 5 states, light + dark) plus items 4–9 the complete mobile-visual ship gate? (working assumption: yes).
2. D6: which in-browser WCAG measurement is recorded in `qa.md` for the two footer-contrast values? (expected: record, no change).
3. OQ6 fallback: if the §8 matrix shows the map collapsing when the sheet is closed, authorize `.app-map{min-height:50dvh}` with px fallback line and revisit D4? (only if observed).
