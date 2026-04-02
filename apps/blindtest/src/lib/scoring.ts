/**
 * Scoring system for the K-pop Blind Test game.
 *
 * Base: 1000 max per song, decreases linearly with time.
 * Combo multiplier: 3-streak=1.5x, 5=2x, 8=3x, 10=5x
 * Perfect round bonus: +2000
 */

export function calculatePoints(timeElapsed: number, timerDuration: number, correct: boolean): number {
  if (!correct) return 0;
  const raw = 1000 * (1 - (timeElapsed / timerDuration) * 0.935);
  return Math.max(50, Math.round(raw));
}

export function getComboMultiplier(combo: number): number {
  if (combo >= 10) return 5;
  if (combo >= 8) return 3;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1.5;
  return 1;
}

export function calculateFinalPoints(timeElapsed: number, timerDuration: number, correct: boolean, combo: number): number {
  const base = calculatePoints(timeElapsed, timerDuration, correct);
  const multiplier = getComboMultiplier(combo);
  return Math.round(base * multiplier);
}

export function getSpeedLabel(time: number): { label: string; cssVar: string } {
  if (time < 2) return { label: 'Lightning', cssVar: 'var(--speed-lightning)' };
  if (time < 4) return { label: 'Fast', cssVar: 'var(--speed-fast)' };
  if (time < 6) return { label: 'Nice', cssVar: 'var(--speed-normal)' };
  if (time < 8) return { label: 'Slow', cssVar: 'var(--speed-slow)' };
  return { label: 'Close call', cssVar: 'var(--speed-slow)' };
}

export function getScoreLabel(correct: number, total: number): { label: string; stars: number } {
  if (correct === total) return { label: 'PERFECT!', stars: 5 };
  if (correct >= 9) return { label: 'Amazing!', stars: 4 };
  if (correct >= 7) return { label: 'Great round!', stars: 3 };
  if (correct >= 5) return { label: 'Not bad!', stars: 2 };
  return { label: 'Keep trying!', stars: 1 };
}

export function calculateXP(answers: { correct: boolean; time: number }[]): number {
  const correctAnswers = answers.filter((a) => a.correct);
  let xp = 0;
  xp += correctAnswers.length * 10;
  xp += correctAnswers.filter((a) => a.time < 2).length * 5;
  if (correctAnswers.length === answers.length && answers.length >= 5) xp += 50;
  return xp;
}
