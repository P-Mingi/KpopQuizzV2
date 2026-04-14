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

async function fetchDeezerCover(songTitle: string, artist: string): Promise<string | null> {
  const query = encodeURIComponent(`${songTitle} ${artist}`);
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`);
    const data = await res.json();
    if (data.data?.[0]?.album?.cover_xl) {
      return data.data[0].album.cover_xl;
    }
    if (data.data?.[0]?.album?.cover_big) {
      return data.data[0].album.cover_big;
    }
  } catch (err) {
    console.error(`  Deezer API error for "${songTitle} ${artist}":`, err);
  }
  return null;
}

async function main() {
  console.log('Fetching Deezer album covers for song items...\n');

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

    console.log(`[${cat.title}] ${items.length} songs`);

    for (const item of items) {
      // Skip if already has an image
      if (item.image_url) {
        skipped++;
        continue;
      }

      // Rate limit: 1 request per 200ms to be nice to Deezer
      await new Promise(r => setTimeout(r, 200));

      const cover = await fetchDeezerCover(item.name, item.subtitle || '');
      if (cover) {
        await supabase
          .from('tot_items')
          .update({ image_url: cover })
          .eq('id', item.id);
        updated++;
        console.log(`  + ${item.name} (${item.subtitle})`);
      } else {
        notFound++;
        console.log(`  - ${item.name} (${item.subtitle}) - not found`);
      }
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already had image): ${skipped}, Not found: ${notFound}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
