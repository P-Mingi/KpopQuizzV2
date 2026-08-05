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

type DeezerResult = { artist?: { name?: string }; album?: { cover_xl?: string; cover_big?: string } };

function pickCover(results: DeezerResult[], artistLower: string): string | null {
  // First try exact artist match
  for (const r of results) {
    if (r.artist?.name?.toLowerCase() === artistLower && (r.album?.cover_xl || r.album?.cover_big)) {
      return r.album!.cover_xl || r.album!.cover_big || null;
    }
  }
  // Fallback: partial match
  for (const r of results) {
    if (r.artist?.name?.toLowerCase().includes(artistLower) && (r.album?.cover_xl || r.album?.cover_big)) {
      return r.album!.cover_xl || r.album!.cover_big || null;
    }
  }
  // Last resort: first result
  if (results[0]?.album?.cover_xl || results[0]?.album?.cover_big) {
    return results[0].album!.cover_xl || results[0].album!.cover_big || null;
  }
  return null;
}

async function fetchDeezerCover(songTitle: string, artist: string): Promise<string | null> {
  const artistLower = artist.toLowerCase();
  try {
    // Try 1: structured artist + track search
    const q1 = encodeURIComponent(`artist:"${artist}" track:"${songTitle}"`);
    const res1 = await fetch(`https://api.deezer.com/search?q=${q1}&limit=3`);
    const data1 = await res1.json();
    const results1 = (data1.data ?? []) as DeezerResult[];
    const cover1 = pickCover(results1, artistLower);
    if (cover1) return cover1;

    // Try 2: plain search "songTitle artist" (catches solo credits, remixes, etc.)
    await new Promise(r => setTimeout(r, 200));
    const q2 = encodeURIComponent(`${songTitle} ${artist}`);
    const res2 = await fetch(`https://api.deezer.com/search?q=${q2}&limit=3`);
    const data2 = await res2.json();
    const results2 = (data2.data ?? []) as DeezerResult[];
    const cover2 = pickCover(results2, artistLower);
    if (cover2) return cover2;

    // Try 3: just the song title (last resort for very popular songs)
    await new Promise(r => setTimeout(r, 200));
    const q3 = encodeURIComponent(songTitle);
    const res3 = await fetch(`https://api.deezer.com/search?q=${q3}&limit=3`);
    const data3 = await res3.json();
    const results3 = (data3.data ?? []) as DeezerResult[];
    // For title-only search, accept any result with a cover
    if (results3[0]?.album?.cover_xl || results3[0]?.album?.cover_big) {
      return results3[0].album!.cover_xl || results3[0].album!.cover_big || null;
    }
  } catch (err) {
    console.error(`  Deezer API error for "${songTitle}" by "${artist}":`, err);
  }
  return null;
}

// Extract artist name from a single-artist category title.
// "Best aespa song?" => "aespa"
// "Best BTS song?" => "BTS"
// "Best Stray Kids song?" => "Stray Kids"
// Multi-artist titles like "Iconic K-pop songs" => null (use subtitle instead)
function extractArtistFromTitle(title: string): string | null {
  // Pattern: "Best {ARTIST} song(s)?"  or  "{ARTIST} songs"
  const m = title.match(/^(?:Best\s+)?(.+?)\s+songs?\s*\??$/i);
  if (!m) return null;
  const candidate = m[1]!.trim();
  // Reject generic/multi-artist titles
  const rejects = ['k-pop', 'kpop', '4th gen', '3rd gen', 'iconic', 'best', 'top', 'popular', 'boy group', 'girl group', 'hit'];
  if (rejects.some(r => candidate.toLowerCase().includes(r))) return null;
  return candidate;
}

// Usage: npx tsx scripts/fetch-deezer-covers.ts [--force]
// --force: re-fetch covers even if they already exist (to fix wrong ones)
const forceMode = process.argv.includes('--force');

async function main() {
  console.log(`Fetching Deezer album covers for song items...${forceMode ? ' (FORCE mode: overwriting existing)' : ''}\n`);

  // Get all song categories
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

  for (const cat of categories) {
    const { data: items } = await supabase
      .from('tot_items')
      .select('id, name, subtitle, image_url')
      .eq('category_id', cat.id);

    if (!items) continue;

    // Derive the artist from the category title for single-artist categories.
    // Falls back to item.subtitle for multi-artist categories (where subtitle IS
    // the artist, e.g. "aespa" in an "Iconic K-pop songs" category).
    const catArtist = extractArtistFromTitle(cat.title);

    console.log(`[${cat.title}] ${items.length} songs (artist: ${catArtist ?? 'per-item subtitle'})`);

    for (const item of items) {
      // Skip if already has an image (unless --force)
      if (item.image_url && !forceMode) {
        skipped++;
        continue;
      }

      // The search artist: category-level artist for single-artist categories,
      // or the subtitle for multi-artist categories.
      const artist = catArtist || item.subtitle || '';
      if (!artist) {
        console.log(`  ? ${item.name} - no artist info, skipping`);
        notFound++;
        continue;
      }

      // Rate limit: 1 request per 250ms to be nice to Deezer
      await new Promise(r => setTimeout(r, 250));

      const cover = await fetchDeezerCover(item.name, artist);
      if (cover) {
        await supabase
          .from('tot_items')
          .update({ image_url: cover })
          .eq('id', item.id);
        updated++;
        console.log(`  + ${item.name} by ${artist}`);
      } else {
        notFound++;
        console.log(`  - ${item.name} by ${artist} - not found on Deezer`);
      }
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already had image): ${skipped}, Not found: ${notFound}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
