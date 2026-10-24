# Diagnosis — "map not rendering on desktop" (2026-10-24)

Stage 1 (Diagnosis), bugfix pipeline. Read-only; no code modified.

## 1. Symptom

Verbatim user report: *"map not rendering on desktop"* (`.agents/bug.md`).
Map route (`#map`, catch-all default, `src/lib/useRoute.ts:22-24`) should show the
Leaflet map right of the 340px hospice panel, AppShell header on top, footer below.

## 2. Environment

- `main` @ `ed37091`; layout last touched by `e4b8503` (2026-10-24).
  `git diff e4b8503 HEAD -- src/styles.css src/App.tsx src/components/AppShell.tsx src/components/MapView.tsx` → **empty** (layout unchanged since `e4b8503`).
- Vite 5 + React 18 + TS; Leaflet 1.9.4 / react-leaflet 4.2.1; Cloudflare Pages; static JSON in `public/data/`.
- No live desktop verification ever ran (G5 is mobile-only, open — `.agents/pipeline.md`, Notes 2026-10-24).
- Unknown (not supplied): browser, viewport, URL vs dev-server, what is visible, console output.

## 3. What I observed (committed source, cited)

**DOM.** `src/components/AppShell.tsx:21` — outer `<div className="app">` with
skip-link `:22-24`, `<header className="app-header">` `:25-45` (h1.h4 title `:26-30`,
`.small` subtitle `:31`, `d-flex flex-wrap gap-2` nav `:34-43` incl. `headerExtras`
`:37` = shop toggle + "Source & Method" btn from `src/App.tsx:87-104`, and 6 `.site-nav-link`
labels `:4-11`), `<main className="app-body">` `:47-49`, `<footer className="app-footer d-flex
flex-wrap … px-3">` `:50-58` (`<small>` `SITE_FOOTER_TEXT`, 141 chars, `:51`; text in
`src/lib/siteConfig.ts:20-22`; 6 `.small` links `:52-57`).
`src/App.tsx:108` — **inner** `div.app` inside `<main>`: `aside.app-panel` `:109-121`,
`div.app-map` `:122-188` (`.app-selection` `:123-175`, `MapView` `:177-186`,
`Methodology` `:187`), `button.sheet-fab` `:189-197`, `button.sheet-scrim` `:198-205`.
`src/components/MapView.tsx:161-170` — `MapContainer` → `div.app-map-canvas`.
`src/components/Methodology.tsx:101` — `className="modal fade"` → Bootstrap `display:none`
→ zero layout contribution.

**CSS** (`src/styles.css`, 305 lines; current = `e4b8503` version):
- `:1-4` `html, body, #root { height: 100%; margin: 0; }` — `#root` full width+height.
- `:11-17` **`.app { display: flex; min-width: 0; min-height: 0; height: 100%; position: relative; }` — NO `flex-direction`** → defaults to `row`.
- `:19-24` `.app-header { flex: 0 0 auto; }`.
- `:53-57` `.app-body { flex: 1 1 auto; display: flex; min-height: 0; }` — row, no overflow (visible).
- `:59-65` `.app-panel { flex: 0 0 340px; … min-width: 280px; overflow: hidden; }`.
- `:119-123` `.app-map { flex: 1 1 auto; position: relative; min-width: 0; }`.
- `:125-128` `.app-map-canvas { position: absolute; inset: 0; }` (abs → 0 intrinsic).
- `:131-139` `.app-selection { position: absolute; … }`.
- `:226-243` `.sheet-fab { display: none; }`, `.sheet-scrim { display: none; … }` (desktop).
- `:158` is the **only** `flex-direction: column` in the file — inside `.legend-grid` `:156-160`.
- `@media (max-width: 768px)` blocks `:91-105` (touch targets) and `:245-305` (bottom
  sheet: panel absolute `:247-264`, fab/scrim shown, legend hidden, selection widened)
  — **neither sets `flex-direction` on `.app`/`.app-body`/header/footer** → row on mobile too.

**Git.** `git show dc3cf4d:src/styles.css` (pre-`e4b8503`): `.app { display: flex;
flex-direction: column; height: 100vh; overflow: hidden; }`.
`git show e4b8503 -- src/styles.css` hunk:
```diff
 .app {
   display: flex;
-  flex-direction: column;
-  height: 100vh;
-  overflow: hidden;
+  min-width: 0;
+  min-height: 0;
+  height: 100%;
+  position: relative;
 }
```
→ `flex-direction: column` explicitly removed in `e4b8503`; the same commit added the
header/footer to the `.app` shell, repurposing a rule whose comment `:8-10` describes the
map route's inner container.

## 4. Reproduction - static layout derivation

Per the brief: in this browserless environment, reproduction = statically demonstrating
from committed CSS+DOM that the map column computes to zero/negligible width at a standard
desktop viewport.

**Verdict: REPRODUCED (static derivation).** Spec-certain per CSS Flexbox (initial
flex-direction is row; flex-basis:auto = max-content hypothetical size; non-scrollable
flex items have automatic minimum size 0; absolutely-positioned children contribute no
intrinsic size; display:none contributes nothing). Only header/footer text widths are
measured estimates from the actual JSX strings (sensitivity plus/minus 25 percent below).

Outer row div.app (AppShell.tsx:21; styles.css:11-17):

| Item | Flex | Basis | Min |
|---|---|---|---|
| skip-link | out of flow (absolute, :38) | none | none |
| header | 0 0 auto (:19) | H = 1163 (measured) | none (shrink 0) |
| main.app-body | 1 1 auto (:53) | M = 341 (certain) | 0 (non-scrollable) |
| footer | 0 1 auto (default) | F = 1200 (measured) | 0 (non-scrollable) |

M is certain: inner .app (row, App.tsx:108) = app-panel 340 + 1px border (:59) + app-map
with max-content 0 (canvas absolute :125, selection absolute :131, modal display:none) +
fab/scrim display:none (:226/:230).

Measured widths (avg char about 0.5em; h4 = 1.5rem, .small = 0.875rem):
H = 32 (px-3) + 365 (title/subtitle block) + 8 (gap) + 758 (nav: form-check about 125 +
btn-sm about 110 + 6 links about 471 + 5 gaps about 40) = 1163 (range 1050-1250).
F = 32 + 890 (141-char small text at one line) + 8 + 370 (6 small links) = 1200 (range 900-1300).

Total content about 2700px (2450-2850). For W below that, free space is negative; the
header cannot shrink; main and footer share the shrink proportionally (equal shrink factors):

main_final(W) = 341 * (W - H) / (341 + F), clamped to 0.
Map column = max(0, main_final - 281). The panel in main is floored at 280px (min-width
:62; overflow:hidden makes it a scrollable item), so it overflows main; the map only gets
the residue.

| Viewport | W - H | main (px) | map column | expected map (W - 341) |
|---|---|---|---|---|
| 1366 | 203 | about 45 | **0** | about 1025 |
| 1440 | 277 | about 61 | **0** | about 1100 |
| 1920 | 757 | about 168 | **0** | about 1579 |
| 2560 | 1397 | about 309 | **0** (still below 281) | about 2219 |

Sensitivity: with H and F 25 percent lower (900/900): 1366 - main about 153; 1440 - about
182; 1920 - about 400 (map about 119px sliver). A 500px map column would need W about
4700px. Hence at every standard desktop width the map column is 0-120px: under any
plausible font metrics the map is not visible.

At 1440px the user sees: a full-height about-1163px-wide header strip (title bar at its
top; .app height 100%, :15), a 61px main sliver with the 280px panel overflowing it, then
the footer strip - no tiles, catchments, markers.

**Mobile reconciliation (required):** the 768px-and-below queries (:91, :245-305) do not
restore column on .app/.app-body, so the outer container stays a row on phones too. There
the panel is absolute (:247-264), so main basis about 0 - main about 0px. The same defect
breaks mobile as well, consistent with the never-run live gate G5. The desktop-only report
is not a contradiction.

## 5. Suspected mechanism - ranking

1. **PRIMARY (confident): missing flex-direction: column on .app** (styles.css:11-17;
   explicitly removed in e4b8503, diff in section 3). AppShell header/main/footer become a
   horizontal row; the incompressible header (flex: 0 0 auto, :19) squeezes main - and thus
   .app-map, whose width is main minus the 280px panel floor - to 0-120px at all standard
   desktop widths.
2. **Contributing (same hunk):** .app-body has no overflow set, so per spec its automatic
   minimum size is 0 and main has no width floor; height: 100vh and overflow: hidden were
   dropped in the same hunk, removing the scroll containment of the pre-commit layout.
3. **Ruled out (with evidence):**
   - Data-load failure (App.tsx:57-69 shows Loading catchment data text or a red alert):
     all four JSONs are committed in public/data/ (hospices, practices, catchments, shops,
     plus corrections) and G6 verified build + validators exit 0 (pipeline.md, Notes
     2026-10-24). This failure mode shows text, not a missing map.
   - Leaflet init failure: MapContainer renders into its parent div.app-map-canvas
     (MapView.tsx:161-170); a zero-area container gives a blank/zero map, not an error; no
     viewport-dependent fatal code in MapView.tsx (FitToNation/FitToSelection use fitBounds
     on lat/lon). Tile-fetch failures remain open and secondary (needs user console output).
   - z-index/visibility/overflow hiding a sane-width map: nothing overlaps the canvas on
     desktop (.app-selection z1000 small overlay :131; .legend-card z1000 :144; .sheet-scrim
     z1500 is display:none :230); no ancestor overflow:hidden in the html/body/#root/.app
     chain; the map is not wide to begin with.
   - Height chain: intact - html/body/#root height 100 percent (styles.css:1-4,
     index.html:13, main.tsx:10); .app height 100 percent (:15). The map would get full
     height even at zero width, so height is not the cause.
   - Mobile-sheet CSS leaking to desktop: all mobile rules are inside the two max-width
     768px queries (:91, :245); base .sheet-fab/.sheet-scrim are display:none
     (:226/:230). No sub-768px rule affects the desktop outer layout.
   - Bootstrap override: bootstrap.min.css is imported before styles.css (main.tsx:3-6), so
     on equal specificity local rules win; .app* classes are custom and not defined by
     Bootstrap. Ruled out.

## 6. Evidence index (claim / file:line / commit)

| Claim | Evidence (file:line) | Commit |
|---|---|---|
| .app is display:flex with no flex-direction, i.e. row | src/styles.css:11-17 | e4b8503 (identical at HEAD) |
| Header/main/footer are sequential flex children of the .app shell | src/components/AppShell.tsx:21, 25-45, 47-49, 50-58 | main |
| Header incompressible (basis = content) | src/styles.css:19-24 (flex: 0 0 auto) | e4b8503 |
| main has no width floor (non-scrollable, min 0) | src/styles.css:53-57 (no overflow) + Flexbox spec | e4b8503 |
| M = 341px certain (panel 340 + 1px border; map max-content 0) | src/styles.css:59-65, 119-123, 125-128, 131-139; src/App.tsx:108-122; src/components/MapView.tsx:161-170; src/components/Methodology.tsx:101-102 | main |
| flex-direction: column existed before and was removed | git show dc3cf4d:src/styles.css vs git show e4b8503 -- src/styles.css | e4b8503 vs dc3cf4d |
| Layout files untouched since e4b8503 | git diff e4b8503 HEAD -- src/styles.css src/App.tsx src/components/AppShell.tsx src/components/MapView.tsx (empty) | e4b8503..ed37091 |
| No media query restores column on .app/.app-body | src/styles.css:91-105, 156-160, 245-305 | main |
| Mobile sheet rules inactive above 768px | src/styles.css:226-243, 245 | main |
| Height chain intact | src/styles.css:1-4; index.html:13; src/main.tsx:9-14 | main |
| Header/footer content strings (for H, F estimates) | src/components/AppShell.tsx:4-11, 26-43, 50-57; src/lib/siteConfig.ts:20-22; src/App.tsx:87-104 | main |
| Data present; build + validators pass | public/data/*.json (5 files); .agents/pipeline.md Notes 2026-10-24 (G6) | main |

## 7. Open questions (for the user; needed to raise confidence, not to rework the diagnosis)

1. Where was it observed - deployed URL (https://... .pages.dev) or local npm run dev / preview? The diagnosis covers both (same code); the QA stage needs the target for a live re-check (gate G5 is also open for mobile).
2. Browser and viewport width? The derivation covers 1366-2560; below about 2450px the result is unchanged, above 2560 the map column stays below 281px up to about 4700px.
3. What is visible exactly? Expected: a full-height header band occupying roughly the left 80% of the screen, a narrow main sliver with the panel overflowing it, no map area. If you see a normal-width header/footer plus a wide blank area, the width estimates are off and the derivation needs re-checking - a screenshot would settle it.
4. Anything in the browser console? Needed to rule out secondary tile-fetch or script errors (see section 5, Leaflet item).
5. Did desktop ever work on this URL before the 2026-10-24 release? The layout changed exactly in e4b8503; a yes on previous working desktop would be strong corroboration.
