// Run O1, lot H2b: helpers shared by the blocks of the home. Pure, except origins() which reads the environment.

import { isConfiguredImageHost } from '@/lib/image-hosts';
import { groupInitials } from '@/lib/ux-v1/p1/format';
import { netBase } from '@/lib/site/base-path';
import { REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { HubOrigins, HubOpts, HubQuizCard, HubSite } from './types';
import type { SiteId } from '@/lib/site/types';

export const DAY_MS = 86_400_000;
export const HUB_SITES: readonly HubSite[] = ['kpop', 'anime'];

/** The origin of every site on this deployment. A malformed NEXT_PUBLIC_NET_ORIGINS falls back to the registry urls. */
export function resolveOrigins(opts?: HubOpts): HubOrigins {
  if (opts?.origins) return opts.origins;
  const env = { NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV };
  const out = {} as Record<SiteId, string>;
  for (const id of SITE_IDS) {
    try {
      out[id] = netBase(id, env); // Bunnyverse: the base URL (the /anime sub-folder included), every href below is base + path
    } catch {
      out[id] = REGISTRY[id].url;
    }
  }
  return out;
}

export function siteName(site: SiteId): string {
  return REGISTRY[site].brand.name;
}

export function isHubSite(v: unknown): v is HubSite {
  return v === 'kpop' || v === 'anime';
}

/** UTC calendar date `YYYY-MM-DD` of an instant. */
export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Whole days since 1970-01-01 (UTC) of an instant. */
export function dayNumber(now: Date): number {
  return Math.floor(now.getTime() / DAY_MS);
}

/** Whole UTC days from `day` (`YYYY-MM-DD`) to the UTC date of `now` (0 for today). */
export function ageInDays(day: string, now: Date): number {
  return Math.round((Date.parse(`${utcDate(now)}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS);
}

/** "2.7k plays" from 100 plays, else "" (a handful of plays is not worth printing). */
export function playsLabel(n: number): string {
  if (!Number.isFinite(n) || n < 100) return '';
  if (n < 1000) return `${Math.round(n)} plays`;
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k plays`;
}

const DIFFICULTY: Readonly<Record<string, string>> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const FORMAT: Readonly<Record<string, string>> = {
  true_false: 'True or false',
  guess_from_clues: 'Guess from clues',
  intruder: 'Find the intruder',
  image: 'Image quiz',
};

export function difficultyLabel(d: string): string {
  return DIFFICULTY[d] ?? (d ? d.charAt(0).toUpperCase() + d.slice(1) : '');
}

/** "Medium" or "Easy · True or false". */
export function metaLine(difficulty: string, quizType: string): string {
  const fmt = FORMAT[quizType];
  const d = difficultyLabel(difficulty);
  return fmt ? (d ? `${d} · ${fmt}` : fmt) : d;
}

/** The new badge: published less than 14 days ago. */
export const NEW_DAYS = 14;

/** The columns every card needs, as one select (the group is embedded). */
export const QUIZ_SELECT =
  'id, slug, title, quiz_type, difficulty, status, group_id, site_id, created_at, play_count, like_count, total_completions, report_count, question_count, cover_image_url, groups!inner(name, slug)';

export interface QuizRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly quiz_type: string;
  readonly difficulty: string;
  readonly status: string;
  readonly group_id: number;
  readonly site_id: string;
  readonly created_at: string;
  readonly play_count: number;
  readonly like_count: number | null;
  readonly total_completions: number | null;
  readonly report_count: number | null;
  readonly question_count: number | null;
  /** Optional: rows read before the column joined the select (and test rows) have none. */
  readonly cover_image_url?: string | null;
  readonly groups: { readonly name: string; readonly slug: string } | readonly { readonly name: string; readonly slug: string }[] | null;
}

/** The group (K-pop) or series (anime) of a quiz row. */
export function groupOf(row: Pick<QuizRow, 'groups'>): { name: string; slug: string } {
  const g = Array.isArray(row.groups) ? row.groups[0] : row.groups;
  const gg = g as { name?: string; slug?: string } | null | undefined;
  return { name: gg?.name ?? '', slug: gg?.slug ?? '' };
}

/**
 * The quiz's own cover: K-pop only (no anime artwork without a written licence), on a host the app serves images from. Only an absolute
 * https URL: isConfiguredImageHost takes any path starting with "/" as a local asset, so a protocol-relative "//host/x.jpg" (another host)
 * or a root-relative path (it would resolve on the hub, not on KpopQuiz) is refused here.
 */
export function coverOf(row: Pick<QuizRow, 'site_id' | 'cover_image_url'>): string | null {
  const url = (row.cover_image_url ?? '').trim();
  return row.site_id === 'kpop' && /^https:\/\/[^/]/i.test(url) && isConfiguredImageHost(url) ? url : null;
}

/** The card of a quiz row: the canonical page on its own site, never a copy. */
export function toCard(row: QuizRow, origins: HubOrigins, now: Date): HubQuizCard {
  const site = row.site_id as HubSite;
  const g = groupOf(row);
  const path = `/q/${row.slug}`;
  const plays = playsLabel(row.play_count ?? 0);
  return {
    id: row.id,
    site,
    siteName: siteName(site),
    slug: row.slug,
    path,
    href: `${origins[site]}${path}`,
    title: row.title,
    group: g.name,
    groupSlug: g.slug,
    tile: groupInitials(g.name),
    difficulty: row.difficulty,
    meta: metaLine(row.difficulty, row.quiz_type),
    plays,
    isNew: now.getTime() - Date.parse(row.created_at) < NEW_DAYS * DAY_MS,
    hasPlays: plays !== '',
    questionCount: row.question_count ?? 0,
    cover: coverOf(row),
  };
}

/** Weight of the site average in the like rate of a quiz (as if every quiz had this many plays at the average rate). */
const RATING_PRIOR_PLAYS = 200;

/**
 * "Best rated" of a site: the like rate of a quiz pulled toward the average rate of its site, so a quiz with few plays sits at the average
 * (a brand new quiz is neither on top nor at the bottom) and a quiz with many plays and many likes rises. A site with no plays at all
 * (a site that just opened) gives every quiz the same value; callers then break the tie with the editorial order.
 */
export function ratingFor(rows: readonly Pick<QuizRow, 'like_count' | 'play_count'>[]): (q: Pick<QuizRow, 'like_count' | 'play_count'>) => number {
  let likes = 0;
  let plays = 0;
  for (const r of rows) { likes += r.like_count ?? 0; plays += r.play_count ?? 0; }
  const prior = plays > 0 ? likes / plays : 0;
  return (q) => (((q.like_count ?? 0) + RATING_PRIOR_PLAYS * prior) / ((q.play_count ?? 0) + RATING_PRIOR_PLAYS));
}

/** A quiz reported this many times is left out of every list (the auto flag takes a quiz down at 5 distinct signed-in reporters). */
export const REPORT_EXCLUDE_AT = 5;

export function isListable(row: Pick<QuizRow, 'status' | 'report_count'>): boolean {
  return row.status === 'published' && (row.report_count ?? 0) < REPORT_EXCLUDE_AT;
}

/** Splits `items` into chunks of `size` (PostgREST `in` lists stay short enough for a URL). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Keeps at most `max` items per key, in order. */
export function capPerKey<T>(items: readonly T[], key: (t: T) => string, max: number): T[] {
  const seen = new Map<string, number>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    const n = seen.get(k) ?? 0;
    if (n >= max) continue;
    seen.set(k, n + 1);
    out.push(it);
  }
  return out;
}

/** A stable unsigned 32-bit hash (FNV-1a), for deterministic picks that do not move between renders. */
export function stableHash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The rows of a Supabase answer; throws a readable error when the answer carries one (an empty answer is an empty list). */
export function must<T extends readonly unknown[]>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data ?? ([] as unknown as T);
}
