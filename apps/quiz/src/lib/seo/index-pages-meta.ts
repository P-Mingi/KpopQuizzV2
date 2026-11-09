// Audit 04 P1-3 (owner, 2026-11-09): the title and description of the three index pages that competed for, or missed, their query:
// /quizzes ("browse kpop quizzes", no longer the home's twin), /blindtest ("K-pop blind test"; "guess the song" belongs to
// /guess-the-kpop-song) and /groups ("K-pop groups A to Z"). Pure and unit tested (index-pages-meta.test.ts). Every count is passed in
// already formatted by its single source (atLeast of the site stats, or the directory's own row count) and is the same in the title,
// the description, the body and the FAQ of its page (rulebook 4.1 and 4.2). Page part of a title: 49 characters or fewer.

import { fitDescription } from './group-meta';
import { fitTitle } from './title-fit';

export interface PageMeta { title: string; description: string }

/** /quizzes. `count` is atLeast(stats.quizzes) ("450+"), or null when the stats cannot be read (then no number at all). */
export function quizzesIndexMeta(count: string | null): PageMeta {
  const n = count ? `${count} ` : '';
  return {
    title: fitTitle(`Browse ${n}K-pop Quizzes by Group and Level`, 'Browse K-pop Quizzes by Group and Level'),
    description: fitDescription(
      `Find your next K-pop quiz: filter ${n}free fan-made quizzes by group, type and level, then sort by trending, newest or most played. No sign-up needed.`,
      `Find your next K-pop quiz: filter ${n}free fan-made quizzes by group, type and level, then sort by trending, newest or most played.`,
    ),
  };
}

/** /blindtest. `songs` and `groups` are atLeast of the stats (songs, songGroups), or null. */
export function blindtestMeta(counts: { songs: string; groups: string } | null): PageMeta {
  const clip = 'Play the free K-pop blind test: hear a 10-second clip and name the song or artist.';
  if (!counts) return { title: 'K-pop Blind Test: Hear a Clip, Name the Artist', description: `${clip} Songs from every K-pop generation. No sign-up.` };
  return {
    title: fitTitle(`K-pop Blind Test: ${counts.songs} Songs from ${counts.groups} Groups`, 'K-pop Blind Test: Hear a Clip, Name the Artist'),
    description: `${clip} ${counts.songs} songs across ${counts.groups} groups, from every generation. No sign-up.`,
  };
}

/** /groups. `n` is the number of groups with at least one quiz, the same count the page prints. */
export function groupsIndexMeta(n: number | null): PageMeta {
  if (n === null || n < 1) {
    return {
      title: 'K-pop Groups A to Z, by Generation',
      description: 'The K-pop groups with quizzes on KpopQuiz, listed A to Z, each with its generation where one is recorded. Jump to a group and start playing its quizzes.',
    };
  }
  return {
    title: fitTitle(`K-pop Groups A to Z: ${n} Groups with Quizzes`, 'K-pop Groups A to Z, by Generation'),
    description: fitDescription(
      `The K-pop groups with quizzes on KpopQuiz, ${n} in all, listed A to Z, each with its generation where one is recorded. Jump to a group and start playing.`,
      `The K-pop groups with quizzes on KpopQuiz, ${n} in all, listed A to Z, each with its generation where one is recorded.`,
    ),
  };
}
