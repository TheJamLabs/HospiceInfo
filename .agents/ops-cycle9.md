# Cycle 9 — DevOps / Ops Plan

Date: 2026-11-17. Inputs: implementation-cycle9.md (all gates green), qa-cycle9.md (0 Blocking),
security-cycle9.md (0 Blocking, 3 pre-existing risk-accepted). Target: the uncommitted C9 working
tree (3 source files + ADR-0043 + .agents artifacts + GLOSSARY.md). Deploy mechanic: push to
`main` = automatic Cloudflare Pages publish of `npm run build` output to https://hospiceinfo.pages.dev
— the owner's gate. No new tooling; all checks are the project's own.

## 1. Deployment plan (ordered)

1. **Pre-push gate re-run** (repo root; any failure = stop, no commit):
   ```bash
   npx tsc -b
   npm test                                   # node --test, expect 26/26
   npm run check:layout                       # flex-direction strict set
   npm run build                              # tsc -b && vite build && prerender
   node scripts/prerender.mjs && cp -r dist .tmp/opsc9-a
   node scripts/prerender.mjs && cp -r dist .tmp/opsc9-b
   diff -r .tmp/opsc9-a .tmp/opsc9-b          # expect: no output (byte-identical)
   rm -rf .tmp/opsc9-a .tmp/opsc9-b
   grep -c '<loc>' dist/sitemap.xml           # expect: 215
   ```
2. **Commit** — explicit path list only (no `git add -A`), 16 files:
   ```bash
   git add src/styles.css src/components/AppShell.tsx src/App.tsx \
     docs/adr/0043-mobile-menu-panel-and-cta-row.md GLOSSARY.md \
     .agents/pipeline.md .agents/research-cycle9.md .agents/architecture-cycle9.md \
     .agents/design-cycle9.md .agents/review-cycle9.md .agents/requirements-cycle9.md \
     .agents/implementation-cycle9.md .agents/qa-cycle9.md .agents/security-cycle9.md \
     .agents/ops-cycle9.md .agents/hindsight-cycle9.md
   git commit -m "Cycle 9: mobile menu panel, CTA row, footer fix"
   ```
   `.agents/ops-cycle9.md` (this file) and `.agents/hindsight-cycle9.md` are written by later
   stages (8, 10) — commit only after Hindsight has landed.
3. **Push (owner gate — publishes to production):** `git push origin main`
4. **Live verification** (post-publish):
   ```bash
   curl -s -o /dev/null -w '%{http_code}' https://hospiceinfo.pages.dev/   # expect 200
   css=$(curl -s https://hospiceinfo.pages.dev/ | grep -oE 'assets/[^"]+\.css' | head -1)
   curl -s "https://hospiceinfo.pages.dev/$css" | grep -c 'hf-menu-panel'  # expect ≥1
   curl -s https://hospiceinfo.pages.dev/ | grep -c -e '<html' -e '</html>' # expect 2
   curl -s https://hospiceinfo.pages.dev/sitemap.xml | grep -c '<loc>'      # expect 215
   ```

## 2. Verification

- Pre-push: the §1 gate commands above — the project's own checks (tsc, node --test, check:layout,
  build + double-prerender byte-identity, sitemap count). No new tools introduced.
- Post-push smoke: site loads (HTTP 200); built CSS contains the new `.hf-menu-panel` rule; index
  HTML well-formed (single `<html>`…`</html>` pair); /sitemap.xml = 215 `<loc>`.
- JS console errors: none expected (delta is static JSX/CSS; no new runtime paths). No browser
  tooling in this session — console/interaction inspection is owner-visual territory (§5).

## 3. Rollback (ordered)

1. `git revert <c9-sha>` — the single C9 commit (`c9-sha` = `git rev-parse HEAD` after step §1.2).
2. If the working tree resists (scratch edits in `.agents/` or `GLOSSARY.md`):
   `git checkout -- .agents/pipeline.md .agents/research-cycle9.md GLOSSARY.md`, then re-run step 1.
   If `git revert` conflicts on source files: `git revert --abort`, then
   `git checkout -- src/styles.css src/components/AppShell.tsx src/App.tsx` (restores the exact
   pre-C9 tree for the 3 source files), commit that as the rollback commit.
3. Re-run the §1 pre-push gates on the reverted tree (build chain is `tsc -b && vite build && prerender`).
4. `git push origin main` → Cloudflare Pages republishes automatically.

Caveats: time-to-restore = seconds (Pages edge CDN, no database/migrations/feature-flags —
C9 added no scripts, config, data or tests, so nothing else to unwind). ADR-0043 + `.agents/*`
are commit-only docs with zero runtime effect; GLOSSARY.md in a revert is cosmetic.

## 4. Risk notes (carried forward; do not re-litigate)

- QA: owner-visual pass at 1280/768/375 not run in CI (no browser tooling) — owner's job post-publish.
- QA: offcanvas live behaviour (focus trap, Esc, backdrop) verified structurally only — covered by the same pass.
- QA: empty `.hf-cta-row` on content routes = zero-height `display:block` div, purely cosmetic.
- QA: CTA row visible while the bottom sheet is open — reviewer R2 parity decision, known exposed state.
- Security: 3 pre-existing risk-accepted items (same-origin static-JSON fetch, `mailto:` feedback,
  inert `<form>`) — all outside the C9 diff, no owner action required.
- Nothing blocks publish.

## 5. Open gates (both owner-manual)

1. **Owner-visual pass** at 1280/768/375 px on the live site: one-line mobile header + burger →
   panel, CTA toggles Start-here card, footer below content (D1), FAB icon/shadow, sheet over CTA.
2. **Commit + push approval** — the lead executes §1 only after the owner approves; the push is
   the production release.
