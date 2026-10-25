// Run O1, lot H2a: the data of the two doors of the hero (a card per site: tagline, pills, one quiz, the way in). The body returns
// the design's sample; lot H2b replaces the counts with the real number of published quizzes per site and the quiz with the Top now
// (KpopQuiz) or Just added (OtakuQuiz) one, and keeps the shape (HomeDoor). The names come from the registry.

import { REGISTRY } from '@/lib/site/registry';

import type { HomeDoor } from './home-types';

/** The two doors, in the network's order. */
export async function loadHomeDoors(): Promise<readonly HomeDoor[]> {
  return [
    {
      site: 'kpop',
      name: REGISTRY.kpop.brand.name,
      tagline: 'Groups, eras, members, songs',
      chips: ['482 quizzes', 'Daily blindtest', 'Which member are you'],
      phoneLine: '482 quizzes',
      spotlight: { label: 'Top now', title: 'Ultimate BTS era quiz - only real ARMYs survive', path: '/q/ultimate-bts-era-quiz' },
    },
    {
      site: 'anime',
      name: REGISTRY.anime.brand.name,
      tagline: 'Series, arcs, characters, openings',
      chips: ['138 quizzes', '31 series', 'New site'],
      phoneLine: '138 quizzes · 31 series',
      spotlight: { label: 'Just added', title: 'Name and Face: Death Note True or False', path: '/q/name-and-face-death-note-true-or-false' },
    },
  ];
}
