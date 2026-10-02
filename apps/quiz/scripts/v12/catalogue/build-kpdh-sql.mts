// KPop Demon Hunters soundtrack songs as pending SQL. Read-only: the catalogue is read with the
// ANON key, Deezer with plain GETs; the only output is one SQL file and one report.
//   npx tsx scripts/v12/catalogue/build-kpdh-sql.mts
//
// The list of songs is lib/blind-test-curated.ts (KPDH_SONGS). The two TWICE songs are already
// active TWICE rows and are not touched. Every other song is inserted with the status KPDH_STATUS
// ('soundtrack'), no group, no gender, no generation, not curated, no tier: nothing but the KPDH
// playlist can read it.
import { writeFileSync } from 'node:fs';
import { anonDb, lit } from './lib.mts';
import { KPDH_SONGS, KPDH_STATUS } from '../../../src/lib/blind-test-curated.ts';

const ROOT = new URL('../../../../../', import.meta.url);
const db = anonDb();
const ids = KPDH_SONGS.map((s) => s.deezerId);
const { data: stored, error } = await db.from('songs').select('deezer_track_id, title, artist_name, status, group_id').in('deezer_track_id', ids);
if (error) throw new Error(error.message);
const have = new Map((stored ?? []).map((r) => [Number(r.deezer_track_id), r]));

// Korean-language songs by real acts that are on the soundtrack but not in the catalogue.
const KOREAN = new Set([3412534641, 3412534651]);

const inserts: string[] = [];
const lines: string[] = [];
for (const s of KPDH_SONGS) {
  const row = have.get(s.deezerId);
  if (row) { lines.push(`| ${s.deezerId} | ${s.artist} | ${s.title} | already stored: status ${row.status}, group_id ${row.group_id} | no change |`); continue; }
  const t = await (await fetch(`https://api.deezer.com/track/${s.deezerId}`)).json();
  if (t?.error || !t?.preview) { lines.push(`| ${s.deezerId} | ${s.artist} | ${s.title} | Deezer: ${t?.error ? 'not served' : 'no preview'} | LEFT OUT |`); continue; }
  const releaseYear = typeof t.release_date === 'string' ? Number(t.release_date.slice(0, 4)) : null;
  const isrcYear = typeof t.isrc === 'string' && /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(t.isrc) ? 2000 + Number(t.isrc.slice(5, 7)) : null;
  // Same rule as the years files: a year only when release date and ISRC agree.
  const year = releaseYear !== null && isrcYear !== null && (releaseYear === isrcYear || releaseYear === isrcYear + 1) ? releaseYear : null;
  const vals = [
    s.deezerId, t.title as string, s.artist, (t.album?.title ?? null) as string | null,
    (t.album?.cover_small ?? null) as string | null, (t.album?.cover_medium ?? null) as string | null, (t.album?.cover_big ?? null) as string | null,
    t.preview as string, (t.duration ?? null) as number | null,
  ].map(lit).join(', ');
  inserts.push([
    'insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)',
    `select ${vals}, NULL, NULL, NULL, NULL, ${lit(year)}, ${KOREAN.has(s.deezerId) ? lit('korean') : 'NULL'}, '{}', '{}', ${lit(KPDH_STATUS)}, false, NULL, ${lit((t.rank ?? 0) as number)}`,
    `where not exists (select 1 from songs where deezer_track_id = ${s.deezerId})`,
    'on conflict do nothing;',
  ].join('\n'));
  lines.push(`| ${s.deezerId} | ${s.artist} | ${t.title} | Deezer: preview yes, ${t.duration}s, rank ${t.rank}, released ${t.release_date}, year written ${year ?? 'none'} | insert, status ${KPDH_STATUS} |`);
}

const newIds = KPDH_SONGS.filter((s) => !have.has(s.deezerId)).map((s) => s.deezerId).join(', ');
const sql = [
  `-- WHAT: the KPop Demon Hunters soundtrack songs, with their own non-active status '${KPDH_STATUS}'.`,
  '-- WHY: the kpop-demon-hunters blindtest playlist (growth v12, SYSTEM.md 4). The songs of the film\'s fictional acts',
  '--   (HUNTR/X, Saja Boys, Rumi and Jinu) and the two soundtrack songs by acts that are not in the catalogue',
  '--   (MeloMance, Jokers) must be playable in that playlist only: never in the daily, the all-songs pool, a group',
  '--   playlist, ranked, search or a song count. Every one of those readers asks for status = \'active\'',
  '--   (proof: docs/design/growth-v12/run/reports/G2.md, "Reader proof"), so a status of their own keeps them out.',
  '--   The two TWICE songs of the soundtrack are already active TWICE rows; they keep their group and are not touched.',
  `-- ROWS: 1 constraint change (songs.status may also be '${KPDH_STATUS}'), ${inserts.length} insert(s) into songs.`,
  '-- SOURCE: track list = the label\'s store pages and the soundtrack\'s reference article (docs/growth/catalogue/v12-g2-07-kpdh.md);',
  '--   every row value = the public Deezer API.',
  `-- GENERATED: apps/quiz/scripts/v12/catalogue/build-kpdh-sql.mts (anon key, nothing written), ${new Date().toISOString()}.`,
  '-- IDEMPOTENT: the constraint block drops and re-adds the same check; each insert re-checks deezer_track_id and ends',
  '--   with on conflict do nothing. Safe to run twice.',
  '-- APPLY ORDER: any time, before or after the feat/v12 merge. origin/main (a94d77c) and feat/v12 carry the same',
  '--   readers of `songs`, and none of them can show a row of this status (same proof). With the v12 flag off the',
  '--   rows are simply unread.',
  `-- VERIFY: select status, count(*) from songs where deezer_track_id in (${newIds}) group by 1;  -- ${KPDH_STATUS}, ${inserts.length}`,
  `--   select count(*) from songs where status = '${KPDH_STATUS}' and (group_id is not null or is_curated);  -- 0`,
  `-- UNDO: delete from songs where status = '${KPDH_STATUS}';`,
  '--   then: alter table public.songs drop constraint songs_status_check;',
  '--         alter table public.songs add constraint songs_status_check check (status in (\'active\', \'inactive\', \'review\'));',
  '',
  'begin;',
  '',
  '-- 1. Allow the new status. The check was created inline (status IN (\'active\', \'inactive\', \'review\')); it is found',
  '--    by its definition, whatever its name, then re-created under the default name.',
  'do $$',
  'declare c record;',
  'begin',
  '  for c in',
  '    select conname from pg_constraint',
  '    where conrelid = \'public.songs\'::regclass and contype = \'c\' and pg_get_constraintdef(oid) ~* \'\\mstatus\\M\'',
  '  loop',
  '    execute format(\'alter table public.songs drop constraint %I\', c.conname);',
  '  end loop;',
  'end $$;',
  '',
  `alter table public.songs add constraint songs_status_check check (status in ('active', 'inactive', 'review', '${KPDH_STATUS}'));`,
  '',
  '-- 2. The songs.',
  '',
  inserts.join('\n\n'),
  '',
  'commit;',
  '',
].join('\n');
writeFileSync(new URL('docs/pending-migrations/v12-g2-07-kpdh.sql', ROOT), sql);

const md = [
  '# v12-g2-07-kpdh: KPop Demon Hunters soundtrack songs (dry-run report)',
  '',
  `Generated ${new Date().toISOString()} by \`apps/quiz/scripts/v12/catalogue/build-kpdh-sql.mts\` (anon key, nothing written to the database).`,
  '',
  `Songs in the playlist (lib/blind-test-curated.ts KPDH_SONGS): ${KPDH_SONGS.length}. Already stored: ${have.size}. Inserts in the SQL file: ${inserts.length}, all with status \`${KPDH_STATUS}\`.`,
  '',
  `Playable in the kpop-demon-hunters playlist today: ${[...have.values()].filter((r) => r.status === 'active').length} (hidden, under 10). After the file is applied: ${have.size + inserts.length}.`,
  '',
  '| Deezer id | Act as credited | Title | State | In the SQL file |',
  '|---|---|---|---|---|',
  ...lines,
  '',
  '## Track list: the two sources (opened 2026-10-02)',
  '',
  '- A, the label: Republic Records store, [CD](https://www.republicrecords.com/products/kpop-demon-hunters-soundtrack-from-the-netflix-film-cd): "1. TAKEDOWN - TWICE (Jeongyeon, Jihyo, Chaeyoung) 2. How It\'s Done - HUNTR/X (EJAE, Audrey Nuna, and REI AMI) 3. Soda Pop - Saja Boys (Andrew Choi, Neckwav, Danny Chung, Kevin Woo, and samUIL Lee) 4. Golden - HUNTR/X 5. Strategy - TWICE 6. TAKEDOWN - HUNTR/X 7. Your Idol - Saja Boys 8. Free - Rumi and Jinu (EJAE and Andrew Choi) 9. What It Sounds Like - HUNTR/X 10. Love Maybe - MeloMance 11. Path - Jokers 12. Score Suite - Marcelo Zarvos". "Jinu\'s Lament by Jinu (Ahn Hyo-seop) & EJAE" is track 2 of the [deluxe digital album](https://www.republicrecords.com/products/kpop-demon-hunters-soundtrack-from-the-netflix-film-deluxe-digital-album).',
  '- B, the reference wiki: [Wikipedia, KPop Demon Hunters (soundtrack)](https://en.wikipedia.org/wiki/KPop_Demon_Hunters_(soundtrack)): same twelve tracks in the same order, artists "Jeongyeon, Jihyo, Chaeyoung", "Huntrix (Ejae, Audrey Nuna, Rei Ami)", "Saja Boys", "Twice", "Ejae, Andrew Choi", "MeloMance", "Jokers", "Marcelo Zarvos"; the deluxe edition "adding Prologue (Hunter\'s Mantra) and Jinu\'s Lament".',
  '- Deezer: album 771853201 (standard, 12 tracks) and 816455081 (deluxe); the ids above are the standard edition\'s, except Jinu\'s Lament (deluxe only).',
  '',
  '## Choices',
  '',
  '- Left out: "Score Suite" (Marcelo Zarvos), an instrumental score cue, and "Prologue (Hunter\'s Mantra)", a score piece. Sing-along, instrumental and a cappella versions of the deluxe edition are not songs of their own.',
  '- "Strategy" on the soundtrack is the version without the featured artist ([Wikipedia](https://en.wikipedia.org/wiki/Strategy_(Twice_song)): "The solo version was later included on the soundtrack to the film KPop Demon Hunters"); it is the stored row 3412534591. The stored "Strategy (feat. Megan Thee Stallion)" (3125530581) is another recording and is not in the playlist.',
  '- MeloMance and Jokers are real acts, but they are not in the catalogue and their songs are there only because the film uses them: they get the same status as the fictional acts, so they never enter a K-pop pool. Owner decision if they should be ordinary active songs instead.',
  '- Fictional rows carry no group, no gender, no generation, `is_curated = false` and no tier: even if a reader forgot the status, the daily (curated + tier), the generation and gender playlists and the group playlists would still not pick them.',
  '- Artist names as credited on the label\'s track list: "HUNTR/X", "Saja Boys", "Rumi and Jinu", "Jinu", "MeloMance", "Jokers". Titles as Deezer serves them.',
  '- Not verified by two sources: the release date 2025-06-20 on an official page (Wikipedia and Deezer state it; the store pages carry no date). The file does not depend on it beyond the `year` value, which follows the same Deezer rule as the years files.',
  '',
].join('\n');
writeFileSync(new URL('docs/growth/catalogue/v12-g2-07-kpdh.md', ROOT), md);
console.log(md);
