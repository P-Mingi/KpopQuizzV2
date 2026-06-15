import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';

// L6 - battle XP daily cap. Only the first N battles per UTC day earn XP for a
// given signed-in user. Beyond the cap, the battle still runs and reports a
// result, but xp_earned = 0 (capped:true) so it cannot be farmed.
const BATTLE_XP_DAILY_CAP = 10;

import type { NextRequest } from 'next/server';

// E4 - battle XP (folds in L1's deferred award + L3's display). Signed-in only:
// win +25, loss +5. Anon players get no XP (no account). Returns the level-up
// signal so the client can fire the L2 overlay.
// NOTE (for L6 anti-farm): this awards per finished battle and is not yet
// rate-limited; battle XP farming is flagged for the L6 hardening pass.
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await params; // battle id (reserved for future server-side win validation)

  let body: { won?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const won = body.won === true;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ xp_earned: 0, signed_in: false, leveled_up: false });
  }

  const svc = createServiceRoleClient();

  // L6 daily cap: read + bump the per-user battle XP counter (resets per UTC day).
  const today = new Date().toISOString().slice(0, 10);
  const { data: prof } = await svc
    .from('profiles')
    .select('battle_xp_date, battle_xp_count')
    .eq('id', user.id)
    .maybeSingle();
  const sameDay = (prof?.battle_xp_date as string | null) === today;
  const usedToday = sameDay ? ((prof?.battle_xp_count as number | null) ?? 0) : 0;
  if (usedToday >= BATTLE_XP_DAILY_CAP) {
    return NextResponse.json({
      xp_earned: 0, signed_in: true, leveled_up: false, capped: true, cap: BATTLE_XP_DAILY_CAP,
    });
  }
  await svc
    .from('profiles')
    .update({ battle_xp_date: today, battle_xp_count: usedToday + 1 })
    .eq('id', user.id);

  const amount = won ? 25 : 5;
  // award_xp is server-only post-revoke. amount is server-derived from `won`
  // (which itself comes from the request body) - the route trusts the daily
  // cap above + the binary win/loss split to bound how much XP a user can
  // farm. user.id is from the verified session, never client input.
  const { data: newXpValue } = await svc.rpc('award_xp', {
    p_user_id: user.id,
    p_amount: amount,
    p_reason: won ? 'battle_win' : 'battle_loss',
  });

  let leveledUp = false;
  let newLevel: number | null = null;
  let newLevelName: string | null = null;
  if (typeof newXpValue === 'number') {
    const oldLevel = getLevelInfo(Math.max(0, newXpValue - amount)).level;
    const info = getLevelInfo(newXpValue);
    if (info.level > oldLevel) {
      leveledUp = true;
      newLevel = info.level;
      newLevelName = getTitleForLevel(info.level).en;
    }
  }

  return NextResponse.json({
    xp_earned: amount,
    signed_in: true,
    leveled_up: leveledUp,
    new_level: newLevel,
    new_level_name: newLevelName,
  });
}
