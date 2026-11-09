import { isCronAuthorized } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';

import { GET as ensureDailyQuiz } from '../ensure-daily-quiz/route';

import type { NextRequest } from 'next/server';

/**
 * Audit 01 P0-4: the 23:50 UTC run of ensure-daily-quiz, which publishes tomorrow's quiz before the day changes (the handler picks
 * today or tomorrow from the clock: before noon UTC today, after noon tomorrow). vercel.json keeps one path per cron
 * (vercel-config.test.ts), so this path checks the cron secret itself (Bearer CRON_SECRET, r1-source-guards.test.ts) and then
 * runs the same handler. The 00:05 run stays on /api/cron/ensure-daily-quiz as the idempotent safety net and the slot of the
 * nightly dle maintenance.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return ensureDailyQuiz(req);
}
