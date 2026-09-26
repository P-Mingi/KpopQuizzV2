// P3 (UX v11.2): the server reads of the v11 groups index and group hub that do
// not exist yet. Every read is a cookie-free public read (the routes stay
// Static / ISR) wrapped in unstable_cache, like the live group-hub queries
// (FREE-VIABILITY: one DB read per TTL per key, never one per render). Reads
// only: nothing here writes. Callers go through lib/ux-v1/p3/reads.ts (read +
// failClosed): a failed read is never cached, neither here nor in the ISR page.

import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { getAdvertisablePlaylists } from '@/lib/blind-test-playlists';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import { directoryStats, isHiddenGroup } from './model';

import type { GroupsIndex, HubQuiz } from './model';

/**
 * Every visible group (90 of the 91 rows) with its real published-quiz count and
 * the plays of those quizzes, plus the directory numbers of the SEO-locked intro
 * ("N groups", generation line) computed over the same rows exactly as today's
 * getDirectoryGroups page does (every group row with a published quiz). Counts
 * come from `quizzes where status='published'` read in full through
 * fetchAllRows (PostgREST caps a select at 1000 rows), never from the stale
 * groups.quiz_count column. A failed or empty read THROWS, so it is never cached
 * (today's getDirectoryGroups caches [] when its groups read fails).
 */
export const getGroupsIndex = unstable_cache(
  async (): Promise<GroupsIndex> => {
    const db = createPublicReadClient();
    const [published, groupsRes] = await Promise.all([
      fetchAllRows<{ group_id: number | null; play_count: number | null }>(
        () => db.from('quizzes').select('group_id, play_count').eq('status', 'published'),
      ),
      db.from('groups').select('id, slug, name, generation'),
    ]);
    if (groupsRes.error) throw new Error(`groups index: ${groupsRes.error.message}`);
    // Never cache an empty read for an hour (a failed request can come back as no
    // rows): throwing keeps the previous entry and the next render tries again.
    if (published.length === 0 || (groupsRes.data ?? []).length === 0) throw new Error('groups index: empty read');
    const count = new Map<number, number>();
    const plays = new Map<number, number>();
    for (const q of published) {
      if (q.group_id == null) continue;
      count.set(q.group_id, (count.get(q.group_id) ?? 0) + 1);
      plays.set(q.group_id, (plays.get(q.group_id) ?? 0) + (q.play_count ?? 0));
    }
    const rows = (groupsRes.data ?? []) as { id: number; slug: string; name: string; generation: string | null }[];
    return {
      groups: rows
        .filter((g) => !isHiddenGroup(g.slug))
        .map((g) => ({
          slug: g.slug,
          name: g.name,
          quizzes: count.get(g.id) ?? 0,
          plays: plays.get(g.id) ?? 0,
          photo: groupPhotoUrl(g.slug),
        })),
      directory: directoryStats(rows.map((g) => ({ quizzes: count.get(g.id) ?? 0, generation: g.generation }))),
    };
  },
  ['db:ux-v1:p3:groups-index:v2'],
  { revalidate: CACHE_TTL.stats, tags: ['groups', 'quizzes'] },
);

const HUB_QUIZ_COLS = 'slug, title, quiz_type, difficulty, play_count, like_count, total_score_sum, total_completions, question_count, created_at';

/** Every published quiz of one group (the hub's sort + filters run on this list;
 *  its length is the group's real quiz count). Most played first. */
export const getHubQuizzes = unstable_cache(
  async (groupId: number): Promise<HubQuiz[]> => {
    const db = createPublicReadClient();
    const rows = await fetchAllRows<HubQuiz>(
      () => db
        .from('quizzes')
        .select(HUB_QUIZ_COLS)
        .eq('status', 'published')
        .eq('group_id', groupId)
        .order('play_count', { ascending: false })
        .order('created_at', { ascending: false }),
    );
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      quiz_type: r.quiz_type,
      difficulty: r.difficulty,
      play_count: r.play_count ?? 0,
      like_count: r.like_count ?? 0,
      total_score_sum: r.total_score_sum ?? 0,
      total_completions: r.total_completions ?? 0,
      question_count: r.question_count ?? 0,
      created_at: r.created_at,
    }));
  },
  ['db:ux-v1:p3:hub-quizzes:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['quizzes'] },
);

/**
 * Playable blindtest songs per group: the ONE playlist rule of the site
 * (lib/blind-test-playlists.ts: clean active `songs` rows, a group playlist
 * exists at ROUND_SIZE songs), the same list the v11 blindtest hub offers.
 * Cached once for every hub instead of one `songs` scan per hub render.
 */
export const getPlayableSongs = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const { groups } = await getAdvertisablePlaylists();
    // getAdvertisablePlaylists reads through failed pages as "no rows": an empty
    // list is a failed read, not a fact, so it is never cached.
    if (groups.length === 0) throw new Error('playable songs: empty read');
    return Object.fromEntries(groups.map((g) => [g.slug, g.songs]));
  },
  ['db:ux-v1:p3:playable-songs:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['songs'] },
);

export interface HubComment {
  id: string;
  text: string;
  createdAt: string;
  quizSlug: string;
  quizTitle: string;
  /** Public identity only (what /u/[username] already shows). */
  author: { username: string; avatarUrl: string | null; accent: string | null; font: string | null } | null;
}

interface CommentRow {
  id: string;
  content: string | null;
  created_at: string;
  user_id: string;
  quizzes: { slug: string; title: string } | null;
}

/**
 * "From the community" until the posts feed exists (WIRING-MAP section 8: "until
 * then, getCommunityComments for the group"): the latest comments on this
 * group's published quizzes, the comments the quiz pages already show. Short
 * fragments (under 3 characters) are skipped like the live community wall.
 */
export const getGroupComments = unstable_cache(
  async (groupId: number, limit = 3): Promise<HubComment[]> => {
    const db = createPublicReadClient();
    const { data, error } = await db
      .from('quiz_comments')
      .select('id, content, created_at, user_id, quizzes!inner(slug, title, group_id, status)')
      .eq('quizzes.group_id', groupId)
      .eq('quizzes.status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit * 4);
    if (error) throw new Error(`group comments: ${error.message}`);
    const rows = ((data ?? []) as unknown as CommentRow[])
      .filter((r) => r.quizzes && (r.content ?? '').trim().length >= 3)
      .slice(0, limit);
    if (rows.length === 0) return [];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const { data: profs } = await db
      .from('profiles')
      .select('id, username, avatar_url, name_accent, name_font')
      .in('id', ids);
    const byId = new Map(((profs ?? []) as Array<{ id: string; username: string; avatar_url: string | null; name_accent: string | null; name_font: string | null }>).map((p) => [p.id, p]));
    return rows.map((r) => {
      const p = byId.get(r.user_id);
      return {
        id: r.id,
        text: (r.content ?? '').trim(),
        createdAt: r.created_at,
        quizSlug: r.quizzes!.slug,
        quizTitle: r.quizzes!.title,
        author: p ? { username: p.username, avatarUrl: p.avatar_url, accent: p.name_accent, font: p.name_font } : null,
      };
    });
  },
  ['db:ux-v1:p3:group-comments:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['community'] },
);
