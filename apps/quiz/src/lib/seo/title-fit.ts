// SEO (owner, 2026-10-14): rulebook 2.2, a title is 60 characters or fewer with the
// " | KpopQuiz" (11 characters) the root layout appends, so the page's own part stays
// within TITLE_MAX. A title template lists its wordings from the richest to the plainest
// and the first that fits wins: a long group name gets a shorter wording, never a cut word.

import { TITLE_MAX } from './quiz-meta';

/** The first wording within TITLE_MAX, else the last (plainest) one. */
export function fitTitle(...wordings: [string, ...string[]]): string {
  return wordings.find((w) => w.length <= TITLE_MAX) ?? wordings[wordings.length - 1]!;
}
