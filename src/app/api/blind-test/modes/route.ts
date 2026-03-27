import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { STATIC_MODES, buildGroupMode, MIN_SONGS_FOR_GROUP_MODE } from '@/lib/blind-test-modes';

import type { BlindTestMode } from '@/lib/blind-test-modes';

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

  // Solo artists: match both genders
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

  // Dynamic group modes - count songs with chorus per group
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

  // Stats
  const { count: totalSongs } = await supabase
    .from('blind_test_songs').select('id', { count: 'exact', head: true }).eq('status', 'active');
  const { count: totalPlays } = await supabase
    .from('blind_test_plays').select('id', { count: 'exact', head: true });

  const allModes = [...staticModes, ...groupModes];

  return NextResponse.json({
    modes: {
      difficulty: staticModes.filter(m => m.category === 'difficulty'),
      group: groupModes,
      era: staticModes.filter(m => m.category === 'era'),
      special: staticModes.filter(m => m.category === 'special'),
    },
    stats: {
      total_songs: totalSongs ?? 0,
      total_plays: totalPlays ?? 0,
      available_modes: allModes.filter(m => m.available).length,
      total_modes: allModes.length,
    },
  });
}
