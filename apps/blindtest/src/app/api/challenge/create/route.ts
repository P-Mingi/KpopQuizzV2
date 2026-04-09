import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { generateShortCode } from '@/lib/short-code';

export const dynamic = 'force-dynamic';

interface CreateBody {
  playlist: string;
  mode: string;
  difficulty?: string;
  /** Full questions array from the just-finished game (same shape as /api/game/generate). */
  questions: unknown[];
  creatorName?: string;
  creatorScore: number;
  creatorCorrect: number;
  creatorTotal: number;
  creatorTime?: number;
  creatorBestCombo?: number;
}

export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json({ error: 'Missing questions' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Resolve creator bt_players id (best-effort; anonymous creators are allowed).
  let creatorPlayerId: string | null = null;
  let resolvedName = body.creatorName?.trim() || 'Anonymous';

  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user) {
      const { data: btPlayer } = await admin
        .from('bt_players')
        .select('id, display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (btPlayer) {
        creatorPlayerId = btPlayer.id as string;
        // Prefer the bt_players display_name over an anonymous fallback.
        if (!body.creatorName && btPlayer.display_name) {
          const clean = (btPlayer.display_name as string).replace(/#\d+$/, '');
          resolvedName = clean || resolvedName;
        }
      }
    }
  } catch {
    // Ignore; allow anonymous creation.
  }

  // Insert with retry on rare short_code collisions (up to 3 tries).
  let lastError: { message: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const shortCode = generateShortCode(8);
    const { data, error } = await admin
      .from('challenges')
      .insert({
        short_code: shortCode,
        playlist: body.playlist,
        mode: body.mode,
        difficulty: body.difficulty ?? 'all',
        questions: body.questions,
        creator_player_id: creatorPlayerId,
        creator_name: resolvedName,
        creator_score: body.creatorScore,
        creator_correct: body.creatorCorrect,
        creator_total: body.creatorTotal ?? 10,
        creator_time: body.creatorTime ?? null,
        creator_best_combo: body.creatorBestCombo ?? 0,
      })
      .select('short_code')
      .single();

    if (!error && data) {
      return NextResponse.json({
        shortCode: data.short_code as string,
        challengeUrl: `/challenge/${data.short_code}`,
      });
    }
    lastError = error;
    // 23505 is Postgres unique_violation; only retry on that.
    if (error && error.code !== '23505') break;
  }

  return NextResponse.json(
    { error: lastError?.message ?? 'Failed to create challenge' },
    { status: 500 },
  );
}
