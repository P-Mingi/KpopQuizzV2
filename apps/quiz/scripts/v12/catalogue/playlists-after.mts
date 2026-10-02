// What becomes playable once the pending v12-g2 files are applied. Read-only: the catalogue is
// read with the ANON key and the pending SQL files are read from disk; nothing is written to the
// database. Output: docs/growth/catalogue/playlists-after-apply.md
//   npx tsx scripts/v12/catalogue/playlists-after.mts
//
// The pools are computed with the very rule generate uses (lib/blind-test-curated.ts
// songMatchesSpec, SONGS_IS_CURATED on, as in production).
import { readFileSync, writeFileSync } from 'node:fs';
import { anonDb, pageAll } from './lib.mts';
import { KPDH_STATUS, V12_PLAYLISTS, songMatchesSpec, type PlaylistSpec } from '../../../src/lib/blind-test-curated.ts';

const ROOT = new URL('../../../../../', import.meta.url);
const read = (f: string): string => { try { return readFileSync(new URL(`docs/pending-migrations/${f}`, ROOT), 'utf8'); } catch { return ''; } };

interface Song { deezer_track_id: number; title: string; artist_name: string; status: string; group: string | null; gender: string | null; generation: string | null; year: number | null; is_curated: boolean | null; is_title_track: boolean | null }
const db = anonDb();
const { data: groupRows, error } = await db.from('groups').select('id, name, slug');
if (error) throw new Error(error.message);
const slugOf = new Map((groupRows ?? []).map((g) => [g.id as number, g.slug as string]));
const nameOf = new Map((groupRows ?? []).map((g) => [g.slug as string, g.name as string]));
const raw = await pageAll<Record<string, unknown>>(() => db.from('songs').select('deezer_track_id, title, artist_name, status, group_id, gender, generation, year, is_curated, is_title_track').order('id'));
const before: Song[] = raw.map((r) => ({ ...(r as unknown as Song), deezer_track_id: Number(r.deezer_track_id), group: r.group_id === null ? null : slugOf.get(r.group_id as number) ?? null }));

// ----- replay the pending files in apply order, in memory -------------------------------------
const after: Song[] = before.map((s) => ({ ...s }));
const byId = new Map(after.map((s) => [s.deezer_track_id, s]));
const unq = (s: string): string => s.replace(/''/g, "'");
const STR = "'((?:[^']|'')*)'";

// 01 groups
for (const m of read('v12-g2-01-groups.sql').matchAll(/^\s*\('((?:[^']|'')*)', '([a-z0-9-]+)',/gm)) nameOf.set(m[2]!, unq(m[1]!));
// 02, 03, 07 inserts
const tail = new RegExp(`, (\\(select id from groups where slug = '([a-z0-9-]+)'\\)|NULL|\\d+), (NULL|'\\w+'), (NULL|'\\w+'), (NULL|true|false), (NULL|\\d+), (NULL|'\\w+'), '\\{\\}', '\\{\\}', '(\\w+)', (true|false), (NULL|'\\w+'), \\d+$`);
const headRe = new RegExp(`^select (\\d+), ${STR}, ${STR},`);
let inserted = 0;
for (const f of ['v12-g2-02-songs-new-groups.sql', 'v12-g2-03-releases-2026.sql', 'v12-g2-07-kpdh.sql']) {
  for (const line of read(f).split('\n')) {
    if (!line.startsWith('select ')) continue;
    const h = line.match(headRe); const t = line.match(tail);
    if (!h || !t) throw new Error(`cannot parse an insert of ${f}: ${line.slice(0, 80)}`);
    const id = Number(h[1]);
    if (byId.has(id)) continue; // the insert would be skipped
    const str = (v: string): string | null => (v === 'NULL' ? null : v.slice(1, -1));
    const group = t[2] ?? (t[1] === 'NULL' ? null : slugOf.get(Number(t[1])) ?? null);
    const s: Song = { deezer_track_id: id, title: unq(h[2]!), artist_name: unq(h[3]!), status: t[8]!, group: group && nameOf.has(group) ? group : null, gender: str(t[3]!), generation: str(t[4]!), is_title_track: t[5] === 'NULL' ? null : t[5] === 'true', year: t[6] === 'NULL' ? null : Number(t[6]), is_curated: t[9] === 'true' };
    after.push(s); byId.set(id, s); inserted++;
  }
}
// 02 links
for (const m of read('v12-g2-02-songs-new-groups.sql').matchAll(/update songs set group_id = \(select id from groups where slug = '([a-z0-9-]+)'\)\nwhere group_id is null and artist_name = '((?:[^']|'')*)'/g)) {
  for (const s of after) if (s.group === null && s.artist_name === unq(m[2]!) && nameOf.has(m[1]!)) s.group = m[1]!;
}
// 04 fix, 05 backfill
let yearsFixed = 0, yearsFilled = 0;
for (const m of read('v12-g2-04-years-fix.sql').matchAll(/^\s*\((\d+), (\d+), (\d+)\)/gm)) { const s = byId.get(Number(m[1])); if (s && s.year === Number(m[2])) { s.year = Number(m[3]); yearsFixed++; } }
const without05: Song[] = after.map((s) => ({ ...s })); // every file but the backfill (the owner may hold it back)
for (const m of read('v12-g2-05-years-backfill.sql').matchAll(/^\s*\((\d+), (\d+)\)/gm)) { const s = byId.get(Number(m[1])); if (s && s.year === null) { s.year = Number(m[2]); yearsFilled++; } }
// 06 title tracks
let flagged = 0;
for (const m of read('v12-g2-06-title-tracks.sql').matchAll(/where deezer_track_id = (\d+) and is_title_track is distinct from true/g)) { const s = byId.get(Number(m[1])); if (s && s.is_title_track !== true) { s.is_title_track = true; flagged++; } }

// ----- counts ---------------------------------------------------------------------------------
const JUNK = /remix|instrumental|inst\.|karaoke/i;
const cap = (n: number, spec: PlaylistSpec): number => (spec.topByRank ? Math.min(n, spec.topByRank) : n);
const count = (songs: Song[], spec: PlaylistSpec): number => cap(songs.filter((s) => songMatchesSpec(s, spec, true)).length, spec);
const legacy = (songs: Song[], pred: (s: Song) => boolean): number => songs.filter((s) => s.status === 'active' && s.is_curated === true && !JUNK.test(s.title) && pred(s)).length;
const groupCounts = (songs: Song[]): Map<string, number> => { const c = new Map<string, number>(); for (const s of songs) if (s.status === 'active' && s.group && !JUNK.test(s.title)) c.set(s.group, (c.get(s.group) ?? 0) + 1); return c; };
const gb = groupCounts(before); const ga = groupCounts(after);
const playableB = [...gb.entries()].filter(([, n]) => n >= 10).map(([g]) => g);
const playableA = [...ga.entries()].filter(([, n]) => n >= 10).map(([g]) => g);
const newGroups = playableA.filter((g) => !playableB.includes(g)).sort();

const themed: [string, string, PlaylistSpec][] = [
  ['kpop-hits-2026', 'themed', V12_PLAYLISTS['kpop-hits-2026']!],
  ['kpop-hits-2025', 'themed', V12_PLAYLISTS['kpop-hits-2025']!],
  ['5th-gen', 'themed (legacy playlist of generate)', { generation: '5th' }],
  ['tiktok-viral', 'themed', V12_PLAYLISTS['tiktok-viral']!],
  ['kpop-demon-hunters', 'themed', V12_PLAYLISTS['kpop-demon-hunters']!],
  ['recent-hits', 'decision 33', V12_PLAYLISTS['recent-hits']!],
  ['kpop-legends', 'decision 33', V12_PLAYLISTS['kpop-legends']!],
  ['4th-gen-gg', 'decision 33', V12_PLAYLISTS['4th-gen-gg']!],
  ['4th-gen-bg', 'decision 33', V12_PLAYLISTS['4th-gen-bg']!],
];
const verdict = (n: number): string => (n >= 10 ? 'playable' : 'hidden (under 10)');
const cell = (songs: Song[], spec: PlaylistSpec): string => `${count(songs, spec)}: ${verdict(count(songs, spec))}`;
const tt = (songs: Song[]): string => { const n = legacy(songs, (s) => s.is_title_track === true); return `${n}: ${verdict(n)}`; };
const uncapped = (songs: Song[], year: number): Song[] => songs.filter((s) => songMatchesSpec(s, { yearMin: year, yearMax: year }, true));
const acts = (songs: Song[]): number => new Set(songs.map((s) => s.artist_name)).size;
const md = [
  '# What becomes playable once the pending v12-g2 files are applied',
  '',
  `Generated ${new Date().toISOString()} by \`apps/quiz/scripts/v12/catalogue/playlists-after.mts\` (anon key; the pending files are replayed in memory, nothing is written to the database).`,
  '',
  `Catalogue today: ${before.length} songs, ${before.filter((s) => s.status === 'active').length} active. After 01 to 08: ${after.length} songs (${inserted} inserted: ${after.filter((s) => s.status === KPDH_STATUS).length} with the status \`${KPDH_STATUS}\`), ${yearsFixed} years corrected, ${yearsFilled} years filled, ${flagged} title tracks flagged.`,
  '',
  '## Group playlists (a group with at least 10 clean active songs linked to it)',
  '',
  `Today: ${playableB.length}. After apply: ${playableA.length}.`,
  '',
  '| New group playlist | Clean songs today | After |',
  '|---|---|---|',
  ...newGroups.map((g) => `| ${nameOf.get(g) ?? g} (\`${g}\`) | ${gb.get(g) ?? 0} | ${ga.get(g)} |`),
  '',
  'Clean songs of the four acts of the brief, after apply: ' + ['hearts2hearts', 'kickflip', 'rescene', 'nct-wish'].map((g) => `${nameOf.get(g) ?? g} ${ga.get(g) ?? 0}`).join(', ') + '.',
  '',
  '## Themed playlists and decision 33 playlists (the pool generate reads, curated subset on)',
  '',
  '| Playlist | Kind | Today | After apply, without 05 (years backfill) | After apply, all files |',
  '|---|---|---|---|---|',
  ...themed.map(([id, kind, spec]) => `| ${id} | ${kind} | ${cell(before, spec)} | ${cell(without05, spec)} | ${cell(after, spec)} |`),
  `| title-tracks | decision 33 (legacy playlist of generate) | ${tt(before)} | ${tt(after)} | ${tt(after)} |`,
  '',
  `The hits playlists keep their 60 best-ranked songs, so 60 is their ceiling. Songs with the year before the cap, all files applied: 2026: ${uncapped(after, 2026).length} songs by ${acts(uncapped(after, 2026))} acts; 2025: ${uncapped(after, 2025).length} songs by ${acts(uncapped(after, 2025))} acts. Without 05: 2026: ${uncapped(without05, 2026).length} songs by ${acts(uncapped(without05, 2026))} acts; 2025: ${uncapped(without05, 2025).length} songs by ${acts(uncapped(without05, 2025))} acts.`,
  '',
].join('\n');
writeFileSync(new URL('docs/growth/catalogue/playlists-after-apply.md', ROOT), md);
console.log(md);
