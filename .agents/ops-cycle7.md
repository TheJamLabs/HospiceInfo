# Ops — HospiceInfo, Cycle 7 (stage 8, 2026-11-15)

DevOps (stage 8) done 2026-11-15. This file is the C7 (mobile 375 px layout fix)
runbook; `.agents/ops.md` (Cycle 4) remains the standing runbook and everything in it
still holds — C7 changes none of the build, data, env, or deploy machinery. All gates
were re-run by the lead 2026-11-15 and are ground truth: `npm test` 23/23; `npm run
check:layout` OK; double `npm run build` byte-identical (231 dist files, 171 prerendered;
assets `index-Dn97-FzZ.css` / `index-D61LFkAW.js`). C7 work is **UNCOMMITTED** in the
working tree; the ship gate is the owner's, not the pipeline's.

## 1. Scope & surface

Exactly the C7 delta — 10 committed files, zero more:

- `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/MapView.tsx`,
  `src/components/StartHere.tsx`, `src/styles.css`
- `docs/adr/0038-mobile-start-here-css-disclosure.md`,
  `docs/adr/0039-mobile-nav-carried-by-footer.md`,
  `docs/adr/0040-mobile-scroll-region-budget.md`, `docs/adr/0041-sheet-height-token.md`
- `GLOSSARY.md` (C7 terms)

**No new dependencies, no data changes, no env changes, no deploy-config changes.** No
`package.json`/`package-lock.json` diff, no `data/`/`data-raw/` diff (so no
`npm run build-data`), no `wrangler.jsonc` change, no `.dev.vars` touch. The
`POSTCODES_*` env names belong to cycle 8, are managed in the Pages dashboard, and are
referenced by name only here — never by value.

## 2. Deployment model

Unchanged from Cycles 2–4 (ADR-0014): the Cloudflare Pages project `hospiceinfo` is
**git-connected to `main`** — every push runs `npm ci && npm run build` and publishes
`dist/`. An approved push **is** the publish: no deploy command, no secrets, no runtime
service (ADR-0030). **No agent commits or pushes anything in this cycle** — the pre-push
chain (§4), the owner ship gate (§3), the commit scope (§5), and the push itself all
belong to James. Pre-promote option: push a branch and use its Pages preview URL.

## 3. Owner ship-gate checklist (in-browser, 375×812, iPhone SE viewport)

Manual, no browser automation in-repo (C7-QA-3). Record pass/fail per row; a failure here
blocks the push.

| # | Check |
|---|-------|
| 3 | Five OQ1 states × dark + light (default 375 / sheet open / sheet+card / card+selection / selection): `document.documentElement.scrollHeight <= window.innerHeight` in **all** states; reachable scrollable regions ≤ 2 (map + at most one reachable surface) |
| 4 | Header is 4 lines at 375 px within the 351 px line budget; nav links hidden; "Source & Method" in the footer link row |
| 5 | Card geometry: 319 px wide, 44 px right band, `max-height:min(75vh, calc(100% − 72px))`; "Open list" FAB and zoom controls remain clear and operable with the card open |
| 6 | Footer "Source & Method" link contrast in-browser (light theme computes ≈4.5:1 — razor-thin over the 4.5:1 AA line; dark ≈7.5:1). **Record what is observed, change nothing** |
| 7 | Marker/tile alignment after sheet/card open-close **and** after window resize; brief pan-drift is acceptable (C7-QA-2), sustained misalignment is not |
| 8 | 320 px viewport: no horizontal overflow |
| 9 | A11y: tab order sane; Start-here toggle `aria-expanded` flips correctly; Escape returns focus to the toggle. Note the C7-SEC-2 nuance — the toggle reports "expanded" while the sheet visually occludes the card — as **observed behavior, not a defect** |

## 4. Pre-push chain (exact, in order)

Run from the repo root after §3 passes; all six must be green:

```bash
npm test
npm run check:layout
npm run build
cp -r dist /tmp/dist-a
npm run build
diff -rq /tmp/dist-a dist   # expect: empty output = byte-identical
```

Expected: `npm test` 23/23; `check-map-layout: OK`; both builds exit 0 (171 prerendered
files, 231 dist files); the diff is empty. Any divergence in the diff stops the push —
determinism (ADR-0015) has broken.

## 5. Commit scope (owner step)

`git add` **exactly** these ten paths:

```bash
git add src/App.tsx src/components/AppShell.tsx src/components/MapView.tsx \
  src/components/StartHere.tsx src/styles.css \
  docs/adr/0038-mobile-start-here-css-disclosure.md \
  docs/adr/0039-mobile-nav-carried-by-footer.md \
  docs/adr/0040-mobile-scroll-region-budget.md \
  docs/adr/0041-sheet-height-token.md \
  GLOSSARY.md
```

Then push to `main` → Pages publishes.

**Explicitly excluded from this commit** (pre-C7 dirty work and stage scratch — none of
it is C7; it stays in the tree for its own owner step):

- `src/lib/postcodes.ts`, `scripts/build-data.mjs`, `scripts/validate-tessellation.mjs`,
  `docs/MAINTENANCE.md`, and the cycle-8 ADRs (incl. `docs/adr/0037-online-postcode-fallback-pages-function.md`)
- untracked, **not** git-ignored scratch dirs: `.agents/`, `.qwen-coding/`, `.tmp/`

Never `git add -A` / `git add .` on this tree.

## 6. Rollback

`git revert <C7-commit>` (the single C7 commit from §5) + push to `main`. Static site:
no migration, no data changes, no env changes, so **nothing in C7 requires data
rollback** — Pages redeploys the previous source and the prior build is back live. The
C7 diff is self-contained in the ten §5 files, so the revert is byte-clean; if the
revert commit itself conflicts (it should not — nothing else touches those ten files),
restore the ten files from `main~1` and re-run the §4 chain.

## 7. Carried debt (risk-accepted; none block the push)

| ID | Finding | Follow-up |
|---|---|---|
| C7-QA-1 | `requirements-cycle7.md` §8 item-2 wording drift (DOM-delta summary inconsistent with W1/W3; implementation correct and R4/R6 holds) | No code action. Fix the contract line when the requirements file is next touched — do not let the stale summary cite "exactly +1" deltas again |
| C7-QA-2 | W4 `ContainerResizeInvalidator` is undebounced (per-frame `invalidateSize()` during continuous resize; benign initial-observe no-op; official Leaflet pattern) | No code action now. **IF owner-gate item 7 shows visible jank**, one-line `requestAnimationFrame` coalescing in the RO callback — a later-cycle change, never folded into this commit |
| C7-QA-3 | Zero automated regression coverage for the 768 px mobile layout (23 tests are data/logic only) | Later cycle: one Playwright 375×812 viewport pin (header row count, `scrollWidth <= 375`, `.hf-start-here` box, `scrollHeight <= innerHeight`) to pin the whole layout |
| C7-SEC-2 | A11y: Start-here toggle reports "expanded" while the sheet visually occludes the card | No code action — owner-gate item 9 records it as observed behavior; revisit only if a screen-reader user reports confusion |

## 8. Verification & post-publish

1. Pages deploy log for the push is green (build: `npm ci && npm run build`, exit 0).
2. Live site returns 200 at the published URL (root + one `/hospice/<id>` page).
3. The deployed `index.html` references the C7 hashed assets — `index-Dn97-FzZ.css` and
   `index-D61LFkAW.js`. New hashes present = C7 build is live; old hashes = reconsider
   before investigating anything else.

VERDICT: OPS PLAN READY (owner gate + commit/push remain with James)
