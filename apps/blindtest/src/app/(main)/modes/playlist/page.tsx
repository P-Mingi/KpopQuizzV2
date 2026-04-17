import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { PlaylistPicker } from '@/components/modes/playlist-picker';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Choose Playlist | K-pop Blindtest',
};

export const dynamic = 'force-dynamic';

interface ArtistGroup {
  id: string;
  name: string;
  count: number;
  gender: string | null;
}

// Exclusion patterns matching what the game API actually uses
const EXCLUDED_PATTERNS = [
  '%remix%', '%instrumental%', '%inst.%', '%(inst)%',
  '%karaoke%', '%MR removed%', '%sped up%', '%speed up%',
];

async function fetchPlaylistGroups(): Promise<{ groups: ArtistGroup[]; total: number }> {
  try {
    const supabase = createServiceRoleClient();
    const curationEnabled = process.env.SONGS_IS_CURATED === 'true';

    // Build a base query that matches what the game actually plays
    // For the "All K-pop" total, use curated songs if curation is enabled
    let totalQuery = supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('preview_url', 'is', null);

    // Apply remix/instrumental exclusions
    for (const pattern of EXCLUDED_PATTERNS) {
      totalQuery = totalQuery.not('title', 'ilike', pattern);
    }

    // For general playlists, game uses curated subset
    if (curationEnabled) {
      totalQuery = totalQuery.eq('is_curated', true);
    }

    const { count: total } = await totalQuery;

    // For per-artist counts, get ALL playable songs (group playlists use full catalog)
    const PAGE_SIZE = 1000;
    type Row = { artist_name: string; gender: string | null };
    const songs: Row[] = [];
    let from = 0;
    while (true) {
      let query = supabase
        .from('songs')
        .select('artist_name, gender')
        .eq('status', 'active')
        .not('preview_url', 'is', null);

      // Apply same exclusions
      for (const pattern of EXCLUDED_PATTERNS) {
        query = query.not('title', 'ilike', pattern);
      }

      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
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
