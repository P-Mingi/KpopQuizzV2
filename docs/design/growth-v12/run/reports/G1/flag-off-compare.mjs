#!/usr/bin/env node
// G1 flag-off proof, compare step: two folders written by flag-off-capture.mjs
// (base, candidate). Prints, per page, every line that is in one and not in the
// other, after dropping what differs between any two renders for a reason nobody
// sees (COMMON.md rule 12):
//   - the per-request script nonce id  <script id="_R_">self.__next_r="..."</script>
//   - sitemap <lastmod> timestamps (generated at request time)
//   - the dev-only error digest and stack of an error page
// Lines are compared as multisets, so the ORDER of equal items (a sitemap or a
// list sorted on a live counter) is not a difference.
//
//   node flag-off-compare.mjs <baseDir> <candDir> [--json <file>]

import fs from 'node:fs';
import path from 'node:path';

const [A, B] = process.argv.slice(2);
const jsonAt = process.argv.indexOf('--json');
if (!A || !B) { console.error('usage: flag-off-compare.mjs <baseDir> <candDir> [--json <file>]'); process.exit(2); }

const NOISE = [/self\.__next_r=/, /<lastmod>/, /data-next-error-digest=/];
const lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => !NOISE.some((re) => re.test(l)));
function bag(arr) { const m = new Map(); for (const l of arr) m.set(l, (m.get(l) ?? 0) + 1); return m; }
function minus(a, b) { const out = []; for (const [l, n] of a) { const d = n - (b.get(l) ?? 0); for (let i = 0; i < d; i++) out.push(l); } return out; }

const report = [];
for (const name of fs.readdirSync(A).filter((f) => f.endsWith('.txt')).sort()) {
  if (!fs.existsSync(path.join(B, name))) { report.push({ page: name, missing: true }); continue; }
  const a = bag(lines(path.join(A, name)));
  const b = bag(lines(path.join(B, name)));
  report.push({ page: name.replace(/\.txt$/, ''), onlyBase: minus(a, b), onlyCand: minus(b, a) });
}

let changed = 0;
for (const r of report) {
  const n = (r.onlyBase?.length ?? 0) + (r.onlyCand?.length ?? 0);
  if (n > 0) changed += 1;
  console.log(`${n === 0 ? 'same   ' : 'DIFFERS'} ${r.page}${n ? ` (${r.onlyBase.length} base lines, ${r.onlyCand.length} candidate lines)` : ''}`);
  for (const l of r.onlyBase ?? []) console.log(`   - ${l.slice(0, 300)}`);
  for (const l of r.onlyCand ?? []) console.log(`   + ${l.slice(0, 300)}`);
}
console.log(`\n${report.length} pages, ${changed} with a difference`);
if (jsonAt >= 0) fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify(report, null, 1));
