// W4.7 - Space Insights: per-space analytics for curators. All from real data (memberships,
// revisions, discussions, quiz plays, the quality engine). No page-view tracking exists for
// Verse, so metrics are the honest ones we actually have.
import { createServiceRoleClient } from '@/lib/supabase/server';
import { computeQuests } from '@/lib/verse/quests';
import { getRecentChanges } from '@/lib/verse/recent-changes';
import { tierName } from '@/lib/verse/reputation';

export interface TopContributor { userId: string; name: string; username: string | null; xp: number; tier: string; avatarUrl: string | null; avatarBg: string | null; avatarText: string | null }

export interface SpaceInsights {
  members: number; membersLast30: number;
  coveragePct: number; openQuests: number;
  edits: number; editsLast7: number;
  comments: number;
  plays: number; quizCount: number;
  topContributors: TopContributor[];
}

export async function getSpaceInsights(groupId: number, slug: string, groupName: string): Promise<SpaceInsights> {
  const db = createServiceRoleClient();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const since7 = Date.now() - 7 * 86400000;

  const [members, membersLast30, board, changes, comments, groupRow, topRows] = await Promise.all([
    db.from('space_members').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active'),
    db.from('space_members').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active').gte('joined_at', since30),
    computeQuests(groupId, slug, groupName),
    getRecentChanges(groupId, 1000),
    db.from('verse_discussions').select('id', { count: 'exact', head: true }).eq('entity_type', 'group').eq('entity_id', String(groupId)).eq('status', 'visible'),
    db.from('groups').select('total_plays, quiz_count').eq('id', groupId).maybeSingle(),
    db.from('space_members').select('user_id, contrib_xp').eq('group_id', groupId).eq('status', 'active').gt('contrib_xp', 0).order('contrib_xp', { ascending: false }).limit(5),
  ]);

  const top = (topRows.data ?? []) as Array<{ user_id: string; contrib_xp: number }>;
  const { data: profs } = top.length ? await db.from('profiles').select('id, username, display_name, avatar_url, avatar_bg, avatar_text').in('id', top.map((t) => t.user_id)) : { data: [] };
  const byId = new Map((profs ?? []).map((p: { id: string }) => [p.id, p as { id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null }]));

  const g = groupRow.data as { total_plays: number | null; quiz_count: number | null } | null;

  return {
    members: members.count ?? 0,
    membersLast30: membersLast30.count ?? 0,
    coveragePct: board.coveragePct,
    openQuests: board.quests.length,
    edits: changes.length,
    editsLast7: changes.filter((c) => new Date(c.createdAt).getTime() >= since7).length,
    comments: comments.count ?? 0,
    plays: g?.total_plays ?? 0,
    quizCount: g?.quiz_count ?? 0,
    topContributors: top.map((t) => {
      const p = byId.get(t.user_id);
      return { userId: t.user_id, name: p?.display_name || p?.username || 'Fan', username: p?.username ?? null, xp: t.contrib_xp, tier: tierName(t.contrib_xp), avatarUrl: p?.avatar_url ?? null, avatarBg: p?.avatar_bg ?? null, avatarText: p?.avatar_text ?? null };
    }),
  };
}
