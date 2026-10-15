import { useMemo } from 'react';
import type { Hospice, Practice, Catchment } from '../lib/types';

interface Props {
  hospices: Hospice[] | null;
  practices: Practice[] | null;
  catchments: Catchment[] | null;
}

export default function Methodology({ hospices, practices, catchments }: Props) {
  const stats = useMemo(() => {
    if (!hospices || !practices || !catchments) return null;
    const published = hospices.filter((h) => h.kind === 'published').length;
    const approx = hospices.filter((h) => h.kind === 'approx').length;
    const unassigned = practices.filter((p) => p.hospiceId === null).length;
    return { published, approx, unassigned, total: practices.length };
  }, [hospices, practices, catchments]);

  return (
    <div
      className="modal fade"
      id="methodologyModal"
      tabIndex={-1}
      aria-labelledby="methodologyLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5" id="methodologyLabel">
              Source &amp; Method
            </h2>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          </div>
          <div className="modal-body">
            {stats && (
              <p className="mb-3">
                <strong>{hospices!.length} hospices</strong> ({stats.published} with a published service area,{' '}
                {stats.approx} approximated) and <strong>{stats.total} GP practices</strong>
                {stats.unassigned ? `, of which ${stats.unassigned} fall outside every catchment` : ''}.
              </p>
            )}
            <h3 className="h6">How this map is built</h3>
            <ol className="mb-3 small">
              <li>
                <strong>Hospices</strong> are taken from the CQC register (October&nbsp;2026 extract) filtered to
                Lancashire and South&nbsp;Cumbria postcodes (PR, BB, FY, WN, BL, LA, CA, WA, OL).
              </li>
              <li>
                <strong>GP practices</strong> are locations in the same CQC directory with the
                “Doctors/GPs” service type, filtered to the same postcodes.
              </li>
              <li>
                <strong>Catchment areas</strong> for each hospice come from the service area it publishes on its
                own website where available; where a site is unreachable or states no area, the catchment is
                approximated around the hospice’s location (flagged
                <span className="badge bg-warning-subtle text-warning-emphasis ms-1">approx.</span>).
              </li>
              <li>
                Each postcode area (outcode) is assigned to the hospice whose catchment includes it. Postcodes
                claimed by more than one catchment are given to the <em>nearest</em> hospice. Postcodes outside
                every catchment fall to the nearest hospice within ~50&nbsp;km, and any leftovers are left
                unassigned.
              </li>
              <li>
                Each practice is geocoded to its <strong>postcode unit</strong> (OpenStreetMap Nominatim), and the
                catchment envelope is the <strong>convex hull</strong> of the practices assigned to that hospice.
              </li>
            </ol>
            <h3 className="h6">Important caveats — this is an approximation</h3>
            <ul className="small">
              <li>
                Catchments shown are <strong>not official boundaries</strong>. They are approximations inferred
                from each hospice’s published service-area wording and practice postcode locations.
              </li>
              <li>
                In practice, referral depends on the <strong>patient’s</strong> location and the GP, not the
                practice site mapped here. The dots show <em>where practices are</em>, not who is served.
              </li>
              <li>
                No single authoritative published “hospice catchment” dataset exists, and several sites did not
                publish one — so several envelopes are estimates.
              </li>
              <li>Geocoding is by postcode unit centroid; a practice may sit a short distance from its unit centre.</li>
            </ul>
            <h3 className="h6">Data &amp; updates</h3>
            <p className="small">
              Raw extracts and their sources/dates are documented in <code>data/README.md</code>. To refresh:
              re-download the CQC directory, re-run <code>scripts/extract-gp-practices.mjs</code>,{' '}
              <code>scripts/geocode-postcodes.mjs</code>, then <code>npm run build-data</code>.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" data-bs-dismiss="modal">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
