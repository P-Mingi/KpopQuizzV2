// Release years for the stored songs, from the public Deezer API. Read-only: the catalogue is read
// with the ANON key, Deezer with plain GETs, and the only output is two SQL files + one report.
//   npx tsx scripts/v12/catalogue/build-years-sql.mts
//
// Rule (real data only): a year is written only when two fields Deezer carries for the track agree:
// the release date of the track and the year its ISRC was registered (characters 6 and 7 of the
// code). Agreement = the two years are equal. One year apart is NOT accepted: measured on the
// catalogue, that tolerance dates BTS "Dynamite" 2021 (a later edition; the recording is from 2020).
// The cost is the songs registered in December and released in January, which stay without a year.
// Anything else (a reissue, a compilation, a missing ISRC, a track Deezer no longer serves) is
// left as it is and counted in the report.
//
// Output:
//   docs/pending-migrations/v12-g2-04-years-fix.sql       rows whose stored year is wrong
//   docs/pending-migrations/v12-g2-05-years-backfill.sql  rows with no year
//   docs/growth/catalogue/v12-g2-04-05-years.md           the dry-run report
// Cache (so a rerun does not ask Deezer again): scripts/v12/catalogue/data/deezer-years.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { anonDb, pageAll } from './lib.mts';

const ROOT = new URL('../../../../../', import.meta.url);
const CACHE = new URL('./data/deezer-years.json', import.meta.url);
interface Hit { release: string | null; isrc: string | null; error?: string }
const cache: Record<string, Hit> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

interface S { deezer_track_id: number; title: string; artist_name: string; year: number | null; status: string; gender: string | null; generation: string | null; is_curated: boolean | null }
const db = anonDb();
const songs = await pageAll<S>(() => db.from('songs').select('deezer_track_id, title, artist_name, year, status, gender, generation, is_curated').order('id'));
console.log(`songs: ${songs.length}; cached Deezer answers: ${Object.keys(cache).length}`);

let last = 0;
async function deezer(id: number): Promise<Hit> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const wait = last + 115 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const t = await (await fetch(`https://api.deezer.com/track/${id}`)).json();
      if (t?.error?.code === 4) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
      if (t?.error) return { release: null, isrc: null, error: String(t.error.message ?? t.error.type ?? 'error') };
      return { release: typeof t.release_date === 'string' ? t.release_date : null, isrc: typeof t.isrc === 'string' ? t.isrc : null };
    } catch { await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); }
  }
  return { release: null, isrc: null, error: 'no answer' };
}

let asked = 0;
for (const s of songs) {
  const k = String(s.deezer_track_id);
  if (cache[k] && cache[k]!.error !== 'no answer') continue;
  cache[k] = await deezer(s.deezer_track_id);
  if (++asked % 250 === 0) { writeFileSync(CACHE, JSON.stringify(cache)); console.log(`  asked ${asked}`); }
}
writeFileSync(CACHE, JSON.stringify(cache));

const releaseYear = (h: Hit): number | null => (h.release && /^\d{4}-/.test(h.release) && !h.release.startsWith('0000') ? Number(h.release.slice(0, 4)) : null);
const isrcYear = (h: Hit): number | null => {
  if (!h.isrc || !/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(h.isrc)) return null;
  const yy = Number(h.isrc.slice(5, 7));
  return yy >= 40 ? 1900 + yy : 2000 + yy;
};

interface Out { id: number; old: number | null; year: number; artist: string; title: string }
const fix: Out[] = [];
const fill: Out[] = [];
const unset: Out[] = []; // stored year that neither Deezer field supports: removed (year in Out unused)
const why = { gone: 0, noRelease: 0, noIsrc: 0, disagree: 0, already: 0 };
const agreed = new Map<number, number>(); // deezer id -> the year the catalogue would hold after both files
for (const s of songs) {
  const h = cache[String(s.deezer_track_id)]!;
  const ry = releaseYear(h);
  const iy = isrcYear(h);
  let year: number | null = null;
  if (h.error) why.gone++;
  else if (ry === null) why.noRelease++;
  else if (iy === null) why.noIsrc++;
  else if (ry !== iy) why.disagree++;
  else year = ry;
  if (year === null) {
    // A stored year that neither Deezer field supports is the act's debut year the old script wrote:
    // not a fact about the song, so it is removed. A stored year one of the two fields supports stays.
    if (s.year !== null && !h.error && ry !== s.year && iy !== s.year) unset.push({ id: s.deezer_track_id, old: s.year, year: 0, artist: s.artist_name, title: `${s.title} (Deezer release ${ry ?? 'none'}, ISRC ${iy ?? 'none'})` });
    else if (s.year !== null) agreed.set(s.deezer_track_id, s.year);
    continue;
  }
  agreed.set(s.deezer_track_id, year);
  if (s.year === year) { why.already++; continue; }
  (s.year === null ? fill : fix).push({ id: s.deezer_track_id, old: s.year, year, artist: s.artist_name, title: s.title });
}

const JUNK = /remix|instrumental|inst\.|karaoke/i;
const pool = (pred: (y: number | null, s: S) => boolean, yearOf: (s: S) => number | null): number =>
  songs.filter((s) => s.status === 'active' && s.is_curated === true && !JUNK.test(s.title) && pred(yearOf(s), s)).length;
const before = (s: S): number | null => s.year;
const afterFix = (s: S): number | null => (unset.some((u) => u.id === s.deezer_track_id) ? null : fix.find((f) => f.id === s.deezer_track_id)?.year ?? s.year);
const afterAll = (s: S): number | null => agreed.get(s.deezer_track_id) ?? s.year;
const rows: [string, (y: number | null) => boolean][] = [
  ['kpop-hits-2026 (year = 2026)', (y) => y === 2026],
  ['kpop-hits-2025 (year = 2025)', (y) => y === 2025],
  ['recent-hits (year 2024 and later)', (y) => y !== null && y >= 2024],
  ['kpop-legends (year 2017 and earlier)', (y) => y !== null && y <= 2017],
];

const values = (xs: Out[], withOld: boolean): string => xs.map((x) => `  (${x.id}, ${withOld ? `${x.old}, ` : ''}${x.year})`).join(',\n');
const head = (what: string, n: number, extra: string[]): string => [
  `-- WHAT: ${what}`,
  '-- WHY: generate now serves year ranges (kpop-hits-2026, kpop-hits-2025, recent-hits, kpop-legends). The year column',
  '--   is NULL on 3,964 of 4,120 songs, and the 156 rows the ingestion script wrote before V12 carry the act\'s debut',
  '--   year instead of the release year (growth v12, SYSTEM.md 3; v11 decision 33).',
  `-- ROWS: ${n} update(s) of songs.year. No insert, no delete.`,
  '-- SOURCE: the public Deezer API, per track: release_date and ISRC. A year is written only when the release year is',
  '--   the ISRC registration year; every other track is left untouched.',
  `-- GENERATED: apps/quiz/scripts/v12/catalogue/build-years-sql.mts (anon key, nothing written), ${new Date().toISOString()}.`,
  '--   Report: docs/growth/catalogue/v12-g2-04-05-years.md.',
  ...extra,
  '',
  'begin;',
  '',
].join('\n');

const fixSql = head('correct songs.year where the stored year is the act\'s debut year, not the release year', fix.length + unset.length, [
  '-- IDEMPOTENT: each row is matched on deezer_track_id AND on the year it holds today; a second run matches nothing.',
  '-- APPLY ORDER: any time. Independent of the other v12-g2 files.',
  `-- VERIFY: select year, count(*) from songs where deezer_track_id in (select d from (values ${fix.slice(0, 3).map((x) => `(${x.id})`).join(', ')}) v(d)) group by 1;`,
  '-- UNDO: run the same statement with the two year columns of the values list swapped.',
]) + `update songs s set year = v.new_year, updated_at = now()\nfrom (values\n${values(fix, true)}\n) as v(deezer_id, old_year, new_year)\nwhere s.deezer_track_id = v.deezer_id and s.year = v.old_year;\n\n-- Stored year that neither the release date nor the ISRC supports (the debut year the old script wrote): removed.\nupdate songs s set year = null, updated_at = now()\nfrom (values\n${unset.map((x) => `  (${x.id}, ${x.old})`).join(',\n')}\n) as v(deezer_id, old_year)\nwhere s.deezer_track_id = v.deezer_id and s.year = v.old_year;\n\ncommit;\n`;

const fillSql = head('fill songs.year where it is NULL', fill.length, [
  '-- OWNER DECISION: this is a backfill of most of the catalogue. It is what makes kpop-legends playable and makes',
  '--   recent-hits and the hits playlists complete. It also makes the "Year" line appear on the song pages',
  '--   (/verse/<group>/songs/<id> prints the year when there is one), with the flags on or off.',
  '-- IDEMPOTENT: only rows whose year is still NULL are touched; a second run matches nothing.',
  '-- APPLY ORDER: any time. Independent of the other v12-g2 files.',
  '-- VERIFY: select count(*) filter (where year is null) as no_year, count(*) filter (where year <= 2017) as legends from songs;',
  `-- UNDO: update songs set year = null where deezer_track_id in (select d from (values (..)) v(d));  -- the ids of the list below`,
]) + `update songs s set year = v.year, updated_at = now()\nfrom (values\n${values(fill, false)}\n) as v(deezer_id, year)\nwhere s.deezer_track_id = v.deezer_id and s.year is null;\n\ncommit;\n`;

writeFileSync(new URL('docs/pending-migrations/v12-g2-04-years-fix.sql', ROOT), fixSql);
writeFileSync(new URL('docs/pending-migrations/v12-g2-05-years-backfill.sql', ROOT), fillSql);

const byYear = (xs: Out[]): string => { const c = new Map<number, number>(); for (const x of xs) c.set(x.year, (c.get(x.year) ?? 0) + 1); return [...c.entries()].sort((a, b) => a[0] - b[0]).map(([y, n]) => `${y}: ${n}`).join(', '); };
const md = [
  '# v12-g2-04 and v12-g2-05: release years (dry-run report)',
  '',
  `Generated ${new Date().toISOString()} by \`apps/quiz/scripts/v12/catalogue/build-years-sql.mts\` (anon key, nothing written to the database).`,
  '',
  `Songs read: ${songs.length}. Deezer was asked for the release date and the ISRC of each track.`,
  '',
  'Rule: a year is written only when the release year equals the ISRC registration year.',
  '',
  '| Outcome | Songs |',
  '|---|---|',
  `| Stored year already right | ${why.already} |`,
  `| Stored year wrong, corrected by v12-g2-04-years-fix.sql | ${fix.length} |`,
  `| Stored year supported by neither Deezer field, removed by v12-g2-04-years-fix.sql | ${unset.length} |`,
  `| No stored year, filled by v12-g2-05-years-backfill.sql | ${fill.length} |`,
  `| Left untouched: release year and ISRC year disagree (reissue, compilation, later edition) | ${why.disagree} |`,
  `| Left untouched: no usable ISRC | ${why.noIsrc} |`,
  `| Left untouched: no release date | ${why.noRelease} |`,
  `| Left untouched: Deezer no longer serves the track | ${why.gone} |`,
  '',
  '## Playable songs per year playlist (curated, active, clean titles: the pool generate reads)',
  '',
  '| Playlist | Today | After 04 (fix) | After 04 + 05 (backfill) |',
  '|---|---|---|---|',
  ...rows.map(([name, pred]) => `| ${name} | ${pool((y) => pred(y), before)} | ${pool((y) => pred(y), afterFix)} | ${pool((y) => pred(y), afterAll)} |`),
  '',
  'These counts do not include the rows the other pending files add (v12-g2-02, v12-g2-03).',
  '',
  `## 04: corrections (${fix.length})`,
  '',
  `New years: ${byYear(fix)}.`,
  '',
  '| Deezer id | Act | Song | Stored | Deezer |',
  '|---|---|---|---|---|',
  ...fix.map((x) => `| ${x.id} | ${x.artist} | ${x.title.replace(/\|/g, '/')} | ${x.old} | ${x.year} |`),
  '',
  `## 04: stored years removed (${unset.length})`,
  '',
  ...unset.map((x) => `- ${x.id} · ${x.artist} · ${x.title} · stored ${x.old}`),
  '',
  `## 05: backfill (${fill.length})`,
  '',
  `Years: ${byYear(fill)}.`,
  '',
  'The full list is the values list of the SQL file.',
  '',
].join('\n');
writeFileSync(new URL('docs/growth/catalogue/v12-g2-04-05-years.md', ROOT), md);
console.log(`fix ${fix.length}, backfill ${fill.length}, untouched ${why.disagree + why.noIsrc + why.noRelease + why.gone}, already right ${why.already}`);
