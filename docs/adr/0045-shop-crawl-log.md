# ADR 0045 — The committed shop-crawl log as record and state

**Status:** accepted (2026-11-16)

## Context

The binding crawl policy requires a per-site outcome record
(`ok / no-shop-page / unreadable / skipped-robots / no-website`, plus the
WAF outcome `blocked` and the discovery outcomes the 190-row pool
requires). Separately, the crawl is a long, multi-hour, interruptible
operation (≈ 190 discovery rounds + per-site crawl + geocode, linear at
~1 req/s); a crash mid-run must not lose finished work. A second,
separate state file would drift from the audit record — two sources of
truth for the same facts.

## Decision

One committed file: **`data-raw/shop-crawl-log.json`** — the durable
record of every crawl/discovery attempt **and** the resumable state.

- **Location:** `data-raw/`, next to the raw shop sources it describes
  (reproducibility/audit rule A-08; A-10 keeps it in scope). Not
  `.agents/` (pipeline state), not `docs/` (must be machine-testable).
- **Shape:** a `meta` header (`run`, script, `ua`, `paceMs`,
  `outcomeVocabulary`, source refs) + one `entries` array with exactly one
  row per in-scope hospice row (190 discovery + 18 confirm).
- **Outcomes (8):** `ok` · `no-shop-page` · `unreadable` ·
  `skipped-robots` · `blocked` · `not-found` · `no-website` ·
  `discovery-found`. The last is the **only non-terminal marker** — it is
  the phase-1-succeeded/phase-2-pending resume point; every other outcome
  is terminal and never retried within a run.
- **Per-row audit:** outcome, accepted `website`, `discoverySource`,
  `pagesVisited`, `shopsExtracted`, `deduped`,
  `unresolvedPostcodes`, and a free-text `note` (human-audit flags for
  duplicate-identity rows, parser-limitation notes).
- **Write cadence:** the file is rewritten after **each site** completes
  (crash-safe resume point); the script exits 0 on data outcomes —
  nonzero is reserved for script bugs, so a long crawl is safe to
  re-invoke.
- **Confirm rows:** the 18 curated sites log `phase: "confirm"` with
  `shopsExtracted: 0` and `committed: false` invariants (asserted by
  `tests/crawl-log.test.mjs`) — the pass is read-only.
- **Manual refresh:** "re-crawl site X" = delete its log row, re-run.
  The script never overwrites terminal rows on its own.

## Alternatives considered

1. **`.agents/`**: pipeline state, not data provenance; QA/Security read
   `.agents/` as ledgers.
2. **`docs/`**: prose, not machine-testable by `npm test`.
3. **Ephemeral stdout/JSONL**: violates the reproducibility rule —
   nothing committed to audit.
4. **Per-site files (190)**: audit-hell, untestable in aggregate.
5. **Separate `shop-crawl-state.json`**: the drift risk of two sources of
   truth for one fact set.

## Consequences

- The log is a committed data artifact: every run is reproducible from it
  (who visited what, which shops were committed and from which `source`
  URL), and QA can trace any entry end-to-end (discovery → site → page →
  entry).
- `tests/crawl-log.test.mjs` validates schema + the 8-value vocabulary on
  every `npm test`, so a malformed log fails the gate, not a human.
- The 18 curated sites are provably untouchable by the log's invariants —
  the log is the enforcement mechanism for the confirm-only rule.
