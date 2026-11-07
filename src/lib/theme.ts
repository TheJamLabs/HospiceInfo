// ADR-0024 (Cycle 4): three-state Auto/Light/Dark theme.
//
// This module is the ONLY place in JS that names `hfuk-theme` and
// `data-bs-theme`. The theme-boot snippet in `index.html` and
// `scripts/prerender.mjs` is a static inline twin of this logic — it runs
// during <head> parsing before any module can load, so it cannot import
// this file. The two copies are frozen static text (see arch §4.3).
//
// No React state in App.tsx, no theme useEffect anywhere (arch R1): the
// boot snippet is the sole writer of `data-bs-theme` at load. The AppShell
// control re-applies on an explicit click, and the auto matchMedia listener
// below tracks OS flips only while the mode is `auto`.

export type ThemeMode = 'auto' | 'light' | 'dark';
export type BsTheme = 'light' | 'dark';

const KEY = 'hfuk-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredValue(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null; // R1: storage disabled (private mode / quota) → treat as auto.
  }
}

/** The explicit user choice; absent key (or any other stored value) → 'auto'. */
export function getStoredMode(): ThemeMode {
  const v = readStoredValue();
  return v === 'light' || v === 'dark' ? v : 'auto';
}

/** Persist the explicit choice; 'auto' clears the key (absent = auto). */
export function setStoredMode(mode: ThemeMode): void {
  try {
    if (mode === 'auto') {
      window.localStorage.removeItem(KEY);
    } else {
      window.localStorage.setItem(KEY, mode);
    }
  } catch {
    // R1: storage disabled → the choice simply does not persist.
  }
}

/** Resolve the concrete Bootstrap theme for a mode (auto follows the OS). */
export function effectiveTheme(mode: ThemeMode): BsTheme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Apply the concrete theme to <html> (Bootstrap 5.3 native theming). */
export function setBsTheme(theme: BsTheme): void {
  document.documentElement.dataset.bsTheme = theme;
}

// One auto-mode subscription at most; removed the moment the user leaves
// auto, so OS-level flips are live in auto and inert in light/dark.
let media: MediaQueryList | null = null;
let onChange: ((e: MediaQueryListEvent) => void) | null = null;

export function attachAutoListener(): void {
  if (media) return;
  media = window.matchMedia(DARK_QUERY);
  onChange = (e: MediaQueryListEvent) => {
    // Re-read on every event so a choice made mid-session wins.
    if (getStoredMode() === 'auto') setBsTheme(e.matches ? 'dark' : 'light');
  };
  media.addEventListener('change', onChange);
}

export function detachAutoListener(): void {
  if (media && onChange) media.removeEventListener('change', onChange);
  media = null;
  onChange = null;
}
