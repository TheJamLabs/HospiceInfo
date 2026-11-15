# Feature: Cycle 7 — Postcode finder via self-hosted postcodes.io

Owner request (2026-11-14, verbatim): "To allow the hospice finder to
work please wire in my local hosted postcodes.io."

## Background

C6-3 shipped the offline normaliser only: "Find by postcode" (Start-here
page) resolves only postcodes present in `public/data/practices.json`
(≈11k geocoded GP-practice postcodes, space form "LS1 4AP"). Anything
else — e.g. `CF11 9HD`, `BT15 3LH`, pinned today as "clean not-found"
vectors in `tests/postcodes.test.mjs` — falls through to the "couldn't
match this postcode" state. This cycle adds an online fallback so the
finder works for *any* real UK postcode, degrading gracefully when the
service is unreachable.

## Owner-supplied service (verified live 2026-11-14)

- **Self-hosted postcodes.io**: `https://postcodes.thejamlabs.com`
  (owner-operated).
- **Cloudflare Access-protected**: requires the two header credentials
  `CF-Access-Client-Id` and `CF-Access-Client-Secret`. Values were given
  by the owner in chat; they must **never** enter the repo, bundle,
  docs, ledger, or this file — refer to them by name only. (Security
  note: the client-secret form is single-use-renewable; owner may rotate
  at will — the app reads them from Pages secrets, so rotation is an
  ops-only change.)
- `GET /postcodes/{URL-encoded postcode}` → `200`
  `{"status":200,"result":{"postcode":"PR7 2TH","latitude":53.652582,
  "longitude":-2.636219, ...}}` (verified live, 2026-11-14). Unknown
  postcode → `404` with `result` null (standard postcodes.io shape —
  Research to confirm if cheap).

## Design (constrained by the auth boundary)

The browser cannot hold the CF Access credentials, so the app calls a
**Cloudflare Pages Function** proxy:

1. **Proxy** in `functions/` (Cloudflare Pages, git-connected deploy per
   ADR-0014): `GET /api/postcodes/{postcode}` — validates the postcode
   shape, reads the two credentials from **Pages secrets** (never
   committed), forwards to the self-hosted postcodes.io, returns a
   minimal JSON `{postcode, latitude, longitude}` (stripped payload).
2. **Client fallback** (`StartHere.tsx`): on a `practices.json` miss,
   `fetch('/api/postcodes/' + code)` → on 200, point-in-polygon test
   against `public/data/catchments.json` cells → the hospice whose
   catchment contains the point → existing hospice card
   (`onOpenHospice`).
3. **Graceful degradation**: proxy 404 (unknown postcode), network/5xx,
   timeout, or no catchment contains the point → existing
   "couldn't match" not-found state (copy may be refined to note the
   online check was made). No throws, no broken UI.
4. **Offline-first**: a `practices.json` hit never touches the network.

## Working items (draft — PM owns the list)

- W1 `functions/api/postcodes.*` Pages Function proxy (no new runtime
  dependencies; reads secrets from `env`).
- W2 `src/lib/postcodes.ts` — geocode-fallback helper (fetch + point-in-
  polygon over catchments; minimal, no new runtime deps).
- W3 `src/components/StartHere.tsx` — wire fallback into submit flow,
  loading state, keep not-found path.
- W4 Tests (`node --test`, `tests/postcodes.test.mjs` + new files as
  needed): point-in-polygon helper against the real `catchments.json`
  (vector: PR7 2TH's coordinates → its containing hospice); degraded
  path (fetch unreachable → clean not-found). The existing CF11 9HD /
  BT15 3LH "not-found" pins become **fallback-resolves** vectors where
  their points land inside a catchment (Research reports which do).
- W5 ADR (proxy + fallback design; cites ADR-0014 deploy + the C6-3
  normaliser ADR) + maintainer docs: Pages secret names, `wrangler
  pages secret` setup commands, local dev via `wrangler pages dev` +
  `.dev.vars`.
- W6 Ops (`.agents/ops.md`): owner-executed secret setup, deploy = git
  push (ADR-0014), rollback = revert (the proxy is additive; the app
  degrades to today's behaviour without it).

## Acceptance criteria

1. A postcode **not** in `practices.json` (e.g. `PR7 2TH`, and `CF11 9HD`
   / `BT15 3LH` where their geocoded points lie inside a catchment)
   resolves to the hospice whose catchment contains the point — verified
   in the built app without code inspection.
2. A postcode **in** `practices.json` (e.g. `LS1 4AP`) still resolves
   offline with zero network calls.
3. Unknown postcode (proxy 404) and unreachable proxy both land in the
   not-found state — no throw, no broken UI, sensible copy.
4. The CF Access client id/secret appear **nowhere** in the committed
   tree, `dist/`, `.agents/`, or `docs/` (grep-verified at the Security
   stage).
5. Chain stays green and stable: `npm test`, `tsc -b && vite build`
   byte-identical across two runs, prerender `<loc>` count invariant
   (data count + 7).
6. ADR + maintainer docs (secret setup, local dev) landed.

## Out of scope

- The C6-2 invariant-6 Scottish-overlap BLOCKING — separate HUMAN
  DECISION REQUIRED section in `pipeline.md`; stays open, untouched by
  C7.
- C6-3's "later uncoded thread" — superseded by this explicit cycle.
- Data/tessellation changes (`build-data`, `validate-tessellation`).
- Push/deploy — James's ship gate.
- Removing the offline `practices.json` lookup (it stays tier 1).

## Human gates

1. **Pages secrets** — James runs the documented `wrangler pages secret
   put` commands (his Cloudflare account; pipeline never stores the
   values).
2. **Ship gate** — commit+push of the C7 ship commit (Cloudflare Pages
   auto-deploy, ADR-0014).
3. **Acceptance vectors** — `PR7 2TH`, `CF11 9HD`, `BT15 3LH` as pinned;
   James may substitute his own failed postcodes.
