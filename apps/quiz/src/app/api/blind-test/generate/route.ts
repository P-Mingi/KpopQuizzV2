import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db/fetch-all';

import type { NextRequest } from 'next/server';

// Deezer blindtest generate. Reads the curated, tiered `songs` table and
// assembles a 10-question game with a tier-based per-game mix. Anonymous
// (no auth needed). Preview URLs are re-fetched from Deezer at generate time
// because Deezer preview links expire after a few hours.

// ----- tunable per-game tier mix -------------------------------------------
// Base targets; `hard` is 1-2 per game and `unknown` appears in ~50% of games.
// The total is trimmed/topped to exactly SONGS_COUNT. When a playlist is thin
// in a tier (e.g. a single group), the shortfall is filled from the nearest
// tiers via FILL_ORDER so a full game of 10 is always returned.
const TIER_ORDER = ['iconic', 'popular', 'medium', 'hard', 'unknown'] as const;
type Tier = (typeof TIER_ORDER)[number];
const MIX = {
  iconic: 3,
  popular: 3,
  medium: 2,
  hardMin: 1,
  hardMax: 2,
  unknownChance: 0.5,
} as const;
const FILL_ORDER: Tier[] = ['popular', 'medium', 'iconic', 'hard', 'unknown'];
const SONGS_COUNT = 10; // default round length
// U-2c: creator-chosen round count. Daily stays fixed at 10 via its own route.
const MIN_SONGS = 5;
const MAX_SONGS = 15;
// U-2b: a multi-group pick unions up to this many groups' catalogs.
const MAX_GROUPS = 3;

// Per-game question-type split (tunable): ~60% "guess the group/artist", ~40%
// "guess the song title", allocated for the whole game (not an independent coin
// flip per song, which can drift to all-one-type) then shuffled so the two
// types interleave unpredictably. groupBase of 10, with +/- jitter.
const QUESTION_MIX = { groupBase: 6, jitter: 1 } as const;

interface SongRow {
  id: string;
  deezer_track_id: number;
  title: string;
  artist_name: string;
  album_name: string | null;
  album_cover_medium: string | null;
  album_cover_big: string | null;
  preview_url: string;
  gender: string | null;
  generation: string | null;
  tier: Tier | null;
}

interface Question {
  song_id: string;
  question_type: 'artist' | 'title';
  question_text: string;
  preview_url: string;
  album_cover_medium: string | null;
  album_cover_big: string | null;
  correct_answer: string;
  choices: string[];
  reveal: { title: string; artist: string; album: string | null; cover: string | null };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Build the per-game per-tier target counts, trimmed/topped toward `count`.
function buildTarget(count: number): Record<Tier, number> {
  const hard = Math.random() < 0.5 ? MIX.hardMax : MIX.hardMin;
  const unknown = Math.random() < MIX.unknownChance ? 1 : 0;
  const target: Record<Tier, number> = {
    iconic: MIX.iconic,
    popular: MIX.popular,
    medium: MIX.medium,
    hard,
    unknown,
  };
  // Trim overflow above `count` in round-robin from least-iconic first, so a
  // short (5) game stays balanced and a long (15) game is topped up in select.
  const trimOrder: Tier[] = ['hard', 'unknown', 'medium', 'popular', 'iconic'];
  let total = TIER_ORDER.reduce((sum, t) => sum + target[t], 0);
  let i = 0;
  while (total > count && i < 200) {
    const t = trimOrder[i % trimOrder.length]!;
    if (target[t] > 0) { target[t] -= 1; total -= 1; }
    i++;
  }
  return target;
}

// Pick exactly `count` songs honoring the tier target, filling shortfalls from
// the nearest tiers (FILL_ORDER) so a full game is always returned when the
// candidate pool has at least `count` songs.
function selectGame(byTier: Record<Tier, SongRow[]>, target: Record<Tier, number>, count: number): SongRow[] {
  const used = new Set<string>();
  const picked: SongRow[] = [];
  const pull = (tier: Tier, k: number): void => {
    if (k <= 0) return;
    const pool = shuffle((byTier[tier] ?? []).filter((s) => !used.has(s.id)));
    for (const s of pool.slice(0, k)) {
      used.add(s.id);
      picked.push(s);
    }
  };
  // 1. targeted pick per tier
  for (const tier of TIER_ORDER) pull(tier, target[tier]);
  // 2. top up to `count` from nearest tiers (favor known tiers first)
  for (const tier of FILL_ORDER) {
    if (picked.length >= count) break;
    pull(tier, count - picked.length);
  }
  return shuffle(picked).slice(0, count);
}

function buildChoices(correct: string, wrongs: string[]): string[] {
  const filtered = wrongs.filter((w) => w && w !== correct).slice(0, 3);
  while (filtered.length < 3) filtered.push('Unknown');
  return shuffle([correct, ...filtered]);
}

// Distractors are drawn ONLY from the CURRENT game POOL, so they can never fall outside the
// active filter (generation / gender / group). That was the bug: the stored GLOBAL
// wrong_answers_* could offer, say, a 3rd-gen group in a 5th-gen-only game, letting a player
// eliminate the out-of-generation options and guess the answer. Preference order keeps the
// options plausible while staying inside the filter: same generation + gender first, then same
// generation, then same gender, then anything else already in the pool (all still in-filter).
function poolWrongArtists(song: SongRow, pool: SongRow[]): string[] {
  const names = (pred: (s: SongRow) => boolean): string[] =>
    [...new Set(pool.filter((s) => s.artist_name !== song.artist_name && pred(s)).map((s) => s.artist_name))];
  const tiers: Array<(s: SongRow) => boolean> = [
    (s) => s.generation === song.generation && s.gender === song.gender,
    (s) => s.generation === song.generation,
    (s) => s.gender === song.gender,
    () => true,
  ];
  const out: string[] = [];
  for (const pred of tiers) {
    for (const n of shuffle(names(pred))) { if (out.length >= 3) break; if (!out.includes(n)) out.push(n); }
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

function poolWrongTitles(song: SongRow, pool: SongRow[]): string[] {
  const titles = (pred: (s: SongRow) => boolean): string[] =>
    [...new Set(pool.filter((s) => s.title !== song.title && pred(s)).map((s) => s.title))];
  const out: string[] = [];
  // Other songs by the SAME act first: hardest, and reveals nothing about the filter.
  for (const t of shuffle(titles((s) => s.artist_name === song.artist_name))) { if (out.length >= 3) break; out.push(t); }
  const tiers: Array<(s: SongRow) => boolean> = [
    (s) => s.generation === song.generation && s.gender === song.gender,
    (s) => s.generation === song.generation,
    () => true,
  ];
  for (const pred of tiers) {
    if (out.length >= 3) break;
    for (const t of shuffle(titles(pred))) { if (out.length >= 3) break; if (!out.includes(t)) out.push(t); }
  }
  return out.slice(0, 3);
}

const GENERAL_PLAYLISTS = new Set([
  'all', 'gg', 'bg', 'solo', '1st-gen', '2nd-gen', '3rd-gen', '4th-gen', '5th-gen',
  'title-tracks', 'hits', 'deep',
]);
const GEN_MAP: Record<string, string> = {
  '1st-gen': '1st', '2nd-gen': '2nd', '3rd-gen': '3rd', '4th-gen': '4th', '5th-gen': '5th',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { playlist?: string; groups?: unknown; count?: unknown; mode?: string; difficulty?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const playlist = body.playlist ?? 'all';
  const mode = body.mode ?? 'quick';
  const difficulty = body.difficulty ?? 'all';
  const timerDuration = mode === 'challenge' ? 10 : 15;

  // U-2c: round count (5-15, default 10). Daily uses its own fixed-10 route.
  const rawCount = typeof body.count === 'number' ? Math.round(body.count) : SONGS_COUNT;
  const count = Math.max(MIN_SONGS, Math.min(MAX_SONGS, rawCount));

  // U-2b: multi-group pick (up to 3 slugs). When present, the pool is the union
  // of those groups' catalogs. A single-slug playlist still uses the path below,
  // so existing deep links are unchanged.
  const groupSlugs = Array.isArray(body.groups)
    ? [...new Set(body.groups.filter((s): s is string => typeof s === 'string' && s.length > 0))].slice(0, MAX_GROUPS)
    : [];
  const isMultiGroup = groupSlugs.length > 0;

  const supabase = await createServerClient();

  const isGroupPlaylist = !GENERAL_PLAYLISTS.has(playlist);

  // Resolve the playlist to a reusable filter modifier AFTER any async group lookups, so the
  // pool query can be rebuilt fresh per page by fetchAllRows below (a built query awaits once).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let applyPlaylist: (q: any) => any = (q) => q;

  if (isMultiGroup) {
    // Union of the picked groups' catalogs (matched by group_id). Unknown slugs are dropped;
    // an empty result falls through to the not-enough-songs guard.
    const { data: grps } = await supabase.from('groups').select('id').in('slug', groupSlugs);
    const ids = (grps ?? []).map((g) => g.id as number);
    applyPlaylist = ids.length > 0 ? (q) => q.in('group_id', ids) : (q) => q.eq('group_id', -1);
  } else if (isGroupPlaylist) {
    const { data: group } = await supabase
      .from('groups').select('id, name').eq('slug', playlist).maybeSingle();
    if (group?.id) {
      // Primary: match by group_id - robust vs punctuation/romanization and the PostgREST
      // filter-parsing issues an artist_name ilike hits on names like "(G)I-DLE" or "f(x)".
      const { count } = await supabase
        .from('songs').select('id', { count: 'exact', head: true })
        .eq('status', 'active').eq('group_id', group.id);
      if ((count ?? 0) > 0) applyPlaylist = (q) => q.eq('group_id', group.id as number);
      else if (group.name) applyPlaylist = (q) => q.ilike('artist_name', group.name as string);
    } else {
      applyPlaylist = (q) => q.ilike('artist_name', `%${playlist.replace(/-/g, ' ')}%`);
    }
  } else {
    switch (playlist) {
      case 'gg': applyPlaylist = (q) => q.eq('gender', 'gg'); break;
      case 'bg': applyPlaylist = (q) => q.eq('gender', 'bg'); break;
      case 'solo': applyPlaylist = (q) => q.in('gender', ['solo_female', 'solo_male']); break;
      case '1st-gen': case '2nd-gen': case '3rd-gen': case '4th-gen': case '5th-gen':
        applyPlaylist = (q) => q.eq('generation', GEN_MAP[playlist]!); break;
      case 'title-tracks': applyPlaylist = (q) => q.eq('is_title_track', true); break;
      case 'hits': applyPlaylist = (q) => q.in('tier', ['iconic', 'popular']); break;
      case 'deep': applyPlaylist = (q) => q.in('tier', ['medium', 'hard', 'unknown']); break;
    }
  }

  // Curation: general (non-group) playlists pull from the curated subset when enabled.
  const applyCurated = process.env.SONGS_IS_CURATED === 'true' && !isGroupPlaylist && !isMultiGroup && playlist !== 'deep';

  // Read the WHOLE filtered pool, paginating PAST PostgREST's 1000-row cap. Before this, any
  // pool over 1000 songs (gg 1190, bg 1350, 4th-gen 1097, all 4120) returned only the oldest
  // 1000 by id - so newly added songs never surfaced and most of the catalog was unreachable
  // in those games. The title guard is belt-and-braces (junk is excluded at import).
  const makeQuery = () => {
    let q = supabase
      .from('songs')
      .select('id, deezer_track_id, title, artist_name, album_name, album_cover_medium, album_cover_big, preview_url, gender, generation, tier')
      .eq('status', 'active');
    if (applyCurated) q = q.eq('is_curated', true);
    q = q.not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%');
    return applyPlaylist(q);
  };
  const pool = await fetchAllRows<SongRow>(makeQuery);

  if (pool.length < count) {
    return NextResponse.json(
      { error: 'Not enough songs for this playlist', available: pool.length, needed: count },
      { status: 400 },
    );
  }

  // Bucket by tier and assemble the mix.
  const byTier = { iconic: [], popular: [], medium: [], hard: [], unknown: [] } as Record<Tier, SongRow[]>;
  for (const s of pool) {
    const t: Tier = s.tier && TIER_ORDER.includes(s.tier) ? s.tier : 'medium';
    byTier[t].push(s);
  }
  const selected = selectGame(byTier, buildTarget(count), count);

  // Re-fetch fresh preview URLs + covers from Deezer (stored links expire).
  await Promise.all(
    selected.map(async (song) => {
      try {
        const res = await fetch(`https://api.deezer.com/track/${song.deezer_track_id}`);
        const track = (await res.json()) as { preview?: string; album?: { cover_medium?: string; cover_big?: string } };
        if (typeof track.preview === 'string' && track.preview.length > 10) song.preview_url = track.preview;
        if (track.album?.cover_medium) song.album_cover_medium = track.album.cover_medium;
        if (track.album?.cover_big) song.album_cover_big = track.album.cover_big;
      } catch {
        // keep the stored URL as fallback
      }
    }),
  );

  // Allocate the whole game's question-type split, then shuffle so 'artist' and
  // 'title' questions interleave unpredictably (not all-one-type, not a fixed
  // group-then-title order).
  const SOLO_GENDERS = new Set(['solo_female', 'solo_male']);
  const jit = Math.floor(Math.random() * (QUESTION_MIX.jitter * 2 + 1)) - QUESTION_MIX.jitter;
  // For a single-group / single-artist playlist, "which group/artist is this?"
  // is trivially the chosen act, so ask only "name the song" (groupCount = 0).
  const groupCount = isGroupPlaylist
    ? 0
    : Math.max(0, Math.min(SONGS_COUNT, QUESTION_MIX.groupBase + jit));
  const types = shuffle<'artist' | 'title'>([
    ...Array.from({ length: groupCount }, () => 'artist' as const),
    ...Array.from({ length: SONGS_COUNT - groupCount }, () => 'title' as const),
  ]);

  const questions: Question[] = selected.map((song, i) => {
    if (types[i] === 'artist') {
      const wrongs = poolWrongArtists(song, pool);
      return {
        song_id: song.id,
        question_type: 'artist',
        // artist_name can be a soloist, so frame solo acts as "artist", groups as "group".
        question_text: SOLO_GENDERS.has(song.gender ?? '') ? 'Which artist?' : 'Which group is this?',
        preview_url: song.preview_url,
        album_cover_medium: song.album_cover_medium,
        album_cover_big: song.album_cover_big,
        correct_answer: song.artist_name,
        choices: buildChoices(song.artist_name, wrongs),
        reveal: { title: song.title, artist: song.artist_name, album: song.album_name, cover: song.album_cover_big },
      };
    }
    const wrongs = poolWrongTitles(song, pool);
    return {
      song_id: song.id,
      question_type: 'title',
      question_text: 'Name the song',
      preview_url: song.preview_url,
      album_cover_medium: song.album_cover_medium,
      album_cover_big: song.album_cover_big,
      correct_answer: song.title,
      choices: buildChoices(song.title, wrongs),
      reveal: { title: song.title, artist: song.artist_name, album: song.album_name, cover: song.album_cover_big },
    };
  });

  return NextResponse.json({
    questions,
    playlist,
    mode,
    difficulty,
    timer_duration: timerDuration,
    songs_count: SONGS_COUNT,
    all_artists: [...new Set(pool.map((s) => s.artist_name))],
    all_titles: [...new Set(pool.map((s) => s.title))],
  });
}
