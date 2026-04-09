import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { calculateGameXP, getLevelFromXP, calculateStreak } from '@/lib/progression';

export const dynamic = 'force-dynamic';

interface AttemptBody {
  challengeCode: string;
  playerName?: string;
  score: number;
  correctCount: number;
  totalSongs: number;
  bestCombo: number;
  timeTaken: number;
  songResults?: Array<{
    song_id: string;
    correct: boolean;
    points: number;
    time: number;
    answered: string | null;
  }>;
}

export async function POST(req: Request) {
  let body: AttemptBody;
  try {
    body = (await req.json()) as AttemptBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.challengeCode) {
    return NextResponse.json({ error: 'Missing challengeCode' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Find the challenge by short code.
  const { data: challenge, error: findError } = await admin
    .from('challenges')
    .select(
      'id, short_code, playlist, mode, difficulty, creator_name, creator_score, creator_correct, creator_total, creator_time, creator_best_combo, expires_at',
    )
    .eq('short_code', body.challengeCode)
    .maybeSingle();

  if (findError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  // Check expiry.
  if (new Date(challenge.expires_at as string) < new Date()) {
    return NextResponse.json({ error: 'Challenge expired' }, { status: 410 });
  }

  // Resolve bt_players id if authed.
  let playerId: string | null = null;
  let resolvedName = body.playerName?.trim() || 'Anonymous';
  let btPlayerRow: Record<string, unknown> | null = null;

  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user) {
      const { data } = await admin
        .from('bt_players')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        playerId = data.id as string;
        btPlayerRow = data;
        if (!body.playerName && data.display_name) {
          resolvedName = (data.display_name as string).replace(/#\d+$/, '') || resolvedName;
        }
      }
    }
  } catch {
    // Anonymous is allowed.
  }

  // Save the attempt row.
  const { error: insertError } = await admin
    .from('challenge_attempts')
    .insert({
      challenge_id: challenge.id,
      player_id: playerId,
      player_name: resolvedName,
      score: body.score,
      correct_count: body.correctCount,
      total_songs: body.totalSongs,
      best_combo: body.bestCombo,
      time_taken: body.timeTaken,
      song_results: body.songResults ?? null,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Also update bt_players progression + insert a bt_game_result so the
  // attempt counts toward XP, streak, best combo, and recent games. This
  // mirrors /api/game/save-result so signed-in players get full credit even
  // when coming in via a friend's link.
  let progression: Record<string, unknown> = {};
  if (btPlayerRow) {
    try {
      const { newStreak, isFirstGameToday } = calculateStreak(
        btPlayerRow.last_played_date as string | null,
        btPlayerRow.current_streak as number,
      );
      const isPerfect = body.correctCount === body.totalSongs;
      const xpEarned = calculateGameXP({
        score: body.score,
        correctCount: body.correctCount,
        totalSongs: body.totalSongs,
        mode: (challenge.mode as string) ?? 'quick',
        isFirstGameToday,
        isPerfectRound: isPerfect,
        currentStreak: newStreak,
      });

      const newTotalXP = (btPlayerRow.total_xp as number) + xpEarned;
      const oldLevel = btPlayerRow.level as number;
      const { level: newLevel, title: newTitle } = getLevelFromXP(newTotalXP);
      const leveledUp = newLevel > oldLevel;
      const avgSpeed = body.totalSongs > 0 && body.correctCount > 0
        ? Math.round((body.timeTaken / body.correctCount) * 10) / 10
        : null;

      await admin.from('bt_game_results').insert({
        player_id: playerId,
        mode: (challenge.mode as string) ?? 'quick',
        playlist: (challenge.playlist as string) ?? 'all',
        difficulty: (challenge.difficulty as string) ?? 'all',
        score: body.score,
        correct_count: body.correctCount,
        total_songs: body.totalSongs,
        best_combo: body.bestCombo,
        avg_speed: avgSpeed,
        xp_earned: xpEarned,
        song_results: body.songResults ?? null,
      });

      const today = new Date().toISOString().split('T')[0]!;
      await admin
        .from('bt_players')
        .update({
          level: newLevel,
          total_xp: newTotalXP,
          total_games: (btPlayerRow.total_games as number) + 1,
          total_correct: (btPlayerRow.total_correct as number) + body.correctCount,
          total_songs_played: (btPlayerRow.total_songs_played as number) + body.totalSongs,
          best_score: Math.max(btPlayerRow.best_score as number, body.score),
          best_combo: Math.max(btPlayerRow.best_combo as number, body.bestCombo),
          current_streak: newStreak,
          longest_streak: Math.max(btPlayerRow.longest_streak as number, newStreak),
          last_played_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', playerId as string);

      progression = {
        xpEarned,
        totalXP: newTotalXP,
        level: newLevel,
        title: newTitle,
        leveledUp,
        oldLevel,
        streak: newStreak,
        isFirstGameToday,
        isPerfectRound: isPerfect,
        mastery: null,
      };
    } catch {
      // Non-blocking.
    }
  }

  // Top attempts on this challenge (for the comparison view).
  const { data: topAttempts } = await admin
    .from('challenge_attempts')
    .select('player_name, score, correct_count, time_taken')
    .eq('challenge_id', challenge.id)
    .order('score', { ascending: false })
    .limit(10);

  return NextResponse.json({
    saved: true,
    success: true,
    challenge: {
      short_code: challenge.short_code,
      playlist: challenge.playlist,
      mode: challenge.mode,
    },
    creator: {
      name: challenge.creator_name,
      score: challenge.creator_score,
      correct: challenge.creator_correct,
      total: challenge.creator_total ?? 10,
      time: challenge.creator_time,
      best_combo: challenge.creator_best_combo,
    },
    player: {
      name: resolvedName,
      score: body.score,
      correct: body.correctCount,
      total: body.totalSongs,
      time: body.timeTaken,
      best_combo: body.bestCombo,
    },
    topAttempts: topAttempts ?? [],
    ...progression,
  });
}
