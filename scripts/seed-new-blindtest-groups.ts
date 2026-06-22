/**
 * Seed blindtest songs for groups that have NO songs in the DB yet.
 * Fetches top tracks from Deezer, inserts into the `songs` table.
 *
 * Usage (from apps/quiz/):
 *   npx tsx ../../scripts/seed-new-blindtest-groups.ts
 *
 * Prerequisites:
 *   - Migration 084 must be run first (creates the group rows).
 *   - .env.local must have NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const vars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !vars[t.slice(0, i)]) vars[t.slice(0, i)] = t.slice(i + 1);
}

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL!, vars.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface DeezerTrack {
  id: number;
  title: string;
  title_short: string;
  artist: { name: string; id: number };
  album: { title: string; cover_small: string; cover_medium: string; cover_big: string };
  preview: string;
  duration: number;
}

interface NewArtist {
  deezer_id: number;
  artist_name: string;
  group_slug: string;
  gender: string;
  generation: string;
}

const NEW_ARTISTS: NewArtist[] = [
  { deezer_id: 271210292, artist_name: 'KATSEYE',     group_slug: 'katseye',     gender: 'gg',          generation: '5th' },
  { deezer_id: 9197006,   artist_name: 'AKMU',        group_slug: 'akmu',        gender: 'coed',        generation: '3rd' },
  { deezer_id: 192285787, artist_name: 'FIFTY FIFTY', group_slug: 'fifty-fifty', gender: 'gg',          generation: '4th' },
];

async function fetchDeezerTop(artistId: number, limit = 50): Promise<DeezerTrack[]> {
  const res = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=${limit}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return (data.data ?? []).filter(
    (t: DeezerTrack) => t.preview && t.preview.length > 10,
  );
}

function filterTracks(tracks: DeezerTrack[]): DeezerTrack[] {
  const skip = /remix|instrumental|inst\.|karaoke|mr removed|sped up|speed up|slowed|reverb|live version/i;
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (skip.test(t.title)) return false;
    const key = t.title_short.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  for (const artist of NEW_ARTISTS) {
    console.log(`\n--- ${artist.artist_name} (deezer=${artist.deezer_id}) ---`);

    // Check if songs already exist
    const { count } = await supabase
      .from('songs')
      .select('id', { count: 'exact', head: true })
      .eq('artist_name', artist.artist_name);

    if (count && count > 0) {
      console.log(`  Already has ${count} songs, skipping.`);
      continue;
    }

    // Resolve group_id
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', artist.group_slug)
      .single();

    if (!group) {
      console.error(`  Group '${artist.group_slug}' not found. Run migration 084 first.`);
      continue;
    }

    // Fetch from Deezer
    const raw = await fetchDeezerTop(artist.deezer_id, 50);
    const tracks = filterTracks(raw).slice(0, 18);
    console.log(`  Fetched ${raw.length} tracks, filtered to ${tracks.length}`);

    let added = 0;
    for (const t of tracks) {
      const { error } = await supabase.from('songs').insert({
        deezer_track_id: t.id,
        title: t.title_short ?? t.title,
        artist_name: artist.artist_name,
        album_name: t.album?.title ?? null,
        album_cover_small: t.album?.cover_small ?? null,
        album_cover_medium: t.album?.cover_medium ?? null,
        album_cover_big: t.album?.cover_big ?? null,
        preview_url: t.preview,
        duration: t.duration,
        group_id: group.id,
        gender: artist.gender,
        generation: artist.generation,
        status: 'active',
      });
      if (error) {
        console.error(`  Failed: ${t.title} - ${error.message}`);
      } else {
        added++;
      }
    }
    console.log(`  Added ${added} songs.`);
  }

  console.log('\nDone. Run generate-wrong-answers for the new songs via the admin UI.');
}

main().catch(console.error);
