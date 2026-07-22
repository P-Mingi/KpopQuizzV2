import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

// N2.1 - GET /api/daily/blindtest
// Today's Blindtest of the Day: the SAME 10 questions for everyone. The song
// set + per-song question types are chosen once per UTC day by the DB function
// ensure_daily_blindtest (idempotent); this route hydrates them from `songs`,
// re-fetches fresh Deezer preview URLs (stored links expire), and builds the
// same Question[] shape as /api/blind-test/generate. Edge-cached 5 minutes.
export const dynamic = 'force-dynamic';

const SONGS_COUNT = 10;
const SOLO_GENDERS = new Set(['solo_female', 'solo_male']);

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
  tier: string | null;
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

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(): Promise<NextResponse> {
  const svc = createServiceRoleClient();
  const date = todayUtc();

  // 1. Ensure today's set exists (idempotent). Pass the date explicitly so the
  //    read below is guaranteed to line up with what we generated.
  const { error: ensureErr } = await svc.rpc('ensure_daily_blindtest', { p_date: date });
  if (ensureErr) {
    return NextResponse.json({ error: 'could not prepare daily blindtest' }, { status: 500 });
  }

  // 2. Read today's stored song order + per-song question types.
  const { data: daily, error: dailyErr } = await svc
    .from('daily_blindtests')
    .select('song_ids, question_types')
    .eq('date', date)
    .maybeSingle();
  if (dailyErr || !daily) {
    return NextResponse.json({ error: 'daily blindtest not found' }, { status: 500 });
  }
  const songIds = (daily.song_ids ?? []) as string[];
  const questionTypes = (daily.question_types ?? []) as Array<'artist' | 'title'>;

  // 3. Hydrate the 10 songs.
  const { data: songRows } = await svc
    .from('songs')
    .select('id, deezer_track_id, title, artist_name, album_name, album_cover_medium, album_cover_big, preview_url, gender, generation, tier, wrong_answers_artist, wrong_answers_title')
    .in('id', songIds);
  const byId = new Map<string, SongRow>();
  for (const s of (songRows ?? []) as SongRow[]) byId.set(s.id, s);
  // Preserve the stored order (deterministic for everyone).
  const selected = songIds.map((id) => byId.get(id)).filter((s): s is SongRow => Boolean(s));

  if (selected.length < SONGS_COUNT) {
    return NextResponse.json({ error: 'daily blindtest incomplete' }, { status: 500 });
  }

  // Fallback pool for wrong answers when a song lacks 3 stored decoys.
  const { data: poolRows } = await svc
    .from('songs')
    .select('id, title, artist_name, gender')
    .eq('status', 'active')
    .limit(1500);
  const pool = (poolRows ?? []) as SongRow[];

  // 4. Re-fetch fresh preview URLs + covers from Deezer (stored links expire).
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

  // 5. Build questions in the stored order, using the stored type per song.
  const questions: Question[] = selected.map((song, i) => {
    const type: 'artist' | 'title' = questionTypes[i] === 'title' ? 'title' : 'artist';
    if (type === 'artist') {
      const wrongs = song.wrong_answers_artist?.length >= 3 ? song.wrong_answers_artist : fallbackWrongArtists(song, pool);
      return {
        song_id: song.id,
        question_type: 'artist',
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

  return NextResponse.json(
    { date, questions, timer_duration: 10, songs_count: SONGS_COUNT },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
  );
}
