import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SITE_FOOTER_TEXT } from '../lib/siteConfig';
import {
  attachAutoListener,
  detachAutoListener,
  effectiveTheme,
  getStoredMode,
  setBsTheme,
  setStoredMode,
} from '../lib/theme';

const NAV_LINKS = [
  { href: '#feedback', label: 'Feedback' },
  { href: '#corrections', label: 'Corrections' },
  { href: '#about', label: 'About' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#licences', label: 'Licences' },
  { href: '#accessibility', label: 'Accessibility' },
];

// W5/ADR-0024: three-state theme control. The mode lives in this component's
// state only (never in App.tsx — arch R1); the boot snippet is the sole
// writer of data-bs-theme at load, and pickMode re-applies it on click.
const THEME_MODES = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

type ThemeMode = (typeof THEME_MODES)[number]['value'];

interface AppShellProps {
  /** Map-page-only header controls (shop toggle, Source & Method button). */
  headerExtras?: ReactNode;
  /** Mobile menu panel content — map-route layer toggles; undefined on content routes. */
  mobilePanel?: ReactNode;
  /** Mobile CTA row content — the Start-here button; empty on content routes. */
  headerCta?: ReactNode;
  children: ReactNode;
}

export default function AppShell({ headerExtras, mobilePanel, headerCta, children }: AppShellProps) {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredMode());
  const pickMode = (m: ThemeMode) => {
    setStoredMode(m);
    detachAutoListener();
    if (m === 'auto') attachAutoListener();
    setBsTheme(effectiveTheme(m));
    setMode(m);
  };
  // C9/ADR-0043: Bootstrap owns the offcanvas open state (data-bs-toggle);
  // React only mirrors it onto the burger's aria-expanded. Initial DOM value
  // `false` matches the initial static (closed) markup.
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const panel = menuPanelRef.current;
    const burger = burgerRef.current;
    if (!panel || !burger) return;
    const onShown = () => burger.setAttribute('aria-expanded', 'true');
    const onHidden = () => burger.setAttribute('aria-expanded', 'false');
    panel.addEventListener('shown.bs.offcanvas', onShown);
    panel.addEventListener('hidden.bs.offcanvas', onHidden);
    return () => {
      panel.removeEventListener('shown.bs.offcanvas', onShown);
      panel.removeEventListener('hidden.bs.offcanvas', onHidden);
    };
  }, []);
  return (
    <div className="app">
      <a className="skip-link" href="#mainContent">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="container-fluid px-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2 app-title-row">
              <img src="/logo.svg" width="28" height="28" alt="" aria-hidden="true" className="d-block" />
              <div>
                <h1 className="h4 mb-0">
                  <a href="#map" className="text-decoration-none">
                    Hospice Finder UK
                  </a>
                </h1>
              <div className="text-muted small app-title-sub">UK — catchments approximated from GP practice locations</div>
              </div>
            </div>
            <nav aria-label="Site pages" className="d-flex flex-wrap align-items-center gap-2">
              <div className="btn-group theme-group" role="group" aria-label="Colour theme">
                {THEME_MODES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={
                      'btn btn-outline-secondary btn-sm' + (mode === t.value ? ' active' : '')
                    }
                    aria-pressed={mode === t.value}
                    onClick={() => pickMode(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {headerExtras}
              {NAV_LINKS.map((l) => (
                <a key={l.href} className="site-nav-link" href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
            <button
              ref={burgerRef}
              type="button"
              className="hf-burger btn"
              aria-label="Open menu"
              aria-expanded={false}
              aria-controls="mobileMenu"
              data-bs-toggle="offcanvas"
              data-bs-target="#mobileMenu"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div className="hf-cta-row">{headerCta}</div>
      <div
        ref={menuPanelRef}
        className="offcanvas offcanvas-end hf-menu-panel"
        tabIndex={-1}
        id="mobileMenu"
        aria-labelledby="mobileMenuLabel"
      >
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h5" id="mobileMenuLabel">Menu</h2>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close menu"
          />
        </div>
        <div className="offcanvas-body">
          <div className="btn-group theme-group menu-theme" role="group" aria-label="Colour theme">
            {THEME_MODES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={'btn btn-outline-secondary btn-sm' + (mode === t.value ? ' active' : '')}
                aria-pressed={mode === t.value}
                onClick={() => pickMode(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {mobilePanel}
          <button
            type="button"
            className="btn btn-outline-secondary hf-panel-source"
            data-bs-toggle="modal"
            data-bs-target="#methodologyModal"
          >
            Source &amp; Method
          </button>
        </div>
      </div>
      <main id="mainContent" className="app-body">
        {children}
      </main>
      <footer className="app-footer d-flex flex-wrap align-items-center justify-content-between gap-2 container-fluid px-3">
        <small className="text-muted">{SITE_FOOTER_TEXT}</small>
        <nav aria-label="Site pages (footer)" className="d-flex flex-wrap gap-2">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="small text-decoration-none">
              {l.label}
            </a>
          ))}
          {/* C7/W1 (ADR-0039): “Source & Method” moves here from the map header
              on mobile (CSS: mobile-visible, desktop-hidden — 1280 px unchanged).
              Opens the same #methodologyModal the header button does. */}
          <a
            href="#map"
            className="small text-decoration-none hf-footer-source"
            data-bs-toggle="modal"
            data-bs-target="#methodologyModal"
          >
            Source &amp; Method
          </a>
        </nav>
      </footer>
    </div>
  );
}
