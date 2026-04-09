import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

export const dynamic = 'force-dynamic';

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

/**
 * Returns the frozen questions for a challenge, same shape as /api/game/generate
 * so GamePlayer's `presetUrl` path can consume it directly. Refreshes the
 * Deezer preview URLs in parallel because they expire after a few hours.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = createServiceRoleClient();

  const { data: challenge, error } = await supabase
    .from('challenges')
    .select('id, short_code, playlist, mode, difficulty, questions, expires_at')
    .eq('short_code', code)
    .maybeSingle();

  if (error || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  if (new Date(challenge.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'Challenge expired' }, { status: 410 });
  }

  if (!Array.isArray(challenge.questions) || challenge.questions.length === 0) {
    return NextResponse.json({ error: 'Challenge has no questions' }, { status: 500 });
  }

  const questions = challenge.questions as Question[];

  // Refresh preview URLs from Deezer (same rationale as /api/game/generate).
  await Promise.all(
    questions.map(async (q) => {
      try {
        const { data: song } = await supabase
          .from('songs')
          .select('deezer_track_id')
          .eq('id', q.song_id)
          .maybeSingle();
        if (!song?.deezer_track_id) return;
        const res = await fetch(`https://api.deezer.com/track/${song.deezer_track_id}`);
        const data = await res.json();
        if (data?.preview && typeof data.preview === 'string' && data.preview.length > 10) {
          q.preview_url = data.preview;
        }
        if (data?.album?.cover_medium) {
          q.album_cover_medium = data.album.cover_medium as string;
        }
        if (data?.album?.cover_big) {
          q.album_cover_big = data.album.cover_big as string;
          q.reveal.cover = data.album.cover_big as string;
        }
      } catch {
        // Keep stored URL as fallback.
      }
    }),
  );

  const allArtists = [...new Set(questions.map((q) => q.reveal.artist))];
  const allTitles = [...new Set(questions.map((q) => q.reveal.title))];

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      short_code: challenge.short_code,
      playlist: challenge.playlist,
      mode: challenge.mode,
      difficulty: challenge.difficulty,
    },
    questions,
    timer_duration: challenge.mode === 'challenge' ? 10 : 15,
    playlist: challenge.playlist,
    mode: challenge.mode,
    difficulty: challenge.difficulty,
    all_artists: allArtists,
    all_titles: allTitles,
  });
}
