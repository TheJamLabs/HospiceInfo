// Item 5.6 (pm): static About/Methodology page. The methodology text is
// shared with the map-page modal via <MethodologyText/>, so it exists in
// exactly one place.

import { MethodologyText } from '../components/Methodology';
import { siteConfig } from '../lib/siteConfig';

export default function AboutPage() {
  return (
    <div className="container my-3" style={{ maxWidth: 820 }}>
      <a className="back-to-map" href="#map">← Back to map</a>
      <h1 className="h3">About this map</h1>
      <p>
        This is a fully static, client-side map of UK hospices and their catchment
        areas. Where a hospice has published an official service area we draw that;
        everywhere else each GP practice location is assigned to its nearest
        hospice, and the resulting regions approximate the catchments.
      </p>
      <ul className="mb-4">
        <li>
          <strong>Catchments</strong> — polygons on the map, coloured per hospice.
        </li>
        <li>
          <strong>GP practice locations</strong> — small markers showing the input
          points used for the approximation; hovering one shows which hospice it
          is assigned to.
        </li>
        <li>
          <strong>Charity shops</strong> — markers supplied by the hospices
          themselves; toggle them on and off from the map header.
        </li>
      </ul>
      <MethodologyText />
      <h2 className="h5">Data freshness</h2>
      <p className="mb-0">
        The underlying data changes occasionally; every data fix is recorded in the{' '}
        <a href="#corrections">corrections log</a>. Treat approximated catchments
        as a planning aid, not a statement of official service areas — for a
        definitive answer, contact the hospice directly (each map marker&apos;s
        "Disagree with this data?" link reaches the operators with the point
        pre-identified, or write to {siteConfig.contactEmail}).
      </p>
    </div>
  );
}
