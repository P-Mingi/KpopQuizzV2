import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import { STATIC_MODES, buildGroupMode, MIN_SONGS_FOR_GROUP_MODE } from '@/lib/blind-test-modes';

import type { BlindTestMode } from '@/lib/blind-test-modes';

export const revalidate = 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countSongsForMode(supabase: any, mode: BlindTestMode): Promise<number> {
  const clipColumn = `clip_${mode.clip_point}`;

  let query = supabase
    .from('blind_test_songs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .not(clipColumn, 'is', null);

  if (mode.filter.group_slug) {
    const { data: group } = await supabase
      .from('groups').select('id').eq('slug', mode.filter.group_slug).single();
    if (group) query = query.eq('group_id', group.id);
    else return 0;
  }

  if (mode.id === 'solo-artists') {
    query = query.in('gender', ['solo_female', 'solo_male']);
  } else if (mode.filter.gender) {
    query = query.eq('gender', mode.filter.gender);
  }

  if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
  if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
  if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);
  if (mode.filter.is_title_track !== undefined) query = query.eq('is_title_track', mode.filter.is_title_track);

  const { count } = await query;
  return count ?? 0;
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();

  // Static modes with availability
  const staticModes = await Promise.all(
    STATIC_MODES.map(async (mode) => {
      const count = await countSongsForMode(supabase, mode);
      return { ...mode, song_count_available: count, available: count >= mode.song_count };
    }),
  );

  // Dynamic group modes
  const { data: songRows } = await supabase
    .from('blind_test_songs')
    .select('group_id, groups!inner(name, slug)')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  const groupMap: Record<string, { name: string; slug: string; count: number }> = {};
  for (const row of songRows ?? []) {
    const g = row.groups as unknown as { name: string; slug: string } | null;
    if (!g?.slug) continue;
    if (!groupMap[g.slug]) groupMap[g.slug] = { name: g.name, slug: g.slug, count: 0 };
    groupMap[g.slug]!.count++;
  }

  const groupModes = Object.values(groupMap)
    .filter(g => g.count >= MIN_SONGS_FOR_GROUP_MODE)
    .sort((a, b) => b.count - a.count)
    .map(g => {
      const mode = buildGroupMode({ name: g.name, slug: g.slug, song_count: g.count });
      return { ...mode, song_count_available: g.count, available: g.count >= mode.song_count };
    });

  // Thumbnails for mode cards (batch query)
  const { data: allActiveSongs } = await supabase
    .from('blind_test_songs')
    .select('youtube_id, group_id, generation, gender')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getThumbnails(filter: any, count = 4): string[] {
    let pool = allActiveSongs ?? [];
    if (filter.group_slug) {
      const gid = (songRows ?? []).find(
        (s: Record<string, unknown>) => (s.groups as { slug: string } | null)?.slug === filter.group_slug
      )?.group_id;
      if (gid) pool = pool.filter(s => s.group_id === gid);
    }
    if (filter.gender) pool = pool.filter(s => s.gender === filter.gender);
    if (filter.generation) pool = pool.filter(s => s.generation === filter.generation);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(s => s.youtube_id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addThumbs = (modes: any[]) => modes.map((m: any) => ({
    ...m,
    thumbnails: getThumbnails(m.filter ?? {}, m.category === 'group' ? 2 : 4),
  }));

  // Stats
  const totalSongs = allActiveSongs?.length ?? 0;
  const { count: totalPlays } = await supabase
    .from('bt_plays')
    .select('id', { count: 'exact', head: true });

  const allModes = [...staticModes, ...groupModes];

  return NextResponse.json({
    modes: {
      difficulty: addThumbs(staticModes.filter(m => m.category === 'difficulty')),
      group: addThumbs(groupModes),
      era: addThumbs(staticModes.filter(m => m.category === 'era')),
      special: addThumbs(staticModes.filter(m => m.category === 'special')),
    },
    stats: {
      total_songs: totalSongs,
      total_plays: totalPlays ?? 0,
      available_modes: allModes.filter(m => m.available).length,
    },
  });
}
