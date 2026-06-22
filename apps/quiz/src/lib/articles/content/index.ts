import type { ComponentType } from 'react';

const CONTENT_MAP: Record<string, () => Promise<{ ArticleBody: ComponentType }>> = {
  'best-kpop-quiz-sites-2026': () => import('./best-kpop-quiz-sites-2026'),
  'kpop-generations-explained': () => import('./kpop-generations-explained'),
  'bts-vs-blackpink-quiz': () => import('./bts-vs-blackpink-quiz'),
  'kpop-blind-test-guide': () => import('./kpop-blind-test-guide'),
  'hardest-kpop-quizzes': () => import('./hardest-kpop-quizzes'),
};

export async function loadArticleContent(
  slug: string,
): Promise<ComponentType | null> {
  const loader = CONTENT_MAP[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.ArticleBody;
}
