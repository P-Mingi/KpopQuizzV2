import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';

export async function POST() {
  const supabase = await createServerClient();
  const serviceClient = createServiceRoleClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = getTodayKST();

  // Get today's challenge
  const { data: challenge } = await serviceClient
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single();

  if (!challenge) {
    return NextResponse.json({ error: 'No daily challenge yet' }, { status: 404 });
  }

  // Must be logged in
  if (!user) {
    return NextResponse.json({ error: 'Must be logged in for daily challenge' }, { status: 401 });
  }

  // Check if already played
  const { data: existing } = await serviceClient
    .from('daily_challenge_plays')
    .select('id')
    .eq('player_id', user.id)
    .eq('challenge_id', challenge.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already played today', played: true }, { status: 400 });
  }

  // Fetch songs in fixed order
  const songIds = challenge.song_ids as string[];
  const { data: songs } = await serviceClient
    .from('blind_test_songs')
    .select('id, title, artist, youtube_id, wrong_answers, clip_chorus, group_id, generation, gender, groups(name)')
    .in('id', songIds)
    .eq('status', 'active');

  // Maintain challenge order
  const ordered = songIds
    .map(id => (songs ?? []).find(s => s.id === id))
    .filter(Boolean);

  // Build round with question types (same logic as regular generate)
  const roundSongs = await Promise.all(ordered.map(async (song) => {
    if (!song) return null;
    const isArtistQuestion = Math.random() < 0.3;

    let choices: string[];
    let correctIndex: number;
    let questionType: 'title' | 'artist';

    if (isArtistQuestion) {
      questionType = 'artist';
      const wrongArtists = await getWrongArtists(song, serviceClient);
      const allChoices = [song.artist, ...wrongArtists];
      const shuffled = allChoices.sort(() => Math.random() - 0.5);
      choices = shuffled;
      correctIndex = shuffled.indexOf(song.artist);
    } else {
      questionType = 'title';
      const wrongTitles = ((song.wrong_answers ?? []) as string[]).slice(0, 3);
      while (wrongTitles.length < 3) wrongTitles.push('Unknown');
      const allChoices = [song.title, ...wrongTitles];
      const shuffled = allChoices.sort(() => Math.random() - 0.5);
      choices = shuffled;
      correctIndex = shuffled.indexOf(song.title);
    }

    return {
      song_id: song.id,
      youtube_id: song.youtube_id,
      clip_start: song.clip_chorus as number,
      group_id: song.group_id,
      group_name: ((song as Record<string, unknown>).groups as { name: string } | null)?.name ?? null,
      question_type: questionType,
      choices,
      _answer: { correct_index: correctIndex, title: song.title, artist: song.artist },
    };
  }));

  return NextResponse.json({
    challenge_id: challenge.id,
    mode_id: 'daily',
    mode_title: "Today's challenge",
    clip_duration: challenge.clip_duration,
    songs: roundSongs.filter(Boolean),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWrongArtists(song: any, supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from('blind_test_songs')
    .select('artist')
    .eq('status', 'active')
    .eq('generation', song.generation ?? '')
    .eq('gender', song.gender)
    .neq('artist', song.artist)
    .not('clip_chorus', 'is', null);

  const unique = [...new Set((data ?? []).map((s: { artist: string }) => s.artist))];
  const selected = unique.sort(() => Math.random() - 0.5).slice(0, 3) as string[];

  if (selected.length < 3) {
    const { data: fallback } = await supabase
      .from('blind_test_songs')
      .select('artist')
      .eq('status', 'active')
      .neq('artist', song.artist)
      .limit(20);
    for (const a of [...new Set((fallback ?? []).map((s: { artist: string }) => s.artist))]) {
      if (!selected.includes(a as string) && a !== song.artist) {
        selected.push(a as string);
        if (selected.length >= 3) break;
      }
    }
  }

  return selected;
}
