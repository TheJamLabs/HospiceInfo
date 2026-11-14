# ARCHITECTURE — Cycle 6 (NI clip, SC jitter gate, postcode fallback, per-kind tessellation)

**Date:** 2026-11-08
**Inputs:** `.agents/research.md` (C6-1..C6-4 research record), working-tree
verification (`build-data.mjs`, `validate-tessellation.mjs`, `StartHere.tsx`,
`postcodes.ts`, `tests/postcodes.test.mjs`, `App.tsx` grep, `data/README.md`),
ADRs 0006 / 0033, dispatch decision table.

Where the research record and the disk disagree, **the disk wins** — verified
case in C6-3. The prior attempt's record is superseded by this file (git
history). All line references are to the current working tree.

---

## C6-1 — Northern Ireland catchments clipped to the NI admin ring

**Decision.** The NI clip ring is **OSM relation 156393** (admin_level 4
"Northern Ireland / Tuaisceart Éireann", 929 way members, single closed
outer ring, no holes), committed as `data-raw/roi-border.json` and applied
**after** the land clip, guarded to `id.startsWith('ni')` catchments. The
consumer is already wired on disk: `scripts/build-data.mjs` L118–130 (load +
fail-fast `process.exit(1)` on missing/degenerate ring; logs relation
id/name/points/fetchDate) and L273–274
(`if (id.startsWith('ni') && clipped.length)
clipped = intersection(clipped, roiRingPoly)`); the validator guard is
invariant 5 (L109–141: fail-fast on missing file, `spill =
area(intersection(cellPoly, roiPoly))` per NI cell, total `roiSpill`,
exit 1 if `roiSpill >= 1e-9`). **The outstanding C6-1 work is the data
artifact plus its provenance — no consumer code changes.** The committed file
must be exactly what the in-flight fetch commits: Coding does not hand-edit
or regenerate the geometry, and the `data/README.md` provenance row is
derived from the committed file's fields on disk (RQ-1: no fabricated values).

**Rationale.** The land mask (ADR-0006) is island-scoped by construction
(`fetch-uk-land.mjs` L38–42, box minLon −11.0; island ring OSM 62273), so the
land clip removes nothing for NI — the ROI/sea halves of NI cells survive it
and need the admin-boundary clip. The OSM admin ring is authoritative, ODbL,
reproducible to fetch, and a single closed outer ring (no holes) means a
single-polygon intersection needs no interior-ring handling. The fail-fast
contract guarantees a missing ring can never ship unclipped data.

**Acceptance (measurable).**
1. `data-raw/roi-border.json` exists with the full §Data-artifacts schema;
   `ring` closed (first = last), `ringNodes >= 600` (in-flight fetch: 665),
   `areaDeg2` within 5% of 5.54, `licence` exactly
   `"ODbL v1.0, © OpenStreetMap contributors"`, `adminLevel === 4`.
2. `node scripts/validate-tessellation.mjs` exits 0 with invariant 5 green:
   total NI spill `< 1e-9 deg²` (implies `< 1e-9 deg²/cell`).
3. `en`, `sc`, `wales` entries of `public/data/catchments.json` are
   **byte-identical** to the pre-C6-1 baseline (clip is id-guarded); the
   byte-identical rebuild ritual (double build, SHA-256 compare) is green.
4. `data/README.md` provenance row per §Data-artifacts + the §Licences ODbL
   line for this file.

**Files Coding touches.**
- `data-raw/roi-border.json` (new — from the lead's in-flight fetch; if
  absent/incomplete when Coding runs, refetch per research.md §5 notes —
  plain way endpoints, `.full` 406s; ~20 way ids per batch; 404 on a red-lined
  id → bisect — and verify the schema above).
- `data/README.md` (provenance row + SHA-256 pin + licences line).
- No script/component edits (read-only verification only).

**NOT in scope.** Land-mask box changes; clip ordering; validator threshold
changes; bundling the one-off fetch into a permanent script.

---

## C6-2 — JITTER nudge + validator gate for Scotland cell overlap

**Decision.** The lever is the `JITTER` constant in `scripts/build-data.mjs`
L206 (currently `1e-5` deg): **reduce it until the validator gate is green**,
leaving the mechanism unchanged — 8-direction spiral `JDIRS` (L207),
co-location buckets `lon.toFixed(6)+','+lat.toFixed(6)` (L229–236), offsets
applied (L239–242), deterministic by label order. The chosen final constant
is recorded in `.agents/implementation.md` together with the gate run that
proved it. The acceptance gate is already shipped in the working tree:
`validate-tessellation.mjs` invariants 5 (L109–141) and 6 (L142–149), the
uncommitted `M` change.

**Rationale.** The defect is co-located seed degeneration: global pairwise
overlap baseline 0.0269 deg², worst SC pair **St Michael's vs St Michaels
0.0136 deg²** (invariant 6's target, read at L142–149: **all SC×SC pairs of
non-empty cells** over `scPresent`, plus a **zero-empty-SC-cells** check —
`scEmpty.length > 0` → exit 1). A deterministic constant is the minimal,
closed-form lever, and every change is re-proven by the full chain; the
actual worst case is a two-member twin, which a single smaller nudge
resolves. The ledger's "exit 0" baseline predates invariants 5–6, so
**current data is expected red on invariant 6 (0.0136 ≥ 1e-6) and red on
invariant 5 until `roi-border.json` lands — turning the validator green is
the C6 acceptance gate, not a regression.**

**Acceptance (measurable).**
1. `node scripts/validate-tessellation.mjs` **exits 0** — all invariants 1–6.
2. Invariant 6: **0 empty SC cells** and **every SC×SC pair `< 1e-6 deg²`**
   (worst pair, if any ≥ 0 deg², reported in `.agents/qa.md`).
3. **No other-nation pair worsens**: global worst pairwise overlap (the
   invariant-3 advisory, L120–128) `<= 0.0269 deg²`; new value reported in
   `.agents/qa.md`.
4. No *new* empty cell anywhere (invariant 4) vs the pre-C6-2 baseline (3
   empty total, incl. `ni-r5` — no land in box).
5. Byte-identical rebuild ritual green (the nudge is a pure function of fixed
   label order and fixed constants).

**Files Coding touches.** `scripts/build-data.mjs` (constant value only —
no mechanism change); rebuild via the standard chain; no validator edits.

**NOT in scope.** Mechanism redesign (golden-angle spiral / per-group scaled
offsets — considered, rejected for first move: the real worst pair is a
two-member twin, and a mechanism change would touch every nation's cells at
once); deduplicating co-located sites; loosening the `1e-6`/`1e-9` thresholds;
per-hospice hand-pinning of Scottish cells.

---

## C6-3 — start-here postcode: normalise-then-exact, outcode+sector fallback

**Decision.** Lookup is **exact-after-normalise first; on a miss, fall back
to the same outcode+sector, chosen by latitude** (smallest latitude among
practices whose normalised postcode starts with the input's outcode+sector
prefix — e.g. `LS14AP` → `LS14` — deterministic tie-break by id). Two parts:
(1) **verified on-disk state** — `src/lib/postcodes.ts` contains only
`normalisePostcode` (strip non-alphanumerics, upper-case);
`src/components/StartHere.tsx` already applies it at **both** call
boundaries — practice map build L36 (`m.set(normalisePostcode(p.postcode), p)`)
and submit L72 (`setSubmitted(normalisePostcode(postcode))`) — with the
lookup at L39 a plain exact `Map.get`. **The research record's (and the prior
architect record's) `matchPostcode` / `postcodeLookup` helpers do not exist
anywhere on disk (repo-wide grep); the disk wins**, so the wiring the
dispatch asked for is already complete and the outcode+sector tier is not
"existing". (2) **Coding adds the fallback as a small testable helper in
`src/lib/postcodes.ts`** (e.g. `findPracticeByPostcode(submitted, practices):
Practice | null` — exact-normalised first, then the sector rule) and routes
`StartHere.tsx`'s L39 lookup through it.

**Rationale.** Normalisation alone closes the reported brokenness class
(lowercase / spacing / hyphens / ` UK` suffix against the 11,002 normalised
practice postcodes) — James's failed postcode very likely resolves there.
The sector fallback covers the residual class (the user's unit postcode ≠
any registered practice's unit postcode, same sector) with a deterministic,
unit-testable rule over data that already carries geocoded lat/lon, keeping
the card useful without exposing internal flags (hide-not-delete, ADR-0012:
not-found wording unchanged).

**Acceptance (measurable).**
1. **Human gate 2**: James's failed postcode, entered verbatim (as he typed
   it), resolves end-to-end — card shows his practice (name + postcode), the
   hospice name + town, and "Open in panel" opens the correct route.
2. `tests/postcodes.test.mjs` green and extended: the existing five
   `normalisePostcode` asserts stay; new asserts cover (a) exact match wins
   over the sector fallback, (b) fallback picks the smallest-latitude
   practice in outcode+sector, deterministic id tie-break, (c) no fallback
   when no practice shares the sector → not-found path, (d) inputs shorter
   than 4 normalised chars get no fallback.
3. A byte-exact unit postcode that matched before still matches (exact tier
   ordering unchanged); not-found wording unchanged (neutral, greppable, no
   internal flag named).

**Files Coding touches.** `src/lib/postcodes.ts` (new helper),
`src/components/StartHere.tsx` (route the L39 lookup through it),
`tests/postcodes.test.mjs` (new asserts).

**NOT in scope.** Input `pattern`/`maxLength` changes; data-side postcode
normalisation (already in the build); locality search; changes to the
feedback-mailto note.

---

## C6-4 — per-kind tessellation; children's mode

**Decision.** **Adult and children catchments run as two independent
`tessellate()` passes** — `tessellate(adultSites)` and
`tessellate(childrenSites)` — so the two sets share **no Voronoi vertices**:
each pass seeds only its own sites plus the geocoded practices assigned to
those sites. This is **already implemented on disk** (the `tessellate`
definition at L210–214; the per-kind calls at L283–285), and the App view
layer is complete (`src/App.tsx`: `childrenMode` state L50,
`activeHospices`/`activeCatches` filtered on `children === childrenMode`
L63–69, `#childrenToggle` L147–156 "the two sets, and their catchment areas,
are completely separate"). **Coding's remaining C6-4 work is the two thin
spots:** (a) the route-level HospiceDetail view must apply the mode filter —
a detail route reached in one mode renders that mode's set; (b)
`StartHere.tsx`'s navs (`onOpenHospice` from the found card, `onOpenShopSearch`
from the fundraiser section) must carry/preserve the mode flag so a
children-mode user lands in children-mode detail. Data edge cases are
resolved at the human gates and verified by Coding: **St Andrew's (Grimsby)
ships in BOTH sets** (children + adult rows, catchment in both);
**`sc-oscar-019724` (CHAS umbrella) is removed entirely** from
`data-raw/hospices-all.json`; **ni-r3's blank town** takes James's gate-1
value (no blank `town` in shipped `hospices.json`).

**Rationale.** Per-kind separation prevents cross-kind practice assignment
(a children-only practice must not carve an adult cell) and stops children's
boundaries warping adult geometry; a shared vertex set could not guarantee
that. A view-level two-state toggle (default adult) leaves the first-load
public map untouched. The edge-case choices are data-level curation and
belong at the gates; the architecture pins only their downstream effect.

**Acceptance (measurable).**
1. **No shared vertices**: the set of raw `[lon,lat]` vertices of
   `children: true` catchments and of `children: false` catchments in
   `public/data/catchments.json` is disjoint (verify with a short one-shot
   node comparison; report in `.agents/qa.md`).
2. Adults mode renders only `children === false` hospices/catchments;
   children's mode only `children === true` (App.tsx filters — QA spot-check
   per nation).
3. HospiceDetail route: detail pages reached from list/search in each mode
   are consistent with the active mode (QA: toggle in both modes, open a
   detail from each).
4. Data completeness: St Andrew's (Grimsby) rows present in both sets;
   `sc-oscar-019724` absent from `hospices-all.json`; ni-r3 `town` non-blank
   (gate-1 value) in `public/data/hospices.json`.
5. Byte-identical rebuild ritual green.

**Files Coding touches.** `src/App.tsx` (route-level detail view mode
filter), `src/components/StartHere.tsx` (nav callsites carry the flag),
`data-raw/hospices-all.json` (edge-case rows as resolved at the gates).

**NOT in scope.** Re-keying children rows; a new designation source; toggle
UI/visual redesign; map-layer changes.

---

## Data artifacts

**`data-raw/roi-border.json` — schema (frozen):**

| field | type | contract |
|---|---|---|
| `relationId` | string | `"156393"` |
| `relationName` | string | OSM name (e.g. `Northern Ireland / Tuaisceart Éireann`) |
| `adminLevel` | int | `4` |
| `source` | string | fetch endpoint path used |
| `licence` | string | `ODbL v1.0, © OpenStreetMap contributors` (exact string) |
| `fetchDate` | string | ISO date of the fetch |
| `fetchedAt` | string | ISO timestamp |
| `memberWays` | int | 929 (way members of the relation) |
| `fetchedWays` | int | ways successfully fetched (929 on the in-flight run) |
| `vanishedWays` | int | ids 404ed during fetch (0 expected; non-zero → note in README) |
| `ringNodes` | int | outer-ring node count (665 in-flight) |
| `areaDeg2` | float | ring area in deg² (≈ 5.54) |
| `bbox` | `[minLon, minLat, maxLon, maxLat]` | ring bounds |
| `ring` | `[[lon,lat],...]` | **closed** outer ring (first = last) |

**Provenance row — `data/README.md`** (table `| File | Source | Fetched | Notes |`):

`| data-raw/roi-border.json | OSM relation 156393 — admin_level 4 Northern Ireland boundary (OSM way API) | <fetchDate> | ODbL v1.0, © OpenStreetMap contributors · 929 way members, single closed outer ring (areaDeg2 ≈ 5.54) · clips NI catchments only (ADR-0034) · SHA-256 <hash> |`

plus one line in `data/README.md` §Licences & Attribution adding
`roi-border.json` to the ODbL list. `<hash>` = `Get-FileHash` on the committed
file.

## Human gates

| # | Gate | Owner | Unblocks |
|---|---|---|---|
| 1 | **ni-r3 town** — the display name for the ni-r3 row (blank `town` in the register) | James | C6-4 acceptance 4 |
| 2 | **James's failed postcode** — the exact raw string as he typed it; the C6-3 end-to-end vector | James | C6-3 acceptance 1 |
| 3 | **Ship/push** — final: validator exit 0 (invariants 1–6), byte-identical ritual green, all four issues landed, ADRs + glossary present; James approves publish + push | James | publication |

(Fetch matrix already complete per the ledger; no raws in transit.)

## Finalised GLOSSARY terms (Cycle 6)

- **admin ring**: the OSM admin-boundary polygon of a nation. The NI ring is
  OSM relation `156393` (single closed outer ring, committed as
  `data-raw/roi-border.json`); NI catchments are clipped to it after the land
  clip (ADR-0034).
- **spill**: the area of a catchment cell that falls outside the forbidden
  region. Invariant 5 bounds NI spill at `< 1e-9 deg²` per cell (total
  `roiSpill` gates the validator exit).
- **sliver**: a non-empty cell below 0.0002 deg² — a validator warning class,
  distinct from degenerate cells (`polygons: []`).
- **JITTER nudge**: the deterministic 1e-5 deg spiral offset of co-located
  seed points (8-direction spiral, toFixed(6) co-location buckets, applied
  before the Voronoi pass) that keeps the Delaunay triangulation
  non-degenerate — the C6-2 lever (ADR-0034).
