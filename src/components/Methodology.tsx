import { useMemo } from 'react';
import type { Hospice, Practice, Catchment, Shop } from '../lib/types';
import Legend from './Legend';

interface Props {
  hospices: Hospice[] | null;
  practices: Practice[] | null;
  catchments: Catchment[] | null;
  shops: Shop[] | null;
}

const NATIONS: { key: string; label: string }[] = [
  { key: 'en', label: 'England' },
  { key: 'sc', label: 'Scotland' },
  { key: 'wales', label: 'Wales' },
  { key: 'ni', label: 'Northern Ireland' },
];

function nationLine(items: { nation: string }[]) {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.nation, (m.get(i.nation) ?? 0) + 1);
  return NATIONS.map((n) => `${n.label} ${m.get(n.key) ?? 0}`).join(' · ');
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
              Source &amp; Methodology
            </h2>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          </div>
          <div className="modal-body">
            {stats && hospices && practices && (
              <p className="mb-3">
                <strong>{hospices.length} hospices</strong> ({stats.published} with a published service area,{' '}
                {stats.approx} approximated) — {nationLine(hospices)} — and{' '}
                <strong>{stats.total} GP practices</strong> ({nationLine(practices)})
                {stats.unassigned ? `, of which ${stats.unassigned} are not geocoded yet` : ''}
                {stats.shopsTotal > 0 ? (
                  <>
                    , plus <strong>{stats.shopsTotal} charity shops</strong>
                    {stats.shopsOutside > 0 ? `, ${stats.shopsOutside} of them outside their own catchment` : ''}
                  </>
                ) : null}
                .
              </p>
            )}
            <h3 className="h6">How this map is built</h3>
            <ol className="mb-3 small">
              <li>
                <strong>Hospices</strong> come from the four UK registers: the CQC register (England, October 2026
                extract), the Care Inspectorate data store (Scotland, 31 August 2026), RQIA (Northern Ireland —
                register export pending, so 0 shown for now) and Care Inspectorate Wales (no bulk export; a data
                request is pending, so 0 shown for now). The 20 hospices of the original Lancashire &amp; South
                Cumbria map are <strong>curated</strong>: their names, towns and postcodes were hand-verified and
                pinned before any register work.
              </li>
              <li>
                <strong>GP practices</strong> come from the same CQC directory (England), the NI GP practice
                reference file, and the Welsh/Glasgow layers where available — Scotland's GIS layer and the Welsh
                DataMap layers are being fetched separately, so their practice counts may be 0 until the extracts
                land.
              </li>
              <li>
                Every geocoded practice is assigned to the <strong>nearest hospice site</strong> (straight-line
                distance) — a single rule, with no postcode-outcode matching and no hand-pinned areas.
              </li>
              <li>
                Each practice is geocoded to its <strong>postcode unit</strong> (OpenStreetMap Nominatim).
                Boundaries between catchments are then computed as a <strong>Voronoi tessellation</strong> of the
                practice and hospice-site points over the whole UK: adjacent catchments share a continuous edge, so
                the areas tile the map with no overlap and no gaps.
              </li>
              <li>
                <strong>Charity shops</strong> are the 138 listed on the websites of the 20 curated hospices;
                addresses are geocoded with Nominatim. A shop is flagged <em>outside its own catchment</em> when
                its point falls outside its hospice's catchment polygon — i.e. it fundraises beyond the area that
                hospice serves.
              </li>
            </ol>
            <h3 className="h6">Catchment colour key (20 curated)</h3>
            <div className="mb-3">
              {hospices && <Legend hospices={hospices} />}
            </div>
            <h3 className="h6">Important caveats — this is an approximation</h3>
            <ul className="small">
              <li>
                Catchments shown are <strong>not official boundaries</strong>. They are derived purely from
                practice and hospice locations.
              </li>
              <li>
                In practice, referral depends on the <strong>patient's</strong> location and the GP, not the
                practice site mapped here. The dots show <em>where practices are</em>, not who is served.
              </li>
              <li>
                Wales and Northern Ireland currently show <strong>0 hospices</strong>: the CIW list and the RQIA
                register export are pending (see <code>data/README.md</code> for the exact fetch steps).
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
              re-run the nation extract scripts, <code>scripts/geocode-postcodes.mjs</code> (Nominatim batch),{' '}
              <code>scripts/merge-hospices.mjs</code>, then <code>npm run build-data</code>.
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
