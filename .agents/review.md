# Review — UK-wide hospice catchment map (2026-10-16)

Stage-3 reviewer pass. Read: `.agents/feature.md`, `.agents/research.md`,
`.agents/architecture.md`, the five ADRs in `docs/adr/`, `GLOSSARY.md`,
`scripts/catchment-map.mjs`. Disk-verified: `src/` components, `data/README.md`,
`scripts/geocode-postcodes.mjs`, `scripts/validate-tessellation.mjs`,
`data-raw/postcode-geo.csv` row count.

## 1. Verdict

PASS WITH NOTES — the design does not block the PM/Coding stages.

## 2. Acceptance-criteria traceability

| # | Criterion | Where satisfied | Status |
|---|-----------|-----------------|--------|
| 1 | Hospice coverage — four national regulator registers | §1 per-nation sources → `hospices-{en,sc,ni,wales}.json` → `hospices-all.json`; ADR 0002 ids | **GAP** (3 items below) |
| 2 | GP practices UK-wide, Nominatim 1 req/s resumable, complete partition | §1 four practice files; §3 batch (resumable, 1 req/s, ToS); §4 single nearest-hospice rule; §6 `unassigned: 0` | OK (note: NI file LCG coverage unverified — risk 3) |
| 3 | Voronoi of practice + hospice-site points, multi-ring union | §2.3 UK box `[-9.5, 49.5, 2.0, 61.5]` (ADR 0001); §4; GLOSSARY "tessellation" (hospice sites are vertices) | OK |
| 4 | 20 curated keep flags as the only exceptions | §2.1 `curated` seeded by CQC-ID match from `catchment-map.mjs`; ADR 0005 retires outcode assignment, keeps `kind`/`source` | OK (cqcUrl audit 20/20 — §3) |
| 5 | Search-first UI, nation filter, legend demoted, local colour | §5.2 (search box first, nation pills, `fitBounds` per nation); ADR 0004 hash colour | OK (minor: modal legend shows the 20 with their new hash colours, old palette retired — documented interpretation of "demoted to on-demand") |
| 6 | `npm run build`, reproducible pipeline, dev-server smoke test | §6 (byte-identical rebuild, `unassigned: 0`, shops toggle, `curated: true` count) | OK |
| 7 | Existing work intact — 138 shops, header toggle, flags recomputed | §2.3 `shops.json` data untouched, flags recomputed; §4 `outsideCatchment` point-in-rings; §5.2 layout preserved | OK (minor: work list should state the `showShops` header toggle is preserved; currently implicit) |

**GAPs (criterion 1):**
- **G1 — NI RQIA:** §1 asserts "bulk export confirmed by research"; research marks the XLSX claim UNVERIFIED and contradictory to the feature brief, and the design has no fallback if the export does not exist (unlike Wales).
- **G2 — England multi-location rows:** research's 178 "hospice" rows are CQC *location* rows, not unique hospices; a multi-site hospice yields sibling rows, each becoming its own catchment (siblings of the 20 curated get `curated:false` and split their own organisation's Voronoi). No dedupe rule exists in the architecture or the ADRs.
- **G3 — Wales conditional:** criterion 1 is met "as of build time" only with 0 Welsh hospices until the CIW email reply lands (§1 placeholder). Non-blocking, time-bound.

## 3. Consistency checks (cross-artifact)

- **Colour (feature rule 5 ↔ research ↔ ADR 0004):** consistent. Research: no lambda-2 / no Z0-abseq in the codebase, colour is a 20-entry `PALETTE`; architecture §5.1 retires it; ADR 0004's hash colour is local to the id — exactly "local colour rotation, not a stable 300-colour identity".
- **Curated-20 identification (CQC location ID):** read `scripts/catchment-map.mjs` — **20 of 20** entries carry a CQC location ID in `cqcUrl` (all `cqc.org.uk/location/1-<digits>`, from `1-126365065` to `1-3760466342`); none missing. The `merge-hospices.mjs` ID match is feasible.
- **Wales placeholder:** reflected — §1 step 4 ("build proceeds with 0 Welsh hospices … flagged placeholder, not an error") and §6 ("Wales possibly 0 — flagged").
- **Geocoding estimate:** architecture's 11–12k / 3–4 h sits at the conservative end of research's range (9–12k, 2.5–3.5 h; measured 7,995 EN + 230 NI postcodes, SC/Wales UNVERIFIED) with SC ~3k / WALES ~1k assumptions explicitly marked as assumptions. Minor: §3 counts "NI 305" (rows) where the distinct-postcode count is 230; the estimate absorbs it.
- **Contradiction found:** §1 NI "bulk export confirmed by research" vs research "not re-verified this session … must download and confirm before relying on it" (basis of G1).
- **Minor:** the architecture cites `docs/adr/0001.md`…`0005.md`; on disk the files are slugged (`0001-uk-wide-voronoi-clip-box.md` … `0005-retire-outcode-assignment-for-the-20-curated.md`). Content matches the [ADR-n] numbering; fix the citations.

## 4. Risks & questions for the PM

1. **RQIA first action = confirm the bulk export** (download, check columns on first run), and add a work item for the fallback if it does not exist (thin register scraping, or an NI placeholder like Wales). Why: criterion 1's NI coverage rests on a claim the architecture overstates, and the design has no fallback path.
2. **Dedup multi-location CQC rows** in the England extract to one row per hospice organisation (main-site rule); assert the 20 curated IDs each map uniquely. Why: prevents G2 — duplicate catchments and diluted flags on the curated 20.
3. **Verify the NI reference file's LCG coverage on first run** (distinct LCG values; research notes the sampled LCG is Belfast only). If Belfast-only, document the limitation in the Methodology modal or source a fuller file. Why: criterion 2 "all registered locations" and non-degenerate NI catchments.
4. **Scotland first-run column check** (header + sample logged, non-zero exit on unmapped required field) per ADR 0003 — make it an explicit work item; QA should assert the mapping table matches the committed header in `data/README.md`.
5. **CIW email lead time:** PM sets a decision deadline — ship with Wales = 0 flagged, or phase Wales hospices. Build and QA must assert the build is valid with a zero-length Wales set.
6. **QA: `hashToColor` is a pure function of `id`** — byte-identical `public/data/*.json` on rebuild (no timestamps, order-independent), plus the `unassigned: 0` partition log.
7. **Geocoding wall time:** 429/503 backoff (4 req/min cap) can stretch 3–4 h into 2–3 days — plan a monitored background run; QA asserts resumability (idempotent re-run, no duplicate `postcode-geo.csv` rows).
8. **10k `CircleMarker` first paint** ≤ ~2 s in the smoke test; the pre-agreed fallback is the one-line canvas renderer — verify it, do not pre-empt it.

## 5. Scope guard

No material drift outside feature.md's out-of-scope list:
- no new frameworks/backend/auth/telemetry — the only new dependency is `xlsx` (dev-only, script-side data parsing; a library, not a framework — acceptable, noted);
- no UK-wide charity-shop collection — `shops.json` remains the 138-shop set, flags recomputed only;
- no manual curation of the ~300 new hospices — every new catchment is practice-derived;
- no changes to QWEN.md / agent definitions.

The Wales manual email step is data acquisition within the "regulator registers per nation" decision (CIW only answers email requests) and is already flagged in the design.
