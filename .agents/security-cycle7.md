# Security — Cycle 7 (mobile 375 px layout fix)

**Stage:** 7 (Security) · **Date:** 2026-11-15 · **Scope:** C7 delta only (5 source files, mtime window 2026-11-15 17:24–18:09, lead-verified).
**Surface:** `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/MapView.tsx`, `src/components/StartHere.tsx`, `src/styles.css` (+ `docs/adr/0038–0041`, docs-only, no code).
**Method:** full manual read of all 5 files (298/121/419/270/531 lines respectively) + read-only greps (secrets, injection sinks, DOM storage, network, URLs, globals). No source file was modified.

## Verification matrix (per brief checks 1–7)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | XSS / injection | **PASS** | All C7 React additions are static JSX. Toggle button is static text `Start here` with `aria-expanded` from boolean state (`src/App.tsx:181–187`). Footer link is static text, `href="#map"`, `data-bs-target="#methodologyModal"` (`src/components/AppShell.tsx:101–115`). Card root change is class-name only (`src/components/StartHere.tsx:69`). Grep for `dangerouslySetInnerHTML|innerHTML\|outerHTML\|document.write\|eval(\|new Function` across the 5 files: **0 matches**. No new string interpolation of input anywhere; `L.divIcon({html: ...})` interpolations in `MapView.tsx` (e.g. lines ~174, ~292, ~312) are **pre-existing** (bucket counts, hex colours from build-time-generated JSON) and untouched by C7. |
| 2 | Secrets / keys / tokens | **PASS** | Two-case greps (`secret\|token\|api[_-]?key\|password\|client[_-]?id\|bearer\|import.meta\|process.env` and uppercase/key-material variants) over the 5 files: only 3 hits, all the word "token" in CSS comments (design token / `--hf-sheet-h` token, `styles.css:25,363,523`). No env access, no endpoints, no credentials of any kind. |
| 3 | Supply chain | **PASS** | `package.json` unchanged (lead-verified). No import changes in any of the 5 files: `ContainerResizeInvalidator` (`src/components/MapView.tsx:67–74`) uses browser-native `new ResizeObserver` (line 70) + the existing `useMap()`/`map.invalidateSize()` API only; `useState` in `App.tsx` already imported. No new npm packages → no new dependency attack surface; dependency audit for the delta is a no-op (repo's `npm audit` baseline unchanged, pre-existing project state is out of C7 scope per brief §VERIFIED FACTS). |
| 4 | DOM / state integrity | **PASS** | `aria-expanded` (`App.tsx:184`) and the `hf-start-here-open` class on `.app` (`App.tsx:192`) derive from the **same** state `startHereMobileOpen` (`App.tsx:55`) in one render → no desync possible; both flip together, so the a11y attribute can never expose/withhold information relative to the visible card. `select()` calls `closeSheet()` and `setStartHereMobileOpen(false)` in the same handler step (`App.tsx:41–46` → both setters commit in one React batched update → `.app-sheet-open` and `hf-start-here-open` are removed together; CSS double-guards with `.app-sheet-open .hf-start-here{display:none}`, `styles.css:453–455`). Grep for `window.|document.|globalThis|navigator.`: **0 matches** — no global mutation. |
| 5 | CSP / asset integrity | **PASS** | Only two `http(s)://` URLs in the whole 5-file surface: OSM tile URL + OSM copyright link (`src/components/MapView.tsx:338–339`) — both **pre-existing** TileLayer config, untouched by C7. CSS adds zero `url()` references; the only `url()`s in `styles.css` are pre-existing self-hosted local fonts (`/fonts/*.woff2`, lines 10–23). `.leaflet-top.leaflet-left{left:auto;right:10px}` (`styles.css:458–461`) is pure CSS repositioning, media-scoped `@media (max-width:768px)` — no JS, no asset change. No new external scripts/fonts/images/styles. |
| 6 | Privacy | **PASS** | Grep for `localStorage\|sessionStorage\|document.cookie\|fetch(\|XMLHttpRequest\|WebSocket` over the 5 files: **0 matches**. No new telemetry, storage, or exfiltration paths in the delta. (Pre-existing theme-mode storage lives in `src/lib/theme.ts`, not in the C7 surface.) |
| 7 | Design level (trust boundaries / data flow) | **PASS — explicit** | The C7 delta **crosses no trust boundary**. It is pure presentational state + CSS, plus one browser-native `ResizeObserver` on the Leaflet map container — a DOM element the app already owns and renders. No network I/O, no third-party script execution, no new data channels, no new input surface (the StartHere postcode input and its logic predate C7; only its container class changed). **No design-level findings exist → no rework routing back to the Architect.** |

## Findings

| ID | Severity | File:Line | Rationale |
|----|----------|-----------|-----------|
| C7-SEC-1 | Informational | `src/components/MapView.tsx:69–72` | `ContainerResizeInvalidator` invokes `map.invalidateSize()` on every resize callback. `ResizeObserver` can fire for sustained animations; Leaflet's `invalidateSize()` is idempotent and cheap (it does not re-fetch tiles), so this is a negligible CPU consideration only. No exploitability; no action required. |
| C7-SEC-2 | Informational | `src/App.tsx:184` vs `:192` | While the sheet is open (`app-sheet-open`), CSS hides the card (`styles.css:453–455`) even though `hf-start-here-open`/`aria-expanded="true"` may still be set — the toggle reports "expanded" for an occluded (not removed) card. This is an a11y/UX nuance, not a security defect (nothing is exposed or withheld; the card remains in the tree). Route to QA/owner via §8.9 a11y gate, if at all. No action required by Security. |
| C7-SEC-3 | Informational (out of C7 scope, noted) | `src/components/MapView.tsx` divIcon `html:` interpolations (pre-existing) | `L.divIcon({html:`...${h.color}...`})` interpolates hex colour values from `public/data/*.json` into raw HTML. Safe today: data is build-time generated by `scripts/build-data.mjs` (trusted, same-origin, no user input) and colours are fixed hex literals. **Not part of the C7 delta** — reported for the record only; no C7 action. |

No findings are Blocking. No findings are risk-accepted (nothing met the bar for documented debt). No design-level findings.

## Threat model (C7 delta)

- **Assets:** user's postcode input (StartHere form — pre-existing, unchanged by C7), rendered map/DOM, static JSON data.
- **New attacker-reachable surface added by C7:** none. No endpoints, no input handling, no third-party code, no storage.
- **Triggers considered:** reflected/stored XSS via new controls → all static; DOM clobbering via globals → none; supply chain → no new packages; CSS injection → declarations only, media-scoped, no `@import`, no `expression()`, no `url()` to remote origins; state desync leaking state to a11y tree → single source of truth (verified, check 4).

## Tooling run (read-only)

- **Grep (secrets / sinks / storage / network / URLs / globals)** over the 5 files: as tabulated in the matrix above — all clean.
- **Dependency audit:** not applicable to the delta — zero package changes (lead-verified `package.json` unchanged); pre-existing repo audit state untouched by C7.
- **SAST:** `semgrep` not installed on this machine (only `npx` present; an `npx semgrep` run would pull an unevaluated package — outside a read-only delta review). Compensated by the full manual read of all 5 files + sink-pattern greps above.
- **Azure MCP (Key Vault / Advisor):** not applicable — the deployment is a static Cloudflare Pages app; no Azure subscription, secrets, or managed services in scope. The only runtime API (C8 `/api/postcodes/{postcode}`) is explicitly out of C7 scope (leads its own SEC-8-01/02 risk-acceptance).

## VERDICT

**PASS (0 Blocking)**
