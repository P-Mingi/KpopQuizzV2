// Run O1, lot (b), lane P1: what the passport pages of a world site (anime) read, and how a membership becomes the shapes
// the shared kpop components render (rule 18). Server only; every function takes the client it reads with.
//
//  - readWorldMember: ANOTHER member's page (/u/{username}). The service role, the public columns of the membership
//    (MEMBER_PUBLIC_COLUMNS) plus the filter columns, never a private one (rpcs.md section 4). Missing, not activated or
//    banned (on the site, or network-wide on the profile): a refusal, and the page answers 404.
//  - readOwnWorldMember: the signed-in user's own row through RLS (the owner reads their private columns too).
//  - worldSpine / worldCollection: the passport spine and the mastery count of a world site. The kpop spine
//    (profiles.ult_groups, bias, quizzes_played) never reaches an anime page; the series count only series of the site.

import { MEMBER_FILTER_COLUMNS, MEMBER_PUBLIC_COLUMNS } from '@/lib/passport/types';
import { profileForSite } from '@/lib/network/profile';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { averagePct } from '@/lib/ux-v1/p10/passport-model';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/db/types';
import type { MemberPublic } from '@/lib/passport/types';
import type { CollectionProgress, PassportGroupStat, PassportSpine } from '@/lib/passport';
import type { SiteId } from '@/lib/site/types';
import type { HistoryRow } from '@/lib/ux-v1/p10/passport-model';

/** The profiles columns a world page reads: identity and flair only, never the kpop presentation (bio, bias, groups, header). */
export const PROFILE_COLUMNS = 'id, username, display_name, avatar_url, avatar_bg, avatar_text, created_at, updated_at, name_accent, name_font, avatar_kind, avatar_ref, banned_at';

export const MEMBER_COLUMNS = [...MEMBER_PUBLIC_COLUMNS, ...MEMBER_FILTER_COLUMNS].join(', ');

type ProfileRow = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'avatar_bg' | 'avatar_text' | 'created_at' | 'updated_at' | 'name_accent' | 'name_font' | 'avatar_kind' | 'avatar_ref'> & { banned_at?: string | null };
type MemberRow = MemberPublic & { user_id: string; activated_at: string | null; show_elsewhere: boolean; banned_at: string | null };

/** A profiles-shaped object holding only what the world page may show; profileForSite then takes the rest from the membership. */
export function blankProfile(row: ProfileRow): Profile {
  return {
    id: row.id, username: row.username, display_name: row.display_name, avatar_url: row.avatar_url,
    avatar_bg: row.avatar_bg, avatar_text: row.avatar_text, bio: null, created_at: row.created_at, updated_at: row.updated_at,
    total_quizzes_created: 0, total_plays_received: 0, total_likes_received: 0, xp: 0, follower_count: 0, following_count: 0,
    name_accent: row.name_accent, name_font: row.name_font, pinned_badge_id: null, avatar_kind: row.avatar_kind,
    avatar_ref: row.avatar_ref, stan_since: null, header_url: null,
  };
}

/** The membership with the public columns only: the filter columns (user id, ban, activation) never travel further. */
export function publicOnly(m: MemberPublic): MemberPublic {
  const out: Record<string, unknown> = {};
  for (const k of MEMBER_PUBLIC_COLUMNS) out[k] = (m as unknown as Record<string, unknown>)[k];
  return out as unknown as MemberPublic;
}

export interface WorldMember {
  /** The profile as this site shows it (profileForSite already applied). */
  readonly profile: Profile;
  readonly membership: MemberPublic;
}

export type MemberRefusal = 'no_profile' | 'no_membership' | 'not_activated' | 'banned';
export type MemberLookup = { readonly ok: true; readonly member: WorldMember } | { readonly ok: false; readonly reason: MemberRefusal };

/** Another member of `site` by username, with the service role (the caller passes it) and only public columns. */
export async function readWorldMember(db: SupabaseClient, username: string, site: SiteId): Promise<MemberLookup> {
  const { data: prof, error: profError } = await db.from('profiles').select(PROFILE_COLUMNS).eq('username', username).maybeSingle();
  if (profError) throw new Error(`readWorldMember profile: ${profError.message}`);
  if (!prof) return { ok: false, reason: 'no_profile' };
  const row = prof as unknown as ProfileRow;
  const { data: mem, error: memError } = await db.from('world_memberships').select(MEMBER_COLUMNS).eq('user_id', row.id).eq('site_id', site).maybeSingle();
  if (memError) throw new Error(`readWorldMember membership: ${memError.message}`);
  if (!mem) return { ok: false, reason: 'no_membership' };
  const m = mem as unknown as MemberRow;
  if (row.banned_at || m.banned_at) return { ok: false, reason: 'banned' };
  if (!m.activated_at) return { ok: false, reason: 'not_activated' };
  const membership = publicOnly(m);
  return { ok: true, member: { profile: profileForSite(site, blankProfile(row), membership), membership } };
}

export interface OwnWorldMember {
  readonly profile: Profile;
  /** Null until the site has stamped the member. */
  readonly membership: MemberPublic | null;
  readonly banned: boolean;
  /** False until the user has done something on the site (or the stamp was made by a sign-in without a play). */
  readonly stamped: boolean;
}

/** The signed-in user's own page data: the profile as this site shows it, with a missing membership giving neutral values. */
export async function readOwnWorldMember(supabase: SupabaseClient, userId: string, site: SiteId): Promise<OwnWorldMember | null> {
  const { data: prof, error: profError } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (profError) throw new Error(`readOwnWorldMember profile: ${profError.message}`);
  if (!prof) return null;
  const row = prof as unknown as ProfileRow;
  const { data: mem, error: memError } = await supabase.from('world_memberships').select(MEMBER_COLUMNS).eq('user_id', userId).eq('site_id', site).maybeSingle();
  if (memError) throw new Error(`readOwnWorldMember membership: ${memError.message}`);
  const m = (mem as unknown as MemberRow | null) ?? null;
  const membership = m ? publicOnly(m) : null;
  return {
    profile: profileForSite(site, blankProfile(row), membership),
    membership,
    banned: Boolean(row.banned_at || m?.banned_at),
    stamped: m !== null,
  };
}

/** A daily streak is live only while its last day is today or yesterday (UTC), as the kpop passport shows it. */
export function effectiveStreak(stored: number, lastActive: string | null, now: Date = new Date()): number {
  if (!lastActive) return 0;
  const today = now.toISOString().slice(0, 10);
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  return lastActive === today || lastActive === y.toISOString().slice(0, 10) ? stored : 0;
}

/** The passport spine of a world member, from the membership (a null membership gives zeros). */
export function worldSpine(m: MemberPublic | null, seriesSlugs: readonly string[], now: Date = new Date()): PassportSpine {
  return {
    xp: m?.xp ?? 0,
    total_quizzes_created: m?.quizzes_created ?? 0,
    total_plays_received: m?.plays_received ?? 0,
    total_likes_received: m?.likes_received ?? 0,
    quizzes_played: m?.quizzes_played ?? 0,
    blindtests_played: m?.blindtests_played ?? 0,
    duels_voted: 0,
    battles_played: 0,
    battles_won: 0,
    ult_groups: [...seriesSlugs],
    bias: m?.tag_text ?? null,
    profile_theme: m?.profile_theme ?? 'default',
    streak_current: effectiveStreak(m?.daily_streak ?? 0, m?.last_daily_date ?? null, now),
    streak_longest: m?.daily_streak_longest ?? 0,
    streak_last_active: m?.last_daily_date ?? null,
    snapshot_at: null,
  };
}

/** Mastery counted over the series of this site only (the stats table also holds the kpop groups of a shared account). */
export function worldCollection(stats: readonly PassportGroupStat[], siteGroupIds: ReadonlySet<number>): CollectionProgress {
  return {
    groups_mastered: stats.filter((s) => s.mastered && siteGroupIds.has(s.group_id)).length,
    groups_total: siteGroupIds.size,
    eras: [],
  };
}

/** The group stats of the site's series only. */
export function worldGroupStats(stats: readonly PassportGroupStat[], siteGroupIds: ReadonlySet<number>): PassportGroupStat[] {
  return stats.filter((s) => siteGroupIds.has(s.group_id));
}

/** The series a member follows (favourites, slot topic), main first: the slugs, readable by everyone (RLS: public). */
export async function readSeriesSlugs(db: SupabaseClient, userId: string, site: SiteId): Promise<string[]> {
  const { data } = await db.from('favourites').select('entity_id, rank').eq('user_id', userId).eq('site_id', site).eq('slot', 'topic').order('rank', { ascending: true });
  return ((data ?? []) as Array<{ entity_id: string | null }>).map((r) => r.entity_id).filter((s): s is string => typeof s === 'string' && s !== '');
}

/** The series (groups rows) of the site: id, name, slug. The scope is always on for a world site (lib/site/scope.ts). */
export async function readSiteSeries(db: SupabaseClient, site: SiteId): Promise<Array<{ id: number; name: string; slug: string }>> {
  const { data } = await forSite(db.from('groups').select('id, name, slug'), site);
  return (data ?? []) as Array<{ id: number; name: string; slug: string }>;
}

// ---------------------------------------------------------------------------------------------------------------
// Own history and average, over the quizzes of this site only
// ---------------------------------------------------------------------------------------------------------------

/** The owner's average score over the plays of this site's quizzes (a play carries no site; its quiz does). Null without a scored play. */
export async function readWorldAverage(db: SupabaseClient, userId: string, site: SiteId): Promise<number | null> {
  try {
    const rows = await fetchAllRows<{ score: number | null; total_questions: number | null }>(
      () => db.from('plays').select('score, total_questions, quizzes!inner(site_id)').eq('player_id', userId).eq('quizzes.site_id', site).order('created_at', { ascending: true }),
    );
    return averagePct(rows);
  } catch {
    return null;
  }
}

/** The owner's latest quiz plays on this site, newest first. Blind tests are left out: their plays carry no site. */
export async function readWorldHistory(db: SupabaseClient, userId: string, site: SiteId, limit = 20): Promise<HistoryRow[]> {
  try {
    const { data: playRows } = await db.from('plays').select('quiz_id, score, total_questions, created_at').eq('player_id', userId).order('created_at', { ascending: false }).limit(limit * 3);
    const plays = (playRows ?? []) as Array<{ quiz_id: string; score: number; total_questions: number; created_at: string }>;
    const ids = [...new Set(plays.map((p) => p.quiz_id))];
    if (ids.length === 0) return [];
    const { data: quizRows } = await forSite(db.from('quizzes').select('id, title, slug, group_id, status'), site).in('id', ids);
    const quizzes = new Map<string, { title: string; slug: string; group_id: number | null }>();
    for (const q of (quizRows ?? []) as Array<{ id: string; title: string; slug: string; group_id: number | null; status: string }>) {
      if (q.status === 'published') quizzes.set(q.id, { title: q.title, slug: q.slug, group_id: q.group_id });
    }
    const gids = [...new Set([...quizzes.values()].map((q) => q.group_id).filter((g): g is number => g !== null))];
    const groupSlug = new Map<number, string>();
    if (gids.length > 0) {
      const { data } = await forSite(db.from('groups').select('id, slug'), site).in('id', gids);
      for (const g of (data ?? []) as Array<{ id: number; slug: string }>) groupSlug.set(g.id, g.slug);
    }
    const out: HistoryRow[] = [];
    for (const p of plays) {
      const q = quizzes.get(p.quiz_id);
      if (!q) continue;
      out.push({ kind: 'quiz', title: q.title, href: `/q/${q.slug}`, groupSlug: q.group_id !== null ? groupSlug.get(q.group_id) ?? null : null, score: p.score ?? 0, total: p.total_questions ?? 0, at: p.created_at });
    }
    return out.slice(0, limit);
  } catch {
    return [];
  }
}
