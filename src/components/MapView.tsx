import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Tooltip,
  useMap,
  useMapEvent,
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
  showGps: boolean;
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

function HospiceMarker({ hospice, icon, opacity, onSelect }: {
  hospice: Hospice;
  icon: L.DivIcon | undefined;
  opacity: number;
  onSelect: (id: string | null) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (el) el.style.opacity = String(opacity);
  }, [opacity]);
  if (hospice.lat == null || hospice.lon == null) return null;
  return (
    <Marker ref={markerRef} position={[hospice.lat, hospice.lon]} icon={icon} eventHandlers={{ click: () => onSelect(hospice.id) }}>
      <Popup>
        <div style={{ minWidth: 180 }}>
          <strong>{hospice.name}</strong>
          <br />
          {hospice.town} · {hospice.postcode}
          <br />
          <span className="text-muted small">
            {hospice.curated ? 'curated' : ''}
          </span>
          <DisagreeLink point={{ id: hospice.id, name: hospice.name, postcode: hospice.postcode, hospiceName: null }} />
        </div>
      </Popup>
    </Marker>
  );
}

function ShopMarker({ shop, icon, hospiceName, opacity, onSelect }: {
  shop: Shop;
  icon: L.DivIcon | undefined;
  hospiceName: string | null;
  opacity: number;
  onSelect: (id: string | null) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (el) el.style.opacity = String(opacity);
  }, [opacity]);
  return (
    <Marker ref={markerRef} position={[shop.lat, shop.lon]} icon={icon} eventHandlers={{ click: () => onSelect(shop.hospiceId) }}>
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

// Practice-layer LOD (ADR-0010 P2): below ZOOM_LOD the ~10k practices are
// aggregated into 0.5-deg grid buckets (one marker per bucket, white count
// on blue) so the canvas renderer draws a few hundred dots instead of ten
// thousand; clicking a bucket flies down to ZOOM_LOD. No simplification or
// subsampling — every practice is present at full zoom.
const GRID = 0.5;
const ZOOM_LOD = 11;

function PracticeLayer({ practices, hospiceById, selectedId, onSelect, nation }: {
  practices: Practice[];
  hospiceById: Map<string, Hospice>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  nation: NationFilter;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvent('zoomend', () => setZoom(map.getZoom()));
  const nationDim = (n: string) => nation !== 'all' && n !== nation;
  const buckets = useMemo(() => {
    const m = new Map<string, { count: number; latSum: number; lonSum: number }>();
    for (const p of practices) {
      const key = `${Math.floor((p.lon as number) / GRID)}:${Math.floor((p.lat as number) / GRID)}`;
      const b = m.get(key) ?? { count: 0, latSum: 0, lonSum: 0 };
      b.count += 1;
      b.latSum += p.lat as number;
      b.lonSum += p.lon as number;
      m.set(key, b);
    }
    return m;
  }, [practices]);
  const bucketItems = useMemo(
    () =>
      [...buckets.entries()].map(([key, b]) => ({
        key,
        count: b.count,
        lat: b.latSum / b.count,
        lon: b.lonSum / b.count,
      })),
    [buckets]
  );
  const bucketIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    for (const b of bucketItems) {
      m.set(
        b.key,
        L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;line-height:16px;background:var(--hf-gp-fill);color:#fff;border:2px solid #fff;border-radius:50%;text-align:center;font-size:11px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.4)">${b.count}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
      );
    }
    return m;
  }, [bucketItems]);
  if (zoom < ZOOM_LOD) {
    return (
      <>
        {bucketItems.map((b) => (
          <Marker
            key={b.key}
            position={[b.lat, b.lon]}
            icon={bucketIcons.get(b.key)}
            eventHandlers={{ click: () => map.flyTo([b.lat, b.lon], ZOOM_LOD) }}
          />
        ))}
      </>
    );
  }
  return (
    <>
      {/* GP practices — all placed practices are shipped; no downsampling.
          pm 3.2/W6: the per-practice hover Tooltip is removed (10k tooltip
          elements on the canvas layer were the dominant DOM cost); catchment
          and shop tooltips remain. The Disagree link is still reachable on
          every point that keeps a popup/tooltip. */}
      {practices.map((p) => {
        const hosp = p.hospiceId ? hospiceById.get(p.hospiceId) ?? null : null;
        const dim = selectedId !== null && p.hospiceId !== selectedId;
        const dimmedNation = nationDim(p.nation);
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat as number, p.lon as number]}
            // pm 2.3: larger radius as the touch-target mitigation;
            // W2/ADR-0026 mutes the GP layer (4 / 6 selected — smaller than
            // the 12–16px hospice markers).
            radius={selectedId === p.hospiceId ? 6 : 4}
            pathOptions={{
              color: '#ffffff',
              weight: 1,
              fillColor: hosp?.color ?? '#999',
              fillOpacity: dimmedNation ? 0.15 : dim ? 0.12 : 0.55,
            }}
            eventHandlers={{ click: () => (p.hospiceId ? onSelect(p.hospiceId) : undefined) }}
          />
        );
      })}
    </>
  );
}

export default function MapView({ hospices, practices, catchments, shops, showShops, showGps, selectedId, onSelect, nation }: Props) {
  const visiblePractices = useMemo(
    () => (showGps ? practices.filter((p) => p.lat != null && p.lon != null) : []),
    [practices, showGps]
  );
  const visibleHospices = useMemo(
    () => hospices.filter((h) => h.lat != null && h.lon != null),
    [hospices]
  );
  const hospiceById = useMemo(() => {
    const m = new Map<string, Hospice>();
    for (const h of hospices) m.set(h.id, h);
    return m;
  }, [hospices]);
  const visibleShops = useMemo(() => (showShops ? shops : []), [shops, showShops]);
  const nationDim = (n: string) => nation !== 'all' && n !== nation;

  // Shared divIcons, one per colour (created once, not per render); per-marker
  // opacity is applied to the marker element itself so the icons stay pristine.
  const hospiceIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    for (const h of visibleHospices) {
      if (!m.has(h.color)) {
        m.set(
          h.color,
          L.divIcon({
            className: 'hospice-marker-wrap',
            html: `<span class="hospice-marker" style="background:${h.color}"></span>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
        );
      }
    }
    return m;
  }, [visibleHospices]);
  const shopIcons = useMemo(() => {
    const m = new Map<string, L.DivIcon>();
    for (const s of visibleShops) {
      const c = hospiceById.get(s.hospiceId)?.color ?? '#666';
      if (!m.has(c)) {
        m.set(
          c,
          L.divIcon({
            className: 'shop-marker-wrap',
            html: `<span class="shop-marker" style="background:${c}"></span>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          })
        );
      }
    }
    return m;
  }, [visibleShops, hospiceById]);

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
        const hospColor = hospiceById.get(c.hospiceId)?.color ?? '#666';
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

      {/* GP practices — rendered through the grid-bucket LOD layer (W5) */}
      <PracticeLayer
        practices={visiblePractices}
        hospiceById={hospiceById}
        selectedId={selectedId}
        onSelect={onSelect}
        nation={nation}
      />

      {/* charity shops — pm 3.1: always drawn in their assigned hospice's
          colour; the outsideCatchment flag stays in the data and types
          (hide-not-delete) but is no longer exposed on screen. */}
      {visibleShops.map((s) => {
        const hosp = hospiceById.get(s.hospiceId) ?? null;
        const dim = selectedId !== null && s.hospiceId !== selectedId;
        const dimmedNation = hosp ? nationDim(hosp.nation) : false;
        return (
          <ShopMarker
            key={s.id}
            shop={s}
            icon={shopIcons.get(hosp?.color ?? '#666')}
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
          icon={hospiceIcons.get(h.color)}
          opacity={nationDim(h.nation) ? 0.15 : selectedId !== null && selectedId !== h.id ? 0.35 : 1}
          onSelect={onSelect}
        />
      ))}
    </MapContainer>
  );
}
