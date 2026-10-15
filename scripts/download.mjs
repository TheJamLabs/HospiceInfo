// Downloads a URL to a local file using Node's fetch.
// Usage: node scripts/download.mjs <url> <outPath>
import fs from 'node:fs';
import path from 'node:path';
const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/download.mjs <url> <outPath>');
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
const res = await fetch(url);
if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(out, buf);
console.log(`saved ${out} (${buf.length} bytes)`);
