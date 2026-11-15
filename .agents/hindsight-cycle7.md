# Hindsight — Cycle 7 (mobile 375 px layout fix), stage 10, 2026-11-15

Memory steward pass for C7. This is the missing C7 pass: `hindsight-cycle8.md`
already exists in the tree, no C7 counterpart did. Ground truth taken from the
inlined brief, spot-checked against `.agents/ops-cycle7.md` (read, 120 ln, fully
consistent) and one sitemap grep. This file is the only output; `src/`, `docs/`,
`dist/`, `pipeline.md` (read-banned) untouched and unread.

## 1. Memory state reviewed

Bank pages (per bank meta-artifact `.agents/hindsight.md`, bank last touched
2026-10-22/24/26 — Cycles 1–2 + bugfix pipeline; no later bank state recorded):

| id (prefix) | title | last recorded state |
|---|---|---|
| `kp-84899dd8…` | component map | 2026-10-22 tree correction |
| `kp-be4582a3…` | core concepts | 2026-10-22 scale correction |
| `kp-2008e97b…` | conventions | 2026-10-22 conventions |
| `kp-cab9174c…` | decisions | 2026-10-22 ADRs 0006–0014 era |
| `kp-b4b28bc7…` | initiatives | 2026-10-22 UK-wide expansion |

- Prior-cycle artifacts: `hindsight-cycle8.md` (2026-11-15) holds the C8
  correction/ingestion list (C8-1…C8-8) in "emitted, not applied" mode. It
  contains **no C7 material**; its dist facts (231 files / 208 hospice pages)
  are consistent with C7's, no contradiction.
- Hits/stales for C7: none of the C7 terms ("C7", "mobile 375", "StartHere",
  "sheet", "layout", ADR-0038…0041) appear in any recorded bank state — the
  bank predates C7. One stale posture carried in memory ("site fully static,
  no runtime surface", C5-era) is orthogonal to C7: C7 itself keeps the site
  static; the staleness was flagged for C8 (C8-4), not a C7 gap.
- No repo-local bank found (no `.hindsight/`, no knowledge dir): the bank is
  platform-managed, outside the working tree.

## 2. Gaps (C7 knowledge missing from Hindsight)

1. No initiative page for C7 (gate results, owner-gate pass date 2026-11-15).
2. ADR-0038…0041 absent from the `decisions` page (last recorded 2026-10-22).
3. W4 `ContainerResizeInvalidator` and W6 contrast ratios unpersisted.
4. C7-QA-1/2/3 and C7-SEC-2 risk-accepted debt not in durable memory.
5. C7 commit-scope fact (exactly 10 paths; `docs/MAINTENANCE.md` C7 section
   deliberately excluded, ships with the C8 `-A` commit) missing — high value
   for the next ship step.
6. C7 hashed-asset + dist invariants (index-Dn97-FzZ.css / index-D61LFkAW.js;
   231 dist / 171 prerendered / 208 hospice pages) missing from bank.

## 3. Actions taken (one line each)

- `read_file .agents/ops-cycle7.md` — OK; 120 lines; matches inlined ground truth (scope, chain, debt, rollback).
- `read_file .agents/hindsight-cycle8.md` (2 reads, lines 1–167 + 168–266) — OK; page ids, C8 list, overlap check; no C7 content found.
- `read_file .agents/hindsight.md` (1 read, lines 1–123 of 434) — OK; bank meta-page; 5 kp- ids + titles captured; no C7 entries.
- `glob .agents/*`, `**/*hindsight*`, `**/*knowledge*`, `.hindsight/**` — OK; located artifacts; confirmed no repo-local bank.
- `grep <loc>…/hospice/` on `dist/sitemap.xml` — OK; **208 matches**, verifying the 208-hospice-page claim (inlined brief said "verify if useful").
- `hindsight_search_knowledge_pages` (and any capture/ingest/list) — **NOT AVAILABLE**: these tools are not exposed in this session's function schema (only read_file / write_file / grep_search / glob); no shell tool exists, so no CLI path. No call was attempted; per the two-strikes rule no retry loop. Exact failure: *tool absent from session toolset — cannot be invoked*.
- `write_file .agents/hindsight-cycle7.md` — OK; this artefact (only write).

Result: bank search/capture/ingest could not be executed on-platform; the two
durable documents below are recorded in full here (self-sufficient, with
file-path metadata, one fact block each) as the ready-to-ingest payload. This
is the lighter "page update" fit: whole documents, not a page-patch.

## 4. Recorded facts (C7 ground truth — verbatim from brief)

**D1 — Initiative.** Title: "C7 — mobile 375 px layout fix (shipped 2026-11-15, owner gate passed)".
Metadata: `.agents/ops-cycle7.md`, `.agents/qa-cycle7.md`, `.agents/security-cycle7.md`.
Fact block: C7 = mobile 375 px layout fix. Owner gate (W8 items 3–9: in-browser
375×812 checks) passed 2026-11-15. QA PASS 0 Blocking; Security PASS 0 Blocking,
0 design-level routing. No code changes from owner-gate feedback.

**D2 — Decisions.** Title: "C7 decisions — mobile layout (ADR-0038..0041)".
Metadata: `docs/adr/0038-mobile-start-here-css-disclosure.md`,
`docs/adr/0039-mobile-nav-carried-by-footer.md`,
`docs/adr/0040-mobile-scroll-region-budget.md`, `docs/adr/0041-sheet-height-token.md`.
Fact block:
- **0038** — Start-here sheet default-open on mobile, CSS disclosure (sheet overlays the card; `aria-expanded` mirrors state).
- **0039** — mobile navigation carried by the footer (header drops to 4 lines/351 px).
- **0040** — scroll-region budget (which region scrolls at 375 px).
- **0041** — `--hf-sheet-h` token: one token, two consumers (sheet height).
- **W4** — `ContainerResizeInvalidator` (ResizeObserver → `map.invalidateSize()`, browser-native, no new dependency) added to `src/components/MapView.tsx` after verify-first grep found no resize handling.
- **W6** — contrast: light `#0d6efd`/`#fff` = 4.5008:1, dark `#6ea8fe`/`#0f1720` = 7.4719:1, both pass 4.5:1.

**Supporting facts** (carry into D1/D2 payloads):
- Code surface = exactly 5 src files: `src/App.tsx`, `src/components/AppShell.tsx`, `src/components/MapView.tsx`, `src/components/StartHere.tsx`, `src/styles.css`.
- Commit scope = those 5 + ADRs 0038–0041 + `GLOSSARY.md` (10 paths); `docs/MAINTENANCE.md` C7 section deliberately excluded from the C7 commit (ships with the C8 `-A` commit).
- Carried debt (risk-accepted, not blockers): **C7-QA-1** (requirements §8 item-2 wording drift; fix contract line next touch), **C7-QA-2** (W4 invalidator undebounced; add rAF coalescing in a later cycle only if owner-gate item 7 shows jank), **C7-QA-3** (zero automated 768 px layout coverage; follow-up: Playwright 375×812 pin), **C7-SEC-2** (aria-expanded "expanded" while sheet occludes card — routed to QA §8.9 a11y gate, observed behavior not defect).
- Deploy model (ADR-0014, unchanged): git-connected Cloudflare Pages; push to `main` = publish to `https://hospiceinfo.pages.dev`. C7 hashed assets: `index-Dn97-FzZ.css` / `index-D61LFkAW.js`; 231 dist files, 171 prerendered, 208 hospice pages (verified: 208 `/hospice/` `<loc>` in `dist/sitemap.xml`). Pre-push determinism chain (6 steps, ops-cycle7.md §4): `npm test` (23/23) → `npm run check:layout` → `npm run build` → `cp -r dist /tmp/dist-a` → `npm run build` → `diff -rq /tmp/dist-a dist` (must be empty). Rollback: `git revert <C7-commit>` + push; nothing else needs rollback.

## 5. Final state

- C7 is **not yet findable in the platform bank** — capture/ingest tools were
  absent this session; the D1/D2 documents plus supporting facts are recorded
  here, self-sufficient, with file-path metadata, ready to ingest verbatim.
- Confidence: **high** on the facts (cross-checked ops-cycle7.md + sitemap
  grep, 208/208; zero contradictions vs C8 artefact); **medium** on the bank
  itself (no search was run — applied via artefact only).
- Remaining gap (lead action, exact operations): ingest D1 as page
  "C7 — mobile 375 px layout fix (shipped 2026-11-15, owner gate passed)" and
  D2 as "C7 decisions — mobile layout (ADR-0038..0041)", including the
  supporting-facts block; then confirm the C8-1…C8-8 list from
  `hindsight-cycle8.md` is also applied (it was emitted, not applied).
- Destructive operations held: none required; no deletes, re-embeddings, or
  bulk actions proposed or performed.
