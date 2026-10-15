import { useEffect, useMemo } from 'react';
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
import type { Hospice, Practice, Catchment } from '../lib/types';

interface Props {
  hospices: Hospice[];
  practices: Practice[];
  catchments: Catchment[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
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
    if (c?.polygon && c.polygon.length) return L.latLngBounds(c.polygon.map((p) => [p.lat, p.lon] as [number, number]));
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

function HospiceMarker({ hospice, dimmed, onSelect }: {
  hospice: Hospice;
  dimmed: boolean;
  onSelect: (id: string | null) => void;
}) {
  if (hospice.lat == null || hospice.lon == null) return null;
  const icon = L.divIcon({
    className: 'hospice-marker-wrap',
    html: `<span class="hospice-marker" style="background:${hospice.color};opacity:${dimmed ? 0.35 : 1}"></span>`,
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
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({ hospices, practices, catchments, selectedId, onSelect }: Props) {
  const visiblePractices = useMemo(
    () => practices.filter((p) => p.lat != null && p.lon != null),
    [practices]
  );
  const visibleHospices = useMemo(
    () => hospices.filter((h) => h.lat != null && h.lon != null),
    [hospices]
  );

  return (
    <MapContainer
      bounds={L.latLngBounds([[53.0, -3.6], [54.95, -2.0]])}
      className="app-map-canvas"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToSelection selectedId={selectedId} catchments={catchments} hospices={hospices} />

      {/* catchment envelopes */}
      {catchments.map((c) => {
        if (!c.polygon || c.polygon.length < 3) return null;
        const hospColor = hospices.find((h) => h.id === c.hospiceId)?.color ?? '#666';
        const dim = selectedId !== null && selectedId !== c.hospiceId;
        return (
          <Polygon
            key={c.hospiceId}
            positions={c.polygon.map((p) => [p.lat, p.lon] as [number, number])}
            pathOptions={{
              color: hospColor,
              weight: selectedId === c.hospiceId ? 3 : 1.5,
              opacity: dim ? 0.15 : 0.7,
              fillColor: hospColor,
              fillOpacity: dim ? 0.02 : selectedId === c.hospiceId ? 0.16 : 0.07,
            }}
            eventHandlers={{ click: () => onSelect(c.hospiceId) }}
          >
            <Tooltip sticky>
              {c.name} — {c.practiceCount} GP practice{c.practiceCount === 1 ? '' : 's'}
            </Tooltip>
          </Polygon>
        );
      })}

      {/* GP practices */}
      {visiblePractices.map((p) => {
        const hosp = p.hospiceId ? hospices.find((h) => h.id === p.hospiceId) : null;
        const dim = selectedId !== null && p.hospiceId !== selectedId;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat as number, p.lon as number]}
            radius={selectedId === p.hospiceId ? 5 : 3}
            pathOptions={{
              color: '#ffffff',
              weight: 1,
              fillColor: hosp?.color ?? '#999',
              fillOpacity: dim ? 0.12 : 0.85,
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

      {/* hospice markers */}
      {visibleHospices.map((h) => (
        <HospiceMarker key={h.id} hospice={h} dimmed={selectedId !== null && selectedId !== h.id} onSelect={onSelect} />
      ))}
    </MapContainer>
  );
}
