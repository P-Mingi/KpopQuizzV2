import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

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
const SONGS_COUNT = 10;

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
  wrong_answers_artist: string[];
  wrong_answers_title: string[];
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

// Build the per-game per-tier target counts, trimmed/topped toward 10.
function buildTarget(): Record<Tier, number> {
  const hard = Math.random() < 0.5 ? MIX.hardMax : MIX.hardMin;
  const unknown = Math.random() < MIX.unknownChance ? 1 : 0;
  const target: Record<Tier, number> = {
    iconic: MIX.iconic,
    popular: MIX.popular,
    medium: MIX.medium,
    hard,
    unknown,
  };
  // Trim any overflow above 10: drop hard before unknown so unknown stays ~50%.
  let total = TIER_ORDER.reduce((sum, t) => sum + target[t], 0);
  while (total > SONGS_COUNT) {
    if (target.hard > MIX.hardMin) target.hard -= 1;
    else if (target.unknown > 0) target.unknown -= 1;
    else target.medium -= 1;
    total -= 1;
  }
  return target;
}

// Pick exactly SONGS_COUNT songs honoring the tier target, filling shortfalls
// from the nearest tiers (FILL_ORDER) so a full game is always returned when
// the candidate pool has at least SONGS_COUNT songs.
function selectGame(byTier: Record<Tier, SongRow[]>, target: Record<Tier, number>): SongRow[] {
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
  // 2. top up to 10 from nearest tiers (favor known tiers first)
  for (const tier of FILL_ORDER) {
    if (picked.length >= SONGS_COUNT) break;
    pull(tier, SONGS_COUNT - picked.length);
  }
  return shuffle(picked).slice(0, SONGS_COUNT);
}

function buildChoices(correct: string, wrongs: string[]): string[] {
  const filtered = wrongs.filter((w) => w && w !== correct).slice(0, 3);
  while (filtered.length < 3) filtered.push('Unknown');
  return shuffle([correct, ...filtered]);
}

function fallbackWrongArtists(song: SongRow, pool: SongRow[]): string[] {
  const sameGender = pool.filter((s) => s.gender === song.gender && s.artist_name !== song.artist_name);
  return shuffle([...new Set(sameGender.map((s) => s.artist_name))]).slice(0, 3);
}

function fallbackWrongTitles(song: SongRow, pool: SongRow[]): string[] {
  const sameArtist = pool.filter((s) => s.artist_name === song.artist_name && s.title !== song.title).map((s) => s.title);
  const titles = [...sameArtist];
  if (titles.length < 3) {
    const sameGender = pool.filter((s) => s.gender === song.gender && s.artist_name !== song.artist_name);
    titles.push(...sameGender.map((s) => s.title));
  }
  return shuffle([...new Set(titles)]).slice(0, 3);
}

const GENERAL_PLAYLISTS = new Set([
  'all', 'gg', 'bg', 'solo', '1st-gen', '2nd-gen', '3rd-gen', '4th-gen', '5th-gen',
  'title-tracks', 'hits', 'deep',
]);
const GEN_MAP: Record<string, string> = {
  '1st-gen': '1st', '2nd-gen': '2nd', '3rd-gen': '3rd', '4th-gen': '4th', '5th-gen': '5th',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { playlist?: string; mode?: string; difficulty?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const playlist = body.playlist ?? 'all';
  const mode = body.mode ?? 'quick';
  const difficulty = body.difficulty ?? 'all';
  const timerDuration = mode === 'challenge' ? 10 : 15;

  const supabase = await createServerClient();

  const isGroupPlaylist = !GENERAL_PLAYLISTS.has(playlist);

  let query = supabase
    .from('songs')
    .select('id, deezer_track_id, title, artist_name, album_name, album_cover_medium, album_cover_big, preview_url, gender, generation, tier, wrong_answers_artist, wrong_answers_title')
    .eq('status', 'active');

  // Curation: general (non-group) playlists pull from the curated subset when
  // enabled. Group playlists use the full group catalog.
  if (process.env.SONGS_IS_CURATED === 'true' && !isGroupPlaylist && playlist !== 'deep') {
    query = query.eq('is_curated', true);
  }

  // Light title guard. Junk is already excluded at import; this is belt and
  // braces for any future rows.
  query = query
    .not('title', 'ilike', '%remix%')
    .not('title', 'ilike', '%instrumental%')
    .not('title', 'ilike', '%inst.%')
    .not('title', 'ilike', '%karaoke%');

  if (isGroupPlaylist) {
    const { data: group } = await supabase
      .from('groups').select('id, name').eq('slug', playlist).maybeSingle();
    if (group?.id) {
      // Primary: match by group_id. This is robust and consistent with the
      // setup picker - it avoids punctuation/romanization mismatches and the
      // PostgREST filter-parsing issues an artist_name ilike hits on names like
      // "(G)I-DLE" or "f(x)" (parentheses), which caused "not enough songs".
      const { count } = await supabase
        .from('songs').select('id', { count: 'exact', head: true })
        .eq('status', 'active').eq('group_id', group.id);
      if ((count ?? 0) > 0) {
        query = query.eq('group_id', group.id);
      } else if (group.name) {
        // Fallback only when a group has no group_id rows yet.
        query = query.ilike('artist_name', group.name as string);
      }
    } else {
      query = query.ilike('artist_name', `%${playlist.replace(/-/g, ' ')}%`);
    }
  } else {
    switch (playlist) {
      case 'gg': query = query.eq('gender', 'gg'); break;
      case 'bg': query = query.eq('gender', 'bg'); break;
      case 'solo': query = query.in('gender', ['solo_female', 'solo_male']); break;
      case '1st-gen': case '2nd-gen': case '3rd-gen': case '4th-gen': case '5th-gen':
        query = query.eq('generation', GEN_MAP[playlist]!); break;
      case 'title-tracks': query = query.eq('is_title_track', true); break;
      case 'hits': query = query.in('tier', ['iconic', 'popular']); break;
      case 'deep': query = query.in('tier', ['medium', 'hard', 'unknown']); break;
    }
  }

  const { data } = await query.limit(5000);
  const pool = (data ?? []) as SongRow[];

  if (pool.length < SONGS_COUNT) {
    return NextResponse.json(
      { error: 'Not enough songs for this playlist', available: pool.length, needed: SONGS_COUNT },
      { status: 400 },
    );
  }

  // Bucket by tier and assemble the mix.
  const byTier = { iconic: [], popular: [], medium: [], hard: [], unknown: [] } as Record<Tier, SongRow[]>;
  for (const s of pool) {
    const t: Tier = s.tier && TIER_ORDER.includes(s.tier) ? s.tier : 'medium';
    byTier[t].push(s);
  }
  const selected = selectGame(byTier, buildTarget());

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
  const groupCount = Math.max(0, Math.min(SONGS_COUNT, QUESTION_MIX.groupBase + jit));
  const types = shuffle<'artist' | 'title'>([
    ...Array.from({ length: groupCount }, () => 'artist' as const),
    ...Array.from({ length: SONGS_COUNT - groupCount }, () => 'title' as const),
  ]);

  const questions: Question[] = selected.map((song, i) => {
    if (types[i] === 'artist') {
      const wrongs = song.wrong_answers_artist?.length >= 3 ? song.wrong_answers_artist : fallbackWrongArtists(song, pool);
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
    const wrongs = song.wrong_answers_title?.length >= 3 ? song.wrong_answers_title : fallbackWrongTitles(song, pool);
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
