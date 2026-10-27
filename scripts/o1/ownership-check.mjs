#!/usr/bin/env node
// Run O1: prove "one owner per file" in docs/o1/OWNERSHIP.json (RUN-O1-PROMPT rule 11).
//   node scripts/o1/ownership-check.mjs [--ownership <file>]
// Checks every tracked file of the worktree and one sample path per glob (so two lanes can never own the same new
// file either) against every lane except F0s (the never-merged routing spike). Same glob dialect as the guard.
// Exit 0 = no path has two owners; 1 = overlaps listed.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const i = process.argv.indexOf('--ownership');
const file = i > 0 ? process.argv[i + 1] : 'docs/o1/OWNERSHIP.json';
const own = JSON.parse(fs.readFileSync(file, 'utf8'));
const lanes = Object.keys(own).filter((k) => !k.startsWith('_') && k !== 'F0s');
function expandBraces(g) { const m = /\{([^{}]*)\}/.exec(g); if (!m) return [g]; return m[1].split(',').flatMap((a) => expandBraces(g.slice(0, m.index) + a + g.slice(m.index + m[0].length))); }
function toRe(glob) {
  let re = '';
  for (let k = 0; k < glob.length; k++) {
    const c = glob[k];
    if (c === '*') { if (glob[k + 1] === '*') { k++; if (glob[k + 1] === '/') { k++; re += '(?:.*/)?'; } else re += '.*'; } else re += '[^/]*'; }
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const implicit = (id) => [`docs/o1/reports/${id}.md`, `docs/o1/reports/${id}/**`, `docs/o1/requests/${id}.md`];
const rules = Object.fromEntries(lanes.map((id) => {
  const g = own[id];
  const pos = g.filter((x) => !x.startsWith('!')).concat(implicit(id)).flatMap(expandBraces).map(toRe);
  const neg = g.filter((x) => x.startsWith('!')).map((x) => x.slice(1)).flatMap(expandBraces).map(toRe);
  return [id, (p) => pos.some((r) => r.test(p)) && !neg.some((r) => r.test(p))];
}));
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean);
const samples = lanes.flatMap((id) => own[id].filter((x) => !x.startsWith('!')).flatMap(expandBraces)
  .map((g) => g.replace(/\*\*/g, 'o1x/o1y').replace(/\*/g, 'o1z').replace(/\?/g, 'q')));
let bad = 0;
for (const p of [...new Set([...tracked, ...samples])]) {
  const owners = lanes.filter((id) => rules[id](p));
  // Sequenced pairs (OWNERSHIP._sequenced): the second lane starts only after the first is merged.
  const seq = (own._sequenced || []).some(([a, b]) => owners.length === 2 && owners.includes(a) && owners.includes(b));
  if (owners.length > 1 && !seq) { bad++; if (bad <= 60) console.log(`${p}: ${owners.join(', ')}`); }
}
const ownedTracked = tracked.filter((p) => lanes.some((id) => rules[id](p))).length;
console.log(`ownership-check: ${lanes.length} lanes, ${tracked.length} tracked files (${ownedTracked} owned), ${samples.length} sample paths: ${bad} with two or more owners`);
process.exit(bad ? 1 : 0);
