// P5 (CR-025), links 2 and 13 (Plan.dc.html): the end of a quiz.
//   kpopquiz.org: a row "Kpopdle · bunnyverse.org" in "Keep playing", under "Next quiz" (Passerelle-kpopquiz.dc.html board 3). Its own server flag, NET_KPOPDLE_QUIZEND, and the hub's dailyGuess.
//   OtakuQuiz: "Daily challenge: the mystery character", to /otakudle (Passerelles.dc.html, "Result of an anime quiz"). Behind the hub's dailyGuess alone.
// The quiz page (renderUxQuizPage) asks once, with no read. Off, it answers null and the run's props are exactly today's: the key is not even there.
import { dleGame } from '@/lib/dle/games';
import { editorialHref } from '@/lib/network/links';
import { flagOn, SITE_ID } from '@/lib/site/registry';

import { hubGameOpen } from './open';

/** What the results screen needs: which row to draw and where it goes (an absolute address on the hub, followed, no query). */
export interface QuizEndBridge {
  readonly kind: 'kpopdle' | 'otakudle';
  readonly href: string;
}

/** The kpopquiz.org switch alone (flags-env.md). Server flag: no other build ever draws the row. */
export function kpopdleQuizEndFlagOn(): boolean {
  return SITE_ID === 'kpop' && flagOn(process.env.NET_KPOPDLE_QUIZEND);
}

export function quizEndBridge(): QuizEndBridge | null {
  if (SITE_ID === 'kpop') {
    if (!kpopdleQuizEndFlagOn() || !hubGameOpen('kpopdle-idol')) return null;
    return { kind: 'kpopdle', href: editorialHref('hub', dleGame('kpopdle-idol').path) };
  }
  if (SITE_ID === 'anime') {
    if (!hubGameOpen('otakudle')) return null;
    return { kind: 'otakudle', href: editorialHref('hub', dleGame('otakudle').path) };
  }
  return null;
}
