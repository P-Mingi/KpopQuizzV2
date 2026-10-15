// Gather what the Monday e-mail needs (SEO Mission 3, part C): the weekly rows (through the
// read views of docs/pending-migrations/seo-weekly-data.sql), the Bing links, the status of the
// nightly checks (GitHub Actions, seo-gates.yml), the IndexNow alerts (part A's table), the
// URLs that received a link (are they still 200 or 301?), TARGETS.md and CALENDAR.md.
//
// Each source fails soft on its own: a missing table, an unreadable GitHub answer or an absent
// doc becomes a status the report prints under "Non branché", never a crash.

import { MissingTableError, isMissingTable } from './store';
import { parseTargets } from './targets';
import { parseCalendar } from './calendar';
import { NIGHTLY_STALE_DAYS, NEW_QUERY_MIN_IMPRESSIONS } from './report';
import { addDays } from './weeks';

import type { Engine, EngineStatus, EngineWeeks, PageAgg, QueryAgg, QueryPageAgg, WeeklyInput } from './report';
import type { FetchLike } from './google-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LinkRecord {
  targetUrl: string;
  sourceDomain: string;
  firstSeen: string;
}

export interface RunRecord {
  source: 'gsc' | 'bing' | 'report';
  status: 'ok' | 'skipped' | 'error';
  detail: string;
  ranAt: string;
}

/** The reads of the report. Each method throws MissingTableError when its table is not there. */
export interface WeeklyReader {
  /** The two most recent weeks with rows, newest first. */
  latestWeeks(engine: Engine): Promise<string[]>;
  pages(engine: Engine, week: string): Promise<PageAgg[]>;
  queries(engine: Engine, week: string): Promise<QueryAgg[]>;
  queryPages(engine: Engine, week: string, queries: string[]): Promise<QueryPageAgg[]>;
  /** Which of these queries have rows in [fromWeek, beforeWeek). */
  queriesSeen(engine: Engine, queries: string[], fromWeek: string, beforeWeek: string): Promise<Set<string>>;
  links(): Promise<LinkRecord[]>;
  lastRuns(sinceIso: string): Promise<RunRecord[]>;
  /** Part A: IndexNow alert events since that time. */
  indexnowAlerts(sinceIso: string): Promise<number>;
}

/** Candidate queries for the query x page and "seen before" reads (by impressions). */
export const CANDIDATE_QUERIES = 100;
/** Queries whose URLs are compared for cannibalisation, from this many impressions. */
export const CANNIBAL_QUERY_MIN_IMPRESSIONS = 20;
/** Linked URLs checked for a 200 or 301 each Monday. */
export const LINKED_URLS_CHECKED = 40;

type Rows = { data: unknown[] | null; error: { code?: string; message?: string } | null };

async function pageAll<T>(table: string, make: (from: number, to: number) => PromiseLike<Rows>, cap = 20_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) {
      if (isMissingTable(error)) throw new MissingTableError(table);
      throw new Error(`${table}: ${error.code ?? ''} ${error.message ?? ''}`.trim());
    }
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export function supabaseWeeklyReader(db: SupabaseClient): WeeklyReader {
  return {
    async latestWeeks(engine) {
      const table = engine === 'google' ? 'seo_gsc_weekly' : 'seo_bing_weekly';
      const weeks: string[] = [];
      let before: string | null = null;
      for (let i = 0; i < 2; i++) {
        let qb = db.from(table).select('week_start');
        if (engine === 'bing') qb = qb.eq('kind', 'page');
        if (before) qb = qb.lt('week_start', before);
        const { data, error } = await qb.order('week_start', { ascending: false }).limit(1);
        if (error) {
          if (isMissingTable(error)) throw new MissingTableError(table);
          throw new Error(`${table}: ${error.code ?? 'read failed'}`);
        }
        const w = (data?.[0] as { week_start?: string } | undefined)?.week_start;
        if (!w) break;
        weeks.push(w);
        before = w;
      }
      return weeks;
    },
    pages(engine, week) {
      return pageAll<PageAgg>('seo_weekly_pages', (f, t) => db.from('seo_weekly_pages').select('page, clicks, impressions').eq('engine', engine).eq('week_start', week).order('page').range(f, t));
    },
    queries(engine, week) {
      return pageAll<QueryAgg>('seo_weekly_queries', (f, t) => db.from('seo_weekly_queries').select('query, clicks, impressions').eq('engine', engine).eq('week_start', week).order('query').range(f, t));
    },
    async queryPages(engine, week, queries) {
      const out: QueryPageAgg[] = [];
      for (const part of chunks(queries, 50)) {
        out.push(...(await pageAll<QueryPageAgg>('seo_weekly_query_pages', (f, t) => db.from('seo_weekly_query_pages').select('query, page, clicks, impressions').eq('engine', engine).eq('week_start', week).in('query', part).order('query').range(f, t))));
      }
      return out;
    },
    async queriesSeen(engine, queries, fromWeek, beforeWeek) {
      const seen = new Set<string>();
      for (const part of chunks(queries, 50)) {
        const rows = await pageAll<{ query: string }>('seo_weekly_queries', (f, t) => db.from('seo_weekly_queries').select('query').eq('engine', engine).gte('week_start', fromWeek).lt('week_start', beforeWeek).in('query', part).order('query').range(f, t));
        for (const r of rows) seen.add(r.query);
      }
      return seen;
    },
    async links() {
      const rows = await pageAll<{ target_url: string; source_domain: string; first_seen: string }>('seo_bing_links', (f, t) => db.from('seo_bing_links').select('target_url, source_domain, first_seen').order('id').range(f, t));
      return rows.map((r) => ({ targetUrl: r.target_url, sourceDomain: r.source_domain, firstSeen: r.first_seen }));
    },
    async lastRuns(sinceIso) {
      const rows = await pageAll<{ source: RunRecord['source']; status: RunRecord['status']; detail: string; ran_at: string }>('seo_weekly_runs', (f, t) => db.from('seo_weekly_runs').select('source, status, detail, ran_at').gte('ran_at', sinceIso).order('ran_at', { ascending: false }).range(f, t), 1000);
      return rows.map((r) => ({ source: r.source, status: r.status, detail: r.detail, ranAt: r.ran_at }));
    },
    async indexnowAlerts(sinceIso) {
      // A GET with a count, not a HEAD: a HEAD on a missing table answers without the error
      // code, and "0 alerts" would then hide that part A is not installed.
      const { count, error } = await db.from('seo_indexnow_events').select('id', { count: 'exact' }).eq('kind', 'alert').gte('created_at', sinceIso).limit(1);
      if (error) {
        if (isMissingTable(error)) throw new MissingTableError('seo_indexnow_events');
        throw new Error(`seo_indexnow_events: ${error.code ?? 'read failed'}`);
      }
      return count ?? 0;
    },
  };
}

/** The GitHub repository ("owner/name"): SEO_GITHUB_REPO, else the repository Vercel deploys from. */
export function githubRepo(env: Record<string, string | undefined>): string | null {
  const explicit = (env.SEO_GITHUB_REPO ?? '').trim();
  if (/^[\w.-]+\/[\w.-]+$/.test(explicit)) return explicit;
  const owner = (env.VERCEL_GIT_REPO_OWNER ?? '').trim();
  const slug = (env.VERCEL_GIT_REPO_SLUG ?? '').trim();
  return owner && slug ? `${owner}/${slug}` : null;
}

export function nightlyRunsUrl(repo: string): string {
  return `https://api.github.com/repos/${repo}/actions/workflows/seo-gates.yml/runs?branch=main&event=schedule&status=completed&per_page=1`;
}

/** The latest scheduled run of seo-gates.yml on main, from the GitHub API answer. */
export function parseNightly(json: unknown, today: string): WeeklyInput['nightly'] {
  const runs = json && typeof json === 'object' ? (json as { workflow_runs?: unknown }).workflow_runs : null;
  if (!Array.isArray(runs)) return { status: 'unknown' };
  const run = runs[0] as { conclusion?: unknown; created_at?: unknown; html_url?: unknown } | undefined;
  if (!run) return { status: 'unknown' };
  const date = typeof run.created_at === 'string' ? run.created_at.slice(0, 10) : undefined;
  const url = typeof run.html_url === 'string' && run.html_url.startsWith('https://github.com/') ? run.html_url : undefined;
  if (date && date < addDays(today, -NIGHTLY_STALE_DAYS)) return { status: 'stale', date, url };
  if (run.conclusion === 'success') return { status: 'success', date, url };
  if (typeof run.conclusion === 'string') return { status: 'failure', date, url };
  return { status: 'unknown' };
}

export async function fetchNightly(env: Record<string, string | undefined>, today: string, fetchImpl: FetchLike): Promise<WeeklyInput['nightly']> {
  const repo = githubRepo(env);
  if (!repo) return { status: 'unknown' };
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'Mozilla/5.0' };
  const token = (env.SEO_GITHUB_TOKEN ?? '').trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetchImpl(nightlyRunsUrl(repo), { method: 'GET', headers });
    if (res.status !== 200) return { status: 'unknown' };
    return parseNightly(await res.json(), today);
  } catch {
    return { status: 'unknown' };
  }
}

/**
 * Our URLs that received a link: each should answer 200, or a 301/308 (rulebook 13.5). Checked
 * with a plain GET, no redirect followed, a generic user agent, five at a time.
 */
export async function checkLinkedUrls(urls: string[], fetchImpl: FetchLike, siteHost = 'kpopquiz.org'): Promise<Array<{ url: string; status: string }>> {
  const ours = [...new Set(urls)].filter((u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, '') === siteHost;
    } catch {
      return false;
    }
  }).slice(0, LINKED_URLS_CHECKED);
  const problems: Array<{ url: string; status: string }> = [];
  for (const part of chunks(ours, 5)) {
    await Promise.all(part.map(async (url) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetchImpl(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal, redirect: 'manual' });
        if (![200, 301, 308].includes(res.status)) problems.push({ url, status: String(res.status) });
      } catch {
        problems.push({ url, status: 'sans réponse' });
      } finally {
        clearTimeout(timer);
      }
    }));
  }
  return problems;
}

/** New referring domains: first seen on the latest pull Monday, and never before it. */
export function linkSummary(links: LinkRecord[]): WeeklyInput['links'] {
  if (links.length === 0) return { status: 'ok', totalDomains: 0, newDomains: [], firstPull: false };
  const firstByDomain = new Map<string, string>();
  for (const l of links) {
    const prev = firstByDomain.get(l.sourceDomain);
    if (!prev || l.firstSeen < prev) firstByDomain.set(l.sourceDomain, l.firstSeen);
  }
  const latest = [...firstByDomain.values()].reduce((m, d) => (d > m ? d : m), '');
  const earliest = [...firstByDomain.values()].reduce((m, d) => (d < m ? d : m), latest);
  const newDomains = [...firstByDomain.entries()].filter(([, d]) => d === latest).map(([dom]) => dom).sort();
  return { status: 'ok', totalDomains: firstByDomain.size, newDomains, firstPull: earliest === latest };
}

export interface GatherDeps {
  reader: WeeklyReader | null;
  env: Record<string, string | undefined>;
  today: string;
  fetchImpl: FetchLike;
  readTargets: () => Promise<string | null>;
  readCalendar: () => Promise<string | null>;
  siteUrl?: string;
}

async function engineWeeks(reader: WeeklyReader | null, engine: Engine, hasKey: boolean, runs: RunRecord[]): Promise<EngineWeeks> {
  const empty = (status: EngineStatus, detail?: string): EngineWeeks => ({ engine, status, detail, current: null, previous: null, seenBefore: null });
  if (!reader) return empty(hasKey ? 'no_table' : 'no_key');
  const lastRun = runs.find((r) => r.source === (engine === 'google' ? 'gsc' : 'bing'));
  const runError = lastRun?.status === 'error' ? lastRun.detail : undefined;
  try {
    const weeks = await reader.latestWeeks(engine);
    if (weeks.length === 0) return empty(runError ? 'error' : hasKey ? 'no_data' : 'no_key', runError);
    const [w1, w0] = weeks;
    const [pages, queries] = await Promise.all([reader.pages(engine, w1!), reader.queries(engine, w1!)]);
    const previous = w0 ? { week: w0, pages: await reader.pages(engine, w0), queries: await reader.queries(engine, w0) } : null;
    const byImpr = [...queries].sort((a, b) => b.impressions - a.impressions);
    const cannibal = byImpr.filter((r) => r.impressions >= CANNIBAL_QUERY_MIN_IMPRESSIONS).slice(0, CANDIDATE_QUERIES).map((r) => r.query);
    const fresh = byImpr.filter((r) => r.impressions >= NEW_QUERY_MIN_IMPRESSIONS).slice(0, CANDIDATE_QUERIES).map((r) => r.query);
    const queryPages = cannibal.length > 0 ? await reader.queryPages(engine, w1!, cannibal) : [];
    const seenBefore = fresh.length > 0 ? await reader.queriesSeen(engine, fresh, addDays(w1!, -28), w1!) : new Set<string>();
    // Rows are there: the report uses them even if the last pull ended with an error.
    return { engine, status: 'ok', current: { week: w1!, pages, queries, queryPages }, previous, seenBefore };
  } catch (e) {
    if (e instanceof MissingTableError) return empty('no_table');
    return empty('error', (e as Error).message.slice(0, 120));
  }
}

export async function gatherWeeklyInput(deps: GatherDeps): Promise<WeeklyInput> {
  const { reader, env, today, fetchImpl } = deps;
  const since = `${addDays(today, -8)}T00:00:00Z`;
  let runs: RunRecord[] = [];
  if (reader) {
    try {
      runs = await reader.lastRuns(since);
    } catch {
      runs = [];
    }
  }
  const [google, bing] = await Promise.all([
    engineWeeks(reader, 'google', Boolean((env.GSC_SERVICE_ACCOUNT_JSON ?? '').trim()), runs),
    engineWeeks(reader, 'bing', Boolean((env.BING_WEBMASTER_API_KEY ?? '').trim()), runs),
  ]);

  let links: WeeklyInput['links'] = { status: (env.BING_WEBMASTER_API_KEY ?? '').trim() ? 'no_table' : 'no_key', totalDomains: 0, newDomains: [], firstPull: false };
  let linkedUrlProblems: WeeklyInput['linkedUrlProblems'] = null;
  if (reader) {
    try {
      const all = await reader.links();
      links = all.length === 0 && !(env.BING_WEBMASTER_API_KEY ?? '').trim() ? { ...links, status: 'no_key' } : linkSummary(all);
      if (all.length > 0) linkedUrlProblems = await checkLinkedUrls(all.map((l) => l.targetUrl), fetchImpl);
    } catch (e) {
      links = { ...links, status: e instanceof MissingTableError ? 'no_table' : 'error' };
    }
  }

  let indexnowAlerts: number | null = null;
  if (reader) {
    try {
      indexnowAlerts = await reader.indexnowAlerts(`${addDays(today, -7)}T00:00:00Z`);
    } catch {
      indexnowAlerts = null;
    }
  }

  const [targetsMd, calendarMd, nightly] = await Promise.all([deps.readTargets(), deps.readCalendar(), fetchNightly(env, today, fetchImpl)]);
  const targets = targetsMd ? parseTargets(targetsMd) : null;
  return {
    today,
    engines: [google, bing],
    links,
    linkedUrlProblems,
    nightly,
    indexnowAlerts,
    targets: targets && targets.length > 0 ? targets : null,
    calendar: calendarMd ? parseCalendar(calendarMd) : null,
    partnerLog: false,
    siteUrl: deps.siteUrl ?? 'https://kpopquiz.org',
  };
}
