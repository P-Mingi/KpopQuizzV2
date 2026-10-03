// Copy of the live `groups` and `songs` rows as INSERTs for a LOCAL scratch database (read-only on
// the project: ANON key). Used only by local-replay.sh; the output goes to a scratch folder and is
// not committed.
//   npx tsx scripts/v12/catalogue/export-seed.mts <out.sql>
import { writeFileSync } from 'node:fs';
import { anonDb, lit, pageAll } from './lib.mts';

const out = process.argv[2];
if (!out) { console.error('usage: export-seed.mts <out.sql>'); process.exit(2); }
const db = anonDb();
const G = ['id', 'name', 'slug', 'fandom_name', 'display_color', 'text_color', 'is_custom', 'needs_review', 'created_by_user', 'generation'];
const S = ['id', 'deezer_track_id', 'title', 'artist_name', 'preview_url', 'group_id', 'gender', 'generation', 'is_title_track', 'year', 'language', 'status', 'is_curated', 'tier', 'deezer_rank'];
const groups = await pageAll<Record<string, string | number | boolean | null>>(() => db.from('groups').select(G.join(', ')).order('id'));
const songs = await pageAll<Record<string, string | number | boolean | null>>(() => db.from('songs').select(S.join(', ')).order('id'));
const row = (cols: string[], r: Record<string, string | number | boolean | null>): string => `(${cols.map((c) => lit(r[c])).join(', ')})`;
const sql = [
  'begin;',
  `insert into groups (${G.join(', ')}) values\n${groups.map((g) => row(G, g)).join(',\n')};`,
  "select setval('groups_id_seq', (select max(id) from groups));",
  `insert into songs (${S.join(', ')}) values\n${songs.map((s) => row(S, s)).join(',\n')};`,
  'commit;',
  '',
].join('\n');
writeFileSync(out, sql);
console.log(`seed: ${groups.length} groups, ${songs.length} songs`);
