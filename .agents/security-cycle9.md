# Cycle 9 — Security review

Inputs: requirements-cycle9.md, implementation-cycle9.md, review-cycle9.md (R1–R4/C1–C9), `git diff` of `src/styles.css`, `src/components/AppShell.tsx`, `src/App.tsx` (+ ADR-0043, docs only).

## Findings

| # | Severity | Location | Evidence | Owner |
|---|----------|----------|----------|-------|
| — | — | — | **No Blocking findings.** All seven review conditions (C1–C9) verified in code; see validation below. | — |
| 1 | Risk-accepted | `src/lib/useAppData.ts:4`, `src/pages/CorrectionsPage.tsx:26` | Pre-existing same-origin `fetch('…/data/…')`; **not touched by this delta** (out of the 3-file diff). Static JSON, same origin, no secret handling. | None — carried forward |
| 2 | Risk-accepted | `src/lib/feedback.ts:21`, `src/pages/FeedbackPage.tsx:6` | Pre-existing `mailto:` flow, unchanged; no endpoint, no form submission path, contact address public by design. | None — carried forward |
| 3 | Risk-accepted | `src/components/StartHere.tsx:83` | Pre-existing `<form>` (content page, outside delta); action-less/inert markup, no `action=` POST target server-side. | None — carried forward |

## Design-level vs code-level

**No design-level changes.** The delta is 100% presentational: static JSX, React state for booleans/enums, Bootstrap data-attributes, CSS. No new trust boundary, no authentication, no data-flow change, no new external origin, no new dependency. Nothing routes to the Architect.

- Trust boundary: no new user-input surfaces — no forms, no new inputs beyond three controlled checkboxes bound to existing `useState` booleans, no new fetch/XHR/WebSocket, no new event handlers touching external data. `feedbackMailto` unchanged.
- XSS/injection: `grep` for `dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML|document.write|eval(` in `src/` → **zero hits**. Every JSX interpolation in the diff is a static literal or bounded state (`mode` ∈ `{auto,light,dark}`, `aria-pressed`/`aria-expanded` booleans). Panel switches, CTA, burger render only literals/known state.
- Secrets: grep for `api_key|secret|password|bearer|token|authorization` across `src/`, `package.json`, `wrangler.jsonc`, `vite.config.ts` → only false positives ("design tokens" comments). No API keys, credentials, internal URLs. Only URLs in `src/` are pre-existing OSM attribution/tiles and the site's own canonical `https://hospiceinfo.pages.dev`.
- CSP/static posture: no new external origins, scripts, or CDN refs; offcanvas events come from the already-bundled `bootstrap.esm.js` (`bootstrap ^5.3.3` unchanged in `package.json`).
- A11y/id hygiene: `id="mobileMenu"` = 1, `id="mobileMenuLabel"` = 1, `aria-controls="mobileMenu"` = 1 (burger), `id="methodologyModal"` = 1, `id="gpsToggle"`/`id="childrenToggle"` each = 1 (header copies, App.tsx:149/162); panel copies are id-less (reviewer R4/C5 satisfied). No duplicate ids in the rendered tree.
- Z-index/stacking: new `.hf-menu-panel` z-index 2100 is the top rung (1500<1600<1700<2000<2100; Bootstrap backdrop ≈1040 < 1500). Panel holds no focus-sensitive inputs beyond checkboxes/buttons; Bootstrap offcanvas owns focus trap (`tabIndex={-1}` present).
- Rollback/availability: implementation-cycle9.md states the rollback command `git checkout -- src/styles.css src/components/AppShell.tsx src/App.tsx`; `git diff --name-only` confirms the code delta is exactly these 3 files. No new storage writes (theme `localStorage` path pre-existing, `getStoredMode` validates to the 3-value enum — no stored-value injection).

## Validation (read-only commands + one-line results)

```
git diff --stat -- src/styles.css src/components/AppShell.tsx src/App.tsx   → 3 files, 204+/45−; full diff read line-by-line
git diff --name-only                                                          → code delta = exactly the 3 files (+ .agents/, GLOSSARY.md)
grep -rn 'dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML|document.write|eval(' src/  → exit 1 (zero hits)
grep -rn 'fetch(|XMLHttpRequest|WebSocket|postMessage|BroadcastChannel|import(' src/       → only pre-existing useAppData.ts:4, CorrectionsPage.tsx:26
grep -rniE 'api_key|secret|password|bearer|authorization|token' src/ package.json wrangler.jsonc vite.config.ts → comments only
grep -rnoE 'https?://[^") '"'"' ]+' src/                                        → 3 pre-existing URLs (OSM ×2, site canonical ×1)
grep for ids → mobileMenu=1, mobileMenuLabel=1, methodologyModal=1, gpsToggle=1, childrenToggle=1, aria-controls×2 (appPanel, mobileMenu)
grep '<form|action=' src/                                                     → 1 pre-existing form (StartHere.tsx:83), no action= target
grep 'localStorage|sessionStorage|document.cookie' src/                       → only pre-existing src/lib/theme.ts (validated enum)
```

(No `npm run build`/tests run — QA owns those; the C9-6 gate log in implementation-cycle9.md is taken as recorded.)

## Verdict

**PASS** — 0 Blocking findings, 3 pre-existing risk-accepted items (all outside the delta, carried forward, no owner action).

Date: 2026-11-17.
