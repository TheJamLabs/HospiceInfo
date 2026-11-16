# Cycle-8 Ops Plan — deploy, probes, rollback (Cloudflare Pages)

Plan-only stage: this file does not deploy, commit, or push. It tells the
owner (James) the exact sequence, the probe table to run after the push, and
the rollback story. Sources: `wrangler.jsonc`, `package.json`,
`docs/MAINTENANCE.md`, ADR-0037, `functions/api/postcodes/handler.ts`,
`functions/api/postcodes/[postcode].ts`, `.agents/requirements-cycle8.md`
(W11), `.agents/security-cycle8.md` (findings), `git status` (2026-11-15).

No secrets appear anywhere in this file; the three env names are used by name
only and their values never read, logged, or committed.

## 1. Deploy plan

The existing git-connected Cloudflare Pages chain (ADR-0014) is used as-is;
no new platform, no new build step, no `wrangler.jsonc` change:

- `wrangler.jsonc`: `name: "hospiceinfo"`, `pages_build_output_dir: "dist"`
  — project name and the publish directory. No build command is declared in
  the repo; the Pages project build command is `npm ci && npm run build`
  (docs/MAINTENANCE.md, Deploy section).
- `package.json` `build` = `tsc -b && vite build && node scripts/prerender.mjs`.
  Current build shape after the C8 W10 chain: **231 files in `dist/`**,
  **215 `<loc>`** in `sitemap.xml` (208 hospice pages + 7 others — C6 closeout).
- The Pages project `hospiceinfo` is git-connected to `main`: every James-
  approved push runs `npm ci && npm run build` and publishes `dist/`
  (docs/MAINTENANCE.md). No local `wrangler login` or `wrangler pages deploy`
  needed.
- C8 adds the Pages Function at repo-root `functions/api/postcodes/` — by
  Pages convention it ships with the `dist/` deploy on the first push, no
  separate gate (ADR-0037: "the Function auto-publishes on the first push to
  main"). No `package.json` dependency or script added.
- `dist/` and `.dev.vars` are git-ignored; `data-raw/` stays committed and is
  excluded from the deployment (only `dist/` ships).
- Hosting check (2026-11-15, github MCP): remote is
  `git@github.com:TheJamLabs/HospiceInfo.git`, **0 open PRs** — the ship path
  is a direct push to `main`; no CI gate to reconcile. The pre-push gate is
  the W10 four-command chain, already green (23/23 `node --test`, `tsc -b`,
  byte-identical double build, `npm run check:layout`).

Owner sequence (James):

1. **Ship gate — commit the uncommitted C8 work.** `git status` (2026-11-15):
   `main` at `c0300db` is one commit ahead of `origin/main` (`aaee725`, the
   C6 ship) and the working tree holds the C8 changes: modified `src/App.tsx`,
   `src/components/StartHere.tsx`, `src/lib/postcodes.ts`, `.gitignore`,
   `docs/MAINTENANCE.md`, GLOSSARY/data files, plus untracked `functions/`,
   `tests/*.mjs`, `docs/adr/0037…0041`, `.agents/*_cycle8.md`.
2. **Push to `main`** → Pages auto-rebuilds and publishes (231 files +
   `functions/`).

   ```bash
   git add -A
   git commit -m "Cycle 8: online postcode fallback tier-2 — Pages Function
                  proxy (functions/api/postcodes/), start-here geocode + PIP,
                  ADR-0037..0041; 23/23 tests, byte-identical double build"
   git push origin main
   ```

   (Commit message wording is the owner's; `-A` matches repo convention —
   `.agents/` state artifacts are committed in prior cycles.)
3. **Watch the new deployment** in the Pages dashboard (project `hospiceinfo`
   → Deployments), confirm build exit 0, then run the §3 probes. Branch
   previews (push a branch → preview URL) remain available for pre-promote
   checks if the owner wants one.

## 2. Owner secret setup (.dev.vars + Pages env)

Three env names, **by name only** (values are never written in this file):

| Name | Purpose (per `functions/api/postcodes/[postcode].ts`) |
|---|---|
| `POSTCODES_IO_BASE` | base URL of the owner's self-hosted postcodes.io |
| `POSTCODES_ACCESS_CLIENT_ID` | Cloudflare Access client id → `CF-Access-Client-Id` header |
| `POSTCODES_ACCESS_CLIENT_SECRET` | Cloudflare Access secret → `CF-Access-Client-Secret` header |

Cloudflare Pages (project `hospiceinfo`), one command per name:

```bash
wrangler pages secret put POSTCODES_IO_BASE
wrangler pages secret put POSTCODES_ACCESS_CLIENT_ID
wrangler pages secret put POSTCODES_ACCESS_CLIENT_SECRET
```

Each prompts in the terminal (hidden input). Equivalent form on current
wrangler: `wrangler secret put <NAME> --project=hospiceinfo`. Wrangler is not
pinned in this repo (docs/MAINTENANCE.md uses `npx wrangler ...`), so run the
latest `npx` wrangler; both CLI forms work. Rotation later is a
dashboard-only ops action (Settings → Environment variables → Variable).

Local dev: create `.dev.vars` at the repo root containing the same three
names, e.g. line format `POSTCODES_IO_BASE=<value>` etc.

- The file is git-ignored — verified: `git check-ignore -v .dev.vars` →
  `.gitignore:12:.dev.vars` (line 12 of `.gitignore`; line 3 is `.wrangler/`
  as of the C8-OPS-1 fix, 2026-11-16).
- Values are entered by hand by the owner. The file is never read, logged,
  committed, or referenced from `.agents/`/`docs/` — ac4 requires secret-shape
  greps to return 0 matches repo-wide.
- Serve the built app with the Function locally: `npx wrangler pages dev dist`
  (docs/MAINTENANCE.md, Quick start, C8 section). Without `.dev.vars` the
  upstream returns 403 → the function 502s → start-here shows the not-found
  card (documented degradation).

**Local route-shell smoke probe (post-C8-OPS-1 fix, 2026-11-16)** — no auth,
no secrets needed; probes the committed route shell against a real Pages
runtime (wrangler 4.162.0, compat date 2026-11-13):

```bash
npx wrangler pages dev dist --local --port 8931 &    # background
curl -s -D - http://127.0.0.1:8931/api/postcodes/ABC      # → 400 {"error":"bad-postcode"} (env-independent)
curl -s -D - http://127.0.0.1:8931/api/postcodes/PR72TH   # → 502 with unreachable base (transport catch); 200 only with real .dev.vars
kill %%   # stop the local server when done
```

The 400 on the malformed probe is the secret-free route-shell gate (live
equivalent: P5 in §3). Before the C8-OPS-1 fix this probe returned
`500 TypeError: Cannot read properties of undefined (reading 'postcode')`
at `[postcode].ts:27` — the runtime supplies `context.params`, not
`context.requestParams`. QA round 2 exercised `handler.ts` pure logic only;
this probe is the route-shell regression guard — re-run after **any** change
under `functions/`.

## 3. Post-deploy probe table (W11)

Run after the first `main` push once the publish completes. Live origin per
docs/MAINTENANCE.md: `https://hospiceinfo.pages.dev` — substitute the custom
domain there if the owner points one at the project. All commands are
secret-free. Expected bodies cross-checked against `handler.ts`
(`shapeUpstream`) and the W11 table in `.agents/requirements-cycle8.md`.

| # | Probe | Command | Expected |
|---|---|---|---|
| P1 | valid (acceptance vector) | `curl -s -D - https://hospiceinfo.pages.dev/api/postcodes/PR72TH` | `200`; body exactly 3 keys: `{"postcode":"PR7 2TH","latitude":<finite number>,"longitude":<finite number>}`; headers `content-type: application/json`, `cache-control: no-store` |
| P2 | valid (acceptance vector) | `curl -s https://hospiceinfo.pages.dev/api/postcodes/CF119HD` | `200`; `{"postcode":"CF11 9HD","latitude":…,"longitude":…}` |
| P3 | valid (acceptance vector) | `curl -s https://hospiceinfo.pages.dev/api/postcodes/BT153LH` | `200`; `{"postcode":"BT15 3LH","latitude":…,"longitude":…}` |
| P4 | valid (tier-1 vector; W11 probe 1) | `curl -s https://hospiceinfo.pages.dev/api/postcodes/LS14AP` | `200`; `{"postcode":"LS1 4AP","latitude":…,"longitude":…}` (in the UI, LS1 4AP resolves at tier 1 — a P1 hit performs **no** fetch at all, ac2) |
| P5 | malformed (W11 probe 2) | `curl -s -D - https://hospiceinfo.pages.dev/api/postcodes/ABC` | `400`; body exactly `{"error":"bad-postcode"}`; same JSON headers |
| P6 | valid-shape, unresolvable (W11 probe 3) | `curl -s https://hospiceinfo.pages.dev/api/postcodes/AA99AA` | `404`; body exactly `{"error":"unknown postcode"}` |
| P7 | upstream failure (W11 probe 4) | run P1 **before the §2 secrets are set** (or after deleting one) | `502`; body exactly `{"error":"postcode service unavailable"}` — empty credentials make upstream return 403 and the contract maps 403 → 502; start-here then renders the not-found card |

Notes:

- **UI-level check for P1–P3** (acceptance vectors, ac1): type each postcode
  into the start-here card on the live site. Each tier-1-misses, geocodes via
  the Function, and the point lies in exactly **two** catchment cells — one
  adult + one children (ADR-0035); the **kind filter** is the sole
  disambiguator, and the "Open in panel" card must render in the UI's current
  mode. P3 (BT15 3LH) is 10.26 m from the NI boundary — well outside the
  ~1e-9 deg on-line band (ADR-0037).
- **R-1 observation (W11 probe 4 note):** if any probe reads **500** instead
  of 502/404, it is a function-internal failure (missing/typo'd env key), the
  SEC-8-02 class — record it with that class label; fix by re-setting the
  secret per §2, no code change.
- **Do not force a post-secrets 502**: after §2, 502 only occurs on genuine
  upstream failure / the 5 s abort budget; P7 covers the contract row via the
  no-credential scenario, which is also the documented degradation in
  docs/MAINTENANCE.md.
- Acceptance (per W11): all outcomes match (or the deviation is recorded with
  the R-1 class label); headers verified on at least one 200 and one non-200
  (P5 shows `content-type` + `cache-control`). Paste results into
  `.agents/implementation.md` before W11 is marked done.

## 4. Rollback

C8 touches no data files, no dependencies, no build scripts — the Functions
and the client fall-through are the only runtime surface, so rollback is low-
risk and needs no migration, no env cleanup (leaving the three secrets set is
harmless; deleting them merely re-arms P7's degradation), and no data
re-generation.

1. **Live site (primary):** Cloudflare Pages keeps every release. Dashboard:
   Workers & Pages → `hospiceinfo` → Deployments → select the previous release
   → **Restore**. The prior live release is the build of `origin/main =
   aaee725` (C6 ship) — the current live state before the C8 push. No
   dashboard command is needed beyond that single action.
2. **Code route (drift-proof):** after restoring, lock the repo back:

   ```bash
   git revert <C8-ship-commit-sha>
   git push origin main
   ```

   → the git-connected chain rebuilds and republishes the previous state
   (ADR-0014). After this, `GET /api/postcodes/*` 404s (the prior release
   predates `functions/`) — expected.
3. **Data:** no rollback needed — C8 has no data-file change; the
   byte-identical double-build invariant and the 215 `<loc>` count are
   preserved (W10). Data-set rollback by re-running the data chain
   (docs/MAINTENANCE.md) is available as always but not relevant to C8.

**Why it is low-risk — the client-side degradation chain** (verified against
ADR-0037 and docs/MAINTENANCE.md): start-here resolves tier 1 (GP-practice
PIP over `practices.json`, **zero network**); only on a tier-1 miss does it
call the Function once, bounded by a 3 s client `AbortController` budget.
Every failure mode — invalid shape 400, unknown 404, 502, workerd 500,
timeout, non-finite coords, point in no cell, kind miss, or the route itself
missing (404 post-rollback) — lands on the **existing not-found card with no
throw** (ac3). A deployed site without the Function therefore behaves
exactly as pre-C8, which is why the rollback degrades gracefully on its own
even mid-session.

**When to roll back vs fix:** probe P7 = `502` → re-set the secret (fix, no
rollback). Any `500` on `/api/postcodes/*` → env-name typo (SEC-8-02 class)
→ re-set (fix, no rollback). Static-site regression (e.g. `<loc>` count
off, layout check failing in the publish) → restore prior release + revert
commit, then re-run the W10 chain on the next cycle.

## 5. Carried findings (documented debt — do NOT fix in this stage)

From `.agents/security-cycle8.md` (0 Blocking, 2 risk-accepted, 2
informational):

- **SEC-8-01** (Low, **design-level**, risk-accepted — carried from reviewer
  S-1, wording aligned verbatim): `GET /api/postcodes/{postcode}` is
  C8's first live runtime boundary and carries no client auth — any internet
  caller can geocode through the owner's self-hosted postcodes.io with the
  owner's CF-Access credentials attached server-side. Not a secret or data
  leak (stripped 3-key response, fixed minimal bodies, no upstream
  echo, `no-store`); the residual is **capacity/abuse only** — unbounded
  caller volume consumes the owner's upstream instance.
  *Ops monitoring:* Workers & Pages → `hospiceinfo` → Analytics — watch the
  request rate and 5xx rate of `/api/postcodes/*`; set an Analytics alert on
  a sustained call-rate spike (e.g. > 100 req/min). If the threshold is hit,
  the escalation path is owner-side upstream capacity or a Cloudflare
  rate-limiting / Access allowlist on the upstream (out of C8 scope).
- **SEC-8-02** (Low, risk-accepted — R-1): a function-internal failure (e.g.
  missing `POSTCODES_IO_BASE` → `TypeError` at `base.replace` before the
  transport `try`) yields workerd's default **500**, never the contract's
  502. The body is generic and leaks nothing (no env values, no paths, no
  stack); the client treats every non-2xx identically (not-found card).
  *Ops monitoring:* same Analytics view — a **500-class status on
  `/api/postcodes/*` should read 0**; alert on the first 500 (means an env
  key is unset/typo'd → re-set per §2), distinct from 502 (upstream/timeout,
  expected during an upstream incident).
- Informational (recorded, non-actionable): SEC-8-03 (postcode
  shape/spaced-form logic duplicated client ↔ function; drift is caught
  pre-push by the shared vector suite `tests/postcode-vectors.mjs`, 23/23
  green) and SEC-8-04 (`functions/` is outside `tsc -b`; the `node --test`
  env-key-literal pin test is the function-side check — carried as a
  documented tooling gap, see §6).

## 6. Open questions for the owner

1. **Probe origin:** §3 uses `https://hospiceinfo.pages.dev` (the URL in
   docs/MAINTENANCE.md). If a custom domain is attached to the project,
   substitute it in the P1–P7 commands — confirm before running.
2. **Commit message** for the C8 ship commit (owner's ship gate; W12 explicitly
   leaves nothing committed).

All other C8 owner questions (OQ1 not-found copy, OQ3 children-mode miss,
OQ5 nation-selector) are resolved with owner sign-off 2026-11-15
(`.agents/requirements-cycle8.md` §6).

**Tooling gaps (recorded for Docs):** none blocking. `wrangler` is not
installed locally (repo convention is `npx wrangler`, latest version — both
secret-put forms in §2 work on current wrangler); no Bicep/IaC exists in this
repo (nothing to `bicep build`); Azure and MAUI MCP surfaces are not
applicable to a Cloudflare Pages deploy. GitHub MCP was reachable: 0 open PRs,
no CI checks to reconcile — the W10 chain is the sole pre-push gate.
