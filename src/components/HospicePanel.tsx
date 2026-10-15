import { useMemo } from 'react';
import type { Hospice, Practice, Catchment } from '../lib/types';

interface Props {
  hospices: Hospice[];
  catchments: Catchment[];
  practices: Practice[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
}

export default function HospicePanel({ hospices, catchments, practices, selectedId, onSelect, query, onQuery }: Props) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of catchments) m.set(c.hospiceId, c.practiceCount);
    return m;
  }, [catchments]);
  const unassigned = useMemo(
    () => practices.filter((p) => p.hospiceId === null && p.lat != null).length,
    [practices]
  );

  const q = query.trim().toLowerCase();
  const list = hospices.filter(
    (h) => !q || h.name.toLowerCase().includes(q) || h.town.toLowerCase().includes(q)
  );

  const totalShown = list.reduce((s, h) => s + (counts.get(h.id) ?? 0), 0);

  return (
    <div className="d-flex flex-column h-100">
      <div className="p-3 border-bottom">
        <input
          type="search"
          className="form-control form-control-sm mb-2"
          placeholder="Filter hospices by name or town…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Filter hospices"
        />
        <div className="d-flex justify-content-between text-muted small">
          <span>{list.length} of {hospices.length} hospices</span>
          <span>{totalShown} practices{q ? '' : ` · ${unassigned} unassigned`}</span>
        </div>
      </div>
      <div className="flex-grow-1 overflow-auto panel-list">
        {list.map((h) => {
          const active = h.id === selectedId;
          const n = counts.get(h.id) ?? 0;
          return (
            <button
              key={h.id}
              type="button"
              className={`panel-item ${active ? 'panel-item-active' : ''}`}
              onClick={() => onSelect(active ? null : h.id)}
            >
              <span className="dot" style={{ background: h.color }} />
              <span className="me-1">
                <span className="d-block fw-semibold">{h.name}</span>
                <span className="d-block text-muted small">
                  {h.town}
                  {h.kind === 'approx' ? ' · approx.' : ''}
                </span>
              </span>
              <span className="badge text-bg-light ms-auto">{n}</span>
            </button>
          );
        })}
        {list.length === 0 && <div className="p-3 text-muted small">No hospices match “{query}”.</div>}
      </div>
    </div>
  );
}
