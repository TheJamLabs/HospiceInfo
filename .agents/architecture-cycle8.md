# Cycle 7 Architecture — "Find by postcode" online fallback (Pages Function proxy + client-side PIP)

Stage 2 of 10. This file **replaces** the stale Cycle 6 artifact at this path (that
file was scratch; git history keeps it). Inputs: `.agents/feature.md` (owner spec),
`.agents/research.md` (Stage 1, read in full). ADR: `docs/adr/0037-*` (this cycle's;
C6 landed through ADR-0036, verified by directory listing).

Sections: 1 Objective · 2 Platform note · 3 Overview · 4 Component A (Function) ·
5 Component B (client helpers) · 6 Component C (StartHere) · 7 Degradation contract ·
8 Security · 9 Testing strategy · 10 Certification gates · 11 Decisions · 12
Alternatives · 13 Risks / open questions → Reviewer · 14 References.

## 1. Objective

Owner request (2026-11-14, verbatim): "To allow the hospice finder to work please
wire in my local hosted postcodes.io."

- ANY real UK postcode must resolve in the StartHere "Find by postcode" flow.
- **Offline first, unchanged**: the tier-1 `practiceByPostcode` lookup
  (practices.json, built at StartHere.tsx:31-38) is tried first, zero network;
  `LS1 4AP` stays fully offline.
- **On miss**: browser `fetch('/api/postcodes/{postcode}')` (new Cloudflare Pages
  Function) → owner's self-hosted postcodes.io (https://postcodes.thejamlabs.com)
  behind Cloudflare Access → on 200, even-odd point-in-polygon (PIP) over the
  **kind-filtered** catchment cells (ADR-0035) → open the containing hospice via
  the existing `onOpenHospice` flow.
- **Graceful degradation**: 404 / 403 / 5xx / timeout / network failure / no PIP
  hit → the existing not-found card (StartHere.tsx ≈:95-108). Nothing in the new
  path may throw.
- Hard constraints: no new runtime dependencies, no `wrangler`/cloudflare package in
  `package.json`, no `wrangler.jsonc` change (Pages directory convention only), no
  data-generation/tessellation changes, no deploy actions (DevOps stage), no
  multi-hospice ranking UI, C6's open B1 (ADR-0034 invariant 6, owner's call)
  untouched.

## 2. Platform note

Target: **Cloudflare Pages Functions** on the existing git-connected project
`hospiceinfo` (ADR-0014). The MCP server configured in this repository is
**Azure-only** and does not cover Cloudflare, so no MCP guidance check applies to
this design. It rests on: (a) lead-verified upstream behaviour (C7 task context —
do **not** re-probe: 200 `{"status":200,"result":{...,"latitude","longitude"}}`;
404 `{"status":404,"error":"Invalid postcode"}` with no `result`; 403 on missing
Access headers; vectors PR7 2TH → 53.652582,-2.636219; CF11 9HD →
51.484666,-3.193503; BT15 3LH → 54.627331,-5.933535), (b) repo-verified
conventions (`wrangler.jsonc` 5 lines: name + `pages_build_output_dir: "dist"`;
`functions/` does not exist yet; `package.json` imports bootstrap/React/Leaflet
only; tests are `node --test` importing `.ts` directly), (c) stable Cloudflare
Functions conventions: root `functions/` directory, `[param].ts` dynamic-segment
files exporting `onRequest`, Pages secrets (prod) vs `.dev.vars` (local dev,
`npx wrangler pages dev dist`), native TS compilation of the functions tree.

## 3. Architecture at a glance

```
StartHere submit (normalisePostcode — C6-3, unchanged)
  │
  ├─ TIER 1  practiceByPostcode (practices.json, offline)  [StartHere.tsx:31-38]
  │           → hospice card + "Open in panel"              (unchanged; LS1 4AP)
  │
  └─ miss (shape OK) ── TIER 2
        fetch('/api/postcodes/' + spacedCode, 3 s AbortController)
          │
          │  CLOUDFLARE PAGES FUNCTION  functions/api/postcodes/[postcode].ts
          │   shape-invalid          → 400 {"error":"invalid postcode"}
          │   forward GET ${POSTCODES_IO_BASE}/postcodes/{spacedCode}
          │     headers CF-Access-Client-Id / CF-Access-Client-Secret
          │     (Pages secrets in prod; .dev.vars in local dev;
          │      VALUES numerically absent from repo — names only)
          │   upstream 200 + finite lat/long → 200 {postcode,latitude,longitude}
          │   upstream 404 / no result       → 404 {"error":"unknown postcode"}
          │   upstream 403 / 5xx / timeout   → 502 {"error":"postcode service unavailable"}
          │
        200 → PIP (even-odd + per-cell bbox prefilter) over
              kindCatchments (c.children === childrenMode, App.tsx:66-69)
              → exactly one cell: the KIND FILTER IS THE DISAMBIGUATOR —
                ADR-0035 double tessellation puts every covered point in exactly
                two cells (one adult + one children), independently; the mode
                filter (src/App.tsx childrenMode) selects the one. No tie-break.
              → hospice = hospiceById.get(cell.hospiceId)
              → same "Open in panel" card (onOpenHospice)
        any failure / no PIP hit → existing not-found card (no throw)
```

Data-flow facts (research-verified): all four datasets already load at App root via
`useAppData` (App.tsx:19-22); `kindCatchments` already computed (App.tsx:66-69);
StartHere rendered at App.tsx:232-239; MapView already receives
`catchments={kindCatchments}` (App.tsx:241-244). The new path therefore adds
**zero** extra root fetches and **zero** new data files.

## 4. Component A — Cloudflare Pages Function (new `functions/api/postcodes/`)

**Files (both new):**
- `functions/api/postcodes/[postcode].ts` — thin route: reads
  `context.requestParams.postcode`, reads env, owns the only three workerd globals
  (`context`, `fetch`, `AbortController`), delegates everything else to handler.ts.
- `functions/api/postcodes/handler.ts` — **pure, importable, workerd-free** logic:
  exports `validatePostcodeShape(raw): string | null` (normalises to the compact
  big form), `toSpacedForm(code): string`, `buildUpstreamRequest(base, code,
  clientId, clientSecret): {url, method, headers}` (values passed as *arguments* —
  no env access), `shapeUpstream(status, parsed): {status, body}`. All unit-testable
  under `node --test` (feature.md requirement 11; same direct-`.ts`-import pattern the
  app's tests already use).

**Route.** `GET /api/postcodes/{postcode}` — the Pages directory convention;
`wrangler.jsonc` needs **no** change (verified: file is 5 lines, no routing config;
directory-based routes are the documented Pages mechanism).

**Validation.** Compact form: strip spaces, uppercase, then regex
`^[A-Z]{1,2}[0-9](?:[0-9A-Z])?[0-9][A-Z]{2}$` (IO/AA/ZI reserved-area feedback: do
not special-case; any UK postcode returned by upstream is accepted). Malformed
input → 400 `{"error":"invalid postcode"}` before any upstream call (cost +
credential waste avoided; the client pre-checks the same shape so this tier is
defence-in-depth only).

**Forwarding.** `GET ${POSTCODES_IO_BASE}/postcodes/${spacedCode}` with headers
`CF-Access-Client-Id: <POSTCODES_ACCESS_CLIENT_ID>` and
`CF-Access-Client-Secret: <POSTCODES_ACCESS_CLIENT_SECRET>`, function-side
`AbortController` with a **5 s** budget (upstream is owner-hosted; a slow 5xx is
what motivation exists for the 502 tier). No upstream body/status is ever echoed to
the client (a 403 Access failure may contain Access detail; a raw pass-through
would leak it).

**Response contract (frozen for the client):**

| Upstream outcome | Function returns |
|---|---|
| shape-invalid input | `400 {"error":"invalid postcode"}` |
| 200, `result` present, `result.latitude`/`result.longitude` finite numbers | `200 {"postcode","latitude","longitude"}` — **stripped**; no other upstream fields |
| 404, or 200 with missing `result` / non-finite coords | `404 {"error":"unknown postcode"}` |
| 403 / any 5xx / timeout / non-JSON body | `502 {"error":"postcode service unavailable"}` |

Headers on all function responses: `Content-Type: application/json`,
`Cache-Control: no-store` (same-origin fetch; no CORS needed; per-postcode
responses must not persist in shared caches).

**Secrets — names only, never values:**

| Name | Kind | Prod source | Local dev |
|---|---|---|---|
| `POSTCODES_IO_BASE` | base URL | Pages secret (`npx wrangler pages secret put POSTCODES_IO_BASE` or dashboard) | `.dev.vars` repo-root line |
| `POSTCODES_ACCESS_CLIENT_ID` | credential | Pages secret | `.dev.vars` |
| `POSTCODES_ACCESS_CLIENT_SECRET` | credential | Pages secret | `.dev.vars` |

`.dev.vars` (route, owner-managed — the owner already runs local dev) receives the
three names; **Coding adds `.dev.vars` to `.gitignore`** (currently absent;
research §3). Prod secrets are set by the owner at deploy; rotation is a dashboard
change only (feature.md note) — no code change. **No secret value may appear in any
committed file, dist artifact, test, comment, `.agents/` artifact, or doc** — the
Security stage greps for it (acceptance 4). `.gitignore` addition: `.dev.vars`
(new last line — append).

**Deploy path (ADR-0014, cited in the ADR).** The project is git-connected: every
push to `main` runs `npm ci && npm run build` and publishes `dist`. `functions/`
ships **on first push — there is no separate gate for Functions**. Mitigation: the
whole chain (gates in §10) must be green **before** the push, and the handler's
pure logic is unit-tested so a broken Functions tree fails `npm test` pre-push
even though its compiled form only runs on the platform.

## 5. Component B — client helpers (extend `src/lib/postcodes.ts`)

**Placement decision: extend the existing 9-line `src/lib/postcodes.ts`** — the
module already owns `normalisePostcode` and is imported by the tests that
exercise it; the geocode fallback is one feature, so one module (~110 lines)
keeps the surface discoverable. Alternatives (new `src/lib/pip.ts`, or a generic
geometry lib) are recorded in §12.

**Exports (pure; types from `src/lib/types.ts`):**
1. `normalisePostcode(raw): string` — existing, untouched.
2. `isPostcodeShape(code): boolean` — the client twin of the function's regex
   (same pattern, kept in sync; obviously-bad input never hits the network).
3. `toSpacedForm(code): string` — `LS14AP → "LS1 4AP"` (last 3 chars detached).
4. `pointInCell(lat, lon, cell: Catchment): boolean` — even-odd ray-cast over
   **ALL** rings of the cell (outer + holes), ported from the production core at
   `scripts/build-data.mjs:438-455`. Parity over every ring is exact for cell
   interiors (a point inside a hole flips twice → outside; a point in the outer
   area flips once → inside), so winding/role bookkeeping is unnecessary.
5. `findHospiceCell(lat, lon, cells: Catchment[]): Catchment | null` — per-cell
   bounding box (computed & memoised on the `cells` array identity — the
   `kindCatchments` memo flips identity on mode toggle, so boxes recompute exactly
   when they must) → bbox containment prefilter → PIP on survivors → first hit
   (data invariant: at most one per kind; degenerate `polygons: []` cells →
   `false`, no special-casing needed).
6. `lookupByPostcode(code, cells, fetchImpl = fetch): Promise<{cell, code} | null>` —
   orchestration: shape check → `fetchImpl('/api/postcodes/' + toSpacedForm(code),
   {signal})` with a **3 s** `AbortController` → verify 200 → parse JSON → verify
   finite numbers → `findHospiceCell`. The **entire** body is wrapped in one
   try/catch → **always resolves, never throws** (including abort, network
   failure, and malformed bodies). `fetchImpl` is injectable for tests.

**Boundary-tolerance decision (P3 / BT15 3LH, 10.26 m from the NI cell boundary).**
Port the build-time on-line band into the runtime PIP: a point whose cross-product
distance `|v|` to an edge satisfies `|v| <= (|dx|+|dy|)/2 * 1e-9` (the exact band
used at build-data.mjs:444) votes **0 — outside every cell**. Rationale:
(a) **one tolerance system across build and runtime** — the same band and
voting semantics the validator already runs on; (b) the alternative
(boundary = inside) would make *shared* Voronoi walls ambiguous at the same
instant a point is inside two same-kind cells (needs an arbitrary first-hit);
(c) measurement: P3's distance (10.26 m) is **two orders of magnitude outside**
the on-line band (~1e-9 deg ≈ 0.1 m at UK latitudes), so the acceptance vector is
a clean deterministic hit. Precedent: ADR-0034's tolerance acceptance
(validator accepts 1e-9 / 1e-6 deg residuals in production data).

**Cost (measured against `public/data/catchments.json`):** 194 cells; the
kind-filtered sets are **94,101** verts (adult) / **89,074** (children); max ring
19,127 verts. Worst-case naive even-odd over one kind set ≈ sub-ms; with the bbox
prefilter only containing cells' rings run (bounded by the max ring) → comfortably
sub-frame. PIP runs **once per submit** (not per render, not per map move), so no
chunking and no Web Worker are needed.

## 6. Component C — StartHere + App wiring

**Prop wiring (research-suggested, confirmed):** add `catchments: Catchment[]`
to StartHere's Props (interface at StartHere.tsx:15-22) and pass
`catchments={kindCatchments}` at App.tsx:232-239 — same one-line pattern already
used for MapView (App.tsx:241-244). No context provider, no root fetch (the
≈6 MB catchments payload is already loaded there).

**Submit flow:**
1. Normalise as today (StartHere.tsx:72); tier-1 lookup into `practiceByPostcode`.
   On hit: **unchanged behaviour** (no state change, no network).
2. On tier-1 miss with `isPostcodeShape` OK: set `phase='resolving'`; abort any
   in-flight fetch; call `lookupByPostcode`.
   - Hit → `phase='hit'`, store `{cell, code}` → render the **existing found-card
     markup** (same layout as the practice-hit card at StartHere.tsx:95-108):
     hospice name/town via `hospiceById.get(cell.hospiceId)` +
     "Open in panel" → `onOpenHospice(hospice.id)`. User-initiated only — no
     auto-open (ADR-0012's card pattern).
   - Miss/failure → `phase='miss'` → not-found card.
3. Resubmit / remount / unmount → abort the in-flight controller (ref-held).

**Guards.** `kindCatchments` and `kindHospices` share the same `children ===
childrenMode` predicate, and every cell's `hospiceId` exists in `hospices.json`
(research §1) — so the hit card always resolves; a null-guard on
`hospiceById.get` is defensive, not load-bearing (falls through to the not-found
card).

**UI states (exactly 3):** idle (empty card, today's markup), resolving (in-card
`role="status"` line, small text, no spinner — the one-shot is bounded: the 3 s
budget kills long hovers), result (hit card or not-found card, existing markup).

**Copy (minimal, hide-not-delete-safe).** The only copy change is the not-found
line: "We couldn't match that postcode to a GP practice on this map, so there's
no catchment map for it." → "We couldn't find a hospice catchment for that
postcode. You can search the list instead, or send us a note." Rationale: after
tier 2, a miss means *no cell contains the geocoded point* — "GP practice" no
longer describes the check. "Search the list" and the mailto note are unchanged.
Requires owner sign-off (open question, §13).

**Semantics decisions (itemised, for the Reviewer):**
- **Kind filter is the disambiguator** (R4): per ADR-0035 each covered point sits
  in exactly two cells (one adult, one children). `kindCatchments` is already
  kind-filtered, so PIP over it returns exactly one cell; no tie-break code.
- **Nation selector is ignored** by the lookup (OQ5): the map's nation control is
  a *display* filter (MapView greys out non-matching entities), not a geography
  contract — a postcode→hospice result is geographic truth. Consequence: an
  `en`-kind cell may render over Welsh territory (e.g. CF11 9HD sits in
  `wales-r15` adults but in an `en` children cell — `en` hospice data covers the
  area outright). Opening a hospice never renders the wrong kind, so the
  consequence is cosmetic; flag for owner confirmation.
- **Children-mode miss** (OQ3): in children mode, a point that lies only inside an
  *adult* cell yields no cell in `kindCatchments` → not-found card. This is the
  intended "the two sets are completely separate" semantics (ADR-0035: separate
  catchments, never overlaid); P1 (PR7 2TH, ~20 km from any children cell) is the
  concrete example. Flag for owner confirmation.

## 7. Degradation contract (R5 — nothing may throw)

`lookupByPostcode` **always resolves** (one try/catch swallowed to `null`). The
state machine maps every failure to the not-found card:

| Failure | Handling |
|---|---|
| shape-invalid (client pre-check, before fetch) | not-found card, no network |
| 400 / 404 from function | not-found card |
| 502 from function (upstream 403/5xx/timeout) | not-found card |
| any other non-2xx | not-found card |
| 200 with non-JSON / missing / non-finite coords | not-found card |
| network failure (offline, DNS) / 3 s timeout abort / resubmit/unmount abort | not-found card |
| 200 + PIP no hit (rural sparseness) | not-found card |

Consequences: no throw, no console error, no broken pre-submit layout, no
dead-end state (the card always offers "Search the list" + the mailto note). Tier
2 adds latency to the **miss path only** — the hit path is offline as today.

## 8. Security

- **Credentials stay server-side**: only the Function reads the two
  `CF-Access-*` headers, from Pages secrets (prod) / `.dev.vars` (local dev,
  added to `.gitignore` this cycle). The compiled function ships in `dist/`
  (Pages reads `functions/` at build/publish time); it references secrets by
  *name* only — values appear in no committed file, `dist/`, test, comment,
  `.agents/` artifact, `docs/`, or log (Security-stage grep = acceptance 4).
- **Error hygiene**: 502/404/400 bodies are fixed strings; upstream status and
  body are never echoed. A Cloudflare Access 403 can be verbose — echo would have
  leaked it.
- **No new client surface**: one same-origin GET path; no CORS; `Cache-Control:
  no-store`; the Function logs nothing (a postcode is PII-adjacent).
- **Untrusted input hardening**: the function re-validates shape (client is not
  authoritative); 200 bodies are re-validated (finite `latitude`/`longitude`)
  before being returned; no dynamic content is injected from upstream.

## 9. Testing strategy (`node --test`)

**Unchanged:** `tests/postcodes.test.mjs` as-is (LS1 4AP positive; CF11 9HD /
BT15 3LH offline-negative — tier-1 truth is untouched).

**New — client (`tests/postcode-geocode.test.mjs`):**
- `pointInCell` / `findHospiceCell` on real `public/data/catchments.json`:
  (53.652582, -2.636219) → adult `en-1-126365065`, children `en-1-114396298`;
  (51.484666, -3.193503) → adult `wales-r15`, children `en-1-129536667`;
  (54.627331, -5.933535) → adult `ni-r4`, children `ni-r3` — *two kind-filtered
  calls per point*, proving the kind filter is the disambiguator. Negative:
  an open-sea point → null in both kinds. P3 at 10.26 m boundary distance resolves
  (band-determinism regression guard).
- `isPostcodeShape` / `toSpacedForm` vectors (incl. malformed: `ABC`, `12345`,
  `!@#`).
- `lookupByPostcode` with a stub `fetchImpl`: 200+coords → cell; 404 → null;
  502 → null; non-JSON → null; non-finite coord → null; thrown fetch → null;
  aborted signal → null. (Proves §7's no-throw contract.)

**New — Function (`tests/postcode-function.test.mjs`), workerd-free:**
- `validatePostcodeShape`: valid/invalid vectors.
- `buildUpstreamRequest`: exact URL (base + path + spaced code), method GET,
  and — critically — headers contain **exactly** `CF-Access-Client-Id` and
  `CF-Access-Client-Secret` with the *argument* values (no env read at import).
- `shapeUpstream`: mapping rows — 200+finite → contract 200 body; 200+missing
  result → 404; 404 → 404; 403/500 → 502 with the generic body; stripped body
  assertion (assert no `status`/`result` keys leak into the 200 shape).

## 10. Certification gates (all must be green when Coding finishes)

1. `npm test` — all suites, including the new ones.
2. `npm run build` = `tsc -b && vite build && node scripts/prerender.mjs`.
3. **Byte-identical double build** (two `vite build` runs, SHA-256 compare of
   `dist/`) — no data files change, so data hashes stay pinned.
4. Prerender check: `<loc>` count = data count + 7 (5 AppShell pages + `/`,
   `/methodology`, `/accessibility`) — unchanged: `functions/` produces no HTML
   routes.
5. `functions/` present; `wrangler.jsonc` untouched; `package.json` **unchanged**
   (no wrangler/cloudflare package); `.gitignore` gains exactly one line:
   `.dev.vars`.
6. Absence of secrets in all committed files + `dist/` (owned by the Security
   stage, gate 4 in feature.md).

## 11. Decisions (one line each, linked to rationale)

| # | Decision | Chosen |
|---|---|---|
| D1 | Function route + contract | `GET /api/postcodes/{postcode}`, stripped 200 / 404 / 400 / 502 table (§4) |
| D2 | Credential storage | 3 names: base URL + 2 Access creds; Pages secrets (prod), `.dev.vars` (dev, gitignored); names only in repo |
| D3 | Helper placement | extend `src/lib/postcodes.ts` (§5) |
| D4 | PIP | even-odd over all rings, ported from build-data.mjs:438-455, + per-cell bbox prefilter memoised on array identity |
| D5 | Boundary tolerance | on-line band 1e-9 deg, votes outside (ADR-0034 precedent; P3 at 10.26 m is clean) |
| D6 | Timeouts | 3 s client / 5 s function; abort on resubmit/unmount |
| D7 | StartHere prop | new `catchments={kindCatchments}` (confirmed against App.tsx:232-239) |
| D8 | Not-found copy | one-line reword (catchment-flavoured), owner sign-off requested |
| D9 | Nation selector | ignored by the lookup (display filter only) |
| D10 | Children-mode miss | not-found (separate-set semantics, ADR-0035) |
| D11 | `.gitignore` | append `.dev.vars` |
| D12 | Dependencies | none added (function uses workerd globals; client uses `fetch`/`AbortController`) |

## 12. Alternatives considered

- **A. Client-side direct fetch to postcodes.io.** Rejected: the two CF-Access
  credentials would land in the browser bundle; the client secret is
  single-use-renewable and exposed to any XSS. Fatal.
- **B. Precomputed static postcode→hospice file.** Rejected: ~1.7M live UK
  postcodes → tens of MB file, outside data-generation/tessellation scope
  (out of scope for C7), stale by construction (new postcodes, new cells).
- **C. Pass upstream responses through unshape–d.** Rejected: leaks upstream
  status/body (Access 403 detail! carries payload, can be big), contract
  stability lost for the client.
- **D. PIP server-side in the Function (return `hospiceId`).** Rejected: the
  function would need the ~6 MB catchments — a KV write + data-sync path,
  statelessness lost; the client already holds the data; one thin stateless hop
  is the whole point of ADR-0014's free deploy.
- **E. Separate `src/lib/pip.ts` module.** Rejected (D3 rationale): one feature,
  one module; discoverability wins over name purity near 110 lines.
- **F. Client retry / backoff on 502.** Rejected: one small request, already
  degrades; retry doubles latency for zero functional gain. (Unaccounted Q6
  upstream capacity: bounded by offline-first ordering.)

## 13. Risks, open questions → Reviewer

**Risks (with mitigations):**
- R1 boundary ambiguity → §5 D5 (band + ADR-0034 precedent + P3 two orders away).
- R2 degradation → §7 table; no-throw proven by tests.
- R3 double-cell → kind filter is the disambiguator; stated, tested against all 3 vectors.
- R4 secret leak → names-only + `.gitignore` + dist verification + Security grep.
- R5 automatic publish → chain green before push; handler's pure logic unit-tested
  (fails pre-push even without a Functions runtime).
- R6 upstream capacity unknown → offline-first ordering bounds exposure; no retry.

**Open questions for owner confirmation (Reviewer to surface):**
- OQ1 (wording): not-found reword — "GP practice" → "hospice catchment".
- OQ3 (semantics): children-mode coverage is by children cells only (P1 =
  not-found example).
- OQ5 (display): lookup ignores the nation selector (cross-border rendering
  possible, cosmetic).
- OQ4 (ops): rotation procedure documented by Docs in MAINTENANCE (owner runs
  the Actions call).
- OQ6 unowned: upstream capacity unknown; mitigated, not measurable, here.

## 14. References

- ADR-0012 (not-found wording / card UX), ADR-0014 (git-connected deploy;
  cited in ADR-0037), ADR-0034 (tolerance precedent; open B1 out of scope),
  ADR-0035 (per-kind double tessellation), ADR-0036 (prior-cycle context).
- `.agents/feature.md` (owner spec, acceptance 1-4, requirements 1-11, notes +
  open questions 1-6); `.agents/research.md` (stages 1-7, verified line
  references).
- Code: `src/lib/postcodes.ts` (9 lines), `src/lib/types.ts` (Catchment L31-40),
  `src/components/StartHere.tsx` (:15-22 Props, :31-38 practice map, :47-48
  hospiceById, :72 submit, :95-108 cards), `src/App.tsx` (:19-22 useAppData,
  :50 childrenMode, :66-69 kindCatchments, :232-239 StartHere, :241-244
  MapView), `scripts/build-data.mjs` (PIP core :438-455), `tests/postcodes.test.mjs`,
  `package.json`, `wrangler.jsonc`, `.gitignore`.
- ADR for this cycle: `docs/adr/0037-*` (one page, written by this stage).
