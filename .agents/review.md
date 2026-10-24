# Review (post-fix, round 1) — 2026-10-21

## Verdict: CHANGES REQUIRED

All 8 rework fixes verified fixed in the reworked documents. One Blocking finding
carried forward from the on-disk pre-overwrite review (code-surface audit; not
re-verified in this doc-limited pass); all other findings are Minor.

## Finding verification
RV-1 fixed — architecture.md §2.1 (L40): "NO server-side catch-all is required"; unknown hash renders the default map via the `useRoute()` fallback (see src/App.tsx); ADR-0007: "Vite's default catch-all … is not involved in hash routing".
RV-2 fixed — architecture.md §2.2 (L46) + ADR-0008 Decision: `import "bootstrap/dist/js/bootstrap.esm.js"`; UMD explicitly rejected (ADR-0008 Alternatives-2).
RV-4 fixed — architecture.md §2.3 (L67): `data-raw/site-config.json` "mirrors the `SiteConfig` interface exactly: `{operatorName: string, contactEmail: string}`".
RV-5 fixed — ADR-0006 (Island coverage note): build-data.mjs "(around L160-233)" — per-label cells → union per hospice → `intersection(unionCell, ukLand)` via `polygon-clipping`; box-clip remains safety net.
RV-6 fixed — architecture.md §3.1 + §4.4: `MapContainer` uses `preferCanvas: true`.
RV-7 fixed — architecture.md §5 lists all 3 named surfaces, hide-not-delete: tooltip → postcode alone; ShopMarker ⚠ + `SHOP_OUTSIDE_COLOR '#e07b00'` removed; Methodology/HospicePanel unassigned counts removed — see NF-1 for surfaces beyond the named scope.
RV-10 fixed — ADR-0006 Validator item 3: empty cells (`polygons: []`) non-fatal; slivers (<0.0002 deg²) "pass with a warning, not an error".
RV-11 fixed — ADR-0006: island coverage "only if present in the OSM extract … not hardcoded"; coverage invariant "MUST use the same `uk-land.json` file that the build script uses".

## New findings
NF-1 (Blocking) — Carried forward from the on-disk pre-overwrite review (code-surface audit; not re-verified in this doc-limited pass): beyond the 3 surfaces named in §5, five live surfaces expose internal data issues: App.tsx L123-126 selection card "{out} outside its own catchment"; App.tsx L36-46 "Run npm run build-data…"; App.tsx L252-264 methodology button "{n} shops outside own catchment"; Methodology.tsx L62 "{shopsOutside} of them outside…"; Methodology.tsx item 5 explains the outside-catchment flag. Fix: extend architecture §5 (and the ADR-0006 safe-surface list) to name these surfaces and their final hidden form; flags stay in the data build.
NF-2 (Minor) — architecture.md §7 A/B table: row 2.3 truncated mid-sentence ("`outsideCatchment` is warn..."), stray table separator + orphan 🗡️ row; no mapping rows for feature.md areas 3–6. Fix: complete rows 3–6 (design content exists in §3.2/§4/§5), drop the orphan.
NF-3 (Minor) — architecture.md §4.1 garbled: "Lean on `expand-pane` and `data-bs size`" — neither is a Bootstrap/Leaflet concept; not implementable as written. Related: §2.2 L50 "not preemptively applied" (Canvas) contradicts §4.4's `preferCanvas` mandate.
NF-4 (Minor) — ADR wording: ADR-0006 sea-gap examples "(e.g. Isle of Man, Orkney/Norway sea gaps)" — Isle of Man has land, Orkney is outside the clip bbox, Norway is not UK; ADR-0008 "BootstrapJS" typo + incoherent orphan bullet "avoid bootstrap's internal HTML" (duplicated in Alternatives-3).
NF-5 (Minor) — ADR consistency (carried forward): ADR-0006/0007/0008 status `rework (2026-10-21)` vs repo convention `accepted (date)`; ADR-0006 "reverses ADR 0001" but ADR-0001 stays `accepted`. Fix: set accepted; mark ADR-0001 superseded by ADR-0006.

## Gaps (informational)
- ADR-0007 Open risks uses the server-side "SPA fallback" idiom and suggests `pushState/popState`; hash routing needs the `hashchange` event (client-side `useRoute()` fallback). It names one `LegalPage` vs §2.1's separate #privacy/#licences/#accessibility routes (three components).
- Loose figures: §3.1 "20–250 hospice markers" vs ADR-0006 "155 × 1 = 155 intersections at source-compile time" — tighten to ~155 and say "build time".
- feature.md area 6 (mobile overlay/sheet panel): §4.3 defers sheet behaviour to a future nations menu — point Coding at Bootstrap offcanvas explicitly.
