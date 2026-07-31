// W3K.2 - era timeline read model. Loads a group's eras (newest first) with their
// clustered albums and, when a curator has written one, the 'era_story' narration
// (excerpt + crawlable HTML). Everything here is real: scaffolded eras with no story
// render an honest invite, never fabricated prose. ISR-safe (public read client).
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { albumSlug } from '@/lib/verse/slug';
import { renderTipTapJSON, plainTextExcerpt } from '@/lib/verse/render-content';

export interface EraAlbum { id: number; title: string; slug: string; type: string; release_date: string | null; mbid: string | null; }

export interface EraTimelineItem {
  id: number;
  name: string;
  slug: string | null;
  concept: string | null;
  color: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  scaffolded: boolean;
  albums: EraAlbum[];
  storyExcerpt: string;         // '' when no story authored yet
  storyHtml: string;            // '' when empty; crawlable SSR HTML for inline expand
  storyContent: unknown | null; // TipTap JSON, to seed the inline editor
  currentRevisionId: number | null;
  locked: boolean;
}

/** A group's eras, newest first, each with albums + optional authored story. */
export const getEras = cache(async (groupId: number): Promise<EraTimelineItem[]> => {
  const db = createPublicReadClient();

  const { data: eraRows } = await db
    .from('eras')
    .select('id, name, slug, concept, color, period_start, period_end, scaffolded')
    .eq('group_id', groupId)
    .order('period_start', { ascending: false, nullsFirst: false })
    .order('ord', { ascending: false });
  const eras = (eraRows ?? []) as Array<{ id: number; name: string; slug: string | null; concept: string | null; color: string | null; period_start: string | null; period_end: string | null; scaffolded: boolean }>;
  if (eras.length === 0) return [];

  const eraIds = eras.map((e) => e.id);

  // Albums for these eras, and any authored era_story content (both bounded, ids known).
  const [{ data: albumRows }, { data: storyRows }] = await Promise.all([
    db.from('albums').select('id, title, type, release_date, era_id, musicbrainz_mbid').in('era_id', eraIds).order('release_date', { ascending: true, nullsFirst: false }),
    db.from('verse_content').select('entity_id, content, current_revision_id, locked').eq('entity_type', 'era').eq('section_key', 'era_story').in('entity_id', eraIds.map(String)),
  ]);

  const albumsByEra = new Map<number, EraAlbum[]>();
  for (const r of (albumRows ?? []) as Array<{ id: number; title: string; type: string; release_date: string | null; era_id: number; musicbrainz_mbid: string | null }>) {
    const list = albumsByEra.get(r.era_id) ?? [];
    list.push({ id: r.id, title: r.title, slug: albumSlug(r.title), type: r.type, release_date: r.release_date, mbid: r.musicbrainz_mbid });
    albumsByEra.set(r.era_id, list);
  }

  const storyByEra = new Map<string, { content: unknown; current_revision_id: number | null; locked: boolean }>();
  for (const r of (storyRows ?? []) as Array<{ entity_id: string; content: unknown; current_revision_id: number | null; locked: boolean }>) {
    storyByEra.set(r.entity_id, { content: r.content, current_revision_id: r.current_revision_id, locked: r.locked });
  }

  return eras.map((e) => {
    const story = storyByEra.get(String(e.id));
    const html = story ? renderTipTapJSON(story.content) : '';
    return {
      id: e.id, name: e.name, slug: e.slug, concept: e.concept, color: e.color,
      periodStart: e.period_start, periodEnd: e.period_end, scaffolded: e.scaffolded,
      albums: albumsByEra.get(e.id) ?? [],
      storyExcerpt: story ? plainTextExcerpt(story.content, 160) : '',
      storyHtml: html,
      storyContent: story?.content ?? null,
      currentRevisionId: story?.current_revision_id ?? null,
      locked: story?.locked ?? false,
    };
  });
});
