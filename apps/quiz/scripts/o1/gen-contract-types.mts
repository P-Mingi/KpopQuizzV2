/**
 * Run O1 contract: generates apps/quiz/src/lib/db/contract.types.ts from docs/o1/contracts/schema.sql
 * (brief F0 deliverable 5, override 8: psql and the catalog, never the Supabase command line).
 *
 * It loads the base and then schema.sql, section by section, in ONE transaction that is rolled back
 * after the catalog is read (schema.sql header, decision 37), and writes the types of what the
 * contract creates: a Row and Insert type per new table, the columns added to existing tables, a Row
 * per view, Args and Returns per callable function, and the index maps.
 *
 *   ./node_modules/.bin/tsx apps/quiz/scripts/o1/gen-contract-types.mts            local cluster, writes the file
 *   ... gen-contract-types.mts --check                                            exit 1 when the file is stale
 *                                                                                (the "// base:" header line is not compared)
 *   ... gen-contract-types.mts --base-file <sql> [--base-file <sql>...]            another local base (after G3)
 *   scripts/o1/env.sh scratch -- ./node_modules/.bin/tsx ... --base db              on o1-scratch (ORCH, after G1);
 *                                                                                it first adds the kpop seed rows
 *                                                                                009 needs where the branch lacks
 *                                                                                them (BRANCH_SEED_SQL, rolled back)
 *
 * Local mode starts a throwaway Postgres 18 cluster (initdb in O1_PG_TMP or the OS temp folder, TCP on
 * 127.0.0.1 only, no unix socket) and deletes it at exit. `--base db` refuses any target but o1-scratch,
 * a URL that names the production project, or one that lacks the branch ref; the URL is never printed.
 * Exit codes: 0 written or up to date, 1 stale (--check), 2 usage, 3 load or render error, 5 refused.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRANCH_SEED_SQL, CONTRACT_SCHEMAS, contractFrom, renderTypes } from './contract/lib.ts';
import { GuardError, branchConn, loadRolledBack, psqlCommand, startCluster, workDir } from './contract/pg.ts';

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const SCHEMA = `${REPO}docs/o1/contracts/schema.sql`;
const BASE = `${REPO}docs/o1/contracts/schema.base.sql`;
const OUT = `${REPO}apps/quiz/src/lib/db/contract.types.ts`;

const sha16 = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
const rel = (path: string): string => (path.startsWith(REPO) ? path.slice(REPO.length) : path);

function usage(msg: string): never {
  console.error(`gen-contract-types: ${msg}\nusage: gen-contract-types.mts [--check] [--out <file>] [--base local|db] [--base-file <sql>]...`);
  process.exit(2);
}

const args = process.argv.slice(2);
let check = false;
let base: 'local' | 'db' = 'local';
let out = OUT;
const baseFiles: string[] = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--check') check = true;
  else if (a === '--base') { const v = args[++i]; if (v !== 'local' && v !== 'db') usage('--base is local or db'); base = v; }
  else if (a === '--base-file') { const v = args[++i]; if (!v || !existsSync(v)) usage(`no such base file ${v ?? ''}`); baseFiles.push(v); }
  else if (a === '--out') { const v = args[++i]; if (!v) usage('--out needs a path'); out = v; }
  else usage(`unknown argument ${a}`);
}
if (base === 'db' && baseFiles.length > 0) usage('--base-file is for the local base only');
if (base === 'local' && baseFiles.length === 0) baseFiles.push(BASE);

async function main(): Promise<number> {
  const schemaSql = readFileSync(SCHEMA, 'utf8');
  const work = workDir();
  let header: string[];
  let loaded;
  if (base === 'db') {
    const conn = branchConn(true);
    const version = psqlCommand(conn, 'show server_version', 'server version').trim();
    // The kpop seed rows 009 needs, only where the branch lacks them, rolled back with the rest (decision 83).
    const seed = join(work, 'branch-seed.sql');
    writeFileSync(seed, BRANCH_SEED_SQL);
    loaded = loadRolledBack(conn, [seed], schemaSql, CONTRACT_SCHEMAS, work);
    header = [`schema.sql sha256 ${sha16(SCHEMA)}`, `base: the o1-scratch branch's own schema; Postgres ${version.split(' ')[0]}`];
  } else {
    const cluster = await startCluster();
    try {
      cluster.createDb('contract');
      loaded = loadRolledBack(cluster.conn('contract'), baseFiles, schemaSql, CONTRACT_SCHEMAS, work);
      header = [
        `schema.sql sha256 ${sha16(SCHEMA)}`,
        `base: ${baseFiles.map((f) => `${rel(f)} sha256 ${sha16(f)}`).join(', ')}; local Postgres ${cluster.version.split(' ')[0]}`,
      ];
    } finally {
      cluster.stop();
    }
  }
  const contract = contractFrom(loaded.snaps, loaded.sections);
  const text = renderTypes({ contract, snapshot: loaded.snaps[loaded.snaps.length - 1]!, header });
  const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (check) {
    // The base line names the base and the Postgres build that generated the file; the rest must be equal.
    const body = (t: string): string => t.split('\n').filter((l) => !l.startsWith('// base: ')).join('\n');
    if (body(current) === body(text)) { console.log(`up to date: ${rel(out)}`); return 0; }
    console.error(`stale: ${rel(out)} differs from what schema.sql generates; run gen-contract-types.mts`);
    return 1;
  }
  if (current === text) console.log(`unchanged: ${rel(out)}`);
  else { writeFileSync(out, text); console.log(`written: ${rel(out)}`); }
  const count = (p: string): number => contract.items.filter((i) => i.key.startsWith(p) && i.v !== null).length;
  console.log(`contract objects: ${contract.items.length} (${count('rel:')} relations, ${count('col:')} columns, ${count('fn:')} functions, ${count('pol:')} policies, ${count('idx:')} indexes) in ${contract.files.length} sections`);
  return 0;
}

main().then((code) => process.exit(code), (e: unknown) => {
  console.error(`gen-contract-types: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(e instanceof GuardError ? 5 : 3);
});
