// KpopCards launch (owner, 2026-11-23): the figures behind the KpopCards tab of /admin on bunnyverse.org/anime. The page reads ONE database
// function, cards_admin_stats (docs/pending-migrations/cards/128-admin-stats.sql, applied by the owner), with the service role. This module is the
// pure part: the filters of the URL, the arguments of the call, the links of the sort and the pages, and the three states of the answer (ready, 128
// not applied, unreadable). No figure is made up here: a missing function is said plainly, never filled in.

export const STATS_PAGE_SIZE = 50;

/** The columns the database sorts by: the whitelist of the function, in the order the table shows them. */
export const STATS_SORTS = [
  'username', 'first_seen', 'last_seen', 'last_pack', 'level', 'packs', 'packs_7d', 'src_stock', 'src_focus', 'src_daily', 'src_shards', 'src_bonus', 'src_ad',
  'golden', 'guarantee', 'cards', 'pct', 'copies', 'dupes', 'shards', 'ads', 'crafted', 'recycled',
] as const;
export type StatsSort = (typeof STATS_SORTS)[number];
export const STATS_WINDOWS = [
  { value: 'all', label: 'All time' }, { value: '24h', label: 'Last 24 hours' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' },
] as const;
export type StatsWindow = (typeof STATS_WINDOWS)[number]['value'];
export const STATS_ADS = [{ value: 'any', label: 'Any' }, { value: 'yes', label: 'Watched ads' }, { value: 'no', label: 'No ads' }] as const;
export type StatsAds = (typeof STATS_ADS)[number]['value'];

export interface StatsQuery {
  q: string;
  window: StatsWindow;
  ads: StatsAds;
  min: number;
  sort: StatsSort;
  dir: 'asc' | 'desc';
  page: number;
}
export const DEFAULT_QUERY: StatsQuery = { q: '', window: 'all', ads: 'any', min: 0, sort: 'last_seen', dir: 'desc', page: 1 };

export interface StatsRow {
  username: string | null; first_seen: string; last_seen: string; last_pack: string | null; level: number; packs: number; packs_7d: number;
  src_stock: number; src_focus: number; src_daily: number; src_shards: number; src_bonus: number; src_ad: number; golden: number; guarantee: number;
  cards: number; cards_in_packs: number; pct: number; copies: number; dupes: number; shards: number; ads: number; crafted: number; recycled: number;
}
export interface StatsTotals {
  players: number; packs_total: number; packs_today: number; packs_7d: number; ads_total: number; ads_today: number; cards_in_packs: number; avg_pct: number;
}
export interface StatsAnswer { totals: StatsTotals; total: number; rows: StatsRow[]; limit: number; offset: number; at: string }

export type StatsResult =
  | { state: 'ready'; data: StatsAnswer }
  | { state: 'missing' }
  | { state: 'error' };

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string => (typeof v === 'string' ? v : '');

/** The filters named by the URL. An unknown or repeated value falls back to the default: nothing from the URL reaches the database unchecked. */
export function parseStatsQuery(params: Params | undefined): StatsQuery {
  const p = params ?? {};
  const q = first(p.q).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 64);
  const window = STATS_WINDOWS.find((w) => w.value === first(p.w))?.value ?? DEFAULT_QUERY.window;
  const ads = STATS_ADS.find((a) => a.value === first(p.ads))?.value ?? DEFAULT_QUERY.ads;
  const minRaw = /^\d{1,6}$/.test(first(p.min)) ? Number(first(p.min)) : 0;
  const sort = STATS_SORTS.find((s) => s === first(p.sort)) ?? DEFAULT_QUERY.sort;
  const dir = first(p.dir) === 'asc' ? 'asc' : first(p.dir) === 'desc' ? 'desc' : sort === 'username' ? 'asc' : DEFAULT_QUERY.dir;
  const page = /^\d{1,5}$/.test(first(p.page)) ? Math.max(1, Number(first(p.page))) : 1;
  return { q, window, ads, min: minRaw, sort, dir, page };
}

/** The arguments of cards_admin_stats for a query. */
export function statsArgs(query: StatsQuery): Record<string, string | number | null> {
  return {
    p_search: query.q === '' ? null : query.q, p_window: query.window, p_ads: query.ads, p_min_packs: query.min,
    p_sort: query.sort, p_dir: query.dir, p_limit: STATS_PAGE_SIZE, p_offset: (query.page - 1) * STATS_PAGE_SIZE,
  };
}

/** The link of this tab for a query: only what differs from the default is in the URL, so a bookmarked view stays short. */
export function statsHref(query: StatsQuery, change: Partial<StatsQuery> = {}): string {
  const n: StatsQuery = { ...query, ...change };
  const u = new URLSearchParams({ tab: 'cards-stats' });
  if (n.q !== '') u.set('q', n.q);
  if (n.window !== DEFAULT_QUERY.window) u.set('w', n.window);
  if (n.ads !== DEFAULT_QUERY.ads) u.set('ads', n.ads);
  if (n.min > 0) u.set('min', String(n.min));
  if (n.sort !== DEFAULT_QUERY.sort || n.dir !== DEFAULT_QUERY.dir) { u.set('sort', n.sort); u.set('dir', n.dir); }
  if (n.page > 1) u.set('page', String(n.page));
  return `/admin?${u.toString()}`;
}

/** The link of a column heading: the first click sorts it high to low (a name: A to Z), a second click flips it; the page goes back to 1. */
export function sortHref(query: StatsQuery, sort: StatsSort): string {
  const dir = query.sort === sort ? (query.dir === 'asc' ? 'desc' : 'asc') : sort === 'username' ? 'asc' : 'desc';
  return statsHref(query, { sort, dir, page: 1 });
}

export const pagesOf = (total: number): number => Math.max(1, Math.ceil(total / STATS_PAGE_SIZE));

/** The database says the function is not there: PostgREST's PGRST202 (not in the schema cache), Postgres' 42883 (undefined function). */
export function isMissingFunction(error: { code?: string | undefined; message?: string | undefined } | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /could not find the function|function .* does not exist/i.test(error.message ?? '');
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** The answer has the shape the page draws; anything else is "unreadable", never half drawn. */
export function isStatsAnswer(v: unknown): v is StatsAnswer {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<StatsAnswer>;
  const t = a.totals as Partial<StatsTotals> | undefined;
  return !!t && isNum(t.players) && isNum(t.packs_total) && isNum(t.packs_today) && isNum(t.packs_7d) && isNum(t.ads_total) && isNum(t.ads_today)
    && isNum(t.cards_in_packs) && isNum(t.avg_pct) && isNum(a.total) && Array.isArray(a.rows) && a.rows.every((r) => !!r && typeof r === 'object' && isNum((r as StatsRow).packs));
}

interface RpcClient { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> }

/** Calls the function. It never throws: an unreachable database or a changed answer is `error`, a function that is not there is `missing`. */
export async function loadCardsStats(db: () => RpcClient, query: StatsQuery): Promise<StatsResult> {
  try {
    const { data, error } = await db().rpc('cards_admin_stats', statsArgs(query));
    if (error) return isMissingFunction(error) ? { state: 'missing' } : { state: 'error' };
    return isStatsAnswer(data) ? { state: 'ready', data } : { state: 'error' };
  } catch {
    return { state: 'error' };
  }
}

export const fmtInt = (n: number): string => n.toLocaleString('en-US');
export const fmtPct = (n: number): string => `${n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
/** "2026-11-23 14:05" in UTC, or a dash-free "never". */
export function fmtWhen(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'never' : d.toISOString().slice(0, 16).replace('T', ' ');
}
