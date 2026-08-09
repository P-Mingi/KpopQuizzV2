import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * SEO-5 A - nightly plays-counter reconcile.
 *
 * Migration 150 (applied by Cowork) created the trigger + reconcile_quiz_counters()
 * that re-syncs quizzes' cached counters from the plays table. This thin wrapper
 * just calls it on a schedule. Idempotent + a no-op safety net: Cowork verified
 * the counters are already in full sync, so reconcile_quiz_counters returns 0 today.
 *
 * Auth guard copied EXACTLY from duel-reconcile (same scheme: the Vercel Cron
 * header OR a manual Bearer CRON_SECRET). No new auth scheme.
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
  const { data, error } = await supabase.rpc('reconcile_quiz_counters');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const fixed = typeof data === 'number' ? data : Number(data ?? 0);
  console.log(`[plays-counter-reconcile] fixed ${fixed} quiz counter(s)`);
  return NextResponse.json({ fixed });
}
