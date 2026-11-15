import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { OwnerError, main, parseEnv, parseVerify, pgEnvFromUrl } from '../../../scripts/cards/owner-cards.mjs';

const SEP = '\u001f';
const KEY = 'sbsecret-service-key-123456';
const DBPW = 'p@ss/w0rd-db-secret';
const DB_URL = `postgresql://postgres.abcref:${encodeURIComponent(DBPW)}@aws-0-eu.pooler.supabase.com:6543/postgres`;
const ENV_TEXT = `# comment
export NEXT_PUBLIC_SUPABASE_URL="https://abcref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY='${KEY}'
SUPABASE_DB_URL=${DB_URL} # trailing
`;
const okRows = [['001', 'tables', '5', '5', 't'], ['ALL', 'TOUT_OK', 'true', 'true', 't']].map((r) => r.join(SEP)).join('\n');
const badRows = [['001', 'tables', '5', '3', 'f'], ['ALL', 'TOUT_OK', 'true', 'false', 'f']].map((r) => r.join(SEP)).join('\n');

type Call = { cmd: string; args: string[]; env: Record<string, string>; capture: boolean };
function setup(opts: { verify?: string; answers?: string[]; envText?: string; fail?: string; noFile?: boolean; noPsql?: boolean; tty?: boolean } = {}) {
  const calls: Call[] = [];
  const out: string[] = [];
  const asked: string[] = [];
  const answers = [...(opts.answers ?? ['abcref.supabase.co', 'PUBLIER', 'PUBLIER'])];
  const deps = {
    isTTY: opts.tty ?? true,
    log: (m: string) => out.push(m),
    readFile: () => opts.envText ?? ENV_TEXT,
    exists: (f: string) => !(opts.noFile && f.endsWith('ALL-verify.sql')),
    findPsql: () => (opts.noPsql ? null : '/usr/bin/psql'),
    repo: '/repo',
    defaultEnvFile: '/home/x/.env.local',
    baseEnv: { PATH: '/bin', PGPASSWORD: 'inherited', SUPABASE_SERVICE_ROLE_KEY: 'inherited' } as Record<string, string>,
    node: 'node',
    ask: async (q: string) => { asked.push(q); return answers.shift() ?? ''; },
    run: (cmd: string, args: string[], env: Record<string, string>, o: { capture?: boolean } = {}) => {
      calls.push({ cmd, args, env, capture: Boolean(o.capture) });
      if (cmd === '/usr/bin/psql') return { status: 0, stdout: opts.verify ?? okRows, stderr: '', error: null };
      const tag = args.includes('--publish') ? 'publish' : 'preview';
      const which = args[0]!.includes('kpopdle') ? 'dle' : 'cards';
      return { status: opts.fail === `${which}-${tag}` ? 2 : 0, stdout: '', stderr: '', error: null };
    },
  };
  return { deps, calls, out, asked };
}
const everything = (s: ReturnType<typeof setup>) => JSON.stringify([s.calls.map((c) => c.args), s.out, s.asked]);

describe('owner-cards env parsing', () => {
  it('handles export, quotes, comments and blanks', () => {
    const e = parseEnv(`\n# c\nexport A=1\nB="two words"\nC='x#y'\nD=val # note\nE="a\\"b"\nbad line\n`);
    expect(e).toEqual({ A: '1', B: 'two words', C: 'x#y', D: 'val', E: 'a"b' });
  });
  it('splits the database URL into PG variables', () => {
    expect(pgEnvFromUrl(DB_URL)).toEqual({ PGHOST: 'aws-0-eu.pooler.supabase.com', PGPORT: '6543', PGUSER: 'postgres.abcref', PGPASSWORD: DBPW, PGDATABASE: 'postgres', PGSSLMODE: 'require' });
    expect(pgEnvFromUrl('postgres://u:p@h/db?sslmode=disable').PGSSLMODE).toBe('disable');
    expect(() => pgEnvFromUrl('nope')).toThrow(OwnerError);
  });
  it('parses verify rows', () => {
    expect(parseVerify(okRows).at(-1)).toMatchObject({ controle: 'TOUT_OK', ok: true });
    expect(parseVerify(badRows)[0]).toMatchObject({ obtenu: '3', ok: false });
  });
});

describe('owner-cards run', () => {
  it('runs in order: psql, cards preview, cards publish, kpopdle preview, kpopdle publish', async () => {
    const s = setup();
    await main([], s.deps);
    expect(s.calls.map((c) => (c.cmd === '/usr/bin/psql' ? 'psql' : `${path.basename(c.args[0]!)}${c.args.includes('--publish') ? ' --publish' : ''}`)))
      .toEqual(['psql', 'publish-card-files.mjs', 'publish-card-files.mjs --publish', 'kpopdle-photos.mjs', 'kpopdle-photos.mjs --publish']);
    expect(s.asked).toHaveLength(3);
    expect(s.out.join('\n')).toContain('out/cards-tool/preview/index.html');
    expect(s.out.join('\n')).toContain('OWNER-ONE-SHOT.md');
  });

  it('psql: PG variables only, read only, never the URL, password or key in an argument', async () => {
    const s = setup();
    await main([], s.deps);
    const p = s.calls[0]!;
    expect(p.capture).toBe(true);
    expect(p.args).toEqual(['-X', '-A', '-t', '-F', SEP, '-v', 'ON_ERROR_STOP=1', '-f', '/repo/docs/pending-migrations/cards/ALL-verify.sql']);
    expect(p.env).toMatchObject({ PGHOST: 'aws-0-eu.pooler.supabase.com', PGUSER: 'postgres.abcref', PGPASSWORD: DBPW, PGSSLMODE: 'require', PGOPTIONS: '-c default_transaction_read_only=on' });
    expect(p.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    for (const c of s.calls) for (const a of c.args) for (const secret of [KEY, DBPW, DB_URL, 'abcref:']) expect(a).not.toContain(secret);
    const all = everything(s);
    for (const secret of [KEY, DBPW, DB_URL]) expect(all).not.toContain(secret);
  });

  it('children get the key through their environment only', async () => {
    const s = setup();
    await main([], s.deps);
    const [, , pub, dlePrev, dlePub] = s.calls;
    expect(s.calls[1]!.env.CARDS_SERVICE_KEY).toBeUndefined();
    expect(pub!.env).toMatchObject({ CARDS_SUPABASE_URL: 'https://abcref.supabase.co', CARDS_HOST_CONFIRMED: 'abcref.supabase.co', CARDS_SERVICE_KEY: KEY });
    expect(pub!.env.PGPASSWORD).toBeUndefined();
    for (const c of [dlePrev!, dlePub!]) expect(c.env).toMatchObject({ SUPABASE_SERVICE_ROLE_KEY: KEY, OTAKU_SUPABASE_URL: 'https://abcref.supabase.co' });
    expect(dlePub!.env.PGPASSWORD).toBeUndefined();
  });

  it.each([
    ['no terminal', { tty: false }, /needs a terminal/],
    ['missing variables', { envText: 'NEXT_PUBLIC_SUPABASE_URL=https://abcref.supabase.co\n' }, /missing in .*SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL/],
    ['db url of another project', { envText: ENV_TEXT.replace('abcref:', 'other:').replace('pooler', 'pooler') .replace('postgres.abcref', 'postgres.other') }, /does not belong/],
    ['verify file missing', { noFile: true }, /ALL-verify.sql not found/],
    ['psql absent', { noPsql: true }, /psql not found/],
    ['wrong host typed', { answers: ['wrong.supabase.co'] }, /does not match/],
    ['TOUT_OK false', { verify: badRows }, /TOUT_OK is false/],
    ['no TOUT_OK row', { verify: '' }, /did not return a TOUT_OK/],
    ['wrong confirmation for cards', { answers: ['abcref.supabase.co', 'oui'] }, /card files were not published/],
    ['wrong confirmation for kpopdle', { answers: ['abcref.supabase.co', 'PUBLIER', 'non'] }, /Kpopdle photos were not published/],
    ['cards preview fails', { fail: 'cards-preview' }, /card files preview failed/],
    ['cards publish fails', { fail: 'cards-publish' }, /card files publication failed/],
    ['kpopdle preview fails', { fail: 'dle-preview' }, /Kpopdle photos preview failed/],
    ['kpopdle publish fails', { fail: 'dle-publish' }, /Kpopdle photos publication failed/],
  ] as const)('refuses: %s', async (_n, o, re) => {
    const s = setup(o as Parameters<typeof setup>[0]);
    await expect(main([], s.deps)).rejects.toThrow(re);
    const all = everything(s);
    for (const secret of [KEY, DBPW, DB_URL]) expect(all).not.toContain(secret);
  });

  it('stops before any write when the checks fail, and prints the failing rows without secrets', async () => {
    const s = setup({ verify: badRows });
    await expect(main([], s.deps)).rejects.toThrow();
    expect(s.calls).toHaveLength(1);
    expect(s.out.join('\n')).toContain('001 | tables | expected 5 | got 3');
  });

  it('a wrong host or confirmation never reaches --publish', async () => {
    const a = setup({ answers: ['abcref.supabase.co', 'oui'] });
    await expect(main([], a.deps)).rejects.toThrow();
    expect(a.calls.some((c) => c.args.includes('--publish'))).toBe(false);
    const b = setup({ answers: ['x'] });
    await expect(main([], b.deps)).rejects.toThrow();
    expect(b.calls).toHaveLength(0);
  });

  it('--env overrides the default path', async () => {
    const s = setup();
    let seen = '';
    s.deps.exists = (f: string) => { if (f.endsWith('.env.custom')) seen = f; return true; };
    await main(['--env', '/tmp/x/.env.custom'], s.deps);
    expect(seen).toBe('/tmp/x/.env.custom');
  });
});

describe('publish-card-files key path', () => {
  const src = readFileSync(path.resolve(__dirname, '../../../scripts/cards/publish-card-files.mjs'), 'utf8');
  it('takes the key from CARDS_SERVICE_KEY, else types it', () => {
    expect(src).toContain("(process.env.CARDS_SERVICE_KEY ?? '').trim() || await readSecret(");
  });
  it('still refuses without an explicit CARDS_SUPABASE_URL and keeps the host check', () => {
    expect(src).toContain('refused: --publish needs CARDS_SUPABASE_URL=');
    expect(src).toContain("if (confirmed !== host) throw new Error('refused: CARDS_HOST_CONFIRMED");
    expect(src).toContain("if (typed !== host) throw new Error('refused: the host typed does not match");
  });
  it('the key is never logged', () => {
    expect(src).not.toMatch(/console\.(log|error)\([^)]*\bkey\b/);
  });
});
