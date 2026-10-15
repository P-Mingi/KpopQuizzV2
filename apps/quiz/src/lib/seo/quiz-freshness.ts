// SEO (owner, 2026-10-13): what happens when a quiz is published, edited or removed, so
// every new quiz is ready to be indexed the moment it exists, with no deploy and no
// manual step.
//
// 1. The cached lists expire now: the 'quizzes' data (/new, the group hub, related
//    quizzes, the home rails) and, when a quiz appears or goes, 'groups' (the hub's
//    published count). They used to wait up to 6 hours (CACHE_TTL.catalog).
// 2. The pages that list it re-render on their next request: the quiz page itself,
//    its group hub (old and new group on an edit that moves it), /new, the home page
//    and /sitemap.xml.
// 3. IndexNow (Bing, Yandex, Seznam; Bing is the first search referrer) is told about
//    those URLs inside after(): the ping runs once the response is sent and the
//    function stays alive until it ends. A bare `void ping()` could be frozen with the
//    function before its request left.
//    SEO Mission 3 (2026-10-15): the same step writes the IndexNow outbox and marks the
//    URLs submitted when IndexNow accepts them (lib/seo/indexnow-outbox.ts), so the
//    hourly flush does not send them again. Before the outbox SQL is applied it pings
//    exactly as before.
//
// Never throws: a failed revalidation or ping must not fail a publish.

import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { submitFastPath } from '@/lib/seo/indexnow-outbox';

export type QuizChange = 'published' | 'edited' | 'removed';

/** The pages that show this quiz: its own page, its group hubs, /new. */
export function quizChangePaths(slug: string, groupSlugs: ReadonlyArray<string | null | undefined>): string[] {
  const hubs = [...new Set(groupSlugs.filter((g): g is string => !!g))].map((g) => `/${g}-quiz`);
  return [`/q/${slug}`, ...hubs, '/new'];
}

export function onQuizChanged(change: QuizChange, slug: string, groupSlugs: ReadonlyArray<string | null | undefined>): void {
  const paths = quizChangePaths(slug, groupSlugs);
  try {
    revalidateTag('quizzes', { expire: 0 });
    if (change !== 'edited') revalidateTag('groups', { expire: 0 });
    for (const p of [...paths, '/', '/sitemap.xml']) revalidatePath(p);
  } catch (err) {
    console.error('[quiz-freshness] revalidate failed:', err);
  }
  try {
    after(async () => {
      await submitFastPath(paths, `quiz:${change}`);
    });
  } catch (err) {
    console.error('[quiz-freshness] IndexNow not scheduled:', err);
  }
}
