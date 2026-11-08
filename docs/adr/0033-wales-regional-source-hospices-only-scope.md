# ADR 0033 — Wales: five NHS Wales P&I regional sub-pages as primary raw, hospices-only scope

**Status:** accepted (2026-11-08)

## Context

Cycle 5 landed Wales as a G3 zero-set (`hospices-wales.json = []`, total 192,
`wales=0` per ADR-0020 G3): the designated raw — the NHS Wales Performance &
Improvement (P&I) page "Hospices and palliative care services"
(`data-raw/nhs-wales-hospices-2026-11.html`, fetched 2026-11-08, 7 attempts,
consistently 61,851–61,852 B) — carries breadcrumb + h1 only ("this section is
currently under review"), no hospice list.

James (site owner) then supplied the **five regional sub-pages** of the same
section, which carry the real content:

* `.../hospices-and-palliative-care-services/north-wales/`
* `.../hospices-and-palliative-care-services/mid-and-west-wales/`
* `.../hospices-and-palliative-care-services/south-wales-west/`
* `.../hospices-and-palliative-care-services/south-wales-central/`
* `.../hospices-and-palliative-care-services/south-wales-east/`

Fetched 2026-11-08 and pinned as
`data-raw/nhs-wales-hospices-2026-11-{north-wales,mid-and-west-wales,south-wales-west,south-wales-central,south-wales-east}.html`
(SHA-256 recorded in the cycle ledger). Two properties of the raws shape this
ADR:

1. **Data is not in an HTML table.** Each page embeds its service list as
   `var mapPlots = '<JSON>';` — a single-quoted JS string containing a JSON
   array of `{id, postcode, title, url}` (31 entries across the five pages).
2. **The list mixes independent hospices with hospital-based palliative care
   services**: 31 = 17 hospices + 14 hospital-based entries (SPCTs, acute
   hospitals, named units — including Welsh names without the English word,
   e.g. `Ysbyty Ystrad Fawr`, `Y Bwthyn Unit`).

The owner directive (2026-11-08): **land the independent hospices only**
("~18"; exactly 17 per the raws), with an explicit in-script exclusion for the
hospital-based entries — not the full 31.

## Decision

1. **The five regional pins are the primary raws** of
   `extract-hospices-wales.mjs`. The parent pin and the HHW CSV/HTML pins are
   demoted to a **legacy fallback chain consulted only when 0/5 regional pins
   are present**, with their existing G3 zero-set semantics unchanged (all
   absent → `[]` + exit 0).
2. **Parse `mapPlots`, not tables.** One regex
   (`/var mapPlots\s*=\s*'([\s\S]*?)';/`), then `JSON.parse`. A present raw
   with a missing marker, invalid JSON, or an empty array → **exit 1** (stale
   pin, fail-fast — never a silent zero-set).
3. **Hospices-only scope via additive-negative tokens.** A row is excluded iff
   `EXCLUDE_TOKENS = /hospital|ysbyty|spct|unit/i` matches the **full title**
   (`ysbyty` = Welsh "hospital", so `Ysbyty Ystrad Fawr` is excluded). There is
   deliberately **no "hospice" substring whitelist**, so Welsh-language names
   that lack the English word — `Tŷ Hafan`, `Y Rhosyn`, `Hosbis Hafren` — are
   never filtered out. Every kept row and every excluded row is logged for
   human verification (ADR-0003).
4. **Fail-fast partial pin set.** 1–4 of 5 pins present → **exit 1** listing
   the missing paths (a whole region must not be dropped silently); 0/5 → the
   legacy chain; 5/5 → the regional parse, which itself exits 1 if the scope
   filter leaves zero rows.
5. **Id allocation: `wales-r<n>`, n = 1-based position in fixed regional
   order** (north → mid-west → south-west → south-central → south-east),
   i.e. the order of `REGIONAL_RAW` is the id-allocation oracle. Row shape
   `{id, name, postcode}`; postcode upper-cased and whitespace-normalised.
   Row anchors remain UNVERIFIED (ADR-0002).

## Alternatives considered

* **Land all 31 entries:** rejected by the owner (2026-11-08) — hospital-based
  services are not hospices and would misrepresent the catchment map.
* **Re-fetch the Hospice Health Wales route** (the pre-Cycle-5 gate H5-1):
  rejected — the domain is dead and the designated source is NHS Wales P&I.
* **HTML table parse:** not applicable — the regional pages carry no `<table>`;
  the list is the embedded `mapPlots` JS array.
* **"hospice" substring whitelist for keeping:** rejected — it would silently
  drop Welsh-language names (`Tŷ Hafan`, `Y Rhosyn`, `Hosbis Hafren`,
  `Ty Bryngwyn`, `Paul Sartori House` …) lacking the English word.

## Consequences

* Wales: 0 → **17 rows** (`wales-r1`–`wales-r17`); merged total 192 → **209**
  (en 152, sc 34, ni 6, wales 17).
* Every kept row carries a postcode → `geocode-postcodes.mjs` gains 17 new
  postcodes (LL*/SY*/SA*/CF*/NP* plus `HR1 4HA`). `HR1 4HA` (St Michaels
  Hospice) is a **Hereford (England)** postcode for a service listed under
  Wales mid-and-west; the geocoder's `countrycodes=gb` resolves it, and the row
  is kept as published by the designated source.
* `south-wales-central` contributes **zero kept rows** (all 3 entries are
  excluded units) — expected, and logged; the pin is still consulted, so a
  future listing change in that region is picked up.
* `St Michaels Hospice` is kept exactly as published (no apostrophe in the raw
  title).
* The parent pin stays on disk as the 0/5 legacy fallback; the ADR-0020 G3
  zero-set semantics of the legacy chain are untouched.
