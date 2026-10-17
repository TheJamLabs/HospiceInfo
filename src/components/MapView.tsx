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

// Refits the viewport when the nation filter changes.
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
        </div>
      </Popup>
    </Marker>
  );
}

const SHOP_OUTSIDE_COLOR = '#e07b00';

function ShopMarker({ shop, hospiceColor, opacity, onSelect }: {
  shop: Shop;
  hospiceColor: string;
  opacity: number;
  onSelect: (id: string | null) => void;
}) {
  const color = shop.outsideCatchment ? SHOP_OUTSIDE_COLOR : hospiceColor;
  const icon = L.divIcon({
    className: 'shop-marker-wrap',
    html: `<span class="shop-marker" style="background:${color};opacity:${opacity}"></span>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
  return (
    <Marker position={[shop.lat, shop.lon]} icon={icon} eventHandlers={{ click: () => onSelect(shop.hospiceId) }}>
      <Tooltip>
        <strong>{shop.name}</strong>
        <br />
        {shop.address}{shop.postcode ? ` · ${shop.postcode}` : ''}
        {shop.outsideCatchment ? (
          <>
            <br />
            <span className="fw-semibold" style={{ color: SHOP_OUTSIDE_COLOR }}>
              ⚠ Outside its own catchment
            </span>
          </>
        ) : null}
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
      bounds={L.latLngBounds([[49.5, -9.5], [61.5, 2.0]])}
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

      {/* GP practices (all placed practices are shipped; no downsampling) */}
      {visiblePractices.map((p) => {
        const hosp = p.hospiceId ? hospices.find((h) => h.id === p.hospiceId) : null;
        const dim = selectedId !== null && p.hospiceId !== selectedId;
        const dimmedNation = nationDim(p.nation);
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat as number, p.lon as number]}
            radius={selectedId === p.hospiceId ? 5 : 3}
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
              <span className="text-muted">
                {p.postcode} → {hosp ? hosp.name : 'no catchment match'}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* charity shops */}
      {visibleShops.map((s) => {
        const hosp = hospices.find((h) => h.id === s.hospiceId);
        const dim = selectedId !== null && s.hospiceId !== selectedId;
        const dimmedNation = hosp ? nationDim(hosp.nation) : false;
        return (
          <ShopMarker
            key={s.id}
            shop={s}
            hospiceColor={hosp?.color ?? '#666'}
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
