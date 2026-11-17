# Hindsight — Cycle 9 (mobile menu panel, CTA row, footer fix), stage 10, 2026-11-17

Verified against the working tree (read-only). **Hindsight MCP tools are absent from this
session's toolset** (no search/refresh/reflect/capture-initiative/ingest-document, no tool_search,
no CLI); no calls attempted, no retry loop (C7 precedent). Below is the exact manual remap.

## 1. Page actions

| kp (short) | page | action | why |
|---|---|---|---|
| kp-ebdf3f56 | Component map | page-refresh | 4-line header / header-row toggles / `hf-start-here-toggle` / icon-only FAB now false (1-line header, `#mobileMenu` z 2100, `.hf-cta-row`, FAB icon+text). |
| kp-78d8a8c4 | Conventions | page-refresh | z-ladder gains rung 2100 (panel); no new `--hf-*` tokens. |
| kp-703f1838 | Core concepts | page-refresh | 4-line header + in-header pill → 1-line + panel + CTA row (ADR-0043); nav stays footer-carried. |
| kp-ca1717a1 | Decisions | page-refresh | add ADR-0043 (2026-11-16), supersedes ADR-0039 for header only. |
| kp-164e5906 | Initiatives index | page-refresh | C9 row missing. |
| kp-9836d585 | C9 initiative | capture-initiative | set final state (§3). |

## 2. Diagnosis (verified on disk)

Stale: ≤768 header is 1 line (logo + title + burger; styles.css ≤768 block; AppShell.tsx), not 4 lines; toggles panel-only, map route only (id-less copies); `hf-start-here-toggle` removed (0 hits); FAB icon+text, z 2000 / `--hf-sheet-h` unchanged (styles.css L410-431); footer overlap fixed via `.app{min-height:100%}` (L75-81).
Not stale: desktop header, footer nav (ADR-0039), `startHereMobileOpen` (ADR-0038), `--hf-sheet-h` (ADR-0041), data/map; C8-1…C8-8 backlog unapplied (pre-existing) — flag only.

## 3. C9 initiative page kp-9836d5857a0b49a689ea1d8e07a55d70 — final state

**Complete, ship-gated.** Owner design approval 2026-11-16; implementation done (3 src files, 204+/45−); QA PASS 0 Blocking (4 risk-accepted: R2 CTA parity, owner-visual 1280/768/375, offcanvas structural-only, empty CTA row cosmetic); Security PASS 0 Blocking (3 pre-existing); DevOps/Docs done (MAINTENANCE 477→559 L). Awaiting: owner commit + push = publish (16-file list, "Cycle 9: mobile menu panel, CTA row, footer fix") + owner-visual pass. Rollback: `git revert <c9-sha>` + push.

## 4. Ingest: C9 outcome document

Title "Cycle 9 outcome: mobile menu panel, CTA row, footer"; metadata `.agents/qa-cycle9.md`, `.agents/security-cycle9.md`, `.agents/ops-cycle9.md`, `docs/adr/0043-mobile-menu-panel-and-cta-row.md`, `src/styles.css`, `src/components/AppShell.tsx`, `src/App.tsx`. Body: 1-line header + offcanvas `#mobileMenu` (z 2100: theme, 3 toggles map route, Source & Method); `.hf-cta-row` bound to `startHereMobileOpen`; FAB cosmetic only; footer fix; invariants: desktop unchanged, z 1500/1600/1700/2000/2100 + skip-link 3000, no new `--hf-*`, byte-identical double prerender, sitemap 215.

## 5. Refusal + manual remap

Exact refusal: **Hindsight MCP tools absent from this session's function schema; no shell/CLI path** (same as C7). Remap: run §1 (6 page ops) + §4 (1 ingest) in a tool-enabled session, then verify via searches "mobile header", "z-index ladder", "ADR-0043", "Cycle 9"; search before ingesting unapplied C7 D1/D2 and C8-1…C8-8 (duplicate risk). Destructive ops held: none.

## 6. Remember for next time

Hindsight MCP absent in headless sub-sessions → emit, not apply; ship self-sufficient payload; verify before re-ingest; ADR-0043 supersedes ADR-0039 for header only — nav stays footer-carried.
