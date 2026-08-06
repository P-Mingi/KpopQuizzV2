import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env (supports overrides for production)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ---------------------------------------------------------------------------
// Strategy: match blindtest's approach. The blindtest `songs` table stores a
// deezer_track_id per song and fetches covers via the direct /track/{id} API.
//
// For tot_items we:
//   1. Cross-reference against the songs table by title + artist.
//      If matched, use the song's deezer_track_id for a direct /track/{id}
//      lookup (same as blindtest) to get the correct cover_xl.
//   2. If not in the songs table, search Deezer but ONLY accept results where
//      the artist name matches. Never accept unrelated artist results.
// ---------------------------------------------------------------------------

type DeezerResult = { artist?: { name?: string }; album?: { cover_xl?: string; cover_big?: string } };
type SongRow = { title: string; artist_name: string; deezer_track_id: number; album_cover_big: string | null };

/** Load the full songs table (blindtest) for cross-referencing. */
async function loadSongsTable(): Promise<SongRow[]> {
  const all: SongRow[] = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('songs')
      .select('title, artist_name, deezer_track_id, album_cover_big')
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...(data as SongRow[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

/** Find a matching song in the blindtest table. */
function findSongMatch(songs: SongRow[], title: string, artist: string): SongRow | null {
  const titleLower = title.toLowerCase().trim();
  const artistLower = artist.toLowerCase().trim();

  // Exact title + artist contains
  for (const s of songs) {
    if (s.title.toLowerCase() === titleLower && s.artist_name.toLowerCase().includes(artistLower)) {
      return s;
    }
  }
  // Exact title + artist contains (reverse direction)
  for (const s of songs) {
    if (s.title.toLowerCase() === titleLower && artistLower.includes(s.artist_name.toLowerCase())) {
      return s;
    }
  }
  return null;
}

/** Fetch cover via direct /track/{id} API (same as blindtest). */
async function fetchCoverByTrackId(trackId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.deezer.com/track/${trackId}`);
    const track = await res.json() as { album?: { cover_xl?: string; cover_big?: string } };
    return track.album?.cover_xl || track.album?.cover_big || null;
  } catch {
    return null;
  }
}

/** Pick cover from search results, but ONLY if artist matches. Never accept random. */
function pickCoverStrict(results: DeezerResult[], artistLower: string): string | null {
  // Exact artist match
  for (const r of results) {
    if (r.artist?.name?.toLowerCase() === artistLower && (r.album?.cover_xl || r.album?.cover_big)) {
      return r.album!.cover_xl || r.album!.cover_big || null;
    }
  }
  // Partial match (artist name contains or is contained by)
  for (const r of results) {
    const rArtist = r.artist?.name?.toLowerCase() ?? '';
    if ((rArtist.includes(artistLower) || artistLower.includes(rArtist)) && rArtist.length > 1 && (r.album?.cover_xl || r.album?.cover_big)) {
      return r.album!.cover_xl || r.album!.cover_big || null;
    }
  }
  // NO "first result" fallback. If the artist doesn't match, we skip.
  return null;
}

/** Search Deezer for a cover. Only accepts results with matching artist. */
async function fetchDeezerCoverBySearch(songTitle: string, artist: string): Promise<string | null> {
  const artistLower = artist.toLowerCase();
  try {
    // Try 1: structured artist + track search
    const q1 = encodeURIComponent(`artist:"${artist}" track:"${songTitle}"`);
    const res1 = await fetch(`https://api.deezer.com/search?q=${q1}&limit=5`);
    const data1 = await res1.json();
    const results1 = (data1.data ?? []) as DeezerResult[];
    const cover1 = pickCoverStrict(results1, artistLower);
    if (cover1) return cover1;

    // Try 2: plain search "songTitle artist"
    await new Promise(r => setTimeout(r, 200));
    const q2 = encodeURIComponent(`${songTitle} ${artist}`);
    const res2 = await fetch(`https://api.deezer.com/search?q=${q2}&limit=5`);
    const data2 = await res2.json();
    const results2 = (data2.data ?? []) as DeezerResult[];
    const cover2 = pickCoverStrict(results2, artistLower);
    if (cover2) return cover2;

    // NO title-only fallback. That produces wrong results (e.g. Billy Joel
    // for aespa's "Live My Life"). Better to have no cover than a wrong one.
  } catch (err) {
    console.error(`  Deezer API error for "${songTitle}" by "${artist}":`, err);
  }
  return null;
}

// Extract artist name from a single-artist category title.
function extractArtistFromTitle(title: string): string | null {
  const m = title.match(/^(?:Best\s+)?(.+?)\s+songs?\s*\??$/i);
  if (!m) return null;
  const candidate = m[1]!.trim();
  const rejects = ['k-pop', 'kpop', '4th gen', '3rd gen', 'iconic', 'best', 'top', 'popular', 'boy group', 'girl group', 'hit'];
  if (rejects.some(r => candidate.toLowerCase().includes(r))) return null;
  return candidate;
}

// Usage: npx tsx scripts/fetch-deezer-covers.ts [--force]
const forceMode = process.argv.includes('--force');

async function main() {
  console.log(`Fetching Deezer album covers for song items...${forceMode ? ' (FORCE mode)' : ''}\n`);

  // Load blindtest songs table for cross-referencing
  const songsTable = await loadSongsTable();
  console.log(`Loaded ${songsTable.length} songs from blindtest table for cross-reference.\n`);

  const { data: categories } = await supabase
    .from('tot_categories')
    .select('id, title, type')
    .eq('type', 'song');

  if (!categories || categories.length === 0) {
    console.log('No song categories found.');
    return;
  }

  console.log(`Found ${categories.length} song categories.\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let fromBlindtest = 0;
  let fromSearch = 0;

  for (const cat of categories) {
    const { data: items } = await supabase
      .from('tot_items')
      .select('id, name, subtitle, image_url')
      .eq('category_id', cat.id);

    if (!items) continue;

    const catArtist = extractArtistFromTitle(cat.title);
    console.log(`[${cat.title}] ${items.length} songs (artist: ${catArtist ?? 'per-item subtitle'})`);

    for (const item of items) {
      if (item.image_url && !forceMode) {
        skipped++;
        continue;
      }

      const artist = catArtist || item.subtitle || '';
      if (!artist) {
        console.log(`  ? ${item.name} - no artist info, skipping`);
        notFound++;
        continue;
      }

      await new Promise(r => setTimeout(r, 250));

      // Step 1: Try to find in blindtest songs table
      const songMatch = findSongMatch(songsTable, item.name, artist);
      let cover: string | null = null;
      let source = '';

      if (songMatch) {
        // Use direct /track/{id} API (same as blindtest)
        cover = await fetchCoverByTrackId(songMatch.deezer_track_id);
        source = `track/${songMatch.deezer_track_id}`;
      }

      // Step 2: Search Deezer (strict artist matching only)
      if (!cover) {
        cover = await fetchDeezerCoverBySearch(item.name, artist);
        source = 'search';
      }

      if (cover) {
        await supabase
          .from('tot_items')
          .update({ image_url: cover })
          .eq('id', item.id);
        updated++;
        if (source.startsWith('track/')) fromBlindtest++;
        else fromSearch++;
        console.log(`  + ${item.name} by ${artist} (${source})`);
      } else {
        notFound++;
        console.log(`  - ${item.name} by ${artist} - not found`);
      }
    }
  }

  console.log(`\nDone. Updated: ${updated} (${fromBlindtest} from blindtest, ${fromSearch} from search), Skipped: ${skipped}, Not found: ${notFound}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
