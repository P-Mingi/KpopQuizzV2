import { NextResponse } from 'next/server';

import { cronForSite, isCronAuthorized } from '@/lib/cron-auth';
import { quizLaneLive, supabaseQuizStore } from '@/lib/editorial/quiz/store';
import { AWARD_SHOWS } from '@/lib/events/calendar';
import { awardPrepOn } from '@/lib/events/flag';
import { runAwardPrep } from '@/lib/events/award-prep';
import { awardResultsFor } from '@/lib/events/results';

import type { NextRequest } from 'next/server';

// GET /api/cron/award-prep (audit 04 section 4, P1-6, owner 2026-11-09). Daily. Prepares the award-show quiz drafts: from T-10 to T-3 of a
// confirmed show it files ONE 10 question draft built from verified facts (lib/events/award-prep.ts) as a review batch of the admin quiz
// lane, with a publish_by at the show start. It publishes nothing: the owner reads every award draft and approves it, then the normal
// editorial cron publishes it under the Team badge. The account is a placeholder until the owner names it (lib/events/config.ts).
//
// Auth: Bearer CRON_SECRET through isCronAuthorized, like every cron of this app; service role.
//
// Schedule: NOT in apps/quiz/vercel.json yet (ORCH owns that file: docs/o1/reports/L1/titles/vercel-award-prep.patch). The job acts on the
// kpop build only (cronForSite).
//
// Does nothing, in this order:
//   wrong or missing secret        401
//   a build that is not kpop       200 { skipped: true }, nothing read or written
//   AWARD_PREP flag off (default)  200 { ok: true, skipped: 'flag_off' }, nothing read or written
//   quiz lane SQL not applied      200 { ok: true, skipped: 'quiz_not_live' }, no write
//   ?dry=1                         the plan and the drafts it would file, no write
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const skipped = cronForSite(['kpop']);
  if (skipped) return skipped;
  if (!awardPrepOn()) return NextResponse.json({ ok: true, skipped: 'flag_off' });
  try {
    if (!(await quizLaneLive())) return NextResponse.json({ ok: true, skipped: 'quiz_not_live' });
    const dry = new URL(req.url).searchParams.get('dry') === '1';
    const report = await runAwardPrep({ now: Date.now(), dry, store: supabaseQuizStore(), shows: AWARD_SHOWS, results: awardResultsFor });
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error('[cron/award-prep] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'award_prep_failed' }, { status: 500 });
  }
}
