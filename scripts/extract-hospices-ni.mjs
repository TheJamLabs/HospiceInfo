// scripts/extract-hospices-ni.mjs
// Northern Ireland hospices (work list item 8): filter the RQIA "All
// Registered Services" bulk export (XLSX, OGL) for service names containing
// "hospice".
//
// Input: data-raw/rqia-regulated-services-2026-06.xlsx — the bulk export
// pinned in the A3 ledger as the file a human should save. When the file is
// ABSENT (current state: RQIA host DNS-fails from this machine), the script
// logs the human fetch procedure, writes [] and exits 0 (execution rule 3;
// same zero-set tolerance as G3/Wales).
//
// DECISION B2 (recorded 2026-10-16, first run): until the RQIA bulk export
// is fetched, the NI hospice list stays an empty placeholder — the map shows
// 0 NI hospices; the build remains valid.
//
// First-run discovery for the XLSX (ADR-0003): the header row is logged;
// the service-name column is resolved BY NAME (tried: "Service Name",
// "Regulated Service Name", then any header containing "service name");
// the postcode column by "Postcode". If the name column cannot be found the
// script exits non-zero with the header printed (the export layout has not
// been eyeballed yet).
//
// Output: data-raw/hospices-ni.json — {id: 'ni-r<n>', name, postcode}
// (n = 1-based position in the filtered list; RQIA row anchors are
// UNVERIFIED, so the ADR-0002 row-index fallback is used by design).

import fs from 'node:fs';
// Default import: xlsx 0.18.5 attaches readFile dynamically on its CJS
// exports object, which ESM namespace/named imports do not surface.
import XLSX from 'xlsx';

const RAW = 'data-raw/rqia-regulated-services-2026-06.xlsx';

if (!fs.existsSync(RAW)) {
  console.log(`RQIA XLSX not present (${RAW}) — NI hospices = [] placeholder.`);
  console.log('Human fetch (full-DNS machine): see .agents/implementation.md section A3');
  console.log('  (save the "All Registered Services" export as data-raw/rqia-regulated-services-2026-06.xlsx,');
  console.log('   then re-run this script + merge + geocoder + build).');
  fs.writeFileSync('data-raw/hospices-ni.json', JSON.stringify([]));
  console.log('NI hospices: 0');
  process.exit(0);
}

const wb = XLSX.readFile(RAW);
const sheet = wb.Sheets[wb.SheetNames[0]];
const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
// The header is not row 0: the sheet opens with a title row ("Current
// Register - Open Data") and a blank row (verified 2026-10-27 against the
// June 2026 export). Scan the first rows for the one carrying "Service Name".
const hi = grid.findIndex((r) => (r || []).some((h) => String(h).trim().toLowerCase() === 'service name'));
if (hi < 0) {
  console.error(`RQIA header row not found — first rows: ${grid.slice(0, 3).map((r) => (r || []).join(' | ')).join(' /// ')}`);
  process.exit(1);
}
const header = (grid[hi] || []).map((h) => String(h).trim());
console.log(`RQIA sheet "${wb.SheetNames[0]}": data starts row ${hi + 1} | header: ${header.join(' | ')}`);

const ci = (s) => header.filter((h) => h.toLowerCase() === s.toLowerCase())[0];
const cName =
  ci('Service Name') ||
  ci('Regulated Service Name') ||
  header.find((h) => h.toLowerCase().includes('service name'));
if (typeof cName !== 'string') {
  console.error(`RQIA name column not found — header: ${header.join(' | ')}`);
  process.exit(1);
}
const iPc = header.findIndex((h) => h.toLowerCase() === 'postcode');
const iName = header.indexOf(cName);
console.log(`RQIA columns: name="${cName}" (${iName}) | postcode=${iPc >= 0 ? `${header[iPc]} (${iPc})` : 'absent'}`);
if (grid[hi + 1]) console.log(`RQIA sample row: ${[grid[hi + 1][iName], iPc >= 0 ? grid[hi + 1][iPc] : ''].join(' | ')}`);

const out = [];
for (const r of grid.slice(hi + 1)) {
  const name = String(r[iName] || '').trim();
  if (!name.toLowerCase().includes('hospice')) continue;
  out.push({
    id: `ni-r${out.length + 1}`,
    name,
    postcode: iPc >= 0 ? String(r[iPc] || '').trim().replace(/\s+/g, ' ').toUpperCase() : '',
  });
}
fs.writeFileSync('data-raw/hospices-ni.json', JSON.stringify(out));
console.log(`NI hospices: ${out.length}` + (out.length ? ` | first: ${out[0].name} ${out[0].postcode}` : ''));
