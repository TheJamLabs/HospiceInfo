# Feature: Cycle 6 — Border fixes, postcode search, children's mode

Four issues reported by the site owner against the live site (published
`416d28a`, now at `f141a71` locally):

1. **Northern Ireland — catchment borders extend outside NI.** "In Ireland
   ensure the borders don't extend outside of Northern Ireland."
2. **Scotland — catchment borders don't fit together well.** "The Scottish
   hospice area borders don't butt up against each other particularly well."
3. **Postcode search fails.** "Find by postcode doesn't work."
4. **Children's mode.** "Children's hospices should be hidden by default,
   when shown, hide adult hospices, they're completely separate as are the
   catchment areas, etc."

Items 1–3 are bugfixes; item 4 is a feature (data + schema + UI). The data
chain invariants carry over: `npm run build-data` (fail-fast, byte-identical
re-run), `node scripts/validate-tessellation.mjs` exit 0 (~110s),
`npm run build` byte-identical two runs, prerender `<loc>` count = data
count + 7. No new runtime dependencies.

## James's scope decisions (2026-11-08)

- **Worktree**: the uncommitted ADR-0033 Wales landing was committed first
  (its own commit `f141a71`); Cycle 6 starts on a clean tree. Push remains
  James's human gate (branch 1 ahead of `origin/main` until he runs it).
- **St Andrew's Hospice (Grimsby, "Adult and Children's Services")** →
  shown in **BOTH modes** (adult AND children's), with its catchment in
  both.
- **Children's Hospices Across Scotland** (`sc-oscar-019724`, umbrella org,
  no town) → **removed from the data entirely** (not a hospice; an
  artefact of parsing the OSCAR list).

## The children's set (20 rows after CHAS removal)

Rows whose name matches `/children/i` (Research must verify this list
exactly and flag any doubtful membership):

| id | name | notes |
|---|---|---|
| en-1-117648999 | Francis House Children's Hospice (Manchester) | |
| en-1-116772470 | Claire House Children's Hospice (Wirral) | |
| en-1-110304719 | Bluebell Wood Children's Hospice (Sheffield) | |
| en-1-119796870 | St Andrew's Hospice, Adult and Children's Services (Grimsby) | **both modes** |
| en-1-120599968 | Haven House Children's Hospice (Woodford Green) | |
| en-1-122038149 | Rainbows Hospice for Children and Young People (Loughborough) | |
| en-1-129536667 | Hope House Children's Hospice (Oswestry) | |
| en-1-442758792 | Forget Me Not Children's Hospice (Huddersfield) | |
| en-1-119107844 | Demelza, Hospice Care for Children - SE London | |
| en-1-3969537495 | Alexander Devine Children's Hospice Service (Maidenhead) | |
| en-1-111584886 | Christopher's Children's Hospice (Guildford) | |
| en-1-112108967 | Naomi House Children's Hospice (Winchester) | |
| en-1-116804848 | Milton Children's Hospice (Cambridge) | |
| en-1-113884204 | Acorns Children's Hospice in Birmingham | |
| en-1-8209602845 | Noah's Ark - The Children's Hospice (Barnet) | |
| en-1-125645846 | Little Havens Children's Hospice (Benfleet) | |
| en-1-114396298 | Derian House Children's Hospice (Chorley) | |
| sc-oscar-r28 | Rachel House Childrens Hospice (CHAS) (Kinross) | |
| sc-oscar-r29 | Robin House Childrens Hospice (CHAS) (Balloch) | |
| ni-r3 | Northern Ireland Childrens Hospice (10668) | **town blank in data** — needs a display town (gate) |

Removed: `sc-oscar-019724` (CHAS umbrella) — 21 → 20 rows.

## Agreed scope

1. **C6-1 NI border clip** — Northern-Ireland catchment cells must not
   extend into the Republic of Ireland. Research establishes how the build
   chain currently clips cells (land mask `data-raw/uk-land.json` vs the
   box) and identifies the correct NI-region clip (candidate: the OSM
   `INTL`/NI–ROI boundary; ODbL attribution required if a new source is
   pinned). The fix stays in the build chain (deterministic), not the
   frontend. The validator's `ni-r5` empty-cell signal (no land in box)
   is part of the same investigation.
2. **C6-2 Scotland border fit** — diagnose why Scottish catchment borders
   don't butt up tightly: measure per-pair overlap on SC cells, check
   multi-ring cell unions, near-duplicate/nearby source points (current
   validator: total pairwise overlap 0.0269 deg², up from 0.0060 after
   the Wales landing; worst pair St Michael's vs St Michaels 0.0136), and
   the renderer's cell drawing. Fix must keep the tessellation validator
   green and measurably improve the SC fit metric it reports.
3. **C6-3 Postcode search** — reproduce "Find by postcode doesn't work"
   against `public/data/practices.json` (11,002 geocoded practices,
   unit-level postcode key in `StartHere.tsx`) and the deployed site;
   identify the root cause (exact-match gap, input constraints, data
   coverage) and fix it so a realistic user postcode resolves to the
   correct practice → hospice, with the not-found path preserved for
   genuinely unmapped postcodes. New tests for the lookup.
4. **C6-4 Children's mode** —
   - **Data/schema**: children's designation on hospice rows; the 20-row
     set above; St Andrew's dual-listed; CHAS removed from
     `hospices-all.json` (and its id asserted gone at merge). 208 hospice
     rows expected after removal (209 − 1).
   - **UI**: toggle, children's hidden by default; when children's mode is
     shown, ALL adult hospices are hidden (replacement, not additive);
     catchments, list, and associated views are consistent per mode.
   - The children's designation is a data flag; the frontend derives both
     mode views from it. Hide-not-delete-public discipline: no public
     surface exposes an internal flag, and no mode shows unassigned
     posts, offline rows, or null-hospiceId entries.
   - ADR records the design decision (flag shape, St Andrew's dual
     listing, scrim semantics).
5. **Chain green, byte-identical, no new runtime dependencies**;
   `data/README.md` updated for the CHAS removal and any new source pin;
   GLOSSARY.md updated for the children's-mode vocabulary if introduced.

## Acceptance criteria

- **C6-1**: no NI-labelled cell polygon intersects the ROI side of the
  NI–ROI boundary (validator or a new check reports this);
  `validate-tessellation.mjs` still exit 0; en/sc/wales cells unchanged by
  the clip.
- **C6-2**: the tessellation validator reports a reduced pairwise-overlap
  figure for SC cell pairs after the fix (Research sets the measurable
  bar; at minimum the worst SC pair improves over the 0.0136/0.0269
  baseline); no visible gaps between adjacent Scottish cells on the map.
- **C6-3**: sampled real postcodes (including the owner's test case if he
  supplies one) resolve to the correct hospice; mixed-case / no-space
  input works; a genuinely unmapped postcode still shows the existing
  not-found path; unit tests cover normalise + lookup + not-found.
- **C6-4**: default view shows only adult hospices; the toggle to
  children's mode hides every adult row (St Andrew's remains, as it is
  dual-listed); the 20-row set renders; CHAB/CHAS is absent from all data
  outputs and the merge asserts it; counts in `data/README.md` and the
  ledger reconcile (208 total rows; PR/SD gates); prerender + sitemap
  counts reconcile with the new data count (+7 invariant).
- **All items**: two consecutive `npm run build` runs are byte-identical;
  `npm run build-data` re-run is byte-identical; ADRs landed under
  `docs/adr/` for C6-1 (clip) and C6-4 (children's mode); docs updated
  from DevOps's ops plan.

## Out of scope

- Sourcing official catchments (the approximation line stays).
- Adding/removing other hospices beyond the CHAS removal.
- Changes to the Wales/Scotland/N.I. enumeration sources.
- New runtime dependencies.
- Search-beyond-postcode (e.g., free-text address geocoding) unless
  Research proves the postcode failure is only fixed that way AND the
  owner approves.

## Human gates

1. **Push** — commit+push of the Cycle 6 ship commit (James runs it;
   Cloudflare Pages auto-deploys `dist/`, ADR-0014).
2. **Children's roster confirmation** — if Research flags any of the 20
   rows as doubtful (or finds additional children's rows the name match
   missed), the final list goes back to James. ni-r3's blank town needs a
   display value from James (or a source pin).
3. **Postcode test case** — if James can supply the exact postcode that
   failed for him, it becomes an acceptance test vector.
4. **CHAS removal** — already approved by James (gate resolved 2026-11-08).
5. **NI boundary source** — if a new ODbL source (e.g., OSM boundary) is
   pinned for the NI clip, the provenance pin follows the standard
   `data/README.md` discipline; no separate gate expected, surfaced for
   James at the ship gate.
