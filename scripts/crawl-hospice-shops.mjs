// Cycle 10 — shop discovery + crawl pipeline (W10/C: discovery in this file;
// W11/C: per-site crawl + entry append; W12 adds the confirm pass).
// Discovery pool is DERIVED from data-raw/hospices-all.json (never hard-coded):
//   rows with no website + rows whose website is a cqc.org.uk profile URL = 190.
// W11 append: new entries are appended as blank-line-separated blocks before
// the closing `]` of data-raw/shops-website.json. The separating comma is
// placed on its own line AFTER the last existing entry's trailing newline so
// the 138-entry baseline stays byte-preserved (tests/shop-byte-preserve.test.mjs
// asserts `liveRaw.startsWith(prefix)` where prefix ends at the last `}`)
// while the file stays parseable JSON.
// Compliance: ~1 req/s (1100 ms pace), one descriptive project UA, public
// pages only (max 3 pages/site in the crawl phase), robots.txt fail-safe.
// Review F-1: transient transport failures (429 / 5xx / 202 / timeout /
// network drop) leave the row UNWRITTEN — a transport failure never becomes
// a terminal row. The next invocation re-attempts un-written rows, and
// tests/crawl-log.test.mjs self-enforces final coverage.
// Log: data-raw/shop-crawl-log.json (ADR-0045). One row per in-scope
// hospice, rewritten after every site. `discovery-found` is the only
// non-terminal outcome and the resume marker for the crawl phase.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { normalisePostcode, normaliseShopKey } from './shop-normalise.mjs';

const UA = 'HospiceInfoproto/0.1 (hospice shop list research; contact: james)';
const PACE_MS = 1100;
const REQUEST_TIMEOUT_MS = 20000;
const LOG_PATH = 'data-raw/shop-crawl-log.json';
const HOSPICES_PATH = 'data-raw/hospices-all.json';
const SHOPS_PATH = 'data-raw/shops-website.json';
const GEO_PATH = 'data-raw/shops-geo.json';
const DDG_URL = 'https://html.duckduckgo.com/html/';
const MAX_PAGES_PER_SITE = 3;
// Shop-page locator (W11/C): matched against nav/header link text and hrefs,
// first match wins. Explicit PDF nav links count (the PDF is the listing).
const SHOP_LOCATOR = /\/shop|shop\w*|store|retail/i;
const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi;

export const OUTCOME_VOCABULARY = [
  'ok',
  'no-shop-page',
  'unreadable',
  'skipped-robots',
  'blocked',
  'not-found',
  'no-website',
  'discovery-found',
];

const WRAPPER_DOMAINS = [
  'hospiceuk.org',
  'palliativecarescotland.org.uk',
  'scotcharityregister.org.uk',
  'cqc.org.uk',
];

export function isWrapperDomain(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return WRAPPER_DOMAINS.some((w) => h === w || h.endsWith(`.${w}`));
}

const UK_MULTI_TLDS = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'nhs.uk',
  'net.uk',
  'sch.uk',
  'me.uk',
]);

export function secondLevelDomain(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^www\./, '');
  const parts = h.split('.').filter(Boolean);
  if (parts.length >= 3 && UK_MULTI_TLDS.has(parts.slice(-2).join('.'))) {
    return parts.slice(-3).join('.');
  }
  return parts.length >= 2 ? parts.slice(-2).join('.') : h;
}

const normText = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const squash = (s) => normText(s).replace(/ /g, '');
// Titles often write "Brighton &amp; Hove" where the registered name is
// "Brighton and Hove" — decode the entity to "and" before squashing.
const squashAmp = (s) => squash(String(s || '').replace(/&amp;/gi, ' and '));

export function registeredNameTokens(registeredName) {
  return normText(registeredName)
    .split(' ')
    .filter((t) => t.length >= 4 && t !== 'hospice');
}

export function sldPassesNameTest(registeredName, hostname) {
  const sld = secondLevelDomain(hostname);
  const tokens = registeredNameTokens(registeredName);
  return tokens.length > 0 && tokens.some((t) => sld.includes(t));
}

export function pageMatchesRegisteredName(html, registeredName) {
  const title = (String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const h1 = (String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const target = squash(registeredName);
  return target.length > 0 && (squashAmp(title).includes(target) || squashAmp(h1).includes(target));
}

export function parseDdgCandidates(html) {
  const out = [];
  for (const m of String(html || '').matchAll(/uddg=[^&]*/g)) {
    try {
      const u = new URL(decodeURIComponent(m[0].slice(5)));
      if (u.protocol === 'https:' || u.protocol === 'http:') {
        u.search = '';
        u.hash = '';
        out.push(u);
      }
    } catch {
      // non-URL fragment in a result anchor; skip
    }
  }
  return out;
}

export function isCqcProfileUrl(website) {
  return typeof website === 'string' && /^https?:\/\/([a-z0-9-]+\.)*cqc\.org\.uk\//i.test(website);
}

export function transportFailure(result) {
  // F-1: 429 / 5xx / 202 (challenge) / timeout / network drop => row stays
  // UNWRITTEN so the next invocation re-attempts. null = fetch threw.
  if (!result) return true;
  return result.status === 429 || result.status === 202 || result.status >= 500;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (r.status === 404) return { status: 404, text: '' };
    if (!r.ok) return { status: r.status, text: null };
    return { status: r.status, text: await r.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getPaced(url) {
  await sleep(PACE_MS);
  return fetchText(url);
}

function discoveryPool(all) {
  return all.filter((h) => !h.website || isCqcProfileUrl(h.website));
}

// W13/E: geo key for a shop entry — the D5 scheme, identical to
// scripts/geocode-shops.mjs L14 (`s.postcode ?? address.join(', ')
// .toUpperCase()`); `normalisePostcode` keeps the key on the canonical
// spelling the entry-shape test already enforces for every committed
// entry. Pure.
export function shopGeoKey(entry) {
  return entry.postcode
    ? normalisePostcode(entry.postcode)
    : entry.address.join(', ').toUpperCase();
}

// W13/E: pure filter for the no-network post-geocode sync — the keys a
// committed row still needs geocoded, deduped in first-occurrence order.
export function unresolvedKeys(keys, present) {
  const out = [];
  const seen = new Set();
  for (const k of keys) {
    if (!present.has(k) && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

// W12/F: the curated 18 — the distinct non-cqc.org.uk hosts among the
// `website` values in hospices-all.json. Derived, never hard-coded (D6).
export function confirmDomains() {
  const all = JSON.parse(fs.readFileSync(HOSPICES_PATH, 'utf8'));
  const hosts = new Set();
  for (const h of all) {
    if (!h.website) continue;
    try {
      const host = new URL(h.website).hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'cqc.org.uk' || host.endsWith('.cqc.org.uk')) continue;
      hosts.add(host);
    } catch {
      continue; // malformed website value in the data
    }
  }
  return [...hosts].sort();
}

function loadLog() {
  if (fs.existsSync(LOG_PATH)) return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  return {
    meta: {
      run: new Date().toISOString().slice(0, 10),
      script: 'scripts/crawl-hospice-shops.mjs',
      ua: UA,
      paceMs: PACE_MS,
      outcomeVocabulary: [...OUTCOME_VOCABULARY],
      source: 'data-raw/hospices-all.json',
    },
    entries: [],
  };
}

function saveLog(log) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + '\n');
}

// W13/E (Component E): no-network post-geocode sync. Run only once every
// log row is terminal (one per hospices-all row, no `discovery-found`
// left): for each committed row, `unresolvedPostcodes` becomes the D5
// geo key(s) of its shop entries missing from shops-geo.json. Review F-2:
// no-match postcodes are logged, never blocking — their shops drop out of
// the build with a count (existing build behaviour).
function loadGeoStore() {
  if (!fs.existsSync(GEO_PATH)) return {};
  return JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
}

function fullRunComplete(log, all) {
  return (
    log.entries.length === all.length &&
    !log.entries.some((r) => r.outcome === 'discovery-found')
  );
}

function syncUnresolved(log) {
  const present = new Set(Object.keys(loadGeoStore()));
  const shops = JSON.parse(fs.readFileSync(SHOPS_PATH, 'utf8'));
  const byHospice = new Map();
  for (const s of shops) {
    const list = byHospice.get(s.hospiceId);
    if (list) list.push(s);
    else byHospice.set(s.hospiceId, [s]);
  }
  let changed = 0;
  for (const row of log.entries) {
    if (!row.committed) continue;
    const entries = byHospice.get(row.hospiceId) || [];
    const missing = unresolvedKeys(entries.map(shopGeoKey), present);
    if (JSON.stringify(row.unresolvedPostcodes) !== JSON.stringify(missing)) {
      row.unresolvedPostcodes = missing;
      changed += 1;
    }
  }
  return changed;
}

// W13/E: the §8 run order, documented on every network-phase invocation
// for the W14 operator (crawl → geocode → sync → build → tests → READMEs).
function printRunOrder() {
  console.log(
    'run order (architecture §8): 1) node scripts/crawl-hospice-shops.mjs (discovery -> crawl -> confirm) 2) node scripts/geocode-shops.mjs (new keys only) 3) re-invoke this script (no-network unresolvedPostcodes sync) 4) npm run build-data 5) npm test + npx tsc -b 6) README.md + data/README.md (entry count, coverage, crawl date)'
  );
}

// One discovery row: DDG query -> candidates -> name test -> decision.
// Returns { unwritten: true, reason } on transient transport failure (F-1).
async function discoverRow(h) {
  const query = `${h.name} ${h.town} hospice`;
  const res = await getPaced(`${DDG_URL}?q=${encodeURIComponent(query)}`);
  if (transportFailure(res)) {
    return { unwritten: true, reason: `ddg transport ${res ? res.status : 'drop/timeout'}` };
  }
  const candidates = parseDdgCandidates(res.text).filter(
    (u) => !isWrapperDomain(u.hostname) && !isCqcProfileUrl(`${u.protocol}//${u.hostname}/`)
  );
  const seen = new Set();
  const sldCandidates = candidates.filter((u) => {
    const sld = secondLevelDomain(u.hostname);
    if (seen.has(sld)) return false;
    seen.add(sld);
    return true;
  });

  const passed = [];
  for (const u of sldCandidates) {
    if (sldPassesNameTest(h.name, u.hostname)) passed.push(u);
  }
  // One extra paced fetch (per row) for the title/h1 full-name fallback:
  if (passed.length === 0 && sldCandidates.length > 0) {
    const probe = sldCandidates[0];
    const root = await getPaced(`${probe.protocol}//${probe.hostname}/`);
    if (!transportFailure(root) && root.text && pageMatchesRegisteredName(root.text, h.name)) {
      passed.push(probe);
    }
  }

  const base = {
    pagesVisited: passed.length === 0 ? 1 : 2,
    shopsExtracted: 0,
    deduped: 0,
    committed: false,
    unresolvedPostcodes: [],
  };
  if (passed.length === 1) {
    const site = secondLevelDomain(passed[0].hostname);
    return {
      row: {
        hospiceId: h.id,
        nation: h.nation,
        site,
        phase: 'discovery',
        outcome: 'discovery-found',
        ...base,
        note: '',
        discoverySource: 'ddg',
        website: `${passed[0].protocol}//${passed[0].hostname}/`,
      },
    };
  }
  const note =
    passed.length > 1
      ? `ambiguous: ${passed.length} distinct candidates match the registered name`
      : sldCandidates.length === 0
        ? `DDG ${res.status}: no usable candidates`
        : 'no candidate matched the registered name';
  return {
    row: {
      hospiceId: h.id,
      nation: h.nation,
      site: '',
      phase: 'discovery',
      outcome: 'no-website',
      ...base,
      note,
      discoverySource: 'ddg',
      website: null,
    },
  };
}

function findRow(log, hospiceId) {
  return log.entries.find((r) => r.hospiceId === hospiceId);
}

// -------------------------------------------------- W11/C: per-site crawl

// Fail-safe minimal robots.txt parser: `User-agent: *` scope only,
// `Disallow:` lines, literal prefix match. Missing robots = allow.
// Unknown/malformed syntax => 'skipped' (fail-safe, NOT fail-open).
export function parseRobots(text) {
  const lines = String(text || '').split(/\r?\n/);
  let starDisallows = [];
  let starAllows = [];
  let sawUserAgent = false;
  let inStarGroup = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(user-agent|allow|disallow)\s*:\s*(.*?)\s*$/i);
    if (!m) return { status: 'skipped', reason: `unknown robots syntax: ${line.slice(0, 60)}` };
    const field = m[1].toLowerCase();
    const value = m[2];
    if (field === 'user-agent') {
      sawUserAgent = true;
      inStarGroup = value.toLowerCase() === '*';
    } else if (!sawUserAgent) {
      return { status: 'skipped', reason: 'allow/disallow before any user-agent (malformed)' };
    } else if (inStarGroup) {
      if (field === 'disallow' && value) starDisallows.push(value);
      if (field === 'allow' && value) starAllows.push(value);
    }
  }
  if (!sawUserAgent) return { status: 'skipped', reason: 'no user-agent directive (malformed)' };
  return {
    status: 'ok',
    disallowed: (path) => {
      const hits = starDisallows.filter((p) => path.startsWith(p));
      if (hits.length === 0) return false;
      const longest = Math.max(...hits.map((p) => p.length));
      return !starAllows.some((p) => p.length >= longest && path.startsWith(p));
    },
  };
}

// Fetch a binary resource (robots.txt, PDFs). Same F-1 contract as fetchText.
async function fetchBinary(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (r.status === 404) return { status: 404, buffer: null };
    if (!r.ok) return { status: r.status, buffer: null };
    return { status: r.status, buffer: Buffer.from(await r.arrayBuffer()) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Robots gate per target site. Returns { unwritten } on transient transport
// failure (F-1), { skipped } on fail-safe skip, { ok, disallowed } otherwise.
async function checkRobots(base) {
  const host = new URL(base).host;
  const res = await getPaced(`https://${host}/robots.txt`);
  if (transportFailure(res)) {
    return { unwritten: true, reason: `robots transport ${res ? res.status : 'drop/timeout'}` };
  }
  if (res.status === 404) return { ok: true, disallowed: () => false }; // missing = allow
  const parsed = parseRobots(res.text);
  if (parsed.status === 'skipped') return { skipped: true, reason: parsed.reason };
  return { ok: true, disallowed: parsed.disallowed };
}

let browserPromise = null;
let headlessUnavailable = false;
let headlessNoticePrinted = false;

async function getBrowser() {
  if (!browserPromise) {
    const { chromium } = await import('playwright');
    browserPromise = chromium.launch();
  }
  return browserPromise;
}

// Fresh context per call (fresh per site in practice); project UA; headline
// wait (best-effort h1) + settle. Missing chromium binary => one-time human
// command printed, then `unavailable` with no retry (W11 contract).
async function headlessRender(url) {
  if (headlessUnavailable) return { unavailable: true };
  await sleep(PACE_MS);
  let browser;
  try {
    browser = await getBrowser();
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/executable|browserType\.launch|no such file|ENOENT|Cannot find module/i.test(msg)) {
      headlessUnavailable = true;
      browserPromise = Promise.reject(e); // never retry the launch in this run
      if (!headlessNoticePrinted) {
        headlessNoticePrinted = true;
        console.log('chromium binary not found — install with: npx playwright install chromium');
      }
      return { unavailable: true };
    }
    return { failed: true, reason: `headless launch: ${msg.slice(0, 120)}` };
  }
  const context = await browser.newContext({ userAgent: UA });
  try {
    const page = await context.newPage();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: REQUEST_TIMEOUT_MS });
    try {
      await page.waitForSelector('h1', { timeout: 3000 }); // headline wait
    } catch {
      // no h1 above the fold; continue after settle
    }
    await page.waitForTimeout(500); // settle
    const html = await page.content();
    const status = resp ? resp.status() : null;
    if (status === 404) return { status: 404, html: null };
    if (status && (status === 429 || status === 202 || status >= 500)) {
      return { failed: true, reason: `headless transport ${status}` };
    }
    return { status: status || 200, html };
  } catch (e) {
    return { failed: true, reason: `headless: ${String(e && e.message || e).slice(0, 120)}` };
  } finally {
    await context.close().catch(() => {});
  }
}

function looksLikeJsShell(html) {
  const s = String(html || '');
  if (s.length >= 8192) return false;
  return (s.match(/<a[\s>]/gi) || []).length < 3;
}

// PDF -> text: pdfjs-dist text layer first, then a zlib.inflateSync fallback
// over FlateDecode streams; if neither yields text the throw is caught by the
// caller and the site is logged `unreadable`.
async function pdfToText(buffer) {
  try {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      text += tc.items.map((it) => it.str).join('\n') + '\n';
    }
    await doc.destroy();
    if (text.replace(/\s/g, '').length === 0) throw new Error('pdfjs: empty text layer');
    return text;
  } catch {
    const s = buffer.toString('latin1');
    const parts = [];
    for (const m of s.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
      try {
        const out = inflateSync(Buffer.from(m[1].replace(/\n$/, ''), 'latin1'));
        if (out.length > 0) parts.push(out.toString('latin1'));
      } catch {
        // not a FlateDecode stream; skip
      }
    }
    const readable = parts.join('\n').replace(/[^\x20-\x7E\n]/g, ' ');
    if (readable.replace(/\s/g, '').length === 0) throw new Error('pdf: no decodable streams');
    return readable;
  }
}

// Shop-page locator (W11/C): prefer <nav>/<header> anchors, fall back to all
// anchors in the first ~30 KB; match link text and hrefs; first match wins.
export function findShopLink(html, baseUrl) {
  const s = String(html || '');
  const nav = s.match(/<nav[\s\S]*?<\/nav>/i) || s.match(/<header[\s\S]*?<\/header>/i);
  const pool = nav ? nav[0] : s.slice(0, 30000);
  for (const m of pool.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    if (/^(#|mailto:|javascript:)/i.test(href)) continue;
    const text = m[2].replace(/<[^>]*>/g, ' ');
    if (SHOP_LOCATOR.test(href) || SHOP_LOCATOR.test(text)) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}

// Listing extraction: candidate blocks = <li> / <tr>; accepted only when the
// block yields name + address (comma-split) + UK postcode. `address` is the
// remaining comma parts; `source` is the page URL the entry was read from.
export function extractShopEntries(html, sourceUrl) {
  const out = [];
  const blocks = String(html || '').match(/<li\b[\s\S]*?<\/li>|<tr\b[\s\S]*?<\/tr>/gi) || [];
  for (const block of blocks) {
    const text = block
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    const pcMatch = text.match(UK_POSTCODE);
    if (!pcMatch) continue;
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) continue; // need name + address + postcode
    out.push({
      name: parts[0],
      address: parts.slice(1),
      postcode: normalisePostcode(pcMatch[0]),
      source: sourceUrl,
    });
  }
  return out;
}

function loadShops() {
  const raw = fs.readFileSync(SHOPS_PATH, 'utf8');
  const entries = JSON.parse(raw);
  return { raw, keys: entries.map((e) => normaliseShopKey(e.name, e.address)) };
}

// Append-only rewrite (W5/G3): the byte-preserved prefix ends at the last
// existing entry's `}\n`; the array comma goes on its own line after it, then
// the new blocks (blank-line separated), then the closing `]`.
export function appendShopEntries(raw, entries) {
  const idx = raw.lastIndexOf(']');
  if (idx < 0) throw new Error('shops file malformed: no closing ]');
  const prefix = raw.slice(0, idx);
  const blocks = entries.map((e) => JSON.stringify(e)).join('\n\n');
  return prefix + ',\n\n' + blocks + '\n]\n';
}

// One crawl row for a discovery-found hospice. Returns { unwritten } only on
// transient transport failures (F-1); every other result is a terminal data
// outcome and the row is written by the caller.
async function crawlRow(h, website, discoverySource, { runKeys }) {
  const row = {
    hospiceId: h.id,
    nation: h.nation,
    site: secondLevelDomain(new URL(website).hostname),
    phase: 'crawl',
    pagesVisited: 0,
    shopsExtracted: 0,
    deduped: 0,
    committed: false,
    unresolvedPostcodes: [],
    note: '',
    discoverySource,
    website,
  };
  const finish = (outcome, note = '', extra = {}) => ({ row: { ...row, outcome, note, ...extra } });

  const robots = await checkRobots(website);
  if (robots.unwritten) return { unwritten: true, reason: robots.reason };
  if (robots.skipped) {
    return finish('skipped-robots', `robots.txt fail-safe: ${robots.reason}`);
  }
  const pathOf = (u) => new URL(u).pathname;
  if (robots.disallowed(pathOf(website))) {
    return finish('skipped-robots', `robots.txt Disallows ${pathOf(website)}`);
  }

  // 1) root page: plain fetch first. 403 / 429 / 5xx / timeout / drop / JS
  // shell escalate to headless; a plain 404 is a dead root. F-1: transient
  // plain failure + unavailable/transient headless => unwritten (no terminal
  // row from a transport hiccup); blocked only after both modes fail.
  const root = await getPaced(website);
  row.pagesVisited = 1;
  let rootHtml = null;
  if (root && !transportFailure(root) && root.status !== 404 && root.text !== null && !looksLikeJsShell(root.text)) {
    rootHtml = root.text;
  }
  if (rootHtml === null) {
    if (root && root.status === 404) return finish('not-found', 'root 404 (plain)');
    const headless = await headlessRender(website);
    if (headless.unavailable) {
      if (transportFailure(root)) {
        return { unwritten: true, reason: `plain transport ${root ? root.status : 'drop/timeout'}; headless unavailable` };
      }
      return finish('blocked', 'plain fetch failed; headless unavailable');
    }
    if (headless.status === 404) return finish('not-found', 'root 404 (headless); plain failed');
    if (headless.failed) {
      const transient = transportFailure(root) && /timeout|abort|network|ERR_/i.test(headless.reason);
      if (transient) return { unwritten: true, reason: `plain transport ${root ? root.status : 'drop/timeout'}; ${headless.reason}` };
      return finish('blocked', `plain ${transportFailure(root) ? `transport ${root ? root.status : 'drop/timeout'}` : 'fetch failed'}; ${headless.reason}`);
    }
    rootHtml = headless.html;
  }

  // 2) shop-page locator on the root page.
  const shopUrl = findShopLink(rootHtml, website);
  if (!shopUrl) return finish('no-shop-page', 'no shop/store/retail link on root page');
  if (robots.disallowed(pathOf(shopUrl))) {
    return finish('skipped-robots', `robots.txt Disallows ${pathOf(shopUrl)}`);
  }

  // 3) listing pages (shop link + sibling sub-links), bounded to 3 pages/site.
  const visited = new Set([shopUrl]);
  let candidates = [];
  let unreadable = null;
  let transient = false;
  while (visited.size > 0 && row.pagesVisited < MAX_PAGES_PER_SITE) {
    const url = [...visited][0];
    visited.delete(url);
    row.pagesVisited += 1;
    const isPdf = /\.pdf(\?|$)/i.test(url);
    let text = null;
    if (isPdf) {
      await sleep(PACE_MS);
      const bin = await fetchBinary(url);
      if (bin === null || transportFailure(bin) || !bin.buffer) {
        if (bin === null || transportFailure(bin)) transient = true;
        unreadable = unreadable || `PDF transport ${bin ? bin.status : 'drop/timeout'}`;
        continue;
      }
      try {
        text = await pdfToText(bin.buffer);
      } catch (e) {
        unreadable = unreadable || String(e.message);
        continue;
      }
    } else {
      const res = await getPaced(url);
      const plainTransient = transportFailure(res);
      if (!plainTransient && res.text !== null && res.status !== 404 && !looksLikeJsShell(res.text)) {
        text = res.text;
      } else {
        const headless = await headlessRender(url);
        if (headless.unavailable) {
          if (plainTransient) transient = true;
          unreadable = unreadable || 'headless unavailable';
          continue;
        }
        if (headless.html !== null) {
          text = headless.html;
        } else if (headless.status === 404) {
          unreadable = unreadable || 'listing 404 (headless)';
        } else if (headless.failed) {
          if (/transport|timeout|abort|network|ERR_/i.test(headless.reason)) transient = true;
          unreadable = unreadable || `listing fetch failed: ${headless.reason}`;
        }
      }
    }
    if (text === null) {
      unreadable = unreadable || `listing page unreadable (${isPdf ? 'PDF' : 'html'} ${url.split('/').slice(-2).join('/')})`;
      continue;
    }
    candidates = candidates.concat(extractShopEntries(text, url));
    for (const sib of findShopLinksOnPage(text, url, [...visited, url])) {
      if (visited.size + row.pagesVisited < MAX_PAGES_PER_SITE) visited.add(sib);
    }
  }
  if (candidates.length === 0 && unreadable) {
    if (transient) return { unwritten: true, reason: `listing transient: ${unreadable}` };
    return finish('unreadable', unreadable);
  }

  // 4) dedupe vs the existing entries AND this run's appended entries. A hit
  // skips the entry; only hits count into `deduped`.
  const fresh = [];
  for (const c of candidates) {
    const key = normaliseShopKey(c.name, c.address);
    if (runKeys.has(key)) {
      row.deduped += 1;
      continue;
    }
    runKeys.add(key);
    fresh.push({ hospiceId: h.id, name: c.name, address: c.address, postcode: c.postcode, source: c.source });
  }
  row.shopsExtracted = fresh.length;
  if (fresh.length > 0) {
    row.committed = true;
    return finish('ok', '', { append: fresh });
  }
  if (unreadable) return finish('ok', `partial: ${unreadable}`);
  return finish('ok');
}

// W12/F: one confirm row for a curated-18 hospice. Read-only toward
// data-raw/shops-website.json: existence check only, never re-extract
// (D10). Robots gate, one root fetch, one attempt at the shop path the 138
// 'source' URLs live under (same locator as the crawl phase). Outcomes:
// ok / blocked / not-found (plus the shared robots fail-safe and F-1
// unwritten on transient transport).
async function confirmRow(h) {
  const row = {
    hospiceId: h.id,
    nation: h.nation,
    site: secondLevelDomain(new URL(h.website).hostname),
    phase: 'confirm',
    pagesVisited: 0,
    shopsExtracted: 0,
    deduped: 0,
    committed: false,
    unresolvedPostcodes: [],
    note: '',
    discoverySource: null,
  };
  const finish = (outcome, note = '') => ({ row: { ...row, outcome, note } });
  const pathOf = (u) => new URL(u).pathname;

  const robots = await checkRobots(h.website);
  if (robots.unwritten) return { unwritten: true, reason: robots.reason };
  if (robots.skipped) return finish('skipped-robots', `robots.txt fail-safe: ${robots.reason}`);
  if (robots.disallowed(pathOf(h.website))) {
    return finish('skipped-robots', `robots.txt Disallows ${pathOf(h.website)}`);
  }

  const root = await getPaced(h.website);
  row.pagesVisited = 1;
  let rootHtml = null;
  if (root && !transportFailure(root) && root.status !== 404 && root.text !== null && !looksLikeJsShell(root.text)) {
    rootHtml = root.text;
  } else if (root && root.status === 404) {
    return finish('not-found', 'root 404 (plain)');
  } else {
    const headless = await headlessRender(h.website);
    if (headless.unavailable) {
      if (transportFailure(root)) {
        return { unwritten: true, reason: `plain transport ${root ? root.status : 'drop/timeout'}; headless unavailable` };
      }
      return finish('blocked', 'plain fetch failed; headless unavailable');
    }
    if (headless.status === 404) return finish('not-found', 'root 404 (headless); plain failed');
    if (headless.failed) {
      if (transportFailure(root) && /timeout|abort|network|ERR_/i.test(headless.reason)) {
        return { unwritten: true, reason: `plain transport ${root ? root.status : 'drop/timeout'}; ${headless.reason}` };
      }
      return finish('blocked', `plain ${transportFailure(root) ? `transport ${root ? root.status : 'drop/timeout'}` : 'fetch failed'}; ${headless.reason}`);
    }
    rootHtml = headless.html;
  }

  const shopUrl = findShopLink(rootHtml, h.website);
  if (!shopUrl) return finish('not-found', 'shop path not reachable on root page (no shop/store/retail link)');
  if (robots.disallowed(pathOf(shopUrl))) {
    return finish('skipped-robots', `robots.txt Disallows ${pathOf(shopUrl)}`);
  }

  // Single existence check on the shop path: a readable 200 is enough.
  row.pagesVisited = 2;
  const probe = await getPaced(shopUrl);
  if (probe && probe.status !== 404 && !transportFailure(probe) && probe.text !== null) {
    return finish('ok', `shop path present: ${pathOf(shopUrl)}`);
  }
  if (probe && probe.status === 404) return finish('not-found', `shop path 404: ${pathOf(shopUrl)}`);
  const headless = await headlessRender(shopUrl);
  if (headless.unavailable) {
    if (transportFailure(probe)) {
      return { unwritten: true, reason: `plain transport ${probe ? probe.status : 'drop/timeout'}; headless unavailable` };
    }
    return finish('blocked', 'plain fetch failed; headless unavailable');
  }
  if (headless.status === 404) return finish('not-found', `shop path 404 (headless): ${pathOf(shopUrl)}`);
  if (headless.failed) {
    if (transportFailure(probe) && /timeout|abort|network|ERR_/i.test(headless.reason)) {
      return { unwritten: true, reason: `plain transport ${probe ? probe.status : 'drop/timeout'}; ${headless.reason}` };
    }
    return finish('blocked', `shop path unreachable: ${headless.reason}`);
  }
  return finish('ok', `shop path present: ${pathOf(shopUrl)}`);
}

function findShopLinksOnPage(html, pageUrl, alreadyVisited) {
  const out = [];
  const s = String(html || '');
  const seen = new Set(alreadyVisited);
  for (const m of s.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    if (/^(#|mailto:|javascript:)/i.test(href)) continue;
    const text = m[2].replace(/<[^>]*>/g, ' ');
    if (!SHOP_LOCATOR.test(href) && !SHOP_LOCATOR.test(text)) continue;
    try {
      const u = new URL(href, pageUrl).toString();
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    } catch {
      continue;
    }
  }
  return out;
}

async function runDiscovery(all, log) {
  const pool = discoveryPool(all);
  const noWeb = pool.filter((h) => !h.website).length;
  console.log(
    `discovery pool: ${pool.length} rows (${noWeb} no-website + ${pool.length - noWeb} cqc-profile-only)`
  );
  const pending = pool.filter((h) => !findRow(log, h.id));
  console.log(`logged: ${log.entries.length} | pending: ${pending.length}`);
  if (pending.length === 0) return log;

  // Umbrella/parent detection: a site claimed by 2+ hospices (already
  // logged or this run) is a shared site — rows for it become no-website
  // flagged for human audit instead of discovery-found.
  const siteClaimants = new Map();
  for (const r of log.entries) {
    if (r.outcome === 'discovery-found' && r.site) {
      siteClaimants.set(r.site, [...(siteClaimants.get(r.site) || []), r.hospiceId]);
    }
  }

  for (const h of pending) {
    const out = await discoverRow(h);
    if (out.unwritten) {
      console.log(`  ${h.id} UNWRITTEN (re-try next run): ${out.reason}`);
      continue;
    }
    if (out.row.outcome === 'discovery-found') {
      const claimants = siteClaimants.get(out.row.site) || [];
      if (claimants.length >= 1) {
        out.row.outcome = 'no-website';
        out.row.note = `shared site ${out.row.site} already claimed by ${claimants.join(',')} — parent/umbrella, flagged for human audit`;
        out.row.website = null;
      }
    }
    log.entries.push(out.row);
    saveLog(log);
    if (out.row.outcome === 'discovery-found') {
      siteClaimants.set(out.row.site, [...(siteClaimants.get(out.row.site) || []), out.row.hospiceId]);
    }
    console.log(`  ${h.id} -> ${out.row.outcome}${out.row.note ? ` (${out.row.note})` : ''}`);
  }
  return log;
}

// Crawl phase (W11/C): one crawl row per committed `discovery-found` row,
// in log order. Unwritten (transient) rows are left for the next invocation;
// every other outcome rewrites the row in the log after the site. Appended
// entries update the shops file immediately (log + file are the state).
async function runCrawl(log) {
  const { raw: rawShops, keys } = loadShops();
  const runKeys = new Set(keys); // the 138 baseline + this run's appended
  let shopsRaw = rawShops;
  const pending = log.entries.filter((r) => r.outcome === 'discovery-found');
  console.log(`crawl phase: ${pending.length} discovery-found sites to crawl`);
  for (const row of pending) {
    const out = await crawlRow(
      { id: row.hospiceId, nation: row.nation },
      row.website,
      row.discoverySource,
      { runKeys }
    );
    if (out.unwritten) {
      console.log(`  ${row.hospiceId} UNWRITTEN (re-try next run): ${out.reason}`);
      continue;
    }
    const { append, ...clean } = out.row;
    if (append) {
      shopsRaw = appendShopEntries(shopsRaw, append);
      fs.writeFileSync(SHOPS_PATH, shopsRaw);
    }
    const idx = log.entries.findIndex((r) => r.hospiceId === row.hospiceId);
    log.entries[idx] = clean;
    saveLog(log);
    console.log(
      `  ${row.hospiceId} -> ${clean.outcome}${clean.note ? ` (${clean.note})` : ''}[+${clean.shopsExtracted}/${clean.deduped}d]`
    );
  }
}

// W12/F: confirm pass over the curated 18 — one confirm row per hospice
// row with a non-cqc website, in data order. Resumable: already-logged
// rows are skipped, unwritten rows are re-attempted next invocation.
async function runConfirm(all, log) {
  const inScope = all.filter((h) => h.website && !isCqcProfileUrl(h.website));
  const pending = inScope.filter((h) => !findRow(log, h.id));
  console.log(`confirm phase: ${inScope.length} curated sites, ${pending.length} pending`);
  for (const h of pending) {
    const out = await confirmRow(h);
    if (out.unwritten) {
      console.log(`  ${h.id} UNWRITTEN (re-try next run): ${out.reason}`);
      continue;
    }
    log.entries.push(out.row);
    saveLog(log);
    console.log(`  ${h.id} -> ${out.row.outcome}${out.row.note ? ` (${out.row.note})` : ''}`);
  }
}

async function main() {
  const phase = process.argv[2] || 'discovery';
  const all = JSON.parse(fs.readFileSync(HOSPICES_PATH, 'utf8'));
  if (phase === 'pool') {
    const pool = discoveryPool(all);
    const noWeb = pool.filter((h) => !h.website).length;
    console.log(
      `discovery pool: ${pool.length} rows (${noWeb} no-website + ${pool.length - noWeb} cqc-profile-only)`
    );
    return;
  }
  printRunOrder();
  const log = loadLog();
  if (fullRunComplete(log, all)) {
    console.log(
      `crawl run complete: ${log.entries.length}/${all.length} rows terminal — no-network post-geocode sync`
    );
    const changed = syncUnresolved(log);
    if (changed > 0) saveLog(log);
    console.log(
      `sync: ${changed} committed row(s) set with unresolvedPostcodes (vs ${GEO_PATH})`
    );
    return;
  }
  if (phase === 'discovery') {
    await runDiscovery(all, log);
    return;
  }
  if (phase === 'crawl') {
    await runCrawl(log);
    return;
  }
  if (phase === 'confirm') {
    await runConfirm(all, log);
    return;
  }
  console.error(`unknown phase: ${phase} (pool / discovery / crawl / confirm)`);
  process.exit(1);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}