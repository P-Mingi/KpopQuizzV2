// Daily games (step 1): the text a player shares. No coloured squares (v2 section 1): the number of right columns of each
// guess, "2/8 · 1/8 · 3/8 · 8/8". Pure, no I/O; it never names the answer.
import { board1, board2, stepCopy } from './steps';

import type { DleGameDef } from './games';
import type { StepView } from './steps';
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

/** "Kpopdle by Bunnyverse #12 · Idol of the day · found in 4 guesses", the line of counts, then the address. The names stay, with "by Bunnyverse" always (owner, 2026-11-23). */
export function shareText(game: DleGameDef, gameNo: number, guesses: readonly DleGuess[], won: boolean, url: string, locale: DleLocale): string {
  const w = WORDS[locale];
  const outcome = won ? w.found(guesses.length) : w.gaveUp;
  return [`${game.brand} by Bunnyverse #${gameNo} · ${game.guess[locale]} · ${outcome}`, shareLine(guesses), url].join('\n');
}

/**
 * The share text of Otakudle in two steps (L42): the title line says both counts, "found in 5 guesses (anime in 2, character in 4)", then one line of counts per board:
 * "Anime 0/4 · 2/4" and "Character 3/5 · 5/5". Never the answer. A play without the step fields is shareText.
 */
export function shareTextSteps(game: DleGameDef, gameNo: number, guesses: readonly DleGuess[], won: boolean, url: string, locale: DleLocale, v: StepView): string {
  if (!v.two) return shareText(game, gameNo, guesses, won, url, locale);
  const w = WORDS[locale];
  const c = stepCopy(locale);
  const outcome = won && v.found ? c.shareOutcome(guesses.length, v.anime, v.character) : won ? w.found(guesses.length) : w.gaveUp;
  const rows = (list: readonly DleGuess[], pick: (g: DleGuess) => readonly { status: string }[]): string =>
    list.map((g) => { const cells = pick(g); return `${cells.filter((x) => x.status === 'correct').length}/${cells.length}`; }).join(' · ');
  const lines = [`${game.brand} by Bunnyverse #${gameNo} · ${game.guess[locale]} · ${outcome}`, `${c.shareLine1} ${rows(board1(guesses, v), (g) => g.result)}`];
  if (v.found) lines.push(`${c.shareLine2} ${rows(board2(guesses), (g) => g.step2 ?? [])}`);
  lines.push(url);
  return lines.join('\n');
}
