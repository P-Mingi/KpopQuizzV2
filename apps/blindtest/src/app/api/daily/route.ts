import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';

export const dynamic = 'force-dynamic';

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

// ---- Deterministic helpers ----
// We want every player on the same date to get the exact same 10 songs in the
// same order with the same question types. A single hash of the date seeds
// everything. xorshift32 gives us a cheap, deterministic PRNG.

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function xorshift(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function seededShuffle<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function buildChoices(correct: string, wrongs: string[], rnd: () => number): string[] {
  const filtered = wrongs.filter((w) => w !== correct).slice(0, 3);
  while (filtered.length < 3) filtered.push('Unknown');
  return seededShuffle([correct, ...filtered], rnd);
}

// ---- Challenge generation ----

async function buildChallengeForDate(
  supabase: ReturnType<typeof createServiceRoleClient>,
  date: string,
): Promise<{ questions: Question[]; playlist: string } | null> {
  // Paginate the curated active catalog so the server row cap doesn't clip us.
  const PAGE_SIZE = 1000;
  const pool: SongRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('songs')
      .select('id, deezer_track_id, title, artist_name, album_name, album_cover_medium, album_cover_big, preview_url, gender, generation, wrong_answers_artist, wrong_answers_title')
      .eq('status', 'active')
      .eq('is_curated', true)
      .not('preview_url', 'is', null)
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    pool.push(...(data as SongRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    if (from > 20000) break;
  }

  if (pool.length < 10) return null;

  // Seeded shuffle + pick 10.
  const rnd = xorshift(hashCode(`daily-${date}`));
  const selected = seededShuffle(pool, rnd).slice(0, 10);

  // Build questions. 60% artist, 40% title, deterministic via the same PRNG.
  const questions: Question[] = selected.map((song) => {
    const isArtistQuestion = rnd() < 0.6;
    if (isArtistQuestion) {
      const wrongs = song.wrong_answers_artist?.length >= 3
        ? song.wrong_answers_artist
        : pool
          .filter((s) => s.gender === song.gender && s.artist_name !== song.artist_name)
          .map((s) => s.artist_name)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 6);
      return {
        song_id: song.id,
        question_type: 'artist',
        question_text: 'Who is this artist?',
        preview_url: song.preview_url,
        album_cover_medium: song.album_cover_medium,
        album_cover_big: song.album_cover_big,
        correct_answer: song.artist_name,
        choices: buildChoices(song.artist_name, wrongs, rnd),
        reveal: {
          title: song.title,
          artist: song.artist_name,
          album: song.album_name,
          cover: song.album_cover_big,
        },
      };
    }
    const wrongs = song.wrong_answers_title?.length >= 3
      ? song.wrong_answers_title
      : pool
        .filter((s) => s.artist_name === song.artist_name && s.title !== song.title)
        .map((s) => s.title)
        .slice(0, 6);
    return {
      song_id: song.id,
      question_type: 'title',
      question_text: 'Name this song:',
      preview_url: song.preview_url,
      album_cover_medium: song.album_cover_medium,
      album_cover_big: song.album_cover_big,
      correct_answer: song.title,
      choices: buildChoices(song.title, wrongs, rnd),
      reveal: {
        title: song.title,
        artist: song.artist_name,
        album: song.album_name,
        cover: song.album_cover_big,
      },
    };
  });

  return { questions, playlist: 'all' };
}

// ---- Time until next KST reset ----

function msUntilKstMidnight(): number {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const kstMidnight = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() + 1,
    0, 0, 0, 0,
  );
  // kstMidnight is the next midnight in "KST wall clock time treated as UTC",
  // so the actual UTC moment is kstMidnight - 9h.
  const kstMidnightAsUtc = kstMidnight - 9 * 3600 * 1000;
  return Math.max(0, kstMidnightAsUtc - now.getTime());
}

export async function GET() {
  const supabase = createServiceRoleClient();
  const today = getTodayKST();

  // Fetch or create today's challenge.
  let { data: challenge } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (!challenge || !challenge.questions) {
    // Generate questions for the new format.
    const generated = await buildChallengeForDate(supabase, today);
    if (!generated) {
      return NextResponse.json({ error: 'Not enough curated songs to generate daily challenge' }, { status: 500 });
    }

    // Count existing dailies to derive the day number.
    const { count: existingCount } = await supabase
      .from('daily_challenges')
      .select('id', { count: 'exact', head: true });
    const dayNumber = (existingCount ?? 0) + (challenge ? 0 : 1);

    if (challenge) {
      // Row exists (from the legacy flow) but no questions yet; upgrade in place.
      const { data: upgraded } = await supabase
        .from('daily_challenges')
        .update({
          questions: generated.questions,
          playlist: generated.playlist,
          day_number: challenge.day_number ?? dayNumber,
        })
        .eq('id', challenge.id)
        .select()
        .single();
      challenge = upgraded ?? challenge;
    } else {
      const { data: created } = await supabase
        .from('daily_challenges')
        .insert({
          date: today,
          day_number: dayNumber,
          questions: generated.questions,
          playlist: generated.playlist,
          clip_point: 'chorus',
          clip_duration: 15,
          song_ids: generated.questions.map((q) => q.song_id),
        })
        .select()
        .single();
      challenge = created;
    }
  }

  if (!challenge) {
    return NextResponse.json({ error: 'Could not create daily challenge' }, { status: 500 });
  }

  // Aggregate stats for today.
  const { count: playCount } = await supabase
    .from('daily_challenge_plays')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge.id);

  const { data: scoreRows } = await supabase
    .from('daily_challenge_plays')
    .select('score, correct, total_time')
    .eq('challenge_id', challenge.id);

  const avgScore = scoreRows && scoreRows.length > 0
    ? Math.round(scoreRows.reduce((s: number, r: { score: number }) => s + r.score, 0) / scoreRows.length)
    : 0;
  const avgCorrect = scoreRows && scoreRows.length > 0
    ? Number((scoreRows.reduce((s: number, r: { correct: number }) => s + r.correct, 0) / scoreRows.length).toFixed(1))
    : 0;
  const avgTime = scoreRows && scoreRows.length > 0
    ? Math.round(scoreRows.reduce((s: number, r: { total_time: number | null }) => s + (r.total_time ?? 0), 0) / scoreRows.length)
    : 0;

  // Current user's attempt, if any.
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  let hasPlayed = false;
  let playerResult: {
    score: number;
    correct: number;
    total_time: number;
    best_combo: number;
    songs: unknown[];
    rank: number;
    total_players: number;
  } | null = null;

  if (user) {
    const { data: myPlay } = await supabase
      .from('daily_challenge_plays')
      .select('score, correct, total_time, best_combo, songs')
      .eq('player_id', user.id)
      .eq('challenge_id', challenge.id)
      .maybeSingle();

    if (myPlay) {
      hasPlayed = true;
      // Rank = how many plays have a score strictly greater, plus 1.
      const { data: ranked } = await supabase
        .from('daily_challenge_plays')
        .select('player_id, score')
        .eq('challenge_id', challenge.id)
        .order('score', { ascending: false });
      const rank = (ranked ?? []).findIndex((r: { player_id: string }) => r.player_id === user.id) + 1;
      playerResult = {
        score: myPlay.score as number,
        correct: myPlay.correct as number,
        total_time: (myPlay.total_time as number | null) ?? 0,
        best_combo: (myPlay.best_combo as number | null) ?? 0,
        songs: (myPlay.songs as unknown[] | null) ?? [],
        rank,
        total_players: ranked?.length ?? 0,
      };
    }
  }

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      date: challenge.date,
      day_number: challenge.day_number,
      playlist: challenge.playlist ?? 'all',
      // Never expose questions once played. Also omit on the listing endpoint;
      // the /play/daily route fetches them separately.
      song_count: Array.isArray(challenge.questions)
        ? challenge.questions.length
        : (challenge.song_ids as string[] | null)?.length ?? 10,
    },
    stats: {
      play_count: playCount ?? 0,
      avg_score: avgScore,
      avg_correct: avgCorrect,
      avg_time: avgTime,
    },
    hasPlayed,
    playerResult,
    msUntilReset: msUntilKstMidnight(),
  });
}
