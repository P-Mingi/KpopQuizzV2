import { createPublicReadClient } from '@/lib/supabase/server';

import type { PersonCardData } from '@/components/profile/person-card';

// Community hub data (Workstream M, M1.21). All public reads via the cookie-free
// client so /leaderboard stays static/ISR. NANO-cheap: the rising signal is one
// index-backed aggregate + one profiles IN read; the rest are small reads.

const PROFILE_COLS = 'id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, follower_count, name_accent, name_font, bias, pinned_badge_id, avatar_kind, avatar_ref';

interface ProfileRow {
  id: string; username: string; display_name: string | null;
  avatar_url: string | null; avatar_bg: string; avatar_text: string;
  xp: number; follower_count: number;
  name_accent: string | null; name_font: string | null; bias: string | null;
  pinned_badge_id: string | null; avatar_kind: string | null; avatar_ref: string | null;
}

function toPerson(p: ProfileRow): PersonCardData {
  return {
    username: p.username, displayName: p.display_name,
    avatarUrl: p.avatar_url, avatarBg: p.avatar_bg, avatarText: p.avatar_text,
    xp: p.xp ?? 0, followerCount: p.follower_count ?? 0,
    nameAccent: p.name_accent, nameFont: p.name_font, bias: p.bias,
    pinnedBadgeId: p.pinned_badge_id,
    avatarKind: (p.avatar_kind as PersonCardData['avatarKind']) ?? 'photo', avatarRef: p.avatar_ref,
  };
}

// Rising creators: most new followers in the last 7 days (mig 097 aggregate over
// the follows(followed_id, created_at) index), hydrated with one IN read.
export async function getRisingCreators(limit = 8): Promise<Array<{ person: PersonCardData; newFollowers: number }>> {
  const db = createPublicReadClient();
  const { data: agg } = await db.rpc('get_rising_creators', { p_days: 7, p_limit: limit });
  const rows = (agg ?? []) as Array<{ followed_id: string; new_followers: number }>;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.followed_id);
  const { data: profs } = await db.from('profiles').select(PROFILE_COLS).in('id', ids);
  const byId = new Map(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return rows
    .map((r) => { const p = byId.get(r.followed_id); return p ? { person: toPerson(p), newFollowers: Number(r.new_followers) } : null; })
    .filter((x): x is { person: PersonCardData; newFollowers: number } => x !== null);
}

// Active fans of a group: by per-group plays in player_group_mastery (cheap,
// group-filtered), hydrated with one IN read. Accuracy is shown, not a rank.
export async function getActiveFansByGroup(groupSlug: string, limit = 8): Promise<Array<{ person: PersonCardData; accuracy: number }>> {
  const db = createPublicReadClient();
  const { data: g } = await db.from('groups').select('id').eq('slug', groupSlug).maybeSingle();
  if (!g) return [];

  const { data: mastery } = await db
    .from('player_group_mastery')
    .select('player_id, songs_played, songs_correct')
    .eq('group_id', (g as { id: number }).id)
    .gt('songs_played', 0)
    .order('songs_played', { ascending: false })
    .limit(limit);
  const rows = (mastery ?? []) as Array<{ player_id: string; songs_played: number; songs_correct: number }>;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.player_id);
  const { data: profs } = await db.from('profiles').select(PROFILE_COLS).in('id', ids);
  const byId = new Map(((profs ?? []) as ProfileRow[]).map((p) => [p.id, p]));

  return rows
    .map((r) => {
      const p = byId.get(r.player_id);
      if (!p) return null;
      const acc = r.songs_played > 0 ? r.songs_correct / r.songs_played : 0;
      return { person: toPerson(p), accuracy: acc };
    })
    .filter((x): x is { person: PersonCardData; accuracy: number } => x !== null);
}

// Per-quiz hall of fame (M1.19): top scorers for ONE quiz, best per player,
// highest score then fastest time. Index-backed by idx_plays_quiz_score (mig 098).
// Anonymous scorers (no player_id) surface as person=null ("someone", no link).
export interface HallOfFameEntry { person: PersonCardData | null; score: number; total: number; timeSeconds: number | null }

interface PlayRow {
  score: number; total_questions: number; time_taken_seconds: number | null; player_id: string | null;
  profiles: ProfileRow | null;
}

export async function getQuizHallOfFame(quizId: string, limit = 10): Promise<HallOfFameEntry[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('plays')
    .select(`score, total_questions, time_taken_seconds, player_id, profiles(${PROFILE_COLS})`)
    .eq('quiz_id', quizId)
    .order('score', { ascending: false })
    .order('time_taken_seconds', { ascending: true, nullsFirst: false })
    .limit(40);

  const rows = (data ?? []) as unknown as PlayRow[];
  const seenPlayers = new Set<string>();
  const out: HallOfFameEntry[] = [];
  for (const r of rows) {
    if (r.player_id) {
      if (seenPlayers.has(r.player_id)) continue; // best per player (rows are score-desc)
      seenPlayers.add(r.player_id);
    }
    const p = r.profiles;
    out.push({
      person: p ? toPerson(p) : null,
      score: r.score,
      total: r.total_questions,
      timeSeconds: r.time_taken_seconds,
    });
    if (out.length >= limit) break;
  }
  return out;
}

// Collective stats from the small groups table (one read, ~tens of rows). Cheap.
export async function getCommunityStats(): Promise<{ totalPlays: number; totalQuizzes: number; groups: number }> {
  const db = createPublicReadClient();
  const { data } = await db.from('groups').select('total_plays, quiz_count');
  const rows = (data ?? []) as Array<{ total_plays: number; quiz_count: number }>;
  return {
    totalPlays: rows.reduce((s, r) => s + (r.total_plays ?? 0), 0),
    totalQuizzes: rows.reduce((s, r) => s + (r.quiz_count ?? 0), 0),
    groups: rows.length,
  };
}

// ============================================================
// Community page v2 (F2a). All reads go through the cookie-free public client
// so /leaderboard stays static/ISR. The two heavy folds (war map, today) are
// RPCs from mig 107 so Postgres returns tens of rows instead of shipping
// thousands of play rows here.
// ============================================================

export interface TodayStats {
  playsToday: number;
  quizzesToday: number;
  mastersToday: number;
  hotGroup: { slug: string; name: string; logoUrl: string | null } | null;
}

export async function getTodayStats(): Promise<TodayStats> {
  const db = createPublicReadClient();
  const { data } = await db.rpc('get_today_stats');
  const row = ((data ?? []) as Array<{
    plays_today: number; quizzes_today: number; masters_today: number;
    hot_group_slug: string | null; hot_group_name: string | null; hot_group_logo: string | null;
  }>)[0];
  if (!row) return { playsToday: 0, quizzesToday: 0, mastersToday: 0, hotGroup: null };
  return {
    playsToday: Number(row.plays_today ?? 0),
    quizzesToday: Number(row.quizzes_today ?? 0),
    mastersToday: Number(row.masters_today ?? 0),
    hotGroup: row.hot_group_slug && row.hot_group_name
      ? { slug: row.hot_group_slug, name: row.hot_group_name, logoUrl: row.hot_group_logo }
      : null,
  };
}

export interface WarMapEntry {
  slug: string;
  name: string;
  logoUrl: string | null;
  color: string;
  plays: number;
  fans: number;
  /** Generation label ("3rd Gen") or null for groups mig 089 left unbucketed. */
  generation: string | null;
  /** Percent change vs the previous 7 days. null when there is no prior week to compare. */
  delta: number | null;
}

export async function getFandomWarMap(limit = 30): Promise<WarMapEntry[]> {
  const db = createPublicReadClient();
  const { data } = await db.rpc('get_fandom_war_map', { p_limit: limit });
  const rows = (data ?? []) as Array<{
    name: string; slug: string; logo_url: string | null; display_color: string;
    plays_week: number; fans_week: number; plays_prev: number;
  }>;

  // generation lives on groups (mig 089) and is not returned by the 107 RPC, so
  // one small IN read (<= 30 slugs, indexed) merges it in rather than forcing a
  // migration 108 to re-declare the function. Cheap: tens of rows.
  const genBySlug = new Map<string, string | null>();
  if (rows.length > 0) {
    const { data: gens } = await db
      .from('groups')
      .select('slug, generation')
      .in('slug', rows.map((r) => r.slug));
    for (const g of (gens ?? []) as Array<{ slug: string; generation: string | null }>) {
      genBySlug.set(g.slug, g.generation);
    }
  }

  return rows.map((r) => {
    const week = Number(r.plays_week ?? 0);
    const prev = Number(r.plays_prev ?? 0);
    return {
      slug: r.slug,
      name: r.name,
      logoUrl: r.logo_url,
      color: r.display_color,
      plays: week,
      fans: Number(r.fans_week ?? 0),
      generation: genBySlug.get(r.slug) ?? null,
      // A group with no plays last week has no honest percentage to show: going
      // from 0 to anything is not "+infinity%", so the UI shows "new" instead.
      delta: prev > 0 ? Math.round(((week - prev) / prev) * 100) : null,
    };
  });
}

export interface FeedEvent {
  id: number;
  type: string;
  person: PersonCardData | null;
  displayName: string;
  phrase: string;
  href: string | null;
  ago: string;
}

/** Coarse, server-rendered age. Honest at revalidate 300 and keeps the section static. */
function coarseAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return 'just now';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function ellipsize(s: string, max = 32): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}...` : s;
}

interface FeedRow {
  id: number; event_type: string; user_id: string | null; display_name: string;
  group_slug: string | null; payload: Record<string, unknown>; created_at: string;
}

/**
 * The Happening now feed: the full version of the one-line home ticker, same
 * activity_events table, zero new writes.
 *
 * Returns { events, recentCount } so the page can apply the liveness gate
 * without a second query: below 4 events in 48h the section renders its quiet
 * state instead of padding with filler.
 */
export async function getHappeningNow(limit = 12): Promise<{ events: FeedEvent[]; recentCount: number }> {
  const db = createPublicReadClient();
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();

  const [{ data: rows }, { data: groups }, { count }] = await Promise.all([
    db.from('activity_events')
      .select('id, event_type, user_id, display_name, group_slug, payload, created_at')
      .order('created_at', { ascending: false })
      // Over-fetch well past `limit`: the newest rows are frequently one player
      // on a duel spree, so reaching further back is what actually produces a
      // feed with more than two faces in it.
      .limit(400),
    db.from('groups').select('slug, name'),
    db.from('activity_events').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ]);

  // activity_events.user_id references auth.users, NOT profiles, so PostgREST
  // cannot infer that relationship and an embedded profiles(...) select comes
  // back empty rather than erroring. One IN read instead, same as
  // getRisingCreators. This was silently returning zero events with 1400+ rows
  // sitting in the table.
  const feedRows = (rows ?? []) as unknown as FeedRow[];
  const userIds = [...new Set(feedRows.map((r) => r.user_id).filter((x): x is string => Boolean(x)))];
  const profById = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profs } = await db.from('profiles').select(PROFILE_COLS).in('id', userIds);
    for (const p of (profs ?? []) as ProfileRow[]) profById.set(p.id, p);
  }

  const nameBySlug = new Map<string, string>();
  for (const g of (groups ?? []) as Array<{ slug: string; name: string }>) nameBySlug.set(g.slug, g.name);
  const gname = (slug: string | null): string => (slug ? nameBySlug.get(slug) ?? 'K-pop' : 'K-pop');
  const groupHref = (slug: string | null): string | null => (slug ? `/${slug}-quiz` : null);

  const events: FeedEvent[] = [];
  // At most MAX_PER_PERSON rows per person. The raw table is honest but
  // repetitive: one voter emits a dozen duel_voted rows in a minute, so an
  // undeduped feed is the same sentence twelve times and a busy community reads
  // as broken. Capping per PERSON rather than per person+type matters, because
  // the spree is all one type: keying on both collapsed the feed to two rows.
  // Nothing is invented here, only collapsed.
  // Two caps, because one is not enough against real data:
  //   - never the same person doing the same thing twice (the identical
  //     sentence repeated is what reads as a rendering bug)
  //   - at most 2 rows per person overall, so one active player cannot own the
  //     feed even across different actions
  const MAX_PER_PERSON = 2;
  const perPerson = new Map<string, number>();
  const seenPersonType = new Set<string>();
  for (const r of feedRows) {
    if (events.length >= limit) break;
    const who = r.user_id ?? r.display_name;
    const used = perPerson.get(who) ?? 0;
    if (used >= MAX_PER_PERSON) continue;
    const ptKey = `${who}:${r.event_type}`;
    if (seenPersonType.has(ptKey)) continue;
    const p = r.payload ?? {};
    const score = typeof p.score === 'number' ? p.score : null;
    const total = typeof p.total === 'number' ? p.total : null;
    const streak = typeof p.streak === 'number' ? p.streak : null;
    const title = typeof p.title === 'string' ? p.title : null;
    const slug = typeof p.slug === 'string' ? p.slug : null;
    const g = gname(r.group_slug);

    let phrase: string | null = null;
    let href: string | null = null;

    switch (r.event_type) {
      case 'quiz_created':
        phrase = title ? `made a new quiz: ${ellipsize(title)}` : `made a new ${g} quiz`;
        href = slug ? `/q/${slug}` : groupHref(r.group_slug);
        break;
      case 'group_mastered':
        phrase = `mastered ${g}`;
        href = groupHref(r.group_slug);
        break;
      case 'perfect_score':
        phrase = total !== null ? `scored a perfect ${total}/${total}` : `aced a ${g} quiz`;
        href = groupHref(r.group_slug);
        break;
      case 'quiz_completed':
        phrase = score !== null && total !== null ? `scored ${score}/${total} on a ${g} quiz` : `played a ${g} quiz`;
        href = groupHref(r.group_slug);
        break;
      case 'blindtest_played':
        phrase = score !== null && total !== null ? `got ${score}/${total} on the blind test` : 'played the blind test';
        href = '/blindtest';
        break;
      case 'duel_voted':
        phrase = 'voted in a duel';
        href = '/games/this-or-that';
        break;
      case 'battle_won':
        phrase = 'won a battle';
        href = '/games';
        break;
      case 'streak_milestone':
        phrase = streak !== null ? `hit a ${streak}-day streak` : 'kept a streak going';
        href = null; // nothing meaningful to open
        break;
      default:
        phrase = null;
    }
    if (!phrase) continue;
    perPerson.set(who, used + 1);
    seenPersonType.add(ptKey);

    events.push({
      id: r.id,
      type: r.event_type,
      // Anonymous events carry no identity: no PersonCard, no fake avatar.
      person: r.user_id ? (profById.get(r.user_id) ? toPerson(profById.get(r.user_id)!) : null) : null,
      displayName: r.display_name,
      phrase,
      href,
      ago: coarseAgo(r.created_at),
    });
  }

  return { events, recentCount: count ?? 0 };
}

export interface BadgeEarn {
  badgeId: string;
  badgeName: string;
  icon: string | null;
  person: PersonCardData;
  ago: string;
}

/**
 * Latest badge earns for Badge watch. Bounded to the last 30 days so the shelf
 * reflects recent life rather than the mig 104 founding_fan backfill, which
 * stamped every existing account at once and would otherwise fill the row.
 */
export async function getLatestBadgeEarns(limit = 6): Promise<BadgeEarn[]> {
  const db = createPublicReadClient();
  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

  const seenBadge = new Set<string>();
  const { data } = await db
    .from('user_badges')
    .select(`badge_id, earned_at, badge_definitions(id, name, icon), profiles(${PROFILE_COLS})`)
    .gte('earned_at', since)
    // founding_fan was granted to every existing account at once by the mig 104
    // backfill and can never be earned again. Without this the shelf is six
    // identical coins stamped the same minute, which reads as a bug, not as
    // community life.
    .neq('badge_id', 'founding_fan')
    .order('earned_at', { ascending: false })
    // Over-fetch then keep one earn per badge type: the mig 104 retro-grants
    // stamped whole tiers in the same minute, so an undeduped shelf is the same
    // coin four times.
    .limit(limit * 8);

  return ((data ?? []) as unknown as Array<{
    badge_id: string; earned_at: string;
    badge_definitions: { id: string; name: string; icon: string | null } | null;
    profiles: ProfileRow | null;
  }>)
    .filter((r) => r.profiles && r.badge_definitions)
    .filter((r) => {
      if (seenBadge.has(r.badge_id)) return false;
      seenBadge.add(r.badge_id);
      return true;
    })
    .slice(0, limit)
    .map((r) => ({
      badgeId: r.badge_id,
      badgeName: r.badge_definitions!.name,
      icon: r.badge_definitions!.icon,
      person: toPerson(r.profiles!),
      ago: coarseAgo(r.earned_at),
    }));
}
