// UX v11 /quizzes browse (P2): the URL contract, the facet counts and the ordering
// of the facets the live page does not have (Level). Pure module: no I/O, shared by
// the server page, the load-more endpoint and the client islands.
//
// URL contract = the live page's (app/(site)/quizzes/page.tsx) plus `level`:
//   ?sort=trending|newest|most_played|top_rated   (none, `all` or anything else =
//         the live default, all-time most played; shown as "Most played")
//   ?type=classic|tf|clue|image|intruder           (the live page's keys)
//   ?level=easy|medium|hard                        (NEW, flag on only)
//   ?group=<slug>  ?lang=<code>  ?page=N
// Links are built in one canonical order and never carry a default value, so the
// default view is always plain /quizzes (the canonical URL).

import type { QuizCardData } from '@/lib/db/types';

export type P2Sort = 'trending' | 'newest' | 'most_played' | 'top_rated';

/** What a browse card needs (UxQuizCard's fields + the id), sent by the load-more endpoint. */
export type P2Card = Pick<QuizCardData,
  'id' | 'slug' | 'title' | 'group_name' | 'group_slug' | 'quiz_type' | 'difficulty' | 'play_count' | 'cover_image_url'>;

export function toP2Card(q: QuizCardData): P2Card {
  return {
    id: q.id, slug: q.slug, title: q.title, group_name: q.group_name, group_slug: q.group_slug,
    quiz_type: q.quiz_type, difficulty: q.difficulty, play_count: q.play_count, cover_image_url: q.cover_image_url,
  };
}

/** Load-more endpoint payload (GET /api/ux-v1/p2/quizzes). */
export interface P2PagePayload {
  quizzes: P2Card[];
  page: number;
  hasMore: boolean;
}
export type P2Type = 'classic' | 'tf' | 'clue' | 'image' | 'intruder';
export type P2Level = 'easy' | 'medium' | 'hard';

/** Legacy browse sort keys (lib/db/queries/quizzes.ts BrowseSort). */
export type P2BrowseSort = 'trending' | 'new' | 'most_played' | 'top_rated';

export const P2_PAGE_SIZE = 48;
/** Trending = created in the last 30 days, most played first (the live rule). */
export const P2_TRENDING_DAYS = 30;

export const P2_SORTS: readonly { key: P2Sort; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'newest', label: 'Newest' },
  { key: 'most_played', label: 'Most played' },
  { key: 'top_rated', label: 'Top rated' },
];
/** The live page's default order ("All", all-time most played). */
export const P2_DEFAULT_SORT: P2Sort = 'most_played';

/** Type facet, in the prototype's order and words; `key` is the live URL key. */
export const P2_TYPES: readonly { key: P2Type; db: string; label: string }[] = [
  { key: 'classic', db: 'multiple_choice', label: 'Classic' },
  { key: 'tf', db: 'true_false', label: 'True/false' },
  { key: 'clue', db: 'guess_from_clues', label: 'Guess from clues' },
  { key: 'image', db: 'image', label: 'Image' },
  { key: 'intruder', db: 'intruder', label: 'Find the intruder' },
];

export const P2_LEVELS: readonly { key: P2Level; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

/** The catch-all bucket is a real quiz group but not a band: listed last in Group. */
export const P2_GENERAL_GROUP = 'general-kpop';

export interface P2Filters {
  sort: P2Sort;
  type: P2Type | null;
  level: P2Level | null;
  group: string | null;
  lang: string | null;
  page: number;
}

export type P2SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Same page rule as the live page: an integer >= 1, anything else is page 1. */
export function parsePage(raw: string | undefined): number {
  return Math.max(1, Number.parseInt(raw ?? '1', 10) || 1);
}

/**
 * Read the filters from the URL. `groupSlugs` / `languages` are the valid values
 * (an unknown group or language is ignored, as on the live page).
 */
export function parseP2Filters(
  sp: P2SearchParams,
  valid: { groupSlugs: ReadonlySet<string>; languages: ReadonlySet<string> },
): P2Filters {
  const sortRaw = first(sp.sort);
  const sort = P2_SORTS.some((s) => s.key === sortRaw) ? (sortRaw as P2Sort) : P2_DEFAULT_SORT;
  const typeRaw = first(sp.type);
  const levelRaw = first(sp.level);
  const groupRaw = first(sp.group);
  const langRaw = first(sp.lang);
  return {
    sort,
    type: P2_TYPES.some((t) => t.key === typeRaw) ? (typeRaw as P2Type) : null,
    level: P2_LEVELS.some((l) => l.key === levelRaw) ? (levelRaw as P2Level) : null,
    group: groupRaw && valid.groupSlugs.has(groupRaw) ? groupRaw : null,
    lang: langRaw && valid.languages.has(langRaw) ? langRaw : null,
    page: parsePage(first(sp.page)),
  };
}

/** P2 sort -> the legacy browse query's sort (same mapping as the live page). */
export function toBrowseSort(s: P2Sort): P2BrowseSort {
  return s === 'newest' ? 'new' : s;
}

export function typeDb(t: P2Type): string {
  return P2_TYPES.find((x) => x.key === t)?.db ?? 'multiple_choice';
}

export function typeLabel(t: P2Type): string {
  return P2_TYPES.find((x) => x.key === t)?.label ?? t;
}

export function levelLabel(l: P2Level): string {
  return P2_LEVELS.find((x) => x.key === l)?.label ?? l;
}

/** The /quizzes URL of a filter set (canonical param order, defaults omitted). */
export function p2Href(f: P2Filters, patch: Partial<P2Filters> = {}): string {
  const n: P2Filters = { ...f, ...patch };
  const p = new URLSearchParams();
  if (n.group) p.set('group', n.group);
  if (n.type) p.set('type', n.type);
  if (n.level) p.set('level', n.level);
  if (n.lang) p.set('lang', n.lang);
  if (n.sort !== P2_DEFAULT_SORT) p.set('sort', n.sort);
  if (n.page > 1) p.set('page', String(n.page));
  const qs = p.toString();
  return qs ? `/quizzes?${qs}` : '/quizzes';
}

/** Query string (same params as the page URL) of a filter set at a page. */
export function p2Query(f: P2Filters, page: number): string {
  const href = p2Href(f, { page });
  const i = href.indexOf('?');
  return i >= 0 ? href.slice(i + 1) : '';
}

/** A stable key of everything that changes the result list (not the page). */
export function p2FilterKey(f: P2Filters): string {
  return [f.sort, f.type ?? '', f.level ?? '', f.group ?? '', f.lang ?? ''].join('|');
}

export function hasFacet(f: P2Filters): boolean {
  return f.type !== null || f.level !== null || f.group !== null || f.lang !== null;
}

// ---------------------------------------------------------------------------
// Facet rows: one small row per published quiz (read once per hour, server side)

export interface P2FacetRow {
  id: string;
  /** DB quiz_type */
  type: string;
  /** DB difficulty */
  difficulty: string;
  /** DB language ('' when null: the live filter's .eq('language') never matches null) */
  language: string;
  groupSlug: string;
  groupName: string;
  /** created_at in ms */
  created: number;
  plays: number;
  scoreSum: number;
  completions: number;
  questions: number;
}

type Omit3 = 'type' | 'level' | 'group' | null;

function inWindow(r: P2FacetRow, f: P2Filters, now: number): boolean {
  if (f.sort !== 'trending') return true;
  return r.created >= now - P2_TRENDING_DAYS * 24 * 60 * 60 * 1000;
}

/** Does a quiz match the filters (optionally ignoring one facet, for its counts)? */
export function p2Matches(r: P2FacetRow, f: P2Filters, now: number, omit: Omit3 = null): boolean {
  if (!inWindow(r, f, now)) return false;
  if (f.lang && r.language !== f.lang) return false;
  if (omit !== 'type' && f.type && r.type !== typeDb(f.type)) return false;
  if (omit !== 'level' && f.level && r.difficulty !== f.level) return false;
  if (omit !== 'group' && f.group && r.groupSlug !== f.group) return false;
  return true;
}

export interface P2Facets {
  /** quizzes matching every filter */
  total: number;
  types: Record<P2Type, number>;
  levels: Record<P2Level, number>;
  /** groups with at least one matching quiz: most quizzes first, the catch-all last */
  groups: { slug: string; name: string; count: number }[];
  /** published quizzes and the groups they cover (the page's catalogue line) */
  catalogue: { quizzes: number; groups: number };
}

/**
 * Real counts for the result and for every option of every facet, each option
 * counted with the OTHER active facets applied (so a count is what that pick
 * would show; an option at 0 is a dead end and is not offered).
 */
export function p2Facets(rows: readonly P2FacetRow[], f: P2Filters, now: number): P2Facets {
  const types = { classic: 0, tf: 0, clue: 0, image: 0, intruder: 0 } as Record<P2Type, number>;
  const levels = { easy: 0, medium: 0, hard: 0 } as Record<P2Level, number>;
  const groups = new Map<string, { slug: string; name: string; count: number }>();
  const typeByDb = new Map(P2_TYPES.map((t) => [t.db, t.key]));
  const allGroups = new Set<string>();
  let total = 0;
  for (const r of rows) {
    allGroups.add(r.groupSlug);
    if (p2Matches(r, f, now)) total += 1;
    if (p2Matches(r, f, now, 'type')) {
      const k = typeByDb.get(r.type);
      if (k) types[k] += 1;
    }
    if (p2Matches(r, f, now, 'level') && (r.difficulty === 'easy' || r.difficulty === 'medium' || r.difficulty === 'hard')) {
      levels[r.difficulty] += 1;
    }
    if (p2Matches(r, f, now, 'group')) {
      const g = groups.get(r.groupSlug) ?? { slug: r.groupSlug, name: r.groupName, count: 0 };
      g.count += 1;
      groups.set(r.groupSlug, g);
    }
  }
  const list = [...groups.values()].sort((a, b) => {
    const ga = a.slug === P2_GENERAL_GROUP ? 1 : 0;
    const gb = b.slug === P2_GENERAL_GROUP ? 1 : 0;
    if (ga !== gb) return ga - gb;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });
  return { total, types, levels, groups: list, catalogue: { quizzes: rows.length, groups: allGroups.size } };
}

/** Languages a `?lang=` may name: the live page's rule (getLanguageCounts maps a
 *  null language to 'en'). */
export function p2Languages(rows: readonly P2FacetRow[]): Set<string> {
  return new Set(rows.map((r) => r.language || 'en'));
}

/** Average score in percent, the live "Top rated" measure (0 without plays). */
export function avgPct(r: Pick<P2FacetRow, 'scoreSum' | 'completions' | 'questions'>): number {
  return r.completions > 0 && r.questions > 0 ? (r.scoreSum / r.completions / r.questions) * 100 : 0;
}

/**
 * Ids of one page of a facet the live query cannot express (Level), with the live
 * semantics of each sort: Newest = created_at desc; Trending = last 30 days, most
 * played first; Most played = play_count desc; Top rated = the most played slice of
 * the page re-ranked by average score (exactly what the live browse query does).
 * Ties break on created_at desc, then id, so a page is stable between renders.
 */
export function p2PageIds(rows: readonly P2FacetRow[], f: P2Filters, now: number, pageSize = P2_PAGE_SIZE): string[] {
  const list = rows.filter((r) => p2Matches(r, f, now));
  const byNew = (a: P2FacetRow, b: P2FacetRow): number => (b.created - a.created) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  list.sort(f.sort === 'newest' ? byNew : (a, b) => (b.plays - a.plays) || byNew(a, b));
  const slice = list.slice((f.page - 1) * pageSize, f.page * pageSize);
  if (f.sort === 'top_rated') slice.sort((a, b) => avgPct(b) - avgPct(a));
  return slice.map((r) => r.id);
}

/** Number of pages of a result (at least 1). */
export function p2PageCount(total: number, pageSize = P2_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** "422 quizzes" / "1 quiz" (the live region line and the result summary). */
export function quizCountLabel(n: number): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'quiz' : 'quizzes'}`;
}
