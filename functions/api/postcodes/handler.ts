/**
 * Cycle 8 (C8) — Pages Function proxy logic (A§4), pure and workerd-free:
 * no env access, no fetch, no AbortController in this module. The route
 * shell (`[postcode].ts`) owns the three workerd globals and delegates
 * everything here so the logic is importable under `node --test`.
 *
 * Credentials are passed as *arguments* (`buildUpstreamRequest`); this
 * module never reads or stores their values. Responses are fixed strings —
 * the upstream status/body is never echoed (an Access 403 may carry detail).
 */

const POSTCODE_SHAPE = /^[A-Z]{1,2}[0-9](?:[0-9A-Z])?[0-9][A-Z]{2}$/;

/**
 * Strip spaces, upper-case, then test the compact UK postcode shape.
 * IO/AA/ZI reserved areas are NOT special-cased (A§4): any postcode
 * upstream returns is accepted. Returns the compact form (e.g. "PR72TH")
 * or null when malformed.
 *
 * C8-OPS-2 (2026-11-16): the Pages runtime passes the raw percent-encoded
 * wildcard segment to `context.params` (e.g. "PR7%202TH"), so the input is
 * percent-decoded first. A malformed percent sequence (e.g. "%2G") leaves
 * the raw string in place, which the shape test below then rejects.
 */
export function validatePostcodeShape(raw: string): string | null {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Malformed percent sequence: keep the raw string — the shape test
    // below rejects it (C8-OPS-2, 2026-11-16).
  }
  const compact = decoded.replace(/\s+/g, '').toUpperCase();
  return POSTCODE_SHAPE.test(compact) ? compact : null;
}

/** Compact → spaced display form: "LS14AP" → "LS1 4AP" (last 3 chars detached). */
export function toSpacedForm(code: string): string {
  return code.slice(0, -3) + ' ' + code.slice(-3);
}

/**
 * Upstream request for the self-hosted postcodes.io (A§4). `base` is
 * `POSTCODES_IO_BASE`, the two credentials are Pages secrets — here they
 * arrive as arguments and are used only to fill the `CF-Access-*` headers.
 * Trailing slashes on `base` are stripped so the URL is always
 * `base + '/postcodes/' + spaced code` (no `//` seams).
 */
export function buildUpstreamRequest(
  base: string,
  code: string,
  clientId: string,
  clientSecret: string
): { url: string; method: string; headers: Record<string, string> } {
  return {
    url: `${base.replace(/\/+$/, '')}/postcodes/${toSpacedForm(code)}`,
    method: 'GET',
    headers: {
      'CF-Access-Client-Id': clientId,
      'CF-Access-Client-Secret': clientSecret,
    },
  };
}

interface UpstreamResult {
  postcode?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

/**
 * Map an upstream outcome to the frozen response contract (A§4):
 *   200 + finite result[0] lat/lon    → 200 {"postcode","latitude","longitude"} (stripped)
 *   404, or 200 w/ missing result /   → 404 {"error":"unknown postcode"}
 *          non-finite coords
 *   403 / any 5xx / timeout /         → 502 {"error":"postcode service unavailable"}
 *          non-JSON body (parsed = null)
 * `parsed` is the parsed upstream JSON body, or null when the body was not
 * JSON or the call never completed (route passes 500 as the status then).
 * postcodes.io returns `result` as an ARRAY of locations — the first entry
 * (`result[0]`) carries the coordinates; a bare object is accepted too.
 */
export function shapeUpstream(
  status: number,
  parsed: { result?: unknown } | null
): { status: number; body: string } {
  if (status === 200) {
    const result = parsed && typeof parsed === 'object' ? (parsed as { result?: unknown }).result : undefined;
    const first = Array.isArray(result) ? result[0] : result;
    if (
      first &&
      typeof first === 'object' &&
      Number.isFinite((first as UpstreamResult).latitude) &&
      Number.isFinite((first as UpstreamResult).longitude)
    ) {
      const r = first as UpstreamResult;
      return {
        status: 200,
        body: JSON.stringify({
          postcode: typeof r.postcode === 'string' ? r.postcode : '',
          latitude: r.latitude,
          longitude: r.longitude,
        }),
      };
    }
    return { status: 404, body: JSON.stringify({ error: 'unknown postcode' }) };
  }
  if (status === 404) {
    return { status: 404, body: JSON.stringify({ error: 'unknown postcode' }) };
  }
  // 403, any 5xx, and the never-completed sentinel (500) all land here (A§4).
  return { status: 502, body: JSON.stringify({ error: 'postcode service unavailable' }) };
}
