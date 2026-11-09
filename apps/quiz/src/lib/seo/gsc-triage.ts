// O1 audit 03 P0-4 (section 5): the pure logic of the Search Console triage
// (scripts/seo-gsc-triage.mts). No I/O here: CSV text, URLs and page facts in, one action per URL out,
// so each decision rule is unit tested (gsc-triage.test.ts). The app never imports this module.
//
// Rulebook: .claude/skills/kpopquiz-seo/SKILL.md, 9 (indexing controls) and 13.5 (linked-URL guard).

import { classifyRedirect, isNoindex as metaIsNoindex, noindexVerdict, type Hop } from './prod-crawl';

export const SITE_ORIGIN = 'https://kpopquiz.org';
/** Rulebook 3 and audit 03 section 3: a pair sharing more questions than this is a merge. */
export const MERGE_OVERLAP = 0.6;
/** Words in the main content under which a page is thin (audit 03: the 150-300 word pages). */
export const THIN_WORDS = 300;
/** Rulebook 8.1: a page needs this many inbound links. */
export const MIN_INBOUND = 3;

// ---- CSV ------------------------------------------------------------------------------------

/** RFC 4180 reader: quoted fields, doubled quotes, CRLF, a leading BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

/** Quote a field for a CSV we write. */
export function csvField(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---- URLs -----------------------------------------------------------------------------------

/**
 * One form per page: https, apex host, no hash, no trailing slash (but the root), query kept.
 * Returns null for anything that is not a kpopquiz.org URL.
 */
export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'kpopquiz.org') return null;
  const path = u.pathname.replace(/\/+$/, '') || '/';
  return `${SITE_ORIGIN}${path}${u.search}`;
}

export const pathOf = (url: string): string => new URL(url).pathname.replace(/\/+$/, '') || '/';
export const queryOf = (url: string): string => new URL(url).search;

// ---- exports --------------------------------------------------------------------------------

/** The reason of a "Why pages aren't indexed" export, read from its file name. */
export function reasonFromFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, '').replace(/\.csv$/i, '');
  return base
    .replace(/(kpopquiz\.org)?[-_ ]*\d{4}-\d{2}-\d{2}/gi, ' ')
    .replace(/kpopquiz\.org/gi, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ReasonRow { url: string; reason: string }
export interface PerfRow { url: string; clicks: number; impressions: number }

const num = (s: string | undefined): number => {
  const n = Number((s ?? '').replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** A "Why pages aren't indexed" export: a URL column (the first, or the one headed URL). */
export function parseReasonExport(fileName: string, text: string): ReasonRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const col = Math.max(0, header.indexOf('url'));
  const reason = reasonFromFileName(fileName);
  const out: ReasonRow[] = [];
  for (const r of rows.slice(1)) {
    const url = normalizeUrl(r[col] ?? '');
    if (url) out.push({ url, reason });
  }
  return out;
}

/** A Performance export (Pages tab): "Top pages", Clicks, Impressions. */
export function parsePerformanceExport(text: string): PerfRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const url = Math.max(0, header.findIndex((h) => h === 'top pages' || h === 'page' || h === 'pages' || h === 'url'));
  const clicks = header.indexOf('clicks');
  const impressions = header.indexOf('impressions');
  const out: PerfRow[] = [];
  for (const r of rows.slice(1)) {
    const u = normalizeUrl(r[url] ?? '');
    if (u) out.push({ url: u, clicks: clicks >= 0 ? num(r[clicks]) : 0, impressions: impressions >= 0 ? num(r[impressions]) : 0 });
  }
  return out;
}

/** A Bing Site Explorer or any plain list: the first column that holds a kpopquiz.org URL. */
export function parseUrlList(text: string): string[] {
  const out: string[] = [];
  for (const r of parseCsv(text)) {
    for (const f of r) { const u = normalizeUrl(f); if (u) { out.push(u); break; } }
  }
  return out;
}

// ---- templates ------------------------------------------------------------------------------

export type Template =
  | 'home' | 'q' | 'hub' | 'trivia-sourced' | 'trivia-derived' | 'bt-group' | 'bt-mode' | 'name-all'
  | 'which-member' | 'list' | 'landing-lang' | 'verse' | 'profile' | 'utility' | 'facet' | 'legacy' | 'api' | 'content';

const LISTS = new Set([
  '/trending', '/new', '/most-liked', '/news', '/quizzes', '/kpop-quiz-2026', '/easy-kpop-quizzes', '/hard-kpop-quizzes',
  '/guess-the-kpop-idol', '/kpop-true-or-false', '/trivia', '/groups', '/leaderboard',
]);
const UTILITY = /^\/(search|create|build|login|signup|register|logout|forgot-password|reset-password|auth|settings|onboarding|admin|embed|community|live|creators|credits|join|s|g|battle|daily|me|notifications|profile)(\/|$)|^\/blindtest\/(ranked|leaderboard)$/;
const LEGACY = /^\/(pt|blind-test|group|how-well-[^/]*|ranks|rankings|games|tier-list|which-[^/]*-quiz)(\/|$)/;
const LANDING = /^\/(fr|es|id)(\/|$)/;

/** The refined template of a URL (routeType() of prod-crawl.ts is coarser). `sourced` holds the slugs with a sourced trivia file. */
export function templateOf(url: string, sourced: ReadonlySet<string> = new Set()): Template {
  const path = pathOf(url);
  const first = path.split('/')[1] ?? '';
  if (path === '/') return 'home';
  if (/^\/api(\/|$)/.test(path)) return 'api';
  if (queryOf(url)) return 'facet';
  if (LANDING.test(path)) return 'landing-lang';
  if (/^\/q\/[^/]+$/.test(path)) return 'q';
  if (/^\/u\/[^/]+$/.test(path)) return 'profile';
  if (/^\/verse(\/|$)/.test(path)) return 'verse';
  if (/^\/blindtest\/group-/.test(path)) return 'bt-group';
  if (/^\/blindtest\/[^/]+$/.test(path) && !UTILITY.test(path)) return 'bt-mode';
  if (/-trivia$/.test(first) && path === `/${first}`) return sourced.has(first.replace(/-trivia$/, '')) ? 'trivia-sourced' : 'trivia-derived';
  if (/-quiz$/.test(first) && path === `/${first}`) return 'hub';
  if (/-name-all-members$/.test(first) || path === '/name-them-all' || path.startsWith('/kpop-demon-hunters')) return 'name-all';
  if (/^which-.+-member-are-you$/.test(first)) return 'which-member';
  if (LISTS.has(path) || /^\/quizzes\/popular-/.test(path)) return 'list';
  if (LEGACY.test(path)) return 'legacy';
  if (UTILITY.test(path)) return 'utility';
  return 'content';
}

/** Templates that need demand (rule 1.3, 3.4) before they are worth an index slot. */
export const DEMAND_TEMPLATES: ReadonlySet<Template> = new Set(['bt-group', 'name-all', 'which-member', 'list', 'landing-lang', 'trivia-derived', 'verse']);
/** Templates that are meant to be indexed: a noindex on one is a defect, not a policy. */
const INDEX_BY_DESIGN: ReadonlySet<Template> = new Set(['q', 'hub', 'trivia-sourced', 'bt-mode', 'content', 'home']);

// ---- duplicate clusters -----------------------------------------------------------------------

interface DupeQuiz { slug: string; url?: string; plays?: number; questions?: number; created?: string }
interface DupeCluster { proposal?: string; overlaps?: Array<{ a: string; b: string; share: number }>; quizzes?: DupeQuiz[] }

/**
 * The quizzes to merge, from the clusters file of the duplicates audit (docs/seo/strategy-2026-10-27/dupes.json,
 * `sites.kpop.clusters`): every pair over MERGE_OVERLAP names a loser and the quiz to keep (more plays, then older,
 * then more questions). Keyed by the loser's /q/ URL.
 */
export function mergeTargets(clusters: readonly DupeCluster[]): Map<string, { overlap: number; target: string }> {
  const out = new Map<string, { overlap: number; target: string }>();
  for (const c of clusters) {
    const bySlug = new Map((c.quizzes ?? []).map((q) => [q.slug, q]));
    for (const o of c.overlaps ?? []) {
      if (!(o.share > MERGE_OVERLAP)) continue;
      const a = bySlug.get(o.a);
      const b = bySlug.get(o.b);
      if (!a || !b) continue;
      const keepA = (a.plays ?? 0) !== (b.plays ?? 0) ? (a.plays ?? 0) > (b.plays ?? 0)
        : (a.created ?? '') !== (b.created ?? '') ? (a.created ?? '') < (b.created ?? '')
        : (a.questions ?? 0) >= (b.questions ?? 0);
      const [keep, lose] = keepA ? [a, b] : [b, a];
      out.set(`${SITE_ORIGIN}/q/${lose.slug}`, { overlap: o.share, target: `${SITE_ORIGIN}/q/${keep.slug}` });
    }
  }
  return out;
}

// ---- the decision ---------------------------------------------------------------------------

export type Action =
  | 'FIX-SITEMAP' | 'FIX-REDIRECT' | 'RESTORE' | 'EXPECTED' | 'DOCUMENT' | 'REMOVE-NOINDEX'
  | 'MERGE-301' | 'NOINDEX-PROPOSE' | 'ENRICH' | 'RELINK' | 'INVESTIGATE';

/** The next_action values of seo_index_status (docs/pending-migrations/seo-index-status.sql). */
export type NextAction = 'enrich' | 'relink' | 'resubmit' | 'none';

export interface PageFacts {
  url: string;
  reason: string;
  template: Template;
  /** Status of the URL itself (no redirect followed); null when it could not be fetched. */
  status: number | null;
  /** The redirect walk when the URL answered 3xx (hops[0] is the URL itself). */
  hops?: readonly Hop[];
  xRobotsTag: string;
  metaRobots: string;
  canonical: string | null;
  /** True when the canonical points to another URL that answers 200, indexable and self-canonical. */
  canonicalTargetOk?: boolean;
  inSitemap: boolean;
  words: number | null;
  questions: number | null;
  plays: number | null;
  clicks: number;
  impressions: number;
  /** Internal links found to this URL, null when not measured. */
  inbound: number | null;
  /** On the linked-URL guard list (rulebook 13.5). */
  guarded: boolean;
  /** A DUPLICATES cluster over MERGE_OVERLAP, with the URL to keep. */
  duplicate?: { overlap: number; target: string } | null;
  /** The page was removed on purpose (unpublished or flagged quiz). */
  removed?: boolean;
}

export interface Decision { action: Action; why: string; ownerOk: 'required' | 'no'; nextAction: NextAction }

export const isNoindex = (f: Pick<PageFacts, 'xRobotsTag' | 'metaRobots'>): boolean => metaIsNoindex(f.metaRobots, f.xRobotsTag);

function selfCanonical(f: PageFacts): boolean {
  if (!f.canonical) return false;
  const c = normalizeUrl(f.canonical);
  return c !== null && c === normalizeUrl(f.url);
}

const NEXT: Record<Action, NextAction> = {
  'FIX-SITEMAP': 'resubmit', 'FIX-REDIRECT': 'resubmit', RESTORE: 'resubmit', EXPECTED: 'none', DOCUMENT: 'none',
  'REMOVE-NOINDEX': 'resubmit', 'MERGE-301': 'none', 'NOINDEX-PROPOSE': 'none', ENRICH: 'enrich', RELINK: 'relink', INVESTIGATE: 'none',
};

/** The decision of section 5, step 4. First match wins. MERGE and NOINDEX on a URL with clicks or guarded need the owner. */
export function decide(f: PageFacts): Decision {
  const out = (action: Action, why: string, ownerOk: 'required' | 'no' = 'no'): Decision => ({ action, why, ownerOk, nextAction: NEXT[action] });
  const touched = f.clicks > 0 || f.guarded;
  const noindex = isNoindex(f);
  const redirected = f.status !== null && f.status >= 300 && f.status < 400;

  // 1. Listed in the sitemap but not final, 200, indexable and self-canonical.
  if (f.inSitemap) {
    if (f.status !== 200) return out('FIX-SITEMAP', `in the sitemap but answers ${f.status ?? 'no response'}`);
    if (noindex) return out('FIX-SITEMAP', 'in the sitemap but noindex');
    if (!selfCanonical(f)) return out('FIX-SITEMAP', `in the sitemap but its canonical is ${f.canonical ?? 'missing'}`);
  }

  // 2. A redirect that is a chain, a loop, a dump on a generic page, or ends on a non-200.
  if (redirected && f.hops && f.hops.length > 0) {
    const v = classifyRedirect(f.hops);
    if (v.kind === 'chain') return out('FIX-REDIRECT', `chain of ${v.hops} redirects`);
    if (v.kind === 'loop') return out('FIX-REDIRECT', 'redirect loop');
    if (v.kind === 'generic') return out('FIX-REDIRECT', `dumped on the generic page ${v.to}`);
    if (v.kind === 'unfinished') return out('FIX-REDIRECT', 'redirect walk never ended');
    const last = f.hops[f.hops.length - 1]!;
    if (v.kind === 'ok' && last.status !== 200) return out('FIX-REDIRECT', `target answers ${last.status}`);
  }

  // 3. A page that answers 404 or 410 and still has clicks or is guarded.
  if ((f.status === 404 || f.status === 410) && touched) {
    return out('RESTORE', f.guarded ? 'removed but on the linked-URL guard list' : `removed but ${f.clicks} clicks in 90 days`, 'required');
  }

  // 4. Expected states: allowlisted or documented noindex, a one-hop redirect, a canonical to a good URL, a removed page.
  if (noindex && noindexVerdict(pathOf(f.url), queryOf(f.url).slice(1)).allowed) return out('EXPECTED', 'noindex on the allowlist or documented');
  if (redirected && f.hops && classifyRedirect(f.hops).kind === 'ok') return out('EXPECTED', 'one-hop redirect to a 200 page');
  if (f.canonical && !selfCanonical(f) && f.canonicalTargetOk) return out('EXPECTED', 'canonical to a 200 indexable URL');
  if ((f.status === 404 || f.status === 410) && (f.removed || !touched)) return out('EXPECTED', 'removed page, no clicks, not guarded');

  // 5. Any other noindex.
  if (noindex) {
    return INDEX_BY_DESIGN.has(f.template)
      ? out('REMOVE-NOINDEX', `${f.template} pages are indexable by design`)
      : out('DOCUMENT', `noindex on a ${f.template} page with no written reason (add it to DOCUMENTED_NOINDEX)`);
  }

  // 6. A duplicate cluster over the merge line.
  if (f.duplicate && f.duplicate.overlap > MERGE_OVERLAP) {
    return out('MERGE-301', `${Math.round(f.duplicate.overlap * 100)}% of the questions are in ${f.duplicate.target}`, touched ? 'required' : 'no');
  }

  // 7. Thin, no impressions, on a template that needs demand.
  if (f.words !== null && f.words < THIN_WORDS && f.impressions === 0 && DEMAND_TEMPLATES.has(f.template)) {
    return out('NOINDEX-PROPOSE', `${f.words} words, 0 impressions in 90 days on a ${f.template} page`, touched ? 'required' : 'no');
  }

  // 8 and 9. Crawled or discovered but not indexed.
  if (/crawled/.test(f.reason)) return out('ENRICH', 'crawled, currently not indexed');
  if (/discovered/.test(f.reason) && f.inbound !== null && f.inbound < MIN_INBOUND) return out('RELINK', `discovered, not indexed, ${f.inbound} inbound links`);

  return out('INVESTIGATE', 'no rule matched');
}

// ---- output ---------------------------------------------------------------------------------

export interface TriageRow extends PageFacts, Decision {}

export const TRIAGE_COLUMNS = [
  'url', 'reason', 'template', 'status', 'robots', 'canonical', 'in_sitemap', 'words', 'questions', 'plays',
  'clicks', 'impressions', 'action', 'why', 'owner_ok', 'next_action',
] as const;

export function triageCsv(rows: readonly TriageRow[]): string {
  const lines: string[] = [TRIAGE_COLUMNS.join(',')];
  for (const r of rows) {
    const robots = [r.metaRobots, r.xRobotsTag].filter(Boolean).join(' | ');
    lines.push([
      r.url, r.reason, r.template, r.status, robots, r.canonical, r.inSitemap, r.words, r.questions, r.plays,
      r.clicks, r.impressions, r.action, r.why, r.ownerOk, r.nextAction,
    ].map(csvField).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** triage.md: the count of each template by action, then the URLs that need the owner. */
export function triageMarkdown(rows: readonly TriageRow[], generated: string): string {
  const actions = [...new Set(rows.map((r) => r.action))].sort();
  const templates = [...new Set(rows.map((r) => r.template))].sort();
  const lines = [`# Search Console triage, ${generated}`, '', `${rows.length} URLs.`, ''];
  lines.push(`| template | ${actions.join(' | ')} | total |`, `|---|${actions.map(() => '---').join('|')}|---|`);
  for (const t of templates) {
    const mine = rows.filter((r) => r.template === t);
    lines.push(`| ${t} | ${actions.map((a) => mine.filter((r) => r.action === a).length).join(' | ')} | ${mine.length} |`);
  }
  const needOwner = rows.filter((r) => r.ownerOk === 'required');
  lines.push('', `## Needs the owner (${needOwner.length})`, '');
  for (const r of needOwner) lines.push(`- ${r.action} ${r.url}: ${r.why}`);
  return `${lines.join('\n')}\n`;
}
