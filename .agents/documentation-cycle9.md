# Cycle 9 — Documentation pass (stage 9)

Date: 2026-11-17. Inputs: `ops-cycle9.md` (QA/Security PASS, owner-gated),
ADR-0043, GLOSSARY.md C9 terms; verified against the C9 working tree
(`src/styles.css`, `src/components/AppShell.tsx`, `src/App.tsx`) before writing.

## Touched doc files

| File | Change | Reason |
|---|---|---|
| `README.md` | 2-line edit (Dots + Squares bullets) | Layer toggles left the <768 header row for the menu panel (ADR-0043 M1); bullets now say "toggle in the header; on mobile, in the menu panel". "Recent ships" untouched: C9 is unpushed, README lists published cycles only. |
| `docs/MAINTENANCE.md` | **RESOLVED in-lead 02:04 2026-11-17** — both edits below applied verbatim (file 477 L → 559 L) | C7 section's "header collapses to 4 lines" is superseded by C9; new C9 section (pre-push chain / smoke / rollback / debt per `ops-cycle9.md` §1–4) drafted and recorded below. |

## MAINTENANCE.md — block (tooling constraint) — RESOLVED

This session's only writer is `write_file` (whole-file overwrite, no
edit/append tool), and the 477-line file exceeds the per-turn output budget
(2 full-file writes rejected on max_tokens). The on-disk file was left
**unmodified** (no partial write). Ready-to-apply edits for the next
session — re-read the file first, then apply verbatim:

- **Edit A** — after the C7 section's line `Design rationale: ADR 0038–0041 in [`docs/adr/`](docs/adr/).`, insert: "**C9 supersession:** the 4-line mobile header described above is superseded — C9 (ADR-0043) makes the ≤768 px header one line (logo + title + hamburger) opening an offcanvas menu panel (`.hf-menu-panel`, `#mobileMenu`, z 2100) carrying the theme control, the layer toggles (map route only) and Source & Method; "Start here" becomes a mobile-only CTA row (`.hf-cta-row`). ADR-0043 supersedes ADR-0039 for the header only — the nav stays footer-carried; the rest of the C7 mobile work is unchanged."
- **Edit B** — append a `## Cycle 9 (C9) — mobile menu panel, CTA row, footer` section: scope summary (one-line header + panel z 2100; CTA row ≥48 px bound to ADR-0038 `startHereMobileOpen`; FAB cosmetic restyle, z 2000 position/offset unchanged; footer `.app` min-height:100%; desktop ≥769 px unchanged; rationale ADR-0043) + pre-push chain code block (`ops-cycle9.md` §1 verbatim: `tsc -b`, `npm test` 26/26, `check:layout`, `build`, double prerender + `diff -r`, sitemap 215) + post-publish smoke (root 200; built CSS `hf-menu-panel` ≥1; `<html>`/`</html>` = 2; sitemap 215; no console errors expected; offcanvas verified structurally only) + rollback (`git revert <c9-sha>`; source-conflict fallback `git checkout -- src/styles.css src/components/AppShell.tsx src/App.tsx`; re-run chain; seconds to restore; no scripts/config/data/tests added) + carried debt (owner-visual 1280/768/375; offcanvas structural-only; empty `.hf-cta-row` on content routes = cosmetic; CTA visible while bottom sheet open — R2 parity; 3 pre-existing risk-accepted security items outside the C9 diff) + closing "ships with the next commit that includes `MAINTENANCE.md`" note (C9's 16-file commit excludes it, `ops-cycle9.md` §1.2).

## Inspected — no change

- `docs/build-log.md` — no UI/header/FAB/footer content; C6–C9 absent by established pattern.
- `docs/adr/*` — out of scope; ADR-0043 final (read-only).
- Rest of `README.md` — no other C9-surface descriptions (theme picker, search, side panel) affected.
- Rest of `docs/MAINTENANCE.md` — general sections accurate; C8 post-publish values remain valid post-C9 (no page-count change).

## ADR-0043 consistency

All written text matches ADR-0043 and the source: one-line ≤768 px header (logo + title + hamburger), offcanvas `#mobileMenu` z 2100 carrying the theme segmented control + three toggles (map route only) + Source & Method trigger; CTA row ≥48 px (`.hf-start-here-cta`, bound to ADR-0038 `startHereMobileOpen`); FAB icon + label + stronger shadow with z 2000 / position / `--hf-sheet-h` offset / labels / wiring unchanged; nav remains footer-carried (ADR-0039 kept for the nav); footer fix `.app { min-height:100% }`. Verified in code: `.hf-burger`/`.hf-cta-row` `display:none` at base, shown in the 768 px block; `.hf-menu-panel` z 2100 / width 100vw; `.hf-start-here-cta` min-height 48 px solid primary; panel statically closed (server/JSDOM/client first paint identical).

## Noted (no action)

- `MAINTENANCE.md` "Start here" section: "Interact with the card via a pill" — no pill exists in `src/components/StartHere.tsx` (pre-existing drift, outside C9 scope).
