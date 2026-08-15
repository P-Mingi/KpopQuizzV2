import { NextResponse } from 'next/server';

import { isUuid, setAnonCookie } from '@/lib/anon-claim';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';
import type { BlindTestContent } from '@/lib/db/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const playerId = user?.id ?? null;
  // W3b PART 3 A1: this browser's id, exactly as plays and battle_results take it.
  // Never derived from IP or any fingerprint. A play with no id still succeeds.
  const anonId = isUuid(body.anon_id) ? body.anon_id : null;

  // Fetch game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, game_type, content, play_count, creator_id, group_id')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Check duplicate play for logged-in users
  if (playerId) {
    const { data: existingPlay } = await supabase
      .from('game_plays')
      .select('id, choices')
      .eq('game_id', id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingPlay) {
      return NextResponse.json({
        content: game.content,
        play_count: game.play_count,
        already_played: true,
        previous_choices: existingPlay.choices,
      });
    }
  }

  if (game.game_type === 'blind_test') {
    return recordBlindTestPlay(supabase, game, playerId, body, anonId);
  }

  if (game.game_type === 'name_all_members') {
    return recordNameAllPlay(supabase, game, playerId, body, anonId);
  }

  return NextResponse.json({ error: 'Unsupported game type' }, { status: 400 });
}

async function recordBlindTestPlay(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  game: { id: string; content: unknown; play_count: number; creator_id: string },
  playerId: string | null,
  body: Record<string, unknown>,
  anonId: string | null,
): Promise<NextResponse> {
  const choices = body.choices as Record<string, { picked: number; time: number }>;
  if (!choices || typeof choices !== 'object') {
    return NextResponse.json({ error: 'Choices required' }, { status: 400 });
  }

  const content = game.content as BlindTestContent;
  const songs = [...content.songs];
  let score = 0;

  // Update song stats
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i]!;
    const choice = choices[song.id];
    if (!choice) continue;

    const newTimesPlayed = song.times_played + 1;
    const isCorrect = choice.picked === song.correct_index;

    if (isCorrect) score++;

    const oldAvg = song.avg_answer_time || 0;
    const newTime = choice.time || content.settings.clip_duration;
    const newAvg = song.times_played === 0
      ? newTime
      : (oldAvg * song.times_played + newTime) / newTimesPlayed;

    songs[i] = {
      ...song,
      times_played: newTimesPlayed,
      times_correct: song.times_correct + (isCorrect ? 1 : 0),
      avg_answer_time: Math.round(newAvg * 10) / 10,
    };
  }

  const updatedContent = { ...content, songs };

  // Update game atomically
  const { error: updateError } = await supabase
    .from('games')
    .update({
      content: updatedContent,
      play_count: game.play_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', game.id);

  if (updateError) {
    console.error('Failed to update game:', updateError);
    return NextResponse.json({ error: 'Failed to record play' }, { status: 500 });
  }

  // Record the play
  await supabase.from('game_plays').insert({
    game_id: game.id,
    player_id: playerId,
    // W3b: only guest rows carry it; a signed-in play already has an owner.
    anon_id: playerId ? null : anonId,
    choices,
  });

  // award_xp is server-only post-revoke. xpAmount is computed here from the
  // server-validated `score`, capped at 50 - client cannot specify amount.
  const admin = createServiceRoleClient();

  // Award XP to player
  if (playerId) {
    const xpAmount = Math.min(score * 5, 50);
    if (xpAmount > 0) {
      await admin.rpc('award_xp', {
        p_user_id: playerId,
        p_amount: xpAmount,
        p_reason: 'game_play',
      });
    }
  }

  // Award creator XP
  if (game.creator_id && game.creator_id !== playerId && game.play_count < 500) {
    await admin.rpc('award_xp', {
      p_user_id: game.creator_id,
      p_amount: 1,
      p_reason: 'play_received',
    });
  }

  const res = NextResponse.json({
    content: updatedContent,
    play_count: game.play_count + 1,
    score,
    already_played: false,
  });
  // W3b A1: proof of possession for a later claim (httpOnly, unforgeable by JS).
  if (anonId) setAnonCookie(res, anonId);
  return res;
}

async function recordNameAllPlay(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  game: { id: string; content: unknown; play_count: number; creator_id: string; group_id: number | null },
  playerId: string | null,
  body: Record<string, unknown>,
  anonId: string | null,
): Promise<NextResponse> {
  const choices = body.choices as {
    score: number;
    total: number;
    time_taken: number;
    mode: string;
    found_members: string[];
  };

  if (!choices || typeof choices.score !== 'number' || typeof choices.total !== 'number') {
    return NextResponse.json({ error: 'Invalid choices data' }, { status: 400 });
  }

  // Increment play count
  const { error: updateError } = await supabase
    .from('games')
    .update({
      play_count: game.play_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', game.id);

  if (updateError) {
    console.error('Failed to update game play count:', updateError);
    return NextResponse.json({ error: 'Failed to record play' }, { status: 500 });
  }

  // Record the play
  await supabase.from('game_plays').insert({
    game_id: game.id,
    player_id: playerId,
    // W3b: only guest rows carry it; a signed-in play already has an owner.
    anon_id: playerId ? null : anonId,
    choices,
  });

  // award_xp is server-only post-revoke. Server computes amount from validated score.
  const admin = createServiceRoleClient();

  // Aggregate-only name-recognition logging (migration 126). One row per member
  // per finished round recording only whether they were named. NO user linkage /
  // PII. Feeds the idol WHAT-FANS-KNOW "% name them right" cell (gated >= 30
  // rounds via verse_name_recognition). Fail-soft: never blocks the play.
  try {
    const roster = ((game.content as { members?: { name?: string }[] }).members ?? [])
      .map((m) => m?.name).filter((n): n is string => typeof n === 'string' && n.length > 0);
    if (game.group_id && roster.length > 0) {
      const foundSet = new Set(choices.found_members ?? []);
      const roundId = crypto.randomUUID();
      const rows = roster.map((name) => ({
        group_id: game.group_id, member_name: name, found: foundSet.has(name), round_id: roundId,
      }));
      await admin.from('name_all_member_results').insert(rows);
    }
  } catch (e) {
    console.error('name-recognition logging skipped:', e);
  }

  // Award XP: 15 per correct answer
  if (playerId) {
    const xpAmount = Math.min(choices.score * 15, 200);
    if (xpAmount > 0) {
      await admin.rpc('award_xp', {
        p_user_id: playerId,
        p_amount: xpAmount,
        p_reason: 'game_play',
      });
    }
  }

  // Award creator XP
  if (game.creator_id && game.creator_id !== playerId && game.play_count < 500) {
    await admin.rpc('award_xp', {
      p_user_id: game.creator_id,
      p_amount: 1,
      p_reason: 'play_received',
    });
  }

  const res = NextResponse.json({
    play_count: game.play_count + 1,
    score: choices.score,
    already_played: false,
  });
  if (anonId) setAnonCookie(res, anonId);
  return res;
}
