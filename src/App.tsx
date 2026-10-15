import { useMemo, useState } from 'react';
import { useAppData } from './lib/useAppData';
import type { Hospice, Practice, Catchment } from './lib/types';
import MapView from './components/MapView';
import HospicePanel from './components/HospicePanel';
import Legend from './components/Legend';
import Methodology from './components/Methodology';

export default function App() {
  const { data: hospices, error: hospicesError } = useAppData<Hospice[]>('/data/hospices.json');
  const { data: practices, error: practicesError } = useAppData<Practice[]>('/data/practices.json');
  const { data: catchments, error: catchmentsError } = useAppData<Catchment[]>('/data/catchments.json');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const error = hospicesError || practicesError || catchmentsError;
  const loading = !error && (!hospices || !practices || !catchments);

  const selected = useMemo(
    () => (hospices && selectedId ? hospices.find((h) => h.id === selectedId) ?? null : null),
    [hospices, selectedId]
  );

  if (loading) {
    return <div className="app-loading m-5">Loading catchment data…</div>;
  }
  if (error) {
    return (
      <div className="container my-4">
        <div className="alert alert-danger">
          <strong>Could not load catchment data.</strong>
          <p className="mb-0">{error}</p>
          <p className="mt-2 mb-0 text-muted">
            Run <code>npm run build-data</code> to generate <code>public/data/*.json</code>, then <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="container-fluid px-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h1 className="h4 mb-0">Hospice Catchment Map</h1>
              <div className="text-muted small">
                Lancashire &amp; South Cumbria — catchments approximated from GP practice locations
              </div>
            </div>
            <button className="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="modal" data-bs-target="#methodologyModal">
              Source &amp; Method
            </button>
          </div>
        </div>
      </header>
      <div className="app-body">
        <aside className="app-panel">
          <HospicePanel
            hospices={hospices!}
            catchments={catchments!}
            practices={practices!}
            selectedId={selectedId}
            onSelect={setSelectedId}
            query={query}
            onQuery={setQuery}
          />
        </aside>
        <main className="app-map">
          {selected && (
            <div className="app-selection alert alert-light border shadow-sm" role="status">
              <div className="d-flex align-items-center gap-2">
                <span
                  className="dot"
                  style={{ background: selected.color, width: 14, height: 14, display: 'inline-block', borderRadius: 999 }}
                />
                <strong>{selected.name}</strong>
                <span className="text-muted">· {selected.town}</span>
                <button
                  className="btn btn-sm btn-link text-decoration-none ms-auto"
                  type="button"
                  onClick={() => setSelectedId(null)}
                >
                  ✕ clear
                </button>
              </div>
              {selected.kind === 'published' ? (
                <div className="small mt-1">
                  <span className="badge bg-success-subtle text-success-emphasis">published service area</span>{' '}
                  {selected.source}
                </div>
              ) : (
                <div className="small mt-1">
                  <span className="badge bg-warning-subtle text-warning-emphasis">approximated</span>{' '} {selected.source}
                </div>
              )}
              <div className="small mt-1">
                {selected.website ? (
                  <>
                    <a href={selected.website} target="_blank" rel="noreferrer">website</a>
                    {' · '}
                  </>
                ) : null}
                <a href={selected.cqcUrl} target="_blank" rel="noreferrer">CQC register</a>
              </div>
            </div>
          )}
          <MapView
            hospices={hospices!}
            practices={practices!}
            catchments={catchments!}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <Legend hospices={hospices!} selectedId={selectedId} onSelect={setSelectedId} />
        </main>
      </div>
      <Methodology hospices={hospices} practices={practices} catchments={catchments} />
    </div>
  );
}
