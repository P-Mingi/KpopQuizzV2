import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getFandomWarMap, getActiveFansByGroup } from '@/lib/db/queries/community';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { MIN_SONGS_FOR_GROUP_MODE } from '@/lib/blind-test-modes';
import { MASTERY, isMastered } from '@/lib/passport';
import type { PersonCardData } from '@/components/profile/person-card';

// Workstream G2 - per-group hub data. Every query is a cookie-free public read
// (the route is already dynamic SSR; this avoids deepening the dependency) and
// is meant to be wrapped in safeFetch by the caller so one thin section never
// takes the page down. REAL DATA ONLY - each returns an empty/null shape when
// there is nothing, and the components gate on that.

export interface GroupRosterMember {
  name: string;
  photoUrl: string | null;
}
export interface GroupNameAllGame {
  slug: string;
  members: GroupRosterMember[];
  count: number;
}

// FREE-VIABILITY: every per-hub read below is wrapped in unstable_cache. They are
// all cookie-free public reads (same for everyone), so the DB is touched once per
// TTL per group instead of once per hub render across the crawl wave. Roster,
// blindtest qualification and comeback change rarely (catalog TTL); the mastery-
// derived fan-knowledge and MV pulse tolerate ~1h (stats TTL).
/** The group's published name-all-members game (roster + play slug), or null. */
export const getGroupNameAllGame = unstable_cache(
  async (groupId: number): Promise<GroupNameAllGame | null> => {
  const db = createPublicReadClient();
  const { data } = await db
    .from('games')
    .select('slug, content')
    .eq('group_id', groupId)
    .eq('game_type', 'name_all_members')
    .eq('status', 'published')
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const content = data.content as { members?: Array<{ name?: string; photo_url?: string | null }> } | null;
  const members = (content?.members ?? [])
    .filter((m) => typeof m?.name === 'string' && m.name.trim())
    .map((m) => ({ name: m.name as string, photoUrl: (m.photo_url as string | null) ?? null }));
  if (members.length === 0) return null;
  return { slug: data.slug as string, members, count: members.length };
  },
  ['db:group-hub:getGroupNameAllGame:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['groups'] },
);

/** Blindtest qualification: active clip songs for this group; >= MIN qualifies. */
export const getGroupBlindtestInfo = unstable_cache(
  async (groupId: number): Promise<{ qualifies: boolean; songs: number }> => {
  const db = createPublicReadClient();
  const { count } = await db
    .from('blind_test_songs')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);
  const songs = count ?? 0;
  return { qualifies: songs >= MIN_SONGS_FOR_GROUP_MODE, songs };
  },
  ['db:group-hub:getGroupBlindtestInfo:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['groups'] },
);

/** This group's fandom war-map rank + weekly delta, or null when uncharted. */
export async function getGroupWarRank(slug: string): Promise<{ rank: number; delta: number | null } | null> {
  const board = await getFandomWarMap(90); // 87 groups: fetch all so any rank resolves
  const i = board.findIndex((g) => g.slug === slug);
  if (i < 0) return null;
  return { rank: i + 1, delta: board[i]!.delta };
}

export interface GroupFanKnowledge {
  masteredCount: number;
  avgAccuracy: number | null; // 0..1, null when below the trust floor
  trackedPlays: number;
  topFans: Array<{ person: PersonCardData; accuracy: number }>;
}

/** The mastery aggregate (mastered/tracked/avg) from a full player_group_mastery
 *  scan for one group. Cached separately from topFans so the fan-knowledge
 *  orchestrator can await two CACHED siblings in parallel WITHOUT nesting one
 *  unstable_cache inside another (which is unsupported). */
const getGroupMasteryAgg = unstable_cache(
  async (groupId: number): Promise<{ masteredCount: number; avgAccuracy: number | null; trackedPlays: number }> => {
    const db = createPublicReadClient();
    const { data: rows } = await db
      .from('player_group_mastery')
      .select('songs_played, songs_correct')
      .eq('group_id', groupId)
      .gt('songs_played', 0);
    let masteredCount = 0;
    let trackedPlays = 0;
    let accSum = 0;
    let accN = 0;
    for (const r of (rows ?? []) as Array<{ songs_played: number; songs_correct: number }>) {
      const played = r.songs_played ?? 0;
      if (played <= 0) continue;
      trackedPlays += played;
      accSum += (r.songs_correct ?? 0) / played;
      accN += 1;
      if (isMastered(r)) masteredCount += 1;
    }
    // Avg accuracy only when there is enough signal (the mastery play floor).
    const avgAccuracy = trackedPlays >= MASTERY.minPlays && accN > 0 ? accSum / accN : null;
    return { masteredCount, avgAccuracy, trackedPlays };
  },
  ['db:group-hub:getGroupMasteryAgg:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['community'] },
);

/** Fan-knowledge stats from player_group_mastery. Sub-stats are individually
 *  gated by the caller (mastered >= 3, avg accuracy needs >= 30 tracked plays).
 *  Uncached orchestrator: it composes two already-cached reads, so its own reads
 *  never touch the DB when both siblings are warm. */
export async function getGroupFanKnowledge(groupId: number, slug: string): Promise<GroupFanKnowledge> {
  const [agg, topFans] = await Promise.all([
    getGroupMasteryAgg(groupId),
    getActiveFansByGroup(slug, 3),
  ]);
  return { ...agg, topFans };
}

export interface GroupComeback {
  title: string;
  artist: string;
  releaseDate: string;
  kind: string;
}

/** An ACTIVE comeback for this group, released within the last 14 days. */
export const getGroupActiveComeback = unstable_cache(
  async (groupId: number): Promise<GroupComeback | null> => {
  const db = createPublicReadClient();
  const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await db
    .from('comebacks')
    .select('title, artist, release_date, kind')
    .eq('group_id', groupId)
    .eq('active', true)
    .gte('release_date', cutoff)
    .order('release_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    title: data.title as string,
    artist: data.artist as string,
    releaseDate: data.release_date as string,
    kind: data.kind as string,
  };
  },
  ['db:group-hub:getGroupActiveComeback:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['groups'] },
);

export interface GroupMvPulse {
  viewsGained: number;
  mvCount: number;
  trackedSince: string; // YYYY-MM-DD
}

/** Weekly view delta across the group's tracked MVs. Null when the group is not
 *  tracked or there is not yet a 7-day-old snapshot to diff against. */
export const getGroupMvPulse = unstable_cache(
  async (groupId: number): Promise<GroupMvPulse | null> => {
  const db = createPublicReadClient();
  const { data: tracked } = await db
    .from('mv_tracking')
    .select('id, created_at')
    .eq('group_id', groupId)
    .eq('active', true);
  if (!tracked || tracked.length === 0) return null;

  const ids = tracked.map((t) => t.id as string);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const { data: snaps } = await db
    .from('mv_snapshots')
    .select('mv_id, snapshot_date, views')
    .in('mv_id', ids)
    .order('snapshot_date', { ascending: false });

  // latest snapshot per mv, and the newest snapshot on-or-before a week ago.
  const latest = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const s of (snaps ?? []) as Array<{ mv_id: string; snapshot_date: string; views: number }>) {
    if (!latest.has(s.mv_id)) latest.set(s.mv_id, s.views);
    if (s.snapshot_date <= weekAgo && !prior.has(s.mv_id)) prior.set(s.mv_id, s.views);
  }
  let viewsGained = 0;
  let diffed = 0;
  for (const id of ids) {
    if (latest.has(id) && prior.has(id)) {
      viewsGained += Math.max(0, latest.get(id)! - prior.get(id)!);
      diffed += 1;
    }
  }
  if (diffed === 0) return null; // no 7-day window yet -> section hides

  const trackedSince = tracked
    .map((t) => (t.created_at as string).slice(0, 10))
    .sort()[0] ?? new Date().toISOString().slice(0, 10);
  return { viewsGained, mvCount: diffed, trackedSince };
  },
  ['db:group-hub:getGroupMvPulse:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['community'] },
);
