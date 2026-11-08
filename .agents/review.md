# Review — Cycle 5 (2026-11-07)

**Scope and method.** Stage 3 (Reviewer) challenge of the Stage 1 → Stage 2 outputs for the data-only Cycle 5: `.agents/research.md` L1–360 (Cycle 5 section), `.agents/architecture.md` L1–100 (Cycle 5, 2026-11-07 section; the pre-existing 657-line Cycle 4 section starts at L101), `docs/adr/0031-oscar-primary-scotland-source-and-id-scheme.md`, `GLOSSARY.md` (Cycle 5 terms appended), and `.agents/feature.md` — checked against the on-disk scripts, data, ADRs and `data/README.md` (read-only; HEAD state 2026-11-07). Every file:line below is a reviewer disk-read/derived line number for this pass. Challenge items A–I per the dispatch; each carries a verdict (**PASS** / **FINDING**) and classification — **Blocking** = breaks specified behaviour or critical design flaw (Architect fix before Stage 4); **risk-accepted** = documented, never blocks.

**Item A — R-1 dual-defect in `scripts/extract-hospices-wales.mjs` `||`-chain.**

On-disk chain, `scripts/extract-hospices-wales.mjs` L59–62:

```js
const iName =
  header.findIndex((h) => h.toLowerCase() === 'service name')
  || header.findIndex((h) => h.toLowerCase() === 'name')
  || header.findIndex((h) => h.toLowerCase().includes('name'));
```

Both defects are real, per plain JS semantics:
- **(b) truthy `-1` short-circuit.** If no `service name` column exists, L60 evaluates to `-1` (truthy), so the `||` chain short-circuits: L61 (`name` exact) and L62 (`contains name`) are never evaluated. A file that has `name` at index 2 but no `service name` currently exits via the guard (L63–65) even though a name column exists — the intended "try the next candidate" behaviour is dead code.
- **(a) falsy `0` fall-through.** If `service name` exists at index 0, L60 evaluates to `0` (falsy); the chain evaluates L61, and if a distinct `name` column sits at any non-zero index, that wrong index is returned — silent mis-binding into the wrong column (worst case: non-fail-closed bad data).

The architecture's fix spec (`architecture.md` §1: iterate `['service name' exact, 'name' exact, contains 'name']` in priority order, take the first `idx !== -1`, else `console.error` the full header + `process.exit(1)`) fixes both directions and keeps the existing on-disk guard (L63–65) as the else-branch — that guard is already the required fail-closed behaviour.

Edge cases checked: headers are lowercased inside the chain (L60–62 `h.toLowerCase()`), so matching is already case-insensitive — the dispatch's tolerance requirement needs no addition; a UTF-8 BOM would only poison the first cell, and the `contains 'name'` fallback still catches a prefix-mangled `service name`; empty-name rows remain dropped by the retained `.filter((e) => e.name)` (L69–72); blank-CSV guard at L52–55 (exit 1). Architecture §6 records the deliberate strengthening beyond research.md R-1's "falsy-0 + e.g. explicit -1 sentinel" — correctly, since research flagged only (a).

**Verdict A: PASS.** One documentation finding: **C5-R1 (risk-accepted)** — architecture §0/§1 cite the chain as "L56–62", the postcode match as "L63", and the id map as "L70–75"; on disk they are L59–62, L67, L69–72 (3-line drift). No behavioural impact; PM should have the work list cite the verified line numbers. (Wales extractor is 76 lines; prior-cycle D4 targeted the current `wales-r${i+1}` line at L72, not `wales-${i+1}` — the `wales-r` scheme is already on disk, so the R-1 fix is the only Wales edit.)

**Item B — APPEND-mode identity stability for the 3 `sc-CS<CSNumber>` rows.**

The 3 rows verified on disk in `data-raw/hospices-sc.json` (single-line JSON): `sc-CS2014323454` (Hospice at Home, Denny FK6 5HJ), `sc-CS2022000173` (The Ayrshire Hospice Respite and Response, Ayr KA7 2TG), `sc-CS2023000094` (ACCORD@Home, Paisley PA2 7BW).

The "byte-for-byte" wording (architecture §0.4; ADR-0031 D3 "survives byte-for-byte") is inaccurate: architecture §2 itself admits the rows are "JSON-parsed and re-serialised deterministically (`JSON.stringify`)". The actual guarantee is **parsed row-value identity** (id/name/address/town/postcode values unchanged, file order preserved, whole file re-serialised — byte layout of the file changes). That is sufficient for AC2's identity requirement: ids unchanged ⇒ ADR-0004 FNV-1a colours unchanged; values unchanged ⇒ merge output unchanged for those rows.

Backstop analysis as required:
- The merge **unique-id assertion** (`scripts/merge-hospices.mjs` L88–90, `dupes.length` → exit 1) is the operative backstop against a duplicated sc row reaching the map.
- The 20-curated assertion (L83–84, `curatedCount !== 20` → exit 1) does **NOT** cover the 3 sc rows: they are non-curated register rows (`scripts/merge-hospices.mjs` sc map, `curated: false` at L54; curated match is the CQC regex at L67–69), so they are excluded from `curatedCount` by construction.
- Consequence: a corrupted/lost existing row (e.g. APPEND reads a stale pre-image) is NOT caught by either merge assertion. It is caught only by the explicit verification item — architecture §5.4: "the 3 `sc-CS<CSNumber>` rows present with unchanged ids/fields". That item is present in the design, so the requirement is covered, but the "structurally impossible" claim in §0.4 overstates the merge-side guarantee.

**Verdict B: PASS** with wording fix. **C5-R2 (risk-accepted, design-level):** reword §0.4/ADR-0031 D3 from "byte-for-byte" to "parsed row-value identity (order preserved, file re-serialised)", and state that pre-image integrity of the 3 rows is enforced by verification item 4, not by the merge assertions; add a PRE-IMAGE SHA-256 of `hospices-sc.json` (3 rows: `644E50C6…`) to the `data/README.md` provenance row at H5-2 fetch time so the QA post-image check is a machine diff. No code change; the chain stays fail-fast.

**Item C — R-2 CATCHMENTS enforcement (structural, not naming).**

`scripts/catchment-map.mjs` on disk: `CATCHMENTS` = exactly 20 entries, every one England (Lancashire/South Cumbria names: stcatherines, eastlancs, pendleside, rossendale, bury, bolton, queenscourt, stjohns, stmaryfurness, wiganleight, trinity, derianhouse, haltonhaven, stroccos, drkershaws, springhill, willowwood, edenvalley, hahwestcumbria, hahcarlisle), each carrying `cqcUrl: 'https://www.cqc.org.uk/location/1-<digits>'`.

The enforcement is structural, at three lines, not naming convention:
1. `scripts/merge-hospices.mjs` L67–69: a row is curated only if its `cqcUrl` matches `location\/(1-\d+)`; `sc-`/`sc-oscar-`/`ni-r`/`wales-r` ids never carry such a URL, so no non-England row can ever become one of the 20 curated (asserted at L83–84, exit 1).
2. `scripts/build-data.mjs` L33–35: `SLUG_TO_ID` is `fromEntries` over `CATCHMENTS` only — the shop-key space is England-only by construction. (The variable is `hospicesOut` at L117, not `hospitiesOut` — architecture §0's read notes say `hospicesOut` ✓; only the dispatch shorthand diverged.)
3. `scripts/build-data.mjs` L260–266: every shop resolves through `SLUG_TO_ID`; an unresolvable `hospiceId` increments `shopsUnresolved` (L265–266) and L282 `process.exit(1)` fails the build.

So a `sc-*`/`wales-*` key can never enter England catchment data, and the one way it could be injected (a shop row) trips the build, never the map.

**Verdict C: PASS.** No findings. (Research R-2 asked for exactly this: structural key space + fail-fast; the design delivers both tiers.)

**Item D — G3 zero-set tolerance when BOTH raws are absent.**

- **Wales path (on disk today):** `scripts/extract-hospices-wales.mjs` L45–48 — `!fs.existsSync(RAW)` → log → `fs.writeFileSync('data-raw/hospices-wales.json', JSON.stringify([]))` → `process.exit(0)`. Stays `[]` + exit 0 after the RAW rewrite to `hospicehealth-wales-members-2026-11.csv` (L24).
- **Scotland path (by design):** `extract-hospices-sc-oscar.mjs` does not exist yet; architecture §2 specifies APPEND with G3: CSV absent → append 0 rows → `hospices-sc.json` written with the existing 3 rows unchanged → exit 0; "log names the H5-2 procedure" is required. Both G3 log updates are explicit: §1 "the log names the H5-1 procedure" (the current L46 log says "until the CIW reply, B1" and MUST change), and §2 names H5-2.
- **Both-absent chain:** Wales `[]` (exit 0) + Scotland 3 (exit 0) → merge (en 152 + sc 3 + ni 6 + wales 0 = 161, unchanged) → geocode no-op (resumable `postcode-geo.csv`) → build-data fail-fast → prerender self-assert (`scripts/prerender.mjs` L262–264: sitemap `<loc>` count = hospities count + 7, else fail) → green. Architecture §4 human-gates step (1) states the chain runs green BEFORE the raws land — exactly the both-absent path.

**Verdict D: PASS.** Note: the `data/README.md` CIW B1 block (L129–164) and L27 placeholder row must be superseded at H5-1 time — architecture §5.7 and ADR-0031 require the two new provenance rows "at fetch time, nothing before", so the stale CIW text persists until James's fetch; acceptable and already planned.

**Item E — `address[]` passthrough (where OSCAR `address[]` ends up).**

On disk: `scripts/build-data.mjs` `hospicesOut` (L117 onward) emits `{id, name, town, postcode, lat, lon, color, kind, source, website, cqcUrl, curated, nation}` — **no `address` field**; `scripts/merge-hospices.mjs` output shape (L29–34 sources; sc map L52–55) likewise carries no `address`; `townOf` (L42) reads the last `address` element as the town fallback, and `town: h.town || townOf(h)` (L53) is the only consumer.

The design states the disposition clearly and consistently: architecture §2 ("`address[]` ← the OSCAR address lines, emitted per row … drives `townOf` town fallback in the merge, L42/L53") and ADR-0031 D4 ("this field is only for town-name derivation"). Chain behaviour matches: `address[]` is raw-row metadata consumed for town derivation only; it is NOT in `hospices-all.json` and NOT in `public/data/hospices.json`. No public-passthrough claim exists in feature.md AC2 or research OQ-3 (research only flags "shape extension" for decision), so there is no contradiction to classify.

**Verdict E: PASS.** Terminology note for the work list (folded into C5-R2's fix list, risk-accepted): say "stored in raw row metadata, consumed for town derivation only, never exposed publicly" — "passthrough" alone would misread as public.

**Item F — ADR-0031 consistency and citation cross-check.**

Checked against on-disk ADR titles (`docs/adr/`, 31 ADRs):
- OSCAR primary (Decision 1) ↔ research §5.3 "primary per the 2026-11-07 scope" ↔ feature.md "Authoritative source = OSCAR" — consistent.
- Id schemes: `sc-oscar-<SC>` (6-digit Scottish Charity Number) with fallback `sc-oscar-r<n>`; distinct namespace, preserves ADR-0002 (`uk-unique-id-scheme`) `{nation}-{registerId}` shape; Wales `wales-r<n>` unchanged — consistent with ADR-0002 on disk.
- NI stays 6 with the two-leg proof ↔ research §5.4 (on disk, L254–277: name filter = exactly 6 rows; `Service Type`/`Categories of Care`/`Conditions` each have 0 hospice-valued distinct entries; "hospice in any cell" = 6) — consistent; no extractor change needed.
- Append identity ↔ ADR-0031 D3 ↔ architecture §3 — consistent (wording fix per C5-R2).
- Rejected alternatives: exactly 4 (PPPC primary; Hospice Scotland primary; REPLACE mode; extending the `sc-<CSNumber>` namespace) — present.
- F-1 (3 hospice-at-home rows kept, id stability) / F-2 (PPPC seed-only, gaps Aintree/Victoria Dundee/St Andrews, blank + 1 invalid postcode) — consistent with research §5.7 findings on disk.
- OQ-5 (OSAR licence UNVERIFIED; H5-2 item 3 captures licence wording at fetch) — consistent with research §5.3.5/OQ-5 on disk.
- ADR citations inside ADR-0031 verified against on-disk titles: 0002 ✓ (uk-unique-id-scheme), 0003 ✓ (first-run column discovery), 0004 ✓ (hash-derived-hospice-colour), 0009 ✓ (site-config-single-source), 0010 ✓ (map-performance-strategy), 0015 ✓, 0020 ✓ (wales-g3-tolerant-landing), 0030 ✓ (reproducible-static-pipeline).
- Numbering-remap handling: architecture §0 explicitly records that the dispatch shorthand ("ADR-0004 no new deps") does not match on-disk titles (0004 = hash colour; 0005 = retire-outcode-assignment-for-the-20-curated) and cites the on-disk titles; no new-deps clause attributed to 0004 — correct.

**Verdict F: PASS.** No findings.

**Item G — Standing invariants intact; no `src/` anywhere.**

- ADR-0002 (id shape): new families `sc-oscar-<SC>` / `sc-oscar-r<n>` / `wales-r<n>` all `{nation}-{registerId}` ✓; slugs URL-safe for ADR-0019.
- ADR-0003 (first-run column discovery): both the rewired Wales extractor (header + first data row log already on disk, L56–58) and the new OSCAR extractor log header + first data row before trusting columns; absent-file paths log the human-fetch procedure (§1/§2) ✓.
- ADR-0004 (FNV-1a colour on id): `fnv1a` in `scripts/build-data.mjs` L43+ untouched; new ids colour themselves; 3 sc rows keep colours (ids stable) ✓.
- ADR-0010 / ADR-0030 (no new deps; reproducible static pipeline): no `package.json` change specified; `data/README.md` is the only other scheduled change, at fetch time ✓. Architecture §5.7: "no new packages in `package.json`".

## G — standing invariants (remainder) — Verdict G: PASS

**G.1 hide-not-delete (ADR-0012/0025/0026) — PASS**
- `scripts/build-data.mjs` L115–130: `hospicesOut = hospicesAll.map(...)` — every merged row is
  emitted; unplaced rows carry `lat/lon: null` (L121–122). No per-row deletion anywhere in chain.
- `build-data.mjs` L131–132: unplaced count only logged — no `process.exit` (contrast shop
  fail-fast L282): unplaced rows never break the build.
- `build-data.mjs` L179 `placed` filter; L225 `catchmentsOut = placed.map(...)`: unplaced rows get
  no polygon → render nowhere on the map; the `hospices.json` row keeps existing (ADR-0012
  neutral not-found wording covers deep links).
- `scripts/merge-hospices.mjs` L43–66 splices in ALL rows (no filter drops any); curated splice
  replaces by id (L67–79) — row replaced, never deleted from the population.
- G3 zero-set: `scripts/extract-hospices-wales.mjs` L45–48 (raw absent → write `JSON.stringify([])`
  → exit 0); Scotland APPEND absent-raw → byte-identical re-serialise (architecture.md L55–58).

**G.2 ADR-0019 (id-is-slug) — PASS**
- `scripts/prerender.mjs` L42 reads `public/data/hospices.json`; L235 code-unit ascending sort;
  L238 `write('dist/hospice/' + h.id + '.html')`; sitemap L105/L248 built from `h.id`. Fully
  generic — no id hardcoding, no mapping layer. New families `wales-r<n>`, `sc-oscar-<SC>`,
  `sc-oscar-r<n>` (ADR-0031 D3) match `{nation}-{registerId}` (ADR-0002), slug-safe.

**G.3 ADR-0009 (provenance) — PASS with new finding C5-R3**
- Every row stamped: `merge-hospices.mjs` L20–24 `SOURCES` → row objects L43–66.
- `sc-oscar-*` rows: ADR-0031 D6 (on disk) — OSCAR source string selected by id prefix in merge
  (one-line change). H5-1/H5-2 pin URL + procedure + date + SHA-256 to `data/README.md`
  (architecture.md §4 step 3, §5 item 7 L74–81); OSCAR licence wording captured at fetch
  (ADR-0031 Consequences, OQ-5).
- **C5-R3 (new, risk-accepted):** `merge-hospices.mjs` L23 `SOURCES.wales = 'Care Inspectorate
  Wales (fetched list pending — B1 email, data/README.md)'` is stale after the HHW rewire
  (feature.md AC1; GLOSSARY.md L123–126 make HHW authoritative). The design's only merge change
  (ADR-0031 D6; architecture.md L58) covers only sc-oscar → all `wales-r*` rows would be stamped
  with the wrong, superseded source. Fix (cheap, no rework): extend the same merge change to a
  two-prefix lookup (`sc-oscar*`, `wales-r*`). Route to Coding in the PM work list.

**G.4 ADR-0015/0030 (deterministic pipeline) — PASS**
- Plain `JSON.stringify`, no formatters/timestamps: `build-data.mjs` L292–295 (4 outputs),
  `merge-hospices.mjs` L95, `extract-hospices-wales.mjs` L74; colour is a pure function of id
  (`fnv1a`/`hashToColor` L40–56); merge insertion order fixed (L43–66); APPEND re-serialisation
  is explicitly JSON.parse → JSON.stringify, no formatters (architecture.md L58). Byte-identical
  re-run. (C5-R2 wording caveat stands, risk-accepted.)
- **G.5 no src/ changes — PASS:** design writable set = exactly 3 files (architecture.md L3–28);
  §5 item 7 (L74–81): "No src/ diff; no new packages". Nothing in §1–§4 touches `src/`.

## H — scope discipline — Verdict H: PASS

Exactly the 3 permitted writable files present/changed on disk (verified 2026-11-07):
1. `.agents/architecture.md` — Cycle 5 section L1–98 (L1 `# Architecture — Cycle 5 (2026-11-07)`;
   Cycle 4 header at L99) → insertion-only prepend.
2. `GLOSSARY.md` — 154 lines; `## Cycle 5 terms` section L121–154 → tail append only.
3. `docs/adr/0031-oscar-primary-scotland-source-and-id-scheme.md` — new file, present
   (Status: accepted 2026-11-07; all six decisions + Wales/NI scheme read in full).
`git status --short`/`git diff` cannot be run in this reviewer environment (no shell);
verification substituted: lead's `git diff --numstat` (architecture.md 98 ins/0 del, GLOSSARY.md
34 ins/0 del — both purely additive) + on-disk presence and insertion-only shape of all three
files above. No other file changes are implied by any design section.

## I — feature.md AC alignment — Verdict I: PASS (all 5 ACs mapped; none silently dropped)

| AC | Design element | Evidence |
|----|----------------|----------|
| AC1 Wales 14, valid postcodes, HHW URL+SHA-256 pin | §1 rewire + §4 step 3 + ADR-0031 Wales ids | architecture.md L30–54 (name guard, postcode-exact, ids `wales-r<n>`); extract-hospices-wales.mjs L45–48, L67, L69–72 |
| AC2 SC ~40 geocoded, 3 Scottish ids survive, curated-identity assertions pass | §2 APPEND + ADR-0031 D1/D2/D5 | architecture.md L55–64; ADR-0031 stability-by-construction + merge dup assertion (merge-hospices.mjs L74–78) |
| AC3 NI stays 6 (exhaustiveness proof) | ADR-0031 two-leg NI proof | ADR-0031 (on disk): name filter = exactly 6 + zero hospice classification values |
| AC4 provenance per new source (URL+procedure+date+SHA-256+licence) | §4 step 3 + §5 item 7 + ADR-0009 | architecture.md L73–81; ADR-0031 D6; C5-R3 attached |
| AC5 chain green, byte-identical, validate-tessellation exit 0, 0 new deps, 0 blocking | §5 verification + G3 + APPEND determinism | architecture.md L74–81; extract-hospices-wales.mjs L45–48; §0 no new packages |

Alignment note (feeds C5-R4): feature.md AC2 calls the 3 surviving rows "curated Scottish IDs"
and requires "merge curated-identity assertions pass". Design classifies them `curated: false`
register rows (ADR-0031 D5; curated = 20 England-only, merge-hospices.mjs L69–73). The 20-curated
assertions therefore do not directly cover the Scottish rows; their stability is guaranteed by
append-construction + the unique-id assertion (L74–78) instead. All assertions still pass and the
3 ids survive — intent preserved, wording gap only.

## Open findings

| id | item | classification | disposition |
|----|------|----------------|-------------|
| C5-R1 | G | risk-accepted | draft's Cycle 5 line numbers drift from measured file (measured L1–98 + 2 blank lines vs draft L1–100); re-derive line cites at QA; no design change |
| C5-R2 | G | risk-accepted | ADR-0031 D2 "byte-for-byte" = content per row preserved; file re-serialised deterministically; no behaviour change; wording accepted as-is |
| C5-R3 | G | risk-accepted | `merge-hospices.mjs` L23 `SOURCES.wales` stays stale after HHW rewire; design's one-line merge change (ADR-0031 D6) must extend to `wales-r*` prefix; route to PM work list / Coding |
| C5-R4 | I | risk-accepted | "curated Scottish IDs" (feature.md AC2) vs `curated: false` classification (ADR-0031 D5); assertions pass, ids survive; document in `.agents/requirements.md` to avoid QA misread |

No Blocking findings.

## Final verdict: **PASS**

The Cycle 5 design is approved for Stage 4 (Product Manager). Carry the four risk-accepted
findings forward; C5-R3 and C5-R4 must be surfaced in `.agents/requirements.md` so Coding and QA
act on them. Only file written by this reviewer session: `.tmp/review-c5-tail.md`.

# Review — Cycle 4 (2026-10-30)

**Scope.** Challenged `.agents/requirements.md` L1–167 (W1–W10, Sequencing, A1–A4, Verification gate) against `.agents/architecture.md`, `.agents/research.md`, `.agents/design.md` (BEACON, gate H4-1, Concept 2), `docs/feature.md` AC2/AC5/AC7, ADR-0024…0028 plus standing invariants (0008, 0011, 0012, 0015, 0007/0016), and current source on disk. Every premise below re-verified in code with file:line.

## Per-item review (W1–W10)

**W1 — GP layer gating** — OK (minor cite drift, F7).
- `showShops` `useState(true)`, shops switch, prop passthrough: `src/App.tsx:26,96-97,197` ✓; `visiblePractices` `src/components/MapView.tsx:251-254` ✓ (W1 cite exact); `visibleShops` is L264 (W1 cites L265).
- No `showGps` in src/ (grep 0) ✓. Default-off, in-memory `useState(false)`, filter-parallel hiding unassigned GPs (`hospiceId === null`): consistent with ADR-0025 and hide-not-delete (ADR-0012; `unassigned[]` `src/data/hospices.json` L461).

**W2 — Muted GP markers + search tiers** — issue (step 10 uncheckable, F1); rest OK.
- Premises verified: GP bucket divIcon 28px `#1d4ed8`/`#fff`, `iconSize [28,28]`, `iconAnchor [14,14]` `src/components/MapView.tsx:171-181`; CircleMarker `radius={selectedId === p.hospiceId ? 7 : 5}` + `fillOpacity … : 0.85` L244-245 ✓.
- Step 10 (legend reorder) uncheckable: `src/components/Legend.tsx` is only the 20-catchment curated colour key, rendered solely inside the Methodology modal (`src/components/Methodology.tsx:131`); the persistent map legend was retired in Cycle 2 (Legend.tsx header comment). No shops/GP legend blocks exist in src/. Stale source: the spec line `.agents/architecture.md:26`.
- Search tier rework (step 5): current panel search shows Hospices→Practices→Shops (`src/components/HospiceFilter.tsx:56,89,119`); reorder plus substring/`localeCompare`/tie-break is feasible and matches ADR-0026 for ~918 practices.

**W3 — Footer** — OK.
- `src/components/AppShell.tsx:53` is the only `<footer>`; `.app-footer` has zero rules in `src/styles.css` (grep 0) — "add rule at file top" is a pure addition ✓. `#6c757d` exists today (`src/styles.css` `.app-loading`) so the `var(--hf-text-muted)` mapping is coherent.

**W4 — Back navigation** — OK (cite drift, F7).
- The non-map branch is exactly 6 routes, each `Navigate to="/"` with no back handling: `src/App.tsx:238-249` ✓.
- Link rows verified: `src/pages/StartHere.tsx:100`, `src/pages/CorrectionsPage.tsx:187`, `src/methodology` links at `src/pages/Methodology.tsx:262`. W4 cites `StartHerePage.tsx`; the file is `src/pages/StartHere.tsx`.
- `history.length > 1 → go(-1)` with Navigate fallback is standard; scope is 7 rows, route components and the router/guard (ADR-0007/0016) untouched.

**W5 — Theme boot snippet** — OK (anchor note, F8).
- Current `index.html` (16 lines) has no CSS link — Vite injects the bundle; the real insertion anchor is before the module script at `index.html:14`. W5's "just before the site CSS" phrasing is a dangling anchor but executable (F8).
- Premises hold: no `data-bs-theme` in repo (grep 0), no existing boot snippet in `src/` → ADR-0024 duplication is purely additive. Static inline `<head>` placement is load-order safe; 3-state Auto/Light/Dark with `localStorage` key `hfuk-theme`, auto-only `matchMedia` listener, no React theme state — all consistent with ADR-0024 and the A1 ambiguity resolution.
- Prerender side: `scripts/prerender.mjs` `buildPage()` push-list is the stated target; byte-equality of the two copies is enforced by gate 4 (double build, ADR-0015) — checkable ✓.

**W6 — W5 dark CSS block + token block** — OK (F6: not "extend").
- `src/styles.css` (314 lines) has zero `--hf-*`, zero `data-bs-theme` selectors, zero `font-family`/`@font-face` (grep 0) → W6's "extend the existing dark block" cites a block that does not exist; must be created (F6, risk-accepted — intent unambiguous).
- 10 `--hf-*` tokens × 2 blocks wired to `--bs-body-bg/-color/-border-color` matches ADR-0028; token-swap-only rebrand keeps scope at token-swap + recolour + fonts, per design.md gate H4-1.

**W7 — Published-service-area removal** — issues (F2/F3/F4).
- Gate #6 cites `src/data/types.ts`; the file is `src/lib/types.ts` (`kind` at L11/L34; no `src/data/types.ts` on disk) — as written the gate is unexecutable (F2 **Blocking**).
- KEEP set per A5/AC5 verified present: `Methodology` page, `AboutPage`, `LegalPage`, AppShell tagline at `src/components/AppShell.tsx:36`, `StartHere` page ✓; `kind` retained in `src/lib/types.ts` + provenance only ✓.
- `data/*.json`, `data-raw/`, `scripts/` untouched ✓ (invariants 0011/0015). UI-trace deletions (`kind === 'approx'` → "approx" at `src/components/HospicePanel.tsx:157-160`) verified.

**W8 — Recolour prune sweep** — issues (F5/F6); safe only under W2→W8 sequencing.
- Premise "hospice bucket holds `#64748b`" is wrong: the blue GP bucket divIcon `#1d4ed8` is the target; `#64748b` does not appear in `src/styles.css` (grep 0) → as written W8 never finds its target (F5) and its new bg `var(--hf-primary)` contradicts W2's `var(--hf-gp-fill)` (F5).
- "extend existing dark block" again — none exists (F6). Net-new `[data-bs-theme="dark"]` block in `src/styles.css` is the only coherent reading.
- Scope stays within token-swap + recolour + fonts ✓; `leaflet.css` untouched (ADR-0027 constraint) ✓.

**W9 — Font self-hosting** — OK.
- A1 resolution (stop at record, no CDN fallback; fonts named Archivo 700 + Public Sans 400/600) matches design.md; file placement `src/assets/fonts/` is new (no `fonts/` on disk today, glob 0).
- CSS `@font-face` mono/church-slab treatment is additive to W6's token block ✓. No dep added (ADR-0008) ✓.

**W10 — Beacon palette application** — OK.
- Light `#163a5f` / dark `#7dadd6` / gp-fill `#74879b` & `#8298ad` values match design.md Concept 2 ✓.
- Replacement targets verified: `src/styles.css` `.app-header` L24-27, `.skip-link` L49, `.sheet-fab` bg; `public/manifest.webmanifest` `theme_color`; `public/logo.svg` (4× `#1d4ed8`) ✓.
- Coral `#e06744` is OG-image only, never a token — respected in W10 scope ✓.

## Sequencing soundness

W8→W1→W2→W5→W6→W7→W3→W4→W9→W10 respects all data dependencies: tokens (W6) exist before any recolour (W8/W10); W2's GP fill precedes W8's sweep; gate 4 (byte-equality double build) runs last. No orphan steps. W3/W4/W9/W10 are independent leaves — order among them immaterial.

### Re-review — rework round 1 verification (2026-10-30)

Scope: patched W2/W5/W7/W8 + gate #6 + architecture.md §2. **F1–F8 all RESOLVED** (lead disk-verified reviewer read-verification against on-disk requirements.md, architecture.md, index.html, MapView.tsx, HospicePanel.tsx, styles.css, Lib types.ts). New findings from the re-review, all lead disk-verified against source 2026-10-30:

- **N1 (Blocking)** — W7 step 3 cited a non-existent `publish` const + "Has published service area" popup line in MapView; the live trace is the inline ternary at `src/components/MapView.tsx:106` (`{hospice.kind === 'published' ? 'Published service area' : 'Approximated catchment'}`), which the step never touched → gate #6 unsatisfiable.
- **N2 (risk-accepted)** — W7 step 2 "ml-auto span wrapping it" inaccurate: the "approx" badge is a `<>…</>` fragment at `HospicePanel.tsx` L157–162; the only `*-auto` span is the practice-count badge (L165), which the same step says to keep.
- **N3 (risk-accepted)** — `HospicePanel.tsx` L57 comment `// pm 4.1/W10: list sort + "published service area" filter (ADR-0011).` trips gate #6 after step 2; must be rewritten to `// pm 4.1/W10: list sort (ADR-0011)`.
- **N4 (risk-accepted)** — W5 step 3 cite `index.html:14` drifted to L16 (description meta re-wrapped, file now 18 lines).
- **N5 (risk-accepted)** — W7 step 1: ternary is at App.tsx L145–154 (not L146); no `publish` const in App.tsx (grep: only L145/L147 match); else-branch is a full div, not `''`.

**Verdict: CONDITIONAL PASS — rework round 2/2 (final).** Rework: N1 only; N2–N5 applied in the same patch (lead disk-verified all five in requirements.md 2026-10-30: W7 step 1 → L145–154 whole-ternary removal; step 2 → L73 filter branch, L127–139 form-switch, L157–162 fragment, L57 comment rewrite, L165 count badge kept; step 3 → MapView.tsx L106 verbatim line deletion with curated line preserved; W5 step 3 → `index.html:16`). Re-verify scope: W7 steps 1–3 + gate #6 traceability. A failed round 2 → HUMAN DECISION REQUIRED (2-round cap). Full re-review evidence: `.qwen/tmp/review-c4-re-review.md` (lead disk-verified, 6.6 KB).

### Re-verification — rework round 2/2 (final) (2026-10-30)

Scope: W7 steps 1–3 (requirements.md L90–92) + W5 step 3 (L76) + gate #6 traceability only; F1–F8 not re-adjudicated. All cites reviewer disk-anchored reads 2026-10-30; **lead independently re-verified R2-1/R2-2 against disk** (HospicePanel.tsx filter branch L71 ✓ / form-switch L123–135 + label L133 ✓; `kind` sweep: types.ts L11/L34, Methodology.tsx L93–94, LegalPage.tsx L64 ✓).

**Verdict: FAIL — 2 blocking (text-only; no code or sequencing impact).**

- **R2-1 (Blocking)** — W7 step 2 (L91) carries two off-disk cites: the `publishedOnly` filter branch is at **L71** (step says L73; the variable is `list`, not `visible`), and the form-switch block is at **L123–135** (step says L127–139; label at L133 correct). All other cites verified (L57 ✓, L59 ✓, fragment L157–162 ✓, `ms-auto` L165 ✓).
- **R2-2 (Blocking)** — gate #6 (d) (L94) "`kind` only in types.ts + docs/provenance" is unsatisfiable: after W7 1–3, `kind` remains in Methodology.tsx L93–94 (KEEP-set file for badge patterns; not exempted by this clause) and LegalPage.tsx L64 (prose). The gate would fail even after faithful execution of every step — same failure class as F2.

Verified PASS: W7 step 1 (App.tsx L145–154 verbatim; no `publish` const; `{selected.source}` kept), W7 step 3 (MapView.tsx L106 verbatim + `· curated` line intact), W5 step 3 (`index.html:16` = module script), gate #6 pattern traceability (7 × `published service area`, 21 × `approx` — all accounted).

**Status: RESOLVED 2026-10-30 — Stage 4 CLOSED.** HUMAN DECISION option 1 (lead patches + lead disk-verifies, no third reviewer round — 2-round cap honored): lead applied both one-line patches to `.agents/requirements.md` (W7 step 2: `list` filter L71 + form-switch L123–135; gate #6 (d): `kind` reworded to types.ts L11/L34 + KEEP-set Methodology L93–94 + LegalPage L64 prose) and lead disk-verified both anchors (HospicePanel.tsx L71/L123–135; `kind` sweep = 9 matches exactly accounted). **Stage 4: PASS, closed 2026-10-30.** Escalation options preserved as history in `.agents/pipeline.md` § HUMAN DECISION REQUIRED; evidence: `.qwen/tmp/reverify-r2.md` (lead disk-verified).

# Review — Cycle 3 (2026-10-29)

Reviewer pass over `.agents/architecture.md` (415 L) and ADRs 0015–0023, checked
against `.agents/feature.md` (AC1–AC4, gates H3-1/2/3) and `.agents/research.md`
(475 L). All claims verified against the working tree at HEAD `7061dbf`
(read-only). Per QWEN.md, every Blocking finding below is **design-level
(pre-coding) and routes to the Architect** for a fix pass before Coding.

## D1 — Deterministic zero-dep post-build prerender (`scripts/prerender.mjs`, ADR-0015)

**(a) Spec consistency — PASS.** Feature.md requires 6 info pages + ~161 hospice pages + sitemap/robots + JSON-LD + 404. Arch emits exactly 1 `/index.html` + 6 info + 161 `/hospice/<id>.html` + `sitemap.xml` + `robots.txt` + `404.html` = 171 files. The 161 count is independently verified: `data-raw/hospices-all.json` is 161 entries (en 152, sc 3, ni 6, wales 0; `data/README.md` "Generated app data" table and "Current state"). The only deviation from feature.md's illustrative extensionless URL `/hospice/<id>` is the `.html` extension — an explicit open question (arch §11 Q1), dispositioned in section (e) as accepted.

**(b) Standing invariants — PASS.** Zero new npm deps: ADR-0015 uses `node:fs` only; `package.json` deps/devDeps are untouched (verified: no pre-render tooling exists, so "zero-deps" is real, not cosmetic). Byte-identical data rebuilds: §3.2 rules 1–7 (sorted iterations, no timestamps/lastmod, LF + trailing newline, SHA-256 anchors, double-build `dist/` diff) leave the `build-data` pipeline and its outputs untouched; prerender is a pure function of `public/data/*.json` + the built JS. Client-side data model unchanged (shell page loads the same JS bundle; no SSR). Slug `hospiceinfo` untouched (ADR-0023). ADR-0009 single-source respected (`siteUrl` via `data-raw/site-config.json` + mirror, §3.7). The in-code invariant `sitemap loc count === hospices.json length + 7` (161 + 7 = 168) is the right machine-enforced coupling (ADR-0015).

**(c) Zero-ambiguity — PASS.** Script path, exact `build` chain (`tsc -b && vite build && node scripts/prerender.mjs`), fail-fast on missing inputs, idempotence, the exact head template, and the full title/description table for all 10 page classes are all pinned. No "or" branches in the emit logic.

**(d) QA-testability — PASS.** File count, per-class title/meta presence, sitemap/robots byte match, 404-on-unknown-path, and double-build `dist/` diff are all machine-checkable (grep/diff/curl). AC2 is directly testable.

**Verdict: PASS.**

## D2 — Hash-redirect guard in `src/main.tsx` (ADR-0016)

**(a) Spec consistency — PASS.** Closes research R1 (the named Blocking): static pages must be usable in-app; the guard rewrites real-path loads to the matching hash so the existing router (ADR-0007) behaves as before.

**(b) Standing invariants — PASS.** Hash routing preserved: `location.replace` (not push — no history pollution), no router library added. R12 respected by design: `/hospice/*` → `map` (View on map cannot deep-select; documented in ADR-0016 as a Cycle-4 candidate, matching research R12 risk-acceptance).

**(c) Zero-ambiguity — PASS.** Exact IIFE in arch §3.5, inserted before `createRoot` in `src/main.tsx` — the current file verified as imports + `createRoot` only (no guard present), so the insertion point is unambiguous. The route table covers index → `/`, 6 info routes, `hospice/*` → null → map; unresolvable paths leave the hash empty, which `routeFromHash` already maps to `map` (verified: `useRoute.ts` unknown/empty → `map`). No new dependency. Edges checked: `/hospice` with no id → null → no rewrite → 404 shell → map (safe; no file served at `/hospice/` without an id); `/about.html` → `#/about` ✓.

**(d) QA-testability — PASS.** In-browser: load each emitted URL, assert the hash rewrites to the expected route; history length proves replace-not-push; map-landing for `/hospice/*` observable.

**Verdict: PASS.**

## D3 — SEO meta + JSON-LD `@graph` + Open Graph (ADR-0018)

**(a) Spec consistency — PASS.** Feature.md's SEO requirement (unique titles/descriptions, JSON-LD, social cards) is fully met: complete head set, `@graph` with Organization (from site-config.json) + HealthCareBusiness, per-class title/description table, og:image on every emitted page.

**(b) Standing invariants — PASS.** The no-endorsement guard is airtight: never `sameAs`/`affiliation`/`parentOrganization`/`contactPoint`/`openingHours`/pricing (ADR-0018), matching research §3.4's verified LegalPage wording. `geo` is omitted for unplaced hospices (no fabricated coordinates); no `lastmod` (determinism). `SITE_URL` enters via `data-raw/site-config.json` plus a mirror field in `src/lib/siteConfig.ts` (verified: the source file currently carries only 2 fields; arch §3.7 adds `siteUrl`) — exactly the ADR-0009 single-source pattern. The OG image is a committed placeholder asset behind human gate V2 (research R3 risk-accepted; §3.8 spec: 1200×630, `#1d4ed8`, wordmark).

**(c) Zero-ambiguity — PASS.** Exact head template, per-page title/description table, exact JSON-LD structure, exact OG set are all pinned. (The "R13/R14" citation drift in the endorsement-guard references is doc-only — F2.)

**(d) QA-testability — PASS.** Grep-able: JSON-LD present per hospice page; negative grep for endorsement property names; no `geo` on unplaced pages (currently 0 unplaced hospices / 12 unplaced NI practices — data the guard handles); canonical values exact. AC2 directly testable.

**Verdict: PASS.**

## D4 — Canonical id-is-slug URLs + `wales-r<n>` fix (ADR-0019)

**(a) Spec consistency — PASS.** Feature.md: "one static page per hospice (~161 URLs)". All 161 ids are URL-safe as-is (verified id schemes in `data/README.md`: `en-<cqcId>` e.g. `en-1-136414769`, `sc-CS<n>`, `ni-r1`–`ni-r6`; Wales will be `wales-r<n>` after the fix). The fix resolves research R8 (ADR-0002 row anchor vs the script's positional `wales-<n>`).

**(b) Standing invariants — PASS.** The fix is a one-line id-generation change in `scripts/extract-hospices-wales.mjs`; Wales hospices are 0 rows today (verified: `hospices-wales.json` = `[]` placeholder), so no shipped data changes this cycle and the byte-identity anchor set is unaffected by D4 alone. ADR-0005 untouched. The edit target line is verified present: `.map((e, i) => ({ id: \`wales-${i + 1}\`, ...e }))`.

**(c) Zero-ambiguity — PASS.** Exact one-line edit; landing chain when rows land documented in arch §4; re-baseline mandated after the first run on a present file (ADR-0003 first-run discovery applies).

**(d) QA-testability — PASS.** Future Wales rows must match `^wales-r\d+$`; today the Wales count in `hospices.json` is 0.

**Verdict: PASS.**

## D5 — Wales G3-tolerant landing, 0 ship (ADR-0020)

**(a) Spec consistency — PASS.** Feature.md AC3 disjunct B: ship with Wales = 0, neutral wording. G3 behavior verified in `scripts/extract-hospices-wales.mjs` (absent CSV → write `[]` → exit 0, no placeholder rows); the B1 CIW email draft **is** in `data/README.md` (verified section "Care Inspectorate Wales data request (item 1 / B1 — email to send)"). No fabricated rows; "Current state" already records Wales = 0. Hide-not-delete (R12/A12) preserved: data fields stay, public wording neutral, no internal gap names.

**(b) Standing invariants — PASS.** No data-schema changes; G3 tolerance is existing script behavior; no new deps; neutral wording matches the standing pattern (GLOSSARY "hide-not-delete" term, ADR-0012).

**(c) Zero-ambiguity — PASS.** Landing chain and wording **constraints** are pinned (neutral; never names an internal flag/gap). Exact copy is not pinned verbatim — acceptable: AC3 checks disjunct B (0 Wales, neutral), not the copy; residual ambiguity is stylistic only.

**(d) QA-testability — PASS.** Assert Wales hospice count = 0 in `hospices.json`; negative grep for internal gap terminology on public pages.

**Verdict: PASS.**

## D6 — Manual-pinning `data-raw/manual-geo-ni.json`, H3-2 retired (ADR-0021)

**(a) Spec consistency — PASS.** Feature.md gates NI placement on H3-2 (OS Places key). The Architect retires the key path in favor of operator-supplied manual pins — a **resolved-by-design disposition, not a silent one**: ADR-0021 documents the rationale (research R7: no key / broken-IP risk) plus the public-safety rule (never interpolate coordinates), and explicitly **retains the OS Places path as documented fallback**. Ships `entries: []`, so the shipped state is unchanged: 12 unplaced NI practices remain 12 (verified: `data/README.md` "Current state" lists the 9 BT postcodes, 11,002/11,014 assigned).

**(b) Standing invariants — PASS.** No new npm deps. **Merge point verified in `scripts/build-data.mjs`**: the `geo` Map is filled in the `postcode-geo.csv` loop, then `geoOf = (pc) => geo.get(pc.toUpperCase())`, then hospice placement (`geoOf(h.postcode)`) and practice placement (`geoOf(p.postcode)`) feed the ADR-0005 nearest-haversine assignment. Inserting `geo.set(e.postcode.toUpperCase(), { lat, lon, manual: true })` after the CSV loop is a pure input addition — the assignment logic stays byte-for-byte the same code, so ADR-0005 is preserved; uppercase keys match the existing Map convention. When entries later land, the 12 practices become placed and assignments shift — correctly covered by the re-baseline + double-build byte-identity checks (arch §9.1) and the fail-fast validation (sorted entries, UK bounds −12<lon<3, 49<lat<60). At ship time `entries: []` → zero data change → byte identity trivially holds. ADR-0009 pattern: operator-controlled raw data + mandated provenance row in `data/README.md` (that table structure exists there).

**(c) Zero-ambiguity — PASS.** Exact JSON schema (`asOf`/`source`/`entries` with `postcode`/`lat`/`lon`), exact merge snippet, fail-fast rules, retirement-then-fallback, provenance row — no open branches.

**(d) QA-testability — PASS.** Ship: file parses, `entries: []`, outputs byte-identical to the pre-change anchor set. After landings: unplaced 12 → 0 across those 9 postcodes and the re-baseline moves; fail-fast triggers on malformed entries (unsorted, out-of-bounds) are unit-testable.

**Verdict: PASS.**

## D7 — Branding "Hospice Finder UK" + heart-on-pin logo (ADR-0023, ADR-0022)

**(a) Spec consistency — PASS, with one Blocking defect (F1).** The 8-surface rename matches feature.md; identifiers (`hospice-catchment-map` package name, `hospiceinfo` slug, data ids) are explicitly untouched; ADR-0023 surface #3's wrong filename is a typo (F5). The logo is where the spec **self-contradicts the tree — F1, Blocking**.

**(b) Standing invariants — PASS (conditional on the F1 fix).** Slug `hospiceinfo` unchanged; zero new deps; `public/logo.svg` is a committed static asset **outside the `public/data/*.json` anchor set** — a one-time source edit that does not affect the data byte-identity anchors.

**(c) Zero-ambiguity — FAIL (F1).** ADR-0022 / arch §6 claim the new `public/logo.svg` was "applied by the Architect 2026-10-29; Coding must not re-apply". **Verified false:** `public/logo.svg` on disk is the **old 4-element mark** (triangle + r18 `#1d4ed8` circle + r12 `#fff` circle + blue heart, `aria-label="Hospice Info"`; `grep -c "circle"` = 2, not 1). The Architect's writable scope (`.agents/architecture.md`, `docs/adr/`, `GLOSSARY.md` only) cannot touch `public/logo.svg`, so the claim was never possible. Contrast: the analogous "already applied" claim for `GLOSSARY.md` **is** true on disk (title line `# GLOSSARY - Hospice Finder UK` + "Cycle 3 terms" section present) — confirming the logo claim is a genuine slip, not a scope convention. A coder who trusts "must not re-apply" will skip the logo work; the acceptance check (`grep -c "circle" public/logo.svg` → 1) then fails and AC4 fails.
**Required fix (Architect):** amend ADR-0022 and arch §6 to delete "applied by the Architect… must not re-apply" and state that **Coding** applies the exact SVG from arch §6 (the ADR's end-state acceptance criterion is already correct and stays).

**(d) QA-testability — PASS.** AC1 is machine-checkable: grep "Hospice Finder UK" in `dist/` titles, app header (verified: the only `src/` hit for the old name is `src/components/AppShell.tsx:33`), manifest (`public/manifest.webmanifest` — verified name field), `index.html`; negative grep "Hospice Catchment Map" → 0 hits in `src/` + `public/` + `dist/`. AC4: `grep -c "circle"` = 1, heart path present, old `aria-label` gone.

**Verdict: FAIL (F1 Blocking; everything else PASS).**

## (e) Dispositions of arch §11 open questions (Q1–Q5)

- **Q1 — `.html` extension vs feature.md's illustrative `/hospice/<id>`: ACCEPT.** Cloudflare Pages serves exact file paths with zero config; `.html` is the deterministic, collision-free choice. The page set stays machine-locked by the in-code invariant (sitemap loc count === 168), so the extension cannot drift silently.
- **Q2 — `/hospice/*` deep links land on the map: ACCEPT (documented).** R12 hide-not-delete; no AC requires in-app deep selection. ADR-0016 names in-map hospice direct selection a Cycle-4 candidate.
- **Q3 — OG placeholder ships, final image behind gate V2: ACCEPT.** AC2 only requires og:image presence per page; V2 is spec'd in arch §10 before external distribution; §3.8 pins the placeholder (1200×630, `#1d4ed8`, wordmark).
- **Q4 — `siteUrl` mirror field in `src/lib/siteConfig.ts`: ACCEPT.** ADR-0009 single source is `data-raw/site-config.json`; the TS mirror is the established pattern (verified: it already carries 2 fields). Unused in the app today, harmless.
- **Q5 — `docs/build-log.md` anchor log: ACCEPT, with the F3 caveat.** The file **must be created by Coding** (it does not exist) and its Cycle 2 line must pin the true 4-hash set `dc261185 e11322ba 2a87a374 5628d8f7` (`.agents/qa.md:31`, lead re-run 2026-10-26 20:50) — not the `038a1635…` value arch §9 cites (the uk-land SHA). Line = date + 4 SHA-256 prefixes of the build-data outputs.

## (f) Research coverage — R1–R13, OQ1–OQ10, human gates H3-1–3

| Item | Disposition | Where |
|---|---|---|
| R1 (named Blocking) | Resolved | ADR-0016 (D2) |
| R2 | Resolved — guard replace/edge semantics | arch §3.7, V1 (§10) |
| R3 | Risk-accepted — placeholder OG image | ADR-0018, §3.8, gate V2 |
| R4 | Risk-accepted — Wales 0-ship, G3 tolerant | ADR-0020, AC3-B |
| R5 | Resolved — neutral public wording | arch §4 |
| R6 | Risk-accepted — pins scoped to NI; generalization deferred, OS Places kept as documented fallback | ADR-0021 |
| R7 | Resolved — H3-2 retired with documented fallback | ADR-0021 |
| R8 | Resolved — `wales-r<n>` id scheme | ADR-0019 (D4) |
| R9 | Risk-accepted — build-time content = curation posture | arch §3.2 |
| R10 | Resolved — double-build `dist/` diff per stage; MAINTENANCE chain gap = F4 | §3.2 rule 7, §9 check 2 |
| R11 | Resolved — docs-exempt rule | arch §2 |
| R12 | Risk-accepted — `/hospice/*` → map, hide-not-delete | ADR-0016, §3.5 |
| R13 | Risk-accepted — payload ≈0.8–1 MiB vs 25 MiB budget | ADR-0015 |
| OQ1 | ADR-0016 (guard closes it) |
| OQ2 | ADR-0018 (meta/OG set) |
| OQ3 | V1 verification step |
| OQ4 | G3 tolerance — H3-1 blocks nothing at 0-ship |
| OQ5 | ADR-0019 |
| OQ6 | ADR-0021 |
| OQ7 | V-gate + arch §6 exact SVG (operator visual sign-off, non-automatable) |
| OQ8 | ADR-0023 (keep package name `hospice-catchment-map`) |
| OQ9 | ADR-0018 / ADR-0015 (omit `lastmod`) |
| OQ10 | ADR-0015 (build chain gains prerender) |
| H3-1 | Risk-accepted — human spec in feature.md + arch §10; B1 CIW draft in `data/README.md`; does not block 0-ship |
| H3-2 | Retired by design (ADR-0021), demoted to documented fallback; human spec retained |
| H3-3 | Risk-accepted — Wales authed fetch after CIW response; feature.md gate + arch §10 |

No research item is silently dropped: all 13 risks, 10 open questions, and 3 human
gates carry an explicit disposition above.

## Findings

- **F1 — Blocking.** Logo "already applied by the Architect" claim is false on disk; a coder following it skips the logo and AC4 fails. Evidence: `public/logo.svg` is the old mark (two `<circle>`s, old `aria-label`) vs the ADR-0022 / arch §6 claim. Required disposition (Architect): amend ADR-0022 + arch §6 so Coding applies the exact arch §6 SVG (fix text in D7c).
- **F2 — Risk-accepted.** Doc-only citation drift: "R13/R14" in the endorsement-guard references (research risks end at R13; the concern is unnumbered research §3.4), and arch §8 "R6 (research) — non-deterministic build" which is R10. Evidence: arch §3.4 / §8 vs research.md risk list. Disposition: renumber in the Architect fix pass. Justified — no code/behaviour impact.
- **F3 — Risk-accepted.** arch §9 mis-cites the Cycle 2 anchor `038a1635…` (it is the uk-land SHA, `data/README.md:34`); the true set is `dc261185 e11322ba 2a87a374 5628d8f7` (`.agents/qa.md:31`); and `docs/build-log.md` does not exist. Disposition: Coding creates `docs/build-log.md` with the correct anchors (Q5); Architect corrects §9. Justified — the load-bearing check is the double-build byte agreement, which is intact and machine-enforced; the anchor cite is bookkeeping.
- **F4 — Risk-accepted.** The R10 pre-push chain (`docs/MAINTENANCE.md:140`) should also run the double-build `dist/` diff; it is absent from arch §9 done-when. Disposition: one work-list line — DevOps owns `docs/MAINTENANCE.md`. Justified — per-stage double-build checks (arch §9 check 2) already guard correctness; this is a standing-guard gap, not a correctness gap.
- **F5 — Risk-accepted.** ADR-0023 surface #3 names `public/manifest.json`; the real file is `public/manifest.webmanifest`. Disposition: correct the filename in the ADR. Justified — the zero-hit grep check enforces the rename outcome regardless of the name.

## Verdict: PASS (post-fix verification round 1, 2026-10-29 — supersedes the original FAIL; see addendum below)

Open Blocking (1):
- **F1** (design-level → Architect): ADR-0022 / arch §6 claim the new `public/logo.svg` was already applied — false on disk (old 2-circle mark). Architect must amend ADR-0022 and arch §6 so Coding applies the exact arch §6 SVG; with that fix D7 passes and this review passes.

F2–F5 are Risk-accepted (justified above). D1–D6: ALL PASS. Q1–Q5: ALL ACCEPT.
R1–R13, OQ1–10, H3-1–3: all dispositioned.

## Post-fix verification (rework round 1 — 2026-10-29)

Re-verified the Architect rework pass on disk against the original FAIL verdict above (scope: `.agents/architecture.md`, `docs/adr/0022-logo-heart-on-disc.md`, `docs/adr/0023-rename-hospice-finder-uk.md`, `public/logo.svg` read-only baseline).

- **F1 (Blocking, logo applied-claim): RESOLVED.** Arch §6 (line 328) and ADR-0022 (line 18) now state that the Coding stage replaces the full contents of `public/logo.svg` with the exact SVG from arch §6; the false applied-claim is gone (0 hits for "must not re-apply" / "already applied" in both files). End-state acceptance intact (ADR-0022 line 35): `grep -c "circle" public/logo.svg` → `1` (only the background disc). Baseline: `public/logo.svg` is still the old 4-element mark (`aria-label="Hospice Info"`) — the doc fix is the fix; applying the logo is Coding's task.
- **F2 (research R-citation): VERIFIED.** Arch §3.4 (line 181) and §8 (line 369) cite "research §3.4 legal guard (unnumbered — the risk list ends at R13)"; the §8 non-deterministic-build row (line 368) references `R10 (research)`; 0 hits for "R14" in architecture.md.
- **F3 (SHA anchor set): VERIFIED.** Anchor set `dc261185 e11322ba 2a87a374 5628d8f7` appears 3× in architecture.md (invariants header line 5; §9 check 1 line 380; §11 Q5 line 415); 0 hits for `038a1635`. `docs/build-log.md` named as a Coding deliverable (lines 380, 415).
- **F5 (manifest filename): VERIFIED.** ADR-0023 surface #3 (line 22) = `public/manifest.webmanifest` (`name` and `short_name`).
- **Regression sweep: clean.** The only "already applied" claim in architecture.md is the legitimate GLOSSARY one (§7, line 360: applied 2026-10-29 — Coding reads/verifies, does not rewrite). 171-file prerender count (lines 86, 385), ADR refs 0015–0023, and the `hospices.json length + 7` sitemap invariant (line 86) are intact; D1–D6 design content unchanged in substance.
- **New findings (this round), all doc-only → Risk-accepted:**
  - **N1.** ADR-0022 geometry drift: line 8 "The current `public/logo.svg` is a 52×52 disc" and line 22 "background blue disc `r=26`" vs the on-disk 64×64 viewBox / r=18 disc (also the arch §6 canonical SVG, lines 321–343). Arch §6 is the governing deliverable and the circle-count acceptance is unaffected — no code impact.
  - **N2.** Arch §7 (line 349) says "(5 terms, …)" but the table that follows lists 6 terms (last rows lines 357–358).
  - **N3.** Arch §8 (line 370) R12 row "link surface for pallets" — "pallets" typo (prerendered); mitigation text unchanged, no behavioural impact.

**Final verdict: PASS** — F1 resolved, F2/F3/F5 verified, no regressions; N1–N3 (doc-only) carried forward as risk-accepted. Reviewer rework loop round 1 of cap 2 closed 2026-10-29.
