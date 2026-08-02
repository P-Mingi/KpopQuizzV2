// W4.4 - Space Quest Board. Computes the space's open quests LIVE from real gaps (the
// same signals as the W3K.10 quality engine). No quest table: a quest exists only because
// a gap does, and disappears when the gap is filled. Framing: gaps are invitations to
// help write the group's story, never criticism.
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { contentIsEmpty } from '@/lib/verse/render-content';
import { wantedPages } from '@/lib/verse/pages/links';
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
  /** V-POLISH-2 A5: the row's visual (album art mbid or an idol portrait).
   * The repetition fix: rows differ by image and phrasing, not sixteen stamps. */
  art?: { kind: 'cover'; mbid: string } | { kind: 'photo'; url: string };
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

  // Phase 1 - the group-scoped facts that decide which quests exist. eras/idols
  // also yield the entity id-sets phase 2 scopes verse_content by: that table is
  // polymorphic on (entity_type, entity_id) with no group_id column, so bounding a
  // read to one space means naming its entity ids (the getEras pattern).
  const [
    { data: eras, error: erasErr },
    { data: idols, error: idolsErr },
    { count: toursPub, error: toursErr },
    { count: awardsPub, error: awardsErr },
    { data: eraAlbums, error: eraAlbumsErr },
  ] = await Promise.all([
    db.from('eras').select('id, name').eq('group_id', groupId).order('period_start', { ascending: false, nullsFirst: false }),
    db.from('idols').select('id, name, ord, photo_url').eq('group_id', groupId).eq('active', true).order('ord'),
    db.from('tours').select('id', { count: 'exact', head: true }).eq('group_id', groupId),
    db.from('awards').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'published'),
    db.from('albums').select('era_id, musicbrainz_mbid').eq('group_id', groupId).not('era_id', 'is', null),
  ]);
  // Bake law (getSpace): on this hour-long ISR route a transient read failure must
  // FAIL the render, not bake a degraded board (missing quests, a wrong coverage %)
  // that then serves as truth until the next revalidate. eraAlbums is cosmetic (era
  // cover art) - its loss only drops thumbnails, so it warns instead of throwing.
  for (const [label, err] of [['eras', erasErr], ['idols', idolsErr], ['tours', toursErr], ['awards', awardsErr]] as const) {
    if (err) throw new Error(`computeQuests(${slug}): ${label} query failed: ${JSON.stringify(err)}`);
  }
  if (eraAlbumsErr) console.warn(`computeQuests(${slug}): eraAlbums query failed (covers hidden): ${JSON.stringify(eraAlbumsErr)}`);

  const eraList = (eras ?? []) as Array<{ id: number; name: string }>;
  const idolList = (idols ?? []) as Array<{ id: number; name: string; photo_url?: string | null }>;

  // Phase 2 - authored content for THIS space's entities only. An unscoped
  // .in('entity_type', ...) select hits PostgREST's 1000-row default cap: once
  // verse_content across all groups passed 1000 rows, arbitrary groups' rows fell
  // outside the window, so coverage under-counted and quests appeared/vanished at
  // random. Scoping to the known id-sets keeps every read small. All three are
  // page-defining (they decide overview/era/idol quests and coverage), so all throw.
  const eraIds = eraList.map((e) => String(e.id));
  const idolIds = idolList.map((i) => String(i.id));
  const [
    { data: overviewRow, error: overviewErr },
    { data: eraStoryRows, error: eraStoryErr },
    { data: idolLoreRows, error: idolLoreErr },
  ] = await Promise.all([
    db.from('verse_content').select('content').eq('entity_type', 'group').eq('entity_id', String(groupId)).eq('section_key', 'overview').maybeSingle(),
    eraIds.length
      ? db.from('verse_content').select('entity_id, content').eq('entity_type', 'era').eq('section_key', 'era_story').in('entity_id', eraIds)
      : Promise.resolve({ data: [] as Array<{ entity_id: string; content: unknown }>, error: null }),
    idolIds.length
      ? db.from('verse_content').select('entity_id, content').eq('entity_type', 'idol').eq('section_key', 'lore').in('entity_id', idolIds)
      : Promise.resolve({ data: [] as Array<{ entity_id: string; content: unknown }>, error: null }),
  ]);
  for (const [label, err] of [['overview', overviewErr], ['era_story', eraStoryErr], ['idol_lore', idolLoreErr]] as const) {
    if (err) throw new Error(`computeQuests(${slug}): ${label} content query failed: ${JSON.stringify(err)}`);
  }

  const overviewDone = !!overviewRow && !contentIsEmpty((overviewRow as { content: unknown }).content);
  const eraNarrated = authoredSet((eraStoryRows ?? []) as Array<{ entity_id: string; content: unknown }>);
  const idolLore = authoredSet((idolLoreRows ?? []) as Array<{ entity_id: string; content: unknown }>);
  const coverByEra = new Map<number, string>();
  for (const a of (eraAlbums ?? []) as { era_id: number; musicbrainz_mbid: string | null }[]) {
    if (a.musicbrainz_mbid && !coverByEra.has(a.era_id)) coverByEra.set(a.era_id, a.musicbrainz_mbid);
  }
  // Varied invitations, assigned deterministically so the board is stable
  // between renders but no two adjacent era rows read identically.
  const ERA_WHYS = [
    'Tell what this comeback meant.',
    'What did this era sound like to the fandom?',
    'The charts are recorded; the feeling is not. Write it.',
    'Someone discovers this era today. Hand them the story.',
    'Two paragraphs and this chapter stops being a gap.',
  ];

  const quests: Quest[] = [];

  if (!overviewDone) {
    quests.push({ id: 'overview', kind: 'overview', size: 'Big', xp: XP_BY_KIND.overview!, icon: 'flag',
      title: `Introduce ${groupName} to the world`, why: 'This space is still waiting for its overview.', href: `/verse/${slug}/about` });
  }
  for (const [i, e] of eraList.entries()) {
    if (eraNarrated.has(String(e.id))) continue;
    const mbid = coverByEra.get(e.id);
    quests.push({ id: `era-${e.id}`, kind: 'era_story', size: 'Medium', xp: XP_BY_KIND.era_story!, icon: 'timeline',
      title: `The ${e.name} era has no story yet`, why: ERA_WHYS[i % ERA_WHYS.length]!, href: `/verse/${slug}/timeline`,
      ...(mbid ? { art: { kind: 'cover' as const, mbid } } : {}) });
  }
  for (const i of idolList) {
    if (idolLore.has(String(i.id))) continue;
    quests.push({ id: `lore-${i.id}`, kind: 'idol_lore', size: 'Quick', xp: XP_BY_KIND.idol_lore!, icon: 'user-heart',
      title: `${i.name}'s lore is waiting to be written`, why: 'A few sourced facts and background.', href: `/verse/${slug}/members/${idolSlug(i.name)}`,
      ...(i.photo_url ? { art: { kind: 'photo' as const, url: i.photo_url } } : {}) });
  }
  if ((toursPub ?? 0) === 0) {
    quests.push({ id: 'tours', kind: 'tour', size: 'Medium', xp: XP_BY_KIND.tour!, icon: 'microphone-2',
      title: `Map out ${groupName}'s tours`, why: 'No tours documented yet. Needs a source to publish.', href: `/verse/${slug}/curate`, curatorOnly: true });
  }

  // V-PAGES step 4 - WANTED PAGES: red links across published pages become
  // quests (the ledger counts published sources only, so a slug wanted purely
  // by drafts never surfaces). Top 5, mention-weighted.
  const wanted = await wantedPages(groupId);
  for (const w of wanted.slice(0, 5)) {
    quests.push({ id: `wanted-${w.slug}`, kind: 'wiki_wanted', size: 'Medium', xp: XP_BY_KIND.era_story!, icon: 'file-plus',
      title: `"${w.slug.replace(/-/g, ' ')}" is wanted`, why: `Linked from ${w.mentions} page${w.mentions === 1 ? '' : 's'} but does not exist yet.`, href: `/verse/${slug}/wiki` });
  }

  // Coverage: the same four signals the quality engine scores (kept in sync = 25% for a
  // space with only awards). Presented as "N% complete".
  const signals = [overviewDone, eraNarrated.size > 0, idolLore.size > 0, (awardsPub ?? 0) > 0];
  const coveragePct = Math.round((signals.filter(Boolean).length / signals.length) * 100);

  const sizeCounts: Record<QuestSize, number> = { Quick: 0, Medium: 0, Big: 0 };
  for (const q of quests) sizeCounts[q.size]++;

  return { coveragePct, quests, sizeCounts };
});
