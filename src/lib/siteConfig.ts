// ADR-0009: the single source for operator identity (name + contact email).
//
// DO NOT EDIT THE VALUES HERE. They are a mirror of data-raw/site-config.json;
// change that JSON file first, then update this mirror and re-run the build
// chain. Every contact name, mailto link and the site footer read from this
// file — no page hardcodes contact details.

export interface SiteConfig {
  operatorName: string;
  contactEmail: string;
}

export const siteConfig: SiteConfig = {
  operatorName: 'Hospice Information Project',
  contactEmail: 'feedback@hospiceinfo.example',
};

// Footer legal-text constant (rendered by AppShell on every page).
export const SITE_FOOTER_TEXT =
  'Map tiles © OpenStreetMap contributors, © OpenStreetMap Foundation — ODbL v1.0. ' +
  'Full data attribution and licensing: see the Licences page.';
