// SEO Mission 3, part D, point 2: the monthly check that the source URLs behind our facts still
// answer. A dead source is a fact that can no longer be verified (rulebook 5.5: a fact renders
// only with a visible, working source link).
//
// Where source URLs live (2026-10-15):
//   database  quiz_bank.questions[].source (the Team quiz bank, one source per question),
//             trivia.source_url (the stored facts, published ones), groups.official_website
//             (the official site, a level A source in docs/seo/KPOP-SOURCES.md).
//   code      the blind test playlists (lib/blind-test-curated.ts, one source per song) and the
//             links cited in articles (ARTICLE_SOURCE_URLS below; sources.test.ts fails when an
//             article cites a URL that is missing here).
// docs/seo/KPOP-SOURCES.md names source sites, not URLs, so it adds nothing to check.
//
// Politeness: a browser-compatible User-Agent naming the site, HEAD first (GET only when a server
// refuses HEAD or to confirm a 404), at most 6 requests at once and 2 per host, a 15 s timeout, one retry for a
// network error. Wikipedia pages (most of the sources) are not fetched one by one: their titles
// go to the MediaWiki API, 50 per request, one request per second, which also follows Wikipedia
// redirects. (A first dry run that fetched the pages two at a time drew 90 HTTP 429 answers.)
// Verdicts:
//   dead        404 or 410 after redirects, or the host no longer exists (DNS). Alerted.
//   unverified  anything else that is not a success (403 or 429 from a bot wall, 5xx, timeout).
//               Listed in the report, not alerted: it says nothing about the page itself.
//   ok          2xx after redirects.

import { KPDH_SONGS, TIKTOK_VIRAL } from '@/lib/blind-test-curated';

import { seoAlert } from './alert';
import { WATCH_USER_AGENT } from './env';
import { logWatchRun } from './runs';
import { serviceClientOrNull } from './store';

import type { AlertOutcome } from './alert';
import type { WatchRun } from './runs';
import type { Svc } from './store';

/** External links cited in article content (src/lib/articles/content). */
export const ARTICLE_SOURCE_URLS: ReadonlyArray<{ url: string; article: string }> = [
  { url: 'https://koreajoongangdaily.com/entertainment/factcheck-has-kpop-already-entered-its-fifth-generation/10480537', article: 'kpop-generations-explained' },
  { url: 'https://koreatimes.co.kr/entertainment/k-pop/20250131/japanese-girl-group-cosmosy-raises-questions-about-k-pops-generational-identity', article: 'kpop-generations-explained' },
  { url: 'https://www.sporcle.com/games/tags/kpop', article: 'best-kpop-quiz-sites-2026' },
  { url: 'https://www.soompi.com/category/quizzes', article: 'best-kpop-quiz-sites-2026' },
  { url: 'https://en.wikipedia.org/wiki/QuizUp', article: 'best-kpop-quiz-sites-2026' },
];

export type SourceUse = 'quiz_bank' | 'trivia' | 'group_site' | 'blindtest' | 'article';

export interface SourceEntry {
  url: string;
  /** Where the URL is used, with how many times. */
  uses: Partial<Record<SourceUse, number>>;
  /** A short human hint (a group name, an article slug), at most a few. */
  labels: string[];
}

/** Only absolute http(s) URLs, without the fragment (one page, one check). */
export function normalizeSourceUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const u = new URL(t);
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

export class SourceSet {
  private map = new Map<string, SourceEntry>();
  add(raw: unknown, use: SourceUse, label?: string): void {
    const url = normalizeSourceUrl(raw);
    if (!url) return;
    const e = this.map.get(url) ?? { url, uses: {}, labels: [] };
    e.uses[use] = (e.uses[use] ?? 0) + 1;
    if (label && e.labels.length < 3 && !e.labels.includes(label)) e.labels.push(label);
    this.map.set(url, e);
  }
  get size(): number { return this.map.size; }
  list(): SourceEntry[] { return [...this.map.values()].sort((a, b) => (a.url < b.url ? -1 : 1)); }
}

export function addCodeSources(set: SourceSet): void {
  for (const s of TIKTOK_VIRAL) set.add(s.source, 'blindtest', 'TikTok viral playlist');
  for (const s of KPDH_SONGS) set.add(s.source, 'blindtest', 'KPop Demon Hunters playlist');
  for (const a of ARTICLE_SOURCE_URLS) set.add(a.url, 'article', a.article);
}

/** The database sources. Throws on a read error (the job then reports it, never a false "all ok"). */
export async function addDbSources(set: SourceSet, svc: Svc): Promise<void> {
  const bank = await svc.from('quiz_bank').select('title, questions').in('status', ['published', 'scheduled']).limit(1000);
  if (bank.error) throw new Error(`quiz_bank: ${bank.error.message}`);
  for (const row of (bank.data ?? []) as Array<{ title: string; questions: unknown }>) {
    if (!Array.isArray(row.questions)) continue;
    for (const q of row.questions as Array<Record<string, unknown>>) set.add(q?.source, 'quiz_bank', row.title);
  }
  const trivia = await svc.from('trivia').select('source_url').eq('status', 'published').not('source_url', 'is', null).limit(1000);
  if (trivia.error) throw new Error(`trivia: ${trivia.error.message}`);
  for (const row of (trivia.data ?? []) as Array<{ source_url: string | null }>) set.add(row.source_url, 'trivia');
  const groups = await svc.from('groups').select('name, official_website').not('official_website', 'is', null).limit(1000);
  if (groups.error) throw new Error(`groups: ${groups.error.message}`);
  for (const row of (groups.data ?? []) as Array<{ name: string; official_website: string | null }>) set.add(row.official_website, 'group_site', row.name);
}

/** A Wikipedia article URL as (language host, title), or null. */
export function wikiTitle(url: string): { host: string; title: string } | null {
  try {
    const u = new URL(url);
    if (!/^[a-z-]+\.wikipedia\.org$/.test(u.hostname) || !u.pathname.startsWith('/wiki/') || u.search) return null;
    const title = decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ').trim();
    return title ? { host: u.hostname, title } : null;
  } catch {
    return null;
  }
}

/** The MediaWiki answer for one batch: title -> exists (true), missing (false). */
export function readWikiAnswer(titles: readonly string[], body: unknown): Map<string, boolean> {
  const q = (body as { query?: { normalized?: Array<{ from: string; to: string }>; redirects?: Array<{ from: string; to: string }>; pages?: Array<{ title: string; missing?: boolean; invalid?: boolean; pageid?: number }> } })?.query;
  const out = new Map<string, boolean>();
  if (!q?.pages) return out;
  const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
  const redir = new Map((q.redirects ?? []).map((r) => [r.from, r.to]));
  const pages = new Map(q.pages.map((p) => [p.title, p]));
  for (const t of titles) {
    const n = norm.get(t) ?? t;
    const final = redir.get(n) ?? n;
    const page = pages.get(final);
    if (!page) continue;
    out.set(t, !(page.missing || page.invalid) && typeof page.pageid === 'number');
  }
  return out;
}

export type WikiLookup = (host: string, titles: string[]) => Promise<Map<string, boolean>>;

export function makeWikiLookup(fetchImpl: typeof fetch = fetch, sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): WikiLookup {
  return async (host, titles) => {
    const out = new Map<string, boolean>();
    for (let i = 0; i < titles.length; i += 50) {
      if (i > 0) await sleep(1000);
      const batch = titles.slice(i, i + 50);
      const url = `https://${host}/w/api.php?action=query&format=json&formatversion=2&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`;
      // One retry for a refused batch (429 or 5xx), after Retry-After (5 to 30 s). Still refused:
      // the batch stays unknown, so its sources are unverified, never dead.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetchImpl(url, { headers: { 'user-agent': WATCH_USER_AGENT, accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
          if (res.ok) {
            for (const [t, ok] of readWikiAnswer(batch, await res.json())) out.set(t, ok);
            break;
          }
          const wait = Math.min(30, Math.max(5, Number(res.headers?.get?.('retry-after')) || 5));
          if (attempt === 0) await sleep(wait * 1000);
        } catch {
          if (attempt === 0) await sleep(5000);
        }
      }
    }
    return out;
  };
}

export type Verdict = 'ok' | 'dead' | 'unverified';

export interface Probe {
  status: number | null;
  /** A DNS failure: the host does not exist any more. */
  noHost?: boolean;
}

export function verdictOf(p: Probe): Verdict {
  if (p.noHost) return 'dead';
  if (p.status === 404 || p.status === 410) return 'dead';
  if (p.status !== null && p.status >= 200 && p.status < 300) return 'ok';
  return 'unverified';
}

export type ProbeFn = (url: string, method: 'HEAD' | 'GET') => Promise<Probe>;

/**
 * HEAD, then GET when HEAD is refused or fails, and GET again to confirm a 404 or 410 (some
 * servers answer 404 to every HEAD: newsroom.tiktok.com did on 2026-10-15). One retry after a
 * network error.
 */
export async function probeSource(url: string, probe: ProbeFn, sleep: (ms: number) => Promise<void>): Promise<Probe> {
  let p = await probe(url, 'HEAD');
  if (p.status === null || [400, 403, 404, 405, 406, 410, 429, 501].includes(p.status)) p = await probe(url, 'GET');
  if (p.status === null && !p.noHost) {
    await sleep(2000);
    p = await probe(url, 'GET');
  }
  return p;
}

export function makeProbe(timeoutMs = 15000, fetchImpl: typeof fetch = fetch): ProbeFn {
  return async (url, method) => {
    try {
      const res = await fetchImpl(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': WATCH_USER_AGENT, accept: 'text/html,*/*;q=0.8' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (method === 'GET') await res.body?.cancel().catch(() => undefined);
      return { status: res.status };
    } catch (err) {
      const code = (err as { cause?: { code?: string } })?.cause?.code;
      return { status: null, noHost: code === 'ENOTFOUND' };
    }
  };
}

function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

/**
 * Run `work` over the URLs with at most `limit` at once and `perHost` per host, stopping new
 * work at `deadline` (ms epoch). Returns the results in input order; unstarted ones are null.
 */
export async function runPolitely<T>(
  urls: readonly string[],
  work: (url: string) => Promise<T>,
  opts: { limit: number; perHost: number; deadline: number; now?: () => number },
): Promise<Array<T | null>> {
  const now = opts.now ?? Date.now;
  const results: Array<T | null> = urls.map(() => null);
  const pending = urls.map((u, i) => ({ u, i, host: hostOf(u) }));
  const inHost = new Map<string, number>();
  let active = 0;
  return new Promise((resolve) => {
    const pump = (): void => {
      if (now() >= opts.deadline) pending.length = 0;
      while (active < opts.limit) {
        const k = pending.findIndex((p) => (inHost.get(p.host) ?? 0) < opts.perHost);
        if (k < 0) break;
        const [job] = pending.splice(k, 1);
        active += 1;
        inHost.set(job!.host, (inHost.get(job!.host) ?? 0) + 1);
        work(job!.u)
          .then((r) => { results[job!.i] = r; })
          .catch(() => undefined)
          .finally(() => {
            active -= 1;
            inHost.set(job!.host, (inHost.get(job!.host) ?? 1) - 1);
            pump();
          });
      }
      if (active === 0 && (pending.length === 0 || now() >= opts.deadline)) resolve(results);
    };
    pump();
  });
}

export interface SourceReport {
  ok: boolean;
  dryRun: boolean;
  total: number;
  checked: number;
  notChecked: number;
  dead: Array<{ url: string; status: number | null; uses: SourceEntry['uses']; labels: string[] }>;
  unverified: Array<{ url: string; status: number | null }>;
  alert: AlertOutcome | 'none';
  error?: string;
}

export interface SourceDeps {
  collect(): Promise<SourceEntry[]>;
  probe: ProbeFn;
  wiki: WikiLookup;
  sleep(ms: number): Promise<void>;
  now(): number;
  alert(context: string, detail: string): Promise<AlertOutcome>;
  logRun(run: WatchRun): Promise<unknown>;
}

function usesText(uses: SourceEntry['uses']): string {
  return Object.entries(uses).map(([k, n]) => `${k} x${n}`).join(', ');
}

export async function runSourceCheck(deps: SourceDeps, opts: { dryRun: boolean; budgetMs: number }): Promise<SourceReport> {
  const report: SourceReport = { ok: true, dryRun: opts.dryRun, total: 0, checked: 0, notChecked: 0, dead: [], unverified: [], alert: 'none' };
  let entries: SourceEntry[];
  try {
    entries = await deps.collect();
  } catch (err) {
    report.ok = false;
    report.error = `collect failed: ${(err as Error).message}`;
    return report;
  }
  report.total = entries.length;
  const deadline = deps.now() + opts.budgetMs;

  // Wikipedia titles through the API, per language host.
  const wikiOf = new Map(entries.map((e) => [e.url, wikiTitle(e.url)]));
  const byHost = new Map<string, string[]>();
  for (const w of wikiOf.values()) if (w) byHost.set(w.host, [...new Set([...(byHost.get(w.host) ?? []), w.title])]);
  const wikiAnswers = new Map<string, Map<string, boolean>>();
  for (const [host, titles] of byHost) wikiAnswers.set(host, await deps.wiki(host, titles));

  const others = entries.filter((e) => !wikiOf.get(e.url));
  const probes = await runPolitely(others.map((e) => e.url), (u) => probeSource(u, deps.probe, deps.sleep), {
    limit: 6, perHost: 2, deadline, now: deps.now,
  });
  const probeOf = new Map(others.map((e, i) => [e.url, probes[i] ?? null]));

  for (const e of entries) {
    const w = wikiOf.get(e.url);
    let p: Probe | null;
    if (w) {
      const exists = wikiAnswers.get(w.host)?.get(w.title);
      p = exists === undefined ? { status: null } : { status: exists ? 200 : 404 };
    } else {
      p = probeOf.get(e.url) ?? null;
    }
    if (!p) { report.notChecked += 1; continue; }
    report.checked += 1;
    const v = verdictOf(p);
    if (v === 'dead') report.dead.push({ url: e.url, status: p.status, uses: e.uses, labels: e.labels });
    else if (v === 'unverified') report.unverified.push({ url: e.url, status: p.status });
  }
  report.ok = report.dead.length === 0;
  if (report.dead.length > 0) {
    const lines = report.dead.slice(0, 12).map((d) => `${d.url} (${d.status ?? 'no host'}; ${usesText(d.uses)}${d.labels.length ? `; ${d.labels.join(', ')}` : ''})`).join('; ');
    const more = report.dead.length > 12 ? ` (+${report.dead.length - 12} more)` : '';
    const tail = ` ${report.unverified.length} more could not be verified (bot walls, timeouts).${report.notChecked ? ` ${report.notChecked} not checked (time budget).` : ''}`;
    report.alert = opts.dryRun ? 'dry_run' : await deps.alert('sources', `${report.dead.length} dead fact sources of ${report.checked} checked: ${lines}${more}.${tail}`);
  }
  if (!opts.dryRun && (report.dead.length > 0 || report.notChecked > 0)) {
    await deps.logRun({
      kind: 'sources',
      ok: report.dead.length === 0,
      summary: `${report.dead.length} dead, ${report.unverified.length} unverified, ${report.checked} of ${report.total} checked`,
      detail: { dead: report.dead, unverified: report.unverified.slice(0, 50), notChecked: report.notChecked },
    });
  }
  return report;
}

export function productionSourceDeps(dryRun: boolean, svc: Svc | null = serviceClientOrNull()): SourceDeps {
  return {
    async collect() {
      const set = new SourceSet();
      addCodeSources(set);
      if (!svc) throw new Error('no service role client (SUPABASE_SERVICE_ROLE_KEY)');
      await addDbSources(set, svc);
      return set.list();
    },
    probe: makeProbe(),
    wiki: makeWikiLookup(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    now: () => Date.now(),
    alert: (context, detail) => seoAlert(context, detail, { dryRun }),
    logRun: (run) => logWatchRun(run, svc),
  };
}
