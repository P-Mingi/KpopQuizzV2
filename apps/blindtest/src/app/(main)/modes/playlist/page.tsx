import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { PlaylistPicker } from '@/components/modes/playlist-picker';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Choose Playlist | K-pop Blindtest',
};

interface ArtistGroup {
  id: string;
  name: string;
  count: number;
  gender: string | null;
}

async function fetchPlaylistGroups(): Promise<{ groups: ArtistGroup[]; total: number }> {
  try {
    const supabase = createServiceRoleClient();

    // Get total count (fast, no data transfer)
    const { count: total } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get per-artist counts using a lightweight query
    // Paginate to get all songs' artist_name + gender
    const PAGE_SIZE = 1000;
    type Row = { artist_name: string; gender: string | null };
    const songs: Row[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('songs')
        .select('artist_name, gender')
        .eq('status', 'active')
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      songs.push(...(data as Row[]));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      if (from > 100000) break;
    }

    const artistMeta: Record<string, { count: number; gender: string | null }> = {};
    for (const s of songs) {
      const existing = artistMeta[s.artist_name];
      if (existing) {
        existing.count += 1;
        if (!existing.gender && s.gender) existing.gender = s.gender;
      } else {
        artistMeta[s.artist_name] = { count: 1, gender: s.gender };
      }
    }

    const groups = Object.entries(artistMeta)
      .filter(([, meta]) => meta.count >= 10)
      .map(([name, meta]) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name,
        count: meta.count,
        gender: meta.gender,
      }))
      .sort((a, b) => b.count - a.count);

    return { groups, total: total ?? 0 };
  } catch {
    return { groups: [], total: 0 };
  }
}

export default async function PlaylistPage() {
  const { groups, total } = await fetchPlaylistGroups();

  return <PlaylistPicker groups={groups} totalSongs={total} />;
}
