// Dry-run report for docs/pending-migrations/v12-g2-08-language.sql. Read-only (ANON key).
//   npx tsx scripts/v12/catalogue/build-language-report.mts
import { writeFileSync } from 'node:fs';
import { anonDb, pageAll } from './lib.mts';

const ROOT = new URL('../../../../../', import.meta.url);
interface S { deezer_track_id: number; artist_name: string; language: string | null; group_id: number | null }
const songs = await pageAll<S>(() => anonDb().from('songs').select('deezer_track_id, artist_name, language, group_id').order('id'));
const count = new Map<string, number>();
for (const s of songs) count.set(String(s.language), (count.get(String(s.language)) ?? 0) + 1);
const ko = songs.filter((s) => s.language === 'ko');
const byAct = new Map<string, number>();
for (const s of ko) byAct.set(s.artist_name, (byAct.get(s.artist_name) ?? 0) + 1);

const md = [
  '# v12-g2-08-language: one spelling for songs.language (dry-run report)',
  '',
  `Generated ${new Date().toISOString()} by \`apps/quiz/scripts/v12/catalogue/build-language-report.mts\` (anon key, nothing written to the database).`,
  '',
  '## The column today',
  '',
  '| language | Songs |',
  '|---|---|',
  ...[...count.entries()].sort().map(([k, n]) => `| ${k} | ${n} |`),
  '',
  `Rows the file updates ('ko' to 'korean'): ${ko.length}. Of these, linked to a group today (so shown on a song page): ${ko.filter((s) => s.group_id !== null).length}.`,
  '',
  `By act: ${[...byAct.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([a, n]) => `${a} ${n}`).join(', ')}.`,
  '',
  '## Every reader of the column',
  '',
  'Command, run on `origin/main` (a94d77c) and on `feat/v12` (the two carry the same code under `apps/quiz`):',
  '',
  '```',
  'git grep -n -w "language" <ref> -- apps/quiz/src apps/quiz/scripts',
  '```',
  '',
  '139 lines. All but the ones below are the `quizzes.language` field (browse filters, the create funnel, quiz cards, the quiz APIs), the i18n config, CSS, or seed scripts of other tables. The lines that touch `songs.language`:',
  '',
  '| File | Line | What it does |',
  '|---|---|---|',
  '| `apps/quiz/src/app/(site)/verse/[slug]/songs/[id]/page.tsx` | 28 | type of the row |',
  '| same | 34 | `.select(\'id, title, artist_name, album_name, album_cover_medium, album_cover_big, duration, year, language, group_id\')` |',
  '| same | 141 | prints it: `{song.language ? <div ...><dt>Language</dt><dd className="font-semibold uppercase text-primary">{song.language}</dd></div> : null}` |',
  '| `apps/quiz/scripts/ingest-blindtest-songs.mts` | 69 (main) | the writer of the 156 `ko` rows; on this branch it writes `korean` |',
  '',
  'In SQL (every tracked `.sql` file, searched for `songs` and for `language`): the column is defined once (`language TEXT DEFAULT \'korean\'`, the songs table migration, line 25) and is read by no function, view, index, policy or trigger. The migrations named `*_quiz_language` and `*_retag_non_english` are about `quizzes.language`.',
  '',
  'So the value is never compared, filtered or joined on: aligning the spelling cannot change a query result. The only visible effect is the "Language" line of a song page.',
  '',
  '## The 156 ids (for the undo)',
  '',
  ko.map((s) => s.deezer_track_id).join(', '),
  '',
].join('\n');
writeFileSync(new URL('docs/growth/catalogue/v12-g2-08-language.md', ROOT), md);
console.log(`ko rows: ${ko.length}; linked: ${ko.filter((s) => s.group_id !== null).length}`);
