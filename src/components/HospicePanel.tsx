import { useEffect, useMemo, useState } from 'react';
import type { Hospice, Practice, Catchment, Nation } from '../lib/types';

export type NationFilter = 'all' | Nation;

const NATIONS: { value: NationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'en', label: 'England' },
  { value: 'sc', label: 'Scotland' },
  { value: 'wales', label: 'Wales' },
  { value: 'ni', label: 'NI' },
];

// pm 4.1/W7: the search box trails the last keystroke by ~200 ms before the
// query reaches the list, so typing doesn't re-filter the panel on every
// character.
const SEARCH_DEBOUNCE_MS = 200;

type SortMode = 'name-asc' | 'name-desc' | 'practices-desc';

interface Props {
  hospices: Hospice[];
  catchments: Catchment[];
  practices: Practice[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
  nation: NationFilter;
  onNation: (n: NationFilter) => void;
  // wm W11: set only while the start-here card is dismissed; re-opens it.
  onStartHere?: () => void;
}

export default function HospicePanel({
  hospices,
  catchments,
  selectedId,
  onSelect,
  query,
  onQuery,
  nation,
  onNation,
  onStartHere,
}: Props) {
  const [draft, setDraft] = useState(query);
  // Stay in step if the parent changes the query externally (not user input).
  useEffect(() => {
    setDraft(query);
  }, [query]);
  // Trailing debounce: the parent query only follows the last keystroke.
  useEffect(() => {
    if (draft === query) return;
    const t = setTimeout(() => onQuery(draft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [draft, query, onQuery]);
  // pm 4.1/W10: list sort + “published service area” filter (ADR-0011).
  const [sortMode, setSortMode] = useState<SortMode>('name-asc');
  const [publishedOnly, setPublishedOnly] = useState(false);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of catchments) m.set(c.hospiceId, c.practiceCount);
    return m;
  }, [catchments]);

  const q = query.trim().toLowerCase();
  const list = hospices.filter(
    (h) =>
      (nation === 'all' || h.nation === nation) &&
      (!q || h.name.toLowerCase().includes(q) || h.town.toLowerCase().includes(q)) &&
      (!publishedOnly || h.kind === 'published')
  );
  const sorted = [...list].sort((a, b) => {
    if (sortMode === 'practices-desc') {
      const d = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      if (d !== 0) return d;
    }
    const cmp = a.name.localeCompare(b.name);
    if (cmp === 0) return a.id.localeCompare(b.id);
    return sortMode === 'name-desc' ? -cmp : cmp;
  });

  const totalShown = sorted.reduce((s, h) => s + (counts.get(h.id) ?? 0), 0);

  return (
    <div className="d-flex flex-column h-100">
      <div className="p-3 border-bottom">
        {onStartHere ? (
          <button type="button" className="btn btn-sm btn-outline-primary mb-2" onClick={onStartHere}>
            Start here
          </button>
        ) : null}
        <input
          type="search"
          className="form-control form-control-sm mb-2"
          placeholder="Filter hospices by name or town…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Filter hospices"
        />
        <div className="btn-group btn-group-sm w-100 mb-2" role="group" aria-label="Filter by nation">
          {NATIONS.map((n) => (
            <button
              key={n.value}
              type="button"
              className={`btn ${nation === n.value ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onNation(n.value)}
            >
              {n.label}
            </button>
          ))}
        </div>
        <select
          className="form-select form-select-sm mb-2"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          aria-label="Sort hospices"
        >
          <option value="name-asc">Name (A→Z)</option>
          <option value="name-desc">Name (Z→A)</option>
          <option value="practices-desc">Practices (high→low)</option>
        </select>
        <div className="form-check form-switch mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="publishedToggle"
            checked={publishedOnly}
            onChange={(e) => setPublishedOnly(e.target.checked)}
          />
          <label className="form-check-label small" htmlFor="publishedToggle">
            Has published service area
          </label>
        </div>
        <div className="d-flex justify-content-between text-muted small">
          <span>{list.length} of {hospices.length} hospices</span>
          <span>{totalShown} practices</span>
        </div>
      </div>
      <div className="flex-grow-1 overflow-auto panel-list">
        {sorted.map((h) => {
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
                  {h.kind === 'approx' ? (
                    <>
                      {' '}
                      <span className="badge bg-warning-subtle text-warning-emphasis">approx</span>
                    </>
                  ) : null}
                </span>
              </span>
              <span className="badge text-bg-light ms-auto">{n}</span>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="p-3 text-muted small">
            {q ? `No hospices match “${query}”.` : 'No hospices match the current filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
