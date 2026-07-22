import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { awardDailyStreak } from '@/lib/daily-streak';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';

import type { NextRequest } from 'next/server';

// L4 - POST /api/daily/complete { kind: 'quiz' | 'game' | 'blindtest' }
// Called by the client right after marking the daily as played (F6). For signed-in
// users only: increments the server-side streak and awards +5 + milestone XP. Anon
// callers get awarded:0. Idempotent: 2nd daily same UTC day is a no-op, so playing
// QOTD and BToTD on the same day awards XP once (the first), the second is a no-op.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { kind?: unknown };
  try { body = (await req.json()) as typeof body; } catch { body = {}; }
  const kind = body.kind === 'quiz' || body.kind === 'game' || body.kind === 'blindtest' ? body.kind : null;
  if (!kind) return NextResponse.json({ error: "kind ('quiz'|'game'|'blindtest') required" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signed_in: false, awarded: 0 });

  // Service role for the profile update + RPC; the auth check above already
  // resolved the user from their session cookies.
  const svc = createServiceRoleClient();
  const result = await awardDailyStreak(svc, user.id);

  // L2 level-up signal so the client can fire the overlay if a milestone crossed a level boundary.
  let leveledUp = false;
  let newLevel: number | null = null;
  let newLevelName: string | null = null;
  if (result.awarded > 0) {
    const { data: prof } = await svc.from('profiles').select('xp').eq('id', user.id).maybeSingle();
    const nowXp = (prof?.xp as number | null) ?? 0;
    const oldLevel = getLevelInfo(Math.max(0, nowXp - result.awarded)).level;
    const info = getLevelInfo(nowXp);
    if (info.level > oldLevel) { leveledUp = true; newLevel = info.level; newLevelName = getTitleForLevel(info.level).en; }
  }

  return NextResponse.json({
    signed_in: true,
    kind,
    awarded: result.awarded,
    base: result.base,
    milestone: result.milestone,
    streak: result.streak,
    already_today: result.alreadyToday,
    leveled_up: leveledUp,
    new_level: newLevel,
    new_level_name: newLevelName,
  });
}
