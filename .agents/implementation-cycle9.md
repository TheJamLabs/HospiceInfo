# Cycle 9 — Implementation log

Owner: Coding. Sub-session `ab8fe3d6` (qwen-dense) timed out at first-turn
wait and landed **partially** (styles.css C9-1, AppShell.tsx C9-2). After a
~7 min watch window confirmed the tree was frozen, the lead completed the
remaining items in-session as in-lead fallback, reusing the verified
late-landing artifacts. All work below is on disk in `main`'s working tree.

Date: 2026-11-17. Inputs: requirements-cycle9.md (work list C9-1…C9-6),
architecture-cycle9.md §2/§3/§5/§7, design-cycle9.md LS-9-1…8,
review-cycle9.md R1–R4, ADR-0043.

## Status: all items done, all gates green.

### C9-1 — D1 one-line fix — done
- `src/styles.css` `.app` rule: `min-height: 100%;` (replaces
  `min-height: 0;` + `height: 100%;` — `min-height:100%` supersedes both;
  the clamp chain `html/body/#root {height:100%}` + `main.app-body {flex:1
  1 auto; min-height:0}` untouched). Desktop map route resolves to the same
  height as today; content routes may now stretch past 100% so the footer
  sits below the content (D1).
- Validation: `npm run check:layout` green (run after C9-4; clean after
  C9-1 per same set-invariant). Footer-overlap QA verification is Stage 6.

### C9-2 — AppShell slots + burger + offcanvas + CTA row — done
- `src/components/AppShell.tsx` (7,812 B): `mobilePanel?` / `headerCta?`
  optional slot props; burger appended after `</nav>` in the header
  title-row flex (`hf-burger btn`, `aria-label="Open menu"`,
  `aria-expanded={false}`, `aria-controls="mobileMenu"`,
  `data-bs-toggle="offcanvas"`, `data-bs-target="#mobileMenu"`, 18 px
  3-bar SVG per LS-9-1); offcanvas sibling of header (`offcanvas
  offcanvas-end hf-menu-panel`, `tabIndex={-1}`, `id="mobileMenu"`,
  `aria-labelledby="mobileMenuLabel"`, `h2#mobileMenuLabel` "Menu" +
  `btn-close`); body order = theme `btn-group.menu-theme` (R1: full own
  header class expression `btn btn-outline-secondary btn-sm` + dynamic
  `active`, `aria-pressed`, shared `mode`/`pickMode` state), `{mobilePanel}`,
  `hf-panel-source` button → `#methodologyModal`; CTA-row wrapper
  `<div className="hf-cta-row">{headerCta}</div>` between `</header>` and
  the offcanvas/main.
- aria sync: `useEffect` on `menuPanelRef` listens
  `shown.bs.offcanvas`/`hidden.bs.offcanvas`, sets burger
  `aria-expanded` "true"/"false"; cleanup removes listeners; `[]` deps.
  No React panel state — Bootstrap owns `show`, focus trap, Esc, backdrop.
  Panel is static markup, initially closed, rendered once, never unmounted
  (invariant B).

### C9-3 — App.tsx wiring + FAB icon — done
- `src/App.tsx` (347 lines): map-route `AppShell` now receives
  `headerCta` = Start here button (`hf-start-here-cta btn`, same
  `startHereMobileOpen` `useState(true)` wiring, `aria-expanded`, toggling
  `setStartHereMobileOpen`); `mobilePanel` = three id-less layer
  switches (labels/titles/state bindings identical to header copies —
  R4/I); `headerExtras` retains ONLY the `hf-source-method` button; old
  `hf-start-here-toggle` button removed from `headerExtras`.
- FAB: 18 px inline list SVG (`stroke="currentColor"`, `aria-hidden`)
  before the label; labels byte-identical `Open list`/`Close list`;
  `sheetOpen`/`aria-expanded`/`aria-controls` untouched.
- `select()`, `.hf-start-here-open` class composition on `.app`,
  StartHere card logic — untouched.

### C9-4 — styles.css ≤768 rewrite + component rules — done
- Deleted both old `.hf-start-here-toggle` rules (former base and ≤768) —
  see C9-5.
- Added base (all viewports): `.hf-burger{display:none}` and
  `.hf-cta-row{display:none}` (desktop pixel-identical header).
- Rewrote the ≤768 header block in full (R5 — no dead selectors): drops
  subtitle `.app-title-sub{display:none}`, hides `.theme-group`,
  `.app-header .form-check`, `.app-header .hf-source-method`; shows
  `.hf-burger` (inline-flex centred, 44 × 44); keeps
  `.site-nav-link{display:none}` + `.hf-footer-source{display:inline}`.
  No re-introduction of `.app-title-row{width:100%}`.
- CTA row ≤768: `.hf-cta-row{display:block}`;
  `.hf-start-here-cta` = width:100%, min-height:48px, border:0,
  border-radius:0, padding:0.5rem 0, background:var(--hf-primary),
  color:var(--hf-primary-ink), font-size:1rem, font-weight:600 (LS-9-4;
  600, not 700). No `.app-sheet-open .hf-cta-row{display:none}` (R2 —
  C7 parity, not a regression).
- Menu panel ≤768: `.hf-menu-panel{z-index:2100; width:100vw}` (C2);
  `.hf-menu-panel .form-check{min-height:44px}`,
  `.hf-menu-panel .form-check-input{scale:1.4}`,
  `.hf-menu-panel .btn{min-height:44px}`,
  `.menu-theme{width:100%; justify-content:space-between;
  margin-bottom:0.75rem}` (C1, LS-9-5).
- FAB ≤768 `.sheet-fab`: added `gap:0.5rem; align-items:center;`; shadow
  `0 2px 8px rgba(0,0,0,0.35)` → `0 4px 16px rgba(0,0,0,0.4)` (LS-9-7).
  Position `left:50%/translateX(-50%)`, open offset
  `calc(var(--hf-sheet-h) + 14px)`, z 2000, 48 px, pill, colours —
  all untouched.
- Invariants preserved in the file: `.app-sheet-open
  .hf-start-here{display:none}`, `--hf-sheet-h: min(55vh,480px)`, sheet
  1600 / scrim 1500 / card 1700; no new `--hf-*` tokens (K); colours only
  via tokens (G).

### C9-5 — Dead-selector audit (R4) — done
- `grep -rn 'hf-start-here-toggle' src/` → **zero hits** (exit 1). The
  three known sites are all gone.
- `.hf-burger` / `.hf-cta-row` spot-check: only the base + ≤768 rules.
  No other C8-era selector outlives its element in the ≤768 block
  boundaries.

### C9-6 — Final gates — all green (2026-11-17, repo root)
1. `npx tsc -b` — green (no output, exit 0).
2. `node --test` — **26/26 pass, 0 fail, zero test edits** (duration
   ~3.1 s).
3. `npm run check:layout` — `check-map-layout: OK`, `Error: (none)` —
   flex-direction strict set `{.app column, .app-body > .app row,
   .legend-grid column}` unchanged (R3/C4 hard guard; re-run at the gate,
   not only after C9-4).
4. `npm run build` (tsc -b && vite build && prerender) — green (428.73 kB
   JS / 254.26 kB CSS); `node scripts/prerender.mjs` run twice over the
   built `dist/` → `diff -r` → **BYTE-IDENTICAL**.
5. `dist/sitemap.xml` — **215 `<loc>`** entries (regenerated by the build
   chain).
6. C9-5 re-grep — still zero.
7. Gate 7 (R5): `id="mobileMenu"` exactly **1** occurrence in `src/`;
   `mobileMenuLabel` = 1 `id` + 1 `aria-labelledby`; `styles.css` carries
   no `mobileMenu*` selector (0). Offcanvas `aria-*` wiring complete.

## Invariants re-verified (spec §3 / §4)
- A `startHereMobileOpen` `useState(true)` — untouched (App.tsx).
- B panel static/closed/statically-rendered — C9-2.
- C z-ladder 1500 < 1600 < 1700 < 2000 < 2100; backdrop ≈1040 below 1500.
- D `.app-sheet-open .hf-start-here{display:none}` — untouched.
- E FAB open offset + `--hf-sheet-h` — untouched.
- F desktop ≥769 px: burger hidden (base), CTA row hidden (base), header
  unchanged at 1280; map route 1280/768/375 parity is Stage 6's visual
  pass (no geometry tokens changed — verify by diff-free re-render).
- G colours via tokens only; FA B shadow is a sanctioned shadow literal.
- H touch targets: burger 44, CTA 48, panel checks 44, panel buttons 44,
  FAB 48.
- I header toggles remain in the DOM at ≤768 (CSS-hidden) with their ids;
  panel copies id-less.
- J no new `flex-direction` declarations (check:layout strict set OK).
- K no new `--hf-*` tokens.

## Review conditions evidenced
- R1 — panel theme buttons carry the full own-header class expression
  (AppShell.tsx panel `btn-group.theme-group.menu-theme`, identical
  `className` ternary incl. `active` as the header group).
- R2 — no `.app-sheet-open .hf-cta-row` rule in styles.css.
- R3 — check:layout strict set green at the final gate.
- R4 — panel switches id-less; header copies keep
  `gpsToggle`/`childrenToggle` once each; label/title pairs identical
  between copies; no duplicate ids.

## Files touched (this cycle)
- `src/styles.css` (C9-1, C9-4)
- `src/components/AppShell.tsx` (C9-2)
- `src/App.tsx` (C9-3)
- `docs/adr/0043-mobile-menu-panel-and-cta-row.md` (written by Architect,
  carried here for the commit scope)
- `.agents/implementation-cycle9.md` (this file)

No test, data, script, or config files changed. Nothing to roll back:
`git checkout -- src/styles.css src/components/AppShell.tsx src/App.tsx`
restores the pre-C9 tree (the artifacts above are the only code delta).
