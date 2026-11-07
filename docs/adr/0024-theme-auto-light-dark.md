# ADR 0024 — 3-state Auto/Light/Dark theme with no-flash boot (localStorage `hfuk-theme`, `data-bs-theme` on `<html>`)

**Status:** accepted (2026-10-30)

## Context

Cycle 4 item 4 adds theming to a zero-theming baseline (0 `data-bs-theme` /
`prefers-color-scheme` / `matchMedia` / `localStorage` hits on disk; the
localStorage key space is free). Bootstrap 5.3.3 natively themes from
`data-bs-theme="dark"` on `<html>`. Hard constraints:

- **Byte-identity (AC7, ADR-0003/0015):** `npm run build` is deterministic;
  `scripts/prerender.mjs` `buildPage()` rebuilds **every** `<head>` from a
  fixed `out.push` list and carries no arbitrary inline head scripts — any
  new head script must be a fixed push entry and static text.
- **No flash:** the classic theme flash comes from React writing
  `data-bs-theme` after first paint.
- **No new npm deps (ADR-0008).**

## Decision

- **Control:** 3-state `Auto | Light | Dark` `btn-group` in the
  `AppShell` header (all pages, not just the map).
- **Persistence:** single key `localStorage['hfuk-theme']` ∈ {`light`,
  `dark`}; **absent = auto** (auto writes nothing). It is the app's only
  localStorage key.
- **Bootstrap toggle:** `data-bs-theme` on `document.documentElement`.
- **Boot:** a static inline snippet runs before first paint (arch §4.2),
  resolving the key (`try/catch` for storage-disabled contexts), falling
  back to `matchMedia('(prefers-color-scheme: dark)')` for auto.
- **Location — exactly two copies:** (1) `index.html`, after the
  charset/viewport meta, before the CSS `<link>`s; (2) one `out.push`
  entry in `buildPage()` at the same position.
- **No mode in React state** — explicitly not in `App.tsx`. The prerendered
  shells ship an empty `#root`; on load React remounts re-run theme
  `useEffect`s and would re-set `data-bs-theme` sporadically (risk R1).
  Mode lives in `src/lib/theme.ts`, reading the localStorage key directly;
  the boot snippet is the sole pre-paint writer, React writes only on
  explicit user choice.
- **Auto listener:** a `matchMedia` `change` listener is attached only
  while mode is auto; detached when the user pins light/dark.

**Snippets stay identical:** the text is frozen static (no dates, ids, or
interpolation) → the two copies are byte-equal by construction. Mechanism:
**documented duplication** (an `// ADR-0024` comment in `prerender.mjs`)
**plus a regression check** — the QA protocol compares the two occurrences
and fails on drift (bakes the invariant in, arch §9).

**AC7 holds by construction:** the snippet adds a fixed byte sequence; it
introduces no environment-derived bytes, so the 171-file count, the 168-`<loc>`
sitemap invariant, and the double-build byte-identity are all preserved.

## Alternatives considered

- **Theme in React state + effect write:** rejected — first-paint flash;
  mount-race on prerendered shells (R1).
- **Shared build-time constant for both copies:** rejected — `index.html` is
  a plain Vite entry with no build-time import path; coupling the dev server
  to build-script internals is more complexity than the duplication.
- **CSS-only `@media (prefers-color-scheme)` with no control:** rejected —
  the spec requires an explicit 3-state control; the snippet already covers
  the auto case.
- **Dark tiles:** out of scope here — see ADR-0027.

## Consequences

**Positive:** no first-paint flash; choice persists; auto follows the OS;
single storage surface; AC7 preserved.
**Negative (accepted):** two copies of the snippet → drift risk (R8, QA
byte-equality check); `localStorage` unavailable → auto-only behaviour,
no crash.
