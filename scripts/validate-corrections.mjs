// Validates public/data/corrections.json against the public schema:
// an array of {date, summary, dataChanged} entries, newest first.
// Extra optional fields (kind, point id, hospice id) are allowed.
// Exit 0 when valid; exit 1 with a readable message on any violation.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const file = path.join(root, 'public', 'data', 'corrections.json');

let raw;
try {
  raw = readFileSync(file, 'utf8');
} catch (err) {
  console.error(`FAIL: cannot read ${file}: ${err.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error(`FAIL: ${file} is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(data)) {
  console.error('FAIL: corrections.json must be a JSON array of correction entries.');
  process.exit(1);
}

const isIsoDate = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

const errors = [];
data.forEach((entry, i) => {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    errors.push(`entry ${i}: must be an object`);
    return;
  }
  if (!isIsoDate(entry.date)) {
    errors.push(`entry ${i}: "date" must be an ISO date (YYYY-MM-DD), got ${JSON.stringify(entry.date)}`);
  }
  if (typeof entry.summary !== 'string' || entry.summary.trim() === '') {
    errors.push(`entry ${i}: "summary" must be a non-empty string`);
  }
  if (typeof entry.dataChanged !== 'boolean') {
    errors.push(`entry ${i}: "dataChanged" must be a boolean, got ${JSON.stringify(entry.dataChanged)}`);
  }
});

for (let i = 1; i < data.length; i++) {
  const a = data[i - 1]?.date;
  const b = data[i]?.date;
  if (isIsoDate(a) && isIsoDate(b) && b > a) {
    errors.push(`ordering: entry ${i} (${b}) is newer than entry ${i - 1} (${a}); entries must be newest first`);
  }
}

if (errors.length > 0) {
  console.error(`FAIL: ${data.length} entries checked, ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK: ${data.length} correction entr${data.length === 1 ? 'y' : 'ies'} valid (schema: date, summary, dataChanged; newest first).`,
);
