// Work list item 4.6: curation convenience script for the corrections log.
//
// Usage:
//   node scripts/add-correction.mjs "What was corrected" [--data-changed] [--date YYYY-MM-DD]
//
// Appends ONE entry {date, summary, dataChanged} to public/data/corrections.json,
// keeping the array newest-first (new entries are unshifted). The operator
// identity is read from data-raw/site-config.json and included in the output
// line so the published entry carries the operator context. The entry is
// validated in memory before writing, and scripts/validate-corrections.mjs is
// run afterwards as the authoritative check; the file is written only when
// both pass. One valid entry per run.
//
// No argument, or an empty summary, exits 1 (a correctionless run would
// fabricate an entry — fail fast, no fake data).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const logFile = path.join(root, 'public', 'data', 'corrections.json');
const configPath = path.join(root, 'data-raw', 'site-config.json');
const validator = path.join(root, 'scripts', 'validate-corrections.mjs');

const args = process.argv.slice(2);
let summary = null;
let dataChanged = false;
let dateOverride = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--data-changed') {
    dataChanged = true;
  } else if (a === '--date') {
    dateOverride = args[++i];
  } else if (summary === null) {
    summary = a;
  } else {
    console.error(`FAIL: unexpected argument "${a}" (usage: add-correction.mjs "summary" [--data-changed] [--date YYYY-MM-DD]).`);
    process.exit(1);
  }
}

if (!summary || summary.trim() === '') {
  console.error('FAIL: a non-empty summary is required — this script adds exactly one correction entry per run.');
  process.exit(1);
}

const date = dateOverride ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
  console.error(`FAIL: --date must be an ISO date (YYYY-MM-DD), got "${date}".`);
  process.exit(1);
}

const entry = {
  date,
  summary: summary.trim(),
  dataChanged,
};

let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error(`FAIL: cannot read ${configPath}: ${err.message}`);
  process.exit(1);
}
if (typeof config.operatorName !== 'string' || config.operatorName === '') {
  console.error('FAIL: data-raw/site-config.json has no "operatorName".');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(readFileSync(logFile, 'utf8'));
} catch (err) {
  console.error(`FAIL: cannot read ${logFile}: ${err.message} (it must be a JSON array; the committed stub is []).`);
  process.exit(1);
}
if (!Array.isArray(data)) {
  console.error('FAIL: corrections.json must be a JSON array; refusing to append.');
  process.exit(1);
}

// Newest-first: unshift the new entry, then verify the ordering constraint.
const updated = [entry, ...data];
for (let i = 1; i < updated.length; i++) {
  if (typeof updated[i]?.date === 'string' && updated[i].date > updated[i - 1].date) {
    console.error(
      `FAIL: the new entry (${date}) is older than the first current entry (${updated[i - 1].date}); ` +
        'the log is newest-first, so the file would violate the ordering rule. Use --date to record a newer date.',
    );
    process.exit(1);
  }
}

writeFileSync(logFile, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');

try {
  execFileSync(process.execPath, [validator], { stdio: 'inherit' });
} catch {
  console.error('FAIL: the validated entry was written, but scripts/validate-corrections.mjs rejected the file — revert it and fix the input.');
  process.exit(1);
}

console.log(`${config.operatorName}: added correction dated ${date} (dataChanged: ${dataChanged}) — log now has ${updated.length} entr${updated.length === 1 ? 'y' : 'ies'}, newest first.`);
