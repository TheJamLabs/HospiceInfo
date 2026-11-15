# Cycle 7 — Mobile layout fix: Research (2026-11-14)

Stage 1 of 10. Facts + options, no implementation planning (stage 2). All line
references verified this session against the working tree.

## 1. Observed problems

Each mapped to screenshot evidence (owner's two ~375px dark-theme captures)
and the code that causes it.

1. **Header occupies ~half the viewport.** Top: title+subtitle stacked,
   Auto/Light/Dark pills on their own full-width row, Charity shops/GP
   practices/Children's toggles, 6-link row — all the result of the
   `d-flex flex-wrap` header row (AppShell.tsx:55) with no mobile
   compacting rule. The only mobile header rule, the 768px block
   (styles.css:164-180), *increases* height: 44px touch targets
   (styles.css:166-176) and `.theme-group{flex:1 1 100%}` pushing the pills
   onto a full row (styles.css:177-180). No subtitle-hiding, no
   disclosure/collapse anywhere in the header.
2. **Map reduced to a thin sliver under a near-full-screen "Start here"
   card.** The StartHere card is an absolute overlay of `.app-map`:
   `top:12; left:36; width:320; max-width:calc(100% - 48px)`
   (StartHere.tsx:48-50). At 375px it is 320px wide (≈85% of viewport) and
   tall (postcode form + 3-item accordion, StartHere.tsx:66-180) — it
   covers most of the map region, which itself is only `flex:1 1 auto`
   (styles.css:193) between header and footer. Default open on load
   (`startHereOpen` true, App.tsx:50).
3. **"Open list" pill floats over the map + overlaps the accordion/attribution.**
   The FAB is `position:absolute; left:50%; bottom:14px; z-index:2000`
   (styles.css:338-352), anchored to `div.app` (`position:relative`,
   styles.css:75-82; DOM: App.tsx:258-266). On ≤768px it sits at the
   bottom-centre of the whole app box — i.e. on top of the visible map
   strip, the Leaflet attribution, and any StartHere accordion rows reaching
   that low.
4. **Three stacked scrollable regions on 375px** (header stack, map+card,
   list sheet). List panel: `height:min(55vh,480px)` off-canvas bottom
   sheet (styles.css:324-335), `.panel-list{overflow:auto}` inside
   (HospicePanel.tsx), plus 44px min-height controls (styles.css:157-160)
   and header toggles (styles.css:166-176) → total content exceeds one
   viewport; phone viewport scrolling stacks them.
5. **Ragged 6-link + 3-toggle wrap at 320px.** Both live in one
   `d-flex flex-wrap gap-2` nav (AppShell.tsx:67-89); nothing controls the
   wrap, so links flow unevenly (rows of 3 then 2).
6. **Low-contrast blue "Accessibility" text in dark mode.** The footer
   renders the same six NAV_LINKS as plain `a.small` (AppShell.tsx:99-103)
   whose colour is Bootstrap's `--bs-link-color` — never overridden in the
   app's dark token block (styles.css:39-55 sets `--hf-*`, `--bs-body-*`,
   border only). Static math: raw `#6ea8fe` on `#0f1720` ≈ 7.5:1, so a
   confirmed WCAG failure is NOT established — the owner's perception needs
   in-browser verification; mechanism is certain: footer links are
   Bootstrap blue, header links are high-contrast `var(--hf-text)` via
   `.site-nav-link` (styles.css:100-107).

## 2. Current layout architecture

**Component tree (map page):**
```
main.tsx → App (App.tsx)
└─ AppShell (AppShell.tsx:39)  →  div.app  (AppShell.tsx:49)
   ├─ a.skip-link              (AppShell.tsx:50-52; styles.css:113-119)
   ├─ header.app-header        (AppShell.tsx:53-92)  [styles.css:92-97, flex:0 0 auto]
   │   └─ d-flex flex-wrap row (AppShell.tsx:55)
   │      ├─ brand: logo + h1.h4 + subtitle (AppShell.tsx:56-66)
   │      └─ nav (AppShell.tsx:67)
   │         ├─ .theme-group .btn-group Auto/Light/Dark (AppShell.tsx:68-82)
   │         ├─ headerExtras: 3 form-switch toggles + "Source & Method"
   │         │   button (App.tsx ~118-155)
   │         └─ 6 × a.site-nav-link (AppShell.tsx:84-88)
   ├─ main.app-body#mainContent (AppShell.tsx:93-95) [styles.css:119-123]
   │   └─ div.app[.app-sheet-open] (App.tsx:~104)  [styles.css:87-90 → ROW]
   │      ├─ aside.app-panel#appPanel (App.tsx:~105) [styles.css:132-138]
   │      │   └─ HospicePanel (filter, 5-nation btn-group, sort, 2 counters,
   │      │       .panel-list of .panel-item rows)
   │      └─ div.app-map (App.tsx:~121) [styles.css:193-197]
   │         ├─ .app-selection (conditional) [styles.css:204-215]
   │         ├─ StartHere (conditional)      [StartHere.tsx:48-50, inline absolute]
   │         ├─ MapView → .app-map-canvas absolute inset:0 [styles.css:199-202]
   │         └─ Methodology modal
   ├─ button.sheet-fab "Open list"/"Close list" (App.tsx:258-266)
   ├─ button.sheet-scrim (App.tsx:267-271)
   └─ footer.app-footer (AppShell.tsx:96-105)
       └─ <small> + 6 × a.small (duplicate of NAV_LINKS, AppShell.tsx:99-103)
```
FAB/scrim are children of the **inner** `div.app` (after `.app-map`), so they
anchor to `div.app`'s `position:relative` (styles.css:81) — the whole
header+main+footer box, not just the map.

**Heights/anchors, with breakpoints (Q1–Q2, Q5).** Exactly **3** `@media`
blocks exist — grep-verified complete set: 768px #1 (styles.css:164-180),
768px #2 (styles.css:323-378), 1100px (styles.css:433-437, footer `small`
full-row). **There is no 900px/600px flex-direction "cycle" in code** — the
brief's wording is stale; the real enforcement is
`scripts/check-map-layout.mjs` (`npm run check:layout`), a file-wide parser
that fails unless the complete flex-direction set equals
`.app→column` (styles.css:77), `.app-body > .app→row` (styles.css:89),
`.legend-grid→column` (styles.css:236).

- **375px (all mobile):** header = intrinsic, no cap, typically 4 wrapped
  rows (brand; theme pills full row via styles.css:177-180; toggles;
  links). `.app-panel` = absolute bottom sheet: 100% wide,
  `height:min(55vh,480px)`, off-canvas `translateY(105%)` until
  `.app-sheet-open` (styles.css:324-340); z-stack scrim 1500 (styles.css:303)
  < panel 1600 (styles.css:334) < FAB 2000 (styles.css:344); `.legend-card`
  hidden (styles.css:371-373); `.app-selection` forced `left:10px;
  right:10px` (styles.css:375-378). Map `.app-map` = full width of main
  (panel off-canvas), height = remaining flex space. StartHere = absolute
  on the map at top:12/left:36/width:320 (StartHere.tsx:48-50).
- **600px / 900px:** nothing changes — no breakpoints exist there.
- **1280px (desktop):** header single wrapping row (brand left, nav right);
  panel = fixed `flex:0 0 340px` left column (styles.css:132) with internal
  scroll; map = right `flex:1 1 auto` (styles.css:193); FAB/scrim
  `display:none` (styles.css:300-302); legend-card visible bottom-left
  (styles.css:220-231); footer `small` wraps to its own row only below
  1100px (styles.css:433-437) — at 1280px it stays one row.

**Duplicated/redundant on mobile (Q4):** (a) theme pills — single owner
(THEME_MODES, AppShell.tsx:25-29); not duplicated, but rendered full-width
on mobile so area-expensive. (b) six nav links — **duplicated set**: header
`.site-nav-link` (AppShell.tsx:84-88) **and** footer plain `a.small`
(AppShell.tsx:99-103), both from one `NAV_LINKS` array (AppShell.tsx:13-20).
(c) three toggles + "Source & Method" — `headerExtras` from App.tsx
(~118-155), single owner, no mobile compacting. (d) FAB "Open list" — the
sole access to the off-canvas list (not redundant, but single access path).

**Map sliver geometry (Q5):** no "reserved" map region exists. Map height is
purely leftover flex: `html/body/#root 100%` (styles.css) → `div.app
height:100%` column (styles.css:75-82) → `main.app-body flex:1 1 auto`
(styles.css:119-123) → inner `.app row flex:1 1 auto` (styles.css:87-90) →
`.app-map flex:1 1 auto` (styles.css:193); canvas `absolute inset:0` fills
it (styles.css:199-202). At 375px: map region = viewport − header (~200px)
− footer (~40px); the StartHere overlay eats up to its full height from the
top of that region, and when the list sheet is open it takes
`min(55vh,480px)` from the bottom (styles.css:324-335) — leaving a sliver.
A usable map **without a third scroll region** therefore requires pinning the
*visible* map height (a vh-based min/max on `.app`/`.app-map` at ≤768px) so
map+postcode occupy one viewport and the list stays the single off-canvas
sheet — pure size/positioning, no new overflow context.

## 3. Candidate improvement directions

All candidates stay inside the allowed surface: sizes, visibility,
overflow, positioning. None add/change/remove a flex-direction; all are
`max-width`-scoped so 1280px is untouched; Bootstrap collapse/dropdown are
already shipped (main.tsx imports bootstrap.esm.js) — no new runtime deps.

1. **Collapse header chrome on ≤768px.** Keep one row: logo + title +
   theme-group. Subtitle → visibility:hide; toggles + "Source & Method" +
   6 links → a compact disclosure (Bootstrap dropdown/collapse behind an
   icon button). Touches: AppShell.tsx (classes/markup, kept DOM-stable so
   prerender is unaffected — fold into nav, no new subtrees), styles.css
   768-block. Respects: no flex-direction; desktop unchanged; static SPA;
   320px wrap becomes a single controlled menu item (kills the ragged row).
2. **Make StartHere mobile-safe (dismissible/anchored).** ≤768px: render it
   as a bottom sheet *above* the FAB (same mechanical pattern as the list
   sheet: absolute, transform, z between 1600 and 2000), keeping the ×
   (StartHere.tsx:55-62); and/or default `startHereOpen` false on small
   screens with the existing panel re-open button (HospicePanel "Start
   here" row) as the affordance. Touches: StartHere.tsx:48-50 (inline style
   → class), App.tsx:50, styles.css 768-block. Respects: card DOM persists
   (prerender-safe if desktop markup unchanged); no new deps.
3. **Reserved map height on ≤768px.** Give the visible map an explicit
   usable height (e.g. `min-height` on `.app-map` / `100dvh` discipline on
   `.app`) so map + postcode fit one viewport with the list a separate
   on-demand sheet. Touches: styles.css 768-block only. Respects: pure
   sizing; check Leaflet `invalidateSize()` (R1) — CSS-static sizing is
   lower risk than animated transitions.
4. **Fix Open-list pill placement.** Keep it absolute but anchor/offset so
   it never overlaps content: a reserved bottom strip (own ~56px zone,
   offset above the Leaflet attribution), or the sheet's handle (sits at
   the sheet's top edge; the open-state calc already exists,
   styles.css:366-368). Touches: styles.css:338-378; optional App.tsx DOM
   move of the FAB. Respects: positioning only; keeps z-order (FAB 2000 over
   panel 1600) intact.
5. **Dark-mode link contrast (Accessibility-link fix).** Add
   `--bs-link-color`/`--bs-link-hover-color` to the dark token block
   (styles.css:39-55) using existing `--hf-primary` (#7dadd6, ≈7.6:1 on
   #0f1720) so footer `a.small` links are no longer Bootstrap #6ea8fe —
   or scope to `.app-footer a` if the global recolor of selection-card
   "website"/"CQC" links is deemed too broad. Touches: styles.css dark
   block only (a custom property, not a flex-direction). Respects: colour
   only, layout-neutral.

## 4. Risks + hard constraints

**Hard constraints (non-negotiable):**
- (a) **`npm run check:layout` (scripts/check-map-layout.mjs) passes
  unchanged**: it requires exactly the flex-direction set
  `.app→column` (styles.css:77), `.app-body > .app→row` (styles.css:89),
  `.legend-grid→column` (styles.css:236); any added/changed/removed
  flex-direction anywhere (incl. inside `@media`) fails. The brief's
  "≤900/≤600 cycle" does not exist — this whitelist is the enforceable
  form.
- (b) **Desktop 1280px unchanged** → all rules in `max-width`-scoped media
  queries (≤768px), plus the neutral token addition in C5 (verify 1280px
  dark/light visuals).
- (c) **Static SPA** — runtime deps are only react/react-dom/leaflet/
  react-leaflet/bootstrap (package.json); no new dependencies, no backend.
- (d) **Deterministic build** — `npm run build` (`tsc -b && vite build &&
  node scripts/prerender.mjs`) must stay byte-identical;
  `scripts/prerender.mjs` inspects stable DOM, so prefer class/style
  changes over structural markup changes; CSS media queries don't run in
  prerender, so mobile-only state (e.g. card defaulted closed) must not
  alter the desktop DOM.

**Risks:**
- **R1 Leaflet sizing**: canvas is `absolute inset:0`; runtime changes of
  `.app-map` size (sheet open/close, header collapse animation) require
  `map.invalidateSize()` or fit/extent misalign. Check MapView resize
  handling before choosing C3; prefer transition-free CSS sizing.
- **R2 FAB↔sheet coupling**: FAB `bottom` is coupled to the sheet height
  (`calc(min(55vh,480px)+14px)`, styles.css:366-368) inside a tight z-stack
  (1500/1600/2000 over the 1000-level map overlays). Repositioning the FAB
  may need the paired calc adjustment in the same rule (one edit per file
  per step).
- **R3 Global link colour**: overriding `--bs-link-color` dark recolours
  *all* links, including selection-card "website"/"CQC" links (App.tsx).
  Footer-scoped rule (`.app-footer a`) is the safer default.
- **R4 Prerender/DOM stability**: StartHere default state and any
  mobile-only markup must be a CSS/JS media check; verify
  `scripts/prerender.mjs` output is byte-identical after changes.
- **R5 "No third scroll region" is under-specified** (OQ1) — risk of
  fixing the wrong metric (total page height vs. simultaneously
  scrollable regions).

## 5. Open questions (for the Architect)

1. **Definition of "no third scroll region"**: is an on-demand bottom
   sheet (map + list as mutually exclusive viewport states) acceptable, or
   must the list be inline? Does "map + postcode own the 375px viewport"
   allow StartHere to stay open (covering part of the map), or must ≥x% of
   the map stay visible with the card open? Drives C2 vs C3 sizing.
2. **StartHere default on mobile**: open (status quo, App.tsx:50) or closed
   with a dominant re-open affordance — if closed, the postcode flow needs
   a condensed entry point (panel top?) or the acceptance line "map +
   postcode own the viewport" fails. Confirm intended semantics.
3. **Header disclosure mechanism**: Bootstrap dropdown (icon button) vs
   compact two-line layout (subtitle hidden, links in a scrollable strip)
   vs links only in footer. Which chrome is essential on the first screen
   (theme? none? mode-only)?
4. **Contrast fix scope**: global `--bs-link-color` dark override vs
   footer-scoped rule; and confirm the target via an in-browser WCAG check
   (static math: #6ea8fe/#0f1720 ≈ 7.5:1 and #7dadd6 ≈ 7.6:1 — both
   zone-A, so the complaint may be visual, not ratio).
5. **FAB form**: reserved strip over the map vs sheet handle — both
   positioning-only; which keeps the Leaflet attribution (bottom-right)
   unobstructed at 320px?
6. **Map min-height expression**: px vs vh vs `dvh` on `.app`/`.app-map`
   at ≤768px — which survives the header-collapse animation (R1) and iOS
   URL-bar resizing reliably?

## 6. GLOSSARY — candidate new terms (Architect to adopt/retire)

- **list bottom sheet** (*italics*): the mobile (≤768px) off-canvas
  rendering of `.app-panel` (styles.css:324-340), opened via the
  open-list pill.
- **open-list pill**: the mobile FAB toggling the list bottom sheet
  (App.tsx:258-266; styles.css:338-352).
- **reserved map region** (*italics*): an explicit minimum visible map
  height on mobile so map+postcode fit one viewport (candidate, not yet
  implemented).
- Collision note: **"sliver"** is already a settled GLOSSARY term for a
  tiny validator cell (GLOSSARY.md:166) — do not adopt "map sliver" as a
  domain term; describe the compressed map region descriptively.
