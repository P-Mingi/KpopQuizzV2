// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/daily/route.ts, rows 10: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { notFound, redirect } from 'next/navigation';

import { getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { safeFetch } from '@/lib/error-handling';
import { SITE, SITE_ID } from '@/lib/site/registry';

// Stable entry to today's daily quiz (Workstream M, M1.3). The streak nudge and
// any "play the daily" link point here instead of a per-day slug, so callers stay
// slug-agnostic. Redirects to the QotD play route (the Workstream D daily ritual);
// falls back to the quiz catalog if there is no QotD. A route handler is dynamic
// by nature, which is fine: it is not a page and does not affect home staticness.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  // A route handler has no layout: the guard of the (anime) group (layout.tsx) does not cover it, so the handler
  // itself answers 404 on any build but anime (the hub has no daily quiz).
  if (SITE_ID !== 'anime') notFound();
  // The quiz of the day of this site (one per site, published by the cron through ensure_daily_quiz_v2 for 'anime');
  // the play, the result and the streak are the ones of /q/{slug}?daily=quiz, shared with kpop.
  const qotd = await safeFetch(getQuizOfTheDay(SITE.id), null, '[daily] getQuizOfTheDay');
  redirect(qotd ? `/q/${qotd.slug}?daily=quiz` : '/quizzes');
}
