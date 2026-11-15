import { useMemo, useRef, useState } from 'react';
import type { Catchment, Hospice, Practice } from '../lib/types';
import { feedbackMailto } from '../lib/feedback';
import { isPostcodeShape, lookupByPostcode, normalisePostcode } from '../lib/postcodes';

// wm W11 (ADR-0012): landing card on the map — postcode → practice → catchment
// → hospice. Not-found wording is neutral and greppable; the card never
// exposes an internal flag.
// Cycle 8 (C8): tier-2 geocode fallback — on a tier-1 miss with valid shape,
// resolve the postcode (lookupByPostcode) against the kind-filtered catchments;
// hit → hospice card (no practice line, R-3); miss → not-found card (ac3:
// never throws). Not-found copy: OQ1 reword signed 2026-11-15 (hospice catchment).

const APPROXIMATION_LINE =
  'This map is drawn from the data we have today; boundaries shown are an approximation, not official catchment areas.';

interface Props {
  practices: Practice[];
  hospices: Hospice[];
  catchments: Catchment[];
  onOpenHospice: (id: string) => void;
  onOpenShopSearch: (id: string) => void;
  onSearchList: (text: string) => void;
  onDismiss: () => void;
}

export default function StartHere({
  practices,
  hospices,
  catchments,
  onOpenHospice,
  onOpenShopSearch,
  onSearchList,
  onDismiss,
}: Props) {
  const [postcode, setPostcode] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  // Cycle 8 (C8): tier-2 state machine (ARC §6.2): idle → resolving → hit | miss.
  // The lookupGen ref discards stale in-flight results on resubmit —
  // lookupByPostcode owns its own 3 s budget (W3 frozen, no signal param).
  const [phase, setPhase] = useState<'idle' | 'resolving' | 'hit' | 'miss'>('idle');
  const [cell, setCell] = useState<Catchment | null>(null);
  const lookupGen = useRef(0);

  const hospiceById = useMemo(() => new Map(hospices.map((h) => [h.id, h])), [hospices]);
  const practiceByPostcode = useMemo(() => {
    const m = new Map<string, Practice>();
    for (const p of practices) m.set(normalisePostcode(p.postcode), p);
    return m;
  }, [practices]);

  const found = submitted ? (practiceByPostcode.get(submitted) ?? null) : null;
  const hospice = found && found.hospiceId ? (hospiceById.get(found.hospiceId) ?? null) : null;
  // Cycle 8 (C8): tier-2 hit-card hospice. Null-guard is defensive (ARC §6.2):
  // null falls through to the not-found card, never an empty hit card.
  const tier2Hospice = cell ? (hospiceById.get(cell.hospiceId) ?? null) : null;

  const noteMailto = feedbackMailto({
    id: 'start-here',
    name: 'Start-here postcode search',
    postcode: submitted,
    hospiceName: null,
  });

  return (
    /* C7/W2 (ADR-0038): geometry moved to CSS (base `.hf-start-here` in
       styles.css mirrors the former inline values 1:1; mobile overrides in
       the 768px block). */
    <div className="card shadow-sm hf-start-here">
      <div className="card-header d-flex align-items-center py-2">
        <strong className="small">Start here</strong>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 ms-auto"
          style={{ fontSize: 18, lineHeight: 1 }}
          onClick={onDismiss}
          aria-label="Dismiss start-here card"
        >
          ×
        </button>
      </div>
      <div className="card-body">
        <form
          className="mb-2"
          onSubmit={(e) => {
            e.preventDefault();
            const normalised = normalisePostcode(postcode);
            setSubmitted(normalised);
            const gen = ++lookupGen.current;
            if (practiceByPostcode.has(normalised)) {
              // Tier-1 hit: unchanged behaviour — no tier-2 state, zero network (ac2).
              setPhase('idle');
              setCell(null);
            } else if (isPostcodeShape(normalised)) {
              // Tier-1 miss, valid shape: geocode fallback. lookupByPostcode
              // always resolves, never throws (ac3).
              setPhase('resolving');
              setCell(null);
              lookupByPostcode(normalised, catchments).then((result) => {
                if (lookupGen.current !== gen) return; // stale: resubmitted in flight
                if (result) {
                  setCell(result.cell);
                  setPhase('hit');
                } else {
                  setPhase('miss');
                }
              });
            } else {
              // Invalid shape: no tier-2, zero network, not-found (ac3).
              setPhase('miss');
              setCell(null);
            }
          }}
        >
          <label className="form-label small mb-1" htmlFor="startHerePostcode">
            Your postcode
          </label>
          <input
            id="startHerePostcode"
            type="text"
            className="form-control mb-2"
            style={{ textTransform: 'uppercase' }}
            placeholder="e.g. CF11 9HD"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            pattern="[A-Z0-9 ]{5,8}"
            maxLength={8}
            autoComplete="off"
            required
          />
          <button type="submit" className="btn btn-primary w-100" style={{ minHeight: 44 }}>
            Find your hospice
          </button>
        </form>

        {found && hospice && (
          <div className="alert alert-light border py-2" role="status">
            <div className="small">{found.name} · {found.postcode}</div>
            <div className="small mb-2">
              {hospice.name} · {hospice.town}
            </div>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => onOpenHospice(hospice.id)}>
              Open in panel
            </button>
          </div>
        )}
        {found && !hospice && (
          <div className="alert alert-light border py-2" role="status">
            <div className="small">{found.name} · {found.postcode}</div>
            <div className="small mt-1">
              You can search the list instead, or{' '}
              <a href={noteMailto}>send us a note</a>.
            </div>
          </div>
        )}
        {!found && submitted && phase === 'resolving' && (
          <div className="alert alert-light border py-2" role="status">
            <div className="small">Checking your area…</div>
          </div>
        )}
        {!found && submitted && phase === 'hit' && tier2Hospice && (
          <div className="alert alert-light border py-2" role="status">
            <div className="small mb-2">{tier2Hospice.name} · {tier2Hospice.town}</div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => onOpenHospice(tier2Hospice.id)}
            >
              Open in panel
            </button>
          </div>
        )}
        {!found && submitted && !(phase === 'resolving') && !(phase === 'hit' && tier2Hospice) && (
          <div className="alert alert-light border py-2" role="status">
            <div className="small">
              We couldn't match that postcode to a hospice catchment on this map. You can search the list
              instead, or <a href={noteMailto}>send us a note</a>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary mt-1"
              onClick={() => onSearchList(submitted)}
            >
              Search the list
            </button>
          </div>
        )}

        <div className="accordion accordion-flush" id="startHerePersonas">
          <div className="accordion-item">
            <h3 className="accordion-header">
              <button
                className="accordion-button collapsed py-1"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#shPersonaPatient"
                aria-expanded="false"
              >
                If you're a patient or carer
              </button>
            </h3>
            <div id="shPersonaPatient" className="accordion-collapse collapse" data-bs-parent="#startHerePersonas">
              <div className="accordion-body py-2 small">
                <p className="mb-1">Use the postcode box above to find the hospice that serves your area.</p>
                <p className="mb-0 text-muted">{APPROXIMATION_LINE}</p>
              </div>
            </div>
          </div>
          <div className="accordion-item">
            <h3 className="accordion-header">
              <button
                className="accordion-button collapsed py-1"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#shPersonaFundraiser"
                aria-expanded="false"
              >
                If you're a fundraiser or charity shop
              </button>
            </h3>
            <div
              id="shPersonaFundraiser"
              className="accordion-collapse collapse"
              data-bs-parent="#startHerePersonas"
            >
              <div className="accordion-body py-2 small">
                <p className="mb-1">
                  Find your postcode first; then open its hospice to see the charity shops drawn near it.
                </p>
                {hospice && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary mb-2"
                    onClick={() => onOpenShopSearch(hospice.id)}
                  >
                    See this hospice's shops
                  </button>
                )}
                <p className="mb-0 text-muted">{APPROXIMATION_LINE}</p>
              </div>
            </div>
          </div>
          <div className="accordion-item">
            <h3 className="accordion-header">
              <button
                className="accordion-button collapsed py-1"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#shPersonaClinician"
                aria-expanded="false"
              >
                If you're a clinician or referrer
              </button>
            </h3>
            <div id="shPersonaClinician" className="accordion-collapse collapse" data-bs-parent="#startHerePersonas">
              <div className="accordion-body py-2 small">
                <p className="mb-1">
                  Use the same postcode lookup to see which hospice area covers a patient. For real
                  referral decisions, confirm with the hospice — the line here is an approximation.
                </p>
                <p className="mb-0 text-muted">{APPROXIMATION_LINE}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
