import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { getMatchUpPlaylist, MATCH_UP_MIN_PAIRS, type MatchUpPair } from '@/lib/games/match-up';

// Server-side pair-pool derivation for "Match-Up" playlists (Workstream V2).
//
// Every pool is built from live DB columns, never hand-authored, and gated at
// MATCH_UP_MIN_PAIRS. Right-side targets are unique per pool (one representative
// song per group) so a round never has two identical target tiles, which would
// make matching ambiguous. Uses the cookie-free public read client (ISR-safe);
// groups flagged custom / needs_review are excluded for quality.

type DbClient = ReturnType<typeof createPublicReadClient>;

interface GroupRow {
  id: string;
  name: string;
  slug: string;
  generation: string | null;
  fandom_name: string | null;
  is_custom: boolean | null;
  needs_review: boolean | null;
}

// A predicate over a clean group, used to scope a pool (a generation, a gender).
type GroupFilter = (g: GroupRow) => boolean;

// Catch-all "groups" that are not a real group, so pairing an idol/song to them
// is meaningless. Excluded from every Match-Up pool.
const EXCLUDED_GROUP_SLUGS = new Set(['general-kpop']);

async function loadCleanGroups(db: DbClient): Promise<Map<string, GroupRow>> {
  const { data } = await db
    .from('groups')
    .select('id, name, slug, generation, fandom_name, is_custom, needs_review');
  const clean = ((data ?? []) as GroupRow[]).filter(
    (g) => !g.is_custom && !g.needs_review && !EXCLUDED_GROUP_SLUGS.has(g.slug),
  );
  return new Map(clean.map((g) => [g.id, g]));
}

/**
 * Map of group id -> dominant songs.gender label (bg / gg / solo_* / coed),
 * across active songs. The groups table has no gender column, so gender is
 * derived per group from its songs (the same real, group-consistent attribute
 * the Sort It game uses). Paginated past the 1000-row cap.
 */
async function deriveGroupGenders(db: DbClient): Promise<Map<string, string>> {
  const counts = new Map<string, Record<string, number>>();
  for (let from = 0; ; from += 1000) {
    const { data } = await db
      .from('songs')
      .select('group_id, gender')
      .eq('status', 'active')
      .not('group_id', 'is', null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const s of data as Array<{ group_id: string; gender: string | null }>) {
      if (!s.gender) continue;
      const rec = counts.get(s.group_id) ?? {};
      rec[s.gender] = (rec[s.gender] ?? 0) + 1;
      counts.set(s.group_id, rec);
    }
    if (data.length < 1000) break;
  }
  const out = new Map<string, string>();
  for (const [gid, rec] of counts) {
    let best: string | null = null;
    let bestVal = -1;
    for (const [label, n] of Object.entries(rec)) if (n > bestVal) { best = label; bestVal = n; }
    if (best) out.set(gid, best);
  }
  return out;
}

interface SongRow {
  group_id: string;
  title: string;
  play_count: number | null;
  deezer_rank: number | null;
}

/** Paginate all active songs that belong to a group (beats the 1000-row cap). */
async function loadActiveSongs(db: DbClient): Promise<SongRow[]> {
  const out: SongRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data } = await db
      .from('songs')
      .select('group_id, title, play_count, deezer_rank')
      .eq('status', 'active')
      .not('group_id', 'is', null)
      .range(from, from + page - 1);
    if (!data || data.length === 0) break;
    out.push(...(data as SongRow[]));
    if (data.length < page) break;
  }
  return out;
}

/**
 * One representative song per clean group -> a song/group pair. The
 * representative is the group's most-played song (deezer_rank breaks ties), so
 * the tile is the group's most recognizable title. `generation` filters to a
 * single group-generation when set (for the per-gen playlists).
 */
async function songToGroupPairs(
  db: DbClient,
  groups: Map<string, GroupRow>,
  filter: GroupFilter,
): Promise<MatchUpPair[]> {
  const songs = await loadActiveSongs(db);
  const best = new Map<string, SongRow>();
  for (const s of songs) {
    if (!groups.has(s.group_id)) continue;
    const cur = best.get(s.group_id);
    if (!cur) { best.set(s.group_id, s); continue; }
    const better =
      (s.play_count ?? 0) > (cur.play_count ?? 0) ||
      ((s.play_count ?? 0) === (cur.play_count ?? 0) && (s.deezer_rank ?? 0) > (cur.deezer_rank ?? 0));
    if (better) best.set(s.group_id, s);
  }

  const pairs: MatchUpPair[] = [];
  for (const [gid, song] of best) {
    const g = groups.get(gid)!;
    if (!filter(g)) continue;
    // Format only (never changes which group the title belongs to): underscores
    // to spaces, and drop feature-credit parentheticals / brackets that make a
    // tile balloon (e.g. "Moon (with VIVIZ, MINHYUK, ...)" -> "Moon").
    const title = (song.title ?? '')
      .replace(/_/g, ' ')
      .replace(/\([^)]*\)/g, '')   // balanced "(...)" credits
      .replace(/\[[^\]]*\]/g, '')  // balanced "[...]"
      .replace(/\s*[([].*$/, '')   // an UNbalanced "(" / "[" (truncated data) to end
      .replace(/\s+feat\.?.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) continue;
    pairs.push({ id: g.slug, left: title, right: g.name });
  }
  return pairs;
}

/**
 * One pair per roster member: idol -> their group. The whole roster is baked;
 * the player's distinct-target sampling guarantees one idol per group in any
 * round (and different idols across runs, for replay).
 */
async function idolToGroupPairs(db: DbClient, groups: Map<string, GroupRow>, filter: GroupFilter): Promise<MatchUpPair[]> {
  const { data } = await db
    .from('games')
    .select('group_id, content')
    .eq('game_type', 'name_all_members')
    .eq('status', 'published');

  const pairs: MatchUpPair[] = [];
  for (const row of (data ?? []) as Array<{ group_id: string; content: { members?: Array<{ name?: string }> } | null }>) {
    const g = groups.get(row.group_id);
    if (!g || !filter(g)) continue;
    for (const m of row.content?.members ?? []) {
      const name = typeof m?.name === 'string' ? m.name.trim() : '';
      if (!name) continue;
      pairs.push({ id: `${g.slug}:${name}`, left: name, right: g.name });
    }
  }
  return pairs;
}

/**
 * Fandom name <-> group (ARMY -> BTS). One pair per clean group that has a real,
 * distinct fandom_name. Fandom names are unique per group, so targets are never
 * ambiguous.
 */
async function fandomToGroupPairs(groups: Map<string, GroupRow>): Promise<MatchUpPair[]> {
  const pairs: MatchUpPair[] = [];
  const seen = new Set<string>();
  for (const g of groups.values()) {
    const fandom = (g.fandom_name ?? '').trim();
    // Skip empty, or a fandom that is just the group's own name (no real fandom).
    if (!fandom || fandom.toLowerCase() === g.name.toLowerCase()) continue;
    const key = fandom.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ id: g.slug, left: fandom, right: g.name });
  }
  return pairs;
}

/**
 * Split naturally multi-word titles into two halves; match first half to second.
 * Fragments are globally de-duplicated (case-insensitive) so any sampled round
 * is unambiguous. Titles that do not split into two words are skipped, never
 * invented.
 */
async function titleHalvesPairs(db: DbClient): Promise<MatchUpPair[]> {
  const songs = await loadActiveSongs(db);
  const usedFragment = new Set<string>();
  const seenTitle = new Set<string>();
  const pairs: MatchUpPair[] = [];

  for (const s of songs) {
    const clean = (s.title ?? '')
      .replace(/\(.*?\)/g, '')
      .replace(/\bfeat\.?.*$/i, '')
      .replace(/_/g, ' ')
      .replace(/[^A-Za-z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = clean.split(' ').filter(Boolean);
    if (words.length < 2 || clean.length < 5) continue;

    const titleKey = clean.toLowerCase();
    if (seenTitle.has(titleKey)) continue;

    // Every word must be substantial so a half is never a lone letter ("T-T"),
    // and both halves must be >= 3 chars and different, so the fragments read as
    // real, distinguishable title pieces.
    if (words.some((w) => w.replace(/[^A-Za-z0-9]/g, '').length < 2)) continue;

    const mid = Math.ceil(words.length / 2);
    const first = words.slice(0, mid).join(' ');
    const second = words.slice(mid).join(' ');
    const fl = first.toLowerCase();
    const fr = second.toLowerCase();
    if (first.length < 3 || second.length < 3 || fl === fr) continue;
    if (usedFragment.has(fl) || usedFragment.has(fr)) continue;

    seenTitle.add(titleKey);
    usedFragment.add(fl);
    usedFragment.add(fr);
    pairs.push({ id: titleKey.replace(/\s+/g, '-'), left: first, right: second });
  }
  return pairs;
}

/**
 * Build the baked pair pool for a Match-Up playlist. Returns [] if the playlist
 * is unknown or the gate is not met (caller treats [] as notFound).
 */
export const getMatchUpPairs = cache(async (slug: string): Promise<MatchUpPair[]> => {
  const playlist = getMatchUpPlaylist(slug);
  if (!playlist) return [];

  const db = createPublicReadClient();
  const groups = await loadCleanGroups(db);

  // Gender is only needed by the boy/girl-scoped playlists; derive it lazily.
  const needsGender = slug.endsWith('-boy') || slug.endsWith('-girl');
  const gender = needsGender ? await deriveGroupGenders(db) : new Map<string, string>();
  const all: GroupFilter = () => true;
  const gen = (v: string): GroupFilter => (g) => g.generation === v;
  const isBoy: GroupFilter = (g) => gender.get(g.id) === 'bg';
  const isGirl: GroupFilter = (g) => gender.get(g.id) === 'gg';
  const older: GroupFilter = (g) => g.generation === '2nd Gen' || g.generation === '3rd Gen';
  const newer: GroupFilter = (g) => g.generation === '4th Gen' || g.generation === '5th Gen';

  let pairs: MatchUpPair[] = [];
  switch (slug) {
    case 'song-to-group': pairs = await songToGroupPairs(db, groups, all); break;
    case 'song-to-group-3rd-gen': pairs = await songToGroupPairs(db, groups, gen('3rd Gen')); break;
    case 'song-to-group-4th-gen': pairs = await songToGroupPairs(db, groups, gen('4th Gen')); break;
    case 'song-to-group-boy': pairs = await songToGroupPairs(db, groups, isBoy); break;
    case 'song-to-group-girl': pairs = await songToGroupPairs(db, groups, isGirl); break;
    case 'song-to-group-older-gen': pairs = await songToGroupPairs(db, groups, older); break;
    case 'song-to-group-newer-gen': pairs = await songToGroupPairs(db, groups, newer); break;
    case 'idol-to-group': pairs = await idolToGroupPairs(db, groups, all); break;
    case 'idol-to-group-3rd-gen': pairs = await idolToGroupPairs(db, groups, gen('3rd Gen')); break;
    case 'idol-to-group-4th-gen': pairs = await idolToGroupPairs(db, groups, gen('4th Gen')); break;
    case 'idol-to-group-boy': pairs = await idolToGroupPairs(db, groups, isBoy); break;
    case 'idol-to-group-girl': pairs = await idolToGroupPairs(db, groups, isGirl); break;
    case 'fandom-to-group': pairs = await fandomToGroupPairs(groups); break;
    case 'song-title-halves': pairs = await titleHalvesPairs(db); break;
  }

  if (pairs.length < MATCH_UP_MIN_PAIRS) return [];
  return pairs;
});
