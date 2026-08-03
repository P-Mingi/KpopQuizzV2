// V-SPACE-FLOW step 4 - the space's own quiz shelf. NO new schema: quizzes
// already carry group_id (and spaces key by group_id), so the shelf is a plain
// filter; the "of {space}" credit is a render-time membership lookup. Public,
// cookie-free, ISR-safe.
import { createPublicReadClient } from '@/lib/supabase/server';
import { resolveIdentities } from '@/lib/verse/identity';

import type { SpaceRole } from '@/lib/verse/roles';

export interface SpaceQuiz {
  id: string;
  title: string;
  slug: string;
  playCount: number;
  username: string | null;
  /** Resolver display name (system account -> "KpopVerse"), for the credit text. */
  displayName: string | null;
  /** The creator's role in this space, when they are a member of it. */
  spaceRole: SpaceRole | null;
}

/** The space's own published quizzes, most played first, with creator credit. */
export async function getSpaceQuizzes(groupId: number, limit = 3): Promise<SpaceQuiz[]> {
  const db = createPublicReadClient();
  const { data } = await db
    .from('quizzes')
    .select('id, title, slug, play_count, creator_id, profiles!quizzes_creator_id_fkey(username)')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .order('play_count', { ascending: false, nullsFirst: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as Array<{ id: string; title: string; slug: string; play_count: number | null; creator_id: string | null; profiles: { username: string | null } | null }>;
  if (rows.length === 0) return [];

  const creatorIds = [...new Set(rows.map((r) => r.creator_id).filter((x): x is string => !!x))];
  const roleBy = new Map<string, SpaceRole>();
  if (creatorIds.length) {
    const { data: mem } = await db.from('space_members').select('user_id, role').eq('group_id', groupId).in('user_id', creatorIds);
    for (const m of (mem ?? []) as Array<{ user_id: string; role: SpaceRole }>) roleBy.set(m.user_id, m.role);
  }
  // Resolve creator names so the credit honors SYSTEM_AUTHOR_DISPLAY (never a raw
  // private username) instead of the bare @username the join returned.
  const ids = creatorIds.length ? await resolveIdentities(creatorIds) : new Map();
  return rows.map((r) => ({
    id: r.id, title: r.title, slug: r.slug, playCount: r.play_count ?? 0,
    username: r.profiles?.username ?? null,
    displayName: r.creator_id ? (ids.get(r.creator_id)?.displayName ?? null) : null,
    spaceRole: (r.creator_id && roleBy.get(r.creator_id)) || null,
  }));
}
