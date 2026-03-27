import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { BLIND_TEST_MODES } from '@/lib/blind-test-modes';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();

  const modesWithAvailability = await Promise.all(
    BLIND_TEST_MODES.map(async (mode) => {
      const clipColumn = `clip_${mode.clip_point}`;

      let query = supabase
        .from('blind_test_songs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .not(clipColumn, 'is', null);

      if (mode.filter.group_slug) {
        const { data: group } = await supabase
          .from('groups')
          .select('id')
          .eq('slug', mode.filter.group_slug)
          .single();
        if (group) query = query.eq('group_id', group.id);
        else return { ...mode, song_count_available: 0, available: false };
      }
      if (mode.filter.gender) query = query.eq('gender', mode.filter.gender);
      if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
      if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
      if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);

      const { count } = await query;
      const songCountAvailable = count ?? 0;

      return {
        ...mode,
        song_count_available: songCountAvailable,
        available: songCountAvailable >= mode.song_count,
      };
    }),
  );

  const { count: totalSongs } = await supabase
    .from('blind_test_songs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: totalPlays } = await supabase
    .from('blind_test_plays')
    .select('id', { count: 'exact', head: true });

  return NextResponse.json({
    modes: modesWithAvailability,
    stats: {
      total_songs: totalSongs ?? 0,
      total_plays: totalPlays ?? 0,
      available_modes: modesWithAvailability.filter(m => m.available).length,
      total_modes: modesWithAvailability.length,
    },
  });
}
