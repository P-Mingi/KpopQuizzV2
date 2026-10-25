import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertKpopRows, hasSiteColumn, kpopGroups, kpopLintContext, kpopOpenBank, kpopRows } from './kpop-scope';
import { buildLotSql } from './lot-sql';

import type { BankTable, ScopeDb, ScopeQuery, ScopeResult } from './kpop-scope';
import type { LotQuiz } from './lot-sql';

// Mission U lot 2 (owner, 2026-10-25): after the OtakuQuiz launch the database also holds anime
// rows; the daily bank tools must take kpopquiz.org's rows only, and a row of another site that
// gets through must fail the run.

type Row = Record<string, unknown>;
interface FakeOptions { siteColumn?: boolean; honourSiteFilter?: boolean; probeError?: { code?: string; message: string } }

/** An in-memory stand-in for the read side of the Supabase client: select, eq, in, order, range. */
function fakeDb(tables: Record<BankTable, Row[]>, opts: FakeOptions = {}): { db: ScopeDb; siteFilters: string[] } {
  const { siteColumn = true, honourSiteFilter = true } = opts;
  const siteFilters: string[] = [];
  const db: ScopeDb = {
    from(table: string) {
      return {
        select(columns: string) {
          const cols = columns.split(',').map((c) => c.trim());
          const filters: Array<(r: Row) => boolean> = [];
          let span: [number, number] = [0, Number.MAX_SAFE_INTEGER];
          const q: ScopeQuery = {
            eq(column, value) {
              if (column === 'site_id') siteFilters.push(`${table}=${String(value)}`);
              if (column !== 'site_id' || honourSiteFilter) filters.push((r) => r[column] === value);
              return q;
            },
            in(column, values) { filters.push((r) => values.includes(r[column] as string | number)); return q; },
            order() { return q; },
            range(from, to) { span = [from, to]; return q; },
            then<A = ScopeResult, B = never>(onOk?: ((v: ScopeResult) => A | PromiseLike<A>) | null, onErr?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
              let res: ScopeResult;
              if (cols.includes('site_id') && opts.probeError) res = { data: null, error: opts.probeError };
              else if (cols.includes('site_id') && !siteColumn) res = { data: null, error: { code: '42703', message: `column ${table}.site_id does not exist` } };
              else {
                const rows = (tables[table as BankTable] ?? []).filter((r) => filters.every((f) => f(r))).slice(span[0], span[1] + 1);
                res = { data: rows.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]]))), error: null };
              }
              return Promise.resolve(res).then(onOk, onErr);
            },
          };
          return q;
        },
      };
    },
  };
  return { db, siteFilters };
}

const q = (title: string): { title: string; questions: Array<{ question: string }> } => ({ title, questions: [{ question: `${title}?` }] });

// After Run O1: kpop and anime rows side by side in the same tables, including an anime group
// whose slug is not a kpop slug and an open anime bank row on a kpop lot date.
const mixed = (): Record<BankTable, Row[]> => ({
  groups: [
    { id: 1, slug: 'bts', name: 'BTS', site_id: 'kpop' },
    { id: 2, slug: 'treasure', name: 'TREASURE', site_id: 'kpop' },
    { id: 900, slug: 'one-piece', name: 'One Piece', site_id: 'anime' },
  ],
  quiz_bank: [
    { id: 'b1', ...q('BTS: The HYYH Era'), group_id: 1, category: 'era', scheduled_date: null, status: 'verified', site_id: 'kpop' },
    { id: 'b2', ...q('K-pop Virtual Idols'), group_id: null, category: 'fun', scheduled_date: '2026-11-12', status: 'published', site_id: 'kpop' },
    { id: 'a1', ...q('Grand Line Trivia'), group_id: 900, category: 'series', scheduled_date: '2026-11-13', status: 'verified', site_id: 'anime' },
  ],
  quizzes: [
    { id: 'q1', ...q('BTS True or False'), status: 'published', site_id: 'kpop' },
    { id: 'q2', ...q('BTS draft'), status: 'draft', site_id: 'kpop' },
    { id: 'q3', ...q('Naruto Endings'), status: 'published', site_id: 'anime' },
  ],
});

describe('kpop scope of the daily bank tools', () => {
  it('reads kpop rows only, filtered by the database on site_id', async () => {
    const { db, siteFilters } = fakeDb(mixed());
    const ctx = await kpopLintContext(db);
    expect(ctx.groups.map((g) => g.slug)).toEqual(['bts', 'treasure']);
    expect(ctx.bank.map((b) => b.title)).toEqual(['BTS: The HYYH Era', 'K-pop Virtual Idols']);
    expect(ctx.quizzes.map((x) => x.title)).toEqual(['BTS True or False']);
    expect((await kpopOpenBank(db)).map((r) => r.id)).toEqual(['b1']);
    expect(siteFilters).toEqual(expect.arrayContaining(['groups=kpop', 'quiz_bank=kpop', 'quizzes=kpop']));
    // site_id is read for the check, never handed on.
    expect(ctx.groups.every((g) => !('site_id' in g))).toBe(true);
  });

  it('fails when a row of another site gets past the filter', async () => {
    const { db } = fakeDb(mixed(), { honourSiteFilter: false });
    await expect(kpopLintContext(db)).rejects.toThrow(/another site \(anime\)/);
    await expect(kpopOpenBank(db)).rejects.toThrow(/quiz_bank: 1 row\(s\) of another site \(anime\)/);
    await expect(kpopGroups(db)).rejects.toThrow(/groups: 1 row\(s\) of another site \(anime\)/);
  });

  it('a row with no site value is not taken for a kpop row once the column exists', () => {
    expect(() => assertKpopRows('quiz_bank', [{ site_id: 'kpop' }, { site_id: null }], true)).toThrow(/another site \(null\)/);
    expect(() => assertKpopRows('quizzes', [{ title: 'x' }], true)).toThrow(/another site \(undefined\)/);
    expect(() => assertKpopRows('groups', [{ site_id: 'kpop' }], true)).not.toThrow();
  });

  it('before Run O1 (no site_id column) every row is a kpop row and nothing is filtered', async () => {
    const pre = mixed();
    for (const rows of Object.values(pre)) for (const r of rows) delete r.site_id;
    pre.groups = pre.groups.filter((g) => g.id !== 900);
    const { db, siteFilters } = fakeDb(pre, { siteColumn: false });
    expect(await hasSiteColumn(db, 'quiz_bank')).toBe(false);
    const ctx = await kpopLintContext(db);
    expect(ctx.bank).toHaveLength(3);
    expect(ctx.quizzes).toHaveLength(2);
    expect(siteFilters).toEqual([]);
  });

  it('a failed probe is never read as "no site column"', async () => {
    const { db } = fakeDb(mixed(), { probeError: { code: '57014', message: 'canceling statement due to statement timeout' } });
    await expect(kpopGroups(db)).rejects.toThrow(/cannot tell whether site_id exists/);
    const other = fakeDb(mixed(), { probeError: { code: '42703', message: 'column quiz_bank.sitee does not exist' } });
    await expect(kpopOpenBank(other.db)).rejects.toThrow(/cannot tell whether site_id exists/);
  });

  it('pages past the 1000-row cap and checks every page', async () => {
    const many = mixed();
    many.quizzes = Array.from({ length: 1500 }, (_, i) => ({ id: `k${i}`, ...q(`Quiz ${i}`), status: 'published', site_id: 'kpop' }));
    expect((await kpopRows(fakeDb(many).db, 'quizzes', 'title, questions', (x) => x.eq('status', 'published')))).toHaveLength(1500);
    many.quizzes.splice(1200, 0, { id: 'a', ...q('Anime 1200'), status: 'published', site_id: 'anime' });
    await expect(kpopRows(fakeDb(many, { honourSiteFilter: false }).db, 'quizzes', 'title, questions')).rejects.toThrow(/another site/);
  });

  it('a lot can only link a kpop group: an anime slug is an unknown slug for the SQL', async () => {
    const idOf = new Map((await kpopGroups(fakeDb(mixed()).db)).map((g) => [g.slug, g.id]));
    const quiz = (group_slug: string | null): LotQuiz => ({
      scheduled_date: '2026-11-13', title: 'T', description: 'D', group_slug, category: 'group_specific', quiz_type: 'true_false', difficulty: 'easy',
      questions: [{ question: 'S.', correct: true, fun_fact: 'F', source: 'https://en.wikipedia.org/wiki/X' }],
    });
    expect(() => buildLotSql('2', [quiz('one-piece')], idOf)).toThrow(/unknown kpop group slug one-piece/);
    expect(buildLotSql('2', [quiz('treasure')], idOf).sql).toContain("'T', 'D', 2, ");
  });

  it('every database read of the bank scripts goes through the kpop scope', () => {
    const dir = join(__dirname, '../../../scripts/daily-bank');
    const files = readdirSync(dir).filter((f) => f.endsWith('.mts'));
    expect(files).toEqual(expect.arrayContaining(['lib.mts', 'lint-lot.mts', 'simulate.mts', 'to-sql.mts']));
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8');
      // No bare table read: a .from() or .rpc() call would skip the site filter.
      expect(src, f).not.toMatch(/\.(from|rpc)\(\s*['"`]/);
      if (f !== 'lib.mts' && /readClient\(/.test(src)) expect(src, f).toMatch(/from '\.\.\/\.\.\/src\/lib\/daily-bank\/kpop-scope'/);
    }
  });
});
