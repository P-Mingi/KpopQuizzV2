import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';

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
 * Returns today's daily challenge questions + metadata so the play flow can
 * start without calling /api/game/generate. Refreshes the Deezer preview URLs
 * in parallel the same way /api/game/generate does.
 */
export async function GET() {
  const supabase = createServiceRoleClient();
  const today = getTodayKST();

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .select('id, date, day_number, questions, playlist, clip_duration')
    .eq('date', today)
    .maybeSingle();

  if (!challenge || !Array.isArray(challenge.questions) || challenge.questions.length === 0) {
    return NextResponse.json({ error: 'Daily challenge not available' }, { status: 404 });
  }

  const questions = challenge.questions as Question[];

  // Refresh preview URLs from Deezer (same rationale as /api/game/generate).
  await Promise.all(
    questions.map(async (q) => {
      try {
        // Resolve the track via its deezer_track_id stored alongside the song row.
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

  // Build the flat suggestion lists for challenge-mode auto-suggest.
  const allArtists = [...new Set(questions.map((q) => q.reveal.artist))];
  const allTitles = [...new Set(questions.map((q) => q.reveal.title))];

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      date: challenge.date,
      day_number: challenge.day_number,
      playlist: challenge.playlist ?? 'all',
    },
    questions,
    timer_duration: challenge.clip_duration ?? 15,
    all_artists: allArtists,
    all_titles: allTitles,
  });
}
