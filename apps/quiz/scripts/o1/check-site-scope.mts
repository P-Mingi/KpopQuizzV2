// Run O1, lane B2: check-site-scope (flags-env.md 3 SITE_SCOPE; rpcs.md 3 forSite and withSite).
//
// In NEW code (the lines a diff adds against a base), under apps/quiz/src (tests excluded), it flags:
//   unscoped-read     a Supabase read of a scoped table (the 24 site_id tables of schema.sql "@file 002a-site-columns")
//                     that neither goes through forSite(...) nor filters site_id; once SITE_SCOPE is on, or on an
//                     anime or hub build, such a read would mix the sites' rows.
//   kpopquiz-literal  the text "kpopquiz" in code (comments ignored), outside lib/site (the registry holds the
//                     literals) and the kpop copy files: a shared file takes its domain and brand from SITE.
// A comment with "site-scope: <reason>" on the flagged line or the line above marks a deliberate case.
// The rules live in scripts/o1/site-scope/lib.ts; the planted cases in scripts/o1/site-scope/planted/.
//
//   ./node_modules/.bin/tsx apps/quiz/scripts/o1/check-site-scope.mts [--base <ref>]
//       new code = git diff of the working tree against merge-base(<ref>, HEAD) (default ref origin/main), plus the
//       untracked files under apps/quiz/src (every line new).
//   ... check-site-scope.mts --all <file>...
//       every line of the given files is new code; each file is judged as apps/quiz/src/<its name> when it lies
//       outside apps/quiz/src (the planted cases: --all apps/quiz/scripts/o1/site-scope/planted/*.txt fails).
//   ... check-site-scope.mts --self-test
//       each planted file must give exactly the findings its "expect:" comments name (and the clean file none).
// Output: one line per finding (path:line rule detail), then the verdict. Exit 0 clean (or self-test passed),
// 1 findings (or self-test failed), 2 usage or git error.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Finding, type Rule, addedLines, analyze, rulesFor, scopedTables } from './site-scope/lib.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCHEMA = path.join(REPO, 'docs/o1/contracts/schema.sql');
const PLANTED = path.join(REPO, 'apps/quiz/scripts/o1/site-scope/planted');

function usage(msg: string): never {
  console.error(`check-site-scope: ${msg}\nusage: check-site-scope.mts [--base <ref>] | --all <file>... | --self-test`);
  process.exit(2);
}

function git(args: string[]): string {
  return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

/** A path outside apps/quiz/src is judged as if it were apps/quiz/src/<its base name without .txt>. */
function judgedAs(rel: string): string {
  return rel.startsWith('apps/quiz/src/') ? rel : `apps/quiz/src/o1-planted/${path.basename(rel).replace(/\.txt$/, '')}`;
}

function print(findings: Finding[], scanned: number, label: string): number {
  for (const f of findings) console.log(`${f.file}:${f.line} ${f.rule} ${f.detail}`);
  if (findings.length === 0) {
    console.log(`check-site-scope: clean (${scanned} file(s), ${label})`);
    return 0;
  }
  console.log(`check-site-scope: ${findings.length} finding(s) in ${scanned} file(s), ${label}`);
  return 1;
}

const args = process.argv.slice(2);
const tables = scopedTables(fs.readFileSync(SCHEMA, 'utf8'));

if (args[0] === '--self-test') {
  if (args.length > 1) usage('--self-test takes no other argument');
  const files = fs.readdirSync(PLANTED).filter((f) => f.endsWith('.txt')).sort();
  if (files.length === 0) usage(`no planted file in ${PLANTED}`);
  let failed = 0;
  let planted = 0;
  for (const name of files) {
    const src = fs.readFileSync(path.join(PLANTED, name), 'utf8');
    const judged = judgedAs(name);
    const rules = rulesFor(judged);
    if (!rules) usage(`${name} is not judged as a checked path`);
    const got = analyze(judged, src, null, tables, rules).map((f) => `${f.line} ${f.rule}`);
    const want: string[] = [];
    src.split('\n').forEach((text, idx) => {
      const m = /expect:\s*([a-z-]+(?:\s*,\s*[a-z-]+)*)/.exec(text);
      if (m) for (const r of m[1]!.split(',')) want.push(`${idx + 1} ${r.trim() as Rule}`);
    });
    planted += want.length;
    const ok = JSON.stringify([...got].sort()) === JSON.stringify([...want].sort());
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got.length} finding(s), ${want.length} expected${ok ? '' : `\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`}`);
    if (!ok) failed += 1;
  }
  if (planted === 0) {
    console.log('check-site-scope self-test FAILED: no planted case');
    process.exit(1);
  }
  console.log(failed === 0
    ? `check-site-scope self-test ok: ${planted} planted case(s) flagged, clean code passes (${tables.length} scoped tables)`
    : `check-site-scope self-test FAILED: ${failed} file(s)`);
  process.exit(failed === 0 ? 0 : 1);
}

if (args[0] === '--all') {
  const files = args.slice(1);
  if (files.length === 0) usage('--all wants at least one file');
  const findings: Finding[] = [];
  for (const f of files) {
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) usage(`no such file ${f}`);
    const judged = judgedAs(path.relative(REPO, abs));
    const rules = rulesFor(judged);
    if (rules) findings.push(...analyze(judged, fs.readFileSync(abs, 'utf8'), null, tables, rules));
  }
  process.exit(print(findings, files.length, 'every line new'));
}

let base = 'origin/main';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--base' && args[i + 1]) { base = args[i + 1]!; i += 1; } else usage(`unknown argument ${args[i]}`);
}
let mergeBase: string;
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim();
} catch {
  usage(`no merge base between ${base} and HEAD`);
}
const added = addedLines(git(['diff', '--unified=0', '--no-color', '--no-ext-diff', mergeBase, '--', 'apps/quiz/src']));
const untracked = new Set(git(['ls-files', '--others', '--exclude-standard', '--', 'apps/quiz/src']).split('\n').filter(Boolean));
for (const f of untracked) added.set(f, new Set<number>());
const findings: Finding[] = [];
let scanned = 0;
for (const [file, lines] of [...added.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const rules = rulesFor(file);
  const abs = path.join(REPO, file);
  if (!rules || !fs.existsSync(abs)) continue;
  scanned += 1;
  findings.push(...analyze(file, fs.readFileSync(abs, 'utf8'), untracked.has(file) ? null : lines, tables, rules));
}
process.exit(print(findings, scanned, `new code since ${base} (${mergeBase.slice(0, 12)})`));
