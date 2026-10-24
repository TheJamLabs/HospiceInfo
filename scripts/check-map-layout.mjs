// Static regression check for the desktop map layout (regression contract:
// .agents/root-cause.md §5.2; bug: "map not rendering on desktop").
//
// The `.app` class is shared by the outer shell (src/components/AppShell.tsx:21,
// must be a column) and the inner map container (src/App.tsx:108, must stay a
// row and span the full width of main.app-body). This check parses
// src/styles.css with a brace-depth state machine and fails when that contract
// is broken anywhere in the file, including inside @media blocks.
// Dependency-free; no test runner required.
//
// Usage: node scripts/check-map-layout.mjs [path-to-css]
// Exits 0 and prints "check-map-layout: OK" on success; exits 1 on failure.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cssPath = process.argv[2] ? `${process.argv[2]}` : join(repoRoot, 'src', 'styles.css');

let css;
try {
  css = readFileSync(cssPath, 'utf8');
} catch (err) {
  console.error(`check-map-layout: cannot read ${cssPath}: ${err.message}`);
  process.exit(1);
}

// Strip /* ... */ comments, then walk the text with a brace-depth state
// machine (no substring/regex matching against the raw text): text before a
// '{' is that block's selector (or at-rule prelude), text before the matching
// '}' is its body. Inner rules inside @media wrappers are collected by the
// same walk, so a flex-direction declared at any depth is visible to C.
const rules = new Map(); // normalised selector -> Map(declaration name -> normalised value)

function recordRule(selector, body) {
  const declarations = rules.get(selector) ?? new Map();
  for (const chunk of body.split(';')) {
    const i = chunk.indexOf(':');
    if (i < 0) continue;
    const name = chunk.slice(0, i).trim().toLowerCase();
    const value = chunk.slice(i + 1).replace(/\s+/g, ' ').trim();
    if (name && value) declarations.set(name, value);
  }
  rules.set(selector, declarations);
}

const openSelectors = [];
let prelude = '';
for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
  if (ch === '{') {
    openSelectors.push(prelude.replace(/\s+/g, ' ').trim());
    prelude = '';
  } else if (ch === '}') {
    const selector = openSelectors.pop() ?? '';
    const body = prelude;
    prelude = '';
    if (selector && !selector.startsWith('@')) recordRule(selector, body);
  } else {
    prelude += ch;
  }
}

function declared(selector, name, expected) {
  const actual = rules.get(selector)?.get(name);
  if (actual !== expected) {
    const state = actual === undefined ? 'does not declare' : `declares ${name}: ${actual}`;
    console.error(`check-map-layout: FAIL: rule "${selector}" ${state}, expected "${name}: ${expected}".`);
    return false;
  }
  return true;
}

const okA = declared('.app', 'display', 'flex') && declared('.app', 'flex-direction', 'column');
const okB = declared('.app-body > .app', 'flex-direction', 'row') && declared('.app-body > .app', 'flex', '1 1 auto');

// Complete contract: the set of ALL flex-direction declarations in the file,
// keyed by normalised selector, is exactly the three expected pairs — this
// catches any future override or added declaration anywhere in the file.
const found = new Set();
for (const [selector, declarations] of rules) {
  const direction = declarations.get('flex-direction');
  if (direction) found.add(`${selector} => ${direction}`);
}
const expected = new Set(['.app => column', '.app-body > .app => row', '.legend-grid => column']);
let okC = found.size === expected.size;
for (const pair of found) {
  if (!expected.has(pair)) {
    console.error(`check-map-layout: FAIL: unexpected flex-direction for "${pair.replace(' => ', ': ')}".`);
    okC = false;
  }
}
for (const pair of expected) {
  if (!found.has(pair)) {
    console.error(`check-map-layout: FAIL: missing flex-direction for "${pair.replace(' => ', ': ')}".`);
    okC = false;
  }
}

if (!okA || !okB || !okC) process.exit(1);
console.log('check-map-layout: OK');
process.exit(0);
