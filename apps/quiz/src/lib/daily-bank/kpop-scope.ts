// The daily quiz bank tools (scripts/daily-bank: lint, dry run, SQL) prepare lots for
// kpopquiz.org only (Mission U lot 2, owner 2026-10-25). Run O1 adds a site_id column to groups,
// quiz_bank and quizzes (multisite 002a, default 'kpop') and then loads anime rows into the same
// tables. Every database read of the tools goes through kpopRows: the database filters on
// site_id = 'kpop', then each row is checked again, so a row of another site stops the run
// instead of reaching a lint, a dry run or a lot's SQL. Before 002a the column does not exist and
// every row is a kpop row.

export const BANK_SITE = 'kpop';

/** The tables the tools read. Each one gets site_id in Run O1. */
export type BankTable = 'groups' | 'quiz_bank' | 'quizzes';

export interface ScopeError { code?: string; message: string }
export interface ScopeResult { data: unknown[] | null; error: ScopeError | null }
export interface ScopeQuery extends PromiseLike<ScopeResult> {
  eq(column: string, value: string | number | boolean): ScopeQuery;
  in(column: string, values: readonly (string | number)[]): ScopeQuery;
  order(column: string, options?: { ascending?: boolean }): ScopeQuery;
  range(from: number, to: number): ScopeQuery;
}
/** The part of a Supabase client the tools use (read only). */
export interface ScopeDb { from(table: string): { select(columns: string): ScopeQuery } }

const PAGE = 1000;

/**
 * Does `table` carry the site_id column? Only Postgres's "column does not exist" (42703) about
 * site_id means no; any other error stops the run, so a failed probe never reads as "no column".
 */
export async function hasSiteColumn(db: ScopeDb, table: BankTable): Promise<boolean> {
  const { error } = await db.from(table).select('site_id').range(0, 0);
  if (!error) return true;
  if (error.code === '42703' && /site_id/.test(error.message)) return false;
  throw new Error(`${table}: cannot tell whether site_id exists (${error.message})`);
}

/**
 * Throws when a row of another site is in `rows`. With the column, a row passes only when its
 * site_id is exactly 'kpop' (a missing value fails too); without it, every row is a kpop row.
 */
export function assertKpopRows(table: BankTable, rows: readonly unknown[], scoped: boolean): void {
  if (!scoped) return;
  const other = rows.filter((r) => (r as { site_id?: unknown }).site_id !== BANK_SITE);
  if (other.length === 0) return;
  const sites = [...new Set(other.map((r) => String((r as { site_id?: unknown }).site_id)))].join(', ');
  throw new Error(`${table}: ${other.length} row(s) of another site (${sites}) reached the kpop bank tools; stopped`);
}

/**
 * Every kpopquiz.org row of `table`: `columns` plus the filters of `refine`, paged by id past the
 * 1000-row cap, filtered on site_id = 'kpop' and checked row by row. The rows come back without
 * site_id.
 */
export async function kpopRows<T>(db: ScopeDb, table: BankTable, columns: string, refine: (q: ScopeQuery) => ScopeQuery = (q) => q): Promise<T[]> {
  const scoped = await hasSiteColumn(db, table);
  const out: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from(table).select(scoped ? `${columns}, site_id` : columns);
    if (scoped) q = q.eq('site_id', BANK_SITE);
    const { data, error } = await refine(q).order('id').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = data ?? [];
    assertKpopRows(table, rows, scoped);
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out.map((r) => {
    const { site_id: _site, ...rest } = r as Record<string, unknown>;
    return rest as T;
  });
}

export interface BankGroup { id: number; slug: string; name: string }
export interface BankQuiz { title: string; questions: Array<{ question?: string }> }
export interface OpenBankRow { id: string; title: string; group_id: number | null; category: string; scheduled_date: string | null; status: string }

/** The kpop groups (slug to id for a lot, names for the topic check). */
export const kpopGroups = (db: ScopeDb): Promise<BankGroup[]> => kpopRows<BankGroup>(db, 'groups', 'id, slug, name');

/** What a new lot is checked against: the kpop groups, every kpop bank row and every published kpop quiz. */
export async function kpopLintContext(db: ScopeDb): Promise<{ groups: BankGroup[]; bank: BankQuiz[]; quizzes: BankQuiz[] }> {
  const [groups, bank, quizzes] = await Promise.all([
    kpopGroups(db),
    kpopRows<BankQuiz>(db, 'quiz_bank', 'title, questions'),
    kpopRows<BankQuiz>(db, 'quizzes', 'title, questions', (q) => q.eq('status', 'published')),
  ]);
  return { groups, bank, quizzes };
}

/** The kpop bank rows the rotation can still publish (verified or scheduled). */
export const kpopOpenBank = (db: ScopeDb): Promise<OpenBankRow[]> =>
  kpopRows<OpenBankRow>(db, 'quiz_bank', 'id, title, group_id, category, scheduled_date, status', (q) => q.in('status', ['verified', 'scheduled']));

/**
 * A SQL condition true only for kpop rows of `alias`, before and after 002a: to_jsonb of the row
 * has no site_id key until the column exists, and then the row must say 'kpop'.
 */
export const kpopRowSql = (alias: string): string => `coalesce(to_jsonb(${alias}) ->> 'site_id', '${BANK_SITE}') = '${BANK_SITE}'`;
