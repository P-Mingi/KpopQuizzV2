// Run O1, lot E1b: the switch of the quiz lane of the editorial pipeline (owner decisions of 2026-11-03).
//
// EDITORIAL_QUIZ (server flag, off by default, kpopquiz.org only): quizzes are drafted (editorial_drafts kind 'quiz'),
// approved by an admin on /admin/editorial, scheduled at random times and published by the cron editorial-publish under an
// active Team account. Off: nothing of the lane runs, reads or renders. The admin page, the admin routes and the cron answer as
// before, and the queries they send are the same but for a `kind <> 'quiz'` filter that is harmless where no quiz draft exists.
// On before SQL 012 is applied: the lane stays inert too (quizLaneLive, store.ts, probes the 012 columns and answers false).
//
// The flag is read at call time on the server (never inlined in a client bundle): the admin page passes the answer to the
// client component as a prop. Ignored on the anime and hub builds: their quiz lane is another story (formats.md 4).

import { SITE_ID, flagOn } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

/** The rule itself, for tests: the flag value and the site of the build. */
export function editorialQuizFrom(value: string | undefined, site: SiteId): boolean {
  return site === 'kpop' && flagOn(value);
}

/** True when the quiz lane is switched on for this build. */
export function editorialQuizOn(): boolean {
  return editorialQuizFrom(process.env.EDITORIAL_QUIZ, SITE_ID);
}
