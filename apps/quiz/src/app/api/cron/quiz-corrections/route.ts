import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';
import { runQuizCorrections } from '@/lib/quiz-corrections/run';
import { supabaseCorrectionStore } from '@/lib/quiz-corrections/store';

import type { NextRequest } from 'next/server';

// GET /api/cron/quiz-corrections: corrections to player quizzes (owner, 2026-10-27). The
// creator's questions are never edited. A fact-checked wrong answer becomes a request in
// public.quiz_correction_requests (docs/pending-migrations/quiz-corrections-schema.sql, lots
// such as quiz-corrections-e1.sql); this job tells the creator (a quiz_correction notification
// with the question, the sourced correction and a link to the quiz editor), waits 14 days, then
// moves the quiz to draft if the question is unchanged. Rules: lib/quiz-corrections/rules.ts,
// run: lib/quiz-corrections/run.ts (both unit-tested), store: lib/quiz-corrections/store.ts.
// At most 50 requests a run; every write is conditional, so a replay changes nothing.
//
// Auth: Bearer CRON_SECRET through isCronAuthorized, like every cron of this app; service role.
//
// Schedule: NOT registered yet (apps/quiz/vercel.json is being changed by o1/integration). After
// that merge, add this line to the "crons" array of apps/quiz/vercel.json (daily, 09:30 UTC):
//   { "path": "/api/cron/quiz-corrections", "schedule": "30 9 * * *" }
//
// Does nothing, in this order:
//   wrong or missing secret        401
//   notifications turned off       200 { ok: true, skipped: 'notifications_off' }, no write
//   SQL not applied (no table)     200 { ok: true, live: false }, one log line, no write
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // The creator must be able to read the notice before any 14-day clock starts.
  if (!COMMUNITY_FEATURES_ENABLED) return NextResponse.json({ ok: true, skipped: 'notifications_off' });
  try {
    const report = await runQuizCorrections(supabaseCorrectionStore(), { now: Date.now() });
    if (!report.live) {
      console.log('[cron/quiz-corrections] public.quiz_correction_requests does not exist yet (SQL not applied): nothing to do');
      return NextResponse.json({ ok: true, live: false });
    }
    const { live, read, notified, resolved, drafted, cancelled, waiting, skipped, errors, outcomes } = report;
    return NextResponse.json({ ok: true, live, read, notified, resolved, drafted, cancelled, waiting, skipped, errors, outcomes });
  } catch (err) {
    console.error('[cron/quiz-corrections] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'corrections_failed' }, { status: 500 });
  }
}
