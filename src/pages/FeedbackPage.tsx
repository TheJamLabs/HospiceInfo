// Item 5.5 (pm): Feedback page. mailto links only — no form, no endpoint,
// no tracking (ADR-0009). Contact details come from siteConfig.

import { siteConfig } from '../lib/siteConfig';

const GENERAL_MAILTO = `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(
  'Correction request: point not on the map',
)}`;

export default function FeedbackPage() {
  return (
    <div className="container my-3" style={{ maxWidth: 720 }}>
      <a className="back-to-map" href="#map">← Back to map</a>
      <h1 className="h3">Feedback</h1>
      <p>
        Found something wrong with the map? The best route is to use the{' '}
        <a href="#map">map</a>: click a hospice, a GP practice, or a charity shop
        and choose <strong>“Disagree with this data?”</strong> in the popup. Your
        email client opens with the point&apos;s identifying details already in
        the body, so we can find the exact location without you hunting for
        wording.
      </p>
      <h2 className="h5 mt-4">From this page</h2>
      <ul>
        <li>
          <strong>A hospice, practice, or shop is missing from the map entirely</strong> —
          <a href={GENERAL_MAILTO}> send us an email</a> with the name and the
          postcode or area where you expected it.
        </li>
        <li>
          <strong>Something is wrong but you are not on the map</strong> — the same
          link above; describe the data issue and the location you saw it at.
        </li>
      </ul>
      <p className="text-muted small">
        Feedback reaches us directly in your own mail client — this site never
        collects, stores, or processes any of it. See the{' '}
        <a href="#privacy">privacy policy</a> for the full no-data story.
      </p>
    </div>
  );
}
