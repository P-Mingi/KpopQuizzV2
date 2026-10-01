// Server reads for the v11 quiz page (P4). Public data only, cookie-free client, all
// cached at the stats TTL like the legacy page's reads (FREE-VIABILITY), so the page
// stays ISR and a crawl wave never multiplies DB reads. Called only when
// NEXT_PUBLIC_UX_V1 is on: the flag-off page runs none of this.

import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { getAdvertisablePlaylists } from '@/lib/blind-test-playlists';

/** Profile columns a hall of fame row may show (what /u/[username] already shows). */
const PERSON_COLS = 'username, avatar_url, name_accent, name_font, bias';

export interface P4Person {
  username: string;
  avatarUrl: string | null;
  accent: string | null;
  font: string | null;
  bias: string | null;
}

export interface P4HofRow {
  person: P4Person | null;
  score: number;
  total: number;
  timeSeconds: number | null;
}

interface PlayRow {
  score: number;
  total_questions: number;
  time_taken_seconds: number | null;
  player_id: string | null;
  profiles: { username: string; avatar_url: string | null; name_accent: string | null; name_font: string | null; bias: string | null } | null;
}

/**
 * Is the relaxed-run column live (docs/pending-migrations/v11-p4-relaxed-runs.sql)?
 * Until the owner applies it, "Play without a timer" stays hidden and the hall of fame
 * reads exactly like today (fail soft: a missing column is an error, never a 500).
 */
export const relaxedRunsLive = unstable_cache(
  async (): Promise<boolean> => {
    try {
      const db = createPublicReadClient();
      const { error } = await db.from('plays').select('relaxed').limit(1);
      return !error;
    } catch {
      return false;
    }
  },
  ['p4:relaxed-live:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['plays'] },
);

/**
 * Hall of fame, top `limit`: the same read and ordering as the legacy
 * getQuizHallOfFame (score desc, fastest first, best row per signed-in player), minus
 * relaxed runs once the column is live (DESIGN-SPEC 16.7: relaxed runs do not enter
 * the hall of fame).
 */
export const getP4HallOfFame = unstable_cache(
  async (quizId: string, limit: number, excludeRelaxed: boolean): Promise<P4HofRow[]> => {
    const db = createPublicReadClient();
    let q = db
      .from('plays')
      .select(`score, total_questions, time_taken_seconds, player_id, profiles(${PERSON_COLS})`)
      .eq('quiz_id', quizId);
    if (excludeRelaxed) q = q.eq('relaxed', false);
    const { data, error } = await q
      .order('score', { ascending: false })
      .order('time_taken_seconds', { ascending: true, nullsFirst: false })
      .limit(40);
    if (error) throw new Error(`p4 hall of fame: ${error.message}`);
    const seen = new Set<string>();
    const out: P4HofRow[] = [];
    for (const r of (data ?? []) as unknown as PlayRow[]) {
      if (r.player_id) {
        if (seen.has(r.player_id)) continue;
        seen.add(r.player_id);
      }
      const p = r.profiles;
      out.push({
        person: p ? { username: p.username, avatarUrl: p.avatar_url, accent: p.name_accent, font: p.name_font, bias: p.bias } : null,
        score: r.score,
        total: r.total_questions,
        timeSeconds: r.time_taken_seconds,
      });
      if (out.length >= limit) break;
    }
    return out;
  },
  ['p4:hall-of-fame:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['plays'] },
);

export interface P4Creator {
  username: string;
  avatarUrl: string | null;
  xp: number;
  quizzes: number;
  playsReceived: number;
}

/** "Made by" card: the creator's public counters (profiles.total_quizzes_created, total_plays_received). */
export const getP4Creator = unstable_cache(
  async (creatorId: string): Promise<P4Creator | null> => {
    const db = createPublicReadClient();
    const { data, error } = await db
      .from('profiles')
      .select('username, avatar_url, xp, total_quizzes_created, total_plays_received')
      .eq('id', creatorId)
      .maybeSingle();
    if (error) throw new Error(`p4 creator: ${error.message}`);
    if (!data) return null;
    const r = data as { username: string; avatar_url: string | null; xp: number | null; total_quizzes_created: number | null; total_plays_received: number | null };
    return { username: r.username, avatarUrl: r.avatar_url, xp: r.xp ?? 0, quizzes: r.total_quizzes_created ?? 0, playsReceived: r.total_plays_received ?? 0 };
  },
  ['p4:creator:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['quizzes'] },
);

/** Published quizzes of a group (DESIGN-SPEC 16.10: counts from published quizzes, never groups.quiz_count). */
export const getP4GroupQuizCount = unstable_cache(
  async (groupId: number): Promise<number> => {
    const db = createPublicReadClient();
    const { count, error } = await db
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'published');
    if (error) throw new Error(`p4 group count: ${error.message}`);
    return count ?? 0;
  },
  ['p4:group-quiz-count:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['quizzes'] },
);

/**
 * The group's blindtest playlist, if it has one (lib/blind-test-playlists.ts rule:
 * ROUND_SIZE clean songs). One cached read of the playlist list for every quiz page.
 */
const playlistGroups = unstable_cache(
  async (): Promise<Array<{ slug: string; songs: number }>> => {
    const p = await getAdvertisablePlaylists();
    return p.groups.map((g) => ({ slug: g.slug, songs: g.songs }));
  },
  ['p4:bt-groups:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['songs'] },
);

export async function getP4GroupPlaylist(groupSlug: string): Promise<{ songs: number } | null> {
  const list = await playlistGroups();
  const g = list.find((x) => x.slug === groupSlug);
  return g ? { songs: g.songs } : null;
}
