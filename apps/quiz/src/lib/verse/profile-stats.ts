// V-PROFILE-ONE step 3 - the fan-resume stats, all DERIVED live (real-data-only:
// every number is a real count/aggregate, a zero is honest, never fabricated).
//   contribXp - sum of per-space contribution XP (space_members.contrib_xp)
//   pages     - distinct PUBLISHED pages the user has a revision on
//   essays    - featured (public) essays authored
//   cards     - showcase pins
//   quiz      - overall accuracy from player_group_mastery (correct/played), null if none
//   spaces    - the user's active memberships (for the cross-space role chips)

import { createServiceRoleClient } from '@/lib/supabase/server';

import type { SpaceRole } from '@/lib/verse/roles';

export interface ProfileSpace { slug: string; name: string; role: SpaceRole }
export interface ProfileStats {
  contribXp: number;
  pages: number;
  essays: number;
  cards: number;
  quizAccuracy: number | null;   // 0-100, null when nothing played (min-gate)
  quizPlays: number;             // songs played (context + min-gate)
  spaces: ProfileSpace[];
}

export async function deriveProfileStats(userId: string): Promise<ProfileStats> {
  const svc = createServiceRoleClient();

  const [membersR, revsR, essaysR, cardsR, masteryR] = await Promise.all([
    svc.from('space_members').select('group_id, role, contrib_xp').eq('user_id', userId).eq('status', 'active'),
    svc.from('verse_revisions').select('entity_id').eq('author', userId).eq('entity_type', 'page').limit(1000),
    svc.from('verse_essays').select('id', { count: 'exact', head: true }).eq('author', userId).eq('status', 'featured'),
    svc.from('verse_profile_shelf').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    svc.from('player_group_mastery').select('songs_correct, songs_played').eq('player_id', userId),
  ]);

  const members = (membersR.data ?? []) as Array<{ group_id: number; role: SpaceRole; contrib_xp: number | null }>;
  const contribXp = members.reduce((s, m) => s + (m.contrib_xp ?? 0), 0);

  // Distinct published pages contributed to.
  const pageIds = [...new Set(((revsR.data ?? []) as Array<{ entity_id: string }>).map((r) => Number(r.entity_id)).filter(Number.isFinite))];
  let pages = 0;
  if (pageIds.length) {
    const { count } = await svc.from('verse_pages').select('id', { count: 'exact', head: true }).in('id', pageIds).eq('status', 'published');
    pages = count ?? 0;
  }

  const mastery = (masteryR.data ?? []) as Array<{ songs_correct: number | null; songs_played: number | null }>;
  const played = mastery.reduce((s, m) => s + (m.songs_played ?? 0), 0);
  const correct = mastery.reduce((s, m) => s + (m.songs_correct ?? 0), 0);
  const quizAccuracy = played > 0 ? Math.round((correct / played) * 100) : null;

  // Resolve the membership groups for the role chips.
  let spaces: ProfileSpace[] = [];
  if (members.length) {
    const { data: groups } = await svc.from('groups').select('id, slug, name, fandom_name').in('id', [...new Set(members.map((m) => m.group_id))]);
    const byId = new Map((groups ?? []).map((g) => [(g as { id: number }).id, g as { id: number; slug: string; name: string; fandom_name: string }]));
    const order: Record<SpaceRole, number> = { space_admin: 0, curator: 1, contributor: 2, member: 3, visitor: 4 };
    spaces = members
      .map((m) => { const g = byId.get(m.group_id); return g ? { slug: g.slug, name: g.fandom_name || g.name, role: m.role } : null; })
      .filter((x): x is ProfileSpace => x !== null)
      .sort((a, b) => order[a.role] - order[b.role]);
  }

  return { contribXp, pages, essays: essaysR.count ?? 0, cards: cardsR.count ?? 0, quizAccuracy, quizPlays: played, spaces };
}
