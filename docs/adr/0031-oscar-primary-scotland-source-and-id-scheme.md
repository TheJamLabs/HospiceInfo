# ADR 0031 — OSCAR primary source for Scotland + id scheme

**Status:** accepted (2026-11-07)

## Context

The Scottish hospice register in the repo is `data-raw/hospices-sc.json`,
produced by `scripts/extract-hospices-sc.mjs` from
`data-raw/care-inspectorate-scotland-2026-08.csv` (Care Inspectorate
Scotland register, as at 31 Aug 2026). Cycle 5 (`.agents/feature.md`)
requires Scotland to grow from 3 to ~40 hospices, reconciled against OECD
candidates OSCAR / Hospice Scotland / PPPC (`.agents/research.md` §5.3,
verified on disk 2026-11-07).

The GIS CSV is provably capped at 3 (research.md §5.3.1–5.3.2): its
`CareService` vocabulary contains no hospice category, and the "hospice"
name filter yields exactly the 3 surviving rows — all
`CareService=Support Service` / `Subtype=Care at Home`. They are the
hospice-at-home arms of hospice organisations, kept for id stability
(F-1, risk-accepted). The Care Inspectorate register therefore
structurally under-covers Scottish hospices: 3 of ~40.

The PPPC ~19-entry directory is known-incomplete (gaps: Aintree, Victoria
Dundee, St Andrews; one blank + one invalid postcode) — seed-only (F-2,
risk-accepted). OSCAR (the Online Scotland Charity Register, the statutory
charity register of the Scottish Charity Regulator) holds the full
population with charity registration numbers (SC numbers) and registered
addresses; `www.scotcharityregister.org.uk` is unreachable from this
machine (`curl: (6)` ENOTFOUND, research.md line 24) → human fetch H5-2.

## Decision

1. **OSCAR is primary.** The Scottish hospice set = OSCAR entries,
   reconciled against the Hospice Scotland members list and the PPPC seed;
   conflicts resolve to OSCAR. The ~40 target is an expectation, never a
   hard gate (research.md §5.3.4). Raw pin:
   `data-raw/oscar-scotland-hospices-2026-11.csv` (H5-2).
2. **New extractor, APPEND mode.** `scripts/extract-hospices-sc-oscar.mjs`
   (new file) reads the OSCAR CSV and **appends** to
   `data-raw/hospices-sc.json`; existing rows are preserved byte-for-byte.
   The GIS extractor (`scripts/extract-hospices-sc.mjs`) is untouched —
   overlapping provenance is kept intentionally.
3. **Id scheme (OQ-2): `sc-oscar-<SC>`** (SC = Scottish Charity Number).
   Fallback `sc-oscar-r<n>` (1-based position) when the SC number is
   absent or invalid on a row. A distinct namespace, not an extension of
   `sc-<CSNumber>`: CS numbers and SC numbers come from different
   registers and are not provably disjoint from the CSV alone. ADR-0002's
   `{nation}-{registerId}` shape is preserved with registerId `oscar-<SC>`.
4. **`address[]` passthrough (OQ-3): emit it on new rows.** The chain
   already supports it with no schema change: `merge-hospices.mjs`
   `townOf` (L42) reads the last `address[]` element as a town fallback,
   and the sc map uses `town: h.town || townOf(h)` (L53); the merge output
   (header comment, output shape `{id,name,town,postcode,nation,kind,source,
   website,cqcUrl,curated}`) and `build-data.mjs` `hospicesOut` (L117)
   carry no `address` field, so the public output is unchanged — the field
   drives town derivation only.
5. **Identity stability: by construction.** The 3 in-repo sc rows
   (`sc-CS2014323454`, `sc-CS2022000173`, `sc-CS2023000094`) are
   register rows with `curated: false`; their stability is guaranteed by
   `hospices-sc.json` being append-only. ALTERING or DUPLICATING them is
   structurally impossible in an append-mode extractor; any accidental
   duplicate id trips the merge's unique-id assertion
   (`merge-hospices.mjs` L88–90, exit 1).
6. **Provenance.** `merge-hospices.mjs` currently stamps every sc row with
   `SOURCES.sc` (the GIS string); new `sc-oscar-*` rows must carry the OSCAR
   source string (`source: "OSCAR — Scottish Charity Register
   (data-raw/oscar-scotland-hospices-2026-11.csv)"`), selected by id prefix
   in the merge (one-line change; keeps ADR-0009 provenance discipline).

**Concise, same ADR — schemes and proofs this ADR also sets:**

- **Wales ids: `wales-r<n>`** (1-based position in the HHW members list;
  row anchors UNVERIFIED → ADR-0002 row-index fallback by design). No
  "hospice" name filter: Welsh names such as Tŷ Hafan and Y Rhoel do not
  contain the word; apply the filter only where the source is already
  hospice-scoped.
- **NI completeness — two-leg proof (research.md §5.4):** (1) the "hospice"
  name filter on the RQIA bulk export yields exactly 6 services; (2) every
  classification column (`Service Type`, `Categories of Care`,
  `Conditions`) contains **zero** hospice values — so a hospice service
  cannot exist in the register without being caught by the name filter.
  NI stays at 6.

## Alternatives considered

- **PPPC directory as primary:** rejected — known-incomplete (19 vs ~40,
  F-2), no SC numbers for stable identity.
- **Hospice Scotland members list as primary:** rejected — a trade-body
  association list; OSCAR is the statutory register and carries the SC
  numbers (identity + registered address). Hospice Scotland is used for
  reconciliation only.
- **Replace mode in the new extractor** (rewrite `hospices-sc.json` from
  OSCAR alone): rejected — would destroy the 3 in-repo source-of-record
  rows the published map (build of 2026-10-30, commit bbe4bde) is keyed on.
- **Extending `sc-<CSNumber>`** with OSCAR numbers: rejected — two
  registers, two number spaces; mixing namespaces risks silent identity
  collisions and hurts debuggability.

## Consequences

**Positive (accepted):** ~40 stable, address-bearing Scottish identities;
deterministic ids; the 3 existing sc rows and their hash-derived colours
(ADR-0004) are untouched; build chain stays green before H5-2 lands (G3).

**Negative (accepted):** the Scottish set carries two provenance families
(`sc-CS<CSNumber>`, GIS; `sc-oscar-<SC>`, OSCAR) — the UI shows both as
`kind: approx`, `curated: false` and does not distinguish them; the 3 GIS
rows are hospice-at-home arms that coexist with their OSCAR parent
organisations as separate rows (F-1, risk-accepted — they are separately
registered services); OSCAR licence/attribution wording is UNVERIFIED from
this machine and must be captured at fetch time (OQ-5, H5-2 item 3) before
the `data/README.md` provenance row is written.
