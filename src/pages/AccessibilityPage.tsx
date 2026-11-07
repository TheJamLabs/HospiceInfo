// Item 5.8 (pm): Accessibility statement — WCAG 2.1 AA target, honest
// statement of what is in place and the known limitations of a map UI.

import { siteConfig } from '../lib/siteConfig';

export default function AccessibilityPage() {
  return (
    <div className="container my-3" style={{ maxWidth: 720 }}>
      <a className="back-to-map" href="#map">← Back to map</a>
      <h1 className="h3">Accessibility</h1>
      <p>
        We aim to meet <strong>WCAG 2.1 level AA</strong>. The site is plain
        HTML, CSS and JavaScript with no rich-media widgets, which keeps all of
        it reachable by keyboard and screen reader.
      </p>
      <h2 className="h5">What is in place</h2>
      <ul>
        <li>A <strong>“Skip to main content”</strong> link at the top of every page (it appears when you first press Tab).</li>
        <li>
          All interactive controls (buttons, toggles, search box, country filter)
          have visible text labels, respond to keyboard focus, and have
          focus indicators.
        </li>
        <li>
          Every map marker carries an <strong>accessible tooltip</strong> with the
          name and, where available, the postcode, read out by assistive
          technology on focus.
        </li>
        <li>
          The searchable list in the map sidebar is a full keyboard-accessible
          alternative to picking a location on the map itself.
        </li>
        <li>
          Touch targets on phones are at least <strong>44 pixels</strong>; below
          768&nbsp;px the sidebar becomes a bottom sheet you open and close with
          a Large button.
        </li>
        <li>
          Text keeps a contrast ratio of at least 4.5:1 against its background;
          colours are never the only carrier of meaning (shapes, labels and
          tooltips carry the same information).
        </li>
        <li>No animation that is not triggered by user interaction; no auto-playing content.</li>
      </ul>
      <h2 className="h5">Known limitations</h2>
      <ul>
        <li>
          The map is inherently visual. Its non-visual equivalent is the
          searchable list in the sidebar (or the list on each hospice&apos;s
          detail card), which covers the same data.
        </li>
        <li>
          Browser zoom and screen magnifier handle text fine; at high zoom levels
          map tiles may appear pixelated — that is a rendering detail, not a
          loss of information.
        </li>
      </ul>
      <p className="mb-0">
        If you hit a barrier on this site, tell us: write to{' '}
        {siteConfig.contactEmail} (see <a href="#feedback">Feedback</a>).
      </p>
    </div>
  );
}
