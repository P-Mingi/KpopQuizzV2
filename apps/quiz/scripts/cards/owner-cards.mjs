#!/usr/bin/env node
// owner-cards.mjs: the owner's one terminal command for the Bunnyverse Cards go-live, run from his own checkout after the merge:
//   pnpm --filter quiz owner:cards            (option: --env <path>, default apps/quiz/.env.local next to this script's checkout)
// In order, stopping at the first error (exit 1, a clear message):
//   1. reads the env file (KEY=VALUE lines) and needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL;
//   2. shows the project host and asks to type it back;
//   3. runs docs/pending-migrations/cards/ALL-verify.sql with psql (read only) and refuses to go on unless its TOUT_OK row is true;
//   4. publish-card-files.mjs: preview, the contact sheet path, the typed word PUBLIER, then --publish;
//   5. kpopdle-photos.mjs: preview, the typed word PUBLIER, then --publish;
//   6. a short summary and the next step (the admin, docs/o1/reports/CARDS/OWNER-ONE-SHOT.md).
// Secrets: no value of the env file is ever printed, logged or put on a command line. psql gets the connection through PG* environment
// variables parsed from SUPABASE_DB_URL; the two scripts get what they need through their environment only. Every prompt reads the
// terminal; without a terminal the script refuses to start. The core (main) is injectable: run, ask, readFile, exists, findPsql, log.
import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../../..');
export const DEFAULT_ENV_FILE = path.resolve(HERE, '../../.env.local');
export const VERIFY_FILE = 'docs/pending-migrations/cards/ALL-verify.sql';
export const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL'];
export const CONFIRM_WORD = 'PUBLIER';
const SEP = '\u001f';
const PSQL_FALLBACKS = ['/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql@17/bin', '/opt/homebrew/opt/postgresql@16/bin'];

export class OwnerError extends Error {}

/** KEY=VALUE lines: blank lines and # comments skipped, an `export ` prefix, single or double quotes, an inline comment after an unquoted value. */
export function parseEnv(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^export\s+/.test(line)) line = line.replace(/^export\s+/, '');
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let v = line.slice(eq + 1).trim();
    if (v.startsWith('"')) {
      let j = 1; let s = '';
      while (j < v.length && v[j] !== '"') {
        if (v[j] === '\\' && j + 1 < v.length) { const n = v[j + 1]; s += n === 'n' ? '\n' : n; j += 2; } else { s += v[j]; j++; }
      }
      v = s;
    } else if (v.startsWith("'")) {
      const end = v.indexOf("'", 1);
      v = end < 0 ? v.slice(1) : v.slice(1, end);
    } else {
      v = v.replace(/\s+#.*$/, '').trim();
    }
    out[key] = v;
  }
  return out;
}

/** SUPABASE_DB_URL -> PG* variables (the URL itself is never passed on). sslmode=require unless the URL says otherwise. */
export function pgEnvFromUrl(dbUrl) {
  let u;
  try { u = new URL(dbUrl); } catch { throw new OwnerError('SUPABASE_DB_URL is not a valid connection string (postgresql://user:password@host:port/database)'); }
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') throw new OwnerError('SUPABASE_DB_URL must start with postgresql:// or postgres://');
  if (!u.hostname) throw new OwnerError('SUPABASE_DB_URL has no host');
  const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  return {
    PGHOST: dec(u.hostname),
    PGPORT: u.port || '5432',
    PGUSER: dec(u.username),
    PGPASSWORD: dec(u.password),
    PGDATABASE: dec(u.pathname.replace(/^\//, '')) || 'postgres',
    PGSSLMODE: u.searchParams.get('sslmode') || 'require',
  };
}

/** The pieces of the DB URL that must never reach an output. */
function secretsOf(vars, pg) {
  return [vars.SUPABASE_SERVICE_ROLE_KEY, vars.SUPABASE_DB_URL, pg.PGPASSWORD].filter((s) => s && s.length >= 4);
}
export function scrub(text, secrets) {
  let t = String(text ?? '');
  for (const s of secrets) t = t.split(s).join('***');
  return t;
}

/** psql output (-A -t -F SEP): rows of fichier, controle, attendu, obtenu, ok. */
export function parseVerify(stdout) {
  const rows = [];
  for (const line of String(stdout).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const c = line.split(SEP);
    if (c.length < 5) continue;
    const ok = c[c.length - 1].trim().toLowerCase();
    rows.push({ fichier: c[0], controle: c[1], attendu: c[2], obtenu: c.slice(3, -1).join(SEP), ok: ok === 't' || ok === 'true' });
  }
  return rows;
}

function defaultFindPsql() {
  const dirs = [...String(process.env.PATH ?? '').split(path.delimiter).filter(Boolean), ...PSQL_FALLBACKS];
  for (const d of dirs) {
    const f = path.join(d, 'psql');
    try { accessSync(f, constants.X_OK); return f; } catch { /* next */ }
  }
  return null;
}

/** Runs a command. capture: stdout and stderr come back; otherwise the child shares this terminal (stdin included). */
export function defaultRun(cmd, args, env, { capture = false } = {}) {
  const r = spawnSync(cmd, args, { env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', maxBuffer: 64 * 1024 * 1024 });
  return { status: r.error ? 127 : r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error ? r.error.code ?? 'spawn error' : null };
}

export function defaultAsk(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(String(a).trim()); });
  });
}

/** The environment a child gets: this process's, without PG, CARDS_, OTAKU_ or service key leftovers, plus what the step needs. */
function childEnv(base, extra = {}) {
  const env = {};
  for (const [k, v] of Object.entries(base)) {
    if (/^(PG|CARDS_|OTAKU_)/.test(k) || k === 'SUPABASE_SERVICE_ROLE_KEY' || k === 'SUPABASE_DB_URL') continue;
    env[k] = v;
  }
  return { ...env, ...extra };
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const log = deps.log ?? ((m) => console.log(m));
  const run = deps.run ?? defaultRun;
  const ask = deps.ask ?? defaultAsk;
  const readFile = deps.readFile ?? ((f) => readFileSync(f, 'utf8'));
  const exists = deps.exists ?? existsSync;
  const findPsql = deps.findPsql ?? defaultFindPsql;
  const repo = deps.repo ?? REPO;
  const baseEnv = deps.baseEnv ?? process.env;
  const isTTY = deps.isTTY ?? Boolean(process.stdin.isTTY);
  const node = deps.node ?? process.execPath;

  if (!isTTY) throw new OwnerError('owner:cards needs a terminal: every question is typed. Run it from your own terminal window.');

  // 1. env file
  const ei = argv.indexOf('--env');
  if (ei >= 0 && !argv[ei + 1]) throw new OwnerError('--env needs a file path');
  const envFile = ei >= 0 ? path.resolve(argv[ei + 1]) : (deps.defaultEnvFile ?? DEFAULT_ENV_FILE);
  if (!exists(envFile)) throw new OwnerError(`env file not found: ${envFile} (use --env <path>)`);
  const vars = parseEnv(readFile(envFile));
  const missing = REQUIRED.filter((k) => !vars[k]);
  if (missing.length) throw new OwnerError(`missing in ${envFile}: ${missing.join(', ')}`);
  let origin;
  try { origin = new URL(vars.NEXT_PUBLIC_SUPABASE_URL); } catch { throw new OwnerError('NEXT_PUBLIC_SUPABASE_URL is not a valid address'); }
  if (origin.protocol !== 'https:') throw new OwnerError('NEXT_PUBLIC_SUPABASE_URL must be an https address');
  const host = origin.host;
  const pg = pgEnvFromUrl(vars.SUPABASE_DB_URL);
  const secrets = secretsOf(vars, pg);
  const ref = host.split('.')[0];
  if (!pg.PGHOST.includes(ref) && !pg.PGUSER.includes(ref)) {
    throw new OwnerError(`SUPABASE_DB_URL does not belong to the project ${host} (neither its host nor its user names ${ref}); refused: the check would read another database`);
  }
  const verifyFile = path.join(repo, VERIFY_FILE);
  if (!exists(verifyFile)) throw new OwnerError(`${VERIFY_FILE} not found at ${verifyFile}: the checks of the migrations are missing, nothing was done`);
  const psql = findPsql();
  if (!psql) throw new OwnerError('psql not found (looked on PATH, then /opt/homebrew/opt/postgresql@18, @17, @16 /bin). Install it: brew install postgresql@18');

  // 2. host typed back
  log(`Project host: ${host}`);
  log('This run checks the database, then publishes the card files and the Kpopdle photos to this project.');
  const typedHost = await ask('Type the project host to continue: ');
  if (typedHost !== host) throw new OwnerError('refused: the host typed does not match; nothing was done');

  // 3. ALL-verify.sql, read only
  log(`\nChecking the database with ${VERIFY_FILE} (read only)...`);
  const pgEnv = childEnv(baseEnv, { ...pg, PGOPTIONS: '-c default_transaction_read_only=on' });
  const v = run(psql, ['-X', '-A', '-t', '-F', SEP, '-v', 'ON_ERROR_STOP=1', '-f', verifyFile], pgEnv, { capture: true });
  if (v.status !== 0) {
    throw new OwnerError(`psql failed (exit ${v.status}${v.error ? `, ${v.error}` : ''}): ${scrub(v.stderr, secrets).trim().split('\n').slice(0, 5).join(' | ')}`);
  }
  const rows = parseVerify(scrub(v.stdout, secrets));
  const last = rows[rows.length - 1];
  if (!last || last.controle !== 'TOUT_OK') throw new OwnerError(`${VERIFY_FILE} did not return a TOUT_OK row; nothing was done`);
  if (!last.ok) {
    log('The database is not ready. Failing checks:');
    for (const r of rows.filter((x) => !x.ok && x.controle !== 'TOUT_OK')) log(`  ${r.fichier} | ${r.controle} | expected ${r.attendu} | got ${r.obtenu}`);
    throw new OwnerError('TOUT_OK is false: apply the missing SQL files first, then run this again; nothing was published');
  }
  log(`Database ready: ${rows.length - 1} checks, TOUT_OK true.`);

  // 4. card files
  const cardsScript = path.join(repo, 'apps/quiz/scripts/cards/publish-card-files.mjs');
  log('\nCard files, preview (downloads the originals from Commons, writes nothing remote)...');
  const p1 = run(node, [cardsScript], childEnv(baseEnv));
  if (p1.status !== 0) throw new OwnerError(`the card files preview failed (exit ${p1.status})`);
  log(`Contact sheet: ${path.join(repo, 'out/cards-tool/preview/index.html')} (open it in a browser and look before you continue).`);
  const c1 = await ask(`Type ${CONFIRM_WORD} to publish the card files to ${host} (anything else stops here): `);
  if (c1 !== CONFIRM_WORD) throw new OwnerError('stopped: the card files were not published');
  const p2 = run(node, [cardsScript, '--publish'], childEnv(baseEnv, {
    CARDS_SUPABASE_URL: origin.origin, CARDS_HOST_CONFIRMED: host, CARDS_SERVICE_KEY: vars.SUPABASE_SERVICE_ROLE_KEY,
  }));
  if (p2.status !== 0) throw new OwnerError(`the card files publication failed (exit ${p2.status})`);

  // 5. Kpopdle photos
  const dleScript = path.join(repo, 'apps/quiz/scripts/cards/kpopdle-photos/kpopdle-photos.mjs');
  const dleEnv = childEnv(baseEnv, { OTAKU_SUPABASE_URL: origin.origin, SUPABASE_SERVICE_ROLE_KEY: vars.SUPABASE_SERVICE_ROLE_KEY });
  log('\nKpopdle photos, preview (reads only)...');
  const d1 = run(node, [dleScript], dleEnv);
  if (d1.status !== 0) throw new OwnerError(`the Kpopdle photos preview failed (exit ${d1.status})`);
  const c2 = await ask(`Type ${CONFIRM_WORD} to publish the Kpopdle photos to ${host} (anything else stops here): `);
  if (c2 !== CONFIRM_WORD) throw new OwnerError('stopped: the Kpopdle photos were not published');
  const d2 = run(node, [dleScript, '--publish'], dleEnv);
  if (d2.status !== 0) throw new OwnerError(`the Kpopdle photos publication failed (exit ${d2.status})`);

  // 6. summary
  log('\nDone.');
  log(`  - database checks: TOUT_OK true (${host})`);
  log('  - card files: published (its own report above lists what was uploaded and any proposed deletion)');
  log('  - Kpopdle photos: published (the game shows them after its nightly refresh, 00:05 UTC)');
  log('Next step: the admin, see docs/o1/reports/CARDS/OWNER-ONE-SHOT.md');
  return { host, checks: rows.length - 1 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`\nStopped: ${e instanceof OwnerError ? e.message : `unexpected error: ${e?.message ?? e}`}`);
    process.exit(1);
  });
}
