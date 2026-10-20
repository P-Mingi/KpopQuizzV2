#!/usr/bin/env node
// Run O1, lot (e) part 2, lane E1a (brief LE2 section 1): loads the three frozen series fixtures of
// docs/o1/contracts/fixtures/series/ into the anime site of an o1 branch: the anime sites row values, one groups row
// per series, its series, arcs, characters and series_themes, and its quizzes with their questions, spoiler tags and
// level (spoiler_arc_ord, spoiler_scope, computed by lib/anime/spoilers, never copied from the file), published.
//
//   node scripts/anime/k1/load-fixtures.mjs <scratch|dev> [--dry-run]
//
// Every database access goes through scripts/o1/env.sh <target> -- psql (the connection string stays inside that
// wrapper and is never read or printed here). Any target other than scratch or dev is refused. Idempotent: a second
// run changes nothing. --dry-run prints the row counts of the plan and touches no database.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const FIXTURES = ['death-note', 'one-piece', 'spy-x-family'];
const FIXTURE_DIR = resolve(ROOT, 'docs/o1/contracts/fixtures/series');
const ENV_SH = process.env.O1_ENV_SH || resolve(ROOT, 'scripts/o1/env.sh');
const PSQL = process.env.O1_PSQL || '/opt/homebrew/opt/postgresql@18/bin/psql';
const LIB = resolve(ROOT, 'apps/quiz/src/lib/anime/fixture-load.ts');

function fail(message, code = 1) {
  console.error(`load-fixtures: ${message}`);
  process.exit(code);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = args.find((a) => !a.startsWith('--'));
if (args.some((a) => a.startsWith('--') && a !== '--dry-run')) fail('usage: load-fixtures.mjs <scratch|dev> [--dry-run]', 2);
if (target !== 'scratch' && target !== 'dev') fail(`refused: the target must be scratch or dev (got ${target ?? 'none'})`, 2);

let lib;
try {
  const { tsImport } = await import('tsx/esm/api');
  lib = await tsImport(LIB, import.meta.url);
} catch (err) {
  fail(`cannot load ${LIB} (tsx needed): ${err instanceof Error ? err.message : String(err)}`);
}

const fixtures = FIXTURES.map((name) => JSON.parse(readFileSync(resolve(FIXTURE_DIR, `${name}.json`), 'utf8')));
const plan = lib.buildPlan(fixtures);
const counts = lib.countPlan(plan);

function psql(sql, extra = []) {
  const r = spawnSync(ENV_SH, [target, '--', 'bash', '-c', '"$0" "$O1_DB_URL" -X -q "$@"', PSQL, ...extra], { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    // psql errors may echo statement text, never the connection string (it is not in any argument); show the first lines only.
    fail(`psql failed (${r.status}): ${(r.stderr || '').split('\n').slice(0, 4).join(' | ')}`);
  }
  return r.stdout;
}

console.log(`plan target=${target} ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
if (dryRun) {
  console.log('dry-run: nothing written');
  process.exit(0);
}

psql(lib.renderSql(plan), ['-v', 'ON_ERROR_STOP=1', '-f', '-']);
const slugs = plan.groups.map((g) => g.slug);
const row = psql(lib.countSql(slugs), ['-At', '-F', ' ', '-f', '-']).trim();
const [groups, series, arcs, characters, themes, quizzes, published] = row.split(/\s+/).map(Number);
console.log(`loaded target=${target} groups=${groups} series=${series} arcs=${arcs} characters=${characters} themes=${themes} quizzes=${quizzes} published=${published}`);
