// G2 catalogue snapshot: read-only counts of the live catalogue with the ANON key.
// Never writes. Run from apps/quiz:
//   env -u SUPABASE_SERVICE_ROLE_KEY npx tsx scripts/v12/catalogue/snapshot.mts [artist names...]
import { anonDb, pageAll } from './lib.mts';

const db = anonDb();
interface S { id: string; deezer_track_id: number; title: string; artist_name: string; group_id: number | null; gender: string | null; generation: string | null; year: number | null; language: string | null; status: string; is_title_track: boolean | null; is_curated: boolean | null; tier: string | null; deezer_rank: number | null }
const songs = await pageAll<S>(() => db.from('songs').select('id, deezer_track_id, title, artist_name, group_id, gender, generation, year, language, status, is_title_track, is_curated, tier, deezer_rank').order('id'));
const tally = (k: (s: S) => string): Record<string, number> => { const o: Record<string, number> = {}; for (const s of songs) o[k(s)] = (o[k(s)] ?? 0) + 1; return Object.fromEntries(Object.entries(o).sort()); };
const JUNK = /remix|instrumental|inst\.|karaoke/i;
const clean = songs.filter((s) => s.status === 'active' && !JUNK.test(s.title));
console.log('songs visible to anon:', songs.length, '| clean active:', clean.length);
console.log('status', tally((s) => s.status));
console.log('language', tally((s) => String(s.language)));
console.log('is_title_track', tally((s) => String(s.is_title_track)));
console.log('is_curated', tally((s) => String(s.is_curated)));
console.log('gender', tally((s) => String(s.gender)));
console.log('generation', tally((s) => String(s.generation)));
console.log('tier', tally((s) => String(s.tier)));
console.log('year', tally((s) => String(s.year)));
const gg: Record<string, number> = {};
for (const s of clean) { const k = `${s.generation}/${s.gender}`; gg[k] = (gg[k] ?? 0) + 1; }
console.log('clean generation/gender', Object.fromEntries(Object.entries(gg).sort()));
const cur = clean.filter((s) => s.is_curated);
const cnt = (f: (s: S) => boolean): string => `${clean.filter(f).length} clean / ${cur.filter(f).length} curated`;
console.log('year>=2024:', cnt((s) => (s.year ?? 0) >= 2024), '| year<=2017:', cnt((s) => s.year != null && s.year <= 2017), '| 2025:', cnt((s) => s.year === 2025), '| 2026:', cnt((s) => s.year === 2026));
console.log('4th gg:', cnt((s) => s.generation === '4th' && s.gender === 'gg'), '| 4th bg:', cnt((s) => s.generation === '4th' && s.gender === 'bg'), '| 5th:', cnt((s) => s.generation === '5th'));
console.log('title true:', cnt((s) => s.is_title_track === true), '| title false:', cnt((s) => s.is_title_track === false));
const { data: groups, error } = await db.from('groups').select('*').order('id');
if (error) throw new Error(error.message);
console.log('groups:', groups!.length, 'columns:', Object.keys(groups![0] ?? {}).join(', '));
const want = process.argv.slice(2).length ? process.argv.slice(2) : ['Hearts2Hearts', 'KickFlip', 'RESCENE', 'NCT WISH', 'HUNTR/X', 'Saja Boys', 'izna'];
for (const name of want) {
  const g = groups!.find((x) => String(x.name).toLowerCase() === name.toLowerCase());
  const by = songs.filter((s) => s.artist_name.toLowerCase() === name.toLowerCase());
  const byClean = by.filter((s) => s.status === 'active' && !JUNK.test(s.title));
  console.log(`\n${name}: group row ${g ? JSON.stringify(g) : 'NONE'}\n  songs by artist_name: ${by.length} (clean ${byClean.length}); with this group_id: ${g ? songs.filter((s) => s.group_id === g.id).length : 0}`);
  for (const s of by.slice(0, 40)) console.log(`   ${s.deezer_track_id} | ${s.title} | y${s.year} ${s.generation}/${s.gender} lang=${s.language} tt=${s.is_title_track} tier=${s.tier} rank=${s.deezer_rank} gid=${s.group_id} ${s.status}`);
}
