import { useMemo } from 'react';
import type { Hospice, Practice, Catchment, Shop } from '../lib/types';

interface Props {
  hospices: Hospice[] | null;
  practices: Practice[] | null;
  catchments: Catchment[] | null;
  shops: Shop[] | null;
}

export default function Methodology({ hospices, practices, catchments, shops }: Props) {
  const stats = useMemo(() => {
    if (!hospices || !practices || !catchments) return null;
    const published = hospices.filter((h) => h.kind === 'published').length;
    const approx = hospices.filter((h) => h.kind === 'approx').length;
    const unassigned = practices.filter((p) => p.hospiceId === null).length;
    const shopsTotal = shops?.length ?? 0;
    const shopsOutside = shops?.filter((s) => s.outsideCatchment).length ?? 0;
    return { published, approx, unassigned, total: practices.length, shopsTotal, shopsOutside };
  }, [hospices, practices, catchments, shops]);

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
                {stats.approx} approximated), <strong>{stats.total} GP practices</strong>
                {stats.unassigned ? `, of which ${stats.unassigned} fall outside every catchment` : ''}
                {stats.shopsTotal > 0 ? (
                  <>
                    , and <strong>{stats.shopsTotal} charity shops</strong>
                    {stats.shopsOutside > 0 ? `, ${stats.shopsOutside} of them outside their own catchment` : ''}
                  </>
                ) : null}
                .
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
                Each practice’s postcode area (outcode) is assigned to the hospice whose catchment includes it.
                Outcodes claimed by more than one catchment — and any outcode claimed by none — are given to the
                <em> nearest</em> hospice. The result is a complete partition: every practice belongs to exactly
                one catchment.
              </li>
              <li>
                Each practice is geocoded to its <strong>postcode unit</strong> (OpenStreetMap Nominatim). Boundaries
                between catchments are then computed as a <strong>Voronoi tessellation</strong> of the practice
                and hospice-site points: adjacent catchments share a continuous edge, so the areas tile the map
                with no overlap and no gaps.
              </li>
              <li>
                <strong>Charity shops</strong> are listed by each hospice on its own website (18 of the 20
                hospices publish a shop list; the others’ sites are unreachable or state no shops). Shop
                addresses are geocoded with Nominatim. A shop is flagged <em>outside its own catchment</em>
                when its point falls outside its hospice’s catchment polygon — i.e. it fundraises beyond the
                area that hospice serves.
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
              <li>
                The crisp, shared boundaries are a geometry derived from practice locations (Voronoi); the real
                switch between two hospices in service terms would be fuzzier than this.
              </li>
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
