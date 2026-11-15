# ADR-0037 — Online postcode fallback: Cloudflare Pages Function proxy + client-side point-in-polygon

**Status:** accepted (Cycle 8, 2026-11-15) — implemented, SEC-passed (0
Blocking, SEC-8-01/02 risk-accepted), ship-gated on owner commit + push; open
items OQ1/OQ3/OQ5 resolved 2026-11-15; QA B1/B2 fixes verified (qa-cycle8.md:95-103)

## Context

Since C6-3 (whose normaliser lives in `src/lib/postcodes.ts` — no dedicated ADR
exists for it, intentionally not invented), the start-here "Find by postcode"
resolves ONLY against the GP practice postcodes in `practices.json` (≈11,002
geocoded units). Any other real UK postcode (CF11 9HD, BT15 3LH, PR7 2TH) falls
through to the not-found card. The project must work for ANY real UK postcode.
Owner request (2026-11-14, verbatim): "To allow the hospice finder to work please
wire in my local hosted postcodes.io." The owner's instance
(`https://postcodes.thejamlabs.com`) is behind Cloudflare Access (client id +
secret headers), which the browser cannot carry. Constraints: no new runtime
dependencies; the git-connected deploy (ADR-0014) publishes `functions/` on the
first push to `main` with no separate gate; every failure must degrade to today's
behaviour; data generation/tessellation is out of scope.

## Decision

1. **Stateless Pages Function** `GET /api/postcodes/{postcode}`
   (`functions/api/postcodes/[postcode].ts` + pure, workerd-free `handler.ts`):
   validates shape (400), forwards to `POSTCODES_IO_BASE` with
   `POSTCODES_ACCESS_CLIENT_ID` / `POSTCODES_ACCESS_CLIENT_SECRET` (Pages secrets
   in prod; `.dev.vars` locally, added to `.gitignore`), returns a **stripped**
   `200 {postcode,latitude,longitude}`; upstream 404 → 404 JSON; 403/5xx/timeout
   → 502 generic (never echo upstream bodies); 5 s upstream abort budget. No
   `package.json` entries, no `wrangler.jsonc` change (directory convention).
2. **Client:** extend `src/lib/postcodes.ts` — shape predicate, spaced-form
   formatter, even-odd PIP ported from `scripts/build-data.mjs:438-455` (on-line
   band 1e-9 deg; on-line = inside no cell), bbox-prefiltered `findHospiceCell`
   memoised on array identity, and a 3 s `AbortController`-bounded
   `lookupByPostcode` that wraps everything in one try/catch → **never throws**.
3. **Wiring:** `StartHere` gains `catchments={kindCatchments}` (App.tsx:232-239);
   on tier-1 practice-map miss it geocodes, PIP-tests the **kind-filtered** cells,
   renders the existing "Open in panel" card on hit; every failure path renders
   the existing not-found card (one line reworded, owner sign-off requested). The
   kind filter is the sole disambiguator of the two-cell hit (ADR-0035: every
   covered point sits in exactly one adult + one children cell).
4. **Boundary tolerance:** a point within ~1e-9 deg (≈0.1 m) of a cell wall
   belongs to no cell → not-found. The acceptance vector P3 (BT15 3LH, 10.26 m
   from the NI boundary) is two orders of magnitude outside the band. Tolerance
   acceptance by ADR-0034 precedent (validator accepts 1e-9 / 1e-6 deg
   residuals); runtime band is identical to the build-time band.

## Alternatives considered

- **Client-side direct fetch to postcodes.io** — rejected: CF-Access credentials
  in the browser bundle; the single-use-renewable secret is exposed to any XSS.
- **Precomputed static postcode→hospice file** (~1.7M postcodes) — rejected:
  out of scope (data generation), tens of MB, stale by construction.
- **PIP inside the Function (return `hospiceId`)** — rejected: would need the
  ~6 MB catchments (KV + sync), losing statelessness; the client already holds
  the data.
- **Passing through raw upstream responses** — rejected: leaks upstream/Access
  detail (403 bodies are verbose), unbounded payload, unstable contract.

## Consequences

- Any real UK postcode resolves when the service is reachable; practice-map hits
  stay fully offline; 404/403/5xx/timeout/offline/PIP-miss all degrade to the
  not-found card with no throw.
- **No separate deploy gate**: the Function auto-publishes on the first push to
  `main` (ADR-0014 git-connected: `npm ci && npm run build` → publish). The
  function's handler logic is therefore pure and unit-tested under `node --test`
  so a broken tree fails pre-push without a Functions runtime.
- Credentials exist only in Pages secrets and local `.dev.vars` (git-ignored);
  rotation is a dashboard-only ops action; Security greps that values appear
  nowhere (feature.md acceptance 4).
- Added latency is on the miss path only, bounded (3 s client / 5 s function);
  measured client PIP cost: ≤94k verts per kind set, bbox-prefiltered → sub-frame,
  once per submit (no worker/chunking).
- No data build, tessellation, prerender-route, or dependency change →
  byte-identical double build and the `<loc>` count invariant are preserved.
- Not-found wording: resolved 2026-11-15 (final copy "a hospice catchment
  on this map", qa B1 verified). Children-mode miss (P1 = not-found by
  design, ADR-0035 separate sets) and lookup ignoring the nation selector
  (display filter only) stand as documented behaviour.
