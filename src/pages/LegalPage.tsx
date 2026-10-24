// Item 5.8 (pm): legal pages — Privacy policy and Licences/data-sources.
// Both carry a last-updated date (pm 6.2). Contact details via siteConfig.

import { siteConfig } from '../lib/siteConfig';

const LAST_UPDATED = '22 October 2026';

export function PrivacyPage() {
  return (
    <div className="container my-3" style={{ maxWidth: 720 }}>
      <h1 className="h3">Privacy policy</h1>
      <p className="text-muted small">Last updated: {LAST_UPDATED}</p>
      <p>
        This is a fully static website: pages and map data are plain files served
        from a web server, and the map renders entirely in your browser.
      </p>
      <h2 className="h5">What we do not do</h2>
      <ul>
        <li>
          <strong>No cookies.</strong> The site sets no cookies, runs no
          tracker or analytics, and loads no third-party scripts.
        </li>
        <li>
          <strong>No data collection.</strong> There are no forms on this site.
          Feedback is sent from your own mail client to {siteConfig.contactEmail}
          — nothing is transmitted to, stored by, or processed on this website.
        </li>
        <li>
          <strong>No personal data.</strong> No user accounts, no location
          tracking, no device fingerprinting.
        </li>
      </ul>
      <h2 className="h5">Out of our control</h2>
      <p className="mb-0">
        Map tiles are served by OpenStreetMap tile servers. Using that service
        means their servers may see your IP address; their handling of it
        follows their own policy, not this site&apos;s.
      </p>
    </div>
  );
}

export function LicencesPage() {
  return (
    <div className="container my-3" style={{ maxWidth: 760 }}>
      <h1 className="h3">Licences and data sources</h1>
      <p className="text-muted small">Last updated: {LAST_UPDATED}</p>
      <h2 className="h5">OpenStreetMap</h2>
      <p>
        The map tiles, the UK land boundary (coastline) geometry used to clip
        the catchment polygons, the coordinates of the practices, hospices and
        shops (geocoded via OSM Nominatim), and shop names where present, come
        from <strong> OpenStreetMap contributors</strong> under the
        <strong> ODbL v1.0</strong>, hosted by the OpenStreetMap Foundation.
        Attribution: © OpenStreetMap contributors; tile use follows the OSM
        Foundation tile usage policy (tile.openstreetmap.org).
      </p>
      <h2 className="h5">Public registers</h2>
      <p>
        Hospice and practice names, addresses and postcodes are bulk extracts
        of register data published by UK public bodies: the Care Quality
        Commission register (England), Care Inspectorate Scotland (Scotland),
        the NHS GP practice reference file (including Northern Ireland) and
        data.wales (Wales — fetch pending). Register extracts of this kind are
        made available under the Open Government Licence (with database
        right), as published by each body.
      </p>
      <h2 className="h5">Hospice and charity shop data</h2>
      <p>
        Published service areas come from the hospices&apos; own websites;
        approximated catchments are computed from the GP practice locations
        above (method on the <a href="#about">About</a> page). Charity shop
        details are maintained by the hospices themselves. Listing a hospice or
        shop on this map does not imply any endorsement.
      </p>
      <h2 className="h5">Software</h2>
      <p className="mb-0">
        The site itself is built with open-source components — React (MIT),
        Leaflet (BSD-2-Clause), Bootstrap (MIT), plus the Voronoi and
        polygon-clipping libraries described on the About page — each under its
        own licence as stated in the project&apos;s package manifest.
      </p>
    </div>
  );
}
