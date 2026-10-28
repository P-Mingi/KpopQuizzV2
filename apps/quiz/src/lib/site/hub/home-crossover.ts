// Run O1, lot H2c: the data of the Crossover block (three picks of the editorial list, changed every week, and one sourced fact that
// links the two worlds), from getCrossover. Null when nothing can be shown (the block disappears).

import { getCrossover } from './data';
import { pathOf } from './home-map';
import { safeBlock } from './home-safe';

import type { HomeCrossover } from './home-types';

async function readCrossover(): Promise<HomeCrossover | null> {
  const crossover = await getCrossover();
  if (!crossover || crossover.quizzes.length === 0) return null;
  return {
    fact: crossover.fact ? crossover.fact.text : null,
    cards: crossover.quizzes.map((q) => ({ site: q.site, title: q.title, sub: [q.meta, q.line].filter(Boolean).join(' · '), path: pathOf(q.href, q.site) })),
  };
}

export async function loadHomeCrossover(): Promise<HomeCrossover | null> {
  return safeBlock('crossover', readCrossover, null);
}
