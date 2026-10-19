/**
 * Run O1 contract: diffs a database against docs/o1/contracts/schema.sql (brief F0 deliverable 5).
 *
 * The contract is what schema.sql changes on its base, section by section (`-- @file`): built on a
 * throwaway local Postgres 18 cluster in ONE rolled-back transaction (schema.sql header, decision 37).
 * Compared per object: relation kind, RLS, view options and grants; column type, nullability, default,
 * identity; constraint and index definitions; function arguments with defaults, result, SECURITY mode,
 * search_path and EXECUTE grants; trigger definitions; policy command, roles and mode (policy
 * expressions are intent, frozen as comments, not compared); enum labels; and the objects schema.sql
 * drops must be absent. Grants are read for PUBLIC, anon, authenticated and service_role only (the
 * owner differs between clusters); MAINTAIN (Postgres 17+) is ignored.
 *
 *   ./node_modules/.bin/tsx apps/quiz/scripts/o1/check-contract.mts --self-test
 *       local only: a database built from schema.sql gives zero diffs, and each planted difference is
 *       reported (the done test of brief F0). Exit 0 when both hold.
 *   ... check-contract.mts --target local [--plant <sql>]
 *       local only: builds a database from the base and schema.sql (then the planted file) and diffs it.
 *   scripts/o1/env.sh scratch|dev -- ./node_modules/.bin/tsx ... --target db [--applied-only]
 *       diffs the branch database (read-only transaction) against the contract built locally. With
 *       --applied-only, a section none of whose new objects exist yet is listed as not applied instead of
 *       failing (a lane's file not applied yet); a section that is partly there must be complete.
 *   ... check-contract.mts --prod-copy <KPQ/prod-public.sql>
 *       local only (gate G3): builds the contract twice, on the base files and on the platform part of
 *       schema.base.sql + production's catalog copy + the rows of schema.base.sql, and lists every
 *       contract object whose section, novelty or value differs. Exit 0 when none does: the stand-in
 *       gives production's contract. The copy is read in place, never written into the repository.
 *   Common: --base-file <sql> (repeatable; default schema.base.sql), --json (machine output on stdout).
 *
 * Exit codes: 0 zero diffs (or self-test passed, or no object differs with --prod-copy), 1 diffs (or self-test
 * failed, or an object differs), 2 usage, 3 load error,
 * 5 refused (a URL that names the production project or lacks the branch ref). The URL is never printed.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONTRACT_SCHEMAS, PROD_COPY_RESET, baseParts, compareContract, compareContracts, contractFrom, formatDelta, formatDiff,
} from './contract/lib.ts';
import {
  GuardError, branchConn, buildDatabase, loadRolledBack, snapshotOf, snapshotWith, startCluster, workDir,
} from './contract/pg.ts';

import type { Comparison, Contract, Diff } from './contract/lib.ts';

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const SCHEMA = `${REPO}docs/o1/contracts/schema.sql`;
const BASE = `${REPO}docs/o1/contracts/schema.base.sql`;

/**
 * The planted differences of the self-test: each SQL statement breaks one frozen property, and the
 * diff must name `key` with `kind` (and `field` for a change).
 */
export const PLANTED: readonly { readonly name: string; readonly sql: string; readonly key: string; readonly kind: Diff['kind']; readonly field?: string }[] = [
  { name: 'column type', sql: 'alter table public.sites alter column sort type integer;', key: 'col:public.sites.sort', kind: 'changed', field: 'type' },
  { name: 'nullability', sql: 'alter table public.world_memberships alter column joined_at drop not null;', key: 'col:public.world_memberships.joined_at', kind: 'changed', field: 'notNull' },
  { name: 'default', sql: "alter table public.quizzes alter column site_id set default 'anime';", key: 'col:public.quizzes.site_id', kind: 'changed', field: 'default' },
  { name: 'missing column', sql: 'alter table public.series drop column chapters_approx;', key: 'col:public.series.chapters_approx', kind: 'missing' },
  { name: 'SECURITY mode', sql: 'alter function public.award_world_xp(uuid, text, integer, text) security invoker;', key: 'fn:public.award_world_xp(p_user uuid, p_site text, p_amount integer, p_reason text)', kind: 'changed', field: 'security' },
  { name: 'function grant', sql: 'grant execute on function public.passport_cleanup() to anon;', key: 'fn:public.passport_cleanup()', kind: 'changed', field: 'acl' },
  { name: 'search_path', sql: 'alter function public.ensure_daily_quiz_v2(date, text) reset search_path;', key: 'fn:public.ensure_daily_quiz_v2(p_date date, p_site text)', kind: 'changed', field: 'config' },
  {
    name: 'return type',
    sql: "drop function public.report_spoiler(uuid);\ncreate function public.report_spoiler(p_quiz_id uuid) returns boolean language sql security definer set search_path = public as 'select true';\nrevoke all on function public.report_spoiler(uuid) from public, anon;\ngrant execute on function public.report_spoiler(uuid) to authenticated;",
    key: 'fn:public.report_spoiler(p_quiz_id uuid)', kind: 'changed', field: 'result',
  },
  { name: 'argument default', sql: "drop function public.ensure_membership(text, text, text);\ncreate function public.ensure_membership(p_site text, p_via text, p_via_code text) returns table (site_id text, joined_via text, via_code text, joined_at timestamptz, activated_at timestamptz, created boolean) language sql security definer set search_path = public as 'select null::text, null::text, null::text, null::timestamptz, null::timestamptz, null::boolean';", key: 'fn:public.ensure_membership(p_site text, p_via text, p_via_code text)', kind: 'changed', field: 'args' },
  { name: 'missing view', sql: 'drop view public.favourite_character_counts;', key: 'rel:public.favourite_character_counts', kind: 'missing' },
  { name: 'missing index', sql: 'drop index public.quiz_bank_site_date;', key: 'idx:public.quiz_bank_site_date', kind: 'missing' },
  { name: 'index definition', sql: 'drop index public.review_batches_site_status_idx;\ncreate index review_batches_site_status_idx on public.review_batches (status, site_id);', key: 'idx:public.review_batches_site_status_idx', kind: 'changed', field: 'def' },
  { name: 'table grant', sql: 'grant select on passport.handoff_codes to anon;', key: 'rel:passport.handoff_codes', kind: 'changed', field: 'acl' },
  { name: 'RLS off', sql: 'alter table public.series disable row level security;', key: 'rel:public.series', kind: 'changed', field: 'rls' },
  { name: 'missing policy', sql: 'drop policy favourites_insert_own on public.favourites;', key: 'pol:public.favourites.favourites_insert_own', kind: 'missing' },
  { name: 'policy roles', sql: 'alter policy series_progress_select_own on public.series_progress to anon, authenticated;', key: 'pol:public.series_progress.series_progress_select_own', kind: 'changed', field: 'roles' },
  { name: 'check constraint', sql: "alter table public.series drop constraint series_tier_check;\nalter table public.series add constraint series_tier_check check (tier in ('A', 'B', 'C', 'D'));", key: 'con:public.series.series_tier_check', kind: 'changed', field: 'def' },
  { name: 'missing trigger', sql: 'drop trigger trg_quizzes_site_guard on public.quizzes;', key: 'trg:public.quizzes.trg_quizzes_site_guard', kind: 'missing' },
  { name: 'dropped object back', sql: 'alter table public.quiz_bank add constraint quiz_bank_scheduled_date_key unique (scheduled_date);', key: 'con:public.quiz_bank.quiz_bank_scheduled_date_key', kind: 'present' },
];

function usage(msg: string): never {
  console.error(`check-contract: ${msg}\nusage: check-contract.mts --self-test | --target local [--plant <sql>] | --target db [--applied-only] | --prod-copy <sql>  [--base-file <sql>]... [--json]`);
  process.exit(2);
}

const args = process.argv.slice(2);
let selfTest = false;
let target: 'local' | 'db' | null = null;
let appliedOnly = false;
let json = false;
let plant: string | null = null;
let prodCopy: string | null = null;
const baseFiles: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--self-test') selfTest = true;
  else if (a === '--target') { const v = args[++i]; if (v !== 'local' && v !== 'db') usage('--target is local or db'); target = v; }
  else if (a === '--applied-only') appliedOnly = true;
  else if (a === '--json') json = true;
  else if (a === '--plant') { const v = args[++i]; if (!v || !existsSync(v)) usage(`no such file ${v ?? ''}`); plant = v; }
  else if (a === '--prod-copy') { const v = args[++i]; if (!v || !existsSync(v)) usage(`no such copy ${v ?? ''}`); prodCopy = v; }
  else if (a === '--base-file') { const v = args[++i]; if (!v || !existsSync(v)) usage(`no such base file ${v ?? ''}`); baseFiles.push(v); }
  else usage(`unknown argument ${a}`);
}
if ([selfTest, target !== null, prodCopy !== null].filter(Boolean).length !== 1) usage('give one of --self-test, --target, --prod-copy');
if (plant && target !== 'local') usage('--plant goes with --target local');
if (appliedOnly && target !== 'db') usage('--applied-only goes with --target db');
if (baseFiles.length === 0) baseFiles.push(BASE);

function report(label: string, c: Comparison): void {
  console.log(`${label}: ${c.diffs.length} diff(s) over ${c.checked} contract object(s)`);
  for (const d of c.diffs) console.log(`  ${formatDiff(d)}`);
  if (c.notApplied.length > 0) console.log(`  not applied yet (skipped): ${c.notApplied.join(', ')}`);
}

async function main(): Promise<number> {
  const schemaSql = readFileSync(SCHEMA, 'utf8');
  const branch = target === 'db' ? branchConn(false) : null;
  const work = workDir();
  const cluster = await startCluster();
  try {
    if (prodCopy) {
      // The same schema.sql on the stand-in and on production's copy (under the stand-in's platform part and rows).
      const parts = baseParts(readFileSync(BASE, 'utf8'));
      const platform = join(work, 'base-platform.sql');
      const reset = join(work, 'base-reset.sql');
      const rows = join(work, 'base-rows.sql');
      writeFileSync(platform, parts.platform);
      writeFileSync(reset, PROD_COPY_RESET);
      writeFileSync(rows, parts.rows);
      cluster.createDb('standin');
      cluster.createDb('prodcopy');
      const s = loadRolledBack(cluster.conn('standin'), baseFiles, schemaSql, CONTRACT_SCHEMAS, work);
      const p = loadRolledBack(cluster.conn('prodcopy'), [platform, prodCopy, reset, rows], schemaSql, CONTRACT_SCHEMAS, work);
      const a = contractFrom(s.snaps, s.sections);
      const b = contractFrom(p.snaps, p.sections);
      const deltas = compareContracts(a, b);
      if (json) console.log(JSON.stringify({ ok: deltas.length === 0, standIn: a.items.length, prodCopy: b.items.length, deltas }, null, 2));
      else {
        console.log(`local Postgres ${cluster.version}; contract on the stand-in: ${a.items.length} objects, on production's copy: ${b.items.length} objects`);
        console.log(`${deltas.length} contract object(s) differ`);
        for (const d of deltas) console.log(`  ${formatDelta(d, ['stand-in', 'prod-copy'])}`);
      }
      return deltas.length === 0 ? 0 : 1;
    }
    cluster.createDb('reference');
    const loaded = loadRolledBack(cluster.conn('reference'), baseFiles, schemaSql, CONTRACT_SCHEMAS, work);
    const contract: Contract = contractFrom(loaded.snaps, loaded.sections);

    if (branch) {
      const c = compareContract(contract, snapshotOf(branch, CONTRACT_SCHEMAS, work, 'branch'), appliedOnly);
      if (json) console.log(JSON.stringify(c, null, 2)); else report(`o1-${process.env.O1_ENV ?? 'branch'}`, c);
      return c.diffs.length === 0 ? 0 : 1;
    }

    // A database built from the base and schema.sql, committed.
    cluster.createDb('built');
    const schemaFile = join(work, 'schema.sql');
    writeFileSync(schemaFile, schemaSql);
    buildDatabase(cluster.conn('built'), [...baseFiles, schemaFile, ...(plant ? [plant] : [])], work, 'built');
    const clean = compareContract(contract, snapshotOf(cluster.conn('built'), CONTRACT_SCHEMAS, work, 'built'));

    if (target === 'local') {
      if (json) console.log(JSON.stringify(clean, null, 2)); else report(plant ? `built from schema.sql + ${plant}` : 'built from schema.sql', clean);
      return clean.diffs.length === 0 ? 0 : 1;
    }

    // Self-test: zero diffs on the clean build, then every planted difference reported.
    const results: { name: string; ok: boolean; found: string[] }[] = [];
    PLANTED.forEach((p, i) => {
      const snap = snapshotWith(cluster.conn('built'), p.sql, CONTRACT_SCHEMAS, work, `planted-${i}`);
      const c = compareContract(contract, snap);
      const hit = c.diffs.some((d) => d.key === p.key && d.kind === p.kind && (p.field === undefined || d.field === p.field));
      results.push({ name: p.name, ok: hit, found: c.diffs.map(formatDiff) });
    });
    const ok = clean.diffs.length === 0 && results.every((r) => r.ok);
    if (json) {
      console.log(JSON.stringify({ ok, postgres: cluster.version, contractObjects: contract.items.length, clean, planted: results }, null, 2));
    } else {
      console.log(`local Postgres ${cluster.version}; contract: ${contract.items.length} objects in ${contract.files.length} sections`);
      report('clean build from schema.base.sql + schema.sql', clean);
      for (const r of results) {
        console.log(`planted ${r.ok ? 'reported' : 'NOT REPORTED'}: ${r.name}`);
        for (const f of r.found) console.log(`    ${f}`);
      }
      console.log(ok ? 'self-test ok: zero diffs on the clean build, every planted difference reported' : 'self-test FAILED');
    }
    return ok ? 0 : 1;
  } finally {
    cluster.stop();
  }
}

main().then((code) => process.exit(code), (e: unknown) => {
  console.error(`check-contract: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(e instanceof GuardError ? 5 : 3);
});
