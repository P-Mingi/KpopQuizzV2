import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { awardByeol, BYEOL_REWARDS } from '@/lib/byeol';

/**
 * POST /api/auth/daily-login
 * Called on app load to track daily login streaks and award Byeol.
 * Returns the current streak and whether rewards were awarded.
 */
export async function POST(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get current byeol record
  const { data: byeolData } = await supabase
    .from('dev_user_byeol')
    .select('login_streak, last_login_date')
    .eq('user_id', user.id)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lastLogin = byeolData?.last_login_date as string | null;

  // Already logged in today
  if (lastLogin === today) {
    return NextResponse.json({
      streak: byeolData?.login_streak ?? 0,
      already_claimed: true,
      rewards: [],
    });
  }

  // Calculate new streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const oldStreak = (byeolData?.login_streak as number) ?? 0;
  const newStreak = lastLogin === yesterdayStr ? oldStreak + 1 : 1;

  // Update streak and last login
  await supabase
    .from('dev_user_byeol')
    .upsert({
      user_id: user.id,
      login_streak: newStreak,
      last_login_date: today,
    }, { onConflict: 'user_id' });

  const rewards: Array<{ source: string; amount: number }> = [];

  // Award daily login
  await awardByeol(user.id, BYEOL_REWARDS.daily_login, 'daily_login');
  rewards.push({ source: 'daily_login', amount: BYEOL_REWARDS.daily_login });

  // Check streak milestones
  const streakRewards: Array<[number, number]> = [
    [3, BYEOL_REWARDS.streak_3_day],
    [7, BYEOL_REWARDS.streak_7_day],
    [14, BYEOL_REWARDS.streak_14_day],
    [30, BYEOL_REWARDS.streak_30_day],
  ];

  for (const [threshold, amount] of streakRewards) {
    if (newStreak === threshold) {
      await awardByeol(user.id, amount, `streak_${threshold}_day`);
      rewards.push({ source: `streak_${threshold}_day`, amount });
    }
  }

  return NextResponse.json({
    streak: newStreak,
    already_claimed: false,
    rewards,
  });
}
