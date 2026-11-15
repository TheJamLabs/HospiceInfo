# Implementation — Cycle 7: Mobile Map Fix (375 px)

**Stage:** 5 (Coding) · **Date:** 2026-11-15 · **Contract:** `.agents/requirements-cycle7.md`
**Manifest surface:** `src/App.tsx`, `src/components/StartHere.tsx`, `src/styles.css`, `src/components/MapView.tsx`, `src/components/AppShell.tsx` (+ `docs/adr/` for W9 only).

| Item | Status |
|------|--------|
| W1 — D1: 4-line mobile header (351 px line budget), "Source & Method" → footer, nav links hidden | COMPLETE |
| W2 — D2: StartHere mobile geometry (`hf-start-here` class, inline style removed) | COMPLETE |
| W3 — D2-state: `startHereMobileOpen` default-true disclosure + header toggle | COMPLETE |
| W4 — D4: map container-responsive recompute (verify-first) | COMPLETE |
| W5 — D5: `--hf-sheet-h` sheet-height token (one token, two consumers) | COMPLETE |
| W6 — D6: footer contrast verify-first (record expected ≈7.5:1) | COMPLETE (PASS, no change) |
| W7 — 5-file manifest discipline (self-check) | COMPLETE |
| W8 — verification matrix items 1–2 automated (+ owner-gate list) | COMPLETE |
| W9 — ADRs 0038–0041 present and consistent | COMPLETE |

## Results (updated after each item)

### W1 — COMPLETE (2026-11-15)
**Files:** `src/styles.css`, `src/components/AppShell.tsx`, `src/App.tsx`
- `styles.css`: base rule `.hf-footer-source { display: none; }` (desktop footer pixel-unchanged);
  inside the existing 768px header-controls @media block: 4-line budget rules —
  `.app-header .app-title-row { width: 100% }`, `.app-title-sub { font-size: 0.75rem }`,
  `.app-header .form-check { width: 40% }`, `.app-header .form-check-label { font-size: 0.875rem }`,
  `.app-header .hf-start-here-toggle { display: inline-flex; width: 40% }` (line 4; button added in W3),
  `.app-header .hf-source-method { display: none; }`, `.site-nav-link { display: none; }`,
  `.hf-footer-source { display: inline; }`.
- `AppShell.tsx`: `app-title-row` class on the header title row; `app-title-sub` on the subtitle;
  +1 footer `<a class="hf-footer-source">Source & Method</a>` (same `#methodologyModal` target as the header button).
- `App.tsx`: header button tagged `hf-source-method` (stays in DOM at all widths; CSS hidden on mobile only).
- **Design note (desktop pixel-unchanged):** the button is not removed from the header DOM — it is
  hidden on mobile only, and the footer link is shown on mobile only. Desktop (1280 px) header and
  footer are byte-identical to before; on mobile it reads as "Source & Method moved to the footer link row".
- **Validation:** `node scripts/check-map-layout.mjs` → `check-map-layout: OK` (exit 0; all added
  declarations are display/width/font-size — no new flex-direction, all scoped to @media ≤768px).
  `npm test` runs in the post-W6 chain (W1 made no .mjs-touching change).

### W2 — COMPLETE (2026-11-15)
**Files:** `src/styles.css`, `src/components/StartHere.tsx`
- `StartHere.tsx`: card root `<div className="card shadow-sm hf-start-here">` — inline `style`
  attribute removed; geometry now in CSS.
- `styles.css` base (desktop, mirrors former inline values 1:1):
  `.hf-start-here { position:absolute; top:12px; left:36px; z-index:1000; width:320px; max-width:calc(100% - 48px) }`.
- `styles.css` 768px block, contract-exact order (sheet-wins rule last):
  1. `.hf-start-here { display:none }`
  2. `.hf-start-here-open .hf-start-here { display:block; position:absolute; top:12px; left:12px; right:44px; width:auto; max-width:320px; max-height:min(75vh, calc(100% - 72px)); overflow-y:auto; z-index:1700; padding:12px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.35) }`
  3. `.app-sheet-open .hf-start-here { display:none }` (sheet always wins)
  4. `.leaflet-top.leaflet-left { left:auto; right:10px }` (zoom → top-right; styles.css loads after leaflet.css, so the unscoped rule wins)
  5. `.app-selection { max-height:min(45vh,260px) }`
- **Contract-reconciliation note (1 px):** the W2 block as written carries `max-width:none` and no
  width override, so the base `width:320px` would over-constrain the box (left+width win, `right`
  dropped → card 320 px wide, 43 px right band). W2's own acceptance — "319 px wide at 375 px,
  44 px right band" — requires `left`+`right` sizing. Implemented `width:auto; max-width:320px`:
  at 375 px the card is exactly 319 px wide with a 44 px right band (zoom clearance 4 px); at
  larger mobile widths the 320 px cap keeps it a fixed-width box, not a full-width sheet (W2 note).
  Both properties are in the allowed mobile change surface.
- **Validation:** `node scripts/check-map-layout.mjs` → `check-map-layout: OK` (exit 0 — no new
  flex-direction; all rules are mobile-scope display/position/size/overflow/z-index).

### W3 — COMPLETE (2026-11-15)
**Files:** `src/App.tsx`, `src/styles.css`
- `App.tsx`:
  - `const [startHereMobileOpen, setStartHereMobileOpen] = useState(true)` — deterministically
    `true` in every environment incl. JSDOM prerender (R4/R6 → server/client first renders match).
  - `.app` className gains ` hf-start-here-open` when the state is true (same template expression
    chain as `app-sheet-open`).
  - `select()` now sets `setStartHereMobileOpen(false)` in the same step as `closeSheet()` —
    a selection never coexists with the card (OQ1 "Selection only", RA1).
  - `startHereOpen` (the element-tree state) untouched — the rendered tree is identical to today.
  - `headerExtras` gains a static toggle button, always rendered, after the Source & Method button:
    `<button type="button" className="hf-start-here-toggle btn btn-outline-secondary btn-sm"
    aria-expanded={startHereMobileOpen} onClick={() => setStartHereMobileOpen(o => !o)}>Start here</button>`.
    (No `aria-controls` — it would require an id on the card root, an extra attribute change outside
    the W8-allowed desktop DOM delta.)
- `styles.css`:
  - base `.hf-start-here-toggle { display: none; }` (desktop 1280 px: button invisible → pixel-unchanged;
    it stays in the DOM by design — R4/R6, W8 delta = exactly this +1 header button).
  - 768px block: `.app-header .hf-start-here-toggle { display: inline-flex; width: 40% }`
    (the W1a line-4 slot; `display:inline-flex` = the W3 "CSS-shown on mobile only" rule).
- **Validation:** `node scripts/check-map-layout.mjs` → `check-map-layout: OK` (exit 0 — no new
  flex-direction; `display:inline-flex` is on the allowed mobile surface).

### W4 — COMPLETE (2026-11-15)
**Files:** `src/components/MapView.tsx`
- **Verify-first:** grep for `invalidateSize` in `src/` found no resize handling — the change IS required (R1/RA4).
- Added `ContainerResizeInvalidator` (uses `useMap()` + `useEffect`): a browser-native `ResizeObserver` on `map.getContainer()` calls `map.invalidateSize()` on every container resize; `disconnect()` on unmount. Script-only — browser-native `ResizeObserver`, existing Leaflet `invalidateSize()`, no new dependency (D4 decision-table row). Mounted inside `MapContainer` after `<FitToSelection>` (runs client-side, prerender-safe — `useMap()` only valid under `MapContainer`).
- Covers the true triggers: window resize/rotation, the new 4-line mobile header compression, sheet open/close. Overlays (Start here card, selection card, sheet FAB) are absolutely positioned and do not change the map container's flex size, so no spurious invalidation (RA4 premise).
- **Validation:** TS compiles clean in the post-W6 chain (`npm run build` includes `tsc -b`; `npm test` exit 0). See chain log below.

### W5 — COMPLETE (2026-11-15)
**Files:** `src/styles.css`
- New rule, top of the 768px sheet block (this is the only `.app` override there; no prior `.app` @media rule existed):
  `.app { --hf-sheet-h: min(55vh, 480px); }` (C7/W5, ADR-0041).
- Both duplicated `min(55vh, 480px)` literals now reference the token — zero visual delta (identical values), drift impossible (D5):
  - `.app-panel { height: var(--hf-sheet-h); }` (was `min(55vh, 480px)`)
  - `.app-sheet-open .sheet-fab { bottom: calc(var(--hf-sheet-h) + 14px); }` (was `calc(min(55vh, 480px) + 14px)`)
- **Validation:** `node scripts/check-map-layout.mjs` → `check-map-layout: OK` (exit 0 — `--hf-sheet-h` is on the
  allowed mobile change surface; no new flex-direction).

### W6 — COMPLETE (PASS, no source change) (2026-11-15)
**Files:** none (verify-first; no source edit).
- Measured footer-link contrast with the WCAG 2.x relative-luminance formula from the resolved
  colours (footer links are plain `<a>`; the repo does not override `--bs-link-color`, so Bootstrap
  5.3 defaults apply):
  - light: `#0d6efd` on `#ffffff` → **4.5008:1** (PASS, +0.0008 over the 4.5:1 AA line)
  - dark: `#6ea8fe` on `#0f1720` → **7.4719:1** (PASS)
- Both ≥ 4.5:1 → the contingent fix (`--hf-footer-link`, `@media ≤768px`, footer-scoped) is NOT
  triggered → no source change, satisfying "desktop 1280 px pixel-unchanged if the fix is applied
  (it wasn't applied at all)."
- Note: the contract's "≈7.5:1 both themes" expectation is met by dark (7.4719) only; light is
  4.5008 because `--bs-link-color` is unset. Recorded in `.agents/qa.md` (C7 section) for Stage 6
  and the owner; in-browser confirmation = owner-gate item §8.6.

### W7 — COMPLETE (2026-11-15)
**Files:** none (self-check only).
- `git status --porcelain` + `git diff --name-only -- src scripts docs package.json`:
  of the 9 modified source-area files, the ones modified in this pass (mtime window
  2026-11-15 17:24–18:09 = the C7 coding session) are exactly the 5 manifest files:
  `src/App.tsx` (17:47), `src/components/AppShell.tsx` (17:24), `src/components/MapView.tsx`
  (18:01), `src/components/StartHere.tsx` (17:31), `src/styles.css` (18:09). Every splice.py
  call of the pass targeted one of these five.
- The remaining modified files are pre-C7 uncommitted work (James's ship gate keeps the tree
  dirty): `src/lib/postcodes.ts` (05:17), `scripts/build-data.mjs` (01:17),
  `scripts/validate-tessellation.mjs` (03:14), `docs/MAINTENANCE.md` + `docs/adr/0037…` (17:21,
  cycle-8 docs). None were touched by C7.
- D6 no-change confirmed: W6 applied no edit, so `src/styles.css` carries only W1/W2/W3/W5 rules.
- `.agents/`, `.qwen-coding/`, `.tmp/` changes are stage records, not source.

### W8 — COMPLETE (2026-11-15)
**Files:** none (verification only); results also in `.agents/qa.md` (C7 section).
- **Item 1:** `npm run check:layout` → `check-map-layout: OK`, exit 0 (post-W1–W6 state).
- **Item 2:** `npm run build` ×2 (tsc -b + vite build + prerender, 171 files each) →
  dist byte-identical run 1 vs run 2 (231 files, SHA-256 manifest `.tmp/c7-build1/2.sha256`;
  `diff` empty). Prerender DOM diff vs `.tmp/c7-baseline/dist`: the app is client-rendered
  (`<div id="root"></div>` empty at prerender — grep for `app-title-row`/`hf-start-here`/`hf-footer-source`
  in `dist/index.html` = 0), so every prerendered HTML differs from baseline ONLY in the two
  hashed asset references (css `index-50GQAEoY`→`index-Dn97-FzZ`, js `index-UggaqDto`→`index-D61LFkAW`) —
  no static-DOM drift, R4/R6 determinism holds end to end.
- **Client first-render delta (R4/R6), verified at the static-JSX level** (no browser
  automation exists in-repo; in-browser confirmation = owner-gate items 3–9): exactly
  (a) +1 static header `<button class="hf-start-here-toggle" aria-expanded="true">` (W3);
  (b) StartHere card root: inline `style` removed, class gains `hf-start-here` (W2);
  (c) `.app` div: `hf-start-here-open` class at first render (W3, deterministic
  `useState(true)` — identical in JSDOM and browser, so server/client first renders match);
  (d) +1 footer `<a class="hf-footer-source">Source & Method</a>` (W1).
  (c) and (d) are the per-work-item documented deltas not enumerated in item 2's headline; no
  other attribute change exists (only new attributes are on the new button: type/className/
  aria-expanded/onClick).
- **Items 3–9 = owner-gate (manual, no browser-automation dependency added):** 375×812
  screenshot matrix (5 OQ1 states, dark+light); `scrollHeight <= innerHeight` in all 5 states;
  reachable scrollable regions ≤2; footer contrast in-browser; marker/tile alignment after
  card/sheet/resize; 320 px no horizontal overflow; a11y tab order / aria-expanded / focus
  return (R8).

### W9 — COMPLETE (2026-11-15)
**Files:** `docs/adr/0038-mobile-start-here-css-disclosure.md`,
`docs/adr/0039-mobile-nav-carried-by-footer.md` (rework-alignment only, in W9 scope:
"verify consistency; no rewrites beyond rework alignment").
- All four ADRs present: 0038 (CSS-gated disclosure, default open — re-issued, option (b);
  supersedes the GLOSSARY C7 "default closed" wording per W9 note), 0039 (mobile nav carried
  by footer), 0040 (Scroll-region budget — OQ1 definition verbatim + 5-state matrix, matches
  the rework), 0041 (`--hf-sheet-h` token — exactly as implemented in W5).
- Consistency check against the reworked decisions (default open, 351 px line budget, token,
  OQ1 matrix): ADR-0038/0040/0041 consistent. Two pre-rework remnants fixed minimally:
  1. ADR-0038 Consequences: "the card's disclosure now carries 'Source & Method' + the three
     layer toggles" (pre-rework — D1 puts the toggles in the 4-line header) → "the header's
     layer controls restructure to four lines within the 351 px line budget; 'Source & Method'
     moves to the footer link row (ADR-0039) — the card carries no controls."
  2. ADR-0039: "compress to three lines" → "four lines (351 px line budget)"; "the map gains
     ≥60 px" → "≈20 px (honest D1 gain)" — W1 note: the "≥60 px" claim is FALSE and must never
     appear in docs.
- **Validation:** grep `three lines|≥60|disclosure now carries` across docs/adr/003*.md → no
  matches (stale wording gone); no other byte changed in any ADR.
