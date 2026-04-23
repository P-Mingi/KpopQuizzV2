import { createServerClient } from '@/lib/supabase/server';

export const BYEOL_REWARDS = {
  // ---- PLAYING ----
  quiz_complete: (score: number, total: number) => {
    const pct = total > 0 ? score / total : 0;
    if (pct >= 1.0) return 50;     // perfect
    if (pct >= 0.8) return 40;     // great
    if (pct >= 0.6) return 30;     // good
    return 20;                      // participated
  },
  daily_quiz: (score: number, total: number) => {
    const pct = total > 0 ? score / total : 0;
    if (pct >= 1.0) return 80;     // perfect daily
    if (pct >= 0.8) return 65;
    if (pct >= 0.6) return 50;
    return 35;
  },
  blindtest_match: 30,
  blindtest_win: 50,
  name_all_perfect: 50,
  this_or_that: 20,
  tier_list_complete: 30,

  // ---- CREATING ----
  quiz_creation: 80,
  quiz_creation_10q: 100,          // 10+ questions
  quiz_creation_20q: 130,          // 20+ questions

  // ---- PASSIVE CREATOR INCOME ----
  creator_play_reward: 3,
  creator_play_cap_daily: 150,

  // ---- CREATOR MILESTONES (one-time) ----
  creator_milestone_50_plays: 50,
  creator_milestone_100_plays: 100,
  creator_milestone_500_plays: 250,
  creator_milestone_1000_plays: 500,

  // ---- SHARING ----
  share_reddit_verified: 60,
  share_twitter_verified: 40,
  share_link_clicks_10: 30,
  share_cooldown_hours: 24,

  // ---- STREAKS & LOGIN ----
  daily_login: 20,
  streak_3_day: 30,
  streak_7_day: 100,
  streak_14_day: 200,
  streak_30_day: 500,

  // ---- XP CONVERSION ----
  xp_to_byeol_rate: 10,
} as const;

export async function awardByeol(
  userId: string,
  amount: number,
  source: string,
  referenceId?: string,
): Promise<{ new_balance: number; awarded: number } | null> {
  if (amount <= 0) return null;
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc('dev_award_byeol', {
      p_user_id: userId,
      p_amount: amount,
      p_source: source,
      p_reference_id: referenceId ?? null,
    });
    if (error) {
      console.error('[byeol] award error:', error.message);
      return null;
    }
    return data as { new_balance: number; awarded: number };
  } catch (err) {
    console.error('[byeol] award exception:', err);
    return null;
  }
}

export async function checkXpConversion(
  userId: string,
  prevXp: number,
  newXp: number,
) {
  const prevCheckpoint = Math.floor(prevXp / 100);
  const newCheckpoint = Math.floor(newXp / 100);
  const thresholdsCrossed = newCheckpoint - prevCheckpoint;

  if (thresholdsCrossed > 0) {
    const bonusByeol = thresholdsCrossed * 10;
    await awardByeol(userId, bonusByeol, 'xp_conversion');

    try {
      const supabase = await createServerClient();
      await supabase
        .from('dev_user_byeol')
        .upsert({
          user_id: userId,
          xp_byeol_checkpoint: newCheckpoint * 100,
        }, { onConflict: 'user_id' });
    } catch { /* non-critical */ }
  }
}

export async function getByeolBalance(userId: string): Promise<number> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('dev_user_byeol')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.balance as number) ?? 0;
  } catch {
    return 0;
  }
}
