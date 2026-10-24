# ADR 0009 — Site configuration single source (`src/lib/siteConfig.ts` + committed `data-raw/site-config.json`)

**Status:** accepted (2026-10-21)

## Context

Feature.md requires: *"Exactly one shared source for operator name/email used
in mailto links (Feedback, Corrections log), the About page, and one (and only
one) corrections log 'contact' line."* Currently, no such shared module exists.
The `data/README.md` template contains literal `[name]` / `[contact address]`
placeholders that would need to be copy-pasted across pages and scripts.

Research recommends a dedicated module pattern: `src/lib/siteConfig.ts` (value
lives in a file; clearly marked placeholders) + a sibling `data-raw/site-config.json`
consumed by the curation scripts, so that UI and log-generation share the same
value. The approach is already proposed in research §6.

The shared source must be easy to swap at build time: change the JSON file,
re-run the build chain. The UI reads the config at runtime.

## Decision

**Create a shared site configuration source**: `src/lib/siteConfig.ts` declares
the interface; `data-raw/site-config.json` is the canonical data file used by
the build scripts. At runtime `siteConfig.ts` exports a constant or
`useSiteConfig()` hook that reads the JSON or uses the exported constant.

### Structure

`src/lib/siteConfig.ts`:

```ts
// Placeholder operator data — DO NOT EDIT HERE; update `data-raw/site-config.json`

interface SiteConfig {
  operatorName: string;  // e.g. "Hospice Info Team"
  contactEmail: string;   // e.g. "hospice-info@example.com"
  // other static fields here (maybe later: social links, etc.)
}

const config: SiteConfig = {
  operatorName: "YOUR_PLACEHOLDER_HERE — update data-raw/site-config.json",
  contactEmail: "YOUR_PLACEHOLDER_HERE — update data-raw/site-config.json"
};

export default config;
```

At build time the curation script `scripts/add-correction.mjs` reads
`data-raw/site-config.json` to compose the body text. All pages that use
mailto links read `siteConfig.ts`.

When the operator is finally identified, the human updates `data-raw/site-config.json`
(once), then re-runs the build chain:

```
node scripts/add-correction.mjs  # if needed
npm run build-data
node scripts/validate-tessellation.mjs
npm run build
```

### Why not hard-code?

- **Single source**: Changing one file (JSON) replaces the value everywhere
  (methodology links, corrections page, about, mailto subject/body).
- **Script-friendly**: `add-correction.mjs` can read the same file to generate
  the email body.
- **Clear placeholder**: The README explicitly calls out the placeholder; when
  no operator is known, the placeholder is obvious.

### Why not just hard-code the placeholder?

- **No single source**: Hard-coded values must be manually updated across many
  files; risk of divergence.
- **No script utility**: Correcting scripts would need to duplicate the
  placeholder value; harder to maintain.

## Alternatives considered

1. **Hard-code in every component**:
   - Pro: Simplest to start.
   - Con: violates the "exactly one shared source" constraint; copy errors inevitable.

2. **React context provider**:
   - Pro: Could decouple at build time.
   - Con: Overkill for a single constant/config object; adds React boilerplate.

3. **Single source (chosen)**:
   - Pro: Exactly one source; easy swap; consistent across UI and scripts.

## Consequences

### Positive

- **One shared source, easy to swap**: the human identifies the operator,
  updates the JSON, rebuilds once, and the entire site uses the new value.

### Negative (accepted)

- **Extra file**: Adds 2 files (`siteConfig.ts`, `site-config.json`) — but
  clearly documented as the "single source".
