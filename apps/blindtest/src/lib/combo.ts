export const MAX_COMBO = 5;

export function getComboMultiplier(streak: number): number {
  if (streak >= 5) return 5;
  if (streak >= 4) return 4;
  if (streak >= 3) return 3;
  if (streak >= 2) return 2;
  return 1;
}

export function getComboTier(streak: number): 'none' | 'warm' | 'hot' | 'fire' | 'legendary' {
  if (streak >= 5) return 'legendary';
  if (streak >= 4) return 'fire';
  if (streak >= 3) return 'hot';
  if (streak >= 2) return 'warm';
  return 'none';
}

export function calculateRoundPoints(
  basePoints: number,
  answerTimeMs: number,
  maxTimeMs: number,
  comboStreak: number,
  usedPowerup: string | null,
): number {
  // Speed bonus: faster answers = more points (100 base, up to 200 for instant)
  const speedRatio = 1 - answerTimeMs / maxTimeMs;
  const speedBonus = Math.round(basePoints * speedRatio);
  let total = basePoints + speedBonus;

  // Combo multiplier
  total = Math.round(total * getComboMultiplier(comboStreak));

  // Power-up penalty
  if (usedPowerup === 'extra_time' || usedPowerup === 'fifty_fifty') {
    total = Math.round(total * 0.5);
  } else if (usedPowerup === 'skip') {
    total = 0;
  }

  return total;
}
