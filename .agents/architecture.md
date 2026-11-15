# Architecture — Cycle 7: Mobile Map Fix (375 px)

**Stage:** 2 (Architect) · **Date:** 2026-11-15 · **Supersedes:** the prior 419-line
pre-renumber design in this file (the Cycle-8 copy is archived at
`.agents/architecture-cycle8.md` and untouched).
**Inputs:** `.agents/research.md` (P1–P6, OQ1–OQ6, R1–R5) + inline source facts
verified 2026-11-14 in the handoff brief.
**Deliverables this stage:** this file; `docs/adr/0038–0041`; one GLOSSARY.md
EOF append. No source/data/config changes in this stage.

## 1. Purpose and scope

Make the ≤768 px experience (verified at 375 px) produce: a 4-line header
(D1), a map-first first paint, at most two concurrently scrollable
surfaces, and no element overlap — without changing desktop behaviour, data,
config, or dependencies.

In scope: new/extended media-scoped rules in `src/styles.css`; exactly two
attribute-level DOM deltas + one static header button in React; one
script-only change in `MapView.tsx` (guarded by R1 verification); one new
deterministic React state.

Out of scope: desktop layout (must remain pixel-identical), data pipeline,
prerender pipeline mechanics, new dependencies, the Cycle-8 archive.

## 2. Current state (verified 2026-11-14, from handoff inline facts)

- `App.tsx`: `startHereOpen` initialized `true` (card open by default);
 `sheetOpen` state + `closeSheet`; `select(id)` closes the sheet when an id is
 set. `.app` div classes: `app` + `app-sheet-open` conditionally. Children:
 `aside.app-panel` (HospicePanel), `div.app-map` (selection alert when a
 hospice is selected; `<StartHere/>` when `startHereOpen`; `<MapView/>`;
 `<Methodology/>`), `button.sheet-fab`, `button.sheet-scrim`.
- `AppShell.tsx`: `NAV_LINKS` = 6 entries (Feedback, Corrections, About,
 Privacy, Licences, Accessibility). Header row: 28 px logo + `h1.h4` "Hospice
 Finder UK" + subtitle; theme group (Auto/Light/Dark); `headerExtras` (3
 form-checks + "Source & Method"); 6 `.site-nav-link` links. Footer repeats
 the same 6 links.
- `StartHere.tsx`: card root has **no CSS class**; positioning is inline-style
 only: `position:absolute; top:12; left:36; z-index:1000; width:320;
 max-width:calc(100% - 48px)`. No mobile rule exists. Contents: postcode form
 (uppercase, `pattern=[A-Z0-9 ]{5,8}`, 44 px submit), found/not-found alerts
 with `feedbackMailto`, 3-persona accordion (patient, fundraiser, clinician).
- `src/styles.css` (448 lines) — exactly three `@media` blocks:
 1. `max-width:768px` header block (~line 164): 44 px-form-checks, scaled
 inputs, 44 px buttons, full-width theme row.
 2. `max-width:768px` sheet block (~line 323): bottom-sheet transform, FAB
 with `bottom:calc(min(55vh,480px) + 14px)` under `.app-sheet-open`,
 scrim, legend hidden, selection full-width.
 3. `max-width:1100px` footer block (~line 433): footer small full-basis.
- Observed 375 px behaviour (P1–P6): header ≈ 4 lines; open card covers map +
 Leaflet zoom controls; three stacked scroll regions (page, card, sheet);
 ragged 6-link nav duplicated in footer; footer link contrast ≈ 7.5:1 in
 dark (unconfirmed); map area crowded (selection card, StartHere, FAB,
 attribution, map).

## 3. Hard-constraint compliance (GATE: `npm run check:layout`)

`scripts/check-map-layout.mjs` is a comment-stripping brace-depth parser that
fails (exit 1) unless the **complete** set of `flex-direction` declarations
anywhere in `src/styles.css` (all depths, including every `@media` block) is
exactly:

| # | Selector | flex-direction | Status after this design |
|---|-------------------|----------------|--------------------------|
| 1 | `.app` | `column` | unchanged |
| 2 | `.app-body > .app`| `row` | unchanged |
| 3 | `.legend-grid` | `column` | unchanged |

Compliance proof:
- **No new `flex-direction` declaration is introduced anywhere** — no selector,
 no media query. No existing declaration is removed or altered.
- Every new rule in this design uses only: `display`, `visibility`,
 `position`/`top`/`left`/`right`/`bottom`, `width`/`max-width`/`height`/
 `max-height`/`min-height`, `overflow`, `z-index`, `border-radius`,
 `box-shadow`, `padding`, `font-size`, and one custom property
 (`--hf-sheet-h`). None of these is the `flex-direction` property.
- Precedent that `display:flex`/`display:inline-flex` is not counted: existing
 CSS already uses `.app{display:flex}` and passes the checker today; the
 parser counts the `flex-direction` property only. The new toggle button uses
 `display:inline-flex` on mobile (permitted, not counted).
- The sheet-height variable is defined on `.app` **inside** the 768 px media
 block, so the whole change surface stays scoped to size/visibility/
 overflow/positioning under `max-width` media queries, per the constraint.

**Gate: `npm run check:layout` must exit 0** — run locally before handoff and
kept in CI. Failure blocks the cycle.

## 4. Design decisions

### D1 — Compress the mobile header to 4 lines (P1, P4) — CSS-only

Under the existing `@media (max-width:768px)` block, the header becomes:

Line budget: **351 px** (375 px viewport minus 12 px padding each side).
Per-row width estimates follow the reviewer's measurement that the full
3-control row needs ≈660 px (≈143 px per form-check, ≈130 px for
"Source & Method", ≈120 px for the "Start here" toggle, plus gaps):

1. **Line 1** — logo + `h1` + subtitle (add `font-size:.75rem` to the
 subtitle; its class is confirmed at implementation time — if absent, add a
 static class, an attribute-level delta).
2. **Line 2** — theme group, already a full-width row (existing rule kept).
3. **Line 3** — the first two form-checks (layer toggles) only:
 ≈2 × 143 px + gap ≈ 300 px ≤ 351 px. `font-size:.875rem` labels, existing
 `min-height:44px` row rule kept.
4. **Line 4** — the third form-check + the new "Start here" toggle (D2):
 ≈143 px + 120 px + gap ≈ 275 px ≤ 351 px.
5. **`.site-nav-link{display:none}`** — the 6 links are carried by the footer,
 which is already the identical link set inside a 100 %-height flex column
 (visible on mobile without any page scroll). Function loss: zero. React
 loss: zero. → This is also the OQ3 answer. **"Source & Method" (≈130 px)
 moves to the footer link row** — it is the one control that cannot fit a
 351 px line alongside the checks/toggle; DOM delta +1 footer link
 (`AppShell.tsx`, in surface).

Estimated header height: ~180 px (from ~200 px). The map gains **≈20 px** —
an honest claim; a 3-line variant would only fit ≈430 px of controls, so the
affordable gain at the 351 px budget is ~20 px (reviewer B1: "≥60 px" was
false). This is a container-size change, so `invalidateSize()` is required
(D4).

### D2 — Mobile StartHere: CSS-gated top overlay, default open (P2, P6, OQ2)

DOM deltas (attribute-level only; see R4):
- `StartHere.tsx` card root: **add class `hf-start-here`**, **remove the
 inline `style` attribute**; its values move to a base CSS rule that is
 pixel-identical on desktop:
 ` .hf-start-here{position:absolute;top:12px;left:36px;z-index:1000;`
 ` width:320px;max-width:calc(100% - 48px)}`
- `App.tsx`: add `const [startHereMobileOpen, setStartHereMobileOpen] =
 useState(true)` — **default open on mobile** (lead decision, option (b));
 deterministic `true` in every environment (including the JSDOM prerender),
 so server and client first renders match exactly. When the state is true,
 the `.app` div gains class `hf-start-here-open`. `select()` sets the state
 `false` alongside closing the sheet (existing behaviour), so a selection
 never coexists with the card (OQ1). **`startHereOpen` is untouched**
 (initial `true`, same logic) → element tree identical to today.
- `headerExtras`: one **static** button `.hf-start-here-toggle` (text "Start
 here", `aria-expanded` bound to the state), always rendered; CSS shows it
 only on mobile.

Mobile CSS (new rules inside the 768 px block; **order matters** — the
sheet-wins rule is last):
```css
.hf-start-here{display:none} /* mobile: hidden until the toggle opens it */
.hf-start-here-open .hf-start-here{
 display:block;position:absolute;top:12px;left:12px;right:44px;
 max-width:none;max-height:min(75vh, calc(100% - 72px));overflow-y:auto;
 z-index:1700;padding:12px;border-radius:12px;
 box-shadow:0 8px 24px rgba(0,0,0,.35)}
.app-sheet-open .hf-start-here{display:none} /* sheet always wins */
.leaflet-top.leaflet-left{left:auto;right:10px} /* zoom → top-right */
.app-selection{max-height:min(45vh,260px)} /* selection card capped */
```
Geometry (reviewer B2, matches ADR-0038 re-issue): `top:12px; left:12px;
right:44px` → **319 px card width at 375 px**; the 44 px right band keeps the
"Open list" FAB and the top-right zoom controls clear; `max-height:min(75vh,
calc(100% - 72px))` keeps the card above the map's bottom UI; the
`.app-selection` cap keeps the selection card from covering the FAB. The card
is a fixed-width box, not a full-width sheet — the map stays visible and
interactable around it (left margin 12 px, right band 44 px).
Z-order: sheet 1600 < start-here 1700 < FAB 2000. The card overlays the sheet
if both were open, then the last rule hides it; the FAB stays reachable above
everything. Implementation note: if `leaflet.css` loads after `styles.css`,
bump the zoom-control rule to `.app-map .leaflet-top.leaflet-left`.

Desktop: no 768 px rule applies → byte-identical look via the base rule that
mirrors the former inline values.

### D3 — Scroll-region budget (P3, OQ1)

Defined and enforced in §5 OQ1. Summary: map + at most one reachable DOM
scroll surface, always; enforced by construction (page has no overflow), by
the D2 display rule (sheet excludes card), by React behaviour (`select()`
closes the sheet **and** the mobile StartHere card — so selection never
coexists with card or sheet), and by z-order reachability (a covered surface
does not count).

### D4 — Map resize handling (R1)

The mobile layout restacks `.app` into a flex column, so the map panel's
height changes **without any window-resize event**: the header compresses
(D1), the card opens/closes (D2), and the sheet opens/closes (D5) all resize
the map container. The map therefore needs a container-size trigger, not
merely a window listener. Inspect `MapView.tsx` first: if it already calls
`invalidateSize()` on the appropriate triggers (window resize, container
change), no script change is needed. If not, add a `ResizeObserver` on the
map container that calls `invalidateSize()` — covers every container-size
change above, script-only, no new dependency, no import-style change beyond
existing Leaflet API.

### D5 — Sheet-height token (R2)

Replace the duplicated `min(55vh,480px)` literal with a single custom
property: `.app{--hf-sheet-h:min(55vh,480px)}` (inside the 768 px block), then
`.app-panel{height:var(--hf-sheet-h)}` and
`.app-sheet-open .sheet-fab{bottom:calc(var(--hf-sheet-h) + 14px)}`. One value,
two consumers — the FAB and sheet can never drift apart, which removes the
root cause of the overlap in both screenshots.

### D6 — Footer contrast, verify-first (R3)

In-browser WCAG check of the footer links in both themes. ≥4.5:1 in both →
record the measured values in `qa.md` and make no change. <4.5:1 in any theme
→ add `.app-footer a{color:var(--hf-footer-link)}` per theme (new custom
property, **scoped to the ≤768 px media block** (reviewer RA3), footer-scoped
only — no global `--bs-link-color` override, no desktop change; see OQ4).

## 5. Open questions (resolved in this design)

### OQ1 — What counts as a "scrollable region", and what is the budget?

Definition: a scrollable region is the map (always counts as 1) plus any
reachable, non-covered DOM surface with `scrollHeight > clientHeight` and
`overflow-y:auto|scroll`. A surface fully covered by a higher-z surface is not
reachable and does not count. Budget: map + at most one reachable surface,
in every visible state.

State matrix (state → reachable scrollable surfaces):

| State | Reachable scrollable surfaces |
|---|---|
| Card open (mobile default) | map + card (2) |
| Card closed (toggle off), no selection | map only (1) |
| Selection only | map + selection card (2); `select()` closes the mobile card in the same step (D2), so card and selection never coexist |
| Sheet open, no selection | map + sheet (2); card hidden by rule |
| Sheet open + selection | **unreachable** — `select()` closes the sheet before the selection renders (D3) |
| Card open + selection alert | map + card (2); alert inside `div.app-map` is capped (D2), page itself has no overflow |

The page (`html`/`body`/`.app`) must keep no overflow at ≤768 px, so the
matrix ceiling is 2. No `:has()` used — reachability is enforced by the
`display:none`/z-order rules above, which are plain descendant combinators.

### OQ2 — Default open vs default closed for the mobile StartHere card?

Default **open** on mobile (`startHereMobileOpen` initial `true`, D2 — lead
decision, option (b)); default **open** on desktop (unchanged `startHereOpen`
initial `true`) — one deterministic initial value, no client branching.
Rationale (reviewer B3): the acceptance block requires map + postcode search
in the **primary viewport** at 375 px; a default-closed card fails it. The
B2 geometry (319 px wide, ≤75vh) keeps the card small enough that the map
stays visible and interactable — zoom (44 px right band), FAB, and the
selection cap all stay clear — and the card is closable via the toggle at
any time.

### OQ3 — Header nav links: hide or reflow?

CSS-only `.site-nav-link{display:none}` (D1.4). The footer already carries the
identical 6-link set, visible on mobile without page scroll — no function
loss, no React change.

### OQ4 — Contrast fix scope (lead supplement to architect's handoff)

Footer-scoped, **mobile-reach only (≤768 px)** (reviewer RA3). If D6's
measure fails, the fix is `.app-footer a{color:var(--hf-footer-link)}` per
theme inside the 768 px block — never a global `--bs-link-color` override,
which would re-tint every link site-wide (header, alerts, cards) and blow up
the change surface beyond mobile. The target is
confirmed by an in-browser WCAG measurement in both themes, recorded in
`qa.md` (static math for both dark values lands in the passing zone, so the
expected outcome is "record, no change").

### OQ5 — FAB form: reserved strip vs sheet handle (lead supplement)

Keep the existing centered "Open list" pill unchanged in form; this change is
positioning-only — it rides above the sheet via the D5 `--hf-sheet-h` token.
No reserved strip over the map (would shrink the map, the thing we are
enlarging), no handle/grabber (extra surface, no contrast benefit). The
Leaflet attribution lives bottom-right; the center pill does not obstruct it
at 320 px.

### OQ6 — Map min-height expression (lead supplement)

Add **no** min-height: `.app` is a flex column and the map takes the flex
remainder, so a min-height would only force the page into scroll and break
the OQ1 budget. Fallback if the §8 screenshot matrix shows the map collapsing
when the sheet is closed: `.app-map{min-height:50dvh}` (dvh survives iOS
URL-bar resizing) with a px fallback line above it, and revisit D4.

## 6. Change manifest

| File | Change | Gate |
|---|---|---|
| `src/styles.css` | New/extended rules in the 768 px block (D1, D2, D3, D5) + base `hf-start-here` rule + optional footer-link rule (D6); the `--hf-sheet-h` token | `npm run check:layout` must exit 0 (pure CSS, zero `flex-direction`) |
| `src/components/StartHere.tsx` | +class `hf-start-here` on card root; −inline `style` attribute | build + prerender DOM diff |
| `src/App.tsx` | +`startHereMobileOpen` state (init `true`); +`hf-start-here-open` class on `.app` when true; `select()` also sets it `false` (with the sheet close); +"Start here" static button in `headerExtras` (`aria-expanded`) | build + prerender DOM diff |
| `src/components/MapView.tsx` | Only if R1 unobserved: container `ResizeObserver` → `invalidateSize()` | build |
| `src/components/AppShell.tsx` | +1 footer link for "Source & Method" (D1); plus the toggle button if `headerExtras` lives there | build |

No data, no config, no dependency, no prerender-pipeline change. Desktop
diff: byte-identical bytes except the class/style relocation on the StartHere
card (same computed styles).

## 7. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R1 | Map not invalidated after header compress (map shifts/stale canvas) | D4 verify-first; `invalidateSize()` on container change |
| R2 | FAB and sheet height drift (overlap regression) | D5 single `--hf-sheet-h` token, two consumers |
| R3 | Footer link contrast below 4.5:1 in a theme | D6 verify-first, footer-scoped fix only |
| R4 | Prerender/client DOM mismatch from the new DOM deltas | All new state deterministic (`true` init); button static; verified in §8.2 |
| R5 | A state exceeds the ≤2 scroll-region budget | OQ1 matrix; §8.5 automated count |
| R6 | Hydration mismatch if any state is non-deterministic | §8.2 diff; `startHereMobileOpen` is `true` everywhere |
| R7 | Zoom controls covered by the selection card in some state | Accepted: card is capped (D2), zoom moved top-right; visual check in §8.7 |
| R8 | Focus loss when the card/sheet close | §8.9 a11y pass: return focus to the toggle/FAB on close |

## 8. Verification

1. `npm run check:layout` exits 0 (gate).
2. `npm run build` + prerender: DOM diff between desktop build and the new
 build = exactly +1 header button, card class/style relocation. No other
 attribute changes.
3. Screenshot matrix at 375×812, dark + light, 5 states (OQ1 matrix rows):
 header ≤ 4 lines (D1); map visible first paint; no element overlap; FAB
 clear of sheet; zoom controls visible.
4. `document.documentElement.scrollHeight <= window.innerHeight` in all 5
 states (no page scroll).
5. Reachable scrollable-region count ≤ 2 in all 5 states (OQ1 definition).
6. Footer link contrast measured in both themes; values recorded in
 `qa.md`.
7. Marker alignment: after opening/closing the card, opening the sheet, and
 triggering a resize — markers and tiles stay aligned (R1).
8. At 320 px: nothing overflows horizontally; zoom controls do not overlap
 the selection card beyond the accepted R7 condition.
9. a11y: Tab order includes the new toggle before the map; `aria-expanded`
 updates; focus returns to the control when its panel closes (R8).

## 9. Alternatives considered (rejected)

- **A — Shrink-but-keep-open the card**: still covers map + zoom; complaint
 remains.
- **B — Second bottom sheet for StartHere**: two bottom sheets compete for
 the same vertical space; the OQ1 budget is harder to hold; more DOM.
- **C — `matchMedia` to react to viewport on init**: non-deterministic across
 prerender/client; exactly the hydration risk R6 exists to avoid.
- **D — Hamburger menu for the six links**: extra surface to build and test
 for functionality the footer already provides.
- **E — Dedicated position FAB (strip/handle)**: shrinks the map; OQ5.

## 10. Glossary

One EOF append to `GLOSSARY.md`: `## Cycle 7 (2026-11-14) — mobile` with the
terms **Start here card**, **Scroll-region budget**, and the layout gate
`check:layout` (see §10 of the architect brief for exact wording). No entry
may reuse "sliver" (a validator cell term already in GLOSSARY).

## 11. ADRs

- `docs/adr/0038-mobile-start-here-css-disclosure.md` — StartHere becomes a
 CSS-gated, default-open mobile overlay (D2); class in, inline style out;
 deterministic state `startHereMobileOpen` (init `true`).
- `docs/adr/0039-mobile-nav-carried-by-footer.md` — header
 `.site-nav-link{display:none}` on mobile; footer is the mobile nav; zero
 function loss.
- `docs/adr/0040-mobile-scroll-region-budget.md` — map + ≤1 reachable surface
 invariant; definition and state matrix (OQ1); enforcement by construction.
- `docs/adr/0041-sheet-height-token.md` — `--hf-sheet-h` custom property
 unifies sheet and FAB offsets; removes the duplication that caused the
 overlap.

## Rework log (2026-11-15)

Round 1 of 2, applied by the lead in-session after review
`.agents/review-cycle7.md` (FAIL: B1, B2, B3; RA1–RA5). Subagent dispatches
#1–#5 all died zero-write against the 58,920-token context wall, so the
findings were absorbed directly. Changes made:

- **B1** (header math): D1 rewritten to 4 lines with the 351 px line budget
 and per-row width estimates; "Source & Method" moves to the footer;
 map-gain claim corrected to ≈20 px (§1 claim updated to match).
- **B2** (card geometry): D2 mobile rule now `top:12px;left:12px;right:44px;
 max-height:min(75vh, calc(100% - 72px))` with the clear-of-FAB/zoom
 rationale stated; geometry note added.
- **B3** (default state): `startHereMobileOpen` initial `true` — mobile card
 default open; OQ2 flipped with rationale; manifest, §2, D3, R4, R6 and
 ADR-0038 line updated for `true`.
- **RA1**: OQ1 matrix row "Selection only" — `select()` closes the mobile
 card in the same step; card and selection never coexist.
- **RA2**: OQ1 matrix row "Sheet open + selection" marked **unreachable**
 with the D3 reason.
- **RA3**: D6 + OQ4 — contrast fix scoped to the ≤768 px media block.
- **RA4**: D4 — rationale added: header/compress and card/sheet changes
 resize the map container without a window-resize event, so the
 `ResizeObserver` covers container-size changes.
- **RA5**: no action (informational).

§8 verification item 3 now reads "header ≤ 4 lines (D1)". No other sections
changed. Next gate: Reviewer re-review.
