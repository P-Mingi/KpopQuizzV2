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
  is_custom: boolean | null;
  needs_review: boolean | null;
}

// Catch-all "groups" that are not a real group, so pairing an idol/song to them
// is meaningless. Excluded from every Match-Up pool.
const EXCLUDED_GROUP_SLUGS = new Set(['general-kpop']);

async function loadCleanGroups(db: DbClient): Promise<Map<string, GroupRow>> {
  const { data } = await db
    .from('groups')
    .select('id, name, slug, generation, is_custom, needs_review');
  const clean = ((data ?? []) as GroupRow[]).filter(
    (g) => !g.is_custom && !g.needs_review && !EXCLUDED_GROUP_SLUGS.has(g.slug),
  );
  return new Map(clean.map((g) => [g.id, g]));
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
  generation: string | null,
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
    if (generation && g.generation !== generation) continue;
    // Format only: some raw titles use underscores for spaces. This tidies the
    // display of real data; it never changes which title belongs to the group.
    const title = (song.title ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
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
async function idolToGroupPairs(db: DbClient, groups: Map<string, GroupRow>): Promise<MatchUpPair[]> {
  const { data } = await db
    .from('games')
    .select('group_id, content')
    .eq('game_type', 'name_all_members')
    .eq('status', 'published');

  const pairs: MatchUpPair[] = [];
  for (const row of (data ?? []) as Array<{ group_id: string; content: { members?: Array<{ name?: string }> } | null }>) {
    const g = groups.get(row.group_id);
    if (!g) continue;
    for (const m of row.content?.members ?? []) {
      const name = typeof m?.name === 'string' ? m.name.trim() : '';
      if (!name) continue;
      pairs.push({ id: `${g.slug}:${name}`, left: name, right: g.name });
    }
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
  let pairs: MatchUpPair[] = [];

  if (slug === 'song-to-group') {
    pairs = await songToGroupPairs(db, groups, null);
  } else if (slug === 'song-to-group-3rd-gen') {
    pairs = await songToGroupPairs(db, groups, '3rd Gen');
  } else if (slug === 'song-to-group-4th-gen') {
    pairs = await songToGroupPairs(db, groups, '4th Gen');
  } else if (slug === 'idol-to-group') {
    pairs = await idolToGroupPairs(db, groups);
  } else if (slug === 'song-title-halves') {
    pairs = await titleHalvesPairs(db);
  }

  if (pairs.length < MATCH_UP_MIN_PAIRS) return [];
  return pairs;
});
