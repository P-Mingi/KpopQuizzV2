// W4.4 - Space Quest Board. Computes the space's open quests LIVE from real gaps (the
// same signals as the W3K.10 quality engine). No quest table: a quest exists only because
// a gap does, and disappears when the gap is filled. Framing: gaps are invitations to
// help write the group's story, never criticism.
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { contentIsEmpty } from '@/lib/verse/render-content';
import { idolSlug } from '@/lib/verse/slug';
import { XP_BY_KIND } from '@/lib/verse/reputation';

export type QuestSize = 'Quick' | 'Medium' | 'Big';

export interface Quest {
  id: string;
  kind: string;
  size: QuestSize;
  xp: number;
  icon: string;          // Tabler icon name
  title: string;         // invitation-toned
  why: string;
  href: string;
  curatorOnly?: boolean;
}

export interface QuestBoard {
  coveragePct: number;
  quests: Quest[];
  sizeCounts: Record<QuestSize, number>;
}

const authoredSet = (rows: Array<{ entity_id: string; content: unknown }>): Set<string> => {
  const s = new Set<string>();
  for (const r of rows) if (!contentIsEmpty(r.content)) s.add(String(r.entity_id));
  return s;
};

export const computeQuests = cache(async (groupId: number, slug: string, groupName: string): Promise<QuestBoard> => {
  const db = createPublicReadClient();

  const [{ data: eras }, { data: idols }, { data: content }, { count: toursPub }, { count: awardsPub }] = await Promise.all([
    db.from('eras').select('id, name').eq('group_id', groupId).order('period_start', { ascending: false, nullsFirst: false }),
    db.from('idols').select('id, name, ord').eq('group_id', groupId).eq('active', true).order('ord'),
    db.from('verse_content').select('entity_type, entity_id, section_key, content').in('entity_type', ['group', 'era', 'idol']),
    db.from('tours').select('id', { count: 'exact', head: true }).eq('group_id', groupId),
    db.from('awards').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'published'),
  ]);

  const rows = (content ?? []) as Array<{ entity_type: string; entity_id: string; section_key: string; content: unknown }>;
  const overviewDone = rows.some((r) => r.entity_type === 'group' && r.entity_id === String(groupId) && r.section_key === 'overview' && !contentIsEmpty(r.content));
  const eraNarrated = authoredSet(rows.filter((r) => r.entity_type === 'era' && r.section_key === 'era_story'));
  const idolLore = authoredSet(rows.filter((r) => r.entity_type === 'idol' && r.section_key === 'lore'));

  const eraList = (eras ?? []) as Array<{ id: number; name: string }>;
  const idolList = (idols ?? []) as Array<{ id: number; name: string }>;

  const quests: Quest[] = [];

  if (!overviewDone) {
    quests.push({ id: 'overview', kind: 'overview', size: 'Big', xp: XP_BY_KIND.overview!, icon: 'flag',
      title: `Introduce ${groupName} to the world`, why: 'This space is still waiting for its overview.', href: `/verse/${slug}/about` });
  }
  for (const e of eraList) {
    if (eraNarrated.has(String(e.id))) continue;
    quests.push({ id: `era-${e.id}`, kind: 'era_story', size: 'Medium', xp: XP_BY_KIND.era_story!, icon: 'timeline',
      title: `The ${e.name} era has no story yet`, why: 'Tell what this comeback meant.', href: `/verse/${slug}/timeline` });
  }
  for (const i of idolList) {
    if (idolLore.has(String(i.id))) continue;
    quests.push({ id: `lore-${i.id}`, kind: 'idol_lore', size: 'Quick', xp: XP_BY_KIND.idol_lore!, icon: 'user-heart',
      title: `${i.name}'s lore is waiting to be written`, why: 'A few sourced facts and background.', href: `/verse/${slug}/members/${idolSlug(i.name)}` });
  }
  if ((toursPub ?? 0) === 0) {
    quests.push({ id: 'tours', kind: 'tour', size: 'Medium', xp: XP_BY_KIND.tour!, icon: 'microphone-2',
      title: `Map out ${groupName}'s tours`, why: 'No tours documented yet. Needs a source to publish.', href: `/verse/${slug}/curate`, curatorOnly: true });
  }

  // Coverage: the same four signals the quality engine scores (kept in sync = 25% for a
  // space with only awards). Presented as "N% complete".
  const signals = [overviewDone, eraNarrated.size > 0, idolLore.size > 0, (awardsPub ?? 0) > 0];
  const coveragePct = Math.round((signals.filter(Boolean).length / signals.length) * 100);

  const sizeCounts: Record<QuestSize, number> = { Quick: 0, Medium: 0, Big: 0 };
  for (const q of quests) sizeCounts[q.size]++;

  return { coveragePct, quests, sizeCounts };
});
