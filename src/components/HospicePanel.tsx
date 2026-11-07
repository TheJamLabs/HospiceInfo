import { useEffect, useMemo, useState } from 'react';
import type { Hospice, Practice, Catchment, Shop, Nation } from '../lib/types';

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
  shops: Shop[];
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
  practices,
  shops,
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
  // pm 4.1/W10: list sort (ADR-0011)
  const [sortMode, setSortMode] = useState<SortMode>('name-asc');
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of catchments) m.set(c.hospiceId, c.practiceCount);
    return m;
  }, [catchments]);

  const q = query.trim().toLowerCase();
  // ADR-0026: non-empty query -> fixed three-tier ranking: Shops -> Hospices
  // -> GP practices; each section header carries its match count. Unassigned
  // GPs (hospiceId === null) never match (hide-not-delete).
  const hospiceNationById = useMemo(() => {
    const m = new Map<string, Nation>();
    for (const h of hospices) m.set(h.id, h.nation);
    return m;
  }, [hospices]);
  const shopMatches = useMemo(
    () =>
      q
        ? shops
            .filter((s) => {
              const n = hospiceNationById.get(s.hospiceId);
              if (!n || (nation !== 'all' && n !== nation)) return false;
              return s.name.toLowerCase().includes(q) || (s.postcode ?? '').toLowerCase().includes(q);
            })
            .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
        : [],
    [q, shops, hospiceNationById, nation]
  );
  const gpMatches = useMemo(
    () =>
      q
        ? practices
            .filter((p) => {
              if (p.hospiceId === null) return false;
              if (nation !== 'all' && p.nation !== nation) return false;
              return p.name.toLowerCase().includes(q) || p.postcode.toLowerCase().includes(q);
            })
            .sort(
              (a, b) =>
                a.name.localeCompare(b.name) ||
                a.postcode.localeCompare(b.postcode) ||
                a.id.localeCompare(b.id)
            )
        : [],
    [q, practices, nation]
  );
  const list = hospices.filter(
    (h) =>
      (nation === 'all' || h.nation === nation) &&
      (!q || h.name.toLowerCase().includes(q) || h.town.toLowerCase().includes(q))
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

  const hospiceRow = (h: Hospice) => {
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
          </span>
        </span>
        <span className="badge text-bg-light ms-auto">{n}</span>
      </button>
    );
  };

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
        <div className="d-flex justify-content-between text-muted small">
          <span>{list.length} of {hospices.length} hospices</span>
          <span>{totalShown} practices</span>
        </div>
      </div>
      <div className="flex-grow-1 overflow-auto panel-list">
        {q ? (
          <>
            <div className="panel-section-header">Shops ({shopMatches.length})</div>
            {shopMatches.map((s) => (
              <button
                key={s.id}
                type="button"
                className="panel-item"
                onClick={() => onSelect(s.hospiceId)}
              >
                <span className="me-1">
                  <span className="d-block fw-semibold">{s.name}</span>
                  <span className="d-block text-muted small">{s.postcode ?? ''}</span>
                </span>
              </button>
            ))}
            <div className="panel-section-header">Hospices ({sorted.length})</div>
            {sorted.map(hospiceRow)}
            <div className="panel-section-header">GP practices ({gpMatches.length})</div>
            {gpMatches.map((p) => (
              <button
                key={p.id}
                type="button"
                className="panel-item"
                onClick={() => onSelect(p.hospiceId)}
              >
                <span className="me-1">
                  <span className="d-block fw-semibold">{p.name}</span>
                  <span className="d-block text-muted small">{p.postcode}</span>
                </span>
              </button>
            ))}
          </>
        ) : (
          <>
            {sorted.map(hospiceRow)}
            {sorted.length === 0 && (
              <div className="p-3 text-muted small">No hospices match the current filters.</div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
