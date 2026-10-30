#!/usr/bin/env node
// ADR-0015: deterministic static prerender (shell-page model), zero new deps.
//
// Inputs (fixed list — nothing else): public/data/hospices.json,
// data-raw/site-config.json (SOURCE, never the TS mirror — ADR-0009), and the
// built dist/index.html. Emits 171 shell pages into dist/: the rewritten
// index.html, 6 info pages (fixed order), one hospice/<id>.html per id in
// hospices.json (code-unit ascending), sitemap.xml, robots.txt, 404.html.
//
// Every emitted page = per-page <head> (title/meta/canonical/OG/JSON-LD) +
// <div id="root"> + the boot script extracted verbatim from the built
// index.html. Visible content is rendered client-side by React once the
// hash-redirect guard (ADR-0016) resolves the route.
//
// Determinism (arch §3.2): no timestamps, no lastmod, no Date.now, no
// randomness, no environment-derived strings. LF line endings, exactly one
// trailing newline per file. Emitted bytes are a pure function of the inputs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function fail(msg) {
  process.stderr.write('[prerender] FATAL: ' + msg + '\n');
  process.exit(1);
}

// ---------- inputs (fail-fast) ----------
function readJson(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) fail('missing input: ' + rel);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail('cannot parse ' + rel + ': ' + e.message);
  }
}

const hospices = readJson('public/data/hospices.json');
const siteConfig = readJson('data-raw/site-config.json');

if (!Array.isArray(hospices) || hospices.length === 0) fail('hospices.json is not a non-empty array');
for (const h of hospices) {
  if (typeof h.id !== 'string' || typeof h.name !== 'string') fail('hospice entry missing id/name');
  if (!/^[A-Za-z0-9-]+$/.test(h.id)) fail('hospice id has characters outside [A-Za-z0-9-]: ' + h.id);
}
const SITE_URL = siteConfig.siteUrl;
if (typeof SITE_URL !== 'string' || SITE_URL.length === 0 || !/^https:\/\//.test(SITE_URL)) {
  fail('site-config.json: siteUrl must be a non-empty https:// URL');
}

const distIndexPath = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(distIndexPath)) fail('dist/index.html missing — run `vite build` before prerender');
const distIndex = fs.readFileSync(distIndexPath, 'utf8');

// ---------- extract asset tags verbatim from the built index.html ----------
const stylesheetLinks = [...distIndex.matchAll(/<link rel="stylesheet"[^>]*\/?>/g)].map((m) => m[0]);
const modulePreloadLinks = [...distIndex.matchAll(/<link rel="modulepreload"[^>]*\/?>/g)].map((m) => m[0]);
const bootTag = distIndex.match(/<script\b[^>]*\btype="module"[^>]*\bsrc=[^>]*\/?>/);
if (!stylesheetLinks.length) fail('no <link rel="stylesheet"> found in built index.html');
if (!bootTag) fail('no module <script src> found in built index.html');
const bootScript = bootTag[0] + '</script>';

// ---------- escaping ----------
// &<>"' for title/meta/og/twitter attribute values (arch §3.3).
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// &<>"' for <loc> values (arch §3.6; defensive — current ids need none).
function xesc(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------- JSON-LD (arch §3.4) ----------
// Key order fixed by hand (insertion order is deterministic).
function orgNode() {
  return {
    '@type': 'Organization',
    '@id': SITE_URL + '/#operator',
    name: siteConfig.operatorName,
    url: SITE_URL + '/',
    email: siteConfig.contactEmail,
    description:
      'Independent, third-party mapping of hospice catchment areas in the UK, built from open data.',
  };
}

function healthcareNode(h, descUnescaped) {
  const node = {
    '@type': 'HealthCareBusiness',
    name: h.name,
    url: SITE_URL + '/hospice/' + h.id + '.html',
    description: descUnescaped,
  };
  if (h.postcode) node.address = { '@type': 'PostalAddress', postalCode: h.postcode };
  if (h.lat != null && h.lon != null)
    node.geo = { '@type': 'GeoCoordinates', latitude: h.lat, longitude: h.lon };
  return node;
}

// Exactly one JSON.stringify (0-space) per page.
function jsonld(h) {
  const graph = [orgNode()];
  if (h) graph.push(healthcareNode(h, hospiceDesc(h.name)));
  return JSON.stringify({ '@graph': graph });
}

// ---------- title / description (arch §3.3 exacts) ----------
const HOME_TITLE = 'Hospice Finder UK';
const HOME_DESC =
  "Find the hospice that covers your postcode. A live UK map of every hospice's catchment areas, approximated from GP practice locations.";

const NOT_FOUND_TITLE = 'Page not found - Hospice Finder UK';
const NOT_FOUND_DESC =
  'This page does not exist. Find the hospice that covers your postcode on Hospice Finder UK.';

// Fixed literal array (alphabetical) — arch §3.2 rule 2.
const INFO_PAGES = [
  {
    file: 'about',
    title: 'About - Hospice Finder UK',
    desc:
      'How Hospice Finder UK builds catchment areas from open GP and hospice register data, and the known data gaps.',
  },
  {
    file: 'corrections',
    title: 'Corrections - Hospice Finder UK',
    desc: 'Spot an error? How to send us corrections for catchment areas, names, and postcodes.',
  },
  {
    file: 'feedback',
    title: 'Feedback - Hospice Finder UK',
    desc: 'Send feedback and suggestions to the Hospice Finder UK team.',
  },
  {
    file: 'privacy',
    title: 'Privacy - Hospice Finder UK',
    desc: 'What data Hospice Finder UK uses and how - a static site that sends no tracking and stores nothing.',
  },
  {
    file: 'licences',
    title: 'Licences - Hospice Finder UK',
    desc:
      'Data licences and attribution for the sources behind Hospice Finder UK, including the CQC register and OpenStreetMap (ODbL).',
  },
  {
    file: 'accessibility',
    title: 'Accessibility - Hospice Finder UK',
    desc: 'Accessibility statement for Hospice Finder UK: what is supported, and known limitations.',
  },
];

function hospiceDesc(name) {
  return 'Catchment area for ' + name + ' - the GP practices approximated as falling inside it, and how the boundary is derived.';
}

// ---------- page shell (arch §3.3 template) ----------
function buildPage({ title, desc, canon, ogType, hospice }) {
  const ld = jsonld(hospice);
  const out = [];
  out.push('<!doctype html>');
  out.push('<html lang="en">');
  out.push('<head>');
  out.push('  <meta charset="UTF-8" />');
  out.push('  <meta name="viewport" content="width=device-width, initial-scale=1" />');
  out.push('  <title>' + esc(title) + '</title>');
  out.push('  <meta name="description" content="' + esc(desc) + '" />');
  out.push('  <link rel="canonical" href="' + xesc(SITE_URL + canon) + '" />');
  out.push('  <link rel="icon" href="/logo.svg" type="image/svg+xml" />');
  out.push('  <link rel="manifest" href="/manifest.webmanifest" />');
  out.push('  <meta property="og:type" content="' + ogType + '" />');
  out.push('  <meta property="og:site_name" content="Hospice Finder UK" />');
  out.push('  <meta property="og:title" content="' + esc(title) + '" />');
  out.push('  <meta property="og:description" content="' + esc(desc) + '" />');
  out.push('  <meta property="og:url" content="' + xesc(SITE_URL + canon) + '" />');
  out.push('  <meta property="og:image" content="' + xesc(SITE_URL) + '/og-image.png" />');
  out.push('  <meta property="og:image:alt" content="Hospice Finder UK - heart map-pin mark" />');
  out.push('  <meta name="twitter:card" content="summary" />');
  out.push('  <meta name="twitter:title" content="' + esc(title) + '" />');
  out.push('  <meta name="twitter:description" content="' + esc(desc) + '" />');
  out.push('  <script type="application/ld+json">' + ld + '</script>');
  for (const t of modulePreloadLinks) out.push('  ' + t);
  for (const t of stylesheetLinks) out.push('  ' + t);
  out.push('</head>');
  out.push('<body>');
  out.push('  <div id="root"></div>');
  out.push('  ' + bootScript);
  out.push('</body>');
  out.push('</html>');
  return out.join('\n') + '\n';
}

// ---------- write helper: LF only, exactly one trailing newline ----------
function write(rel, content) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\n+$/, '') + '\n';
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, normalized, 'utf8');
}

// ---------- idempotence: remove previously emitted per-page files ----------
const emitted = ['dist/sitemap.xml', 'dist/robots.txt', 'dist/404.html'];
for (const p of INFO_PAGES) emitted.push('dist/' + p.file + '.html');
for (const rel of emitted) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) fs.rmSync(abs);
}
const hospiceDir = path.join(root, 'dist', 'hospice');
if (fs.existsSync(hospiceDir)) fs.rmSync(hospiceDir, { recursive: true });

// ---------- emit: index.html (map shell) ----------
write('dist/index.html', buildPage({ title: HOME_TITLE, desc: HOME_DESC, canon: '/', ogType: 'website', hospice: null }));

// ---------- emit: 6 info pages (fixed order) ----------
for (const p of INFO_PAGES) {
  write('dist/' + p.file + '.html', buildPage({ title: p.title, desc: p.desc, canon: '/' + p.file + '.html', ogType: 'website', hospice: null }));
}

// ---------- emit: one hospice page per id (code-unit ascending) ----------
const sorted = [...hospices].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
for (const h of sorted) {
  const title = h.name + ' - Hospice Finder UK';
  write('dist/hospice/' + h.id + '.html', buildPage({ title, desc: hospiceDesc(h.name), canon: '/hospice/' + h.id + '.html', ogType: 'article', hospice: h }));
}

// ---------- emit: 404.html (shell; Organization node only) ----------
write('dist/404.html', buildPage({ title: NOT_FOUND_TITLE, desc: NOT_FOUND_DESC, canon: '/404.html', ogType: 'website', hospice: null }));

// ---------- emit: sitemap.xml (arch §3.6; no lastmod) ----------
{
  const locs = [SITE_URL + '/'];
  for (const p of INFO_PAGES) locs.push(SITE_URL + '/' + p.file + '.html');
  for (const h of sorted) locs.push(SITE_URL + '/hospice/' + h.id + '.html');
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const loc of locs) lines.push('  <url><loc>' + xesc(loc) + '</loc></url>');
  lines.push('</urlset>');
  write('dist/sitemap.xml', lines.join('\n'));
}

// ---------- emit: robots.txt (arch §3.6 verbatim) ----------
write(
  'dist/robots.txt',
  'User-agent: *\nAllow: /\n\nSitemap: ' + SITE_URL + '/sitemap.xml\n'
);

// ---------- in-code AC2 invariant (arch §3.1) ----------
const sitemapLocCount = (fs.readFileSync(path.join(root, 'dist/sitemap.xml'), 'utf8').match(/<loc>/g) || []).length;
if (sitemapLocCount !== hospices.length + 7) {
  fail('sitemap <loc> count ' + sitemapLocCount + ' != hospices.json length + 7 (' + (hospices.length + 7) + ')');
}

process.stdout.write('[prerender] emitted 171 files (' + sorted.length + ' hospice pages)\n');
