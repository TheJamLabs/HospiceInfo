// Item 5.7 (pm): Corrections log page. The fetch is PAGE-LOCAL on purpose:
// it must never be part of the shared app data gate (pm 6.3), and it is the
// only place on the site that reads /data/corrections.json.

import { useEffect, useState } from 'react';

interface CorrectionEntry {
  date: string; // YYYY-MM-DD
  summary: string;
  dataChanged: boolean;
  [key: string]: unknown;
}

// The canonical file format is a bare JSON array — that is what the committed
// stub ([]) is, what scripts/validate-corrections.mjs enforces, and what
// scripts/add-correction.mjs writes. (Security report, 22 October 2026: the
// page previously read json.corrections from an object it never gets, so the
// first real entry would have rendered as an empty list.)

export default function CorrectionsPage() {
  const [entries, setEntries] = useState<CorrectionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/corrections.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: CorrectionEntry[]) => {
        if (!cancelled) setEntries(Array.isArray(json) ? json : []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container my-3" style={{ maxWidth: 760 }}>
      <h1 className="h3">Corrections log</h1>
      <p className="text-muted">
        Every time a data fix lands on this site, the operators append one entry
        here. Newest entries appear first.
      </p>
      {error && (
        <div className="alert alert-danger">
          <strong>Could not load the corrections log.</strong> {error}
        </div>
      )}
      {!error && entries !== null && (
        entries.length === 0 ? (
          <p className="text-muted">No corrections have been recorded yet.</p>
        ) : (
          <div>
            {entries.map((e, i) => (
              <div className="card mb-2" key={`${e.date}-${i}`}>
                <div className="card-body py-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold">{e.date}</span>
                    {e.dataChanged ? (
                      <span className="badge bg-positive badge-positive-subtle text-success-emphasis">
                        data changed
                      </span>
                    ) : null}
                  </div>
                  <div>{e.summary}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
