import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import {
  STATIC_MODES,
  isGroupModeId,
  getGroupSlugFromModeId,
  buildGroupMode,
} from '@/lib/blind-test-modes';

import type { BlindTestMode } from '@/lib/blind-test-modes';

function resolveStaticMode(modeId: string): BlindTestMode | undefined {
  return STATIC_MODES.find(m => m.id === modeId);
}

export async function POST(req: Request) {
  const { mode_id } = await req.json() as { mode_id: string };
  const supabase = await createServerClient();

  // Resolve mode
  let mode: BlindTestMode | undefined;

  if (isGroupModeId(mode_id)) {
    const slug = getGroupSlugFromModeId(mode_id);
    if (!slug) return NextResponse.json({ error: 'Invalid group mode' }, { status: 400 });

    const { data: group } = await supabase
      .from('groups')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const { count } = await supabase
      .from('blind_test_songs')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id)
      .eq('status', 'active')
      .not('clip_chorus', 'is', null);

    mode = buildGroupMode({ name: group.name, slug: group.slug, song_count: count ?? 0 });
  } else {
    mode = resolveStaticMode(mode_id);
  }

  if (!mode) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const clipColumn = `clip_${mode.clip_point}`;

  // Build query -- select all clip columns so we can dynamically pick
  let query = supabase
    .from('blind_test_songs')
    .select('id, title, artist, youtube_id, wrong_answers, clip_intro, clip_chorus, clip_verse, clip_bridge, group_id, generation, gender')
    .eq('status', 'active')
    .not(clipColumn, 'is', null);

  // Apply filters
  if (mode.filter.group_slug) {
    const { data: grp } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', mode.filter.group_slug)
      .single();
    if (grp) query = query.eq('group_id', grp.id);
  }
  if (mode.filter.gender) {
    if (mode.id === 'solo-artists') {
      query = query.in('gender', ['solo_female', 'solo_male']);
    } else {
      query = query.eq('gender', mode.filter.gender);
    }
  }
  if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
  if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
  if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);
  if (mode.filter.is_title_track !== undefined) query = query.eq('is_title_track', mode.filter.is_title_track);

  const { data: allSongs } = await query;

  if (!allSongs || allSongs.length < mode.song_count) {
    return NextResponse.json(
      { error: 'Not enough songs', available: allSongs?.length ?? 0 },
      { status: 400 },
    );
  }

  // Randomly select songs
  const selected = [...allSongs].sort(() => Math.random() - 0.5).slice(0, mode.song_count);

  // Build round with question types
  const songs = await Promise.all(selected.map(async (song) => {
    const isArtistQuestion = Math.random() < 0.3;
    const songRecord = song as Record<string, unknown>;

    let choices: string[];
    let correctIndex: number;
    let questionType: 'title' | 'artist';

    if (isArtistQuestion) {
      questionType = 'artist';
      const wrongArtists = await getConvincingWrongArtists(
        { artist: song.artist, generation: song.generation, gender: song.gender },
        supabase,
      );
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
      clip_start: songRecord[clipColumn] as number,
      group_id: song.group_id,
      question_type: questionType,
      choices,
      _answer: {
        correct_index: correctIndex,
        title: song.title,
        artist: song.artist,
      },
    };
  }));

  return NextResponse.json({
    mode_id: mode.id,
    mode_title: mode.title,
    clip_duration: mode.clip_duration,
    songs,
  });
}

async function getConvincingWrongArtists(
  song: { artist: string; generation: string | null; gender: string },
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<string[]> {
  const { data } = await supabase
    .from('blind_test_songs')
    .select('artist')
    .eq('status', 'active')
    .eq('generation', song.generation ?? '')
    .eq('gender', song.gender)
    .neq('artist', song.artist)
    .not('clip_chorus', 'is', null);

  const uniqueArtists = [...new Set((data ?? []).map(s => s.artist))];
  const shuffled = uniqueArtists.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  // Fallback if not enough from same gen+gender
  if (selected.length < 3) {
    const { data: fallback } = await supabase
      .from('blind_test_songs')
      .select('artist')
      .eq('status', 'active')
      .neq('artist', song.artist)
      .limit(20);

    const fallbackArtists = [...new Set((fallback ?? []).map(s => s.artist))];
    for (const a of fallbackArtists) {
      if (!selected.includes(a) && a !== song.artist) {
        selected.push(a);
        if (selected.length >= 3) break;
      }
    }
  }

  return selected;
}
