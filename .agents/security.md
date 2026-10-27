# Stage 7 — Security review (Cycle 2)

- **Stage:** 7 of 10 (Security engineer), parallel with QA (6)
- **Date:** 2026-10-26
- **Cycle:** 2 — supersedes the 2026-10-22 Cycle 1 report at this path (PASS / 0 Blocking; SEC-F1 ODbL attribution resolved in Cycle 2; SEC-F2/SEC-F3 carried forward, design-level, informational). Carried risk-accepted findings re-checked below.
- **Scope:** static SPA (React 18, react-leaflet 4, Vite 5, TS strict, Bootstrap 5.3 ESM) on Cloudflare Pages. Base `475675a` + uncommitted Cycle-2 working tree. Cycle 2 changes under review: StartHere diagnostic flow incl. exact local postcode lookup (W4), shared per-colour divIcons (P6), grid-bucket LOD markers (P2), HospicePanel search/sort/toggle (W7/W8/W9), Methodology/About content (W7/W8), 0-space data re-serialization (P5/W1), logo/manifest assets, footer copy.
- **Method:** read-only on-disk verification (RQ-1 — every claim cites a file:line, a grep run, or a command executed this pass). No source modified, no `git add`/`commit`, no installs.
- **Trust model (unchanged, re-verified):** no backend, no auth, no cookies, no telemetry. Trust boundary = "static assets + public JSON" served over HTTPS; the only runtime egress is OSM tiles; the only outward user action is a user-initiated `mailto:`.

## Verdict

**VERDICT: PASS — 0 Blocking findings.** No new findings. SEC-F1 (ODbL attribution) is resolved by the Cycle-2 Licences/footer work (verified in §7). No design-level finding requires Architect rework.

## Per-area conclusions (8 areas)

### 1. StartHere postcode flow

- Entry is constrained before any use: `input pattern="[A-Z0-9 ]{5,7}" maxLength={7}`, `onChange` uppercases and strips non-alphanumerics (`src/components/StartHere.tsx:42`); submitted value passes `normalisePostcode` (`StartHere.tsx:15-18`) → invariant charset `[A-Z0-9]{5,7}`.
- Matching is **exact local** against the practice set: memoised `Map` over `practices` (`StartHere.tsx:25-31`); the found-state renders `{practice.name} · {practice.postcode}` and `{hospice.name} · {hospice.town}` as plain JSX text nodes (`StartHere.tsx:144-150`) — React-escaped, no `dangerouslySetInnerHTML`.
- **No geocoder, no network, no storage, no analytics**: grep `fetch|localStorage|sessionStorage|geolocation|XMLHttpRequest|WebSocket` in `StartHere.tsx` → 0 matches. The date field is display-only, never parsed or transmitted (`StartHere.tsx:48`).
- The typed postcode flows only to (a) the local map lookup, (b) the mailto body via `encodeURIComponent` (§2), (c) React text — never into a URL, an attribute bypass, or egress.

**Clean.** A hostile input is reduced to `[A-Z0-9]{5,7}` before downstream use; every sink is React-escaped. (ADR-0012's zero-network concern is upheld in code.)

### 2. mailto via `feedbackMailto`

- `src/lib/feedback.ts:26-35`: subject and body each pass through `encodeURIComponent`; body lines are joined then encoded as one unit. Inputs are `point.postcode` (normalized, §1), `point.name`, `point.id` — all from local JSON or the normalized postcode.
- `siteConfig.contactEmail = 'hello@thejamlabs.com'` is a static operator constant (`src/lib/siteConfig.ts:19`), no credentials.
- `encodeURIComponent` neutralises `?`, `&`, `%`, and newlines in subject/body; with the `[A-Z0-9]` postcode charset below it, additional query-parameter injection is impossible.

**Clean — no mailto/header-injection vector.** (CY-1 SEC-F1 confirmation; no regression.)

### 3. New static assets (`public/logo.svg`, `public/manifest.webmanifest`, `index.html`)

- `logo.svg`: `<path>`/`<circle>` primitives only, fills `#1d4ed8`/`#ffffff`; **no** `<script>`, no animation, no external refs, no remote images.
- `manifest.webmanifest`: `start_url: "./"`, icons reference only local `/logo.svg`; no `id`/`scope` off-origin, no service-worker fields.
- `index.html`: the diff adds exactly two `<link>`s — `rel="icon" type="image/svg+xml" href="/logo.svg"` and `rel="manifest" href="/manifest.webmanifest"` — no `crossorigin`/`integrity`/`referrerpolicy` attributes; all scripts/links remain local. No new CSP mechanism (none exists in this repo; static hosting).

**Clean.** Local-only references, inert SVG, benign PWA metadata.

### 4. Map layers / divIcon HTML surface

- `hospiceIcons` (`src/components/MapView.tsx:45-55`): `html: '<span class="hospice-marker" style="background:${h.color}"></span>'` — interpolates **only** the deterministic hex colour from local JSON. `hashToColor` (`scripts/build-data.mjs:29-41`) emits `#` + six hex digits (`toString(16).padStart(2,'0')`) — the string cannot carry markup.
- `shopIcons` (`MapView.tsx:60-70`): same pattern, `c` is the shop's hex colour. No names/URLs interpolated.
- `bucketIcons` (P2, `MapView.tsx:14-38`): `html` interpolates **only** `b.count` — an integer from an in-memory `Array.length`; CSS is inline static. Bucket badges are numeric-only.
- Practice `CircleMarker`s (W4) are self-closing with `id`/`fillColor`/`fillOpacity` props only; the Cycle-1 risk of per-practice tooltip content is **removed** (no `<Tooltip>` inside the practice-marker loop). Catchment/shop `<Tooltip>`s remain with React-escaped label content, unchanged from Cycle 1.
- Grep `dangerouslySetInnerHTML|innerHTML` in `src/` → 0 matches; the divIcon `html` field is the only raw-HTML sink, and all values reaching it are operator-controlled colours/numbers.

**Clean.** No new injection surface from P2/P6/W4.

### 5. Search / sort / toggle (HospicePanel)

- `src/components/HospicePanel.tsx`: filter = `nation` + `includes(q)` + `!publishedOnly || h.kind === 'published'` (W8); sort = `localeCompare` on name with `id.localeCompare` tie-break, count-sort by `counts.get(id)` delta (W9); 200 ms trailing debounce via a string-free `setTimeout` callback.
- Grep `eval(|new Function(` in `src/` → 0 matches.

**Clean.** Pure in-memory array transforms; no dynamic-code surface.

### 6. Data exposure re-check (0-space re-serialization, P5/W1)

| File | n | Keys (identical to Cycle 1) |
|---|---|---|
| `hospices.json` | 155 | id, name, town, postcode, lat, lon, color, kind, source, website, cqcUrl, curated, nation |
| `practices.json` | 10,475 | id, name, address, postcode, lat, lon, nation, hospiceId |
| `catchments.json` | 155 | hospiceId, name, nation, kind, curated, practiceCount, polygons |
| `shops.json` | 138 | id, name, address, postcode, lat, lon, hospiceId, outsideCatchment, source |

- `git show 475675a:public/data/{hospices,practices,shops}.json` first records are **value-identical** to the working-tree first records; only `, `/`: ` ` separators and the trailing newline differ. The re-serialization changed **no keys, no values, no PII**.
- No care-team/contact PII: key sets contain no phone/email/contact fields; `@` scan across all four files → 22 total hits, all business-name decoration (e.g. `ACCORD@Home`, `The Clinic @51`) — zero email addresses; no phone-number fields exist.
- Escape invariant holds: `x=` digit-separator escaping survives in `practices.json`/`hospices.json` (verified this pass); no trailing whitespace; `JSON.parse` succeeds on all four files at expected counts.
- The `district` field (W12) is emitted for **0** of 10,475 practices — the code path exists, no data flows through it; benign.

**Clean.** The public data surface is exactly the Cycle-1 surface.

### 7. No-new-surface audit (grep `src/`)

| Pattern | Count | Location |
|---|---|---|
| `fetch(` | 2 | `src/lib/useAppData.ts:4` (same-origin `/data/*.json`, paths literal at the four `App.tsx:19-22` call sites), `src/pages/CorrectionsPage.tsx:26` (same-origin `/data/corrections.json`) |
| `XMLHttpRequest` / `WebSocket` | 0 | — |
| `localStorage` / `sessionStorage` | 0 | — |
| `dangerouslySetInnerHTML` / `innerHTML` | 0 | — |
| `eval(` / `new Function` / `document.write` | 0 | — |

No user input reaches any fetch URL; no new runtime dependencies in `package.json` (diff vs base: none added).

**Clean.** No new network, storage, or code-execution surface.

### 8. Hosting / secrets / trust boundary

- Grep `API_KEY|token|secret|Bearer|password` in `src/` → 0 matches. In `public/` → 1 compound hit, both benign substring false-positives inside `practices.json` practice names (`Stokenchurch`, `Secret Aesthetics Ltd`).
- The only external origin is `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (`MapView.tsx`, pre-existing, no key, no user input in URL).
- Static hosting posture: no auth, no cookies, no backend, no server-rendering. Cycle 2 adds nothing that moves the boundary.
- CY-1 SEC-F1 (ODbL attribution) **resolved**: footer (`siteConfig.ts:20-26`) now carries "Map tiles © OpenStreetMap contributors, © OpenStreetMap Foundation — ODbL v1.0. Full data attribution and licensing: see the Licences page." — verified against the current file.

**Clean. Trust boundary unchanged: "static assets + public JSON".**

## Findings

| id | area | description | severity | status |
|---|---|---|---|---|
| — | — | No new Cycle-2 findings | — | — |

Blocking: **0**. New risk-accepted: **0**.

## Carried-forward risk-accepted set — re-check

| prior id | finding | Cycle-2 status |
|---|---|---|
| SEC-F2 | Static-site trust posture (design-level, informational) | **Unchanged — risk-accepted.** Re-verified: no storage/auth/backend added (§7, §8). |
| SEC-F3 | Human-curation supply chain = build-time trust boundary (design-level) | **Unchanged — risk-accepted.** `scripts/add-correction.mjs`/`validate-corrections.mjs` untouched by Cycle 2; `CorrectionsPage.tsx` now correctly reads the bare-array format (the Cycle-1 non-security observation, `json.corrections` mismatch, is fixed and commented) — the page's one local fetch is same-origin (§7). |
| SEC-1…SEC-5, SEC-7…SEC-9 (Cycle 1 table) | Retired OGL phone-number artefact; register-extract projection; practice-name personal names; dev-only npm advisories; human-fetch supply chain; Nominatim/Overpass netiquette | **Unchanged — risk-accepted.** None are touched by Cycle-2 diffs; data re-serialization does not reintroduce any retired field (key sets verified §6). |
| SEC-F1 | ODbL/attribution on Licences page + footer + README | **Resolved** in Cycle 2 — footer now attributes OSM contributors + ODbL and points to the Licences page (`siteConfig.ts:20-26`); no rework needed. |

## Design-level findings

**None.** No trust-boundary, authentication, data-flow, or storage-model change introduced by Cycle 2. Nothing routes back to the Architect.

## Verification log (2026-10-22, Cycle 2, read-only)

| # | command/inspection | key output |
|---|---|---|
| 1 | grep `unassigned\|no catchment\|data gap\|localStorage\|sessionStorage\|fetch(\|navigator\.geolocation` in `StartHere.tsx` | 0 matches |
| 2 | grep `fetch(\|XMLHttpRequest\|WebSocket\|sendBeacon\|importScripts\|navigator.` in `src/` | 2 hits: `useAppData.ts:4`, `CorrectionsPage.tsx:26` (both same-origin local JSON) |
| 3 | grep `dangerouslySetInnerHTML\|innerHTML\|eval(\|new Function\|document.write` in `src/` | 0 matches |
| 4 | read `StartHere.tsx` | §1: pattern/maxLength/normalise postcodes; local `Map` match; JSX-text found-state; `feedbackMailto` reuse |
| 5 | read `src/lib/feedback.ts`, `src/lib/siteConfig.ts` | §2: `encodeURIComponent` subject+body; static operator contact |
| 6 | read `index.html`, `public/manifest.webmanifest`, `public/logo.svg` | §3: two local `<link>`s; local-only manifest; inert SVG |
| 7 | read `src/components/MapView.tsx` | §4: divIcon `html` = hex colour / integer count only; practice-Tooltip removed |
| 8 | read `src/components/HospicePanel.tsx` | §5: pure in-memory filter/sort/debounce |
| 9 | `git show 475675a:public/data/*.json` first records vs working tree | value-identical; whitespace-only diff (§6) |
| 10 | `node` key-set dump of all four data files | 155 / 10,475 / 155 / 138; key sets identical to Cycle 1 |
| 11 | `node` `@`/escape/trailing-ws scan over the four files | 22 `@` all business-name decoration; `x=` escapes intact; no trailing ws |
| 12 | grep `API_KEY\|token\|secret\|Bearer\|password` in `src/` and `public/` | 0 in `src/`; 2 benign name substrings in `practices.json` |
| 13 | read `src/lib/siteConfig.ts`, `package.json` | no secrets; no new dependencies |

Every conclusion is pinned to a row of this log. All 8 areas verified; no incomplete section; no TODOs.
