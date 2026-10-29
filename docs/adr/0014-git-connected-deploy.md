# ADR 0014 — Git-connected Cloudflare Pages deploy (build step + `dist` output)

**Status:** accepted (2026-10-27)

## Context

The Pages project `hospiceinfo` is git-connected to `main`. On each push,
Pages clones the repository, looks for a Wrangler configuration file (BETA),
runs the configured build command, and deploys the configured output
directory. No build command was configured, so Pages logged "No build
command specified. Skipping build step." and deployed the **repository root**
(default output directory) as site assets. That failed validation: Cloudflare
Pages limits deployed files to 25 MiB each, and
`data-raw/uk-land.json` — a *build input*, 54.6 MiB, 22,999 polygons (ADR-0006)
— sits at the repository root. The previous convention was a manual publish
(`npx wrangler pages deploy dist`) from the operator's machine, run only after
the human gates (G5/W8/G7) closed. The failure exposed that the git remote was
already connected and would auto-publish the un-built tree.

Note for the record: the "manual publish after the gates close" convention was
never ADR-0009 — ADR-0009 on disk is *site-config single source*. The
convention lived in `docs/MAINTENANCE.md`, `README.md`, and the ops gate
tables; no on-disk ADR recorded it. This ADR supersedes it.

## Decision

- **Keep the git-connected deploy**: every push to `main` builds and publishes
  the site automatically (James, 2026-10-27).
- **Build settings**: build command `npm ci && npm run build`, set once in the
  project's build settings (dashboard *Settings → Build & deploy*, or
  `npx wrangler pages project update hospiceinfo --build-command "npm ci && npm run build"`);
  output directory `dist`, declared in the repository's `wrangler.jsonc`
  (`pages_build_output_dir`) so the output dir is version-controlled; if the
  dashboard treats its own field as authoritative, set `dist` there too.
- **`data-raw/` stays committed** (rebuildability and provenance; ADR-0006,
  ADR-0008) — it is excluded from the deployment by the output directory,
  because only `dist/` is ever deployed, never the repository root.
- The pre-commit verification chain (`ops.md` §4: `build-data` ×2
  byte-identity, `validate-tessellation`, `npm run build`, `check:layout`)
  remains the obligation before any push; the gates G5/W8/G7 remain open
  verification gates but no longer block publication.

## Alternatives considered

- **Revert to a manual directory deploy** (disconnect git, keep hand-operated
  publishes): rejected — James chose to keep the git-connected project; the
  manual path reintroduces an operator step, `wrangler login`, and a hand on
  every publish, and the 25 MiB failure is fully resolved by build config.
- **Keep deploying the repository root and exclude `data-raw/`**: no
  per-file exclusion mechanism exists for Pages output directories, and moving
  `data-raw/` out of the repository breaks the committed-rebuild contract
  (ADR-0006/0008, `data/README.md` provenance rows).
- **Compress `uk-land.json` under 25 MiB**: not needed — it is a build input
  that should never be a deployed asset; the contract is that only `dist/`
  deploys (largest `dist/` asset 3.14 MiB at the 2026-10-27 build).

## Consequences

**Positive (accepted):** publishes are automatic on push — no operator step,
no `wrangler login` session needed for deploys (wrangler now only for
project-level operations); the output directory lives in version control;
`data-raw/` remains committed and reproducible; the 25 MiB limit is no longer
in play given the 3.14 MiB max asset.
**Negative (accepted):** every push to `main` — including unverified ones —
publishes the site; the §4 chain is therefore a hard pre-commit obligation,
and G5/W8/G7 no longer gate publication (they remain open verification gates;
the site's pre-launch state is documented in `README.md` and
`docs/MAINTENANCE.md`). Rollback is twofold: restore the previous deployment
from the Pages dashboard, or `git revert` + push (the push rebuilds and
re-publishes). `npm ci` inside the build requires the committed
`package-lock.json` (present) and `package.json` devDependencies to remain
declared.
