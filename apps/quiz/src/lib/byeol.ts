import { createServerClient } from '@/lib/supabase/server';

export const BYEOL_REWARDS = {
  quiz_complete: (score: number, total: number) => {
    const pct = total > 0 ? score / total : 0;
    if (pct === 1) return 50;
    if (pct >= 0.7) return 40;
    return 30;
  },
  daily_quiz: 50,
  daily_quiz_perfect: 80,
  blindtest_play: 30,
  blindtest_win: 50,
  tier_list: 30,
  name_all_perfect: 50,
  name_all_partial: 20,
  this_or_that: 20,
  daily_login: 20,
  streak_7day: 100,
  quiz_creation: 30,
  quiz_creation_first: 80,
  quiz_plays_50: 50,
  quiz_plays_200: 150,
  level_up: 100,
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
