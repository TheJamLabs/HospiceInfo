import { Fragment, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Tooltip,
  useMap,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import type { Hospice, Practice, Catchment, Shop } from '../lib/types';
import type { NationFilter } from './HospicePanel';
import { feedbackMailto, type FeedbackPoint } from '../lib/feedback';

interface Props {
  hospices: Hospice[];
  practices: Practice[];
  catchments: Catchment[];
  shops: Shop[];
  showShops: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  nation: NationFilter;
}

// Per-nation viewports (ADR-0001 UK default; Wales corrected to its actual extent).
const NATION_BOUNDS: Record<NationFilter, [[number, number], [number, number]]> = {
  all: [[49.5, -9.5], [61.5, 2.0]],
  en: [[49.9, -4.6], [55.9, 1.8]],
  sc: [[54.6, -8.0], [59.0, -1.0]],
  ni: [[54.0, -8.2], [55.7, -5.3]],
  wales: [[51.4, -5.3], [53.4, -2.7]],
};

// The "Disagree with this data?" link on map points (pm 4.3: mailto only,
// prefilled with the point's identifying details).
function DisagreeLink({ point }: { point: FeedbackPoint }) {
  return (
    <a href={feedbackMailto(point)} className="small text-decoration-none d-block mt-1">
      Disagree with this data?
    </a>
  );
}

// Refits the viewport when the nation filter changes (and on mount).
function FitToNation({ nation }: { nation: NationFilter }) {
  const map = useMap();
  useEffect(() => {
    const [sw, ne] = NATION_BOUNDS[nation];
    map.fitBounds(L.latLngBounds(sw, ne), { padding: [10, 10] });
  }, [nation, map]);
  return null;
}

// Fits the map to the selected catchment/hospice when it changes.
function FitToSelection({ selectedId, catchments, hospices }: {
  selectedId: string | null;
  catchments: Catchment[];
  hospices: Hospice[];
}) {
  const map = useMap();
  const target = useMemo(() => {
    if (!selectedId) return null;
    const c = catchments.find((x) => x.hospiceId === selectedId);
    if (c?.polygons?.length) {
      const pts = c.polygons.flat();
      if (pts.length) return L.latLngBounds(pts.map((p) => [p.lat, p.lon] as [number, number]));
    }
    const h = hospices.find((x) => x.id === selectedId);
    if (h && h.lat != null && h.lon != null)
      return L.latLngBounds([[h.lat, h.lon] as [number, number], [h.lat, h.lon] as [number, number]]).pad(0.3);
    return null;
  }, [selectedId, catchments, hospices]);

  useEffect(() => {
    if (target) map.fitBounds(target, { padding: [40, 40] });
  }, [target, map]);

  return null;
}

function HospiceMarker({ hospice, opacity, onSelect }: {
  hospice: Hospice;
  opacity: number;
  onSelect: (id: string | null) => void;
}) {
  if (hospice.lat == null || hospice.lon == null) return null;
  const icon = L.divIcon({
    className: 'hospice-marker-wrap',
    html: `<span class="hospice-marker" style="background:${hospice.color};opacity:${opacity}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  return (
    <Marker position={[hospice.lat, hospice.lon]} icon={icon} eventHandlers={{ click: () => onSelect(hospice.id) }}>
      <Popup>
        <div style={{ minWidth: 180 }}>
          <strong>{hospice.name}</strong>
          <br />
          {hospice.town} · {hospice.postcode}
          <br />
          <span className="text-muted small">
            {hospice.kind === 'published' ? 'Published service area' : 'Approximated catchment'}
            {hospice.curated ? ' · curated' : ''}
          </span>
          <DisagreeLink point={{ id: hospice.id, name: hospice.name, postcode: hospice.postcode, hospiceName: null }} />
        </div>
      </Popup>
    </Marker>
  );
}

function ShopMarker({ shop, hospiceColor, hospiceName, opacity, onSelect }: {
  shop: Shop;
  hospiceColor: string;
  hospiceName: string | null;
  opacity: number;
  onSelect: (id: string | null) => void;
}) {
  const icon = L.divIcon({
    className: 'shop-marker-wrap',
    html: `<span class="shop-marker" style="background:${hospiceColor};opacity:${opacity}"></span>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
  return (
    <Marker position={[shop.lat, shop.lon]} icon={icon} eventHandlers={{ click: () => onSelect(shop.hospiceId) }}>
      <Tooltip>
        <strong>{shop.name}</strong>
        <br />
        {shop.address}{shop.postcode ? ` · ${shop.postcode}` : ''}
        {hospiceName ? (
          <>
            <br />
            <span className="text-muted">→ {hospiceName}</span>
          </>
        ) : null}
        <DisagreeLink
          point={{ id: shop.id, name: shop.name, postcode: shop.postcode, hospiceName }}
        />
      </Tooltip>
    </Marker>
  );
}

export default function MapView({ hospices, practices, catchments, shops, showShops, selectedId, onSelect, nation }: Props) {
  const visiblePractices = useMemo(
    () => practices.filter((p) => p.lat != null && p.lon != null),
    [practices]
  );
  const visibleHospices = useMemo(
    () => hospices.filter((h) => h.lat != null && h.lon != null),
    [hospices]
  );
  const visibleShops = useMemo(() => (showShops ? shops : []), [shops, showShops]);
  const nationDim = (n: string) => nation !== 'all' && n !== nation;

  return (
    <MapContainer
      // pm 2.1: canvas renderer — the ~9.5k practice markers would make the SVG
      // renderer unusable (it draws every CircleMarker as a DOM node).
      preferCanvas={true}
      // pm 2.2: start from a sensible centre; FitToNation immediately
      // fitBounds() to the nation extent on mount, so the map is never seen
      // panning from a data-derived corner.
      center={[55.0, -3.5]}
      zoom={6}
      className="app-map-canvas"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToNation nation={nation} />
      <FitToSelection selectedId={selectedId} catchments={catchments} hospices={hospices} />

      {/* catchment areas (Voronoi-derived; adjacent areas share an edge) */}
      {catchments.map((c) => {
        const rings = c.polygons ?? [];
        if (!rings.length) return null;
        const hospColor = hospices.find((h) => h.id === c.hospiceId)?.color ?? '#666';
        const dim = selectedId !== null && selectedId !== c.hospiceId;
        const dimmedNation = nationDim(c.nation);
        return (
          <Fragment key={c.hospiceId}>
            {rings.map((ring, i) => (
              <Polygon
                key={`${c.hospiceId}-r${i}`}
                positions={ring.map((p) => [p.lat, p.lon] as [number, number])}
                pathOptions={{
                  color: hospColor,
                  weight: selectedId === c.hospiceId ? 3 : 1.5,
                  opacity: dimmedNation ? 0.15 : dim ? 0.15 : 0.7,
                  fillColor: hospColor,
                  fillOpacity: dimmedNation ? 0.02 : dim ? 0.02 : selectedId === c.hospiceId ? 0.16 : 0.07,
                }}
                eventHandlers={{ click: () => onSelect(c.hospiceId) }}
              >
                {i === 0 && (
                  <Tooltip sticky>
                    {c.name} — {c.practiceCount} GP practice{c.practiceCount === 1 ? '' : 's'}
                  </Tooltip>
                )}
              </Polygon>
            ))}
          </Fragment>
        );
      })}

      {/* GP practices (all placed practices are shipped; no downsampling)
          pm 3.2: the tooltip is NEUTRAL for unassigned practices — postcode
          only — and never names a catchment; for assigned ones it says which
          hospice the practice is assigned to. */}
      {visiblePractices.map((p) => {
        const hosp = p.hospiceId ? hospices.find((h) => h.id === p.hospiceId) : null;
        const dim = selectedId !== null && p.hospiceId !== selectedId;
        const dimmedNation = nationDim(p.nation);
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat as number, p.lon as number]}
            // pm 2.3: larger radius as the touch-target mitigation (a 5px
            // radius ≈ 10px dot is ~(3-4)× bigger than the pre-fix 3px one).
            radius={selectedId === p.hospiceId ? 7 : 5}
            pathOptions={{
              color: '#ffffff',
              weight: 1,
              fillColor: hosp?.color ?? '#999',
              fillOpacity: dimmedNation ? 0.15 : dim ? 0.12 : 0.85,
            }}
            eventHandlers={{ click: () => (p.hospiceId ? onSelect(p.hospiceId) : undefined) }}
          >
            <Tooltip>
              <strong>{p.name}</strong>
              <br />
              {p.address.join(', ')}
              <br />
              {p.postcode}
              {hosp ? (
                <span className="text-muted">
                  <br />
                  → assigned to {hosp.name}
                </span>
              ) : null}
              <DisagreeLink
                point={{
                  id: p.id,
                  name: p.name,
                  postcode: p.postcode,
                  hospiceName: hosp ? hosp.name : null,
                }}
              />
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* charity shops — pm 3.1: always drawn in their assigned hospice's
          colour; the outsideCatchment flag stays in the data and types
          (hide-not-delete) but is no longer exposed on screen. */}
      {visibleShops.map((s) => {
        const hosp = hospices.find((h) => h.id === s.hospiceId);
        const dim = selectedId !== null && s.hospiceId !== selectedId;
        const dimmedNation = hosp ? nationDim(hosp.nation) : false;
        return (
          <ShopMarker
            key={s.id}
            shop={s}
            hospiceColor={hosp?.color ?? '#666'}
            hospiceName={hosp ? hosp.name : null}
            opacity={dimmedNation ? 0.15 : dim ? 0.25 : 1}
            onSelect={onSelect}
          />
        );
      })}

      {/* hospice markers */}
      {visibleHospices.map((h) => (
        <HospiceMarker
          key={h.id}
          hospice={h}
          opacity={nationDim(h.nation) ? 0.15 : selectedId !== null && selectedId !== h.id ? 0.35 : 1}
          onSelect={onSelect}
        />
      ))}
    </MapContainer>
  );
}
