// Run O1, lot H2a: the data of the Crossover block (quizzes marked crossover, three shown, changed every week, and one fact that links
// the two worlds). The body returns the design's sample; lot H2b reads the marked list and keeps the shape (HomeCrossover).

import type { HomeCrossover } from './home-types';

export async function loadHomeCrossover(): Promise<HomeCrossover> {
  return {
    fact: 'IVE sang Will, the opening theme of Pokémon Horizons, released on April 12, 2024.',
    cards: [
      { site: 'kpop', title: 'KPop Demon Hunters Quiz', sub: 'The animated film and its songs', path: '/kpop-demon-hunters-quiz' },
      { site: 'anime', title: 'One Opening, Many Endings: Chainsaw Man Theme Songs', sub: 'Medium · for music fans', path: '/q/one-opening-many-endings-chainsaw-man-theme-songs' },
      { site: 'kpop', title: 'K-pop Songs About Magic', sub: 'Easy · spells, wishes and fairy tales', path: '/q/kpop-songs-about-magic' },
    ],
  };
}
