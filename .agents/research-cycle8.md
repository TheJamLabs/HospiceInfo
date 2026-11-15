# Cycle 7 Research — "Find by postcode" online fallback via Pages Function proxy

Stage 1 of 10. Facts and options only — no architecture proposals (stage 2).
Goal: StartHere "Find by postcode" must resolve ANY UK postcode; planned fallback =
Cloudflare Pages Function GET /api/postcodes/{postcode} forwarding to owner's
self-hosted postcodes.io, browser does point-in-polygon against
public/data/catchments.json, graceful degrade to not-found.

## 1. Catchment data (public/data/catchments.json) — DONE

- File: 6.12 MB (6,421,940 bytes); top level is a **JSON array of 194 cells**.
- Cell keys (cell 0): `hospiceId | name | nation | kind | curated | children | practiceCount | polygons`.
- `hospiceId` format: `en-1-106214874` (cell 0 = St Oswalds Hospice).
- `kind` observed values: **`approx`** and **`published`** (no adult/children flag in kind).
- `children`: boolean — observed **`true` and `false` co-exist** (e.g. `Francis House Children's Hospice`, nation `en`, kind `approx`). This is the adult-vs-children discriminator; 194 cells cover both.
- `nation` values: `en, sc, ni, wales`.
- `practiceCount`: number, range 0–641 across cells.
- `polygons`: array of **rings**; each ring is an array of **`{lat, lon}` objects** (e.g. `{"lat":55.27504354,"lon":-2.10947003}`) — NOT GeoJSON `[lng,lat]` pairs. Rings per cell: 1–3112; max ring size 19,127 verts; total 9,367 rings.
- Cross-check: all **194 unique `hospiceId` values exist in `public/data/hospices.json`** (208 hospices; keys `id,name,town,postcode,lat,lon,color,kind,source,website,cqcUrl,curated,children,nation`). 0 missing.
- pip implication: test `{lat,lon}` directly (no transform). A cell's `children` flag mirrors hospices.json's `children`, so children's-mode filtering is a one-line predicate.

## 2. Existing point-in-polygon code in repo — DONE

- An even-odd **ray-cast PIP already exists** in the build scripts: `interior()` at `scripts/build-data.mjs:438-455`, identically mirrored at `scripts/build-data-nweld.mjs:365-389` (comment "C6-2 (ADR-0034, Amendment 3): a proper even-odd (ray-cast) point-in-polygon test"). Core toggle: `if ((ay > py) !== (by > py) && px < ax + (bx - ax) * (py - ay) / dy) inside = !inside;` on flat `[x,y]` degree arrays, plus an on-line band `|v| <= (|dx|+|dy|)/2 * 1e-9` that votes 0 when the point sits on a ring line.
- No PIP exists anywhere in `src/` (grep over src found none). `polygon-clipping` is a **devDep only** (`package.json:33`, `"polygon-clipping": "^0.15.7"`) imported solely by dev scripts: `scripts/build-data.mjs:25`, `scripts/build-data-nweld.mjs:25`, `scripts/validate-tessellation.mjs:25`; `scripts/land-mask.mjs` references it in comments only (:5, :99) — it never imports it. So **nothing runnable at runtime exists; the ~50-line vanilla TS function in `src/lib/postcodes.ts` (or a new `src/lib/pip.ts`) must be written fresh**, copying the toggle core from `build-data.mjs:438`.
- Note for the new PIP: `build-data.mjs` computes `role` (winding sign, outer vs hole ring) for union-boundary work (build-data.mjs:369-373); a **plain even-odd test over ALL of a cell's rings** (outer + holes) already yields correct inside/outside for hole-bearing cells (point inside a hole = odd for outer ring, odd again for hole ring → even → outside), so the runtime PIP does not need role/winding bookkeeping.
- Constraint satisfied: zero new runtime deps — React/Leaflet/Bootstrap are the only deps (`package.json:15-19`).

## 3. Runtime data loading + prop chain to StartHere.tsx — DONE

- All datasets load at the root via `useAppData` (fetch + r.ok guard + .json), hook at `src/lib/useAppData.ts:9-18`:
  - `src/App.tsx:19` `useAppData<Hospice[]>('/data/hospices.json')`
  - `src/App.tsx:20` `useAppData<Practice[]>('/data/practices.json')`
  - `src/App.tsx:21` `useAppData<Catchment[]>('/data/catchments.json')`
  - `src/App.tsx:22` `useAppData<Shop[]>('/data/shops.json')`
  (only other fetch in src is `src/pages/CorrectionsPage.tsx:26` for `/data/corrections.json`).
- Children's mode: `childrenMode` state `src/App.tsx:50`; per-kind memos at `src/App.tsx:62-76` — `kindHospices` (:63 `h.children === childrenMode`), `kindCatchments` (:68 `c.children === childrenMode`), `kindPractices` (:71), `kindShops` (:75).
- Prop chain to StartHere: `src/App.tsx:232-239` renders `<StartHere practices={kindPractices} hospices={kindHospices} onOpenHospice={select} onOpenShopSearch={select} onSearchList={...} onDismiss={...} />`; the component's `Props` interface is at `src/components/StartHere.tsx:15-22` (no catchments prop today). StartHere's current resolution: `practiceByPostcode` map built at `src/components/StartHere.tsx:31-35` from `normalisePostcode(p.postcode)`; lookup at :37-38 → `hospiceById` :30; not-found state is the card body after line 95.
- `src/lib/postcodes.ts` (9 lines) holds only `normalisePostcode` ("C6-3") — the PIP and any geocode helpers have a natural home here.
- Cleanest option for reaching catchment cells from StartHere: **new prop `catchments={kindCatchments}` on `<StartHere>`** — evidence: App already owns the data (App.tsx:21), already per-kinds it (App.tsx:68), and passes exactly this pattern to MapView (App.tsx:241-244). Own fetch would duplicate the 6 MB payload; shared state/context does not exist in the app (no context provider in src).

## 4. Acceptance-vector probe (P1/P2/P3 inside catchments?) — DONE

- Upstream ground truth (lead-verified, Cycle 7 task context — NOT in repo): owner's self-hosted postcodes.io returns HTTP 200 with lat/lng for PR7 2TH → 53.652582, -2.636219; CF11 9HD → 51.484666, -3.193503; BT15 3LH → 54.627331, -5.933535; invalid `ZZZ 9ZZ` → 404; missing CF-Access header → 403 (Access enforced at the source). No credentials recorded here or anywhere.
- Probe (even-odd ray-cast over ALL rings of each cell, same core as `scripts/build-data.mjs:438-455`, run over `public/data/catchments.json`):

| Point | In cells | Detail |
|---|---|---|
| P1 PR7 2TH | exactly 2 | adult\|published **St Catherine's Hospice (Lancashire)** `en-1-126365065` (790 m to its boundary); children\|approx Derian House Children's Hospice `en-1-114396298` |
| P2 CF11 9HD | exactly 2 | adult\|approx **City Hospice** `wales-r15` (907 m); children\|approx Hope House Children's Hospice `en-1-129536667` (4906 m) |
| P3 BT15 3LH | exactly 2 | children\|approx NI Childrens Hospice `ni-r3` (2330 m); adult\|approx NI Hospice Adult Community Services `ni-r4` (2330 m); point sits **10.26 m** from the cell boundary |

- Consequence: adult and children tessellations independently cover the same geography (ADR-0035, `docs/adr/0035-per-kind-tessellation-childrens-mode.md`), so every hit lands in **two** cells at once (one adult + one children). The existing kind filter `src/App.tsx:68` (`kindCatchments = c.children === childrenMode`) is the disambiguator — no tie-break logic is needed beyond testing the kind-filtered list.
- Test precedent is exactly these postcodes: `tests/postcodes.test.mjs` (35 lines, run by `npm test` = `node --test`, `package.json` "test" script) — positive vector LS1 4AP at :27-29; **negative vectors CF11 9HD and BT15 3LH at :31-34** (asserted against the offline practice map only — the new geocode path does not change that assertion, which stays true).

## 5. Pages Function fit (functions/, wrangler, .dev.vars, ADR) — DONE

- `functions/` **does not exist** (glob `functions/**` → 0 files) — to be created; Pages convention: repo-root `functions/` is the Functions root, so `GET /api/postcodes/{postcode}` = `functions/api/postcodes/` handler.
- `wrangler.jsonc` (5 lines, whole file read): `name: "hospiceinfo"`, `pages_build_output_dir: "dist"`, `$schema: node_modules/wrangler/config-schema.json`. No `[pages_functions]` section needed — the directory convention is enough.
- No wrangler/cloudflare package in `package.json` (deps :15-19 are react/react-dom/leaflet/react-leaflet/bootstrap; devDeps :21-39 contain none) — a Pages Function needs no local dependency (workerd provides global `fetch`); local dev is `npx wrangler pages dev dist` (npx, no package.json change) reading `.dev.vars` at repo root.
- `.gitignore` (10 lines, whole file read) has **no `.dev.vars` entry** → must be added: CF Access id/secret go into Pages secrets (dashboard) for prod and `.dev.vars` for local only; never committed, never in any artifact.
- Deploy fit: ADR-0014 (`docs/adr/0014-git-connected-deploy.md`, accepted 2026-10-27) — push to `main` → Pages runs `npm ci && npm run build` → deploys `dist`. Functions ship through the same git-connected deploy; its Consequences section is explicit that **every push, including unverified ones, publishes the site**, so Function code changes ride the first push with no separate gate (mitigation: repo-side test of the handler's parse/forward logic via `node --test`, since `node --test` cannot execute workerd-runtime code).

## 6. Prior art (deploy ADR, C6-3 normaliser, maintainer docs) — DONE

- Deploy: ADR-0014 as above; maintainer section `## Deploy (Hospice Finder UK) — git-connected (ADR-0014)` at `docs/MAINTENANCE.md:111`. `docs/MAINTENANCE.md` is the ops doc (322 lines; headings at :1 :12 :25 :31 :55 :60 :76 :111 :153 :179 :191 :203 :281); `docs/build-log.md` (89 lines) logs cycle data work. Docs stage will extend MAINTENANCE.md's Deploy section.
- C6-3 normaliser: **no dedicated ADR on disk.** `C6-3` appears only at `src/lib/postcodes.ts:2` and `tests/postcodes.test.mjs:1` (grep → exactly 2 matches). The normaliser shipped inside Cycle 6's work; build-script task tags confirm the scheme ("C6-2 (ADR-0034...)" at `scripts/build-data-nweld.mjs:365`).
- Relevant ADRs (names only, from `docs/adr/` listing): `0012-start-here-landing-card.md` (the card this feature lives in), `0034-ni-clip-and-sc-jitter-acceptance.md` (boundary-tolerance acceptance precedent — P3's 10.26 m boundary case belongs to this family), `0035-per-kind-tessellation-childrens-mode.md` (why two cells per point).
- Test pattern: `tests/*.test.mjs` import `src/` directly (e.g. `tests/postcodes.test.mjs:9` imports `../src/lib/postcodes.ts` — Node 22 runs TS via type-stripping); the new PIP test follows the same pattern.

## Risks

| # | Risk | Evidence | Note for Architect |
|---|---|---|---|
| R1 | Float edge on boundary: P3 is 10.26 m off the NI boundary edge; build-time on-line band is ~1e-9 deg (≈0.1 m) | probe §4; `scripts/build-data.mjs:438-455` | decide an explicit rule for boundary hits (e.g. PIP over kind-filtered cells, first hit wins); document tolerance |
| R2 | Degradation paths must not throw: postcodes.io 404, 403 (Access fail), network timeout | lead-verified 404/403; `src/components/StartHere.tsx` not-found card body :95-108 | reuse the existing not-found wording; abort budget (e.g. ~3 s) on the browser fetch |
| R3 | Two-cells hit on every point (adult + children) | probe §4; `src/App.tsx:68` | kind-filtered list is the disambiguator (ADR-0035) |
| R4 | Secret leak (CF Access id/secret) | `.gitignore` has no `.dev.vars`; no CI in repo | Pages secrets for prod; `.dev.vars` + new `.gitignore` line for local; secrets never in code/artifacts/logs |
| R5 | Function code auto-publishes on any push | ADR-0014 Consequences ("every push to main ... publishes the site") | no runtime test possible in `node --test` (workerd); keep handler logic thin + unit-testable |
| R6 | Extra round-trip latency only on offline-map misses (practice-map-first ordering) | `src/components/StartHere.tsx:37-38` current lookup | geocode call happens only when `practiceByPostcode` misses → bounded cost |
| R7 | Nation-filter mismatch: P2's children cell is `nation: en` over Welsh geography (`en-1-129536667`) | probe §4; catchments.json cell keys | opening an `en` cell while user scoped `wales` may surprise; see OQ5 |

## Open questions

1. **No-catchment postcode**: geocode succeeds (200) but PIP over kind-filtered cells hits none (rural sparseness) — which UX? Presumed: same not-found card (StartHere.tsx :95-108); needs owner confirmation of wording.
2. **Proxy latency/timeout**: no timeout policy defined; pick a browser-side `AbortController` budget and whether the Function retries; CF Worker currency-time limits apply on the Function side (verify against current Cloudflare docs at Architect stage).
3. **Children's-mode interaction**: in children's mode a point only inside an adult cell (e.g. P1 is 19.5 km from the children cell's interior) → expect not-found in children's mode. Confirm that is the intended semantics (consistent with ADR-0035 "completely separate" kinds).
4. **Secret rotation**: rotation story = dashboard Pages-secret update (immediate, no code change) + local `.dev.vars` refresh; who owns it, and record in `docs/MAINTENANCE.md` (Docs stage).
5. **Nation filter vs opening result**: should a postcode hit respect the active nation selector, or open the cell regardless (R7)?
6. **postcodes.io capacity**: owner's self-hosted instance rate-limit/availability from Cloudflare's network is unknown; assume bounded request volume (offline-map-first ordering).
