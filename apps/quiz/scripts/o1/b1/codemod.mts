// Run O1, lane B1: the brand codemod. Replaces each hard-coded host or brand name of the files B1 owns by a
// registry read (rules: src/lib/site/b1/codemod-rules.ts; logic: codemod-core.ts). Re-runnable: a second run
// changes nothing, and a file that is on docs/o1/HOT.txt is skipped until its branch has merged, so the same
// command converts it afterwards.
//
//   ./node_modules/.bin/tsx apps/quiz/scripts/o1/b1/codemod.mts             dry run: what would change
//   ./node_modules/.bin/tsx apps/quiz/scripts/o1/b1/codemod.mts --write     apply the rules
//   ./node_modules/.bin/tsx apps/quiz/scripts/o1/b1/codemod.mts --check     exit 1 if a rule would still change a
//                                                                            file, a rule is stale, or an owned,
//                                                                            non-HOT file still holds a literal
//                                                                            that is not on the allowlist
// Run from anywhere inside the repo (a worktree included). Nothing here touches the network or git state.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { ALLOWLIST, NEVER_CHANGE, RULES } from '../../../src/lib/site/b1/codemod-rules.ts';
import { applyRule, countBrandLiterals, ownedBy, parseHot } from '../../../src/lib/site/b1/codemod-core.ts';

const write = process.argv.includes('--write');
const check = process.argv.includes('--check');

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

const ownership = JSON.parse(read('docs/o1/OWNERSHIP.json')) as Record<string, string[]>;
const globs = ownership.B1;
if (!globs) throw new Error('OWNERSHIP.json has no B1 entry');
const hot = parseHot(read('docs/o1/HOT.txt'));
const tracked = execFileSync('git', ['ls-files', 'apps/quiz/src'], { encoding: 'utf8', cwd: root }).split('\n').filter(Boolean);
const allow = new Map(ALLOWLIST.map((a) => [a.file, a.reason]));

let failed = false;
const fail = (msg: string): void => { failed = true; console.log(`FAIL  ${msg}`); };

// 1. Rules.
for (const rule of RULES) {
  if (!ownedBy(globs, rule.file)) { fail(`${rule.file}: rule for a file B1 does not own`); continue; }
  if (hot.has(rule.file)) { console.log(`HOT   ${rule.file} (skipped until its branch merges)${rule.note ? `: ${rule.note}` : ''}`); continue; }
  const before = read(rule.file);
  const r = applyRule(before, rule);
  for (const m of r.missing) fail(`${rule.file}: stale rule, neither side found: ${JSON.stringify(m.slice(0, 70))}`);
  const changed = r.text !== before;
  console.log(`${changed ? (write ? 'WROTE' : 'WOULD') : 'ok   '} ${rule.file} (applied ${r.applied}, already ${r.already}, imports ${r.importsAdded})`);
  if (changed) {
    if (write) fs.writeFileSync(path.join(root, rule.file), r.text);
    else if (check) fail(`${rule.file}: a rule would still change this file`);
  }
}

// 2. What is left, by category.
const owned = tracked.filter((f) => ownedBy(globs, f));
const rows = { owned: 0, allowlisted: 0, hotWaiting: 0, neverChange: 0, notOwned: 0 };
const leftOwned: string[] = [];
for (const f of tracked) {
  const n = countBrandLiterals(read(f));
  if (n === 0) continue;
  if (!owned.includes(f)) { if (NEVER_CHANGE.some((re) => re.test(f))) rows.neverChange += n; else rows.notOwned += n; continue; }
  if (/\.test\.[a-z]+$/.test(f)) { rows.neverChange += n; continue; }
  if (hot.has(f)) { rows.hotWaiting += n; continue; }
  if (allow.has(f)) { rows.allowlisted += n; continue; }
  rows.owned += n;
  leftOwned.push(`${f} (${n})`);
}
console.log('');
console.log(`literals left in apps/quiz/src, by who may change them:`);
console.log(`  owned by B1, not HOT, not allowlisted : ${rows.owned}${leftOwned.length ? `   ${leftOwned.join(', ')}` : ''}`);
console.log(`  owned by B1, allowlisted              : ${rows.allowlisted}`);
for (const a of ALLOWLIST) console.log(`      ${a.file}: ${a.reason}`);
console.log(`  owned by B1, on HOT.txt (waiting)     : ${rows.hotWaiting}`);
console.log(`  tests, articles, i18n, return-to...   : ${rows.neverChange}`);
console.log(`  files no B1 glob covers (other lanes) : ${rows.notOwned}`);
if (check && rows.owned > 0) fail('an owned, non-HOT file still holds a brand literal');

process.exit(failed ? 1 : 0);
