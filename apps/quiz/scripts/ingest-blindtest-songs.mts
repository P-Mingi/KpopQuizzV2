// Blindtest catalog ingestion: pull a group's real tracks from Deezer and add them to the
// `songs` table with the right generation + gender so they enrich the generation / boy-or-girl
// / all-songs pools. Does NOT create a standalone "group category" - a group only becomes its
// own blindtest option once it naturally has >= 15 songs (the picker's threshold). Co-ed acts
// use gender 'mixed' so they never appear in the boy-only / girl-only games.
//
// Idempotent (skips any deezer_track_id already stored). Re-run any time to add more groups.
//   npx tsx scripts/ingest-blindtest-songs.mts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

interface GroupCfg { name: string; deezer: string; generation: string; gender: 'bg' | 'gg' | 'coed'; year: number }
const GROUPS: GroupCfg[] = [
  { name: 'Cortis',         deezer: 'CORTIS',          generation: '5th', gender: 'bg',    year: 2025 },
  { name: 'NCT WISH',       deezer: 'NCT WISH',        generation: '5th', gender: 'bg',    year: 2024 },
  { name: '&TEAM',          deezer: '&TEAM',           generation: '4th', gender: 'bg',    year: 2022 },
  { name: 'izna',           deezer: 'izna',            generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'Hearts2Hearts',  deezer: 'Hearts2Hearts',   generation: '5th', gender: 'gg',    year: 2025 },
  { name: 'MEOVV',          deezer: 'MEOVV',           generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'KiiiKiii',       deezer: 'KiiiKiii',        generation: '5th', gender: 'gg',    year: 2025 },
  { name: 'BADVILLAIN',     deezer: 'BADVILLAIN',      generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'UNIS',           deezer: 'UNIS',            generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'QWER',           deezer: 'QWER',            generation: '5th', gender: 'gg',    year: 2024 },
  { name: 'ALLDAY PROJECT', deezer: 'ALLDAY PROJECT',  generation: '5th', gender: 'coed',  year: 2025 },
];

const JUNK = /remix|instrumental|inst\.|karaoke|sped up|slowed|acappella|a cappella/i;
const baseTitle = (t: string): string => t.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*feat\.?.*$/i, '').replace(/\s*-\s*.*$/i, '').trim();
const norm = (s: string): string => s.toUpperCase().replace(/\s+/g, ' ').trim();

async function j(url: string): Promise<any> { return (await fetch(url)).json(); }

async function ingest(cfg: GroupCfg): Promise<void> {
  const search = await j(`https://api.deezer.com/search/artist?q=${encodeURIComponent(cfg.deezer)}`);
  const exact = (search.data ?? []).filter((a: any) => norm(a.name) === norm(cfg.deezer));
  const artist = exact.sort((a: any, b: any) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
  if (!artist) { console.log(`  ${cfg.name.padEnd(16)} SKIP: no exact Deezer artist match`); return; }

  const top = await j(`https://api.deezer.com/artist/${artist.id}/top?limit=50`);
  const bestByBase = new Map<string, any>();
  for (const t of (top.data ?? [])) {
    if (norm(t.artist?.name ?? '') !== norm(cfg.deezer) || JUNK.test(t.title) || !t.preview) continue;
    const k = baseTitle(t.title);
    if (!bestByBase.has(k) || t.rank > bestByBase.get(k).rank) bestByBase.set(k, t);
  }
  const tracks = [...bestByBase.values()].sort((a, b) => b.rank - a.rank).slice(0, 22);
  if (tracks.length < 3) { console.log(`  ${cfg.name.padEnd(16)} SKIP: only ${tracks.length} usable tracks (artist "${artist.name}", ${artist.nb_fan} fans)`); return; }

  // link to an existing group row if one exists (for the eventual standalone option); never create one.
  const { data: grp } = await db.from('groups').select('id').ilike('name', cfg.name).maybeSingle();
  const groupId = (grp as { id: number } | null)?.id ?? null;

  const { data: existing } = await db.from('songs').select('deezer_track_id').in('deezer_track_id', tracks.map((t) => t.id));
  const have = new Set((existing as any[] ?? []).map((r) => r.deezer_track_id));
  const fresh = tracks.filter((t) => !have.has(t.id));

  const N = tracks.length;
  const tierFor = (i: number): string => i < N * 0.2 ? 'iconic' : i < N * 0.45 ? 'popular' : i < N * 0.8 ? 'medium' : 'hard';
  const rows = fresh.map((t) => {
    const rank = tracks.indexOf(t);
    return {
      deezer_track_id: t.id, title: t.title, artist_name: cfg.name,
      album_name: t.album?.title ?? null, album_cover_small: t.album?.cover_small ?? null,
      album_cover_medium: t.album?.cover_medium ?? null, album_cover_big: t.album?.cover_big ?? null,
      preview_url: t.preview, duration: t.duration ?? null, group_id: groupId,
      gender: cfg.gender, generation: cfg.generation, is_title_track: false, year: cfg.year, language: 'ko',
      wrong_answers_artist: [], wrong_answers_title: [], status: 'active', is_curated: true,
      tier: tierFor(rank), deezer_rank: t.rank,
    };
  });
  if (rows.length) {
    const { error } = await db.from('songs').insert(rows);
    if (error) { console.log(`  ${cfg.name.padEnd(16)} INSERT FAILED: ${error.message}`); return; }
  }
  console.log(`  ${cfg.name.padEnd(16)} +${rows.length} (had ${have.size}) · ${cfg.generation}/${cfg.gender} · group_id=${groupId ?? 'null'} · e.g. ${tracks.slice(0, 3).map((t) => t.title).join(', ')}`);
}

for (const cfg of GROUPS) { try { await ingest(cfg); } catch (e) { console.log(`  ${cfg.name} ERROR: ${String(e)}`); } }
console.log('done.');
