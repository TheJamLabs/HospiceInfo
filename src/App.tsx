import { useMemo, useState } from 'react';
import { useAppData } from './lib/useAppData';
import { useRoute } from './lib/useRoute';
import { feedbackMailto } from './lib/feedback';
import type { Hospice, Practice, Catchment, Shop } from './lib/types';
import AppShell from './components/AppShell';
import MapView from './components/MapView';
import HospicePanel from './components/HospicePanel';
import StartHere from './components/StartHere';
import Methodology from './components/Methodology';
import AboutPage from './pages/AboutPage';
import AccessibilityPage from './pages/AccessibilityPage';
import CorrectionsPage from './pages/CorrectionsPage';
import FeedbackPage from './pages/FeedbackPage';
import { LicencesPage, PrivacyPage } from './pages/LegalPage';

export default function App() {
  const route = useRoute();
  const { data: hospices, error: hospicesError } = useAppData<Hospice[]>('/data/hospices.json');
  const { data: practices, error: practicesError } = useAppData<Practice[]>('/data/practices.json');
  const { data: catchments, error: catchmentsError } = useAppData<Catchment[]>('/data/catchments.json');
  const { data: shops, error: shopsError } = useAppData<Shop[]>('/data/shops.json');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showShops, setShowShops] = useState(false);
  // ADR-0025: first load shows only catchments — shops and GPs start
  // OFF and are per-session (in-memory only, never persisted).
  const [showGps, setShowGps] = useState(false);
  const [nation, setNation] = useState<'all' | 'en' | 'sc' | 'wales' | 'ni'>('all');
  // pm 4.5/4.6: mobile bottom sheet — hidden by CSS off-canvas below 768px,
  // opened by the FAB (which reads as aria-expanded), closed by the FAB,
  // the scrim tap, or selecting a card (onSelect below).
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = () => setSheetOpen(false);
  // Selecting a hospice (from card, marker, polygon or legend) closes the
  // sheet on phones so the result is visible (pm 4.7).
  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) closeSheet();
  };
  // wm W11: the start-here landing card is open on first load; dismissing it
  // leaves a "Start here" pill in the panel header to re-open it.
  const [startHereOpen, setStartHereOpen] = useState(true);

  const error = hospicesError || practicesError || catchmentsError || shopsError;
  const loading = !error && (!hospices || !practices || !catchments || !shops);

  const selected = useMemo(
    () => (hospices && selectedId ? hospices.find((h) => h.id === selectedId) ?? null : null),
    [hospices, selectedId]
  );

  const selectedShops = useMemo(
    () => (shops && selectedId ? shops.filter((s) => s.hospiceId === selectedId) : []),
    [shops, selectedId]
  );

  // Non-map routes carry no map data requirements and load independently of
  // the four map JSON files (the correction log fetches on its own page).
  if (route !== 'map') {
    return (
      <AppShell>
        {route === 'feedback' && <FeedbackPage />}
        {route === 'corrections' && <CorrectionsPage />}
        {route === 'about' && <AboutPage />}
        {route === 'privacy' && <PrivacyPage />}
        {route === 'licences' && <LicencesPage />}
        {route === 'accessibility' && <AccessibilityPage />}
      </AppShell>
    );
  }

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
    <AppShell
      headerExtras={
        <>
          <label className="form-check form-switch m-0" title="Toggle charity shop markers on the map">
            <input
              className="form-check-input"
              type="checkbox"
              checked={showShops}
              onChange={(e) => setShowShops(e.target.checked)}
            />
            <span className="form-check-label small ms-1">Charity shops</span>
          </label>
          <label className="form-check form-switch m-0" title="Toggle GP practice markers on the map">
            <input
              className="form-check-input"
              id="gpsToggle"
              type="checkbox"
              checked={showGps}
              onChange={(e) => setShowGps(e.target.checked)}
            />
            <span className="form-check-label small ms-1">GP practices</span>
          </label>
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            data-bs-toggle="modal"
            data-bs-target="#methodologyModal"
          >
            Source &amp; Method
          </button>
        </>
      }
    >
      <div className={`app${sheetOpen ? ' app-sheet-open' : ''}`}>
        <aside className="app-panel" id="appPanel" aria-label="Hospice list">
          <HospicePanel
            hospices={hospices!}
            catchments={catchments!}
            practices={practices!}
            shops={shops!}
            selectedId={selectedId}
            onSelect={select}
            query={query}
            onQuery={setQuery}
            nation={nation}
            onNation={setNation}
            onStartHere={startHereOpen ? undefined : () => setStartHereOpen(true)}
          />
        </aside>
      <div className="app-map">
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
            <div className="small mt-1">{selected.source}</div>
            {selectedShops.length > 0 ? (
              <div className="small mt-1">
                {selectedShops.length} charity shop{selectedShops.length === 1 ? '' : 's'}
              </div>
            ) : null}
            <div className="small mt-1">
              {selected.website ? (
                <>
                  <a href={selected.website} target="_blank" rel="noreferrer">website</a>
                  {' · '}
                </>
              ) : null}
              <a href={selected.cqcUrl} target="_blank" rel="noreferrer">CQC register</a>
              {' · '}
              <a
                href={feedbackMailto({
                  id: selected.id,
                  name: selected.name,
                  postcode: selected.postcode,
                  hospiceName: null,
                })}
              >
                Disagree with this data?
              </a>
            </div>
          </div>
        )}
        {startHereOpen && (
          <StartHere
            practices={practices!}
            hospices={hospices!}
            onOpenHospice={select}
            onOpenShopSearch={select}
            onSearchList={setQuery}
            onDismiss={() => setStartHereOpen(false)}
          />
        )}
        <MapView
          hospices={hospices!}
          practices={practices!}
          catchments={catchments!}
          shops={shops!}
          showShops={showShops}
          showGps={showGps}
          selectedId={selectedId}
          onSelect={select}
          nation={nation}
        />
        <Methodology hospices={hospices} practices={practices} catchments={catchments} shops={shops} />
        </div>
        <button
          className="sheet-fab"
          type="button"
          aria-expanded={sheetOpen}
          aria-controls="appPanel"
          onClick={() => setSheetOpen(!sheetOpen)}
        >
          {sheetOpen ? 'Close list' : 'Open list'}
        </button>
        <button
          className="sheet-scrim"
          type="button"
          aria-label="Close list"
          tabIndex={sheetOpen ? 0 : -1}
          onClick={closeSheet}
        />
      </div>
    </AppShell>
  );
}
