# QA — Stage 6/10 — HospiceInfo

- Date: 2026-10-22
- Method: RQ-1 — every claim verified on disk in this session; all evidence below is quoted command output or literal disk content read during this session. No git operations; no source modifications (only this file written; controlled A4 corrections.json trials fully reverted and re-verified byte-exact: 3 bytes, hex `5b5d0a`). No browser available in this environment — interactive checks are recorded as "requires browser environment", never as passed.
- Supersedes: the previous-cycle record (rework rounds 1–2, F-1/F-4 fix passes) is replaced in full; its durable outcomes are folded into a carry-forward section below after the gate results.

## A1 — build-data fail-fast + post-land byte-identity ritual

Status: **PASS (fail-fast verified; post-land byte-identity ritual run 2026-10-23 — results at the end of this section)**

`npm run build-data` (run in this session):

```
Output:
FAIL: land-mask unavailable (6/6 country files missing under data-raw/land-masks*).
The land-mask feature is not yet landed; refusing to synthesize a fake mask.
Land stage 3 and re-run in the Landing & Ops stage.
Exit Code: 1
```

Exit code 1 is the ADR-0006 by-design fail-fast — not a defect; nothing is fabricated.

Pre-land SHA-256 baseline (computed this session — the human's post-land comparison target):

| File | SHA-256 (pre-land, 2026-10-22) |
|---|---|
| `public/data/hospices.json` | `fced8491033dd5aaea092ef762b89152b7d5d4e0c5af82f1b1879ada34aa1af7` |
| `public/data/practices.json` | `ff24599d6938b4365379eef0cbcbfdc86862ef9c5c96b1d6a2ce52a01103a68d` |
| `public/data/catchments.json` | `581fceea3ae992eb9f06c250fc0a91e6b4cc3dfd6eee44404649393a62de80d2` |
| `public/data/shops.json` | `7e81df4c5e368c039010ad9551efa289f2d395e8f64db74b4e41d394d30d9f79` |
| `public/data/corrections.json` | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` (EXEMPT — curation artifact) |

Recorded counts at baseline: 138 shops (21 `outsideCatchment: true`), 9,564 practices (12 `hospiceId: null`), 155 hospices, 155 catchments.

Exact post-land ritual for a human (cannot be executed pre-land):
1. Land the stage-3 land-mask files under `data-raw/land-masks*` (6 country files per the fail-fast message).
2. Run `npm run build-data` twice, sequentially (determinism check).
3. Hash `public/data/{hospices,practices,catchments,shops}.json` (e.g. PowerShell `Get-FileHash -Algorithm SHA256 public\data\*.json`) and compare against the table above — all four must be byte-identical; `public/data/corrections.json` is EXEMPT.

**Post-land run (2026-10-23, `data-raw/uk-land.json` landed — single-file
mask, not the 6-country layout this text anticipated; ADR-0006 addendum
covers the in-memory DP simplification the mask went through on load):**

`npm run build-data` ran exit 0 twice, sequentially (after the clip-queue
fix). SHA-256 via Node `crypto` (PowerShell unavailable in this shell):

| File | Run 1 | Run 2 | vs pre-land baseline |
|---|---|---|---|
| `hospices.json` | `fced8491033dd5aaea092ef762b89152b7d5d4e0c5af82f1b1879ada34aa1af7` | **identical** | unchanged |
| `practices.json` | `ff24599d6938b4365379eef0cbcbfdc86862ef9c5c96b1d6a2ce52a01103a68d` | **identical** | unchanged |
| `catchments.json` | `f9bf1cde4d436ed369f54bcc00084a3c98e88fa07db432670c942f4d04b39d2f` | **identical** | **changed** (expected — cells now clipped to the coastline, not just the box) |
| `shops.json` | `7e81df4c5e368c039010ad9551efa289f2d395e8f64db74b4e41d394d30d9f79` | **identical** | unchanged |

Byte-identical across runs: PASS.

`node scripts/validate-tessellation.mjs` exit 0: sea leak 0.000390 deg²
total (worst cell: The Butterfly Hospice 0.000117 deg², sub-tolerance
clip seam); coverage 100.00% (42.1099 / 42.1090 deg²); pairwise overlap
0.0002 deg² (Wisdom, Rochester — two CQC location records for one
physical site; pre-existing data artifact, risk-accepted); empty cells:
1 (en-1-17708902164 "Hospice at Home"); slivers: 0.

Coastal spot-check (vertex-level: every catchment vertex against the mask):
85,602 vertices checked; 78,501 on/within-tolerance of the coast;
**0 violations** → "no sea in cells" holds at vertex level.

## A2 — Static tooltip verification

Status: **PASS**

Practice tooltip builder (`src/components/MapView.tsx` L242–247, read this session):

```tsx
{hosp ? (
  <span className="text-muted">
    <br />
    → assigned to {hosp.name}
  </span>
) : null}
```

- Assigned practice → `→ assigned to <hospice name>`; unassigned practice → name + address + postcode only (the `→` span renders `null`) — neutral, never names a catchment.
- Shop tooltip (`MapView.tsx` L137): `<span className="text-muted">→ {hospiceName}</span>` (the `→` in `src/` exists in exactly these two places — grep, this session).
- `grep_search "no catchment match|not geocoded"` over `src/`: **zero matches**.
- `unassigned` occurs in `src/` exactly once — code comment `MapView.tsx` L214, never rendered.

## A3 — Outside-catchment removal (hide-not-delete)

Status: **PASS**

`grep_search` over `src/` for `SHOP_OUTSIDE_COLOR|e07b00|⚠|Outside its own catchment|outside catchment|unassigned`:

```
Found 1 matches ...
src\components\MapView.tsx:214: "outsideCatchment: true`. The dot uses the hospice's
```

The single hit is the block comment `// pm 3.8: the outside-catchment marker is REMOVED (hide-not-delete): the dot uses the hospice's colour; the outsideCatchment flag stays in the data and types (hide-not-delete) but is no longer exposed on screen.` — user-visible renders: **0**.

Data + types retain the flags (node one-liners, this session):

```
shops: 138 total, outsideCatchment true: 21
practices: 9564 total, hospiceId null: 12
hospices: 155
```

`src/lib/types.ts` (read this session): L27 `hospiceId: string | null;` (Practice), L50 `outsideCatchment: boolean;` (Shop) — fields retained, rendering removed.

## A4 — Corrections tooling

Status: **PASS**

- Stub accepted: `node scripts/validate-corrections.mjs` → `OK: 0 correction entries valid (schema: date, summary, dataChanged; newest first).` (exit 0) — re-confirmed this session after the trial.
- Malformed rejections (both exit 1): `FAIL: cannot read/parse public/data/corrections.json: ... (it must be a JSON array; the committed stub is []).`
- Trial add on top of the malformed log (this session, verbatim):

```
node scripts/add-correction.mjs "QA post-land byte-identity ritual (controlled trial - will be reverted)" --date 2026-10-22
FAIL: the new entry (2026-10-22) is older than the first current entry (2026-10-22); the log is newest-first, so the file would violate the ordering rule. Use --date to record a newer date.
(Exit Code: 1)
```

- Exact revert this session: `node -e "require('fs').writeFileSync('public/data/corrections.json', Buffer.from('[]\n'))"` → `type` output `[]`; `bytes: 3 hex: 5b5d0a`; validator exit 0 (`OK: 0 correction entries valid ...`). State byte-identical to the committed stub.
- Map-independence: `grep_search "useAppData"` over `src/` → exactly **4** matches, all `src/App.tsx` L18–21 (`/data/hospices.json`, `/data/practices.json`, `/data/catchments.json`, `/data/shops.json`). CorrectionsPage is page-local: its only `fetch` is for `/data/corrections.json` (read this session); `docs/MAINTENANCE.md` L125–126: "page-local fetch; the log is never part of the map data bundle".
- Page parses the canonical bare array (previous-cycle fix in place, re-verified on disk this session): `setEntries(Array.isArray(json) ? json : [])`, with a comment pinning the format to the validator/scripts.
- Docs name both scripts:
  - `docs/MAINTENANCE.md` L119–122: `node scripts/add-correction.mjs "what was corrected" [--data-changed]` / `node scripts/validate-corrections.mjs`.
  - `data/README.md` L44: `...maintained by scripts/add-correction.mjs, validated by scripts/validate-corrections.mjs; fetched page-locally by the #corrections page only`.

## A5 — Routing, contacts, deps, build

Status: **PASS**

- Routes: `src/lib/useRoute.ts` defines 7 `RouteId`s (`map|feedback|corrections|about|privacy|licences|accessibility`); `routeFromHash` returns `'map'` for unknown/empty hashes (ADR-0007, no router library).
- Nav: `src/components/AppShell.tsx` `NAV_LINKS` = 6 links (Feedback, Corrections, About, Privacy, Licences, Accessibility), rendered in BOTH the header `<nav aria-label="Site pages">` and the footer `<nav aria-label="Site pages (footer)">`.
- Contacts: `feedback@hospiceinfo.example` and `Hospice Information Project` appear in `src/` only in `src/lib/siteConfig.ts`; all consumers (`lib/feedback.ts`, `LegalPage.tsx`, `AccessibilityPage.tsx`, `FeedbackPage.tsx`, `AboutPage.tsx`) import from it. `data-raw/site-config.json` mirrors the values for the curation scripts — the only second occurrence, outside the app.
- Bootstrap: `src/main.tsx` is the only `src/` file importing `bootstrap/dist/*` (ADR-0008).
- Deps unchanged: `package.json` (verbatim read this session) — runtime deps exactly `bootstrap, leaflet, react, react-dom, react-leaflet`; `xlsx` is a devDependency (local curation scripts only); no router package. `build: "tsc -b && vite build"`.
- `npm run build` (run this session): **exit 0** — `tsc -b` clean; `vite v5.4.10 building for production... ✓ 45 modules transformed. ✓ built in 2.76s`; `dist/index.html 0.46 kB`. (See F-6 for the `dist/` byproduct.)
- `index.html`: `<title>UK Hospice Catchment Map</title>` (verbatim).
- `Lancashire`: 0 occurrences in `src/`, `index.html`, `package.json`; 2 occurrences in `docs/`, both in immutable ADRs (`docs/adr/0001...md` L9, `docs/adr/0006...md` L9 — historical context). See F-5.

## A6 — Mobile ≤768px bottom sheet

Status: **BLOCKED-pending (browser environment required) — static evidence PASS**

Static (verbatim from `src/App.tsx`, read this session):

```tsx
<div className={`app${sheetOpen ? ' app-sheet-open' : ''}`}>
  <aside className="app-panel" id="appPanel" aria-label="Hospice list">
    <HospicePanel ... />
  </aside>
  ...
  <button className="sheet-fab" type="button" aria-expanded={sheetOpen} aria-controls="appPanel"
    onClick={() => setSheetOpen(!sheetOpen)}>{sheetOpen ? 'Close list' : 'Open list'}</button>
  <button className="sheet-scrim" type="button" aria-label="Close list" tabIndex={sheetOpen ? 0 : -1}
    onClick={closeSheet} />
</div>
```

- Toggle is CSS-class-only (`app-sheet-open` on the wrapper): the `<aside>` is unconditionally rendered — the panel is never remounted.
- `src/styles.css` `@media (max-width: 768px)` block (read in full this session): `.app-panel` absolute, full-width, `height: min(55vh, 480px)`, `translateY(105%)`, z-1600 → `.app-sheet-open .app-panel` `translateY(0)`; `.sheet-fab` z-2000, `min-height: 48px`, repositions above the sheet when open; `.sheet-scrim` z-1500, display-toggled; `.map-legend` hidden; `.app-selection` full-width inset.
- Selection closes the sheet: `App.tsx` `select()` calls `closeSheet()` on non-null id (pm 4.7).

8-point mobile checklist — **requires browser environment; NOT verified, NOT passed** (record results here when a human runs them):

1. ≤768px viewport: panel hidden off-canvas (`translateY(105%)`), FAB visible bottom-centre (≥48px), scrim hidden.
2. Tap FAB: sheet slides up (0.2s ease), height ≈ min(55vh, 480px); FAB repositions above the sheet; label flips Open/Close list; `aria-expanded` true.
3. Tap scrim: sheet closes, `aria-expanded` false; scrim hidden.
4. Legend card hidden on mobile; selection card spans full width (10px inset).
5. Touch targets ≥44px: panel rows, search/select, header switch + "Source & Method" button, FAB.
6. Selecting a hospice (card/marker/polygon) closes the sheet and shows the selection card.
7. Header nav (6 links) + skip link remain tappable at 320px width.
8. Map (preferCanvas) renders and recentres without JS errors at 320px/375px; no horizontal overflow.

## Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F-1 | was Blocking | "Lancashire" special-case / forbidden wording no longer present in `Methodology.tsx`; zero forbidden strings in `src/` (grep, this session). | **RESOLVED — verified on disk** |
| F-2 | was Blocking | `HospicePanel.tsx` header renders `{list.length} of {hospices.length} hospices` and `{totalShown} practices`; zero-state `No hospices match "{query}".` — the exact query-echo required. | **RESOLVED — verified on disk** |
| F-3 | **Minor** | Type-error hypothesis REFUTED: `src/App.tsx` passes `practices={practices!}` and `HospicePanel.tsx` L17 DOES declare `practices: Practice[]` in `Props`; `npm run build` (`tsc -b && vite build`) exited 0 (this session). The prop is declared but never destructured/used — vestigial dead interface member, no type/runtime/behavioural impact. | Open — Minor |
| F-4 | **Minor** | `scripts/add-correction.mjs` ordering guard (L91–95) scans the RAW, unvalidated log (`typeof date === 'string'` check only) — existing entries are not schema-validated before append; the validator runs post-write. With a corrupt log (e.g. month "13"), a valid append is rejected with a misleading message — verbatim: `FAIL: the new entry (2026-10-22) is older than the first current entry (2026-10-22); ...` (both dates identical; the offending entry is never surfaced). Healthy-path (stub) behaviour unaffected. | Open — Minor |
| F-5 | **Minor** (informational) | 2 "Lancashire" occurrences in `docs/adr/0001...md` and `docs/adr/0006...md` (L9 each) — immutable ADR historical context; ADRs are not rendered in the built site. | Open — Minor |
| F-6 | **Minor** (informational) | `npm run build` (run for F-3 verification) regenerates `dist/` — a build byproduct in the working tree, not a source modification. | Open — Minor |

Blocking findings: **0**.

Risk-accept recommendations (one line each):

- F-3: accept — dead prop is harmless; remove in a future cleanup edit, no pipeline impact.
- F-4: accept — hardening item only; the script already refuses to write when the validator fails and the committed log is a valid stub; fold into the next curation-tooling pass if desired.
- F-5: accept — ADRs are immutable records; the ban targets user-visible code/pages, not historical docs.
- F-6: accept — standard Vite build output; `dist/` regeneration is expected, not drift.

## Carry-forward from the previous-cycle record (superseded above, retained for the ledger)

- Rework round 1 (previous F-1: Methodology wording) — fixed and re-verified; the resolution is this cycle's F-1 RESOLVED.
- Rework round 2 (previous F-4: CorrectionsPage parsed a non-existent `json.corrections` object shape) — fixed (`CorrectionEntry[]` + `Array.isArray` guard); re-verified on disk this session (A4).
- Previous F-2 (add-correction failure-message wording) — carried; this cycle's F-4 re-examines the same guard with current disk code and current verbatim output.
- Previous F-3 (`docs/MAINTENANCE.md` rollback-section "Lancashire" reworded to "the previous pilot-scope state") — confirmed clean: the only remaining "Lancashire" in `docs/` is the two ADR hits (this cycle's F-5).
- SECURITY routing (not a QA finding): `SEC-F1` (ODbL mis-attribution on the legal page) is recorded in `.agents/security.md` and routed to the Docs stage as a must-fix-before-public — carried, not re-judged here.

## VERDICT

**VERDICT: PASS-with-reservations** — 0 Blocking findings (F-1/F-2 resolved on disk; F-3 refuted by a clean `npm run build`); 4 Minor findings recommended risk-accepted; A1 (fail-fast) and A2–A5 PASS with quoted disk evidence; A6 static PASS with 8 interactive checks BLOCKED-pending (browser environment required); the A1 post-land byte-identity ritual is DEFERRED per ADR-0006, with baseline hashes, exemption, and exact human procedure recorded in §A1 for execution after land-mask landing.
