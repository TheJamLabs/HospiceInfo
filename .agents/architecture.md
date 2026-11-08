# Architecture — Cycle 5 (2026-11-07)

## 0. Scope, reads, writable set, standing invariants

**Scope.** Cycle 5 (`.agents/feature.md`; research verified on disk 2026-11-07 — `.agents/research.md` L1–360): two data-source rewires and one new source; no UI or feature changes, so `src/` is untouched this cycle and the 10-stage pipeline runs unmodified.
1. **Wales rewire (0 → ~14 incl. Hope House SY10).** Raw of record moves from `data-raw/wales-hospices-2026-10.csv` (CIW request B1, never arrived; file absent, G3 zero-set) to `data-raw/hospicehealth-wales-members-2026-11.csv` (Hospice Health Wales members list, H5-1 human fetch), with `.html` fallback if the list turns out to be page-only (research.md L71/77–85). R-1 fix in `scripts/extract-hospices-wales.mjs` (§1).
2. **Scotland (3 → ~40, OSCAR primary).** New raw `data-raw/oscar-scotland-hospices-2026-11.csv` (H5-2 human fetch); new APPEND-mode extractor `scripts/extract-hospices-sc-oscar.mjs`; GIS extractor untouched — overlapping provenance is intended. ADR-0031.
3. **NI stays at 6** by the two-leg completeness proof (research.md §5.4; ADR-0031 sets it). No change.
4. **Identity stability (load-bearing).** Exactly 20 curated rows, all England `en-<cqcId>`; the 3 in-repo `sc-CS<CSNumber>` rows survive byte-for-byte; append mode + the merge unique-id assertion make breakage structurally impossible (§3).

**Reads (verified on disk this pass, 2026-11-07).** `.agents/feature.md`; `.agents/research.md` L1–360 (H5-1/H5-2 fetch failures L23/24; Wales raw change L71/77–85; H5-1 procedure L97; OSCAR table/column mapping §5.3 L186–252; §5.6 glossary candidates L302–306; risks R-1..R-4 + findings F-1/F-2 L307+; OQ-1..OQ-6 L340–360); `GLOSSARY.md` (120 lines, no BOM); ADR-0002/-0003/-0004/-0005/-0006/-0009/-0010/-0012/-0015/-0020/-0029/-0030 (titles verified against `docs/adr/`); `docs/adr/0031-…md` (written this pass). Grounding scripts, with the exact lines this design cites: `scripts/extract-hospices-wales.mjs` (76 lines — G3 absent block, `||`-chain R-1 at L56–62, exact `'postcode'` match L63, `wales-r` id mapping L70–75); `scripts/extract-hospices-sc.mjs` (GIS raw; REPLACE mode; `sc-<CSNumber>` ids; name filter — untouched this cycle); `scripts/extract-hospices-ni.mjs` (RQIA; `ni-r<n>` ids; classification columns `Service Type`/`Categories of Care`/`Conditions`); `scripts/merge-hospices.mjs` (L42 `townOf`, L53 sc map `town: h.town || townOf(h)`, L69 curated CQC regex `location\/(1-\d+)`, L83–84 `curatedCount !== 20` assertion, L88–90 unique-id assertion); `scripts/build-data.mjs` (L33–35 `SLUG_TO_ID`, L117 `hospicesOut` — maps merge output which carries no `address` field, L225 `catchmentsOut = placed.map(...)` — every placed hospice of any nation, L260–266 shop resolution, L282 `process.exit(1)`, L293 writes); `scripts/geocode-postcodes.mjs` (L26–35 `FILES` = all four `gp-practices-*.json` + all four `hospices-*.json`; resumable via `postcode-geo.csv`; final missing-guard `process.exit(1)`); `scripts/catchment-map.mjs` (`CATCHMENTS` = exactly 20 England entries, each with `cqcUrl`); `scripts/prerender.mjs` (L262–264 sitemap self-assert); `data/README.md` (L24 current `hospices-sc.json` provenance row; columns `| File | Source | Fetched | Notes |`).

**Writable (exactly three; nothing else).**
- `.agents/architecture.md` — this section prepended above `# Architecture — Cycle 4 (2026-10-30)`; the existing 657 lines stay byte-identical (git diff verified: insertions only).
- `GLOSSARY.md` — append `## Cycle 5 terms` (finalises the research.md §5.6 candidates, L302–306); all existing entries untouched (git diff: insertions only).
- `docs/adr/0031-oscar-primary-scotland-source-and-id-scheme.md` — single new ADR (30 exist, 0001–0030).
No `src/`, no `scripts/`, no `data-raw/`, no other docs.

**Standing invariants (violations are design bugs):**
- **ADR-0002** (`{nation}-{registerId}` ids): Cycle 5 adds one register family, `sc-oscar-<SC>`, and reuses `wales-r<n>` (ADR-0031). New ids are slugs compatible with ADR-0019's URL scheme.
- **ADR-0003** (first-run column discovery): the rewired Wales extractor and the new OSCAR extractor both log the header + first data row before trusting columns; the absent-file paths log the human-fetch procedure.
- **ADR-0004** (hash-derived colour, FNV-1a on id): `sc-oscar-*` / `wales-r*` ids colour themselves deterministically; the 3 existing sc rows keep today's colours — no colour code changes.
- **ADR-0005** (20 curated): `scripts/catchment-map.mjs` stays the read-only seed of the 20 curated entries; merge L69 matches them by CQC-ID only (England regex `1-\d+`).
- **ADR-0006** (land-mask Voronoi tessellation) + `scripts/validate-tessellation.mjs` exit 0: tessellation derives from the placed-hospice `lat/lon` set, so it absorbs grown input by construction — untouched code.
- **ADR-0012 / ADR-0020 / ADR-0025 / ADR-0026** (hide-not-delete): unplaced rows (`lat/lon: null`) render nowhere (map, search, list, counts) and are never deleted.
- **ADR-0015 / ADR-0030** (deterministic static pipeline): `npm run build-data` fail-fast + byte-identical re-run; `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`) green ×2, byte-identical; no API keys, no network at publish time.
- **ADR-0009** (provenance discipline): every new raw row carries its source string; H5-1/H5-2 lands pinned in `data/README.md` with SHA-256 (`Get-FileHash`).
- **No new runtime dependencies:** ADR-0010 ("no new dependencies") + ADR-0030 (zero-backend/static) — no npm change this cycle. (The dispatch shorthand "ADR-0004 = no new deps" does not match the on-disk titles: 0004 is hash-derived colour; 0005 is the 20-curated outcode retirement — this section cites the on-disk titles.)

## 1. Wales rewire (R-1; id scheme in ADR-0031)

**Raw of record.** `data-raw/hospicehealth-wales-members-2026-11.csv` (H5-1); if the members list arrives as a web page instead (research.md L71/77–85), the fallback raw is `data-raw/hospicehealth-wales-members-2026-11.html`, parsed text-only (cell-like rows; no scripts), chosen ONLY when the CSV is absent, and the first-run log must state which mode ran (ADR-0003). The prior raw `data-raw/wales-hospices-2026-10.csv` is superseded, not fetched.

**R-1 fix (verified: `scripts/extract-hospices-wales.mjs` L56–62).** The current name-column chain:

```js
const iName =
  header.findIndex((h) => h.toLowerCase() === 'service name')
  || header.findIndex((h) => h.toLowerCase() === 'name')
  || header.findIndex((h) => h.toLowerCase().includes('name'));
```

is broken in two ways, not one: (a) index `0` is falsy — when the first candidate *is* the name column the chain falls through to the broader candidates and mis-binds; (b) index `-1` is truthy — when `'service name'` is absent the chain short-circuits to `-1` and the broader candidates are never tried. The dispatch/research warns only of (a); the on-disk chain also exhibits (b). **Spec (both directions, exact pattern):** iterate the candidates `['service name' exact, 'name' exact, contains 'name']` in priority order, compute each index, take the first `idx !== -1`; if none, `console.error` the full header and `process.exit(1)` (the existing guard, retained). This is the one place this design is deliberately stronger than research.md's "e.g. explicit -1 sentinel" (see §6).

**Postcode column (L63).** Current: exact `'postcode'` match. Change to **contains `post`, case-insensitive**, matching the name-column detection style. The HHW header wording is unverifiable from this machine (restricted DNS), so detection must be tolerant; `post` covers "Postcode", "Post Code", and suffixed variants. Absent → `postcode: ''` (retained behaviour): the row is kept on its name anchor and set unplaced → hidden per ADR-0012, and reported (first-run log lists how many rows have a postcode) — never silently dropped.

**No name filter (load-bearing).** The existing `.filter((e) => e.name)` (drop blank names, L70–75) stays; the substring "hospice" filter is **not** applied: Welsh hospice names such as Tŷ Hafan and Y Rhoel do not contain the word, so the filter would delete real rows. The HHW members list is hospice-scoped by construction — the name filter applies only to broad registers (NI RQIA, GIS) where the source is not already hospice-only (ADR-0031 sets the rule: apply the filter only where the source is not already hospice-scoped).

**G3 zero-set tolerance (unchanged, ADR-0020).** Absent raw → write `[]` to `data-raw/hospices-wales.json` and exit 0; the log names the H5-1 procedure. `Wales: 0` is a placeholder, not an error, until H5-1 lands.

**Ids (ADR-0031): `wales-r<n>`** — 1-based position among kept rows (the existing L70–75 pattern). Row anchors UNVERIFIED → ADR-0002 row-index fallback by design; the pragma "do not reorder/insert rows into the raw between builds" is recorded in the `data/README.md` provenance row at fetch time.

**Byte-exact UTF-8 Welsh orthography.** The extractor reads the raw as UTF-8 with no BOM stripping and writes `hospices-wales.json` as UTF-8, no BOM (the existing `fs` `'utf8'` reads/writes already do this — the design requirement is that the Coding pass **not** introduce any transcoding layer); Tŷ Hafan / Y Rhoel must survive to `hospices-all.json` byte-intact so names in `public/data/hospices.json` match the raw.

## 2. Scotland: append-mode OSCAR source (ADR-0031)

**New extractor `scripts/extract-hospices-sc-oscar.mjs`** (new file; the GIS extractor `scripts/extract-hospices-sc.mjs` is untouched — its 3 rows and provenance are preserved, overlapping provenance intended).
- **APPEND mode (load-bearing).** Reads `data-raw/oscar-scotland-hospices-2026-11.csv` (H5-2) and reads the existing `data-raw/hospices-sc.json`; the new file = existing rows **verbatim** + appended OSCAR rows. The extractor writes no GIS row it did not read; it does not re-derive, re-order, or re-serialise the 3 existing rows (JSON-parsed and re-serialised deterministically — `JSON.stringify`, no formatters). If the raw is absent: G3 — leave `hospices-sc.json` byte-identical (re-write it in its exact current bytes), log the H5-2 procedure, exit 0.
- **Column mapping (research.md §5.3.3, by name, case-insensitive, tolerant `post`/`town` detection as in §1):** `name` ← the OSCAR organisation-name column (name candidates `['organisation', 'name']` via the R-1 sentinel pattern); `charity name`/`name-contains` contexts per the research mapping; `id` ← `sc-oscar-<SC>` when the row carries a valid SC number (6-digit), else `sc-oscar-r<n>` 1-based position within the OSCAR body (OQ-2, ADR-0031); `town` ← first header containing `town`, **optional** (blank allowed); `postcode` ← first header containing `post` (kept-but-reported-when-blank: rows without a usable postcode stay in the set, list empty through the first-run log, become unplaced → hidden, ADR-0012); `address[]` ← the OSCAR address lines, emitted per row (OQ-3, ADR-0031 — drives `townOf` town fallback in the merge, L42/L53).
- **No "hospice" name filter** (ADR-0031): the H5-2 raw is the reconciled, hospice-scoped extract (OSCAR selection done at fetch time); filtering here would drop real rows for the same Welsh-style name reason as Wales.
- **G3 tolerance (unchanged)** as above; `Scotland` count stays 3 until H5-2 lands, grows to ~40 after.

**Merge change (one-line, `scripts/merge-hospices.mjs`).** Provenance stamp: rows with id starting `sc-oscar-` carry `source: "OSCAR — Scottish Charity Register (data-raw/oscar-scotland-hospices-2026-11.csv)"`; all other sc rows keep the GIS `SOURCES.sc` string (ADR-0009). No other merge behaviour changes.

## 3. Identity rule (load-bearing, `scripts/merge-hospices.mjs`)

**Exactly 20 curated, all England, all `en-<cqcId>`.** The 20 curated identities are seeded from `scripts/catchment-map.mjs` `CATCHMENTS` — exactly 20 entries, all England, each with `cqcUrl: 'https://www.cqc.org.uk/location/1-<digits>'` — and the merge matches them by the regex at L69, which matches only `1-\d+` CQC ids; `sc-`/`sc-oscar-`/`ni-r`/`wales-r` ids can never satisfy it. So **"exactly 20 curated" is structurally England-only**: no Scottish identity can ever become curated, and the published 20 (build 2026-10-30, commit bbe4bde) is the complete curated set (ADR-0005: read-only seed).

**The 3 in-repo sc rows are NOT curated.** `sc-CS2014323454`, `sc-CS2022000173`, `sc-CS2023000094` are register rows with `curated: false`; their stability is guaranteed **by construction**: `hospices-sc.json` is append-only (the GIS extractor's replace-mode run is a one-shot historical artefact, not re-run in Cycle 5), and the new extractor only appends. Altering a row is not expressible in append mode; duplicating one is caught by the merge unique-id assertion (L88–90, exit 1) before it can reach the map; the L83–84 `curatedCount !== 20` assertion guards the curated boundary.

**Consequence for R-2 (see §4):** because curated set and England set coincide, and non-England ids can never enter the curated set nor the shop key space, the two-tier CATCHMENTS guard below closes the risk with no new code path beyond the existing assertions plus the build-data fail-fast.

## 4. Cross-cutting (R-2 .. R-4, human gates H5-1/H5-2)

**R-2 — CATCHMENTS scope guard (two-tier).** Shop rows key their `hospiceId` to catchment slugs. Tier 1 (structural): `CATCHMENTS` has exactly 20 England entries and the curated set is exactly those 20 (`merge-hospices.mjs` L83–84), so the key space is England-only. Tier 2 (fail-fast): `build-data.mjs` resolves every shop via `SLUG_TO_ID` (L33–35, built from `CATCHMENTS` — England-only by construction); an id keyed to a non-England sc/wales/ni row is unresolvable → `shopsUnresolved++` (L265–266) → `process.exit(1)` (L282). Any accidental non-England shop key therefore trips the build, never the map.

**R-3 — geocoding auto-coverage (no change).** `scripts/geocode-postcodes.mjs` `FILES` (L26–35) already lists all four `hospices-{en,sc,ni,wales}.json` plus all four `gp-practices-*.json`, so the ~54 new sc/wales postcodes (plus the ~40 sc-oscar rows' postcodes) are covered on the next resumable pass with zero script edits; the `postcode-geo.csv` cache + final missing-guard exit-1 are unchanged (ADR-0029 keyless Nominatim, 1 req/s). Rows the geocoder cannot place land as `lat/lon: null` → no catchment polygon, no practices, hidden everywhere (hide-not-delete, ADR-0012/0025/0026) — never deleted; the manual-pin escape hatch (ADR-0021) remains available if a strategic row stays unplaced.

**R-4 — counts (161 → ~215 expected; never hard-coded).** No build script may hard-code a hospice total. The governing invariant remains the prerender self-assert (`scripts/prerender.mjs` L262–264): sitemap `<loc>` count = `hospices.json` count + the 7 fixed pages, else fail. ~215 is an expectation for the human-gate reconciliation, not a gate (ADR-0031).

**Human gates H5-1 / H5-2: BUILD gates on the final data build (chain green before the raws land), DATA gates on publication.** Procedure: (1) the Cycle 5 chain — `npm run build-data` (fail-fast, byte-identical re-run), `node scripts/geocode-postcodes.mjs` (no-op pass while raws are absent), `node scripts/validate-tessellation.mjs` (exit 0), `npm run build` ×2 (byte-identical) — runs green **before** the raw files land (G3 zero-set keeps Wales at 0 and Scotland at 3 in the interim); (2) James fetches the two raws on a full-DNS machine (H5-1 = `data-raw/hospicehealth-wales-members-2026-11.csv` + `.html` fallback; H5-2 = `data-raw/oscar-scotland-hospices-2026-11.csv`, reconciled against the PPPC seed, plus the OSCAR licence/attribution wording — OQ-5); (3) the lead records each in `data/README.md` with source URL, fetch date, and SHA-256 via `Get-FileHash` (ADR-0009); (4) the extractors re-run, geocode pass picks up the new postcodes, and the full §4 verification chain of ADR-0030 runs again before publish. The gates are ordered, owned, and one-shot reported in chat; they do not block the Chain-green definition.

## 5. Invariants and verification (what Coding must show)

1. `npm run build-data` exits 0; re-run is byte-identical (ADR-0030/0015).
2. `node scripts/validate-tessellation.mjs` exits 0 (ADR-0006).
3. `npm run build` green ×2, `dist/` byte-identical across runs; prerender sitemap self-assert (L262–264) passes.
4. Identity: `hospices-all.json` shows exactly 20 `curated: true`, all `en-<cqcId>`; the 3 `sc-CS<CSNumber>` rows present with unchanged ids/fields; no id collisions (the merge L83–84/L88–90 assertions are the mechanism — they must not be weakened).
5. Wales rewire: raw absent → `hospices-wales.json` = `[]`; raw present (test fixture with a name column at index 0 and a "Post code" header, per R-1) → ids `wales-r1..` with `!== -1` sentinel behaviour proven, Welsh names byte-exact UTF-8.
6. Scotland append: pre-image rows byte-identical after a no-op run (raw absent); post-image = pre-image + `sc-oscar-*` rows with correct `source` stamp.
7. No `src/` diff; no new packages in `package.json` (ADR-0010/0030); `data/README.md` gains the two H5-1/H5-2 provenance rows at fetch time, nothing before.

## 6. Deviations from research.md (record)

One, deliberate, and local: research.md R-1 describes the `||`-chain defect as the falsy-0 fall-through and recommends "e.g. explicit -1 sentinel"; the on-disk chain (L56–62) is also broken by truthy `-1` short-circuit, so this architecture specifies the full explicit `!== -1` candidate loop (takes the first non-`-1` across all three candidates). Same spirit, strictly more coverage; no other line of research.md is re-derived or overridden.

The dispatch's ADR-number shorthand ("ADR-0004 no new runtime deps", "ADR-0005 curated seeds read-only") does not match the on-disk titles (0004 = hash-derived colour; 0005 = retire outcode assignment for the 20 curated); this section cites the on-disk titles — ADR-0010/0030 for no-new-deps, ADR-0005 for the 20-curated read-only seed — with no change to the invariants themselves.

# Architecture — Cycle 4 (2026-10-30)

## 0. Scope, reads, writable set, standing invariants

**Scope.** Cycle 4 (`.agents/feature.md`, agreed with owner James 2026-10-30): 7 items + AC1–AC7.
1. First load: shops **and** GP layers **off** (new `showGps` flag in `src/App.tsx`).
2. Layer precedence: shops take precedence over GPs — layer-control order, search ranking, marker styling (GPs smaller + muted; GP data retained).
3. Footer overlap root-caused and fixed; "back to map" affordance on every info page.
4. Theme: 3-state Auto/Light/Dark — header control, `data-bs-theme` on `<html>`, localStorage persistence, no-flash boot, dark Leaflet treatment.
5. Remove every UI trace of "published service area" (panel switch, selection-card badges, list "approx" badges, MapView tooltip line); provenance KEPT (Methodology modal, About/Legal prose); data layer + `kind` field untouched (AC5).
6. (Folded into 2/4/7: precedence UX, theme UX, tokenised surfaces.)
7. Rebrand handoff to the Designer (Stage 2B): CSS custom-property token plan. The visual identity itself is **not decided here** — gate H4-1 (James picks 1 of 2–3 concepts) starts the rebrand work item; items 1–6 proceed now.

**Reads (verified on disk this pass).** `feature.md`; `research.md` Cycle-4 block (lines 1–196; 197+ is Cycle 3, ignored); `GLOSSARY.md`; ADR-0015/0022/0023; grounding: `src/App.tsx`, `src/components/{AppShell,HospicePanel,MapView}.tsx`, `src/lib/{types,siteConfig}.ts`, `src/styles.css`, `src/main.tsx`, `index.html`, `scripts/prerender.mjs`.

**Writable (exactly these; nothing else).**
- `.agents/architecture.md` — this section prepended above the existing `# Architecture — Cycle 3 (2026-10-29)`; Cycle 3 preserved byte-for-byte (surgical insert before the first line from on-disk content — not a whole-file rewrite from memory).
- `GLOSSARY.md` — append `## Cycle 4 terms` (all existing entries untouched).
- `docs/adr/0024-…md` … `0028-…md` — new ADRs (23 exist, 0001–0023).
- No `src/`, no `scripts/`, no other docs. No new npm deps (ADR-0008).

**Standing invariants (carried from Cycles 2–3; violations are design bugs):**
- ADR-0008: no new npm dependencies. Anything a chosen concept adds (fonts, raster assets) is self-hosted under `src/`/`public/`; no CDNs.
- ADR-0003/0015: `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`) is deterministic and byte-identical; `dist/` stays 171 files; no environment-derived bytes. The new theme boot snippet is **static text** (no dates, ids, or interpolation) → AC7 holds (see §4.4).
- ADR-0012: hide-not-delete — unplaced/unassigned shops and practices are never rendered (map, search, legend, counts).
- ADR-0011: catchment derivation, tessellation, and Start-here geometry untouched by Cycle 4 (AC2 — `validate-tessellation.mjs` exit 0 structurally preserved).
- ADR-0002/0009: data schema and provenance untouched (AC5 — `kind` field stays in `types.ts` and the JSON).
- Hash router (ADR-0007) and hash-redirect guard (ADR-0016) untouched; all new navigation uses plain `#` links.

## 1. Item 1 — first-load layer state: both OFF (ADR-0025)

**State model.**
- `src/App.tsx`: `const [showShops, setShowShops] = useState(false);` — flipped from the current `useState(true)`.
- New: `const [showGps, setShowGps] = useState(false);` — name follows the feature text. **In-memory only, not persisted**: layer choice is a per-session map-clutter setting; the theme is the only preference persisted (single localStorage key, §4).
- `MapView.tsx`: one new prop `showGps: boolean`. The placement-only `visiblePractices` gate (L251–254: null lat/lon filter) is extended exactly the way `visibleShops` works (L265): when `showGps` is false, the rendered GP list is empty. Result: no GP bucket divIcons, no GP CircleMarkers, no GP popups.
- **Catchment polygons are NOT layer-gated** (`MapView.tsx` L~325–355 renders from `catchments` independently of layer state). OQ1 settled: the item text is about *markers*; gating the tessellation by a GP toggle would hide the product's core content on first load. Tessellation stays visible with both layers off.
- Hide-not-delete (ADR-0012) unchanged: all data is still fetched; the switches gate rendering only.

**Header controls** (App.tsx `headerExtras`, L92–108): two switches + the existing Source & Method button, in the item-2 order (§2.1): switch "Charity shops" → switch "GP practices" → button. Both are `form-check form-switch` structured like the existing one; the GP switch uses a new `id="gpsToggle"`, the shop switch keeps its existing id/label.

**Acceptance (AC1):** fresh load (empty `localStorage`): no shop markers, no GP markers/buckets, both switches read off, catchment polygons visible; toggling each switch draws its layer; a refresh resets to both-off (by design — in-memory only).

## 2. Items 2 & 6 — layer precedence: control order, search, markers (ADR-0026)

### 2.1 Control order (fixed, all surfaces)
**Charity shops → GP practices → Source & Method.** The class-order shops-before-GPs is the single source of truth: wherever both classes coexist (header, search sections, marker size/colour hierarchy), shops come first. The ordering is realised in the header switch order (W1), the panel search tiers (W2) and the marker hierarchy; the persistent map legend was retired in Cycle 2 — the reordering creates no new legend (Review F1, 2026-10-30).

### 2.2 Search — OQ2 settled (scope + exact ranking rule)
Today the HospicePanel search is hospice-only (`hospices.filter` by name/town, 200 ms debounce, L67–71). "Shops take precedence over GPs in search ranking" is only meaningful if both types can appear in results → **decision: when the query is non-empty, the search also matches shops and GP practices.** Exact rule:
- **Empty query:** list = hospices exactly as today (zero UI change on the default view).
- **Non-empty query:** list renders **three labelled sections in this exact order: Shops → Hospices → GP practices** (research §2 option (a); honours the locked shops-over-GPs rule; hospices stay middle because "find me a hospice" is the primary intent and the lock only orders shops vs GPs).
- **Matching:** case-insensitive substring of the trimmed, lowercased query against — shops: `name` or `postcode`; GP practices: `name` or `postcode`; hospices: `name` or `town` (unchanged). No fuzzy scoring, no tokenisation.
- **Exact total order** (this is the scoring — total order, not numeric scores): (1) section order, fixed; (2) name A→Z via `localeCompare`; (3) id/postcode tiebreak. Deterministic.
- **Nation filter applies to all sections:** shops via their owning hospice (`shop.hospiceId → hospice.nation`), GPs via their own `nation` field, hospices as today.
- **Hide-not-delete:** unassigned GPs (`hospiceId === null`) never surface in search (same treatment as the map).
- **Row actions:** hospice rows select as today; a shop row selects its owning hospice; a GP row selects its assigned hospice — all through the existing `onSelect` path (pan + highlight). No new selection-state type.
- **Rows:** thin section headers with per-section counts (e.g. `Shops (3)`); shop/GP rows show name + postcode; hospice rows keep the colour dot + practice-count badge; no published/approx badges anywhere (item 5). The header "N of M hospices / K practices" count line stays hospice-scoped; section labels carry the other counts. The 200 ms debounce, the draft-sync `useEffect`s, and the sort select are unchanged (the sort select orders the hospice section; nation buttons filter all sections).

### 2.3 Marker hierarchy — OQ6 settled (exact numbers)
Precedence is encoded in size + saturation: hospice diamonds are the sharpest marks; shops second; GPs smaller and muted.
- **Hospice markers: unchanged** (16px divIcon, 12px `.hospice-marker` diamond).
- **Shop markers: unchanged** (10px).
- **GP bucket divIcons:** 28px → **20px**; fill `#1d4ed8` → `var(--hf-gp-fill)`; count text stays white on the slate fill.
- **GP CircleMarkers:** radius 5 → **4** (selected 7 → **6**); white 1px outline unchanged; base `fillOpacity` 0.85 → **0.55** (the "muted" part); dim fill (0.12) and dimmed-nation (0.15) states unchanged; fill colour stays the owning hospice's colour (semantic continuity with its catchment at lower intensity).
- LOD constants (GRID 0.5°, ZOOM_LOD 11) unchanged; bucket/circle interaction (popups, legend highlight, selection ring) unchanged in behaviour.
- **AC2 preserved:** Start-here and `validate-tessellation.mjs` operate on data/geometry, independent of render state → exit 0 is structurally guaranteed; QA still runs it (protocol §11).

## 3. Item 3 — footer fix + back-to-home

### 3.1 Footer (root cause confirmed, research §3)
The AppShell footer is Bootstrap utilities only (`app-footer d-flex flex-wrap align-items-center justify-content-between gap-2 container-fluid px-3`); **no `.app-footer` rule exists anywhere in `src/styles.css`** (verified: zero hits). The ~140-char `SITE_FOOTER_TEXT` (`src/lib/siteConfig.ts`) plus the six-link footer `<nav>` overflow one line at ≥1024px widths; `justify-content-between` spreads the pair and the single-line flex resolution fights the long text → overlap/crowding.

**Fix — new rules in `src/styles.css`; footer markup is unchanged (the child selectors `<small>` and `<nav>` already exist on disk):**
```css
.app-footer small { flex: 1 1 auto; min-width: 0; }
.app-footer nav { flex: 0 0 auto; }
@media (max-width: 1100px) {
  .app-footer small { flex-basis: 100%; }
}
```
At ≥1024px the text flexes and the nav stays beside/above it with no overlap; below 1100px the text takes a full row and the nav wraps beneath (mobile behaviour preserved). The 1100px cutoff sits just below the typical ≥1024px desktop class so windows at desktop widths get the one-line fix; QA verifies at 1024/1280/1440 + 375.

### 3.2 Back-to-home — decision: inline "← Back to map" link (research §4 option (a))
On **every info page**, directly above its `<h1>`:
```tsx
<a className="back-to-map" href="#map">← Back to map</a>
```
Plus one CSS rule in `styles.css` (`display:inline-block; margin-bottom:.5rem; hover underline; Bootstrap link colour via token, §7`).

**Surface inventory (7 routes; 5 files — the "map" route needs none; the 6 info routes spread over 5 files because LegalPage.tsx hosts two routes):** `#about` → AboutPage.tsx, `#feedback` → FeedbackPage.tsx, `#corrections` → CorrectionsPage.tsx, `#privacy` + `#licences` → LegalPage.tsx (one link per exported page, two edits), `#accessibility` → AccessibilityPage.tsx.

**Why (a) over the alternatives:** (b) breadcrumb — would require `AppShell` to know the current route (it takes no route prop today; plumbing `useRoute` into the shell is a structural change for a weaker affordance); (c) logo-link only — the header logo already links `#map`, and the owner's ask is an explicit back affordance on content pages where the reading task is done. An inline `href="#map"` link is zero routing risk (plain hash link — ADR-0007 intact, ADR-0016 guard untouched), survives future shell refactors, and matches the feature text's example wording. Wording fixed: `← Back to map` (arrow glyph + text, never icon-only — a11y).

## 4. Item 4 — theme: Auto / Light / Dark (ADR-0024, ADR-0027)

### 4.1 State model
- Modes: `auto` | `light` | `dark`. **The user's explicit choice is the only persisted value**: `localStorage` key **`hfuk-theme`** (verified free — the app stores nothing today) holds `'light'` or `'dark'`; **absent = `auto`** (deleting the key is the natural reset, and `localStorage.clear()` returns to auto).
- Effective theme: `choice === 'dark' ? 'dark' : choice === 'light' ? 'light' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')`.
- Applied as **`document.documentElement.dataset.bsTheme = 'light' | 'dark'`** on `<html>` (Bootstrap 5.3.3 native theming). Today's baseline is zero theming: 0 hits in `src/` for `data-bs-theme` / `prefers-color-scheme` / `matchMedia` / `localStorage` (research §0).
- The `matchMedia('(prefers-color-scheme: dark)')` listener registers **only while mode is `auto`** and is removed when the user leaves auto → OS-level flips are live in auto, inert in light/dark.
- **The mode is NOT mirrored into React state in `App.tsx`.** The control lives in `AppShell` (all pages) and reads/writes the key directly through the module helper below. Rationale — the R1 safety decision: if the mode lived as React state in `App.tsx`, the prerendered info/hospice shells (empty `#root`) would execute theme `useEffect`s on mount and sporadically re-set `data-bs-theme` at mount time, racing the boot attribute. With no mode in React state, **nothing in the app writes `data-bs-theme` after boot — the boot snippet is the sole writer**, and prerendered shells can never fight it.
- **Header control:** 3-button `btn-group` in the AppShell header (group before the site-nav links; `aria-label="Colour theme"`; the active mode's button carries `active` + `aria-pressed="true"`), labels **Auto / Light / Dark**, `btn-outline-secondary btn-sm` at wide widths; full-width row below the title at ≤768px (the existing 768px media query already re-keys header controls).
- **New module `src/lib/theme.ts`** (the only place the key name and `data-bs-theme` are named in JS): `getStoredMode()`, `setStoredMode(m)`, `effectiveTheme(mode)`, `setBsTheme(theme)`, and attach/detach for the auto matchMedia subscription. The boot snippet cannot import ES modules — it is the static inline twin of this module's logic (below).

### 4.2 Boot behaviour
- **Before React mounts:** the inline head snippet (§4.3) runs during `<head>` parsing → sets `data-bs-theme` from key + OS preference → **no first-paint flash** (the classic flash comes from React setting the attribute after first paint; here the first paint already has the right value).
- **React mount:** no theme `useEffect` exists (§4.1) → zero DOM writes at mount.
- **User clicks a mode button:** `setStoredMode(m)` + `setBsTheme(effectiveTheme(m))` + re-register/detach the auto listener.
- Reduced motion: a single attribute flip, no animated colour transition — no a11y cost.
- `hfuk-theme` is the app's **only** localStorage key; the layer switches stay session-only (OQ4).

### 4.3 The boot snippet — text, two locations, identity rule
The snippet (final text, verbatim — Coding must not rephrase it):
```html
<script>
  (function () {
    var m = 'auto';
    try { var s = localStorage.getItem('hfuk-theme'); if (s === 'light' || s === 'dark') { m = s; } } catch (e) {}
    var d = m === 'dark' || (m === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-bs-theme', d ? 'dark' : 'light');
  })();
</script>
```
It goes in **exactly two places**:
1. `index.html`, after the charset/viewport meta lines and before the CSS `<link>`s / module script.
2. `scripts/prerender.mjs` `buildPage()` (L~171–204), as one `out.push(...)` entry in the fixed `<head>` push list, at the same position (after viewport, before the stylesheet links). `buildPage()` rebuilds **every** `<head>` from that fixed push list and carries no arbitrary inline head scripts, so this is the only clean insertion point.

**How the two stay identical (decision):** the snippet is **static text** — no `Date`, no ids, no interpolation — so the two copies are expected to be byte-equal by construction. All three plausible mechanisms were considered:
- **Shared constant pulled into both files:** `index.html` is a plain Vite entry with no build-time import mechanism, and the dev server would need the build script's string → rejected (couples dev to build).
- **Regression check (chosen as part of the mechanism):** a scriptable exact string comparison between the two snippets, run in the QA protocol (§9.4) every cycle → any drift fails the gate.
- **Documented duplication (chosen as the mechanism itself):** the snippet is deliberately duplicated as a frozen string in both files, with a comment in `prerender.mjs` (`// ADR-0024: static theme-boot snippet — byte-identical to index.html; QA checks equality`) and the identity check above.
**Decision: documented duplication + regression byte-equality check** — cheaper than build-time coupling, and the check turns drift into a hard QA failure (R8).

### 4.4 Why AC7 is unaffected
The snippet adds a **fixed byte sequence** to every generated `<head>` and to `index.html` identically; it introduces no runtime-derived bytes (no timestamp; `matchMedia`/`localStorage` only *choose* between two fixed attribute strings). The 171-file count, the 168-`<loc>` sitemap invariant, LF + one trailing newline, and the byte-identity property all survive. AC7 (`npm run build` twice → byte-identical `dist/`) holds **explicitly by construction**; QA verifies with the existing two-build diff (§9.2).

### 4.5 Dark theme for the map (ADR-0027)
- **Controls and popups:** new rules in `src/styles.css`, scoped `[data-bs-theme="dark"] .leaflet-control-zoom, …` — Leaflet's own classes (`.leaflet-control-zoom`, `.leaflet-control-attribution`, `.leaflet-popup-content-wrapper`, `.leaflet-popup-tip`, `.leaflet-container` background). These override specific properties only; **`leaflet/dist/leaflet.css` is never edited** (pinned npm dep, byte-identity discipline) and the app's `[data-bs-theme=…]`-scoped selectors win the cascade on those properties.
- **Tiles:** `https://tile.openstreetmap.org/{z}/{x}/{y}.png` stays in **both** themes — no dark tile provider is committed (no new dep, no new attribution surface, ODbL provenance text unchanged in both themes). A dark tile provider (e.g. CARTO dark, a runtime-only `TileLayer` `url` swap) is recorded as **risk-accepted debt**: if James wants dark tiles after launch, it is a one-line `TileLayer` change behind a follow-up decision — no architecture change.
- **App-owned map chrome** (divIcon colours, legend card, sheet-fab, popup lines) inherits the dark set automatically via the §6 tokens.
- **Legibility requirement (locked):** map colours and controls remain legible in both themes — QA pixel/contrast pass in light and dark (risk R6).

## 5. Item 5 — remove UI traces of "published service area"; provenance kept (AC5)

Final DELETE + KEEP lists (research §6, settled on disk this pass):

**DELETE (UI surface only — 3 files, no data changes):**
1. `src/App.tsx` L146–154 — the selection-card badge ternary `selected.kind === 'published' ? <badge "published service area"> : <badge "approximated">` is removed. **KEEP the `{selected.source}` line** (provenance = where the data came from, not the service-area status).
2. `src/components/HospicePanel.tsx` — `publishedOnly` state (L59), its clause in the filter (`(!publishedOnly || h.kind === 'published')`, L71), the `id="publishedToggle"` switch (label "Has published service area", L~127–133), and the per-row `approx` badge (L~157–160).
3. `src/components/MapView.tsx` L106 — the popup line `hospice.kind === 'published' ? 'Published service area' : 'Approximated catchment'`.

**KEEP (provenance — untouched):**
- `src/lib/types.ts` — `kind: 'published' | 'approx'` on `Hospice` (L11) and `Catchment` (L34) **field untouched** (AC5).
- `MethodologyModal.tsx` (L40, L94–96, L118–119) and `AboutPage.tsx` (L16/24/36) and `LegalPage.tsx` (L70–71) prose about approximated catchments.
- `AppShell.tsx` L36 header tagline "UK — catchments approximated from GP practice locations" (OQ3 settled: it is a data-scope statement, not a UI badge — keep).
- `StartHerePage.tsx` APPROXIMATION_LINE prose.
- All `data/` JSON, `data-raw/`, `prerender.json`, derive/validate scripts.

**AC5 guard:** `kind` stays in `types.ts` and the JSON; QA greps `src/` for `kind` and asserts the only remaining references are the `types.ts` declarations — no component reads it for UI after this change. This is a **surgical set**: each removal is one hunk; the adjacent `{source}` line and the three prose sites must survive (risk R10 below).

## 6. Item 7 — rebrand: design-tokens plan + Designer handoff (ADR-0028)

### 6.1 The token plan (what Coding implements now; what the Designer changes later)
**Mechanism: CSS custom properties** (`--hf-*`) declared at `:root` (light set, the current visual defaults) and overridden under `[data-bs-theme="dark"]` (dark set). `--hf-*` values are the single source of truth for all app colour, and Bootstrap's `--bs-*` custom properties are pointed at them so Bootstrap components rebrand for free. No CSS-in-JS, no BEM rewrite, no new build step; selectors everywhere keep their names.

**Token list (initial values = today's hard-coded hexes, scanned from `src/styles.css`, `src/components/MapView.tsx`, `public/`):**

| Token | Light (initial) | Used by |
|-------|-----------------|---------|
| `--hf-primary` | `#1d4ed8` | `.sheet-fab`, `.skip-link`, `.app-header` accent, divIcon hospice fill, `manifest.webmanifest` `theme_color` |
| `--hf-primary-ink` | `#ffffff` | text on `--hf-primary` |
| `--hf-surface` | `#ffffff` | `.app-header` background, page background |
| `--hf-surface-muted` | `#f8f9fa` (Bootstrap `bg-light`) | panel backgrounds |
| `--hf-border` | `#dee2e6` | header/footer borders, card borders |
| `--hf-text` | `#212529` | body text |
| `--hf-text-muted` | `#6c757d` | tagline, footer text, `.text-muted` |
| `--hf-gp-fill` | `#64748b` | GP bucket divIcon fill |
| `--hf-legend-bg` | `rgba(255,255,255,0.95)` | `.legend-card` |
| `--hf-row-active` | `#eef4fb` | `.panel-item-active` |

Dark set (initial guesses, refined when the Designer's concept lands): `--hf-surface: #121212`, `--hf-surface-muted: #1e1e1e`, `--hf-border: #2d2d2d`, `--hf-text: #e5e5e5`, `--hf-text-muted: #9e9e9e`, `--hf-gp-fill: #7d8ba0`, `--hf-legend-bg: rgba(18,18,18,0.92)`; `--hf-primary` stays `#1d4ed8`-ish until the concept decides.

**Wiring (concrete):**
- `styles.css`: replace the ~10 hard-coded hexes (`.app-header`, `.skip-link`, `.sheet-fab`, `.legend-card`, `.panel-item-active`, `.app-footer`) with `var(--hf-…)`; add the `:root` block + `[data-bs-theme="dark"]` block; add `:root { --bs-body-bg: var(--hf-surface); --bs-body-color: var(--hf-text); --bs-border-color: var(--hf-border); }` so Bootstrap components follow.
- `MapView.tsx` divIcons: replace the `#1d4ed8` / `#ffffff` / `#64748b` literals with `var(--hf-primary)` / `var(--hf-primary-ink)` / `var(--hf-gp-fill)` (divIcon `html` is inline-styled — CSS vars resolve at render, no extra stylesheet needed).
- `public/manifest.webmanifest`: `theme_color` is a **static** file value (not runtime-resolvable) — it takes the light-set `--hf-primary` value (`#1d4ed8`); note this in the ADR.
- `public/logo.svg` + `public/og-image.png`: generated from the ADR-0022 heart-on-disc mark; restyle-only (palette/typography), no geometry change — per ADR-0028, the mark *concept* is FIXED; the chosen concept re-colours it via the tokens.

### 6.2 What the Designer is handed (gate H4-1)
**FIXED (non-negotiable):** the ADR-0022 heart-on-disc mark *concept* (geometry); the information architecture (header nav order, footer, panel layout); no new npm deps; no data/tessellation changes; the 171-file prerender invariant; the `var(--hf-…)` token mechanism.
**OPEN (the Designer's concept decides):** palette (light + dark sets), typography, header/logo treatment, marker colour/saturation refinement, spacing.
**Deliverable:** 2–3 concepts, each with a palette (light + dark), typography spec, and a header + logo mock; rendered against the real IA. James picks one at gate H4-1; the chosen concept then lands **via the tokens only** — no re-architecture, no token-plan change; Coding swaps values in the two `:root` / `[data-bs-theme="dark"]` blocks and regenerates the two static assets.

### 6.3 Rebrand surface inventory (all files the chosen concept may touch)
`public/logo.svg`, `public/og-image.png`, `public/manifest.webmanifest` (static `theme_color`), `index.html` (favicon + title), `src/styles.css` (all hexes → tokens, `:root` + dark blocks), `src/components/MapView.tsx` (divIcon hexes → token vars), `GLOSSARY.md` (design-tokens entry). Nothing else; `src/main.tsx`, `prerender.mjs`, data files, and the hash-router code are untouched by the rebrand.

## 7. Open-question disposition (research OQ1–OQ8; all settled)

| OQ | Question | **Decision** | Rationale |
|----|----------|--------------|-----------|
| OQ1 | Are catchment polygons layer-gated by the GP toggle? | **No — polygons always render.** §1: the item text is about markers; gating the tessellation would hide core content on first load. | First-load map must show the product's value (catchments) with zero toggles on. |
| OQ2 | Search scope + exact ranking when query is non-empty? | **3 sections Shops → Hospices → GP practices;** case-insensitive substring; total order = section, then name `localeCompare`, then id/postcode. §2.2. | Locked "shops over GPs" order + keep hospice search primary; deterministic, no numeric scoring to tune. |
| OQ3 | Keep the header tagline "UK — catchments approximated from GP practice locations"? | **Keep.** §5 KEEP list. | It is a data-scope/provenance statement, not a UI badge; item 5 targets badges/toggles only. |
| OQ4 | Persist the layer switches? | **No — in-memory `useState` only.** Theme is the sole persisted key (`hfuk-theme`). | Per-session clutter setting; fewer persistence surfaces, fewer flash sources. |
| OQ5 | Where do the header theme control and GP switch live? | **AppShell (theme, all pages) + App.tsx `headerExtras` (GP switch, map page only).** §1, §4.1. | Theme is a site preference → shell; GP is a map-layer control → map page. |
| OQ6 | Exact GP marker size/colour numbers? | **Bucket 20px `var(--hf-gp-fill)` (#64748b slate); CircleMarker radius 4/6, base `fillOpacity` 0.55.** §2.3. | Smaller + muted = visible subordination; exact numbers remove Coding-side judgment. |
| OQ7 | Dark tile provider? | **No — OSM light tiles in both themes.** Dark provider recorded as risk-accepted debt (one-line `TileLayer` swap later). §4.5. | No new dep, no new attribution/CSP surface, provenance text unchanged. |
| OQ8 | Back-to-home affordance? | **Inline `← Back to map` link above `<h1>` on all 6 info routes (5 files).** §3.2. | Option (a): zero routing risk, explicit, matches feature wording. |

## 8. Risks (risk-accepted; none block the pipeline)

- **R6 — Dark Leaflet overrides may leave a legibility gap.** `[data-bs-theme="dark"]` CSS overrides for `.leaflet-control-*` / `.leaflet-popup-*` are a best-effort cascade win; some Leaflet-internal classes may still look light-on-dark. *Accepted:* QA runs a pixel/contrast pass in both themes; any residual gap is a fix-pass UI tweak, not an architecture change.
- **R2 — Footer mobile regression.** The new `.app-footer` rules change wrap behaviour around 1024–1100px. *Accepted:* QA verifies at 1024/1280/1440/375; the `@media (max-width:1100px)` fallback guarantees the text never overlaps the nav.
- **R10 — Surgical deletes adjacent to keep-prose.** Three KEEP sites sit next to DELETE sites (the `{source}` line, the three provenance prose blocks). *Accepted:* one concern per hunk (each DELETE is a standalone diff); QA re-reads the keep-sites after the change (AC5 grep guard).
- **R1 (theme race) — mitigated by design, carried as residual risk.** No mode in React state; boot snippet is sole writer (§4.1). Residual: `localStorage` disabled → `matchMedia` only, no crash (`try/catch` in snippet).
- **R3 — Prerender head-list ordering.** Inserting the snippet at the wrong position in `buildPage()`'s push list changes byte order. *Mitigated:* position is specified (after viewport, before stylesheet links) and the two-build byte-diff (AC7) catches any drift.
- **R5 — Token over-coverage.** A missed hard-coded hex defeats the dark theme. *Mitigated:* the token table is exhaustive for the scanned hex set; QA visually diffs light/dark screenshots.
- **R8 — Boot snippet duplication drift.** The two copies (`index.html`, `prerender.mjs`) could diverge. *Mitigated:* QA byte-equality check on the two snippets, re-run every cycle (§4.3).
- **R9 — divIcon token resolution.** `var(--hf-…)` is resolved from CSS at render time; if CSS vars are unavailable the marker falls back to `currentColor`. *Accepted:* markers are non-critical UI; a fallback is a stylistic miss, not a data failure.

## 9. Verification protocol (for Coding + QA)
1. `tsc -b` clean; `vite build` clean.
2. `npm run build` → 171 files; **byte-identity: run the build twice, diff `dist/` — zero diffs** (AC7).
3. `node scripts/validate-tessellation.mjs` → exit 0 (AC2).
4. Boot snippet byte-equality: extract the snippet text from `index.html` and `scripts/prerender.mjs`, exact string compare (R8).
5. Sitemap invariant `sitemapLocCount === 161 + 7` (168 `<loc>`) unchanged.
6. Screenshot/contrast pass: light + dark, 1024/1280/1440/375 (R2, R5, R6).
7. AC5 grep guard: `kind` in `src/` only in `types.ts`.

## 10. Glossary
`## Cycle 4 terms` appended to `GLOSSARY.md`: **theme-boot snippet**, **Auto/Light/Dark theme**, **design tokens**, **muted GP layer**, **first-load layer defaults**, **hfuk-theme**. (Never remove existing terms.)

## 11. Carried forward
- Boot snippet duplication (R8) → QA perpetual check.
- Dark tile provider → risk-accepted debt, one-line swap when James asks.
- `manifest.webmanifest` static `theme_color` → light-value only, documented.
- ADR-0022 mark restyle → gated on H4-1 concept pick.

---

# Architecture — Cycle 3 (2026-10-29)

**Scope:** Stage 2 (Architect), Cycle 3. **Reads:** `.agents/feature.md`, `.agents/research.md` (§2–§8, A1–A8 drafts, §7.3 vocabulary), `.agents/pipeline.md`, plus read-only on-disk verification (data counts, `package.json`, `scripts/build-data.mjs`, `scripts/extract-hospices-wales.mjs`, `src/main.tsx`, `src/App.tsx`, `src/lib/siteConfig.ts`, `data-raw/site-config.json`, `index.html`, `src/components/AppShell.tsx`, `public/manifest.webmanifest`, `public/logo.svg`, `data/README.md`, existing `docs/adr/` 0001–0014, `GLOSSARY.md`).
**Writable in this stage:** `.agents/architecture.md`, `docs/adr/`, `GLOSSARY.md` only. All `src/` and `scripts/` changes below are *specifications* for the Coding stage — nothing in this stage touches them.
**Standing invariants (carry over, re-stated where load-bearing):** byte-identical `public/data/*.json` rebuild (the Cycle 2 build-data SHA-256 anchor set `dc261185 e11322ba 2a87a374 5628d8f7` is re-baselined exactly once, after the §5 NI merge — see §9); ADR-0005 nearest-hospice rule (every *placed* practice → exactly one nearest hospice); ADR-0008 no new npm dependencies; ADR-0009 single-source (`data-raw/site-config.json` is the trusted source, `src/lib/siteConfig.ts` is the hand-maintained mirror consumed by the app; `scripts/prerender.mjs` reads the source file, not the mirror); ADR-0010 performance invariants P1–P7; ADR-0013 provenance row for every data landing; ADR-0014 Cloudflare Pages, git-connected, `npm ci && npm run build`, only `dist/` ships; hide-not-delete (R12) for all gap wording.

## Site and URL model

| Aspect | Value | Notes |
|--------|-------|-------|
| Display name (human-facing) | **"Hospice Finder UK"** | ADR-0023; 8 display surfaces, §2 |
| Live hostname | `https://hospiceinfo.pages.dev` | Derived from `wrangler.jsonc` slug `hospiceinfo`; **reachability unverified** (no browser check from this stage — human check, §10) |
| Canonical `SITE_URL` | `https://hospiceinfo.pages.dev` | New config value, §3.7 (ADR-0009 pattern) |
| Identifiers | repo `HospiceInfo`, Pages slug/name `hospiceinfo`, npm name `hospice-catchment-map`, ADR files, `docs/` | **unchanged** — zero rename blast radius (ADR-0023) |

## Target state

```
data-raw/*.{json,csv}   (site-config.json; new: manual-geo-ni.json; future: wales-hospices-2026-10.csv)
      │  scripts/extract-* / merge-hospices / geocode-postcodes      (unchanged)
      ▼
public/data/{hospices,practices,catchments}.json      ← npm run build-data (one merge-point change, §5)
      │  npm run build = tsc -b && vite build            (unchanged)
      ▼
dist/    (React 18 hash-routing SPA, behaviour unchanged)
      │  node scripts/prerender.mjs                       ← NEW build step, ADR-0015
      ▼
dist/ + 161× /hospice/<id>.html + 6 info .html + rewritten <head> on index.html
      + sitemap.xml + robots.txt + 404.html
      → Cloudflare Pages (git-connected, ADR-0014 — no config change)
```

## Decision table (7 spec decisions → 9 ADRs)

| # | Decision (outcome) | ADR |
|---|--------------------|-----|
| 1 | Prerender = new deterministic `scripts/prerender.mjs` appended to the npm build (`tsc -b && vite build && node scripts/prerender.mjs`); **shell page model** (per-page `<head>` + empty `#root` + boot script); no headless browser, no SSR, zero new deps | 0015 |
| 2 | Route shipping = hash router untouched + a ~10-line **hash-redirect guard** in `src/main.tsx` (`history.replace`, not push); committed `dist/404.html` shell for Pages 404s. Closes research finding R1 (Blocking) | 0016, 0017 |
| 3 | SEO set = `<link rel=canonical>` + title/description + Open Graph + Twitter card + JSON-LD `@graph` (root `Organization` + per-hospice `HealthCareBusiness`); no-endorsement guard; omit `geo` when unplaced; omit `lastmod` (byte-stable) | 0018 |
| 4 | Per-hospice URLs = `/hospice/<canonical-id>` — the id **is** the URL slug (no second mapping layer); fix the `wales-<n>` → `wales-r<n>` id drift in `scripts/extract-hospices-wales.mjs` (ADR-0002 conformance) | 0019 |
| 5 | Wales = reuse the G3-tolerant `scripts/extract-hospices-wales.mjs` path as-is; CIW reply lands as a human-saved CSV; AC3's disjunct (prepared landing script + documented pending state) is satisfied this cycle with Wales hospices = 0 | 0020 |
| 6 | NI = new `data-raw/manual-geo-ni.json` (operator coordinates for exactly 9 BT unit postcodes), merged into the geo map in `scripts/build-data.mjs`; the OS Places key (H3-2) is thereby **not required** — retained as the verified fallback | 0021 |
| 7 | Logo = **invert the heart to white on the blue disc**, delete the white r12 circle (4 → 3 elements), re-center the heart; SVG-only assets, no rasterisation (ADR-0008) | 0022 |
| — | Rename "Hospice Finder UK" across 8 display surfaces only (no identifiers) | 0023 |

## 2. Branding — rename to "Hospice Finder UK" (AC1, ADR-0023)

Exact string: `Hospice Finder UK` (title-case as shown; never lower-cased in prose — the name contains "UK").

**Display surfaces (8):**

| # | Surface | File(s) | Change |
|---|---------|---------|--------|
| 1 | Document `<title>` | `index.html` | → `Hospice Finder UK` title (exact value §3.3) |
| 2 | Header `<h1>` | `src/components/AppShell.tsx` | link text "Hospice Catchment Map" → "Hospice Finder UK" (href stays `#map`) |
| 3 | PWA manifest | `public/manifest.webmanifest` | `name` → `Hospice Finder UK`; `short_name` → `Hospice Finder` |
| 4 | Mark aria-label | `public/logo.svg` | `aria-label` → "Hospice Finder UK" (§6) |
| 5 | Prerendered page titles | `scripts/prerender.mjs` (new) | §3.3 table |
| 6 | Prerendered `og:title` / `twitter:title` | `scripts/prerender.mjs` (new) | §3.3 |
| 7 | `404.html` title | `dist/404.html` (emitted) | `Page not found — Hospice Finder UK` |
| 8 | Page h1s in `src/` | every page component that prints the site name | rename every user-visible occurrence |

**Deterministic rule (beats a surface list):** after the rename,
`grep -rni "hospice catchment map" index.html public/ src/` → **zero hits**. Coding applies the rename to every user-visible hit; hits inside `docs/adr/`, `data/README.md`, and `.agents/` *history* keep the old name (they are record, not branding).

**Not renamed (identifiers — ADR-0023 blast radius stays zero):** `wrangler.jsonc` `name: "hospiceinfo"` + `slugs.default` (changing the slug orphans the live URL), the Pages project, the repo name, `package.json` `name: "hospice-catchment-map"` (private, unpublished — renaming gains nothing), npm scripts, ADR filenames, `docs/` paths, project-memory references.

**G6/reduced-motion check:** branding change touches no layout CSS → no `flex-direction` risk; `npm run check:layout` must still pass.

**Acceptance (AC1):** the grep above is empty; `npm run build` exit 0; `npm run preview` shows the new name in the tab title, header, and the manifest (DevTools → Application → Manifest); no `Hospice Catchment Map` in any built `dist/*.html`.

## 3. Static prerendering — make the site crawlable (AC2, ADR-0015/0016/0017/0018)

### 3.1 New build step `scripts/prerender.mjs` (ADR-0015)

- **Wiring (the only `package.json` line change):** `"build": "tsc -b && vite build && node scripts/prerender.mjs"`. No new npm dependencies (ADR-0008) — the script uses only `node:fs`.
- **Inputs it reads (fixed list, nothing else):** `public/data/hospices.json`, `data-raw/site-config.json` (SOURCE, per ADR-0009 — the script never reads `src/lib/siteConfig.ts`), and the built `dist/index.html`.
- **What it extracts from the built `dist/index.html`:** verbatim strings of every `<link rel="stylesheet">`, every `<link rel="modulepreload">`, and the `<script type="module" src=...>` tag. These asset tags are re-emitted unchanged in every page (the JS bundle is the same for every route). The built `<title>`/`<meta name="description">` are **replaced** by per-page values (§3.3).
- **Page set (derived from data, never hard-coded):**
  | Emitted file | Count (current) |
  |--------------|-----------------|
  | `index.html` (map shell) | 1 |
  | `about.html`, `corrections.html`, `feedback.html`, `privacy.html`, `licences.html`, `accessibility.html` | 6 |
  | `hospice/<id>.html` — **one per id in `hospices.json`** (code-unit ascending) | 161 (152 en / 3 sc / 6 ni / 0 wales today) |
  | `sitemap.xml`, `robots.txt`, `404.html` | 3 |
  → 171 static files. **AC2 invariant, checked in code:** sitemap URL count must equal `hospices.json length + 7`; mismatch → exit non-zero. This makes "count matches hospices.json" machine-enforced, not eyeballed.
- **Shell page model (ADR-0015):** every emitted page = per-page `<head>` + `<div id="root"></div>` + the extracted boot script. Visible content is rendered client-side by React once the hash guard (§3.5) resolves the route. **Rationale:** (a) no duplication of legal/prose text — the React components stay the single source (ADR-0009) and 161+ static copies can never drift from the app; (b) emitted bytes stay small and byte-stable (§3.2); (c) crawlers rank on title/meta/JSON-LD/links, all present in the shell.
- **`.html` URLs (ADR-0015):** files ship with a `.html` extension and canonical/OG/sitemap URLs point at the **served** `.html` URLs (home: `/` only). Cloudflare Pages serves exact file paths — extensionless `/hospice/<id>` would 404 without a `_redirects` layer; a rewrite layer is a second moving part for marginal SEO gain.
- **Rejected alternatives:** Vite HTML-prerender plugins (early, headless-browser paths, non-deterministic internals); headless-chrome prerender at build (network + browser dependency, breaks byte-identity, A1); Cloudflare Functions / `next-on-pages` SSR (breaks ADR-0014 zero-backend + determinism, A6); full-content prerender (text drift risk, A5).
- **Idempotence:** before emitting, the script deletes the previously emitted per-page files (6 info files, `dist/hospice/`, `sitemap.xml`, `robots.txt`, `404.html`) so ids that leave `hospices.json` cannot leave stale pages behind.
- **Fail-fast invariants (exit non-zero):** `hospices.json` unparseable; `SITE_URL` missing, empty, or not an `https://` URL; module script tag not found in the built `dist/index.html`; sitemap count mismatch. (Same fail-fast convention as `scripts/build-data.mjs`.)

### 3.2 Determinism rules (invariants the script must enforce in code)

1. Hospice pages and sitemap entries iterate `hospices.json` ids sorted **code-unit ascending** — never object key order, never input order.
2. Info pages use the fixed literal array `[about, corrections, feedback, privacy, licences, accessibility]` (alphabetical).
3. No timestamps, no `lastmod`, no build id, no `Date.now()`, no randomness, no environment-derived strings in emitted bytes. Emitted content is a pure function of (`hospices.json` + `site-config.json` + the Vite build output).
4. LF line endings only; every emitted file ends with exactly one trailing newline.
5. JSON-LD is one `JSON.stringify(object)` (0-space) inside a single `<script type="application/ld+json">`; object key order fixed by hand in the code (insertion order is deterministic).
6. The script reads its fixed input list only — no directory walking, nothing from `node_modules`.
7. **QA check:** `npm run build` twice on the same tree → `dist/` byte-identical (hash every file under `dist/` twice, compare; also compare the `public/data/*` SHA-256 set across `npm run build-data` ×2).

### 3.3 Per-page `<head>` (ADR-0018)

Template (every emitted page, incl. rewritten `index.html` and `404.html`):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{TITLE}</title>
  <meta name="description" content="{DESC}" />
  <link rel="canonical" href="{SITE_URL}{CANON}" />
  <link rel="icon" href="/logo.svg" type="image/svg+xml" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Hospice Finder UK" />
  <meta property="og:title" content="{TITLE}" />
  <meta property="og:description" content="{DESC}" />
  <meta property="og:url" content="{SITE_URL}{CANON}" />
  <meta property="og:image" content="{SITE_URL}/og-image.png" />
  <meta property="og:image:alt" content="Hospice Finder UK - heart map-pin mark" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="{TITLE}" />
  <meta name="twitter:description" content="{DESC}" />
  <script type="application/ld+json">{JSONLD}</script>
  {extracted modulepreload links}
  {extracted stylesheet links}
</head>
<body>
  <div id="root"></div>
  {extracted module script tag, verbatim}
</body>
</html>
```

- Hosptice pages (`/hospice/<id>.html`): `og:type` = `article`.
- **Escaping:** hospice names are HTML-escaped in `<title>`/`<meta>`/`og:*`/`twitter:*` (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`) — e.g. "Hull & East Yorks". Inside JSON-LD, `JSON.stringify` escapes (`&` stays `&`, which is valid JSON).
- `{CANON}` = the served URL path: `/` (index) or `/about.html`, `/hospice/<id>.html`, …

**Title / description (exacts):**

| Page | `<title>` | `meta description` |
|------|-----------|--------------------|
| `/` | `Hospice Finder UK` | `Find the hospice that covers your postcode. A live UK map of every hospice's catchment areas, approximated from GP practice locations.` |
| `about.html` | `About - Hospice Finder UK` | `How Hospice Finder UK builds catchment areas from open GP and hospice register data, and the known data gaps.` |
| `corrections.html` | `Corrections - Hospice Finder UK` | `Spot an error? How to send us corrections for catchment areas, names, and postcodes.` |
| `feedback.html` | `Feedback - Hospice Finder UK` | `Send feedback and suggestions to the Hospice Finder UK team.` |
| `privacy.html` | `Privacy - Hospice Finder UK` | `What data Hospice Finder UK uses and how - a static site that sends no tracking and stores nothing.` |
| `licences.html` | `Licences - Hospice Finder UK` | `Data licences and attribution for the sources behind Hospice Finder UK, including the CQC register and OpenStreetMap (ODbL).` |
| `accessibility.html` | `Accessibility - Hospice Finder UK` | `Accessibility statement for Hospice Finder UK: what is supported, and known limitations.` |
| `hospice/<id>.html` | `{name} - Hospice Finder UK` | `Catchment area for {name} - the GP practices approximated as falling inside it, and how the boundary is derived.` |
| `404.html` | `Page not found - Hospice Finder UK` | `This page does not exist. Find the hospice that covers your postcode on Hospice Finder UK.` |

### 3.4 JSON-LD (ADR-0018)

Every page: `@graph = [Organization]`. Hospice pages add a second node.

**Organization (all pages; values from `data-raw/site-config.json`):**
```json
{ "@type": "Organization", "@id": "{SITE_URL}/#operator",
  "name": "The Jam Labs Ltd",
  "url": "{SITE_URL}/",
  "email": "hello@thejamlabs.com",
  "description": "Independent, third-party mapping of hospice catchment areas in the UK, built from open data." }
```

**HealthCareBusiness (`/hospice/<id>.html` only):**
```json
{ "@type": "HealthCareBusiness",
  "name": "{hospice.name}",
  "url": "{SITE_URL}/hospice/{id}.html",
  "description": "{meta description, unescaped}",
  "address": { "@type": "PostalAddress", "postalCode": "{pc}" },
  "geo": { "@type": "GeoCoordinates", "latitude": {lat}, "longitude": {lon} } }
```
- `address` emitted **only** when `postcode` non-empty; `geo` emitted **only** when placed (lat/lon non-null). Unplaced hospices (the 12 NI pre-§5; any unplaced Wales hospices after landing) get neither — absence is honest, JSON-LD stays valid.

**No-endorsement guard (security, research §3.4 legal guard — the risk list ends at R13; this concern is unnumbered there):** this site is a third-party information service *about* these businesses. Emitted JSON-LD must **never** contain `sameAs` pointing at a hospice's own website (even though `hospices.json` has a `website` field), nor `affiliation`, `parentOrganization`, `contactPoint`, `openingHours`, pricing, or any field the hospice itself would claim. All template text stays in third-party voice ("approximated", "caughtment areas are estimated").

**Why no `lastmod`:** no faithful change date exists for derived data; emitting one would be a misrepresentation and would break byte-stability (§3.2).

### 3.5 Hash-redirect guard (ADR-0016) — closes R1 (Blocking)

`src/main.tsx`, before `createRoot(...)`:

```ts
// ADR-0016: ship real paths (AC2) on top of the hash router (ADR-0007).
// A direct load of /about* arrives with an empty hash; without this guard
// the app renders the map. The guard replaces the URL with the matching
// hash route (history.replace — no extra history entry).
(function () {
  if (window.location.hash) { return; }               // SPA navigation already handled
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (path === '') { return; }                         // home → map, as today
  const route =
    path === 'hospice' ? null :                        // placeholder shell → map (R12: no deep-linking)
    path.startsWith('hospice/') ? path.slice('hospice/'.length) :
    path;                                               // about /corrections /feedback /privacy /licences /accessibility
  if (route) { window.location.replace('#/' + route); }
})();
```

- **Replace, not push:** `location.replace` keeps the history stack clean (back from `/about` leaves the site, matching external-link expectation).
- **Info pages:** `/about.html` → hash resolves to `about` → `src/App.tsx` (unchanged) renders `AboutPage` etc. All six existing page components are untouched.
- **Hospice pages (R12, documented decision):** `/hospice/<id>.html` sets hash `#/hospice/<id>`; `src/App.tsx` matches no such route → renders the map (today's behaviour for unknown hashes). The page's SEO value is its `<head>` (title/JSON-LD/canonical), which crawlers read without JS; the shipped content additionally explains the concept, and "View on the map" links target `/`. **No deep-linking into the panel is promised or built** — avoids a new selection-state surface for zero user ask. If users later want "open on map at /hospice/<id>", that is a Cycle 4 item (needs a `#/hospice/<id>` route + pre-selected panel state — small, but out of scope here).
- **404 pages:** `404.html` (ADR-0017) arrives with empty hash → guard returns → map shells out. Correct behaviour for an unknown page.
- No router library (ADR-0007 intact); the guard is the *only* route-shipping mechanism; no query-string reading anywhere (ADR-0005/Q1 consistency).
- **Edges:** trailing-slash dupes (`/about/`) normalized by the regex; day-typical `index.html` served at `/` → `path === ''` → no-op.

### 3.6 `sitemap.xml` + `robots.txt` (emitted by the same script, §3.1)

- **Why from the same script:** the URL set can never drift from the pages on disk (AC2 "sitemap covers the same set").
- `sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{SITE_URL}/</loc></url>
  <url><loc>{SITE_URL}/about.html</loc></url>
  ... (six info paths, §3.2 order 2)
  <url><loc>{SITE_URL}/hospice/{id}.html</loc></url>   ×161, id-sorted
</urlset>
```
  No `<lastmod>` (§3.4). Escaping: none of the currentized ids contain characters needing XML escape; the emitter still escapes `&<>"'` in `<loc>` (defensive, in code).
- `robots.txt` (exact, LF, trailing newline):
```
User-agent: *
Allow: /

Sitemap: {SITE_URL}/sitemap.xml
```
- No `Disallow` (entire site is public; the map is the product, not a secret).

### 3.7 `SITE_URL` (ADR-0009 pattern, ADR-0018)

- **Source of truth:** `data-raw/site-config.json` gains one field (verbatim shape after the change):
```json
{ "operatorName": "The Jam Labs Ltd", "contactEmail": "hello@thejamlabs.com", "siteUrl": "https://hospiceinfo.pages.dev" }
```
- **Mirror:** `src/lib/siteConfig.ts` gains `siteUrl: string` on the `SiteConfig` interface (the app itself does not need it — prerender reads the source file — but the mirror stays the complete mirror, per ADR-0009; if the app later needs it, the cost is already paid).
- **Dev/local caveat:** the value is always the production hostname (sitemaps/canonicals must point at the canonical host). Local `npm run preview` builds will show `pages.dev` URLs — expected and documented; no environment switching (determinism, §3.2: an environment-dependent URL would make `dist/` differ per machine).

### 3.8 `404.html` + `og-image.png` (ADR-0017)

- **`404.html`:** emitted by `scripts/prerender.mjs` (same shell: §3.3 title `Page not found — Hospice Finder UK` + description; no JSON-LD `HealthCareBusiness`; Organization node present). Cloudflare Pages auto-serves `404.html` for all unmatched paths (ADR-0014; no config change needed). No custom 404 route in the SPA (unknown hashes already map to the map view).
- **`og-image.png`:** **one new operator-generated asset** — `public/og-image.png`, 1200×630 (Open Graph recommendation), `#1d4ed8` background + bold white "Hospice Finder UK" + the heart-pin mark. Coding produces a plausible placeholder (text + mark, no dependency — e.g. a hand-authored SVG rendered by any local browser print, or a simple committed PNG); **regeneration with the final brand mark is a human-verification item (§10)** — the `og:image` reference ships either way (H3-adjacent, not blocking: pages are valid without a *good* image, only its absence degrades social-preview pixel count… precisely: the reference points at a file that will exist in `public/`).
- No other raster assets; favicon remains `public/logo.svg`; manifest unchanged except §2 name.

## 4. Data gap 1 — Wales hospices (AC3 disjunct B, ADR-0020; H3-1)

**Current state (verified on disk):** `data-raw/wales-hospices-2026-10.csv` is **absent**; `scripts/extract-hospices-wales.mjs` implements G3 (absent file → `data-raw/hospices-wales.json = []`, logs the line, exit 0); `hospices.json` carries **0 Wales hospices**. The CIW email text is drafted in `data/README.md` ("Care Inspectorate Wales data request", 2026-10-16) — **send state unverified (H3-1, §10)**.

**This cycle ships the disjunct:** *prepared landing script + documented pending state.* Wales stays 0 and the build stays valid (G3). No fabricated placeholder rows (zero-set tolerance means `[]`, not dummy data).

**One-line fix (ADR-0019):** the script's current `id: \`wales-${i + 1}\`` drifts from the ADR-0002 scheme (`${nation}-r${n}` fallback) — change it to `id: \`wales-r${i + 1}\`` so the id is stable in the URL on landing, matching the shipped `ni-r1…ni-r6` convention (verified on disk).

**Landing procedure (when the CIW reply arrives — human step, then chain):**
1. Save the reply verbatim as `data-raw/wales-hospices-2026-10.csv` (exact filename per the script constant).
2. `data/README.md`: record the reply's as-of date + source (the email) in the raw-inputs table (ADR-0013 provenance row); note the columns observed on first-run log (ADR-0003: the script logs the header + first row before the filter is trusted).
3. Chain: `node scripts/extract-hospices-wales.mjs` → `node scripts/merge-hospices.mjs` → `node scripts/geocode-postcodes.mjs` (Wales postcodes via OSM — no key) → `npm run build-data` ×2 (byte-identity; **re-baseline the SHA-256 anchor**) → `node scripts/validate-tessellation.mjs` → `npm run build`.
4. Gate (Draft R12): `hospices.json` shows `wales > 0`; each placed Wales hospice gets a catchment cell; unplaced Wales hospices acceptable only from documented geocoding gaps (no polygon, no practices, same as today's NI unplaced treatment).

**AC3 status this cycle:** disjunct B met → pass. H3-1 is the only external dependency; its slowness blocks nothing (G3).

## 5. Data gap 2 — NI unplaced practices (AC3 disjunct A, ADR-0021; H3-2 retired)

**Current state (verified on disk):** 12 NI practices unplaced — all 9 BT unit postcodes known to be unresolvable by Nominatim/Overpass (unit, outcode, and town fallback, per project memory + `data/README.md`):

| practice id | postcode | | practice id | postcode |
|-------------|----------|-|-------------|----------|
| ni-103 | BT13 1AD | | ni-325 | BT42 3JU |
| ni-104 | BT13 3BW | | ni-328 | BT42 1GP |
| ni-304 | BT42 2PB | | ni-455 | BT63 6JS |
| ni-310 | BT42 1NW | | ni-654 | BT79 0NR |
| ni-317 | BT42 4JA | | ni-657 | BT79 0NR |
| (—) | (—) | | ni-662 | BT79 0NR |
| (—) | (—) | | ni-663 | BT79 0NR |

**Decision (ADR-0021): operator manual-pinning** — a committed file supplies WGS-84 coordinates for the 9 unit postcodes; the build merges them into the geo map. **This retires H3-2:** the OS Places API key is no longer required — manual reference points (OSM/OS grid) are sufficient, and the geocoder (Nominatim, key-free) keeps everything else. H3-2 remains the *fallback* if a manual coordinate proves wrong (A2).

**New file `data-raw/manual-geo-ni.json`** (exact schema; entries sorted code-unit ascending by postcode):
```json
{
  "asOf": "2026-10-29",
  "source": "Operator manual reference (OSM / OS grid) for the 9 BT unit postcodes that Nominatim cannot resolve (ADR-0021). ODbL attribution already covered by the site footer.",
  "entries": [
    { "postcode": "BT13 1AD", "lat": 54.535, "lon": -5.875 },
    { "postcode": "BT13 3BW", "lat": 54.540, "lon": -5.880 },
    { "postcode": "BT42 1GP", "lat": 54.631, "lon": -5.719 },
    { "postcode": "BT42 1NW", "lat": 54.625, "lon": -5.716 },
    { "postcode": "BT42 2PB", "lat": 54.628, "lon": -5.720 },
    { "postcode": "BT42 3JU", "lat": 54.635, "lon": -5.722 },
    { "postcode": "BT42 4JA", "lat": 54.630, "lon": -5.724 },
    { "postcode": "BT63 6JS", "lat": 54.732, "lon": -5.524 },
    { "postcode": "BT79 0NR", "lat": 54.730, "lon": -5.600 }
  ]
}
```
**The lat/lon values above are the operator's to fill with verified coordinates (H3-2 manual-review sub-step, §10).** Until then the file ships with `entries: []` (schema valid) and the build is green.

**Merge point (exact, in `scripts/build-data.mjs`):** after the `postcode-geo.csv` loop that builds the `geo` Map, before `geoOf`/nearest-hospice:
```js
// ADR-0021: operator manual geo for the 9 unresolvable BT unit postcodes.
// Committed file, provenance in data/README.md; manual entries win over geocoder.
const manualGeo = JSON.parse(fs.readFileSync('data-raw/manual-geo-ni.json', 'utf8'));
for (const e of manualGeo.entries) { geo.set(e.postcode, { lat: e.lat, lon: e.lon }); }
```
- **Why a Map merge and not a CSV append:** `postcode-geo.csv` is geocoder output with its own provenance columns; mixing manual rows into it would make provenance unsound for the other 10k+ rows. A separate committed file keeps "which coordinates are which provenance" machine-checkable (nearest-hospice assignment then treats the 12 practices like any other placed practice — **ADR-0005 invariant preserved**: manual coordinates are just input points).
- **Fail-fast:** if `manual-geo-ni.json` is present, it must parse, entries must be sorted, lat/lon in UK range (−12 < lon < 3, 49 < lat < 60); otherwise exit non-zero (same convention as the build-data assertions).

**Provenance (ADR-0013):** one row in `data/README.md` raw-inputs table — `manual-geo-ni.json`, source "operator manual reference, OSM grid", date `2023-10-29`… correction: `2026-10-29`, no URL (manual), notes: which 9 postcodes + why (Nominatim gap).

**AC3 fallback (if the operator coordinates are not ready before the build lock):** ship `entries: []`; the 12 practices remain unplaced; the existing neutral wording (hide-not-delete, R12) already covers them; `data/README.md` + About page document the gap (already done in Cycle 2); `validate-tessellation.mjs` exit 0 unaffected. Disjunct A then falls to its "12 NI practice … documented" branch — **still a pass.**

## Appendix A — exact unplaced dataset (source of truth)

12 practices, all `nation = ni` (verified from `public/data/practices.json` @ HEAD): ni-103, ni-104, ni-304, ni-310, ni-317, ni-325, ni-328, ni-455, ni-654, ni-657, ni-662, ni-663 — postcodes per the §5 table; 9 distinct unit postcodes. Any Coding/QA count check uses these ids, not a re-derived guess.

## 6. Logo refinement (AC4, ADR-0022)

**Current mark (verified, `public/logo.svg`, viewBox 0 0 64 64):** 4 elements — blue pin triangle `M24 30 L32 54 L40 30 Z`; blue disc (32,26) r18; white disc (32,26) r12; blue heart, lobe tops at y=21, tip (32,32); `aria-label="Hospice Info"`.

**Legibility problem (AC4):** at 16 px the white inner disc + blue heart create two nested boundaries and a thin blue heart on white — the smallest element loses. Fix = **invert the heart**: white heart on the blue disc, white disc deleted.

**New `public/logo.svg` (exact, 3 elements, no text, no gradients) — the
Coding stage replaces the full contents of `public/logo.svg` with this exact
file (replacing the current 4-element on-disk mark):**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Hospice Finder UK">
  <path d="M24 30 L32 54 L40 30 Z" fill="#1d4ed8"/>
  <circle cx="32" cy="26" r="18" fill="#1d4ed8"/>
  <path d="M32 31.5 C 29.5 28.5, 26.5 27, 26.5 24 C 26.5 22, 28 20.5, 30 20.5 C 31.2 20.5, 32 21.5, 32 22.5 C 32 21.5, 32.8 20.5, 34 20.5 C 36 20.5, 37.5 22, 37.5 24 C 37.5 27, 34.5 28.5, 32 31.5 Z" fill="#ffffff"/>
</svg>
```
Changes vs current: (1) white r12 circle removed; (2) heart fill `#ffffff`; (3) heart shifted −0.5 y (lopes 20.5–31.5, tip 31.5 — centred on the disc centre y=26, was 21–32 centred 26.5); (4) `aria-label` → "Hospice Finder UK" (AC1). Palette unchanged (`#1d4ed8` is the existing site accent in `src/styles.css`; white already present).

**Asset plan (SVG only, ADR-0008):** favicon stays `public/logo.svg` (`index.html` link unchanged); manifest icon unchanged (`sizes: "any"`); `AppShell.tsx` header `<img src="/logo.svg" width="28" height="28">` unchanged; `og-image.png` is a separate operator asset (§3.8), not a rasterisation of this file. No new dependencies, no new asset pipeline, no `public/` residue (no orphaned files — AC4: the only logo file is `logo.svg`).

**Why invert over alternatives:** keeping blue-heart-on-white (status quo) fails AC4 at 16 px; a larger heart inside the white disc still leaves 4 nested edges; a red heart adds a second brand colour (no, the accent stays). Inversion = maximum contrast (white on blue), 3 elements instead of 4, and the heart is the largest relative element in the head — the mark reads as "heart pin" at 16, 28, 32 px alike.

**Acceptance (AC4):** `npm run build` exit 0; `npm run preview` → tab favicon legible at 16 px (visual, QA), header mark correct at 28 px; `node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'))"` still parses; `grep -c "circle" public/logo.svg` → 1 (the r18 disc — the white r12 circle is gone); no other `logo*`/`favicon*` files in `public/`.

## 7. GLOSSARY — Cycle 3 additions (this stage finalises the file)

**Title (line 1):** `# GLOSSARY - Hospice Finder UK` (was `… - Hospice Catchment Map`) — definition, not production (brand rename, ADR-0023).

**New "Cycle 3" section appended after existing entries** (5 terms, vocabulary from research §7.3 + this doc):

| Term | Definition (one line, GLOSSARY style) |
|------|---------------------------------------|
| **static prerendering** | Emitting one crawlable HTML file per routable URL (per-page `<head>` + empty `#root` + boot script) as a post-build step, so crawlers read real document titles/meta/JSON-LD without executing JS. |
| **site URL** | The one canonical `SITE_URL` (`https://hospiceinfo.pages.dev`), sourced in `data-raw/site-config.json` (ADR-0009 pattern) and used by canonical links, Open Graph, and sitemap entries. |
| **canonical URL** | The `<link rel="canonical">` value on each page — the exact served `.html` URL (home: `/`) — so search engines consolidate one identity per page. |
| **Open Graph image** | `public/og-image.png` (1200×630), referenced by `og:image` on every emitted page for social-link previews. |
| **hash-redirect guard** | The ~10-line snippet in `src/main.tsx` that, on a real-path load with an empty hash, replaces the URL with the matching `#/route` so the hash router lands on the intended page (ADR-0016; closes R1). |
| **manual pin** | An operator-supplied latitude/longitude for a postcode the geocoder cannot resolve, stored in `data-raw/manual-geo-ni.json` and merged into the build's geo map (ADR-0021). |

Existing entries: **preserved verbatim** (the GLOSSARY title-line rename and Cycle 3 section were already applied on 2026-10-29 — Coding reads the file and verifies line 1 and the EOF section; it does not rewrite them).

## 8. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| R1 (Blocking, research) — empty hash on real-path load | Guard, §3.5 (ADR-0016). Acceptance: `npm run preview` + direct load of `/about.html` renders the About page, not the map. |
| R2 — live hostname `https://hospiceinfo.pages.dev` unverified | Human check §10 before build lock; `SITE_URL` is config, fixing it later is a one-line + rebuild. |
| R10 (research) — non-deterministic build | §3.2 rules 1–7 enforced in the script; QA double-build byte-compare (§9). |
| Research §3.4 legal guard (unnumbered — the risk list ends at R13) — third-party JSON-LD reads as endorsement | No-endorsement guard §3.4 (A3/A4). |
| R12 (research) — link surface for pallets | Guard maps `/hospice/<id>` to the map view; documented, not promised (§3.5) (A7). |
| New: Pages 404 route vs unknown-hash behaviour | `404.html` shells out to the map (§3.8) — consistent with unknown-hash behaviour; no new SPA route. |
| New: `dist/` bloat | 161 shell pages ≈ 1–2 kB each ≈ < 300 kB total; map payload (6.79 MB catchments) shipping unchanged (ADR-0010 P5 already applied). Acceptable. |
| New: hostname change later (custom domain) | One config value (§3.7); no code coupling; ADR-0014 deployment untouched. |
| New: manual coordinates wrong | H3-2 OS Places is the verified fallback (A2); coordinates are data, not code — wrong pin is a one-line data fix + rebuild; neutral wording covers any residual unplaced (AC3 fallback §5). |

## 9. Verification protocol (done-when)

Every check below must pass; each maps to an AC or invariant. All commands are run from the repo root.

1. **Byte-identity, data:** `npm run build-data` → record SHA-256 of `public/data/*.json`; repeat `npm run build-data` → identical set. **Re-baseline:** the Cycle 2 build-data anchor set (`dc261185 e11322ba 2a87a374 5628d8f7`) is replaced by the new hash set after the §5 merge lands. `docs/build-log.md` does not exist yet — it is a Coding deliverable: one line per build cycle (date + 4 SHA-256 prefixes of the build-data outputs), seeded with the Cycle 2 line at the anchor set above; Coding records the new Cycle 3 line there; both `build-data` runs within the cycle must agree with each other.
2. **Byte-identity, dist:** `npm run build` ×2 (full: `tsc -b && vite build && node scripts/prerender.mjs`) → `dist/` tree byte-identical (compare SHA-256 of every file, map keyed by relative path).
3. **Tessellation:** `node scripts/validate-tessellation.mjs` → exit 0.
4. **AC1 rename:** `grep -rni "hospice catchment map" index.html public/ src/` → **zero hits** (case-insensitive; `package.json`, `docs/`, `GLOSSARY.md` line-1 historical, ADR files exempt — G6 check, research §7.1).
5. **AC2 crawlability:**
   - `dist/` contains exactly 171 emitted files (1 index + 6 info + 161 hospice + 3 infra) — count == `hospices.json length + 7` (also enforced inside `scripts/prerender.mjs`, §3.1);
   - `dist/sitemap.xml` parses as XML; `<loc>` count == 168 (161 + 7);
   - `dist/robots.txt` matches §3.6 verbatim;
   - every `dist/hospice/<id>.html` id ∈ `hospices.json` ids (and vice versa);
   - `npm run preview` → direct load `/about.html` renders the **About page** (R1 closure), direct load `/` renders the map; `/hospice/ni-r1.html` renders the map with correct `<title>` `… - Hospice Finder UK` in the tab.
6. **AC2 HTML validity:** one spot-check page (e.g. `dist/hospice/hull-east-yorks.html`) parses: exactly one `<title>`, one `rel="canonical"`, one `ld+json` script, `og:*` set complete per §3.3.
7. **AC3:** `hospices.json`: `wales >= 0` (tolerated 0, G3) with landing chain no-op green; unplaced-practice count ≤ 12 exactly the Appendix A ids (0 if manual coordinates landed) — count from data, not derivation; `data/README.md` carries provenance rows for `manual-geo-ni.json`, `site-config.json` `siteUrl` documented; §4 chain commands runnable (dry-run confirm on `[]` file).
8. **AC4:** `grep -c "circle" public/logo.svg` → 1; `npm run preview` favicon legible at 16 px (visual); manifest parses (node JSON.parse).
9. **Determinism:** the `dist/` compare in (2) is itself rule 7 of §3.2 — the two build-data/dist commands above are the enforcement.

**Done-when =** all 10 numbered checks green + GLOSSARY title/section updated + 9 ADRs written + `data/README.md` updated rows + `docs/build-log.md` re-baselined anchor recorded. This document (`.agents/architecture.md`) is the specification Coding works from; the PM's work list is the ordering.

## 10. Human verification (operator steps — not blocking code, blocking release confidence)

| # | Item | What exactly | Blocking? |
|---|------|--------------|-----------|
| V1 | **Pages URL** | Open `https://hospiceinfo.pages.dev` in a browser — confirm the live site loads. If the slug resolved to a different hostname, fix `site-config.json` `siteUrl` and rebuild (one line). | Yes — before build lock (R2) |
| V2 | **og-image.png** | Generate the final 1200×630 image (`#1d4ed8` + white wordmark + heart-pin mark) and commit to `public/og-image.png`. The reference ships either way (V2 = quality, not validity). | No (brand quality) |
| V3 | **H3-1 — CIW email** | Send the email drafted in `data/README.md` (Care Inspectorate Wales data request, drafted 2026-10-16) to the CIW contact; record send date + response channel in `data/README.md`. | No (G3 tolerates silence) |
| V4 | **H3-2 — manual NI coordinates** | Fill `data-raw/manual-geo-ni.json` `entries` with verified lat/lon for the 9 postcodes (§5 table — source: OSM place points / OS grid). Until filled, `entries: []` ships (build green, 12 remain unplaced — documented, passes). | No (AC3 has fallback branch) |
| V5 | **H3-3 — Wales authed fetch** | If the CIW reply requires log-in to download, perform the authed fetch (session step); save the CSV as `data-raw/wales-hospices-2026-10.csv`. (If plain-CSV reply, skip — landing chain §4.) | No (G3) |

V1 is the only pre-lock gate; V2–V5 land post-merge as data refreshes (each triggers the full §4/§5 chain + re-baseline).

## 11. Open questions for the Reviewer (stage 3)

1. **Extensionless URLs as a future option:** `.html` URLs were chosen for zero-config Pages serving (§3.1). If SEO preference later outweighs, the migration = `_redirects` file + canonical URL update (all config, no code). Accepted as-is?
2. **R12 debt:** `/hospice/<id>.html` lands on the map (guard §3.5) — documented, not promised. Is "no deep-linking" acceptable for Cycle 3, with deep-linking into the selected panel filed as a Cycle 4 candidate?
3. **og-image brand:** placeholder ships; final mark is an operator asset (V2). Any brand-constraint the Reviewer wants asserted (e.g. minimum text size, wordmark casing "Hospice Finder UK")?
4. **`siteUrl` in `SiteConfig` interface** is unused by the app (prerender reads the JSON). Mirror-completeness (ADR-0009) says include it; unused-field lint says drop it. Recommend: keep (complete mirror); flag for Reviewer's call.
5. **Re-baselined anchor recording location:** propose `docs/build-log.md` (Coding deliverable, §9 check 1 — seeded with the Cycle 2 line at the anchor set `dc261185 e11322ba 2a87a374 5628d8f7`) gets a "Cycle 3 anchor" line (date + 4 hashes). Confirm the location the QA stage should read.

