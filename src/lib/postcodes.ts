/**
 * Normalise a UK postcode search input (C6-3): strip everything
 * non-alphanumeric, then upper-case — "ls1 4ap" → "LS14AP". The data files
 * store postcodes in that normalised form, as does the map UI.
 */
export function normalisePostcode(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

/**
 * Cycle 8 (C8) — tier-2 postcode geocode fallback (A§5). `normalisePostcode`
 * above stays untouched; everything below is the Online-fallback half: shape
 * check, spaced form, even-odd point-in-polygon over the kind-filtered
 * catchment cells, and the never-throwing lookup (A§7 degradation contract).
 */
import type { Catchment } from './types';

const POSTCODE_SHAPE = /^[A-Z]{1,2}[0-9](?:[0-9A-Z])?[0-9][A-Z]{2}$/;
const LOOKUP_BUDGET_MS = 3000;

/**
 * Client twin of the function's shape check (`functions/api/postcodes/
 * handler.ts` — same literal pattern, kept in sync per R-5): strip spaces,
 * upper-case, test the compact form. Obviously-bad input never hits the
 * network (A§5 item 2).
 */
export function isPostcodeShape(code: string): boolean {
  return POSTCODE_SHAPE.test(code.replace(/\s+/g, '').toUpperCase());
}

/** Compact → spaced display form: "LS14AP" → "LS1 4AP" (last 3 chars detached). */
export function toSpacedForm(code: string): string {
  return code.slice(0, -3) + ' ' + code.slice(-3);
}

/**
 * Even-odd point-in-cell over ALL rings of a cell (outer + holes), ported
 * from the production core at `scripts/build-data.mjs:438-455`: a point
 * inside a hole flips twice → outside; a point in the outer area flips once
 * → inside, so no winding/role bookkeeping is needed. A point within the
 * on-line band `|v| <= (|dx|+|dy|)/2 * 1e-9` of any edge votes OUTSIDE
 * (the build-time band, one tolerance system across build and runtime).
 * Degenerate `polygons: []` cells → no hit (no special-casing). Repeated
 * vertices (zero-length edges, present in every tessellated catchment ring)
 * are skipped: they have no direction, so the band's `0 <= 0` would
 * hard-reject every point, and even-odd gets no toggle from them.
 */
export function pointInCell(lat: number, lon: number, cell: Catchment): boolean {
  let inside = false;
  for (const ring of cell.polygons) {
    for (let j = 0; j < ring.length; j++) {
      const a = ring[j];
      const b = ring[(j + 1) % ring.length];
      const dx = b.lon - a.lon;
      const dy = b.lat - a.lat;
      if (dx === 0 && dy === 0) continue; // repeated vertex: skip
      const v = dx * (lat - a.lat) - dy * (lon - a.lon);
      if (Math.abs(v) <= (Math.abs(dx) + Math.abs(dy)) / 2 * 1e-9) return false;
      // Edge crosses the horizontal ray at lat (so dy !== 0): toggle when
      // the crossing lon sits to the right of lon.
      if ((a.lat > lat) !== (b.lat > lat) && lon < a.lon + (b.lon - a.lon) * (lat - a.lat) / dy) {
        inside = !inside;
      }
    }
  }
  return inside;
}

interface CellBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Per-cell bounding boxes, memoised on the `cells` array identity (A§5 item
 * 5): the `kindCatchments` memo flips identity on the children/adult mode
 * toggle, so the boxes recompute exactly when they must. Exported (a plain
 * WeakMap — not a function) so the W5(c) test can observe build/reuse.
 */
export const cellBboxes = new WeakMap<Catchment[], CellBox[]>();

function boxesFor(cells: Catchment[]): CellBox[] {
  const cached = cellBboxes.get(cells);
  if (cached) return cached;
  const boxes: CellBox[] = cells.map((cell) => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const ring of cell.polygons) {
      for (const p of ring) {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lon < minLon) minLon = p.lon;
        if (p.lon > maxLon) maxLon = p.lon;
      }
    }
    return { minLat, maxLat, minLon, maxLon };
  });
  cellBboxes.set(cells, boxes);
  return boxes;
}

/**
 * Bbox-prefiltered lookup of the cell containing (lat, lon); first hit wins
 * (data invariant: at most one cell per kind — the kind filter is the
 * disambiguator, ADR-0035). Degenerate cells are filtered out by their
 * empty bbox.
 */
export function findHospiceCell(lat: number, lon: number, cells: Catchment[]): Catchment | null {
  const boxes = boxesFor(cells);
  for (let i = 0; i < cells.length; i++) {
    const b = boxes[i];
    if (lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon) continue;
    if (pointInCell(lat, lon, cells[i])) return cells[i];
  }
  return null;
}

type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<Response>;

/**
 * Tier-2 lookup (A§5 item 6, A§7): shape check → fetch the same-origin
 * proxy (`/api/postcodes/{spaced}`) with a 3 s budget → 200 → parse JSON →
 * finite coords → PIP over the (kind-filtered) cells. The ENTIRE body is one
 * try/catch: abort, network failure, non-2xx, non-JSON, non-finite coords —
 * it ALWAYS resolves and NEVER throws. `fetchImpl` is injectable for tests.
 */
export async function lookupByPostcode(
  code: string,
  cells: Catchment[],
  fetchImpl: FetchLike = fetch
): Promise<{ cell: Catchment; code: string } | null> {
  try {
    if (!isPostcodeShape(code)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_BUDGET_MS);
    try {
      const res = await fetchImpl('/api/postcodes/' + toSpacedForm(code), { signal: controller.signal });
      if (res.status !== 200) return null;
      const data = (await res.json()) as { latitude?: number; longitude?: number };
      const latitude = data.latitude;
      const longitude = data.longitude;
      if (typeof latitude !== 'number' || !Number.isFinite(latitude)) return null;
      if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return null;
      const cell = findHospiceCell(latitude, longitude, cells);
      return cell ? { cell, code } : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // A§7: every failure is a clean null → the not-found card. No throw,
    // no console error, no dead-end state.
    return null;
  }
}
