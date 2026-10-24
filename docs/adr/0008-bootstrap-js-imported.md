# ADR 0008 — Bootstrap JS imported (data-bs- attrs supported)

**Status:** accepted (2026-10-21)

## Context

The existing app imports Bootstrap CSS (`bootstrap/dist/css/bootstrap.min.css`)
but does NOT import Bootstrap JS. This means all `data-bs-*` attributes are
dead in the browser: modal, dropdown, tooltip, etc. The current Methodology
modal opens via a button at `App.tsx` and uses `data-bs-dismiss="modal"` in
`Methodology.tsx`, neither of which functions without the JS bundle.

Feature.md requires the Modal to work correctly. Only **5 runtime deps** are
current; adding BootstrapJS adds a documented runtime dep. It's the most
sustainable option.

However, the previous design specified importing the UMD bundle
`bootstrap.bundle.min.js` as a side-effect import in an ESM context. This is
incorrect for a Vite ESM bundle: UMD bundles include global variable
assignments and are not designed for ES module consumption. The correct ESM
entry point from Bootstrap 5.3 provided by Vite is `bootstrap.esm.js`.

## Decision

**Import the official Bootstrap 5.3 ESM bundle via Vite**: 
```ts
import "bootstrap/dist/js/bootstrap.esm.js";
```
This is the official ESM entry point from the dist/js folder (verified:
`node_modules/bootstrap/dist/js/bootstrap.esm.js` exists, along with the
minified `bootstrap.esm.min.js`). This enables `data-bs-*` attributes
(modal toggle/close) without custom React state code. The trade-off is a
documented 6th runtime dependency. (ADR-0008 decision).

### Import path rationale

The file chosen is `bootstrap.esm.js` (not the minified `bootstrap.esm.min.js`,
not `bootstrap.bundle.js`, and not the UMD version). This is the official ESM
build from the package's dist/js folder. It is designed for ES modules and
does not include the global `bootstrap` variable assignment found in UMD
builds.

### Trade-offs

- **Positive**: Minimize code surface; avoid bootstrap's internal HTML.
- **Negative**: Bootstrap JS is now a runtime dep (5 → 6 runtime deps).
- **Negative**: Bootstrap 5's `data-bs-*` attributes are used; we lose the
  current React-driven control for modals.
- **Positive**: ESM entry avoids UMD global pollution; works cleanly in
  Vite's ESM build.

## Alternatives considered

1. **Keep Bootstrap JS via React state (not what research says)**:
   - Pro: Zero new runtime dep.
   - Con: Manual modal logic; inconsistent with the app's current pattern.
   - Con: Bootstrap JS is a well-maintained library; reinventing its
     functionality is unnecessary.

2. **Import UMD bundle (bootstrap.bundle.min.js)**:
   - Pro: Works in global scope.
   - Con: Incorrect for ESM context; includes global variable assignment
     polluting the ESM namespace.
   - Con: Larger file size; unnecessary features for this use case.

3. **Import ESM bundle (bootstrap.esm.js) — chosen**:
   - Pro: Uses the official ESM build designed for this context.
   - Pro: Uses the official implementation; documented as a runtime dep.
   - Pro: Minimize code surface; no manual modal logic.

## Consequences

### Positive

- **Bootstrap modals work correctly** out of the box.
- **Consistent with the app's current pattern**: Bootstrap provides the
  component logic.

### Negative (accepted)

- **One additional runtime dependency** (Bootstrap JS bundle).
- **Increased bundle size** for the ESM import (small overhead, acceptable).
