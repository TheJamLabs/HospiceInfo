import type { Hospice } from '../lib/types';

interface Props {
  hospices: Hospice[];
}

// Work list item 20: the persistent map legend is retired; this is the
// catchment colour key, now rendered only inside the Source & Methodology
// modal (the 20 curated catchments, each with its deterministic colour).
export default function Legend({ hospices }: Props) {
  const curated = hospices.filter((h) => h.curated);
  return (
    <div aria-label="Catchment colour key (20 curated)">
      {curated.map((h) => (
        <div key={h.id} className="d-flex align-items-center gap-2 small mb-1">
          <span className="dot flex-shrink-0" style={{ background: h.color }} />
          <span className="text-truncate">{h.name}</span>
          <span className="text-muted text-truncate ms-auto">{h.town}</span>
        </div>
      ))}
    </div>
  );
}
