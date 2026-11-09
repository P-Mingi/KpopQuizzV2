// O1 audit 03 P2-3: two pieces of the Quiz JSON-LD of /q/[slug], pure so they are tested (quiz-jsonld.test.ts).

import { quizLastModified } from '@/lib/db/queries/quiz-explanations';
import { CATCH_ALL_SLUG } from '@/lib/ux-v1/p3/model';

/** dateModified: the very value the sitemap gives this quiz as lastmod (creation, or the newest verified explanation when later). */
export function quizDateModified(createdAt: string, explainedAt: number | undefined): string {
  return quizLastModified(createdAt, explainedAt).toISOString();
}

/**
 * `about` of a quiz: the MusicGroup of its hub, except for the General K-pop category, which is not a music group (no `about` then).
 * Spread it into the JSON-LD object.
 */
export function quizAbout(groupSlug: string, groupName: string): { about?: { '@type': 'MusicGroup'; name: string; url: string } } {
  if (groupSlug === CATCH_ALL_SLUG) return {};
  return { about: { '@type': 'MusicGroup', name: groupName, url: `https://kpopquiz.org/${groupSlug}-quiz` } };
}
