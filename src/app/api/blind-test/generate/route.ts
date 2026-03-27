import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getModeById, isGroupModeId, getGroupSlugFromModeId, buildGroupMode } from '@/lib/blind-test-modes';

import type { NextRequest } from 'next/server';
import type { BlindTestMode } from '@/lib/blind-test-modes';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { mode_id?: string };
  try {
    body = await request.json() as { mode_id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const modeId = body.mode_id ?? '';
  const supabase = await createServerClient();

  let mode: BlindTestMode | undefined;

  // Resolve mode: static or dynamic group
  if (isGroupModeId(modeId)) {
    const groupSlug = getGroupSlugFromModeId(modeId);
    if (!groupSlug) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

    const { data: group } = await supabase
      .from('groups').select('name, slug').eq('slug', groupSlug).single();
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 400 });

    // Count songs for this group
    const { data: gid } = await supabase.from('groups').select('id').eq('slug', groupSlug).single();
    const { count } = await supabase
      .from('blind_test_songs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('clip_chorus', 'is', null)
      .eq('group_id', gid?.id);

    mode = buildGroupMode({ name: group.name, slug: group.slug, song_count: count ?? 0 });
  } else {
    mode = getModeById(modeId);
  }

  if (!mode) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const clipColumn = `clip_${mode.clip_point}`;

  // Build query
  let query = supabase
    .from('blind_test_songs')
    .select('id, title, artist, youtube_id, wrong_answers, clip_intro, clip_chorus, clip_verse, clip_bridge, group_id')
    .eq('status', 'active')
    .not(clipColumn, 'is', null);

  // Apply filters
  if (mode.filter.group_slug) {
    const { data: group } = await supabase
      .from('groups').select('id').eq('slug', mode.filter.group_slug).single();
    if (group) query = query.eq('group_id', group.id);
    else return NextResponse.json({ error: 'Group not found' }, { status: 400 });
  }

  // Solo artists special case
  if (modeId === 'solo-artists') {
    query = query.in('gender', ['solo_female', 'solo_male']);
  } else if (mode.filter.gender) {
    query = query.eq('gender', mode.filter.gender);
  }

  if (mode.filter.generation) query = query.eq('generation', mode.filter.generation);
  if (mode.filter.year_min) query = query.gte('year', mode.filter.year_min);
  if (mode.filter.year_max) query = query.lte('year', mode.filter.year_max);
  if (mode.filter.is_title_track !== undefined) query = query.eq('is_title_track', mode.filter.is_title_track);

  const { data: allSongs, error } = await query;
  if (error || !allSongs) {
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }

  if (allSongs.length < mode.song_count) {
    return NextResponse.json({
      error: 'Not enough songs',
      available: allSongs.length,
      required: mode.song_count,
    }, { status: 400 });
  }

  // Randomly pick songs
  const shuffled = [...allSongs].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, mode.song_count);

  const round = selected.map(song => {
    const s = song as Record<string, unknown>;
    const correctTitle = s.title as string;
    const wrongAnswers = ((s.wrong_answers as string[]) || []).slice(0, 3);
    while (wrongAnswers.length < 3) wrongAnswers.push('Unknown Song');

    const allChoices = [correctTitle, ...wrongAnswers];
    const shuffledChoices = [...allChoices].sort(() => Math.random() - 0.5);
    const correctIndex = shuffledChoices.indexOf(correctTitle);

    return {
      song_id: s.id as string,
      youtube_id: s.youtube_id as string,
      clip_start: s[clipColumn] as number,
      clip_duration: mode!.clip_duration,
      choices: shuffledChoices,
      _answer: { correct_index: correctIndex, title: s.title as string, artist: s.artist as string },
    };
  });

  return NextResponse.json({
    mode_id: mode.id,
    mode_title: mode.title,
    mode_difficulty: mode.difficulty,
    clip_duration: mode.clip_duration,
    songs: round,
  });
}
