import type { ReactNode } from 'react';
import { SITE_FOOTER_TEXT } from '../lib/siteConfig';

const NAV_LINKS = [
  { href: '#feedback', label: 'Feedback' },
  { href: '#corrections', label: 'Corrections' },
  { href: '#about', label: 'About' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#licences', label: 'Licences' },
  { href: '#accessibility', label: 'Accessibility' },
];

interface AppShellProps {
  /** Map-page-only header controls (shop toggle, Source & Method button). */
  headerExtras?: ReactNode;
  children: ReactNode;
}

export default function AppShell({ headerExtras, children }: AppShellProps) {
  return (
    <div className="app">
      <a className="skip-link" href="#mainContent">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="container-fluid px-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h1 className="h4 mb-0">
                <a href="#map" className="text-decoration-none">
                  Hospice Catchment Map
                </a>
              </h1>
              <div className="text-muted small">UK — catchments approximated from GP practice locations</div>
            </div>
            <nav aria-label="Site pages" className="d-flex flex-wrap align-items-center gap-2">
              {headerExtras}
              {NAV_LINKS.map((l) => (
                <a key={l.href} className="site-nav-link" href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>
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
        </nav>
      </footer>
    </div>
  );
}
