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

async function loadCleanGroups(db: DbClient): Promise<Map<string, GroupRow>> {
  const { data } = await db
    .from('groups')
    .select('id, name, slug, generation, is_custom, needs_review');
  const clean = ((data ?? []) as GroupRow[]).filter((g) => !g.is_custom && !g.needs_review);
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
 * Build the baked pair pool for a Match-Up playlist. Returns [] if the playlist
 * is unknown or the gate is not met (caller treats [] as notFound).
 */
export async function getMatchUpPairs(slug: string): Promise<MatchUpPair[]> {
  const playlist = getMatchUpPlaylist(slug);
  if (!playlist) return [];

  const db = createPublicReadClient();
  const groups = await loadCleanGroups(db);
  let pairs: MatchUpPair[] = [];

  if (slug === 'song-to-group') {
    pairs = await songToGroupPairs(db, groups, null);
  }

  if (pairs.length < MATCH_UP_MIN_PAIRS) return [];
  return pairs;
}
