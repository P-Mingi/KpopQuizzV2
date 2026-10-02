// Blindtest catalog ingestion: pull a group's real tracks from Deezer and add them to the
// `songs` table with the right generation + gender so they enrich the generation / boy-or-girl
// / all-songs pools. A group becomes its own blindtest playlist once it has a `groups` row and
// ROUND_SIZE (10) clean songs linked to it (lib/blind-test-playlists.ts). Co-ed acts use gender
// 'coed' so they never appear in the boy-only / girl-only games.
//
// SAFE BY DEFAULT (V12, G2). The script is a dry run unless `--apply` is passed:
//   - dry run: reads the catalogue with the ANON key, reads Deezer's public API, writes NOTHING
//     to the database. `--sql-out <file>` saves the rows as idempotent SQL for the owner to
//     review and run; `--report-out <file>` saves the dry-run report (markdown).
//   - `--apply`: the old behaviour (insert with the service role key). The V12 run never uses it.
//
// Run from apps/quiz, with the service key removed from the environment:
//   env -u SUPABASE_SERVICE_ROLE_KEY npx tsx scripts/ingest-blindtest-songs.mts --dry-run \
//     --groups "KickFlip,RESCENE" --target 10 --sql-out <file.sql> --report-out <file.md>
//   env -u SUPABASE_SERVICE_ROLE_KEY npx tsx scripts/ingest-blindtest-songs.mts --dry-run \
//     --releases 2026 --per-artist 3 --sql-out <file.sql> --report-out <file.md>
//
// Options:
//   --dry-run            explicit dry run (also the default)
//   --apply              insert into the database (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
//   --groups "A,B"       only these entries of GROUPS (default: all of them)
//   --target N           stop adding once the act has N clean songs (default 22, the old cap)
//   --releases YEAR      instead of GROUPS: the releases of that year by the groups already in
//                        the catalogue (the Deezer artist is read from one of their stored tracks)
//   --per-artist N       with --releases: at most N new songs per act, best Deezer rank first (3)
//   --min-rank N         with --releases: leave out tracks under this Deezer rank (150000)
//   --sql-out FILE       write the idempotent SQL
//   --report-out FILE    write the dry-run report
//   --title "..."        first line of the SQL header and of the report
//
// Idempotent: a deezer_track_id already stored is never emitted, and the SQL itself re-checks.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

// ----- arguments ------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const has = (name: string): boolean => argv.includes(name);
const opt = (name: string): string | undefined => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const APPLY = has('--apply');
if (APPLY && has('--dry-run')) { console.error('Pick one of --dry-run and --apply.'); process.exit(2); }
const DRY_RUN = !APPLY;
const SQL_OUT = opt('--sql-out');
const REPORT_OUT = opt('--report-out');
const ONLY = opt('--groups')?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const TARGET = Number(opt('--target') ?? 22);
const RELEASES = opt('--releases') ? Number(opt('--releases')) : null;
const PER_ARTIST = Number(opt('--per-artist') ?? 3);
const MIN_RANK = Number(opt('--min-rank') ?? 150000);
let skippedOld = 0;
let skippedRank = 0;
const TITLE = opt('--title') ?? (RELEASES ? `${RELEASES} releases of the groups already in the catalogue` : 'Blindtest songs from Deezer');

// ----- clients --------------------------------------------------------------------------------
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
// A dry run only ever holds the anon key: it cannot write past row level security even by mistake.
const key = DRY_RUN ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY : env.SUPABASE_SERVICE_ROLE_KEY;
if (!env.NEXT_PUBLIC_SUPABASE_URL || !key) { console.error(`Missing Supabase URL or ${DRY_RUN ? 'anon' : 'service role'} key in .env.local`); process.exit(2); }
const db: SupabaseClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });

interface GroupCfg { name: string; deezer: string; generation: string; gender: 'bg' | 'gg' | 'coed'; year: number; slug?: string }
const GROUPS: GroupCfg[] = [
  { name: 'Cortis',         deezer: 'CORTIS',          generation: '5th', gender: 'bg',    year: 2025 },
  { name: 'NCT WISH',       deezer: 'NCT WISH',        generation: '5th', gender: 'bg',    year: 2024, slug: 'nct-wish' },
  { name: '&TEAM',          deezer: '&TEAM',           generation: '4th', gender: 'bg',    year: 2022 },
  { name: 'izna',           deezer: 'izna',            generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'Hearts2Hearts',  deezer: 'Hearts2Hearts',   generation: '5th', gender: 'gg',    year: 2025, slug: 'hearts2hearts' },
  { name: 'MEOVV',          deezer: 'MEOVV',           generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'KiiiKiii',       deezer: 'KiiiKiii',        generation: '5th', gender: 'gg',    year: 2025 },
  { name: 'BADVILLAIN',     deezer: 'BADVILLAIN',      generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'UNIS',           deezer: 'UNIS',            generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'QWER',           deezer: 'QWER',            generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'ALLDAY PROJECT', deezer: 'ALLDAY PROJECT',  generation: '5th', gender: 'coed',  year: 2025 },
  // V12 (G2): `slug` links the songs to the group row (created by v12-g2-01-groups.sql when missing).
  { name: 'KickFlip',       deezer: 'KickFlip',        generation: '5th', gender: 'bg',    year: 2025, slug: 'kickflip' },
  { name: 'RESCENE',        deezer: 'RESCENE',         generation: '5th', gender: 'gg',    year: 2024, slug: 'rescene' },
];

const JUNK = /remix|instrumental|inst\.|karaoke|sped up|slowed|acappella|a cappella/i;
// Extra guard for the releases mode: alternate versions are not new songs.
const ALT_VERSION = /\bver\.|\bversion\b|\blive\b|remaster|\bedit\b|\bmix\b|\bdemo\b/i;
const baseTitle = (t: string): string => t.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*feat\.?.*$/i, '').replace(/\s*-\s*.*$/i, '').trim();
const norm = (s: string): string => s.toUpperCase().replace(/\s+/g, ' ').trim();
const yearOf = (d: unknown): number | null => (typeof d === 'string' && /^\d{4}-/.test(d) && d.slice(0, 4) !== '0000' ? Number(d.slice(0, 4)) : null);

// ----- Deezer (public API, spaced out to stay under its 50 requests / 5 s quota) ---------------
let lastCall = 0;
async function j(url: string): Promise<any> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastCall + 120 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const body = await (await fetch(url)).json();
      if (body?.error?.code === 4) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; } // quota
      return body;
    } catch (e) {
      if (attempt === 5) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Deezer quota: ${url}`);
}
const albumYear = new Map<number, number | null>();
async function releaseYear(albumId: number | undefined): Promise<number | null> {
  if (!albumId) return null;
  if (!albumYear.has(albumId)) albumYear.set(albumId, yearOf((await j(`https://api.deezer.com/album/${albumId}`))?.release_date));
  return albumYear.get(albumId)!;
}

// ----- rows + SQL -----------------------------------------------------------------------------
interface Row {
  deezer_track_id: number; title: string; artist_name: string; album_name: string | null;
  album_cover_small: string | null; album_cover_medium: string | null; album_cover_big: string | null;
  preview_url: string; duration: number | null; group_id: number | null;
  gender: string; generation: string; is_title_track: boolean; year: number | null; language: string;
  wrong_answers_artist: string[]; wrong_answers_title: string[]; status: string; is_curated: boolean;
  tier: string; deezer_rank: number;
}
/** A row plus what the SQL needs and the database insert does not: how to find its group. */
interface Planned { row: Row; groupSlug: string | null }

const lit = (v: string | number | boolean | null): string => (v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v));
function insertSql(p: Planned): string {
  const r = p.row;
  // group_id: resolved at apply time from the slug, so the file is right even when the group row
  // is created by an earlier pending file. A known numeric id is kept only without a slug.
  const group = p.groupSlug ? `(select id from groups where slug = ${lit(p.groupSlug)})` : lit(r.group_id);
  return [
    'insert into songs (deezer_track_id, title, artist_name, album_name, album_cover_small, album_cover_medium, album_cover_big, preview_url, duration, group_id, gender, generation, is_title_track, year, language, wrong_answers_artist, wrong_answers_title, status, is_curated, tier, deezer_rank)',
    `select ${[r.deezer_track_id, r.title, r.artist_name, r.album_name, r.album_cover_small, r.album_cover_medium, r.album_cover_big, r.preview_url, r.duration].map(lit).join(', ')}, ${group}, ${[r.gender, r.generation, r.is_title_track, r.year, r.language].map(lit).join(', ')}, '{}', '{}', ${lit(r.status)}, ${lit(r.is_curated)}, ${lit(r.tier)}, ${lit(r.deezer_rank)}`,
    `where not exists (select 1 from songs where deezer_track_id = ${r.deezer_track_id})`,
    'on conflict do nothing;',
  ].join('\n');
}

const planned: Planned[] = [];
const links: string[] = [];        // SQL that links already stored songs to their group row
const report: string[] = [];       // markdown lines
const say = (line: string): void => { console.log(line); report.push(line); };

async function pageAll<T>(make: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

// ----- mode 1: the GROUPS list ----------------------------------------------------------------
async function ingest(cfg: GroupCfg): Promise<void> {
  const search = await j(`https://api.deezer.com/search/artist?q=${encodeURIComponent(cfg.deezer)}`);
  const exact = (search.data ?? []).filter((a: any) => norm(a.name) === norm(cfg.deezer));
  const artist = exact.sort((a: any, b: any) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
  if (!artist) { say(`- **${cfg.name}**: SKIP, no exact Deezer artist match`); return; }

  const top = await j(`https://api.deezer.com/artist/${artist.id}/top?limit=50`);
  const bestByBase = new Map<string, any>();
  for (const t of (top.data ?? [])) {
    if (norm(t.artist?.name ?? '') !== norm(cfg.deezer) || JUNK.test(t.title) || !t.preview) continue;
    const k = baseTitle(t.title);
    if (!bestByBase.has(k) || t.rank > bestByBase.get(k).rank) bestByBase.set(k, t);
  }
  const tracks = [...bestByBase.values()].sort((a, b) => b.rank - a.rank).slice(0, 22);
  if (tracks.length < 3) { say(`- **${cfg.name}**: SKIP, only ${tracks.length} usable tracks (Deezer artist "${artist.name}", ${artist.nb_fan} fans)`); return; }

  // link to an existing group row if one exists; never create one here (the groups SQL file does).
  const { data: grp } = cfg.slug
    ? await db.from('groups').select('id, slug').eq('slug', cfg.slug).maybeSingle()
    : await db.from('groups').select('id, slug').ilike('name', cfg.name).maybeSingle();
  const groupId = (grp as { id: number } | null)?.id ?? null;
  const groupSlug = cfg.slug ?? (grp as { slug: string } | null)?.slug ?? null;

  // What the catalogue already holds for this act (by name, so the dedupe also covers base titles).
  const { data: stored } = await db.from('songs').select('deezer_track_id, title, group_id, status').ilike('artist_name', cfg.name);
  const mine = (stored ?? []) as { deezer_track_id: number; title: string; group_id: number | null; status: string }[];
  const have = new Set(mine.map((r) => Number(r.deezer_track_id)));
  const haveBase = new Set(mine.map((r) => baseTitle(r.title)));
  const cleanStored = mine.filter((r) => r.status === 'active' && !/remix|instrumental|inst\.|karaoke/i.test(r.title)).length;
  const unlinked = mine.filter((r) => r.group_id === null).length;

  const room = Math.max(0, TARGET - cleanStored);
  const fresh = tracks.filter((t) => !have.has(t.id) && !haveBase.has(baseTitle(t.title))).slice(0, room);

  const N = tracks.length;
  const tierFor = (i: number): string => i < N * 0.2 ? 'iconic' : i < N * 0.45 ? 'popular' : i < N * 0.8 ? 'medium' : 'hard';
  const rows: Row[] = [];
  for (const t of fresh) {
    const rank = tracks.indexOf(t);
    rows.push({
      deezer_track_id: t.id, title: t.title, artist_name: cfg.name,
      album_name: t.album?.title ?? null, album_cover_small: t.album?.cover_small ?? null,
      album_cover_medium: t.album?.cover_medium ?? null, album_cover_big: t.album?.cover_big ?? null,
      preview_url: t.preview, duration: t.duration ?? null, group_id: groupId,
      // year: the real release year of the track's album on Deezer; the act's debut year only when Deezer has none.
      gender: cfg.gender, generation: cfg.generation, is_title_track: false, year: (await releaseYear(t.album?.id)) ?? cfg.year, language: 'ko',
      wrong_answers_artist: [], wrong_answers_title: [], status: 'active', is_curated: true,
      tier: tierFor(rank), deezer_rank: t.rank,
    });
  }
  for (const row of rows) planned.push({ row, groupSlug });
  if (groupSlug && unlinked > 0) {
    links.push(`-- ${cfg.name}: ${unlinked} stored song(s) without a group\nupdate songs set group_id = (select id from groups where slug = ${lit(groupSlug)})\nwhere group_id is null and artist_name = ${lit(cfg.name)} and exists (select 1 from groups where slug = ${lit(groupSlug)});`);
  }

  if (APPLY && rows.length) {
    const { error } = await db.from('songs').insert(rows);
    if (error) { say(`- **${cfg.name}**: INSERT FAILED: ${error.message}`); return; }
  }
  const after = cleanStored + rows.length;
  say(`- **${cfg.name}** (Deezer artist ${artist.id} "${artist.name}", ${artist.nb_fan} fans; ${cfg.generation}/${cfg.gender}; group row ${groupId ? `id ${groupId}` : groupSlug ? `"${groupSlug}" not there yet` : 'none'}): ${cleanStored} clean stored, ${unlinked} to link, +${rows.length} new, ${after} clean after. Own playlist after apply: ${groupSlug && after >= 10 ? 'yes' : 'no'}.`);
  for (const r of rows) say(`  - ${r.deezer_track_id} · ${r.title} · ${r.album_name ?? ''} · ${r.year ?? 'no year'} · ${r.tier} · rank ${r.deezer_rank}`);
}

// ----- mode 2: releases of one year by the groups already in the catalogue ---------------------
interface Stored { deezer_track_id: number; title: string; artist_name: string; group_id: number | null; gender: string | null; generation: string | null; status: string; tier: string | null; deezer_rank: number | null }
const majority = <T,>(xs: T[]): T | null => { const c = new Map<T, number>(); for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; };

async function releasesOf(year: number): Promise<void> {
  const all = await pageAll<Stored>(() => db.from('songs').select('deezer_track_id, title, artist_name, group_id, gender, generation, status, tier, deezer_rank').order('id'));
  const { data: groupRows } = await db.from('groups').select('id, slug');
  const slugOf = new Map(((groupRows ?? []) as { id: number; slug: string }[]).map((g) => [g.id, g.slug]));
  const byArtist = new Map<string, Stored[]>();
  for (const s of all) {
    if (s.status !== 'active' || !['bg', 'gg', 'coed'].includes(s.gender ?? '')) continue; // groups only
    byArtist.set(s.artist_name, [...(byArtist.get(s.artist_name) ?? []), s]);
  }
  const haveIds = new Set(all.map((s) => Number(s.deezer_track_id)));
  say(`Acts read from the catalogue (gender bg, gg or coed): ${byArtist.size}. Looking for ${year} releases, at most ${PER_ARTIST} per act.`);
  say('');
  let acts = 0;
  for (const [name, songs] of [...byArtist.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    try {
      // The Deezer artist is the one a stored track belongs to: no name search, no homonym.
      // The most common artist id over up to three stored tracks (a feature can sit under a guest).
      const ids: number[] = [];
      for (const s of songs.slice(0, 3)) { const t = await j(`https://api.deezer.com/track/${s.deezer_track_id}`); if (t?.artist?.id) ids.push(t.artist.id); }
      const artistId = majority(ids);
      if (!artistId) continue;
      const albums: any[] = [];
      for (let url: string | null = `https://api.deezer.com/artist/${artistId}/albums?limit=100`; url;) { const page: any = await j(url); albums.push(...(page.data ?? [])); url = page.next ?? null; }
      const ofYear = albums.filter((a) => yearOf(a.release_date) === year && a.record_type !== 'compile');
      if (!ofYear.length) continue;
      const haveBase = new Set(songs.map((s) => baseTitle(s.title)));
      const best = new Map<string, any>();
      for (const al of ofYear) {
        const tr = await j(`https://api.deezer.com/album/${al.id}/tracks?limit=100`);
        for (const t of (tr.data ?? [])) {
          if (t.artist?.id !== artistId || !t.preview || JUNK.test(t.title) || ALT_VERSION.test(t.title)) continue;
          // A recording of that year, not an old song re-uploaded with a new date: the ISRC carries the
          // year the recording was registered (characters 6 and 7). The year before is accepted too
          // (a January release is often registered in December). No ISRC: not proven, left out.
          const isrcYear = typeof t.isrc === 'string' && /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(t.isrc) ? 2000 + Number(t.isrc.slice(5, 7)) : null;
          if (isrcYear !== year && isrcYear !== year - 1) { skippedOld++; continue; }
          // A hits list: a track nobody plays on Deezer is left out (also drops homonym pages).
          if ((t.rank ?? 0) < MIN_RANK) { skippedRank++; continue; }
          const k = baseTitle(t.title);
          if (haveIds.has(t.id) || haveBase.has(k)) continue;
          if (!best.has(k) || t.rank > best.get(k).rank) best.set(k, { ...t, album: al });
        }
      }
      const picks = [...best.values()].sort((a, b) => b.rank - a.rank).slice(0, PER_ARTIST);
      if (!picks.length) continue;
      // Tier: where the track's Deezer rank falls among the act's stored songs (same cut points as
      // mode 1); 'medium' when the stored songs carry no rank to compare with.
      const ranks = songs.map((s) => s.deezer_rank).filter((r): r is number => typeof r === 'number').sort((a, b) => b - a);
      const tierOf = (rank: number): string => {
        if (!ranks.length) return 'medium';
        const pos = ranks.filter((r) => r > rank).length / ranks.length;
        return pos < 0.2 ? 'iconic' : pos < 0.45 ? 'popular' : pos < 0.8 ? 'medium' : 'hard';
      };
      const groupId = majority(songs.map((s) => s.group_id));
      const gender = majority(songs.map((s) => s.gender))!;
      const generation = majority(songs.map((s) => s.generation))!;
      const rows: Row[] = picks.map((t) => ({
        deezer_track_id: t.id, title: t.title, artist_name: name,
        album_name: t.album?.title ?? null, album_cover_small: t.album?.cover_small ?? null,
        album_cover_medium: t.album?.cover_medium ?? null, album_cover_big: t.album?.cover_big ?? null,
        preview_url: t.preview, duration: t.duration ?? null, group_id: groupId,
        gender, generation, is_title_track: false, year, language: 'ko',
        wrong_answers_artist: [], wrong_answers_title: [], status: 'active', is_curated: true,
        tier: tierOf(t.rank), deezer_rank: t.rank,
      }));
      for (const row of rows) planned.push({ row, groupSlug: groupId !== null ? slugOf.get(groupId) ?? null : null });
      if (APPLY) {
        const { error } = await db.from('songs').insert(rows);
        if (error) { say(`- **${name}**: INSERT FAILED: ${error.message}`); continue; }
      }
      acts++;
      say(`- **${name}** (Deezer artist ${artistId}; ${generation}/${gender}; ${ofYear.length} release(s) dated ${year}): +${rows.length}`);
      for (const [i, r] of rows.entries()) say(`  - ${r.deezer_track_id} · ${r.title} · ${r.album_name ?? ''} (${picks[i].album.record_type}, ${picks[i].album.release_date}) · ${r.tier} · rank ${r.deezer_rank}`);
    } catch (e) { say(`- **${name}**: ERROR ${String(e)}`); }
  }
  say('');
  say(`Acts with at least one new ${year} song: ${acts}. Left out: ${skippedOld} track(s) whose ISRC is not from ${year - 1} or ${year} (re-uploads of older recordings), ${skippedRank} track(s) under Deezer rank ${MIN_RANK}.`);
}

// ----- run ------------------------------------------------------------------------------------
say(`# ${TITLE}`);
say('');
say(`Mode: ${DRY_RUN ? 'DRY RUN (anon key, nothing written to the database)' : 'APPLY (service role key, rows inserted)'}. Run at ${new Date().toISOString()}.`);
say('');
if (RELEASES) await releasesOf(RELEASES);
else for (const cfg of GROUPS.filter((g) => !ONLY || ONLY.includes(g.name.toLowerCase()))) { try { await ingest(cfg); } catch (e) { say(`- **${cfg.name}**: ERROR ${String(e)}`); } }
say('');
say(`Rows ${DRY_RUN ? 'to add' : 'added'}: ${planned.length}. Songs to link to a group row: ${links.length} statement(s).`);

if (SQL_OUT) {
  const ids = planned.map((p) => p.row.deezer_track_id).join(', ') || '-1';
  const header = [
    `-- WHAT: ${TITLE}`,
    `-- WHY: ${opt('--why') ?? 'Blindtest catalogue completion (growth v12, SYSTEM.md 3).'}`,
    `-- ROWS: ${planned.length} insert(s) into songs, ${links.length} update statement(s) linking stored songs to their group row.`,
    '--   Source of every row: the public Deezer API (track id, title, album, cover, preview, rank, release year).',
    `-- GENERATED: apps/quiz/scripts/ingest-blindtest-songs.mts, dry run with the anon key, ${new Date().toISOString()}.`,
    '--   Nothing was written to the database by the script. Report: the .md file of the same name in docs/growth/catalogue/.',
    '-- IDEMPOTENT: each insert re-checks deezer_track_id (unique) and ends with on conflict do nothing; each update only',
    '--   touches rows whose group_id is still null. Safe to run twice.',
    `-- APPLY ORDER: ${opt('--apply-order') ?? 'after v12-g2-01-groups.sql (the inserts resolve group_id from the group slug).'}`,
    `-- VERIFY: select count(*) from songs where deezer_track_id in (${ids});  -- expect ${planned.length}`,
    `-- UNDO: delete from songs where deezer_track_id in (${ids});`,
    ...(links.length ? ['--   and, for the links: update songs set group_id = null where group_id = (select id from groups where slug = \'<slug>\') and created_at < \'<apply time>\';'] : []),
    '',
    'begin;',
    '',
  ];
  writeFileSync(SQL_OUT, [...header, ...planned.map(insertSql), ...(links.length ? ['', ...links] : []), '', 'commit;', ''].join('\n\n').replace(/\n\n\n+/g, '\n\n'));
  console.log(`SQL written to ${SQL_OUT}`);
}
if (REPORT_OUT) { writeFileSync(REPORT_OUT, report.join('\n') + '\n'); console.log(`Report written to ${REPORT_OUT}`); }
console.log('done.');
