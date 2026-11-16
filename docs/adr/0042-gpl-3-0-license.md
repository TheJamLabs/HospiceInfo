# ADR 0042 — GPL-3.0-only for the site's own code

**Status:** accepted (2026-11-16)

## Context

The repository carried no licence: no `LICENSE` file and no `license` field
in `package.json`. The site's `/licences` page listed third-party component
licences only, leaving copyright in the site's own code unrestricted. James
requested the project be GPL3-licensed (2026-11-16).

The project bundles no third-party code into `dist/`: every runtime
dependency (React, react-dom, react-leaflet, Leaflet, Bootstrap,
d3-delaunay, polygon-clipping) is MIT, BSD-2-Clause or ISC — all
GPLv3-compatible. `xlsx` (Apache-2.0, dev-only data-scripting) is likewise
GPLv3-compatible. No source file carries a conflicting licence header
(verified by search across `src/` and `scripts/`).

## Decision

The site's own code is released under **GPL-3.0** in its canonical
"only" form (`GPL-3.0-only`):

- `LICENSE` at the repository root carries the canonical GPLv3 full text
  (fetched from fsf.org/gnu.org, unmodified).
- `package.json` gains `"license": "GPL-3.0-only"` (SPDX), so published
  metadata — and the `/licences` page, which points at the package
  manifest — state it.
- The `/licences` page's Software section states GPL-3.0-only for the
  site's own code.

## Alternatives considered

1. **`GPL-3.0-or-later`**: would let future versions adopt GPLv4+ terms.
   Rejected: domestic single-maintainer project; "only" is the
   unambiguous reading of "GPL3". Easy to flip later if needed.
2. **No licence (status quo)**: implicit all-rights-reserved copyright
   with no granted permission. Rejected: blocks legitimate reuse and is
   the state James asked to change.
3. **A permissive licence (MIT/Apache-2.0)**: rejected on request —
   the owner wants copyleft protection for the code base.

## Consequences

### Positive

- The code base has an explicit, permissive-to-forks copyleft licence:
  reuse is defined, and derivative distributions stay GPLv3.
- The notice is machine-readable (SPDX field) and visible on the live
  site's `/licences` page, consistent with the About/legal pages.

### Negative / accepted notes

- **Copyleft**: anybody distributing modified versions of the code
  must do so under GPLv3 — accepted; this is the point of the choice.
- **Data files are not covered by this decision**: `public/data/*`,
  `data-raw/*` and the registers behind them retain their own licences
  (OGL, open registers, etc.) as documented in `data/README.md` and the
  `/licences` page. The GPL governs the site's code, not the data.
- **The `package.json` field is informational**: the package is
  `private: true` and never published to npm.
