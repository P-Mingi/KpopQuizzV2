// Match "artist | title" lines against the catalogue (read-only, ANON key).
//   npx tsx scripts/v12/catalogue/match.mts "FIFTY FIFTY|Cupid" "ZICO|Any Song"
// Prints every stored song of that act whose title contains the given title.
import { anonDb } from './lib.mts';

const db = anonDb();
for (const arg of process.argv.slice(2)) {
  const [artist, title] = arg.split('|').map((s) => s.trim());
  const { data, error } = await db.from('songs')
    .select('deezer_track_id, title, artist_name, status, year, tier, is_curated, is_title_track, deezer_rank, group_id')
    .ilike('artist_name', `%${artist}%`).ilike('title', `%${title}%`).limit(12);
  if (error) { console.log(`${arg}: ERROR ${error.message}`); continue; }
  console.log(`${arg}: ${(data ?? []).length ? '' : 'NOT IN CATALOGUE'}`);
  for (const s of data ?? []) console.log(`   ${JSON.stringify(s)}`);
}
