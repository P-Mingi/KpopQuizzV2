// P11 (UX v11.2): pure model of the search overlay (DESIGN-SPEC 16.5 "opens an
// overlay with groups, quizzes, songs, a real no-results state"; WIRING-MAP v10
// "Groups, quizzes (incl. quizzes of a matched group), songs; no-results state;
// Enter opens first"; prototype searchFilter()). No I/O and client-safe: the
// server reads live in ./search.ts, the overlay only renders what the endpoint
// GET /api/ux-v1/p11/search returns. Nothing here is about a user: the payload is
// public catalog data only (groups, published quizzes, active songs).

import { formatCount } from '@/lib/utils';

/** A search never reads more than this many characters (same cap as /api/search). */
export const MAX_QUERY = 100;
export const MAX_GROUPS = 4;
export const MAX_QUIZZES = 5;
export const MAX_SONGS = 3;
export const POPULAR_GROUPS = 4;
export const POPULAR_QUIZZES = 3;
/** Below this many plays a quiz reads "New" (the quiz card's display rule). */
export const NEW_QUIZ_PLAY_THRESHOLD = 7;

export interface P11SearchGroup {
  name: string;
  slug: string;
  href: string;
  /** "28 quizzes", "1 quiz" or "No quiz yet" (published quizzes, 16.10). */
  sub: string;
  photo: string | null;
  initials: string;
}
export interface P11SearchQuiz {
  title: string;
  href: string;
  /** Query mode: "BTS · 2.4k plays"; popular mode: the group name (prototype). */
  sub: string;
  thumb: string | null;
  initials: string;
}
export interface P11SearchSong {
  title: string;
  /** The group playlist of the blindtest when the group is playable, else /blindtest. */
  href: string;
  /** The artist. */
  sub: string;
}
export interface P11SearchResult {
  /** The normalised query ('' = the popular lists shown before typing). */
  q: string;
  mode: 'popular' | 'query';
  groups: P11SearchGroup[];
  quizzes: P11SearchQuiz[];
  songs: P11SearchSong[];
}

/** Trim, collapse spaces, cap the length. '' means "no query". */
export function normalizeQuery(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY).trim();
}

/** Lower case, letters and digits only (Hangul kept): "Stray Kids" = "straykids", "(G)I-DLE" = "gidle". */
export function compact(s: string): string {
  return s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * The ILIKE pattern for a user query, or null when nothing searchable is left.
 * PostgREST reads "*" as "%" in like patterns, and % _ \ are LIKE syntax, so they
 * are dropped; , ( ) are dropped like the live /search page does (filter syntax).
 */
export function likePattern(q: string): string | null {
  const safe = q.replace(/[%_*\\,()]/g, ' ').replace(/\s+/g, ' ').trim();
  return safe ? `%${safe}%` : null;
}

export interface GroupRow {
  slug: string;
  name: string;
  quizzes: number;
  photo: string | null;
}

/** How well a name answers the query: 3 = the same name (ignoring case, spaces and
 *  punctuation), 2 = a word of the name starts with it, 1 = it is inside the name,
 *  0 = no match. The punctuation-free form only counts from 3 characters, so a
 *  query like "o'" does not match every name with an "o". */
export function nameScore(name: string, q: string): number {
  const needle = q.toLowerCase().trim();
  if (!needle) return 0;
  const hay = name.toLowerCase();
  const needleC = compact(q);
  const hayC = compact(name);
  if (needleC.length > 0 && hayC === needleC) return 3;
  if (hay.startsWith(needle) || hay.split(/[\s\-(/]+/).some((w) => w.startsWith(needle))) return 2;
  if (hay.includes(needle) || (needleC.length >= 3 && hayC.includes(needleC))) return 1;
  return 0;
}

/** Group names that match the query (nameScore), the closest names first, then
 *  the most quizzes (prototype: sort by count), then A to Z. */
export function matchGroups<T extends GroupRow>(groups: T[], q: string, limit = MAX_GROUPS): T[] {
  return groups
    .map((g) => ({ g, s: nameScore(g.name, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.g.quizzes - a.g.quizzes || a.g.name.localeCompare(b.g.name, 'en'))
    .slice(0, limit)
    .map((x) => x.g);
}

export function quizzesLabel(n: number): string {
  if (n <= 0) return 'No quiz yet';
  return `${n.toLocaleString('en-US')} ${n === 1 ? 'quiz' : 'quizzes'}`;
}

export function playsLabel(plays: number): string {
  return plays < NEW_QUIZ_PLAY_THRESHOLD ? 'New' : `${formatCount(plays)} plays`;
}

export interface QuizRow {
  slug: string;
  title: string;
  play_count: number | null;
  cover_image_url: string | null;
  group_name: string;
  group_slug: string;
}

/** Title matches and the quizzes of the matched groups, one row per quiz: the
 *  closest match first (the group typed, or a title word that starts with the
 *  query, before a title that only contains it: "ive" = IVE quizzes before
 *  "...survive"), then most played (prototype: sort by plays), capped. */
export function mergeQuizzes(lists: QuizRow[][], q: string, limit = MAX_QUIZZES): QuizRow[] {
  const bySlug = new Map<string, QuizRow>();
  for (const list of lists) for (const r of list) if (!bySlug.has(r.slug)) bySlug.set(r.slug, r);
  return [...bySlug.values()]
    .map((r) => ({ r, k: Math.max(nameScore(r.group_name, q), nameScore(r.title, q)) }))
    .sort((a, b) => b.k - a.k || (b.r.play_count ?? 0) - (a.r.play_count ?? 0) || a.r.title.localeCompare(b.r.title, 'en'))
    .slice(0, limit)
    .map((x) => x.r);
}

export interface SongRow {
  id: string;
  title: string;
  artist_name: string | null;
  play_count: number | null;
  group_slug: string | null;
}

/** Songs by title or artist, one row per song: the artist the fan typed first
 *  ("bts" = BTS songs before a title that mentions BTS), then title matches at a
 *  word start, then the rest; most played, then A to Z, within each. */
export function mergeSongs(lists: SongRow[][], q: string, limit = MAX_SONGS): SongRow[] {
  const byId = new Map<string, SongRow>();
  for (const list of lists) for (const r of list) if (!byId.has(r.id)) byId.set(r.id, r);
  const score = (s: SongRow): number => {
    const a = nameScore(s.artist_name ?? '', q);
    if (a === 3) return 5;
    if (a > 0) return 3 + (a === 2 ? 1 : 0);
    return nameScore(s.title, q);
  };
  return [...byId.values()]
    .map((s) => ({ s, k: score(s) }))
    .sort((a, b) => b.k - a.k || (b.s.play_count ?? 0) - (a.s.play_count ?? 0) || a.s.title.localeCompare(b.s.title, 'en'))
    .slice(0, limit)
    .map((x) => x.s);
}

/** A song opens its group's blindtest playlist when that playlist exists
 *  (lib/blind-test-playlists.ts rule, the /blindtest/group-<slug> links of the
 *  hub), else the blindtest hub. */
export function songHref(groupSlug: string | null, playable: ReadonlySet<string>): string {
  return groupSlug && playable.has(groupSlug) ? `/blindtest/group-${groupSlug}` : '/blindtest';
}

/** The rows in the order the overlay shows them (keyboard order, Enter = first). */
export function flatRows(r: Pick<P11SearchResult, 'groups' | 'quizzes' | 'songs'>): { href: string; title: string; sub: string }[] {
  return [
    ...r.groups.map((g) => ({ href: g.href, title: g.name, sub: g.sub })),
    ...r.quizzes.map((x) => ({ href: x.href, title: x.title, sub: x.sub })),
    ...r.songs.map((s) => ({ href: s.href, title: s.title, sub: s.sub })),
  ];
}

/** Screen reader summary of a result ("3 groups, 5 quizzes and 2 songs"). */
export function resultSummary(r: Pick<P11SearchResult, 'groups' | 'quizzes' | 'songs'>): string {
  const parts: string[] = [];
  const add = (n: number, one: string, many: string): void => { if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`); };
  add(r.groups.length, 'group', 'groups');
  add(r.quizzes.length, 'quiz', 'quizzes');
  add(r.songs.length, 'song', 'songs');
  if (parts.length === 0) return 'No results';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]!}`;
}
