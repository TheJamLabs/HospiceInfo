# Security — UK-wide hospice catchment map (stage 7, 2026-10-16)

Scope source: `.agents/feature.md`. Executed by the Engineering Lead: the
dispatched security sub-session was silent for >20 min with no artifact on
disk; per the operator-validated policy for one-shot stage artifacts in this
ACP/vllm environment, the lead ran the full review directly and wrote this
report. All evidence below is from this pass (2026-10-16).

## Verdict

**PASS — no Blocking findings, no design-level rework required.**
SEC-1/SEC-2 risk-accepted (dev-only dependencies); SEC-3 design-level note
(documented trust boundary, not a defect); SEC-4 low risk-accepted
(attribution gap).

## Findings

| id | Finding | Severity | Level | Evidence | Rationale / recommendation |
|----|---------|----------|-------|----------|------------------------------|
| SEC-1 | `xlsx@0.18.5` (SheetJS on npm): prototype pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9), both flagged high; `npm audit` offers no npm fix | risk-accepted | code-level | `npm audit` output (log below): `xlsx  *` high ×2, "No fix available" | The package is a **devDependency used only by maintainer-run local scripts** that parse a file the maintainer downloaded themselves from the regulator's site. It is not in the runtime bundle (`dist/assets/*.js` is built only from `src/`), no server exposes it, and untrusted input never reaches it in an automated way. The patched build ships only via SheetJS's own CDN registry (a supply-chain trade-off, not an improvement for this use case). Carry-forward: if a script ever parses data from an untrusted source, re-evaluate. |
| SEC-2 | `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99, moderate, via `vite <=6.4.2`): local dev-server request-response exposure | risk-accepted | code-level | `npm audit` output: fix requires `vite@8.3.4` (breaking) | Dev tooling only; the Vite dev server binds to localhost and is used by one maintainer on a personal machine, never exposed to the network (`npm run dev` default). A breaking major bump of the build toolchain for a static site is not justified. No action. |
| SEC-3 | Data-flow design: maintainer scripts egress public postcodes to OSM Nominatim and fetch from four regulator endpoints; the built site performs no network calls except OSM tiles | design-level (note, not a defect) | design-level | `scripts/geocode-postcodes.mjs` L19 (User-Agent header, 20 s timeout), L86 (1000 ms pacing = 1 req/s), L64/L70 (30 s / 5 s backoff on 429/503); query is the postcode unit only (`data/README.md` line 26: `?q=<unit>&countrycodes=gb&format=jsonv2&limit=1`); `src/` contains no `fetch` to third parties (only same-origin `/data/*.json` via `useAppData`) | This is the trust boundary as designed, and it is sound: the egressed data is postcodes (public, no PII), pacing + User-Agent + backoff satisfy the Nominatim usage policy, and the runtime surface is a static SPA with no backend, no auth, no user input persistence, and no telemetry. Deliberately un-defended threats: none worth defending — there is no user data, no secret, and no server endpoint to attack. No rework routed to the Architect. |
| SEC-4 | Derived coordinates (Nominatim/OSM, ODbL) lack an explicit ODbL attribution statement for the *data* (tile attribution is present in-app) | risk-accepted (low) | code-level | `MapView.tsx` TileLayer carries `&copy; OpenStreetMap contributors`; `data/README.md` names "OSM Nominatim" as the source (lines 26, 28) but contains no ODbL credit sentence | ODbL requires attribution of the source for derived works. One-line doc fix, not a behaviour break: add "© OpenStreetMap contributors, made available under ODbL" to the `postcode-geo.csv` row in `data/README.md`. |
| SEC-5 (evidence, not a finding) | Outbound links from data-derived URLs | n/a | code-level | `App.tsx:135,139` — the only `target="_blank"` links, both with `rel="noreferrer"` (implies noopener); `javascript:` absent from all of `public/data/` (grep: 0 matches); no `dangerouslySetInnerHTML` anywhere in `src/` (grep: 0 matches) | Injection surface is inert: all user- and data-derived strings render through React JSX text; the only free-form data URLs are the website/CQC register links after the checks above. |

## Trust boundary & data flow (threat model)

**In:** four public UK regulator registers + two public GP-practice files,
fetched by a human (kept in `data-raw/`, committed for reproducibility).
**Transform:** local Node scripts (extract → merge → geocode → build) run by
the maintainer on this machine only. The only automated egress is
geocoding: postcode unit → OSM Nominatim, 1 req/s, explicit User-Agent,
backoff on 429/503 — public data out, coordinates in (ODbL, see SEC-4).
**Out:** `public/data/*.json` → static site (`dist/`), served same-origin;
the browser fetches only its own `/data/*.json` files and OSM tiles.

The runtime has no authentication by design (public information, no user
accounts), no forms, no persistence of user input (search/filter/toggle are
ephemeral React state), and no telemetry of any kind (grep across the repo
for analytics trackers: 0 matches). Nothing in the pipeline or the site
handles personal data, health data, or credentials: public-data PII sweep
results — no phone patterns, no email addresses (the 22 `@` hits in
`public/data/` are all inside organisation name strings such as
"ACCORD@Home"), no individual names beyond the organisation/practice names
that the registers publish.

**Deliberately un-defended, and why acceptable:** modification of
`public/data/*.json` by someone with write access to the hosting origin —
that threat is identical for any static site and is outside this
repository's control; tamper-evidence is not a requirement of
`feature.md`.

## Design-level findings

- SEC-3 (above) — recorded explicitly per the pipeline rule that
  trust-boundary/data-flow findings are marked design-level. It requires
  no rework: the design is the boundary, and the boundary is sound. No
  routing to the Architect.

## Verification log (2026-10-16, single commands)

1. `npm audit` → 3 vulnerabilities (esbuild moderate via vite; xlsx high ×2, no fix available); exit 1 by design
2. grep `dangerouslySetInnerHTML` in `src/` → 0 matches
3. grep `javascript:` in `public/data/` → 0 matches
4. grep `target="_blank"` in `src/` → 2 matches (`App.tsx:135,139`), both `rel="noreferrer"`
5. grep `@` in `public/data/` → 22 matches, all organisation-name strings (checked individually)
6. grep phone/tel/fax/mobile patterns in `public/data/` → 0 matches
7. grep secret/token/password/key assignments in `src/` and `scripts/` → 0 matches
8. grep analytics/telemetry identifiers across `*.html,*.tsx,*.ts,*.js,*.mjs,*.css` → 0 matches
9. `scripts/geocode-postcodes.mjs` L19/64/70/86: User-Agent, 30 s/5 s backoff, 1000 ms pacing, 20 s timeout
10. `data/README.md` lines 26–29: Nominatim policy row (1 req/s, explicit User-Agent), OSM source rows
11. `src/components/MapView.tsx` TileLayer attribution string present (OSM copyright link)
12. Data shape spot-checks: catchment row keys `hospiceId,name,nation,kind,curated,practiceCount,polygons`; practice rows carry `id,name,address,postcode,lat,lon,nation,hospiceId` — no free-text personal fields beyond published names/addresses

## Note

The dispatched security sub-session never landed an artifact; this report
supersedes it (lead takeover, per operator-validated policy).
