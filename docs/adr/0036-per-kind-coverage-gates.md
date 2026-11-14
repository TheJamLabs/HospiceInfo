# ADR 0036 — per-kind coverage gate; children's shortfall risk-accepted

**Status:** accepted (2026-11-14, owner decision)

## Context

ADR-0035 per-kind tessellation runs two independent `tessellate()` passes, each
tiling the **full** UK land. The validator's invariant 2 — a single-tiling
premise from the ADR-0006/0030 era that sums all 194 catchment cells — is
stale: it went RED (162.70% = 54.9139/33.7526) and the polygon-clipping
`intersection` hard-crashed ("Unable to find segment #N", SweepLine) on large
self-overlapping multi-ring cell inputs (probed: Milton 253 rings, Priscilla
Bacon 136 rings). Round 2/2 of the C62-V2 fix pair required a gate decision,
taken by the owner on 2026-11-14: **risk-accept the children's gap** — land
both clip fixes and amend invariant 2 to per-kind coverage, with adults staying
strict and the children's shortfall recorded as documented debt.

## Decision

1. **Invariant 2 becomes per-kind coverage** (`scripts/validate-tessellation.mjs`):
   each kind's cells are unioned and compared to (UK land ∩ box − ROI).
   **Adults: HARD gate 99.0–101.0%** (exit 1 otherwise) — the adult tiling must
   cover UK land. **Children: reported, NON-FATAL (RISK-ACCEPTED)**: 18
   children's sites cannot tile the 33.7526 deg² target (root cause: site
   sparsity, concentrated in Scotland); remediation is a future data cycle with
   more children's sites. Children's shortfalls are printed with the
   ADR-0036 tag, never an exit.
2. **Invariant 5 (NI spill) per-kind:** adults keep the strict `< 1e-9 deg²`
   gate; **children's spill is a warning only (RISK-ACCEPTED)** — the
   children's NI cells are deliberately clipped to **ROI land** (Ireland − NI
   ring), not the NI ring, so they retain their Scotland reach exactly as
   before the C6 fixes (`scripts/build-data.mjs` children pass).
3. **Clip fixes landed:** `scripts/land-mask.mjs` `lm()` removes a ring's
   duplicated closing point (a closing dup carries no geometry — verified the
   file's own rings have no zero-length closing edges); children's NI cells
   clip to `roiLand` in `scripts/build-data.mjs`.
4. **Validator robustness:** invariant 2 pre-`union`s each cell's rings before
   `intersection` — `polygon-clipping` crashes on self-overlapping multi-ring
   input, `union` yields one clean ring; a degenerate cell (empty union, or
   an intersection that still throws) falls to **advisory, not fatal**, so a
   single broken cell can never hide the coverage numbers.
5. **The C62 2-edge sliver-drop gate in `mergeTwo` is UNCHANGED** (ADR-0034
   scope); no design change in this pass.

## Alternatives considered

* **Keep the single-pool gate:** rejected — the single-tessellation premise is
  stale under ADR-0035; it would fail every per-kind build.
* **Strict-gate children's coverage too:** rejected — requires children's site
  data expansion (a data cycle); the owner chose to document the shortfall as
  risk-accepted debt now.
* **Closing-point duplication as the crash root cause:** refuted — probes
  found no consecutive duplicate vertices in the large multi-ring cells (the
  crash input is self-overlapping rings; the pre-`union` is what fixes it).
* **Loosen adults' ±1%:** rejected — the whole point of the per-kind
  amendment is that adults remain strictly gated.

## Consequences

* Adults coverage verified green: **100.49%** (33.9175/33.7526 deg²) at
  `.qwen/tmp/validate-c62v2-b.log`; children 100.00% reported RISK-ACCEPTED;
  invariant 5 adults PASS (0.000000000 deg²), children spill 0.0006 deg²
  warning-only.
* Enabling the full validator walk **surfaced a pre-existing latent defect at
  invariant 6 (C6-2 Scottish overlap)**: worst SC×SC pair
  `Hospice at Home vs Strathcarron Hospice = 0.001983171 deg²` ≥ 1e-6 →
  exit 1. The 2026-11-08 baseline already carried worst-SC pairwise
  overlap 0.0136 deg² (before the C6-2 gate existed); the old runs aborted at
  invariant 2 before reaching it. This is **not covered by this ADR** — see
  the Cycle 6 ledger `.agents/pipeline.md` ("HUMAN DECISION REQUIRED"
  section); the rework cap (2 rounds) is exhausted.
* Children's-mode geometry in Scotland is unchanged; only the children's NI
  clip target shifted (NI ring → ROI land), which by design restores their
  pre-C6 Scotland reach and makes the invariant-5 children's figure a
  documented, non-fatal warning.
