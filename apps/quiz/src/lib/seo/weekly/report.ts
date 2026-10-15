// The Monday e-mail's content, computed from the weekly data (SEO Mission 3, part C). Pure:
// the input is gathered by report-data.ts (database, GitHub, the two docs) and the output is
// rendered by email.ts. At most 15 lines, in simple French, to the owner only.
//
// Every number comes from the weekly tables (Search Console and Bing rows, summed) or from a
// count read the same day; the thresholds that decide what is worth a line are below, named.

import { clusterMatcher } from './targets';
import { upcomingEvents } from './calendar';
import { addDays, mondayOf, shortDateFr } from './weeks';

import type { CalendarEvent } from './calendar';
import type { TargetCluster } from './targets';

export type Engine = 'google' | 'bing';
export const ENGINE_LABEL: Record<Engine, string> = { google: 'Google', bing: 'Bing' };

export interface PageAgg {
  page: string;
  clicks: number;
  impressions: number;
}
export interface QueryAgg {
  query: string;
  clicks: number;
  impressions: number;
}
export interface QueryPageAgg {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
}

export type EngineStatus = 'ok' | 'no_key' | 'no_table' | 'no_data' | 'error';

export interface EngineWeeks {
  engine: Engine;
  status: EngineStatus;
  /** The last pull's error, short, when there was one. */
  detail?: string | undefined;
  current: { week: string; pages: PageAgg[]; queries: QueryAgg[]; queryPages: QueryPageAgg[] } | null;
  previous: { week: string; pages: PageAgg[]; queries: QueryAgg[] } | null;
  /** Current-week queries that also showed in the 4 weeks before (to tell the new ones). */
  seenBefore: Set<string> | null;
}

export interface WeeklyInput {
  today: string;
  engines: EngineWeeks[];
  links: { status: 'ok' | 'no_key' | 'no_table' | 'error'; totalDomains: number; newDomains: string[]; firstPull: boolean };
  /** Our URLs that received a link (Bing) and no longer answer 200 or 301/308. Null: not checked. */
  linkedUrlProblems: Array<{ url: string; status: string }> | null;
  nightly: { status: 'success' | 'failure' | 'stale' | 'unknown'; date?: string | undefined; url?: string | undefined };
  /** IndexNow alerts of the last 7 days (part A). Null when that table is not there. */
  indexnowAlerts: number | null;
  targets: TargetCluster[] | null;
  calendar: CalendarEvent[] | null;
  /** Whether embeds log their partner= visits somewhere. Today nothing does. */
  partnerLog: boolean;
  siteUrl: string;
}

// Thresholds (each one a named rule, so a line in the e-mail can be traced back).
/** A page of the top 20 is a red line when its clicks fall by more than this share... */
export const DROP_RED_LINE = 0.3;
/** ...and it had at least this many clicks the week before (below, a fall is noise). */
export const DROP_MIN_CLICKS = 20;
/** Pages ranked for the red line, by clicks of the week before. */
export const TOP_PAGES = 20;
/** Smallest click change listed under "Hausses" or "Baisses". */
export const MOVE_MIN_CLICKS = 5;
/** Cannibalisation: each URL needs this many impressions on the query... */
export const CANNIBAL_MIN_IMPRESSIONS = 10;
/** ...and this share of the query's impressions. */
export const CANNIBAL_MIN_SHARE = 0.1;
/** A new query is listed from this many impressions in the week. */
export const NEW_QUERY_MIN_IMPRESSIONS = 30;
/** A page enters the refresh list from this many clicks lost (all engines). */
export const REFRESH_MIN_LOSS = 3;
/** The nightly checks count as stale after this many days without a scheduled run. */
export const NIGHTLY_STALE_DAYS = 3;

export const MAX_LINES = 15;

export interface ReportLine {
  text: string;
  red?: boolean;
}

export interface ReportModel {
  subject: string;
  lines: ReportLine[];
  redCount: number;
}

/** A URL as a path ("/bts-quiz"): no host, no query string, no fragment, no trailing slash. */
export function pathOf(url: string): string {
  let p = url;
  try {
    const u = new URL(url);
    p = u.pathname;
  } catch {
    p = url.split('#')[0]!.split('?')[0]!;
  }
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

/** Thousands with a plain space, as written in French ("12 345"). */
export function fr(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const signed = (n: number): string => (n > 0 ? `+${fr(n)}` : n < 0 ? `-${fr(-n)}` : '0');

function pct(cur: number, prev: number): string {
  if (prev <= 0) return '';
  const p = Math.round(((cur - prev) / prev) * 100);
  return ` (${p > 0 ? '+' : ''}${p} %)`;
}

function byPath(pages: PageAgg[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of pages) {
    const k = pathOf(p.page);
    m.set(k, (m.get(k) ?? 0) + p.clicks);
  }
  return m;
}

function byQuery(rows: QueryAgg[]): Map<string, QueryAgg> {
  const m = new Map<string, QueryAgg>();
  for (const r of rows) {
    const k = r.query.trim().toLowerCase();
    if (!k) continue;
    const a = m.get(k) ?? { query: k, clicks: 0, impressions: 0 };
    a.clicks += r.clicks;
    a.impressions += r.impressions;
    m.set(k, a);
  }
  return m;
}

const q = (s: string): string => `"${s.length > 50 ? `${s.slice(0, 49)}...` : s}"`;

function joinMax(items: string[], max: number): string {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return shown.join(', ') + (more > 0 ? ` et ${more} autre${more > 1 ? 's' : ''}` : '');
}

/** Top-20 pages whose clicks fell by more than 30 % (see the thresholds). */
export function pageDrops(e: EngineWeeks): Array<{ path: string; prev: number; cur: number; pct: number }> {
  if (!e.current || !e.previous) return [];
  const cur = byPath(e.current.pages);
  const prev = byPath(e.previous.pages);
  const top = [...prev.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_PAGES);
  const out: Array<{ path: string; prev: number; cur: number; pct: number }> = [];
  for (const [path, p] of top) {
    if (p < DROP_MIN_CLICKS) continue;
    const c = cur.get(path) ?? 0;
    if (c < p * (1 - DROP_RED_LINE)) out.push({ path, prev: p, cur: c, pct: Math.round(((p - c) / p) * 100) });
  }
  return out.sort((a, b) => b.prev - b.cur - (a.prev - a.cur));
}

/** Query click changes of one engine, biggest first. */
export function queryMoves(e: EngineWeeks): Array<{ query: string; delta: number; engine: Engine }> {
  if (!e.current || !e.previous) return [];
  const cur = byQuery(e.current.queries);
  const prev = byQuery(e.previous.queries);
  const keys = new Set([...cur.keys(), ...prev.keys()]);
  const out: Array<{ query: string; delta: number; engine: Engine }> = [];
  for (const k of keys) {
    const delta = (cur.get(k)?.clicks ?? 0) - (prev.get(k)?.clicks ?? 0);
    if (Math.abs(delta) >= MOVE_MIN_CLICKS) out.push({ query: k, delta, engine: e.engine });
  }
  return out;
}

/** Queries of a TARGETS.md cluster where two or more URLs share the impressions. */
export function cannibalisation(e: EngineWeeks, targets: TargetCluster[]): Array<{ query: string; paths: string[]; impressions: number; engine: Engine }> {
  if (!e.current) return [];
  const match = clusterMatcher(targets);
  const byQ = new Map<string, Map<string, number>>();
  for (const r of e.current.queryPages) {
    const k = r.query.trim().toLowerCase();
    const pages = byQ.get(k) ?? new Map<string, number>();
    const path = pathOf(r.page);
    pages.set(path, (pages.get(path) ?? 0) + r.impressions);
    byQ.set(k, pages);
  }
  const out: Array<{ query: string; paths: string[]; impressions: number; engine: Engine }> = [];
  for (const [query, pages] of byQ) {
    if (!match(query)) continue;
    const total = [...pages.values()].reduce((s, n) => s + n, 0);
    const strong = [...pages.entries()]
      .filter(([, n]) => n >= CANNIBAL_MIN_IMPRESSIONS && n >= total * CANNIBAL_MIN_SHARE)
      .sort((a, b) => b[1] - a[1]);
    if (strong.length >= 2) out.push({ query, paths: strong.map(([p]) => p), impressions: total, engine: e.engine });
  }
  return out.sort((a, b) => b.impressions - a.impressions);
}

/** This week's queries never seen in the 4 weeks before, that no TARGETS.md cluster covers. */
export function newQueriesWithoutTarget(e: EngineWeeks, targets: TargetCluster[]): Array<{ query: string; impressions: number; engine: Engine }> {
  if (!e.current || !e.seenBefore) return [];
  const match = clusterMatcher(targets);
  const seen = new Set([...e.seenBefore].map((s) => s.trim().toLowerCase()));
  return [...byQuery(e.current.queries).values()]
    .filter((r) => r.impressions >= NEW_QUERY_MIN_IMPRESSIONS && !seen.has(r.query) && !match(r.query))
    .map((r) => ({ query: r.query, impressions: r.impressions, engine: e.engine }))
    .sort((a, b) => b.impressions - a.impressions);
}

/** Pages that lost the most clicks this week, all engines together. */
export function refreshCandidates(engines: EngineWeeks[]): Array<{ path: string; loss: number }> {
  const loss = new Map<string, number>();
  for (const e of engines) {
    if (!e.current || !e.previous) continue;
    const cur = byPath(e.current.pages);
    for (const [path, p] of byPath(e.previous.pages)) {
      const l = p - (cur.get(path) ?? 0);
      if (l > 0) loss.set(path, (loss.get(path) ?? 0) + l);
    }
  }
  return [...loss.entries()].filter(([, l]) => l >= REFRESH_MIN_LOSS).sort((a, b) => b[1] - a[1]).map(([path, l]) => ({ path, loss: l }));
}

const STATUS_FR: Record<EngineStatus, string> = {
  ok: '',
  no_key: 'clé absente',
  no_table: 'table absente, migration non appliquée',
  no_data: 'aucune donnée encore',
  error: 'erreur au dernier relevé',
};

export function buildReport(input: WeeklyInput): ReportModel {
  const red: ReportLine[] = [];
  const notConnected: string[] = [];

  // Week header.
  const head: string[] = [];
  for (const e of input.engines) {
    const label = e.engine === 'google' ? 'Google' : 'Bing';
    if (e.status !== 'ok' || !e.current) {
      notConnected.push(`${e.engine === 'google' ? 'Search Console' : 'Bing Webmaster'} (${STATUS_FR[e.status === 'ok' ? 'no_data' : e.status]}${e.detail ? `: ${e.detail.slice(0, 60)}` : ''})`);
      continue;
    }
    const cur = e.current.pages.reduce((s, p) => s + p.clicks, 0);
    const prev = e.previous ? e.previous.pages.reduce((s, p) => s + p.clicks, 0) : 0;
    head.push(`${label}, semaine du ${shortDateFr(e.current.week)}: ${fr(cur)} clics${e.previous ? pct(cur, prev) : ''}`);
  }
  const weekOf = shortDateFr(mondayOf(addDays(input.today, -7)));
  const header: ReportLine = { text: head.length > 0 ? head.join(' · ') : `Semaine du ${weekOf}: pas encore de données de recherche.` };

  // Red lines.
  if (input.nightly.status === 'failure') red.push({ red: true, text: `Rouge: contrôles de nuit en échec${input.nightly.date ? ` (${shortDateFr(input.nightly.date)})` : ''}${input.nightly.url ? `: ${input.nightly.url}` : ''}` });
  if (input.nightly.status === 'stale') red.push({ red: true, text: `Rouge: aucun contrôle de nuit depuis le ${input.nightly.date ? shortDateFr(input.nightly.date) : '?'}${input.nightly.url ? `: ${input.nightly.url}` : ''}` });
  if (input.nightly.status === 'unknown') notConnected.push('contrôles de nuit (GitHub illisible)');
  if (input.indexnowAlerts === null) notConnected.push('IndexNow (table absente)');
  else if (input.indexnowAlerts > 0) red.push({ red: true, text: `Rouge: IndexNow, ${fr(input.indexnowAlerts)} alerte${input.indexnowAlerts > 1 ? 's' : ''} en 7 jours: ${input.siteUrl}/admin/seo/indexnow` });
  if (input.linkedUrlProblems && input.linkedUrlProblems.length > 0) {
    red.push({ red: true, text: `Rouge: URL qui ont reçu un lien, en erreur: ${joinMax(input.linkedUrlProblems.map((p) => `${pathOf(p.url)} (${p.status})`), 3)}` });
  }
  const drops = input.engines.flatMap((e) => pageDrops(e).map((d) => `${d.path} -${d.pct} % sur ${ENGINE_LABEL[e.engine]} (${fr(d.prev)} -> ${fr(d.cur)} clics)`));
  if (drops.length > 0) red.push({ red: true, text: `Rouge: page du top 20 en baisse de plus de 30 %: ${joinMax(drops, 2)}` });
  const redCount = red.length;

  const body: ReportLine[] = [];
  const withData = input.engines.filter((e) => e.status === 'ok' && e.current);

  // Ups and downs (queries).
  if (withData.some((e) => e.previous)) {
    const moves = withData.flatMap(queryMoves);
    const ups = moves.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).map((m) => `${q(m.query)} ${signed(m.delta)} (${ENGINE_LABEL[m.engine]})`);
    const downs = moves.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).map((m) => `${q(m.query)} ${signed(m.delta)} (${ENGINE_LABEL[m.engine]})`);
    body.push({ text: `Hausses (clics): ${ups.length > 0 ? joinMax(ups, 3) : 'aucune notable'}` });
    body.push({ text: `Baisses (clics): ${downs.length > 0 ? joinMax(downs, 3) : 'aucune notable'}` });
  }

  // Cannibalisation and new queries: TARGETS.md is needed for both.
  if (input.targets && input.targets.length > 0) {
    if (withData.length > 0) {
      const cann = withData.flatMap((e) => cannibalisation(e, input.targets!)).map((c) => `${q(c.query)} sur ${c.paths.slice(0, 2).join(' et ')} (${ENGINE_LABEL[c.engine]})`);
      body.push({ text: `Cannibalisation: ${cann.length > 0 ? joinMax(cann, 2) : 'aucune sur les clusters de TARGETS.md'}` });
      if (withData.some((e) => e.seenBefore)) {
        const fresh = withData.flatMap((e) => newQueriesWithoutTarget(e, input.targets!)).sort((a, b) => b.impressions - a.impressions).map((n) => `${q(n.query)} ${fr(n.impressions)} impr. (${ENGINE_LABEL[n.engine]})`);
        body.push({ text: `Requêtes nouvelles sans page cible: ${fresh.length > 0 ? joinMax(fresh, 3) : 'aucune'}` });
      }
    }
  } else {
    notConnected.push('TARGETS.md (non lu: cannibalisation et requêtes sans page sautées)');
  }

  // Links and embeds.
  const embeds = input.partnerLog ? '' : ' Intégrations: aucun journal partner= pour l\'instant.';
  if (input.links.status === 'ok') {
    const l = input.links;
    const what = l.firstPull
      ? `premier relevé, ${fr(l.totalDomains)} domaine${l.totalDomains > 1 ? 's' : ''} référent${l.totalDomains > 1 ? 's' : ''}`
      : l.newDomains.length > 0
        ? `${l.newDomains.length} nouveau${l.newDomains.length > 1 ? 'x' : ''} domaine${l.newDomains.length > 1 ? 's' : ''}: ${joinMax(l.newDomains, 3)}`
        : `aucun nouveau domaine (${fr(l.totalDomains)} au total)`;
    body.push({ text: `Liens (Bing): ${what}.${embeds}` });
  } else {
    notConnected.push(`liens Bing (${input.links.status === 'no_table' ? 'table absente' : input.links.status === 'no_key' ? 'clé absente' : 'erreur'})`);
    if (embeds) body.push({ text: embeds.trim() });
  }

  // Pages to refresh.
  if (withData.some((e) => e.previous)) {
    const cands = refreshCandidates(withData).slice(0, 5).map((c) => `${c.path} (-${fr(c.loss)})`);
    body.push({ text: `À rafraîchir (clics perdus): ${cands.length > 0 ? cands.join(', ') : 'aucune page en baisse'}` });
  }

  // Events of the next 14 days.
  if (input.calendar) {
    const ev = upcomingEvents(input.calendar, input.today, 14).map((e) => `${shortDateFr(e.start)} ${e.label}`);
    body.push({ text: `Dans les 14 jours: ${ev.length > 0 ? joinMax(ev, 3) : 'aucun événement au calendrier'}` });
  } else {
    notConnected.push('CALENDAR.md (absent)');
  }

  // Assemble within 15 lines: header, red lines (at most 4), body, then the footer.
  const redShown = red.length > 4 ? [...red.slice(0, 3), { red: true, text: `Rouge: ${red.length - 3} autres lignes rouges, voir ${input.siteUrl}/admin/seo/import` }] : red;
  const lines: ReportLine[] = [header, ...(redShown.length > 0 ? redShown : [{ text: 'Lignes rouges: aucune. Rien d\'urgent cette semaine.' }]), ...body];
  if (notConnected.length > 0) lines.push({ text: `Non branché: ${notConnected.join(', ')}.` });
  lines.push({ text: `Détail et import Bing AI du mois: ${input.siteUrl}/admin/seo/import` });
  const capped = lines.length > MAX_LINES ? [...lines.slice(0, MAX_LINES - 1), lines[lines.length - 1]!] : lines;

  const subject = `kpopquiz.org SEO, semaine du ${weekOf}: ${redCount > 0 ? `${redCount} ligne${redCount > 1 ? 's' : ''} rouge${redCount > 1 ? 's' : ''}` : 'rien d\'urgent'}`;
  return { subject, lines: capped, redCount };
}
