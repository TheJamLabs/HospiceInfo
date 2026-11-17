# ADR 0044 — Headless browser (Playwright) for the shop crawl

**Status:** accepted (2026-11-16)

## Context

Owner decision 2 (2026-11-16): machine-unreadable shop lists (PDF,
JS-rendered, embedded map widgets) must be handled by a **headless
browser**, dev-only — not the log-and-skip path. The evidence that a
browser is load-bearing (research §6, lead-verified): 2 of 5 sampled
curated sites (incl. `trinityhospice.co.uk`) return 403 to a plain
`fetch` client (WAF, intermittent), and shop lists are frequently rendered
by the site's own JS. A plain-HTTP-only crawl would lose a meaningful
slice of the 150 sites.

The app's `dependencies` are frozen (no runtime dependency may be added);
the crawl is a dev-time data task that ships nothing to `src/`.

## Decision

- **Playwright + Chromium** as **devDependencies only**
  (`npm i -D playwright`), following the repo's dev-tooling precedent
  (`xlsx` in devDependencies). `pdfjs-dist` accompanies it for the
  PDF-text tier. `src/` never imports either — zero runtime surface touch.
- **The script never downloads a browser binary.** The binary is installed
  by a human command (`npx playwright install chromium`). If it is absent
  at run time, the script prints that exact command and the affected pages
  fall through to `blocked` / `unreadable` in the log — no in-script
  install, no retry loop (repo-wide offline rule).
- **Engagement order per page:** plain `fetch` → headless render (403/429/
  5xx/JS-shell) → PDF text layer when the listing is a linked PDF →
  `unreadable`. Per-site `browser.newContext()` isolation (clean cookies),
  project UA set on the context; headline awaited with a timeout, then a
  short settle.

## Alternatives considered

1. **Puppeteer**: functionally equivalent; rejected for library-pinned
   browser builds (reproducible across dev machines), per-context
   isolation in plain Node (matches the repo's plain-JS, `node --test`
   tooling), and first-class plain→headless fall-through.
2. **No browser (log-and-skip)**: infeasible — WAF 403s verified on core
   curated sites; violates owner decision 2.
3. **`jsdom`/`linkedom` DOM parsing without execution**: cannot run the
   site's JS — the exact capability the decision asks for.

## Consequences

- `devDependencies` grows by `playwright` + `pdfjs-dist`; runtime set
  untouched; removable without touching the app.
- A one-time ~150 MB binary lands in the user cache, not the repo
  (nothing new in `.gitignore`).
- **Availability is a risk, not a failure mode:** if the environment is
  offline for the binary, the crawl runs without the headless tier, the
  exact install command is recorded in the crawl log, and QA marks the
  affected slice **risk-accepted, documented** (acceptance is
  outcome-based: committed entries + complete log).
- Long multi-run crawl (~1 hour order) with resumability; the browser is
  launched once per run, contexts per site.
