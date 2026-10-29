// Daily games (step 1): the text a player shares. No coloured squares (v2 section 1): the number of right columns of each
// guess, "2/8 · 1/8 · 3/8 · 8/8". Pure, no I/O; it never names the answer.
import type { DleGameDef } from './games';
import type { DleGuess, DleLocale } from './types';

/** The right columns of each guess, in order. */
export function correctCounts(guesses: readonly DleGuess[]): number[] {
  return guesses.map((g) => g.result.filter((c) => c.status === 'correct').length);
}

export function shareLine(guesses: readonly DleGuess[]): string {
  const counts = correctCounts(guesses);
  return guesses.map((g, i) => `${counts[i]}/${g.result.length}`).join(' · ');
}

const WORDS: Readonly<Record<DleLocale, { found: (n: number) => string; gaveUp: string }>> = {
  en: { found: (n) => `found in ${n} ${n === 1 ? 'guess' : 'guesses'}`, gaveUp: 'gave up' },
  fr: { found: (n) => `trouvé en ${n} ${n === 1 ? 'essai' : 'essais'}`, gaveUp: 'abandon' },
};

/** "Kpopdle #12 · Idol of the day · found in 4 guesses", the line of counts, then the address. */
export function shareText(game: DleGameDef, gameNo: number, guesses: readonly DleGuess[], won: boolean, url: string, locale: DleLocale): string {
  const w = WORDS[locale];
  const outcome = won ? w.found(guesses.length) : w.gaveUp;
  return [`${game.brand} #${gameNo} · ${game.guess[locale]} · ${outcome}`, shareLine(guesses), url].join('\n');
}
