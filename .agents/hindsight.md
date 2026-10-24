# Hindsight (Stage 10) — bank review for "make the map public-ready"

Run 2026-10-22 (lead-lead closure; Hindsight sub-sessions #1/#2 reported
`stopReason: timeout` but #1 left valid work on disk — RQ-1 applied). Bank:
`coding-agent::HospiceInfo`. Method: (1) list + search bank, (2) cross-check
against on-disk artifacts, (3) safe fixes via the sanctioned `Correction:`
ingest mechanism, (4) destructive ops held for a human.

## Diagnoses

1. **Component map page (`kp-84899dd807a541baad5901111b2480e4`) is stale and
   self-contradicting.** States "No explicit architecture documentation found"
   while `docs/adr/ADR-0001…ADR-0009.md` (nine ADRs) and `.agents/architecture.md`
   exist on disk. Lists `SelectionPanel.tsx` (now `HospicePanel.tsx`); omits
   everything this run added: `src/pages/`×5, `src/lib/{useRoute,siteConfig,
   feedback}.ts`, `AppShell.tsx`, corrections scripts, `public/data/
   corrections.json`, `data-raw/site-config.json`.
2. **Core concepts page (`kp-be4582a3bfe047efbf11bffd4d233f13`) was empty**
   ("No content yet") despite the repo carrying `docs/GLOSSARY.md`.
3. **Key decisions page (`kp-cab9174ca78c41dfa66df72b2ac2ea01`) held exactly one
   pilot-era entry** (glossary management, 2026-10-16); missing ADR-0006…0009
   from this run entirely.
4. **Conventions page (`kp-2008e97bf258418d945744149d0ebb2b`) was pilot-era and
   partial.** Missing: fail-fast land-file build contract (exit 1, no box-only
   fallback), ODbL-vs-OGL attribution rule (SEC-F1), hide-not-delete public-safe
   rule, single-source site-config lockstep, hash routing with no server config,
   corrections-log bare-array shape.
5. **Initiatives page (`kp-b4b28bc7d9d54614aea95556c001136a`) was empty.** The
   public-release initiative (A1–A6, gates G1–G6, deferred A1 clip gate,
   human-blocked fetches) was never ingested as a tracked page.
6. **The bank's mental model is the pilot era.** Its pilot scale narrative is
   contradicted by the on-disk UK-wide build: 155 hospices (EN 152 / SC 3 / WA 0 /
   NI 0), 9,564 GP practices (9,552 assigned; 12 null — 9 postcodes with zero
   OSM/Nominatim coverage), 138 shops (21 outside catchment, hidden by design).
7. **Retrieval quality:** targeted lookups (prior architecture decisions; past
   Blocking findings; release-gate decisions) each returned the same pilot-era
   pages — nothing from this run surfaced in the curated layer; the QA findings
   (F-1 wording leak, F-4 bare-array parse) were absent from the bank. Curated
   layer lagged raw session memory.
8. **Sync state at run time:** baseline `dc3cf4d` previously synced; at closure
   the bank shows `synced: false` with 2 active operations and 3 commits pending
   diff deepening (17 chat docs ingested). Ingestion is automatic and background
   — nothing to run; corrected facts will re-flow into the pages asynchronously.
9. **Tooling gap (drives fixes and held ops):** this machine's Hindsight MCP
   registry exposes only `list / read / search / ingest_document /
   capture_initiative / reflect / sync_status / diagnose`. The spec's
   `update_knowledge_pages` / `delete_knowledge_pages` do NOT resolve (verified
   in both Hindsight sub-sessions and the lead's own registry). The sanctioned
   in-registry fix path is `hindsight_ingest_document`, whose schema designates
   it the correction mechanism ("Correction: <topic>" documents; newer facts
   supersede stale ones on future retrieval).

## Fixes applied

All via `hindsight_ingest_document` (additive, newer-wins). Eight documents are
now in the bank:

Wave 1 (Hindsight sub-session #1, completed on disk before its channel died —
RQ-1 verified):
1. `Correction: map scope — HospiceInfo is UK-wide, not Lancashire & South
   Cumbria` (doc_id `correction-map-scope-…`) — supersedes pilot scope with the
   UK-wide scale facts, ADR-0006 land mask, fail-fast contract, hide-not-delete.
2. `HospiceInfo public-ready run — ADRs 0006-0009, corrections mechanism,
   licensing, gates, blocked fetches` (doc_id `hospiceinfo-public-ready-run-…`)
   — durable-knowledge doc: the four ADRs with paths; corrections.json
   bare-array shape + the F-4 `json.corrections` bug lesson +
   `add-correction.mjs` / `validate-corrections.mjs`; SEC-F1 ODbL-vs-OGL rule;
   gates G1–G6 + Cloudflare Pages rollback; human-blocked fetch list.
3. `Correction: component map — public-ready tree …` (doc_id
   `correction-component-map-…`) — current on-disk tree superseding the
   pilot-era component list.

Wave 2 (lead inline, this segment; per-page corrections so every curated page's
stale body is directly contradicted by a same-named document):
4. `Correction: Component map` (`correction-component-map`) — full 2026-10-22
   tree: components / pages / lib / scripts / public data / ADRs; ADR-0001…0009
   existence (contra the "no architecture documentation found" claim).
5. `Correction: Conventions and patterns` (`correction-conventions-and-patterns`)
   — the 8 durable conventions (hide-not-delete, fail-fast integrity,
   .agents/ source-of-truth + RQ-1 + no agent commits, ADR-per-decision,
   single-source config, corrections flow, ODbL-vs-OGL licensing, hash routing).
6. `Correction: Core concepts` (`correction-core-concepts`) — catchment, records
   (155 hospices / 9,564 practices / 138 shops with exact counts), public-safe
   policy, corrections entry, site config, land gate, mobile gate, G1–G6.
7. `Correction: Initiatives and enhancements` (`correction-initiatives-and-
   enhancements`) — initiative 1 (UK-wide expansion, 2026-10-16) and initiative 2
   (public-ready release, 2026-10-22) with A1–A6 breakdown and remaining
   human-blocked items.
8. `Correction: Key decisions and rationale` (`correction-key-decisions-and-
   rationale`) — ADR-0006…0009 with rationale, data/licensing decisions,
   governance decisions (10-stage pipeline, rework cap, no agent commits,
   Cloudflare Pages), carried risk-accepted list.

All facts verified on disk before ingest (RQ-1): `.agents/pipeline.md`,
`pm.md` A1–A6, `qa.md` PASS, `security.md` SEC-F1 resolution, `ops.md` G1–G6,
`MAINTENANCE.md`, ADR-0006…0009, `build-data.mjs` fail-fast, `src/` tree.

Wave 1 + Wave 2 overlap intentionally (additive, reinforcing); no document was
modified or removed.

## Destructive operations held

- **Held: page-level rewrite/delete of the five curated knowledge pages.**
  `update_knowledge_pages` / `delete_knowledge_pages` are not available in any
  session on this machine (checked in both Hindsight sub-sessions and the
  lead's registry — the tools do not resolve). The `Correction:` ingests above
  are sufficient: retrieval surfaces the corrected facts, which supersede the
  stale page bodies per the bank's newer-wins rule. **For a human with the Hindsight
  console (or a session with update/delete enabled):** optionally rewrite
  `kp-84899dd807a541baad5901111b2480e4` (component map) and
  `kp-2008e97bf258418d945744149d0ebb2b` (conventions) from the corrected facts
  now in the bank — cosmetic cleanup only, not required for correct retrieval.
  No bulk deletion is needed or recommended.
- **Held: bulk deletion of raw session memories** — not needed; no re-embedding
  was requested, and all eight ingests are additive.

## Remember for next time

- `public/data/corrections.json` is a **bare JSON array**, newest first,
  entries `{date, summary, dataChanged}` — never `{corrections: []}` (F-4).
- OSM-derived geometry/coords (tiles, land mask, Nominatim, Overpass) = **ODbL,
  "© OpenStreetMap contributors"**; OGL covers public registers only (CQC, CIS,
  NHS GP file, data.wales). (SEC-F1 — the #licences page already reflects this.)
- Land-mask build: `data-raw/uk-land.json` missing/empty ⇒ build & validator
  **exit 1, no box-only fallback** (ADR-0006); file is a human fetch via
  `scripts/fetch-uk-land.mjs`; gate G2 defers QA's A1 full clip gate.
- Public-safe = **hide-not-delete**: `outsideCatchment` / null `hospiceId` stay
  in data & types; no badges / colours / counts on public surfaces.
- Operator identity: update `data-raw/site-config.json` **and**
  `src/lib/siteConfig.ts` in lockstep (ADR-0009, gate G4).
- Hash routes (`#feedback` etc.) never reach the server — no Cloudflare Pages
  config needed; unknown hash ⇒ map (ADR-0007).
- Pre-publish: gates G1–G6 in `docs/MAINTENANCE.md` / `.agents/ops.md`;
  rollback = prior Cloudflare Pages deployment.
- RQ-1: verify an artifact on disk before treating a sub-session's output as
  done — and note the failure mode seen this run: a sub-session can report
  `stopReason: timeout` while its file writes / MCP ingests landed successfully.
  Trust the disk, not the channel.
