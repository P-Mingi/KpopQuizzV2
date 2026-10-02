// Spot check of the years cache against the catalogue (read-only, ANON key, no Deezer call).
//   npx tsx scripts/v12/catalogue/years-sample.mts "Gee" "Dynamite" "APT."      exact titles
//   npx tsx scripts/v12/catalogue/years-sample.mts --year 2026 [n]              a sample of one year
import { readFileSync } from 'node:fs';
import { anonDb, pageAll } from './lib.mts';

const cache = JSON.parse(readFileSync(new URL('./data/deezer-years.json', import.meta.url), 'utf8')) as Record<string, { release: string | null; isrc: string | null }>;
interface S { deezer_track_id: number; title: string; artist_name: string; year: number | null; generation: string | null }
const songs = await pageAll<S>(() => anonDb().from('songs').select('deezer_track_id, title, artist_name, year, generation').order('id'));
const args = process.argv.slice(2);
const line = (s: S): string => { const h = cache[String(s.deezer_track_id)]; return `${s.artist_name} | ${s.title} | gen ${s.generation} | stored ${s.year} | Deezer release ${h?.release} | ISRC ${h?.isrc}`; };
if (args[0] === '--year') {
  const y = args[1]!; const n = Number(args[2] ?? 25);
  const hit = songs.filter((s) => cache[String(s.deezer_track_id)]?.release?.startsWith(y));
  console.log(`${hit.length} stored songs with a Deezer release date in ${y}; acts: ${new Set(hit.map((s) => s.artist_name)).size}`);
  for (let i = 0; i < hit.length; i += Math.max(1, Math.floor(hit.length / n))) console.log('  ' + line(hit[i]!));
} else {
  for (const t of args) for (const s of songs.filter((x) => x.title.toLowerCase() === t.toLowerCase())) console.log(line(s));
}
