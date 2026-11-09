import { redirect } from 'next/navigation';

import { parseFrom } from '@/lib/analytics';

import { getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { safeFetch } from '@/lib/error-handling';

// /daily/play (audit 01 P2-9: /daily is the daily hub when DAILY_HUB=1, so the redirect lives here). Stable entry to today's daily quiz (Workstream M, M1.3). The streak nudge and
// any "play the daily" link point here instead of a per-day slug, so callers stay
// slug-agnostic. Redirects to the QotD play route (the Workstream D daily ritual);
// falls back to the quiz catalog if there is no QotD. A route handler is dynamic
// by nature, which is fine: it is not a page and does not affect home staticness.
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const qotd = await safeFetch(getQuizOfTheDay(), null, '[daily] getQuizOfTheDay');
  // Audit 01: the `from` of the link (nav, share, hub...) goes on to the quiz; anything outside the enum is dropped (direct).
  const from = parseFrom(new URL(req.url).search);
  redirect(qotd ? `/q/${qotd.slug}?daily=quiz${from === 'direct' ? '' : `&from=${from}`}` : '/quizzes');
}
