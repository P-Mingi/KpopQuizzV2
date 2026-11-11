import { isCronAuthorized } from '@/lib/cron-auth';
import { NextResponse } from 'next/server';

import { GET as ensureAnimeDailyQuiz } from '../ensure-anime-daily-quiz/route';

import type { NextRequest } from 'next/server';

/**
 * STOPGAP, same lifetime as ../ensure-anime-daily-quiz (delete both once otakuquiz's own crons are seen running).
 * The 23:50 UTC run: vercel.json keeps one path per cron (vercel-config.test.ts), so this path checks the cron secret itself and
 * runs the same handler, which ensures today and, after noon UTC, tomorrow. The 00:23 run stays on the main path as the safety net.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return ensureAnimeDailyQuiz(req);
}
