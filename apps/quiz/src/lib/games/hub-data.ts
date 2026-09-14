import type { SupabaseClient } from '@supabase/supabase-js';

import { safeFetch } from '@/lib/error-handling';

// One real song option for the blind-test band preview chips.
export interface BandAnswer { title: string; artist: string }

// Reads a small pool of real songs (title + artist) for the blind-test band preview
// and drops today's actual daily-blindtest answers so the preview never spoils them.
// Shared by the /games and /pt/games ISR caches so neither hub shows an empty band.
// It is meant to run INSIDE an unstable_cache: one bounded read pair per hourly
// revalidation, never a per-request read (cost fence).
export async function readBandSongs(
  supabase: SupabaseClient,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<BandAnswer[]> {
  const [bandPool, dailyIds] = await Promise.all([
    safeFetch(
      Promise.resolve(
        supabase.from('songs').select('id, title, artist_name')
          .eq('status', 'active').not('title', 'is', null).not('artist_name', 'is', null).limit(80),
      ).then((r) => (r.data ?? []) as Array<{ id: string; title: string; artist_name: string }>),
      [], '[hub-data] bandPool',
    ),
    safeFetch(
      Promise.resolve(
        supabase.from('daily_blindtests').select('song_ids').eq('date', today).maybeSingle(),
      ).then((r) => ((r.data?.song_ids ?? []) as string[])),
      [], '[hub-data] dailyExclude',
    ),
  ]);
  const excl = new Set(dailyIds);
  return bandPool.filter((s) => !excl.has(s.id)).map((s) => ({ title: s.title, artist: s.artist_name }));
}
