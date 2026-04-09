import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

interface Row {
  artist_name: string;
  gender: string | null;
  generation: string | null;
  difficulty: string | null;
}

export async function GET(): Promise<NextResponse> {
  const supabase = createServiceRoleClient();

  // Supabase has a server-side max-rows cap (1000 by default); paginate via .range()
  // so we get the full active catalog for accurate per-artist aggregates.
  const PAGE_SIZE = 1000;
  const songs: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('songs')
      .select('artist_name, gender, generation, difficulty')
      .eq('status', 'active')
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    songs.push(...(data as Row[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (from > 100000) break;
  }

  if (songs.length === 0) {
    return NextResponse.json({
      categories: [],
      groups: [],
      total: 0,
      difficultyStats: { easy: 0, medium: 0, hard: 0 },
    });
  }

  const total = songs.length;

  const categories = [
    { id: 'all', name: 'All K-pop', count: total },
    { id: 'gg', name: 'Girl groups', count: songs.filter((s) => s.gender === 'gg').length },
    { id: 'bg', name: 'Boy groups', count: songs.filter((s) => s.gender === 'bg').length },
    { id: 'solo', name: 'Solo artists', count: songs.filter((s) => s.gender === 'solo_female' || s.gender === 'solo_male').length },
    { id: '4th-gen', name: '4th gen', count: songs.filter((s) => s.generation === '4th').length },
    { id: '3rd-gen', name: '3rd gen', count: songs.filter((s) => s.generation === '3rd').length },
    { id: '2nd-gen', name: '2nd gen', count: songs.filter((s) => s.generation === '2nd').length },
  ].filter((c) => c.count >= 10);

  // Per-artist aggregate.
  const artistMeta: Record<string, { count: number; gender: string | null; generation: string | null }> = {};
  for (const s of songs) {
    const existing = artistMeta[s.artist_name];
    if (existing) {
      existing.count += 1;
      if (!existing.gender && s.gender) existing.gender = s.gender;
      if (!existing.generation && s.generation) existing.generation = s.generation;
    } else {
      artistMeta[s.artist_name] = { count: 1, gender: s.gender, generation: s.generation };
    }
  }

  const groups = Object.entries(artistMeta)
    .filter(([, meta]) => meta.count >= 10)
    .map(([name, meta]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      count: meta.count,
      gender: meta.gender,
      generation: meta.generation,
    }))
    .sort((a, b) => b.count - a.count);

  const difficultyStats = {
    easy: songs.filter((s) => s.difficulty === 'easy').length,
    medium: songs.filter((s) => s.difficulty === 'medium').length,
    hard: songs.filter((s) => s.difficulty === 'hard').length,
  };

  return NextResponse.json({ categories, groups, total, difficultyStats });
}
