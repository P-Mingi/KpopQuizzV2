// Audit 04 P1-1 (owner 2026-11-09): the <title> and meta description of a group hub, /{group}-quiz, as pure functions so one
// test pins them for every group. Pattern:
//   title        "{Group} Quiz: {atLeast(n)} Free Tests{ for Fandom}, Easy to Hard" through fitTitle (49 characters or fewer)
//   description  140 to 155 characters, the same primary phrase, no typed number
// The count is the live quiz count through the shared atLeast helper (rulebook 4.1 and 4.2), the fandom only when it is a real
// name (a placeholder is dropped), "Easy to Hard" and "from easy to hard" only when the group has two levels or more, and no year
// (rulebook 2.6: a year needs a dated review). Member counts are never typed here: a "Name all N members" promise lives on the
// Name-them-all game, which reads its own roster. The group is written as the groups table writes it (rulebook 2.5).

import { atLeast } from '@/lib/stats/site-stats';
import { clipWords } from './quiz-meta';
import { fitTitle } from './title-fit';

export const HUB_DESCRIPTION_MIN = 140;
export const HUB_DESCRIPTION_MAX = 155;

const PLACEHOLDER_FANDOMS = new Set(['', 'fan', 'fans', 'fandom', 'tbd', 'n/a', 'none', 'unknown', '-']);

/** The fandom name when it is a real one (not empty, not a placeholder, not the group's own name), else null. */
export function realFandom(fandomName: string | null | undefined, groupName: string): string | null {
  const f = (fandomName ?? '').replace(/\s+/g, ' ').trim();
  if (PLACEHOLDER_FANDOMS.has(f.toLowerCase()) || f.toLowerCase() === groupName.trim().toLowerCase() || f.length > 24) return null;
  return f;
}

export interface GroupMetaInput {
  name: string;
  fandomName: string | null | undefined;
  /** Published quizzes of the group. */
  quizCount: number;
  /** Distinct difficulty levels among the group's quizzes (1 when unknown: fail closed). */
  levels: number;
}

/** The page part of a hub title (the layout adds " | KpopQuiz"). */
export function groupHubTitle(g: GroupMetaInput): string {
  const name = g.name.trim();
  if (g.quizCount < 2) return `${name} Quiz: Free Fan-Made Trivia Test`;
  const count = `${atLeast(g.quizCount)} Free Tests`;
  const fandom = realFandom(g.fandomName, name);
  const wordings: string[] = [];
  if (fandom && g.levels >= 2) wordings.push(`${name} Quiz: ${count} for ${fandom}, Easy to Hard`);
  if (g.levels >= 2) wordings.push(`${name} Quiz: ${count}, Easy to Hard`);
  if (fandom) wordings.push(`${name} Quiz: ${count} for ${fandom}`);
  wordings.push(`${name} Quiz: ${count}`);
  return fitTitle(...(wordings as [string, ...string[]]));
}

/** The longest wording within 155 characters (a combination of sentences, richest first on a tie); if none fits, the plainest cut on a word. */
export function fitDescription(...wordings: [string, ...string[]]): string {
  let best: string | null = null;
  for (const w of wordings) if (w.length <= HUB_DESCRIPTION_MAX && (best === null || w.length > best.length)) best = w;
  return best ?? clipWords(wordings[wordings.length - 1]!, HUB_DESCRIPTION_MAX);
}

const join = (lead: string, middles: string[], closers: string[]): string[] => middles.flatMap((m) => closers.map((c) => `${lead}${m}${c}`));

/** The meta description of a hub. */
export function groupHubDescription(g: GroupMetaInput): string {
  const name = g.name.trim();
  const fandom = realFandom(g.fandomName, name);
  const closers = [' No sign-up.', ' Free, no sign-up, and quick to play.', ' Free to play, no sign-up needed.', ' Free to play, no account needed, and each quiz takes a minute or two.'];
  const prove = fandom ? `, then prove you are a real ${fandom}` : '';
  if (g.quizCount < 2) {
    return fitDescription(...(join(`Play the free ${name} quiz made by fans.`, [
      ` Test your knowledge of ${name}'s members, songs, eras and history${prove}.`,
      ` Test your knowledge of ${name}'s members, songs, eras and history.`,
      ` Test your knowledge of ${name}'s members and songs.`,
    ], closers) as [string, ...string[]]));
  }
  const n = atLeast(g.quizCount);
  const range = g.levels >= 2 ? ', from easy to hard' : '';
  return fitDescription(...(join(`Play ${n} free ${name} quizzes made by fans${range}.`, [
    ` Test your knowledge of ${name}'s members, songs, eras and history${prove}.`,
    ` Test your knowledge of ${name}'s members, songs and eras${prove}.`,
    ` Test your knowledge of ${name}'s members, songs, eras and history.`,
    ` Test your knowledge of ${name}'s members and songs.`,
    ` Test how well you know ${name}, from members to songs and eras.`,
    ` Test how well you know ${name}, from members and songs to eras and more.`,
    ` Test how well you know ${name}: members, songs, eras.`,
    ` Test how well you know ${name} and its songs.`,
    ` Test your knowledge of ${name}.`,
  ], closers) as [string, ...string[]]));
}
