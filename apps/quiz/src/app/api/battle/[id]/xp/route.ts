import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';

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

  const amount = won ? 25 : 5;
  const { data: newXpValue } = await supabase.rpc('award_xp', {
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
