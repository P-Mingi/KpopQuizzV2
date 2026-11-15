// KpopCards, PR #231: the three ALL files of docs/pending-migrations/cards, without a database. They are what bundle-sql.mjs writes, byte
// for byte; the bundle holds the 15 files verbatim in the closed order between its begin, its guard and its commit, nothing else; the
// rollback holds the 15 rollbacks verbatim from 115 down to 099, then 101; the 15 files hold no temp
// table, no CONCURRENTLY, no transaction command and no psql meta-command; ALL-verify is one SELECT with a row per Verify line of the
// 15 files, in order, then TOUT_OK, and writes nothing. The database proofs are bundle-sql-db.test.ts and kpopcards/bundle-sql-postgres.test.ts.
import { describe, expect, it } from 'vitest';

import { CHECKS, verifyLines } from '../../../scripts/cards/bundle-verify.mjs';
import { GUARD, ORDER, OUTPUTS, buildAll, readCards } from '../../../scripts/cards/bundle-sql.mjs';

const BUNDLE = readCards(OUTPUTS.bundle);
const VERIFY = readCards(OUTPUTS.verify);
const ROLLBACK = readCards(OUTPUTS.rollback);

/** The code of a SQL text: comment lines out. */
const code = (sql: string): string => sql.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
/** The code without its single-quoted literals (the messages of raise, the labels of ALL-verify). */
const noStrings = (sql: string): string => code(sql).replace(/'(?:[^']|'')*'/g, "''");

describe('the ALL files are what bundle-sql.mjs writes', () => {
  it('byte for byte (regenerate with node apps/quiz/scripts/cards/bundle-sql.mjs)', () => {
    const out = buildAll();
    expect(Object.keys(out).sort()).toEqual(['ALL-099-115.sql', 'ALL-rollback.sql', 'ALL-verify.sql']);
    expect(out[OUTPUTS.bundle] === BUNDLE, OUTPUTS.bundle).toBe(true);
    expect(out[OUTPUTS.verify] === VERIFY, OUTPUTS.verify).toBe(true);
    expect(out[OUTPUTS.rollback] === ROLLBACK, OUTPUTS.rollback).toBe(true);
  });

  it('hold no en or em dash', () => {
    for (const t of [BUNDLE, VERIFY, ROLLBACK]) expect(t).not.toMatch(/[–—]/);
  });
});

describe('ALL-099-115.sql', () => {
  it('is the closed order of the integrator (2026-11-14)', () => {
    expect(ORDER).toEqual(['099-idols-members', '102-catalog-rebuild', '099b-idols-returning', '103-catalog-photos', '104-economy', '105-goals',
      '106-demo', '107-prefs', '108-push', '110-core', '111-group-types', '112-social', '113-moment', '114-catalog-append', '115-quiz-of-day-bonus']);
  });

  it('holds each of the 15 files verbatim, once, in that order', () => {
    let at = 0;
    for (const f of ORDER) {
      const text = readCards(`${f}.sql`);
      const i = BUNDLE.indexOf(text);
      expect(i, f).toBeGreaterThan(at);
      expect(BUNDLE.indexOf(text, i + 1), f).toBe(-1);
      at = i + text.length;
    }
  });

  it('is begin, the guard, the 15 files and commit: nothing else outside comments', () => {
    let rest = BUNDLE;
    for (const f of ORDER) rest = rest.replace(readCards(`${f}.sql`), '');
    rest = rest.replace(GUARD, '');
    expect(code(rest).replace(/\s+/g, ' ').trim()).toBe('begin; commit;');
    const c = code(BUNDLE).trim();
    expect(c.startsWith(`begin;\n\n${code(GUARD).trim()}`)).toBe(true);
    expect(c.endsWith('end $c115$;\n\ncommit;')).toBe(true);
  });

  it('says how to run it: the SQL Editor or psql with SUPABASE_DB_URL and ON_ERROR_STOP, without -1, then ALL-verify', () => {
    expect(BUNDLE).toContain('-- How:    after a backup. Supabase SQL Editor: paste the whole file and Run');
    expect(BUNDLE).toContain('psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f docs/pending-migrations/cards/ALL-099-115.sql');
    expect(BUNDLE).toContain('Do not add -1 / --single-transaction: the file has its own begin and commit.');
    expect(BUNDLE.slice(0, BUNDLE.indexOf('\nbegin;\n'))).not.toMatch(/PGPASSWORD|password=|postgres(ql)?:\/\//i);
  });
});

describe('the guard', () => {
  it('reads now() once (the database tests replace it to try the time window) and refuses with nothing changed', () => {
    expect(GUARD.split('now()').length).toBe(2);
    expect(GUARD).toMatch(/if v_utc >= time '23:50' or v_utc < time '00:30' then/);
    for (const m of ['refused between 23:50 and 00:30 UTC', 'public.cards_catalog is missing (001 to 003 and 101 are not applied)',
      'cards_catalog already has the column part (102 is applied)', 'a player owns a card (cards_owned is not empty)',
      'a pack was opened (cards_packs is not empty)']) {
      expect(GUARD).toContain(`'ALL-099-115: ${m}`);
    }
    expect((GUARD.match(/raise exception/g) ?? []).length).toBe(5);
    expect((GUARD.match(/nothing changed/g) ?? []).length).toBe(5);
  });
});

describe('the 15 files, their rollbacks and 101 run inside one transaction', () => {
  const files = [...ORDER.map((f) => `${f}.sql`), ...ORDER.map((f) => `${f}.rollback.sql`), '101-catalog.sql'];
  it.each(files)('%s: one DO block, no temp table, no CONCURRENTLY, no transaction command, no psql meta-command', (file) => {
    const sql = readCards(file);
    const c = code(sql).trim();
    const tag = /^do (\$[a-z0-9_]+\$)\n/.exec(c)?.[1];
    expect(tag, 'starts with do $tag$').toBeTruthy();
    expect(c.endsWith(`end ${tag};`)).toBe(true);
    expect(c.split(tag!).length).toBe(3);
    const s = noStrings(sql);
    expect(s).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b|\binto\s+temp(orary)?\b/i);
    expect(s).not.toMatch(/\bconcurrently\b/i);
    expect(s).not.toMatch(/\b(commit|rollback|savepoint|abort|start\s+transaction|set\s+transaction|prepare\s+transaction)\b/i);
    expect(s).not.toMatch(/\bbegin\s+(work|transaction|isolation|read)\b/i);
    expect(code(sql)).not.toMatch(/^\s*\\/m);
  });
});

describe('ALL-rollback.sql', () => {
  it('is begin, the 15 rollbacks verbatim from 115 down to 099, 101 verbatim, commit', () => {
    const parts = [...[...ORDER].reverse().map((f) => readCards(`${f}.rollback.sql`)), readCards('101-catalog.sql')];
    let at = 0;
    let rest = ROLLBACK;
    for (const p of parts) {
      const i = ROLLBACK.indexOf(p, at);
      expect(i).toBeGreaterThan(at);
      at = i + p.length;
      rest = rest.replace(p, '');
    }
    expect(code(rest).replace(/\s+/g, ' ').trim()).toBe('begin; commit;');
    // 110's rollback gives 002's cards_recycle back WITH 002's grants (a security definer function: service_role only; Supabase grants a new
    // function to anon and authenticated by default)
    const f002 = readCards('002-functions.sql');
    const r110 = readCards('110-core.rollback.sql');
    for (const g of ['revoke all on function public.cards_recycle(uuid, timestamptz) from public, anon, authenticated;',
      'grant execute on function public.cards_recycle(uuid, timestamptz) to service_role;']) {
      expect(f002).toContain(g);
      expect(r110).toContain(g);
    }
  });
  it('108 accepts the cards_wallet of 002 (4 arguments) or of 104 (5 arguments): in the closed order it runs after 104', () => {
    const f108 = readCards('108-push.sql');
    expect(f108).toContain("to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer)') is null");
    expect(f108).toContain("to_regprocedure('public.cards_wallet(uuid, timestamptz, integer, integer, integer)') is null) then");
    expect(ORDER.indexOf('104-economy')).toBeLessThan(ORDER.indexOf('108-push'));
  });
});

describe('ALL-verify.sql', () => {
  const rows = [...VERIFY.matchAll(/^ {2}select (\d+) as n, '([^']+)' as fichier, '(line (\d+): (?:[^']|'')*)' as controle/gm)];

  it('has one row per Verify line of the 15 files, in the order of the bundle and of each file, then TOUT_OK', () => {
    const want = ORDER.flatMap((f) => verifyLines(readCards(`${f}.sql`)).map((v: { line: number }) => `${f}.sql ${v.line}`));
    expect(want.length).toBe(85);
    expect(rows.map((m) => `${m[2]} ${m[4]}`)).toEqual(want);
    expect(rows.map((m) => Number(m[1]))).toEqual(want.map((_, i) => i + 1));
    expect(VERIFY).toContain("select 86, 'ALL-099-115.sql', 'TOUT_OK', 'true', coalesce(bool_and(ok) and count(*) = 85, false)::text");
    expect(Object.values(CHECKS).flat().length).toBe(85);
  });

  it('is ONE statement, a SELECT', () => {
    const c = noStrings(VERIFY).replace(/\$q\$[\s\S]*?\$q\$/g, "''").trim();
    expect(c.startsWith('with\n')).toBe(true);
    expect(c.endsWith('order by n;')).toBe(true);
    expect(c.split(';').length).toBe(2);
    expect(c).toMatch(/\nselect fichier, controle, attendu, obtenu, ok from \(/);
  });

  it('writes nothing: no write, lock or DDL word, even in the queries it runs through query_to_xml', () => {
    const c = noStrings(VERIFY.replace(/\$q\$/g, ''));
    expect(c).not.toMatch(/\b(insert|update|delete|merge|truncate|copy|lock|create|alter|drop|grant|revoke|call|do|vacuum|analyze|notify|listen|refresh)\b/i);
    expect(c).not.toMatch(/\b(set_config|nextval|setval|pg_advisory\w*|dblink\w*|lo_\w+|pg_notify|pg_terminate_backend|pg_cancel_backend|for\s+update|for\s+share)\b/i);
    expect(c).not.toMatch(/\bset\s+\w/i);
  });

  it('calls only the files\' functions that read in every branch, and never cards_catalog_append (it inserts, updates and locks)', () => {
    const called = new Set([...noStrings(VERIFY).matchAll(/\bpublic\.(cards_\w+)\s*\(/g)].map((m) => m[1]));
    expect([...called].sort()).toEqual(['cards_prefs_get', 'cards_wallet', 'cards_week_progress']);
    expect(VERIFY).not.toMatch(/cards_catalog_append\s*\(\s*(true|false)?\s*\)/);
    // their bodies in the files (110, 105, 107) and those of what they call: declared stable, no write and no lock
    const body = (file: string, fn: string): string => {
      const sql = readCards(file);
      const a = sql.indexOf(`create or replace function public.${fn}(`);
      expect(a, `${fn} in ${file}`).toBeGreaterThan(0);
      const b = sql.indexOf('$f$;', a);
      return sql.slice(a, b);
    };
    const reads: Array<[string, string]> = [
      ['110-core.sql', 'cards_wallet'], ['110-core.sql', 'cards_roll'], ['110-core.sql', 'cards_pity_count'], ['104-economy.sql', 'cards_pity_pool'],
      ['104-economy.sql', 'cards_focus_used'], ['002-functions.sql', 'cards_bonus_plays'], ['105-goals.sql', 'cards_week_progress'],
      ['107-prefs.sql', 'cards_prefs_get'],
    ];
    for (const [file, fn] of reads) {
      const b = body(file, fn);
      expect(b, fn).toMatch(/\blanguage (plpgsql|sql) stable\b/);
      expect(noStrings(b), fn).not.toMatch(/\b(insert|update|delete|merge|truncate|lock|for\s+update|for\s+share|pg_advisory\w*|nextval|setval)\b/i);
    }
    // the functions cards_wallet of 110 calls are exactly those read above
    const calls = new Set([...body('110-core.sql', 'cards_wallet').matchAll(/public\.(cards_\w+)\(/g)].map((m) => m[1]));
    calls.delete('cards_wallet');
    expect([...calls].sort()).toEqual(['cards_bonus_plays', 'cards_focus_used', 'cards_pity_count', 'cards_pity_pool', 'cards_roll']);
    // cards_catalog_append writes in its other branch: that is why ALL-verify does not call it
    expect(noStrings(body('114-catalog-append.sql', 'cards_catalog_append'))).toMatch(/\block table\b[\s\S]*\binsert into\b[\s\S]*\bupdate\b/);
  });

  it('copies the lists of the files it reads (099, 099b, 103, 102 lines 30 and 31, 111)', () => {
    expect(VERIFY).toContain("('zico', 'idol', 0, 'Zico', 'Q7696122', true)");
    expect(VERIFY).toContain("('sistar', 'group', 0, 'Bora', 'Q5363925', false)");
    expect(VERIFY).toContain("('loona', 'Heejin')");
    expect(VERIFY).toContain("('purple-kiss', 'group', 2025, ");
    expect(VERIFY.slice(VERIFY.indexOf('l103 ('), VERIFY.indexOf('lot1 ('))).not.toContain("('tws', ");
    expect(VERIFY).toContain("(0, 'group:akmu')");
    expect(VERIFY).toContain("(58, 'zerobaseone', 'zerobaseone')");
    expect(VERIFY).toContain("('group:bts', 'boy')");
    expect((VERIFY.match(/^ {4}\('group:[a-z0-9-]+', '(girl|boy|mixed)'\)/gm) ?? []).length).toBe(41);
  });
});
