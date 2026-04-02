import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

export async function GET(): Promise<NextResponse> {
  const supabase = createServiceRoleClient();

  const { data: songs } = await supabase
    .from('songs')
    .select('artist_name, gender, generation, is_title_track, difficulty')
    .eq('status', 'active');

  if (!songs) return NextResponse.json({ categories: [], groups: [], total: 0, difficultyStats: { easy: 0, medium: 0, hard: 0 } });

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

  const artistCounts: Record<string, number> = {};
  for (const s of songs) {
    artistCounts[s.artist_name] = (artistCounts[s.artist_name] ?? 0) + 1;
  }

  const groups = Object.entries(artistCounts)
    .filter(([, count]) => count >= 10)
    .map(([name, count]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const difficultyStats = {
    easy: songs.filter((s) => s.difficulty === 'easy').length,
    medium: songs.filter((s) => s.difficulty === 'medium').length,
    hard: songs.filter((s) => s.difficulty === 'hard').length,
  };

  return NextResponse.json({ categories, groups, total, difficultyStats });
}
