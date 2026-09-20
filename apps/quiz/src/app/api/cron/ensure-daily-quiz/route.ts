import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * FREE-VIABILITY - daily publish of the Quiz of the Day.
 *
 * This is the WRITE half of getQuizOfTheDay, moved OUT of the page render.
 * getQuizOfTheDay used to call the ensure_daily_quiz RPC (a service_role write)
 * on EVERY home render - 329 calls/24h, 38% of them failing under nano load - so
 * the home did a DB write on every request. That write is idempotent and only
 * needs to run once per day, so it belongs on a schedule. The home read is now
 * pure + cached; this cron does the one daily publish.
 *
 * Auth guard: same scheme as the other crons (Vercel Cron header OR Bearer
 * CRON_SECRET). ensure_daily_quiz is idempotent ("publish today's bank quiz if
 * not yet done"), so a retry or a manual hit is safe.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split('T')[0]!;
  const { error } = await supabase.rpc('ensure_daily_quiz', { p_date: today });
  if (error) {
    console.error('[ensure-daily-quiz]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[ensure-daily-quiz] ensured daily quiz for ${today}`);
  return NextResponse.json({ ok: true, date: today });
}
