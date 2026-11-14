import { useMemo, useState } from 'react';
import type { Hospice, Practice } from '../lib/types';
import { feedbackMailto } from '../lib/feedback';
import { normalisePostcode } from '../lib/postcodes';

// wm W11 (ADR-0012): landing card on the map — postcode → practice → catchment
// → hospice. Not-found wording is neutral and greppable; the card never
// exposes an internal flag.

const APPROXIMATION_LINE =
  'This map is drawn from the data we have today; boundaries shown are an approximation, not official catchment areas.';

interface Props {
  practices: Practice[];
  hospices: Hospice[];
  onOpenHospice: (id: string) => void;
  onOpenShopSearch: (id: string) => void;
  onSearchList: (text: string) => void;
  onDismiss: () => void;
}

export default function StartHere({
  practices,
  hospices,
  onOpenHospice,
  onOpenShopSearch,
  onSearchList,
  onDismiss,
}: Props) {
  const [postcode, setPostcode] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  const hospiceById = useMemo(() => new Map(hospices.map((h) => [h.id, h])), [hospices]);
  const practiceByPostcode = useMemo(() => {
    const m = new Map<string, Practice>();
    for (const p of practices) m.set(normalisePostcode(p.postcode), p);
    return m;
  }, [practices]);

  const found = submitted ? (practiceByPostcode.get(submitted) ?? null) : null;
  const hospice = found && found.hospiceId ? (hospiceById.get(found.hospiceId) ?? null) : null;

  const noteMailto = feedbackMailto({
    id: 'start-here',
    name: 'Start-here postcode search',
    postcode: submitted,
    hospiceName: null,
  });

  return (
    <div
      className="card shadow-sm"
      style={{ position: 'absolute', top: 12, left: 36, zIndex: 1000, width: 320, maxWidth: 'calc(100% - 48px)' }}
    >
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
            setSubmitted(normalisePostcode(postcode));
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
        {!found && submitted && (
          <div className="alert alert-light border py-2" role="status">
            <div className="small">
              We couldn't match that postcode to a GP practice on this map. You can search the list
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
