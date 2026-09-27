import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import { qotdRotationFixEnabled } from '@/lib/quiz-bank-scheduling';
import { rotateQotd, supabaseQotdStore } from '@/lib/ux-v1/p1/qotd-rotation';

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
 *
 * UX v11 P1, rotation fix: ensure_daily_quiz only publishes a bank row dated
 * exactly today, and no row has matched since 2026-06-30 (root cause in
 * lib/quiz-bank-scheduling.ts), so the rotation silently stopped. With the server
 * env switch QOTD_ROTATION_FIX=1 an empty day is filled (next open bank row pulled
 * to today, else a catalog pick, logged in qotd_log) and a day that stays empty
 * answers 500 so the cron shows as failed. Switch OFF (the default): exactly
 * today's behaviour and response.
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

  if (qotdRotationFixEnabled()) {
    try {
      const result = await rotateQotd(supabaseQotdStore(supabase), today);
      console.log(`[ensure-daily-quiz] ${today}: ${result.method}${result.quizId ? ` ${result.quizId}` : ''}`);
      if (result.method === 'none') {
        return NextResponse.json({ ok: false, date: today, method: result.method, reason: result.reason }, { status: 500 });
      }
      return NextResponse.json({ ok: true, date: today, method: result.method, quiz_id: result.quizId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ensure-daily-quiz]', message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { error } = await supabase.rpc('ensure_daily_quiz', { p_date: today });
  if (error) {
    console.error('[ensure-daily-quiz]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[ensure-daily-quiz] ensured daily quiz for ${today}`);
  return NextResponse.json({ ok: true, date: today });
}
