/**
 * Cycle 8 (C8) — thin Cloudflare Pages route for GET /api/postcodes/{postcode}
 * (A§4). Owns the only three workerd globals (`context`, `fetch`,
 * `AbortController`); all logic delegates to `handler.ts`. Reads the three
 * env values exactly by name (Pages secrets in prod, `.dev.vars` in local
 * dev — values never committed). Fixed JSON bodies only: the upstream
 * status/body is never echoed, and nothing is logged (a postcode is
 * PII-adjacent). R-1: a function-internal failure (e.g. missing
 * POSTCODES_IO_BASE) yields workerd's default 500 — the client treats every
 * non-2xx identically, so there is no separate 500 handling here.
 */
import { buildUpstreamRequest, shapeUpstream, validatePostcodeShape } from './handler.ts';

const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const FUNCTION_BUDGET_MS = 5000;

interface FunctionContext {
  env: Record<string, string | undefined>;
  // C8-OPS-1 fix (2026-11-16): the current Pages runtime passes route
  // params as `context.params`; `context.requestParams` is undefined and
  // threw on every probe (reproduced via wrangler pages dev --local).
  // C8-OPS-2 (2026-11-16): the wildcard segment arrives percent-encoded
  // ("PR7%202TH"); `validatePostcodeShape` decodes it before the shape test.
  params?: Record<string, string>;
}

export const onRequest = async (context: FunctionContext): Promise<Response> => {
  const postcode = validatePostcodeShape(context.params?.postcode ?? '');
  if (postcode === null) {
    // Defence in depth: the client pre-checks the same shape (A§4).
    return new Response(JSON.stringify({ error: 'bad-postcode' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const base = context.env.POSTCODES_IO_BASE;
  const clientId = context.env.POSTCODES_ACCESS_CLIENT_ID;
  const clientSecret = context.env.POSTCODES_ACCESS_CLIENT_SECRET;
  const req = buildUpstreamRequest(base, postcode, clientId, clientSecret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FUNCTION_BUDGET_MS);
  // The fetch *call* (synchronous URL validation) sits outside the transport
  // try: a misconfigured base throws here and yields workerd's default 500
  // (R-1); the *await* inside is what the catch covers.
  const upstreamPromise: Promise<Response> = fetch(req.url, {
    method: req.method,
    headers: req.headers,
    signal: controller.signal,
  });
  try {
    const upstream = await upstreamPromise;
    let parsed: { result?: unknown } | null = null;
    const text = await upstream.text();
    try {
      parsed = JSON.parse(text) as { result?: unknown };
    } catch {
      // Non-JSON body → treated as 502 by shapeUpstream (A§4).
    }
    const out = shapeUpstream(upstream.status, parsed);
    return new Response(out.body, { status: out.status, headers: JSON_HEADERS });
  } catch {
    // 5 s budget abort / upstream unreachable: the table maps these to 502 (A§4).
    const out = shapeUpstream(500, null);
    return new Response(out.body, { status: out.status, headers: JSON_HEADERS });
  } finally {
    clearTimeout(timer);
  }
};
