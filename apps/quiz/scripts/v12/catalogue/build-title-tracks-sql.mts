// Sourced title tracks as pending SQL. Read-only: the catalogue is read with the ANON key; the
// only output is one SQL file and one report.
//   npx tsx scripts/v12/catalogue/build-title-tracks-sql.mts <verified.json> [<verified.json> ...]
//
// Input: the lists that verify-source.mts wrote (its 4th argument): only citations whose words
// were found on the live page. One source per song. Nothing else is flagged: a song without a
// cited source keeps the value it has.
import { readFileSync, writeFileSync } from 'node:fs';
import { anonDb, pageAll } from './lib.mts';

interface Entry { deezer_track_id: number; artist: string; title: string; outlet: string; url: string; needle: string }
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: build-title-tracks-sql.mts <verified.json>...'); process.exit(2); }
const seen = new Set<number>();
const entries: Entry[] = [];
for (const f of files) for (const e of JSON.parse(readFileSync(f, 'utf8')) as Entry[]) { if (!seen.has(e.deezer_track_id)) { seen.add(e.deezer_track_id); entries.push(e); } }

const ROOT = new URL('../../../../../', import.meta.url);
interface S { deezer_track_id: number; title: string; artist_name: string; status: string; is_title_track: boolean | null; is_curated: boolean | null }
const songs = await pageAll<S>(() => anonDb().from('songs').select('deezer_track_id, title, artist_name, status, is_title_track, is_curated').order('id'));
const byId = new Map(songs.map((s) => [Number(s.deezer_track_id), s]));
// Rows the earlier pending files add (so a title track of a song that is not stored yet is known as such).
const pending = new Set<number>();
for (const f of ['v12-g2-02-songs-new-groups.sql', 'v12-g2-03-releases-2026.sql']) {
  try { for (const m of readFileSync(new URL(`docs/pending-migrations/${f}`, ROOT), 'utf8').matchAll(/^select (\d+), /gm)) pending.add(Number(m[1])); } catch { /* file not generated yet */ }
}

const JUNK = /remix|instrumental|inst\.|karaoke/i;
const today = songs.filter((s) => s.status === 'active' && s.is_curated === true && s.is_title_track === true && !JUNK.test(s.title)).length;
let stored = 0, inPending = 0, unknown = 0, already = 0;
const lines: string[] = [];
const stmts: string[] = [];
for (const e of entries) {
  const s = byId.get(e.deezer_track_id);
  const where = s ? (s.is_title_track === true ? 'stored, already flagged' : `stored (is_title_track ${s.is_title_track})`) : pending.has(e.deezer_track_id) ? 'added by v12-g2-02 or v12-g2-03' : 'NOT in the catalogue and not in a pending file: skipped';
  if (s && s.is_title_track === true) already++; else if (s) stored++; else if (pending.has(e.deezer_track_id)) inPending++; else { unknown++; lines.push(`| ${e.deezer_track_id} | ${e.artist} | ${e.title} | ${where} | [${e.outlet}](${e.url}) |`); continue; }
  lines.push(`| ${e.deezer_track_id} | ${e.artist} | ${e.title} | ${where} | [${e.outlet}](${e.url}): "${e.needle.replace(/\|/g, '/')}" |`);
  stmts.push(`-- ${e.artist}, ${e.title}. Source: ${e.url}\nupdate songs set is_title_track = true, updated_at = now() where deezer_track_id = ${e.deezer_track_id} and is_title_track is distinct from true;`);
}
const n = stmts.length;
const after = today + stored + inPending; // every flagged row is curated (stored rows checked below; pending rows are inserted curated)
const storedNotCurated = entries.filter((e) => byId.get(e.deezer_track_id) && byId.get(e.deezer_track_id)!.is_curated !== true).length;

const sql = [
  '-- WHAT: flag sourced title tracks (songs.is_title_track = true).',
  '-- WHY: only 45 songs are flagged today and none of them is in the curated subset, so the "Title tracks only" playlist',
  '--   is empty (v11 decision 33). Growth v12 flags the title tracks of the new songs and of the hits playlists, each from a',
  '--   cited source (SYSTEM.md 3). A full backfill of the catalogue needs a sourced list and stays an owner decision.',
  `-- ROWS: ${n} update(s), one per song. No insert, no delete. A song that is not in the table yet (it comes with`,
  '--   v12-g2-02 or v12-g2-03) is simply not matched if those files are not applied first.',
  '-- SOURCES: one public page per song, quoted in docs/growth/catalogue/v12-g2-06-title-tracks.md. Every page was fetched',
  '--   and the quoted words were found on it (apps/quiz/scripts/v12/catalogue/verify-source.mts).',
  `-- GENERATED: apps/quiz/scripts/v12/catalogue/build-title-tracks-sql.mts (anon key, nothing written), ${new Date().toISOString()}.`,
  '-- IDEMPOTENT: each update only touches a row that is not flagged yet. Safe to run twice.',
  '-- APPLY ORDER: after v12-g2-02-songs-new-groups.sql and v12-g2-03-releases-2026.sql.',
  `-- VERIFY: select count(*) from songs where is_title_track and deezer_track_id in (${entries.filter((e) => byId.has(e.deezer_track_id) || pending.has(e.deezer_track_id)).map((e) => e.deezer_track_id).join(', ')});  -- ${n + already}`,
  '-- UNDO: update songs set is_title_track = null where deezer_track_id in (<the same ids>);',
  '--   (the rows held NULL or false before; the report lists the previous value of each stored row)',
  '',
  'begin;',
  '',
  stmts.join('\n\n'),
  '',
  'commit;',
  '',
].join('\n');
writeFileSync(new URL('docs/pending-migrations/v12-g2-06-title-tracks.sql', ROOT), sql);

const md = [
  '# v12-g2-06-title-tracks: sourced title tracks (dry-run report)',
  '',
  `Generated ${new Date().toISOString()} by \`apps/quiz/scripts/v12/catalogue/build-title-tracks-sql.mts\` (anon key, nothing written to the database).`,
  '',
  `Citations read: ${entries.length} (from ${files.length} verified list(s)). Updates in the SQL file: ${n} (${stored} stored songs, ${inPending} songs that v12-g2-02 or v12-g2-03 add). Already flagged: ${already}. Skipped, not in the catalogue: ${unknown}.`,
  '',
  `"Title tracks only" playlist (generate's \`title-tracks\`: active, curated, flagged, clean title): ${today} playable today, ${after - storedNotCurated} after 02, 03 and this file are applied. It needs 10 for a round.`,
  '',
  'What counts as a title track here: the song a source calls the title track or the lead single of its album, EP or single album, and the song of a standalone digital single. A pre-release single is not flagged unless the source also calls it a title track.',
  '',
  'Not flagged, and why:',
  '- KickFlip "Twenty", "Umm Great"; RESCENE "YoYo"; NCT WISH "Surf", "Hands Up": pre-release singles.',
  '- RESCENE "Pinball": one wiki calls it a second title track of SCENEDROME, Wikipedia and the press name only "LOVE ATTACK". Contested, left out.',
  '- Every other stored song: no cited source was looked up. The 3,919 songs with no value keep it.',
  '',
  '| Deezer id | Act | Song | In the catalogue | Source and the words found on the page |',
  '|---|---|---|---|---|',
  ...lines,
  '',
].join('\n');
writeFileSync(new URL('docs/growth/catalogue/v12-g2-06-title-tracks.md', ROOT), md);
console.log(`updates ${n} (stored ${stored}, pending ${inPending}), already ${already}, skipped ${unknown}; title-tracks playlist ${today} -> ${after - storedNotCurated}`);
