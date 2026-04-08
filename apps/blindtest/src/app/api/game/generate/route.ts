import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

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
  difficulty: string;
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

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function smartMix(easy: SongRow[], medium: SongRow[], hard: SongRow[], distribution: number[], total: number): SongRow[] {
  const [easyCount, medCount, mixedCount, hardCount] = distribution;
  const picked: SongRow[] = [];

  // Pick from each tier
  picked.push(...pickRandom(easy, easyCount ?? 0));
  picked.push(...pickRandom(medium, medCount ?? 0));

  // Mixed = random from medium + hard
  const mixedPool = [...medium, ...hard];
  picked.push(...pickRandom(mixedPool.filter((s) => !picked.includes(s)), mixedCount ?? 0));

  picked.push(...pickRandom(hard.filter((s) => !picked.includes(s)), hardCount ?? 0));

  // Fill remaining with any available songs
  const allPool = [...easy, ...medium, ...hard].filter((s) => !picked.includes(s));
  while (picked.length < total && allPool.length > 0) {
    const idx = Math.floor(Math.random() * allPool.length);
    picked.push(allPool.splice(idx, 1)[0]!);
  }

  // Shuffle final order
  return picked.sort(() => Math.random() - 0.5).slice(0, total);
}

function buildChoices(correct: string, wrongs: string[]): string[] {
  const wrongFiltered = wrongs.filter((w) => w !== correct).slice(0, 3);
  while (wrongFiltered.length < 3) wrongFiltered.push('Unknown');
  const all = [correct, ...wrongFiltered];
  return all.sort(() => Math.random() - 0.5);
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: { playlist?: string; mode?: string; difficulty?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const playlist = body.playlist ?? 'all';
  const mode = body.mode ?? 'quick';
  const difficulty = body.difficulty ?? 'all';
  const timerDuration = mode === 'challenge' ? 10 : 15;
  const songsCount = 10;

  const supabase = await createServerClient();

  // Determine playlist scope first; both branches below need this.
  const isGroupPlaylist = !['all', 'gg', 'bg', 'solo', '4th-gen', '3rd-gen', '2nd-gen', 'title-tracks', 'hits', 'deep'].includes(playlist);

  // Build query
  let query = supabase
    .from('songs')
    .select('id, deezer_track_id, title, artist_name, album_name, album_cover_medium, album_cover_big, preview_url, gender, generation, difficulty, wrong_answers_artist, wrong_answers_title')
    .eq('status', 'active');

  // Curation acts as the popularity proxy.
  // The current dataset has deezer_rank=0 and difficulty='medium' for every row,
  // so we use is_curated as the only signal for "mainstream vs deep cut".
  // Gated by SONGS_IS_CURATED env var so the code can ship before the migration runs.
  //   - General playlist + 'all' (Smart mix) -> curated subset (friendly default)
  //   - Any playlist + 'hits'                -> curated subset
  //   - Any playlist + 'deep'                -> uncurated long tail
  //   - Group playlist + 'all'               -> full group catalog (no curation filter)
  const curationEnabled = process.env.SONGS_IS_CURATED === 'true';
  if (curationEnabled) {
    if (difficulty === 'hits') {
      query = query.eq('is_curated', true);
    } else if (difficulty === 'deep') {
      query = query.eq('is_curated', false);
    } else if (!isGroupPlaylist) {
      query = query.eq('is_curated', true);
    }
  }

  // Always exclude remixes / instrumentals / special versions, regardless of playlist
  // scope or curation. The curated subset is already filtered by the migration, but
  // Deep cuts (is_curated=false) and group playlists need this at query time too.
  query = query
    .not('title', 'ilike', '%remix%')
    .not('title', 'ilike', '%instrumental%')
    .not('title', 'ilike', '%inst.%')
    .not('title', 'ilike', '%(inst)%')
    .not('title', 'ilike', '%karaoke%')
    .not('title', 'ilike', '%MR removed%')
    .not('title', 'ilike', '%sped up%')
    .not('title', 'ilike', '%speed up%')
    .not('title', 'ilike', '%slowed%')
    .not('title', 'ilike', '%reverb%');

  if (isGroupPlaylist) {
    // First try exact artist name match (from home page group pills)
    const { data: exactMatch } = await supabase
      .from('songs')
      .select('id')
      .eq('artist_name', playlist)
      .eq('status', 'active')
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      query = query.eq('artist_name', playlist);
    } else {
      // Try group slug via groups table
      const { data: groupData } = await supabase.from('groups').select('id, name').eq('slug', playlist).single();
      if (groupData) {
        query = query.eq('group_id', groupData.id);
      } else {
        // Fuzzy match on artist name
        query = query.ilike('artist_name', `%${playlist.replace(/-/g, ' ')}%`);
      }
    }
  } else {
    switch (playlist) {
      case 'gg': query = query.eq('gender', 'gg'); break;
      case 'bg': query = query.eq('gender', 'bg'); break;
      case 'solo': query = query.in('gender', ['solo_female', 'solo_male']); break;
      case '4th-gen': query = query.eq('generation', '4th'); break;
      case '3rd-gen': query = query.eq('generation', '3rd'); break;
      case '2nd-gen': query = query.eq('generation', '2nd'); break;
    }
  }

  // Difficulty bucketing via the songs.difficulty column is currently a no-op
  // (the column is unpopulated -- every active row is 'medium'). Hits/Deep are
  // expressed via is_curated above. If/when deezer_rank gets backfilled, this is
  // where a rank-based filter would slot in.

  const { data: allSongs } = await query.limit(50000);

  if (!allSongs || allSongs.length < songsCount) {
    return NextResponse.json({
      error: 'Not enough songs for this playlist',
      available: allSongs?.length ?? 0,
      needed: songsCount,
    }, { status: 400 });
  }

  const songs = allSongs as SongRow[];

  // Split by difficulty
  const easy = songs.filter((s) => s.difficulty === 'easy');
  const medium = songs.filter((s) => s.difficulty === 'medium');
  const hard = songs.filter((s) => s.difficulty === 'hard');

  // Smart mix based on difficulty filter
  let distribution: number[];
  if (difficulty === 'hits') {
    distribution = [10, 0, 0, 0]; // all easy
  } else if (difficulty === 'deep') {
    distribution = [0, 5, 3, 2]; // no easy
  } else if (isGroupPlaylist) {
    distribution = [3, 3, 2, 2]; // group fans know more
  } else {
    distribution = [4, 3, 2, 1]; // default balanced mix
  }

  const selected = smartMix(easy, medium, hard, distribution, songsCount);

  // Fetch fresh preview URLs from Deezer (stored URLs expire after a few hours)
  await Promise.all(
    selected.map(async (song) => {
      try {
        const res = await fetch(`https://api.deezer.com/track/${song.deezer_track_id}`);
        const data = await res.json();
        if (data.preview && typeof data.preview === 'string' && data.preview.length > 10) {
          song.preview_url = data.preview;
        }
        if (data.album?.cover_medium) {
          song.album_cover_medium = data.album.cover_medium as string;
        }
        if (data.album?.cover_big) {
          song.album_cover_big = data.album.cover_big as string;
        }
      } catch {
        // Keep the stored URL as fallback
      }
    }),
  );

  // Build questions
  const questions: Question[] = selected.map((song) => {
    const isArtistQuestion = Math.random() < 0.6;

    if (isArtistQuestion) {
      const wrongArtists = song.wrong_answers_artist.length >= 3
        ? song.wrong_answers_artist
        : getRandomWrongArtists(song, songs);
      return {
        song_id: song.id,
        question_type: 'artist' as const,
        question_text: 'Who is this artist?',
        preview_url: song.preview_url,
        album_cover_medium: song.album_cover_medium,
        album_cover_big: song.album_cover_big,
        correct_answer: song.artist_name,
        choices: buildChoices(song.artist_name, wrongArtists),
        reveal: { title: song.title, artist: song.artist_name, album: song.album_name, cover: song.album_cover_big },
      };
    }

    const wrongTitles = song.wrong_answers_title.length >= 3
      ? song.wrong_answers_title
      : getRandomWrongTitles(song, songs);
    return {
      song_id: song.id,
      question_type: 'title' as const,
      question_text: 'Name this song:',
      preview_url: song.preview_url,
      album_cover_medium: song.album_cover_medium,
      album_cover_big: song.album_cover_big,
      correct_answer: song.title,
      choices: buildChoices(song.title, wrongTitles),
      reveal: { title: song.title, artist: song.artist_name, album: song.album_name, cover: song.album_cover_big },
    };
  });

  // Collect all possible answers for challenge mode auto-suggest
  const allArtists = [...new Set(songs.map((s) => s.artist_name))];
  const allTitles = [...new Set(songs.map((s) => s.title))];

  return NextResponse.json({
    questions,
    playlist,
    mode,
    difficulty,
    timer_duration: timerDuration,
    songs_count: songsCount,
    all_artists: allArtists,
    all_titles: allTitles,
  });
}

function getRandomWrongArtists(song: SongRow, pool: SongRow[]): string[] {
  const sameGender = pool.filter((s) => s.gender === song.gender && s.artist_name !== song.artist_name);
  const unique = [...new Set(sameGender.map((s) => s.artist_name))].sort(() => Math.random() - 0.5);
  return unique.slice(0, 3);
}

function getRandomWrongTitles(song: SongRow, pool: SongRow[]): string[] {
  const sameArtist = pool.filter((s) => s.artist_name === song.artist_name && s.title !== song.title);
  const titles = sameArtist.map((s) => s.title);
  if (titles.length < 3) {
    const sameGender = pool.filter((s) => s.gender === song.gender && s.artist_name !== song.artist_name);
    titles.push(...sameGender.map((s) => s.title));
  }
  return [...new Set(titles)].sort(() => Math.random() - 0.5).slice(0, 3);
}
