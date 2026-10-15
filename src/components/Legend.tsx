import type { Hospice } from '../lib/types';

interface Props {
  hospices: Hospice[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function Legend({ hospices, selectedId, onSelect }: Props) {
  return (
    <div className="card shadow-sm legend-card" aria-label="Legend">
      <div className="card-body p-2">
        <div className="legend-grid">
          {hospices.map((h) => (
            <button
              key={h.id}
              type="button"
              className={`legend-item ${selectedId === h.id ? 'active' : ''}`}
              onClick={() => onSelect(selectedId === h.id ? null : h.id)}
              title={`${h.name} — ${h.town}`}
            >
              <span className="dot" style={{ background: h.color }} />
              <span className="legend-label">{h.name}</span>
            </button>
          ))}
        </div>
        <div className="legend-note small text-muted px-1 pb-1">
          <span className="dot me-1" style={{ background: '#999' }} />
          <span className="me-2">GP practice (dot coloured by catchment)</span>
          <span className="me-2">◇ hospice site</span>
          <span
            className="me-1"
            style={{
              display: 'inline-block',
              width: 9,
              height: 9,
              background: '#e07b00',
              borderRadius: 2,
              verticalAlign: 'baseline',
            }}
          />
          <span className="me-2">charity shop (orange = outside its own catchment)</span>
          <br />
          Areas tile the map — each practice belongs to exactly one catchment
        </div>
      </div>
    </div>
  );
}
