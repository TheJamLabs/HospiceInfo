# Review — Cycle 7 (mobile layout fix)

**Stage:** 3 (Reviewer) · **Date:** 2026-11-15 · **Mode:** read-only
**Inputs:** `.agents/research.md`, `.agents/architecture.md` (327 lines, line-cited below), `.agents/pipeline.md` (C7 acceptance block), `src/` (styles.css, App.tsx, AppShell.tsx, StartHere.tsx, MapView.tsx), `scripts/check-map-layout.mjs`

## 1. Verdict

**FAIL — 3 Blocking (B1, B2, B3), 5 Risk-accepted (RA1–RA5).**

The design is directionally correct and its hard-constraint compliance is
clean (item 6: PASS, §4 below). But the geometry it ships reproduces two of
the owner's complaints ("on mobile it looks a bit shit"):

- **D1's "line 3" claim is geometrically false at 375 px** — the five
  controls it crams into one line need ~660 px into a 351 px line, so the
  header self-wraps and the promised "3 lines / map gains ≥60 px" does not
  materialise (B1).
- **The open StartHere card overlaps the "Open list" FAB and covers the
  zoom controls it itself moves to the top-right** — exactly the overlap
  acceptance forbids: ".agents/pipeline.md" C7 acceptance, ~lines 1959-1967,
  "'Open list' pill does not overlap content" (B2).
- **Default-closed mobile card contradicts the acceptance wording** "map +
  postcode search own the primary viewport" — at first paint only the map is
  visible; search requires a tap. This is a design-vs-acceptance conflict
  requiring an owner/lead interpretation decision (B3).

Nothing blocks on data, config, dependencies, or the layout gate. Fix path:
one architect revision pass over D1 + D2 (with the B3 interpretation), then
re-review. All fixes fit inside the existing allowed change surface.

## 2. Per-decision verdicts (D1–D6)

### D1 — 3-line header — **FAIL (B1). Approach PASS.**

Architecture: `architecture.md:91` (header), `architecture.md:99-102` (line-3
claim: "single control row: the 3 form-checks + 'Source & Method' + the new
'Start here' toggle … so the row fits 375 px on one line"), `architecture.md:108-110`
("Estimated header height: ~135 px (from ~200 px). The map gains ≥60 px").

Why the claim fails at 375 px:

- Available line width: 375 − 2×12 px (`.app > .container{padding:10px 12px 14px}`
  in the 768 px header block, `src/styles.css` ~line 164) = **351 px**.
- The controls are static DOM (`src/App.tsx` headerExtras — 3 form-checks +
  "Source & Method" btn; `src/AppShell.tsx` — button markup), so all five are
  always present on line 3.
- The three form-checks alone: labels "Charity shops", "GP practices",
  "Children's" at the existing 1rem label size, each with a 32 px input
  scaled 1.4 (existing 768 px rules in `src/styles.css` ~line 164:
  `.form-check{min-height:44px}`, `.form-check-input{transform:scale(1.4)}`)
  sum to ≈ **440–460 px > 351 px** before the "Source & Method" button
  (~130 px) and the new "Start here" toggle (~90 px) are even added.
- Row total ≈ 660–680 px. It self-wraps to 2–3 stacked 44 px lines → header
  remains ≈ 208+ px (4–5 lines), i.e. **no meaningful compression vs the
  observed ~200 px state** (research P1), and the ≥60 px map-gain claim
  (`architecture.md:108-110`) is false. `.form-check-label{font-size:.875rem}`
  + "tighter button padding" cannot close a ~300 px deficit.

**Fix (route to Architect):** restructure line 3 so it truly fits 351 px —
e.g. fold "Source & Method" and the 3 toggles behind the "Start here"
disclosure (or a compact menu), leaving line 3 as 1–2 short controls; or a
deliberately controlled 2-line line-3 with short labels. Re-derive the
135 px / ≥60 px figures from measured widths, not estimates. (All within the
allowed surface: `display`, `font-size`, `padding`.)

Parts that PASS: `.site-nav-link{display:none}` with footer carrying the
identical 6 links (verified `src/AppShell.tsx`: the same 6 links render in
the footer; zero function loss, OQ3); "Line 1" font-size and "Line 2"
theme-row handling are fine.

### D2 — StartHere mobile overlay — **FAIL (B2 geometry; B3 default state). Mechanism PASS.**

Architecture: base rule `architecture.md:118-119`; state init `architecture.md:120-124`;
static toggle `architecture.md:125-127`; mobile CSS `architecture.md:132-140`;
z-order `architecture.md:142-144`.

The mechanism is sound: CSS-gated disclosure, deterministic `false` init
(prerender-safe), `startHereOpen` untouched so the element tree is
identical today, sheet-wins rule last, z-stacking scrim 1500 < sheet 1600 <
card 1700 < FAB 2000. Desktop byte-identical via the base rule mirroring the
former inline style (`src/components/StartHere.tsx` card root: inline
`position:absolute;top:12;left:36;zIndex:1000;width:320;maxWidth:calc(100% - 48px)`
moves to `.hf-start-here{position:absolute;top:12px;left:36px;z-index:1000;
width:320px;max-width:calc(100% - 48px)}` — same computed values).

**B2 — the open state reproduces the overlap complaint.** Card is a child of
`.app-map` (`src/App.tsx`), `.app-map{position:relative}` (`src/styles.css`);
at 375×812 the map area is ≈ 630–650 px tall after the header/footer:

- Open card (`architecture.md:133-137`): `top:0;left:0;right:0;width:100%;
  max-height:75vh` = 75×812 = **609 px** of map-area height, z-index 1700.
- Closed FAB (`src/styles.css` 768 px sheet block ~line 323:
  `.sheet-fab{bottom:14px; … min-height:48px}`) sits ≈ 578–580 px from the
  map-area top → card bottom (609) wraps the FAB: **~30–55 px overlap** of
  "Open list" pill — the acceptance explicitly forbids.
- Zoom controls, moved to top-right by the design's own rule
  (`architecture.md:139: .leaflet-top.leaflet-left{left:auto;right:10px}`),
  are covered by the card (z 1700 > Leaflet's ~1000) → §8 check 3
  "zoom controls visible" (`architecture.md:281-282`) fails in the
  card-open state.
- In "card open + selection", the card (z 1700) covers the selection card
  (`.app-selection{…z-index:1000}`, `src/styles.css`) → content unreadable;
  "no element overlap" fails there too.

**Fix (route to Architect):** constrain the card so it cannot touch the map
furniture — e.g. `right:44px` (right gutter for zoom) and
`max-height:min(75vh, calc(100% − 72px))` (FAB 48 px + 14 px offset +
breathing room) — plus aligning bottom so it clears `.app-selection`
(z-order already keeps card above, so cover is acceptable only if the
selection state is unreachable-with-card; simplest: also clear it). All
within the allowed property set (`top/left/right/bottom/max-height`).

**B3 — default-closed conflicts with the acceptance.** `architecture.md:209-212`
(OQ2: "Default **closed** on mobile … map-first is the required first
paint") vs C7 acceptance (~lines 1959-1967): "map + **postcode search** own
the primary viewport". Card closed ⇒ first paint shows only the map; search
is behind the new toggle. Either (a) owner/lead explicitly accepts
"search reachable by one tap" as satisfying the acceptance wording, or (b)
the card opens by default on mobile **and** takes the B2-constrained
geometry so map + search coexist in the primary viewport (also satisfies
"map first" — the map remains visible beneath/beside the card and the card
must stay within the gutter/height caps). The OQ1 matrix row "Closed, no
selection: map only (1)" (`architecture.md:197`) encodes (a); it cannot be
silently chosen where the acceptance names both map "and" search.
**Fix:** owner/lead decision recorded in `.agents/pipeline.md`; likely (b).

### D3 — Scroll-region budget — **PASS with risk (RA1, RA2).**

`architecture.md:150-156` (D3), `architecture.md:185-205` (OQ1 definition +
matrix). The definition (map = 1; reachable, non-covered surface with
`scrollHeight > clientHeight` and `overflow-y:auto|scroll`; covered ⇒ not
counted) is precise and testable, and enforcement needs no `:has()`
(descendant combinators + `display:none` + z-order) — allowed surface.

- **RA1 (Risk-accepted):** the matrix (`architecture.md:197-201`) omits the
  "selection only (no card, no sheet)" state: map + capped selection card
  (`min(45vh,260px)`, `architecture.md:140`) = 2 — within budget, add the
  row for completeness.
- **RA2 (Risk-accepted):** matrix row "Sheet open + selection"
  (`architecture.md:200`) is unreachable: `select(id)` closes the sheet
  (`src/App.tsx`) — mark it unreachable/transient rather than a live state.

### D4 — Map resize handling — **PASS (with RA4 rationale note).**

Verified: `src/components/MapView.tsx` (400 lines) contains **no**
`invalidateSize`, `ResizeObserver`, or resize handling today → the
`architecture.md:158-164` branch "add a ResizeObserver on the map container
→ `invalidateSize()`" is the right one. Correct and low-risk: existing
Leaflet API, no new dependency, desktop-neutral (fires on desktop window
resize too, where size was already correct).
**RA4:** the D1 rationale (`architecture.md:108-110`) frames it as
"container-size change" — the mobile sheet and card are absolute overlays
that do **not** change the map's flex size; the observer's real value is
window resize/rotation and any true container-width change. Document
precisely.

### D5 — Sheet-height token — **PASS.**

`architecture.md:166-173`. Single `--hf-sheet-h:min(55vh,480px)` on `.app`
inside the 768 px block, two consumers (`.app-panel{height:var(…)}`,
`.app-sheet-open .sheet-fab{bottom:calc(var(…) + 14px)}`). Computed values
are identical to the two duplicated literals today (`src/styles.css` sheet
block ~line 323) → no visual delta, desktop untouched, drift class of bug
removed. Custom property is explicitly on the allowed surface. No findings.

### D6 — Footer contrast — **PASS as verify-first / expected "record, no change"; scope condition RA3.**

`architecture.md:175-181` (D6), `architecture.md:220-228` (OQ4). Dark-theme
footer links (#6ea8fe / #7dadd6 on #0f1720, `src/styles.css` dark token
block) measure ≈7.5:1 / ≈7.6:1 — well above 4.5:1; light theme (light
background, dark text) also passes. Verification-first with recording
expected outcome is the right shape; no default change.
**RA3 (Risk-accepted):** the *contingent* fix
`.app-footer a{color:var(--hf-footer-link)}` is specified as
"**media-independent**, footer-scoped only" (`architecture.md:179-180`,
echoed OQ4 `architecture.md:222-226`) — if it were triggered it would re-tint
the **desktop** footer links at 1280 px, violating "Desktop 1280 px
pixel-unchanged". Probability low (measured values pass), but pre-scope the
contingent rule to `@media (max-width:768px)` (allowed surface) so the
violation cannot occur.

## 3. Open-question dispositions (OQ1–OQ6)

| OQ | Disposition |
|---|---|
| OQ1 | **Adopt** — definition + budget accepted; add the missing "selection only" row (RA1); mark "sheet open + selection" unreachable (RA2). |
| OQ2 | **Reject as written (B3)** — conflicts with the C7 acceptance wording. Re-decide: (a) owner-accepted "toggle reachability" interpretation recorded in the ledger, or (b) default-open card with B2-constrained geometry (recommended). |
| OQ3 | **Adopt** — verified the footer carries the identical 6 links (`src/AppShell.tsx`); `display:none` header links lose nothing. |
| OQ4 | **Adopt with condition (RA3)** — pre-scope the contingent color fix to ≤768 px. |
| OQ5 | **Adopt** — positioning-only change with D5 token is the right call (no strip, no handle); the 320 px "pill does not obstruct attribution" claim is verified in-browser in QA (§7). |
| OQ6 | **Adopt** — no min-height is correct (flex remainder); the 50dvh fallback (+ px fallback line) is inside the allowed surface and only triggers if the screenshot matrix shows collapse. |

## 4. Hard-constraint compliance (check:layout) — **PASS**

- `src/styles.css` (448 lines) currently contains exactly **three**
  `flex-direction` declarations: `.app{…flex-direction:column}`,
  `.app-body > .app{…flex-direction:row}`,
  `.legend-grid{display:flex;flex-direction:column}` — the required set, no
  extras. `scripts/check-map-layout.mjs` (brace-depth, comment-stripping
  parser) passes them and catches any add/remove/mis-pair; `display:flex` /
  `display:inline-flex` are not counted (parser greps the property only).
- The design adds **zero** `flex-direction` declarations and removes/alters
  none (`architecture.md:70-87` compliance proof; §3 table `architecture.md:64-68`).
- Every planned CSS property is on the allowed surface: `display`,
  `visibility`, `position-*/top/left/right/bottom`, `width/max-width/
  height/max-height/min-height`, `overflow` (longhand `overflow-y:auto` at
  `architecture.md:135` is the overflow property's vertical axis — within
  "overflow", noted for implementation discipline), `z-index`,
  `border-radius`, `box-shadow`, `padding`, `font-size`, and the one custom
  property `--hf-sheet-h`. **No `:has()`** anywhere in the design
  (explicitly asserted `architecture.md:204`).
- Gate `npm run check:layout` remains exit-0 by construction; keep it in CI
  as `architecture.md:86-87` demands.

## 5. Findings register

| ID | Severity | Decision | Resolution |
|---|---|---|---|
| B1 | **Blocking** | D1 | Architect: restructure line 3 to fit 351 px (fold "Source & Method" + 3 toggles into the "Start here" disclosure, or a controlled 2-line with short labels); re-derive ~135 px/≥60 px from measured widths. `architecture.md:99-110`. |
| B2 | **Blocking** | D2 | Architect: constrain open-card geometry — right gutter ≥44 px for zoom, bottom clear of FAB: `right:44px`, `max-height:min(75vh,calc(100% − 72px))`; clears card-over-zoom and card-over-selection cover. Accepted fix shape; all within allowed properties. `architecture.md:133-139`. |
| B3 | **Blocking** | D2/OQ2 | Owner/lead decision recorded in `.agents/pipeline.md`: accept "search reachable by one tap" as satisfying "map + postcode search own the primary viewport", or default-open card with B2 geometry (recommended). `architecture.md:209-212` vs C7 acceptance ~1959-1967. |
| RA1 | Risk-accepted | D3/OQ1 | Add missing "selection only" matrix row (= 2, within budget). `architecture.md:197-201`. |
| RA2 | Risk-accepted | D3/OQ1 | Mark "sheet open + selection" unreachable (`select()` closes sheet). `architecture.md:200`. |
| RA3 | Risk-accepted | D6/OQ4 | Pre-scope contingent footer color fix to `@media (max-width:768px)` to protect desktop pixel-unchanged. `architecture.md:179-181`. |
| RA4 | Risk-accepted | D4 | Correct the rationale: sheet/card are overlays (no flex resize); ResizeObserver's value is window resize/rotation. `architecture.md:108-110`, `:158-164`. |
| RA5 | Risk-accepted | All | `overflow-y:auto` longhand is within the "overflow" surface; no action — the gate already enforces the `flex-direction` set. |

## 6. Risks carried to the PM

1. **Rework loop:** B1+B2+B3 require one architect revision pass (D1, D2, OQ2
   only — D3/D4/D5/D6 and the hard-constraint position are stable); re-review
   after revision. Work-list should be scoped to CSS + one React state/toggle;
   nothing else moves.
2. **In-browser dependency:** verification checks 3–9 (see §7) have no repo
   automation (no browser-automation dependency exists); they land on
   James's mobile-visual ship gate. Do not add a Puppeteer/Playwright
   dependency inside this cycle (out of scope, cost inflation).
3. **Desktop byte-identity** rests on the StartHere inline-style→CSS
   relocation producing identical computed styles
   (`architecture.md:115-119`, §6 manifest `:251-259`): QA must spot-check
   computed styles (position/top/left/z-index/width/max-width) at 1280 px,
   not just the DOM diff.
4. **Open implementation detail** (not a risk, flagged): the subtitle class
   for `font-size:.75rem` is "confirmed at implementation time", add class if
   absent (`architecture.md:95-97`) — attribute-level, on the allowed surface.
5. **ADR scope:** ADR-0038 (default-closed disclosure) encodes the B3
   position — it must be re-issued after the OQ2 decision; ADR-0039/0040/0041
   stand as drafted.

## 7. In-browser-only QA checks

Checks 1–2 of `architecture.md:274-281` (check:layout exit 0; build +
prerender DOM diff) are repo-runnable. Checks 3–9 require real layout/
rendering and are **in-browser-only** (jsdom performs no layout; no browser
automation dependency in the repo):

- Check 3 — 375×812 screenshot matrix, dark + light, 5 states: header line
  count, first paint, overlap/FAB/zoom (also the B1/B2 regression proof).
- Check 4 — `document.documentElement.scrollHeight <= window.innerHeight` in
  all 5 states (no page scroll).
- Check 5 — reachable scrollable-region count ≤ 2 per the OQ1 definition.
- Check 6 — footer link contrast measured in both themes, recorded in
  `qa.md` (D6's expected "record, no change").
- Check 7 — marker/tile alignment after card open/close, sheet open, and a
  resize (D4/ResizeObserver proof).
- Check 8 — 320 px: no horizontal overflow; zoom vs selection-card overlap
  within accepted R7; pill vs attribution (OQ5).
- Check 9 — a11y: Tab order (new toggle before map), `aria-expanded`
  updates, focus returns to control on close (R8).

These are James's ship-gate items, consistent with the C7 ledger
(push + mobile visual verification owned by James).

---

**Total: 3 Blocking, 5 Risk-accepted. Verdict: FAIL (rework to Architect: D1, D2, OQ2).**

## Rework round 1 re-review (2026-11-15)

**Stage:** 3 (Reviewer) · **Mode:** read-only · **Scope:** rework round 1 against the original findings only.

### Verdicts

- B1: PASS
- B2: PASS
- B3: PASS
- RA1: PASS
- RA2: PASS
- RA3: PASS
- RA4: PASS
- RA5: PASS
- Hard constraints: PASS

### Evidence notes

- **B1** (header math): D1 rewritten to a 4-line header with the 351 px line
  budget (375 px viewport − 2×12 px padding); per-row estimates ≈300 px /
  ≈275 px, both ≤ 351 px; "Source & Method" moved to the footer; the map-gain
  claim corrected to "≈20 px (≥60 px was false)"; §1 and §8.3 now agree.
- **B2** (card geometry): D2 mobile rule `top:12px; left:12px; right:44px;
  max-height:min(75vh, calc(100% - 72px))`; the 44 px right band keeps the
  "Open list" FAB and the top-right zoom controls clear; the sheet-wins
  specificity rule is last.
- **B3** (default state): `startHereMobileOpen` initial `true`; OQ2, manifest,
  D3, R4, R6 and §11 all consistent; ADR-0038 re-issued with option (b) and
  identical geometry.
- **RA1**: "Selection only" row; `select()` closes the mobile card in the same
  step as the sheet close.
- **RA2**: row marked unreachable in the affected-row table.
- **RA3**: contrast fix scoped to the ≤768 px media block only.
- **RA4**: D4 justification for container-responsive (not viewport) recompute
  plus ResizeObserver.
- **RA5**: no action required; `overflow` is on the allowed surface
  (size/visibility/overflow/position only).
- **Hard constraints**: zero new or changed `flex-direction` (3-pair table
  re-checked); all changes confined to size/visibility/overflow/position under
  max-width queries; no `:has()`.

All evidence confirmed against the exact prior wording in `architecture.md`
(390 lines), the ADR-0038 re-issue, and the original review in this file.
Section fill-in performed by the lead from the verified subagent result after
the subagent's full-file writes were blocked by its output ceiling (4 rejected
attempts, cutoff shrinking 342→277); file integrity preserved (277 prior lines
verbatim + 23-line skeleton).

### OVERALL

**PASS** — rework round 1 accepted; stage 3 complete, C7 proceeds to Stage 4
(Product Manager).
