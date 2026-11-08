# ADR 0032 — PalliativeCare Scotland append: `sc-pcs-<NN>` ids and equivalence-mapping dedupe

**Status:** accepted (2026-11-08)

## Context

Cycle 5 lands the PalliativeCare Scotland directory
(`data-raw/palliativecare-scotland-hospices-2026-11.html`, Wayback pin
20260514160126, 17,723 B) on top of the 32-row register
(3 GIS + 29 OSCAR, ADR-0031). The raw carries 19 linked entries
(`<a href="/content/services_by_nhs_board/?id=NN">Name, Town</a>`) plus 2
CHAS children's hospices in a non-linked `<strong>` block (Rachel House,
Kinross; Robin House, Balloch — already present as `sc-oscar-r28`/`r29`).

Two failures forced this ADR:

1. **A 2026-11-08 12:53 partial landing.** An extractor run with a
   whitespace-sensitive regex matched only 3 of the 19 linked entries and,
   by coincidence of its `added === 2` guard, appended `sc-pcs-76`
   ("Ayrshire Hospice", Ayr) and `sc-pcs-75` ("Margaret Kerr Unit", Melrose).
   Both are entities already in the register under different names. **They
   are retracted** (removed in the Cycle 5 landing pass; the pre-image,
   rows 1–32, is the oracle).
2. **Strict string dedupe miscounts.** Casefolded full-name equality flags
   15 of the 19 entries as gaps because the register carries legal suffixes
   and parenthetical towns (`Ardgowan Hospice Ltd` vs `Ardgowan Hospice`,
   `Victoria Hospice (Kirkcaldy)` vs `Victoria Hospice`, …). Accepting all
   15 would put 13 duplicate facilities on the map — a product defect.

## Decision

1. **Id scheme: `sc-pcs-<NN>`** (NN = the PCS directory service id from the
   link, e.g. `sc-pcs-30`, `sc-pcs-58`). A distinct namespace beside
   `sc-CS*` and `sc-oscar-*` (third factor of ADR-0031's §3 register-separation
   rationale: PCS service ids are a third register's id space).
2. **Dedupe by explicit equivalence mapping.** An entry is appended iff its
   name is not casefolded-equal to an existing name AND its PCS id is not in
   the mapping table below (13 entries; the 4 strict-equality covers —
   ids 43, 5, 52, 72 — need no mapping). The table is the curator's
   decision of record, one row per equivalent pair:

   | PCS id | PCS entry | Equivalent existing row | Basis (name, town) |
   |---|---|---|---|
   | 19 | Roxburghe House, Dundee | `sc-oscar-r21` | name; Dundee |
   | 44 | St Vincent's Hospice, Johnstone | `sc-oscar-006888` St Vincents Hospice Limited | name, apostrophe/limit suffix |
   | 45 | Ardgowan Hospice, Greenock | `sc-oscar-011541` Ardgowan Hospice Ltd | name, Ltd suffix |
   | 50 | Prince & Princess of Wales Hospice, Glasgow | `sc-oscar-012372` | name, "the" casing |
   | 51 | Marie Curie Hospice, Glasgow | `sc-oscar-r27` | name, parenthetical town |
   | 57 | Victoria Hospice, Kirkcaldy | `sc-oscar-r18` | name, parenthetical town |
   | 61 | Dumfries Specialist Palliative Care Unit, Dumfries & Galloway Royal Infirmary | `sc-oscar-r23` Dumfries & Galloway Hospice | hospital unit; D&G hospice row is the hospice of record |
   | 63 | Bethesda Hospice, Stornoway | `sc-oscar-015783` Bethesda Care Home and Hospice | name, "Care Home and" |
   | 67 | St Columba's Hospice, Edinburgh | `sc-oscar-003634` St.Columba's Hospice Care | name, punctuation |
   | 68 | St Andrew's Hospice, Airdrie | `sc-oscar-010159` St Andrew's Hospice (Lanarkshire) | name, parenthetical county (Airdrie ∈ Lanarkshire) |
   | 70 | Roxburghe House, Aberdeen | `sc-oscar-r20` | name; Aberdeen |
   | 75 | Margaret Kerr Unit, Melrose | `sc-oscar-r22` Margaret Kerr Hospice (Melrose) | name; Melrose |
   | 76 | Ayrshire Hospice, Ayr | `sc-oscar-011390` The Ayrshire Hospice | name, "the" |

   The two unmapped entries are the append delta (exactly 2):
   **`sc-pcs-30`** "Marie Curie Hospice", Edinburgh and **`sc-pcs-58`**
   "Queen Margaret Hospital Hospice Ward (Ward 16)", Dunfermline.
3. **Merge provenance: `sc-pcs-` routing.** `merge-hospices.mjs` gains a
   `SOURCES.scPcs` string (the PCS page URL + pin) selected by the
   `sc-pcs-` id prefix — ADR-0009 provenance discipline (rows must not be
   stamped with the GIS string).
4. **Row shape:** `{id, name, address: [], town, postcode: ''}` — mirrors
   the OSCAR appends (ADR-0031 D4); unplaced rows hidden by ADR-0012 until
   geocoding lands (towns Edinburgh / Dunfermline carry no postcode; the
   geocoder is a no-op for them).

## Alternatives considered

- **Strict casefolded full-name dedupe** (no mapping): rejected — 15 of 19
  entries would append, duplicating 13 facilities on the map.
- **Substring/containment dedupe:** rejected — `Marie Curie Hospice` matches
  both Glasgow and Edinburgh rows and would wrongly suppress the Edinburgh
  append (id 30).
- **Replace mode** (rewrite `hospices-sc.json` from PCS): rejected — destroys
  the register rows the published map is keyed on (ADR-0031); append-mode
  preserves identity.

## Consequences

Scotland: 32 → **34 rows** (3 GIS + 29 OSCAR + 2 PCS); merged total
161 → **192** (en 152, sc 34, ni 6, wales 0 per ADR-0020). The ~40 target
(ADR-0031, an expectation, never a gate) remains unmet — the OSCAR register
is the population; PCS adds only the 2 facilities OSCAR lacks. The 12:53
rows `sc-pcs-76`/`75` never enter any committed state. If Pins drift, the
extractor's delta guard (exactly 2, else exit 1) blocks the landing.
