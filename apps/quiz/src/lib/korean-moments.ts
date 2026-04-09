/**
 * Korean micro-moments used at emotional peaks in the quiz flow.
 *
 * Each constant is a short Hangul phrase with its romanized meaning in the
 * comment - used as a lightweight identity layer without translating the
 * whole UI. See PROMPT 4 for where each one appears.
 */

export const KOREAN = {
  /** hwaiting - 3+ correct in a row */
  combo3: '화이팅!',
  /** daebak - 5+ correct in a row */
  combo5: '대박!',
  /** aigo - wrong answer */
  wrong: '아이고~',
  /** all-kill - perfect 10/10 */
  perfect: '올킬!',
  /** akkapda - 9/10 */
  nearPerfect: '아깝다!',
  /** daebak - 7-8/10 */
  great: '대박!',
  /** gwaenchana - 5-6/10 */
  okay: '괜찮아~',
  /** dasi - under 5/10 */
  tryAgain: '다시!',
  /** chukahae - level up */
  levelUp: '축하해!',
  /** andwae - streak at risk */
  streakRisk: '안돼!',
  /** "one more? hwaiting!" - play again button */
  playAgain: 'One more? 화이팅!',
} as const;

/**
 * Bilingual label shown on the result screen header. Returns a Hangul
 * phrase and an English descriptor that are displayed side by side.
 *
 * Tiers:
 * - 100% -> PERFECT! (올킬!)
 * - 90%+ -> SO CLOSE! (아깝다!)  [9/10 or equivalent]
 * - 70%+ -> Great round! (대박!)
 * - 50%+ -> Not bad! (괜찮아~)
 * - < 50% -> Keep trying! (다시!)
 */
export function getResultLabel(
  score: number,
  maxScore: number,
): { kr: string; en: string; sub: string } {
  if (maxScore <= 0) return { kr: KOREAN.okay, en: 'Not bad!', sub: 'Keep going' };
  const pct = score / maxScore;
  if (pct >= 1) return { kr: KOREAN.perfect, en: 'PERFECT!', sub: 'All-kill' };
  if (pct >= 0.9) return { kr: KOREAN.nearPerfect, en: 'SO CLOSE!', sub: 'Almost there' };
  if (pct >= 0.7) return { kr: KOREAN.great, en: 'Great round!', sub: 'You know your stuff' };
  if (pct >= 0.5) return { kr: KOREAN.okay, en: 'Not bad!', sub: 'Keep going' };
  return { kr: KOREAN.tryAgain, en: 'Keep trying!', sub: 'Try again' };
}
