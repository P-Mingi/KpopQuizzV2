import type { ComponentType } from 'react';

const CONTENT_MAP: Record<string, () => Promise<{ ArticleBody: ComponentType }>> = {
  'best-kpop-quiz-sites-2026': () => import('./best-kpop-quiz-sites-2026'),
  'kpop-generations-explained': () => import('./kpop-generations-explained'),
  'bts-vs-blackpink-quiz': () => import('./bts-vs-blackpink-quiz'),
  'kpop-blind-test-guide': () => import('./kpop-blind-test-guide'),
  'hardest-kpop-quizzes': () => import('./hardest-kpop-quizzes'),
  'kpop-quiz-statistics': () => import('./kpop-quiz-statistics'),
  'most-played-kpop-quizzes': () => import('./most-played-kpop-quizzes'),
  'girl-groups-vs-boy-groups-kpop-quiz': () => import('./girl-groups-vs-boy-groups-kpop-quiz'),
  'hardest-kpop-groups-to-memorize': () => import('./hardest-kpop-groups-to-memorize'),
  'stray-kids-vs-ateez': () => import('./stray-kids-vs-ateez'),
  'aespa-vs-newjeans-quiz': () => import('./aespa-vs-newjeans-quiz'),
  'kpop-blind-test-by-group-ranked': () => import('./kpop-blind-test-by-group-ranked'),
  'guess-the-kpop-idol-guide': () => import('./guess-the-kpop-idol-guide'),
  'best-kpop-quizzes-for-beginners': () => import('./best-kpop-quizzes-for-beginners'),
  'kpop-eras-timeline': () => import('./kpop-eras-timeline'),
  'newjeans-fan-guide': () => import('./newjeans-fan-guide'),
  'bts-discography-guide': () => import('./bts-discography-guide'),
  'rookie-kpop-groups-2026': () => import('./rookie-kpop-groups-2026'),
  'kpop-facts-every-fan-should-know': () => import('./kpop-facts-every-fan-should-know'),
};

export async function loadArticleContent(
  slug: string,
): Promise<ComponentType | null> {
  const loader = CONTENT_MAP[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.ArticleBody;
}
