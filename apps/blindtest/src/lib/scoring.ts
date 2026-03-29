/**
 * Calculate points for a single correct answer.
 * Formula: base (50) + time_bonus (0-100 scaled by clip duration)
 */
export function calculatePoints(answerTime: number, clipDuration: number, correct: boolean): number {
  if (!correct) return 0;
  const base = 50;
  const timeBonus = Math.max(0, (clipDuration - answerTime) * (100 / clipDuration));
  return Math.round(base + timeBonus);
}

/**
 * Combo multiplier for consecutive correct answers.
 */
export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 1.5;
  if (combo >= 6) return 1.25;
  if (combo >= 5) return 1.2;
  if (combo >= 4) return 1.15;
  if (combo >= 3) return 1.1;
  if (combo >= 2) return 1.05;
  return 1.0;
}

export function calculateFinalPoints(answerTime: number, clipDuration: number, correct: boolean, combo: number): number {
  const basePoints = calculatePoints(answerTime, clipDuration, correct);
  const multiplier = getComboMultiplier(combo);
  return Math.round(basePoints * multiplier);
}

/**
 * Speed label for visual feedback (does NOT affect scoring).
 */
export function getSpeedLabel(answerTime: number): { label: string; cssVar: string } {
  if (answerTime < 2) return { label: 'Lightning', cssVar: 'var(--speed-lightning)' };
  if (answerTime < 4) return { label: 'Fast', cssVar: 'var(--speed-fast)' };
  if (answerTime < 6) return { label: 'Nice', cssVar: 'var(--speed-normal)' };
  if (answerTime < 8) return { label: 'Slow', cssVar: 'var(--speed-slow)' };
  return { label: 'Close call', cssVar: 'var(--speed-slow)' };
}

/**
 * Score label for results screen.
 */
export function getScoreLabel(correct: number, total: number): string {
  const pct = total > 0 ? correct / total : 0;
  if (pct === 1) return 'Perfect score';
  if (pct >= 0.8) return 'Impressive';
  if (pct >= 0.5) return 'Not bad';
  if (pct >= 0.3) return 'Room to improve';
  return 'Better luck next time';
}

/**
 * XP earned from a game.
 */
export function calculateXP(answers: { correct: boolean; time: number; skipped?: boolean }[]): number {
  const validAnswers = answers.filter(a => !a.skipped);
  const correctAnswers = validAnswers.filter(a => a.correct);
  let xp = 0;
  xp += correctAnswers.length * 10;
  xp += correctAnswers.filter(a => a.time < 2).length * 5;
  if (correctAnswers.length === validAnswers.length && validAnswers.length >= 5) xp += 50;
  return xp;
}
