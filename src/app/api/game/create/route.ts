import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { generateSlug } from '@/lib/utils';
import { calculateDifficulty } from '@/lib/blind-test-utils';

import type { NextRequest } from 'next/server';
import type { BlindTestSong } from '@/lib/db/types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const gameType = body.game_type as string;

  if (gameType === 'blind_test') {
    // Admin-only for blind tests
    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return createBlindTest(supabase, user.id, body);
  }

  return NextResponse.json({ error: 'Unsupported game type' }, { status: 400 });
}

async function createBlindTest(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const title = (body.title as string | undefined)?.trim();
  const groupId = body.group_id as number | undefined;
  const songs = body.songs as BlindTestSong[] | undefined;
  const clipDuration = (body.clip_duration as number) || 10;
  const status = (body.status as string) || 'published';

  const errors: string[] = [];

  if (!title || title.length < 3 || title.length > 100) {
    errors.push('Title must be 3-100 characters');
  }
  if (!groupId) errors.push('Group is required');
  if (!Array.isArray(songs) || songs.length < 5 || songs.length > 15) {
    errors.push('5-15 songs required');
  }

  if (Array.isArray(songs)) {
    for (let i = 0; i < songs.length; i++) {
      const s = songs[i]!;
      if (!s.youtube_id || s.youtube_id.length !== 11) {
        errors.push(`Song ${i + 1}: invalid YouTube ID`);
      }
      if (!Array.isArray(s.choices) || s.choices.length !== 4 || s.choices.some(c => !c?.trim())) {
        errors.push(`Song ${i + 1}: needs 4 non-empty choices`);
      }
      if (typeof s.correct_index !== 'number' || s.correct_index < 0 || s.correct_index > 3) {
        errors.push(`Song ${i + 1}: invalid correct answer`);
      }
      if (!s.clip_mode) errors.push(`Song ${i + 1}: clip mode required`);
      if (typeof s.clip_start !== 'number' || s.clip_start < 0) {
        errors.push(`Song ${i + 1}: invalid start time`);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation error', details: errors }, { status: 400 });
  }

  const difficulty = calculateDifficulty(songs!);

  const content = {
    settings: {
      clip_duration: clipDuration,
      song_count: songs!.length,
      difficulty,
    },
    songs: songs!.map((s, i) => ({
      id: `s${i + 1}`,
      youtube_id: s.youtube_id,
      title: s.title?.trim() || '',
      artist: s.artist?.trim() || '',
      clip_start: s.clip_start,
      clip_mode: s.clip_mode,
      choices: s.choices,
      correct_index: s.correct_index,
      times_correct: 0,
      times_played: 0,
      avg_answer_time: 0,
    })),
  };

  // Generate unique slug
  let slug = generateSlug(title!);
  const { data: slugCheck } = await supabase
    .from('games')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (slugCheck) {
    let suffix = 2;
    while (true) {
      const candidate = `${slug}-${suffix}`;
      const { data: check } = await supabase
        .from('games')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();
      if (!check) { slug = candidate; break; }
      suffix++;
    }
  }

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      creator_id: userId,
      group_id: groupId,
      title: title!,
      slug,
      game_type: 'blind_test',
      content,
      matchup_count: songs!.length,
      status,
    })
    .select('id, slug')
    .single();

  if (error) {
    console.error('Failed to create blind test:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }

  return NextResponse.json({ id: game.id, slug: game.slug });
}
