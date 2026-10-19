// Run O1 contract tools: Postgres processes. A throwaway local cluster (Postgres 18, TCP on
// 127.0.0.1 only, no unix socket, `LC_ALL=en_US.UTF-8`; COMMON "Run environment"), psql runs that
// never print a connection string, and the branch URL guard of scripts/o1/env.sh and migrate-dev.sh.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { snapshotSql, splitSections } from './lib';

import type { Section, Snapshot } from './lib';

/** The production project ref (scripts/o1/env.sh): a URL that names it is refused. */
const PROD_REF = 'rdkgouofytwfdpbxbzio';

export const PG_BIN = process.env.O1_PG_BIN ?? '/opt/homebrew/opt/postgresql@18/bin';

/** How psql reaches a database: a local cluster (host, port) or a branch URL that is never printed. */
export type Conn = { readonly kind: 'local'; readonly port: number; readonly db: string } | { readonly kind: 'url'; readonly url: string };

const ENV = { ...process.env, LC_ALL: 'en_US.UTF-8', LANG: 'en_US.UTF-8', PGCONNECT_TIMEOUT: '15' };

function scrub(text: string, conn?: Conn): string {
  return conn?.kind === 'url' ? text.split(conn.url).join('<db-url>') : text;
}

function run(cmd: string, args: readonly string[], what: string, conn?: Conn): string {
  const r = spawnSync(join(PG_BIN, cmd), args, { env: ENV, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  if (r.status !== 0) {
    const tail = scrub(`${r.stdout ?? ''}${r.stderr ?? ''}`, conn).trim().split('\n').slice(-25).join('\n');
    throw new Error(`${what} failed (exit ${r.status}):\n${tail}`);
  }
  return r.stdout ?? '';
}

function connArgs(conn: Conn): string[] {
  return conn.kind === 'local' ? ['-h', '127.0.0.1', '-p', String(conn.port), '-U', 'postgres', '-d', conn.db] : [conn.url];
}

/** Runs a psql script file with ON_ERROR_STOP; returns stdout (quiet, unaligned, tuples only). */
export function psqlFile(conn: Conn, file: string, what: string): string {
  return run('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', ...connArgs(conn), '-f', file], what, conn);
}

/** Runs one SQL command. */
export function psqlCommand(conn: Conn, sql: string, what: string): string {
  return run('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', ...connArgs(conn), '-c', sql], what, conn);
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      s.close(() => resolve(port));
    });
  });
}

export interface Cluster {
  readonly port: number;
  readonly dir: string;
  readonly version: string;
  conn(db: string): Conn;
  createDb(name: string): void;
  stop(): void;
}

/**
 * Starts a throwaway cluster under `O1_PG_TMP` (else the OS temp folder): initdb, then postgres on a
 * free 127.0.0.1 port with no unix socket and fsync off. `stop()` (also run at process exit) stops it
 * and deletes its folder.
 */
export async function startCluster(): Promise<Cluster> {
  const root = process.env.O1_PG_TMP ?? tmpdir();
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, 'o1-contract-pg-'));
  const data = join(dir, 'data');
  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (existsSync(join(data, 'postmaster.pid'))) {
      spawnSync(join(PG_BIN, 'pg_ctl'), ['-D', data, '-m', 'immediate', '-w', 'stop'], { env: ENV, encoding: 'utf8' });
    }
    rmSync(dir, { recursive: true, force: true });
  };
  process.once('exit', stop);
  try {
    run('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--locale=en_US.UTF-8', '--no-sync', '--no-instructions'], 'initdb');
    const port = await freePort();
    const opts = `-c listen_addresses=127.0.0.1 -c port=${port} -c unix_socket_directories='' -c fsync=off -c full_page_writes=off -c synchronous_commit=off`;
    run('pg_ctl', ['-D', data, '-l', join(dir, 'postgres.log'), '-w', '-t', '60', '-o', opts, 'start'], 'pg_ctl start');
    const version = psqlCommand({ kind: 'local', port, db: 'postgres' }, 'show server_version', 'server version').trim();
    return {
      port, dir, version,
      conn: (db) => ({ kind: 'local', port, db }),
      createDb: (name) => { psqlCommand({ kind: 'local', port, db: 'postgres' }, `create database ${name}`, `create database ${name}`); },
      stop,
    };
  } catch (e) {
    stop();
    throw e;
  }
}

/**
 * The branch database of `scripts/o1/env.sh scratch|dev`, from O1_DB_URL. Refuses a URL that names
 * the production project or lacks the branch ref (exit 5 in the scripts), and, with `scratchOnly`,
 * any target but o1-scratch. The URL is never printed.
 */
export function branchConn(scratchOnly: boolean): Conn {
  const url = process.env.O1_DB_URL ?? '';
  const ref = process.env.O1_BRANCH_REF ?? '';
  if (!url) throw new GuardError('O1_DB_URL is not set: run through scripts/o1/env.sh scratch|dev (gate G1)');
  if (url.includes(PROD_REF)) throw new GuardError('refused: the database URL names the production project');
  if (!ref || !url.includes(ref)) throw new GuardError('refused: the database URL lacks the branch ref');
  if (scratchOnly && process.env.O1_ENV !== 'scratch') throw new GuardError('refused: this mode runs on o1-scratch only (scripts/o1/env.sh scratch)');
  return { kind: 'url', url };
}

export class GuardError extends Error {}

/** A scratch folder for psql scripts and their outputs. */
export function workDir(): string {
  const root = process.env.O1_PG_TMP ?? tmpdir();
  mkdirSync(root, { recursive: true });
  const d = mkdtempSync(join(root, 'o1-contract-work-'));
  process.once('exit', () => rmSync(d, { recursive: true, force: true }));
  return d;
}

/** Reads the snapshot of `schemas` from a database (in a read-only transaction). */
export function snapshotOf(conn: Conn, schemas: readonly string[], work: string, label: string): Snapshot {
  const out = join(work, `${label}.json`);
  const script = join(work, `${label}.sql`);
  writeFileSync(script, `begin read only;\n\\o ${out}\n${snapshotSql(schemas)}\n\\o\nrollback;\n`);
  psqlFile(conn, script, `snapshot ${label}`);
  return JSON.parse(readFileSync(out, 'utf8')) as Snapshot;
}

export interface Loaded {
  readonly sections: Section[];
  /** The base, then the catalog after each section. */
  readonly snaps: Snapshot[];
}

/**
 * In ONE transaction that is rolled back: loads the base files (none when the database already holds
 * the base: a branch), snapshots, then loads schema.sql section by section with a snapshot after each.
 * Nothing stays in the database (schema.sql header, decision 37).
 */
export function loadRolledBack(conn: Conn, baseFiles: readonly string[], schemaSql: string, schemas: readonly string[], work: string): Loaded {
  const sections = splitSections(schemaSql);
  const lines: string[] = ['\\set ON_ERROR_STOP on', 'begin;', '\\o /dev/null'];
  for (const f of baseFiles) lines.push(`\\i ${f}`);
  const snapFile = (i: number): string => join(work, `snap-${String(i).padStart(2, '0')}.json`);
  const snap = (i: number): void => { lines.push(`\\o ${snapFile(i)}`, snapshotSql(schemas), '\\o /dev/null'); };
  snap(0);
  sections.forEach((s, i) => {
    const f = join(work, `section-${String(i + 1).padStart(2, '0')}-${s.file}.sql`);
    writeFileSync(f, `${s.sql}\n`);
    lines.push(`\\i ${f}`);
    snap(i + 1);
  });
  lines.push('\\o', 'rollback;');
  const script = join(work, 'load.sql');
  writeFileSync(script, `${lines.join('\n')}\n`);
  psqlFile(conn, script, 'load base and schema.sql (rolled back)');
  const snaps = sections.map((_, i) => i + 1);
  return { sections, snaps: [0, ...snaps].map((i) => JSON.parse(readFileSync(snapFile(i), 'utf8')) as Snapshot) };
}

/** Builds a database for real (committed): the base files, then schema.sql, then optional extra files. */
export function buildDatabase(conn: Conn, files: readonly string[], work: string, label: string): void {
  const script = join(work, `build-${label}.sql`);
  writeFileSync(script, `\\set ON_ERROR_STOP on\nbegin;\n${files.map((f) => `\\i ${f}`).join('\n')}\ncommit;\n`);
  psqlFile(conn, script, `build ${label}`);
}

/** Applies `sql` in a transaction, snapshots, rolls back: the database stays as it was. */
export function snapshotWith(conn: Conn, sql: string, schemas: readonly string[], work: string, label: string): Snapshot {
  const out = join(work, `${label}.json`);
  const script = join(work, `${label}.sql`);
  writeFileSync(script, `\\set ON_ERROR_STOP on\nbegin;\n\\o /dev/null\n${sql}\n\\o ${out}\n${snapshotSql(schemas)}\n\\o\nrollback;\n`);
  psqlFile(conn, script, `snapshot ${label}`);
  return JSON.parse(readFileSync(out, 'utf8')) as Snapshot;
}
