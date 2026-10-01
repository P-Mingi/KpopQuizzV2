import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// GET /api/cron/ensure-daily-debate - publishes today's fan debate (R1, F9).
//
// ensure_daily_debate() (migrations 108 / 110) is idempotent: it returns today's
// date when a debate already exists, else marks the least recently used question
// and inserts today's row. Until now its only caller was the legacy community
// block of /leaderboard (a write on view). The v11 /leaderboard and /community
// only READ the debate, so with the redesign on nothing would create the day's
// row and the debate would stop rotating. This cron is the one daily writer;
// the legacy view keeps calling the same idempotent function, so both can run.
//
// Scheduled at 00:10 UTC in vercel.json. Auth: Bearer CRON_SECRET.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await createServiceRoleClient().rpc('ensure_daily_debate');
  if (error) {
    console.error('[cron/ensure-daily-debate] failed:', error.message);
    return NextResponse.json({ error: 'ensure_daily_debate failed' }, { status: 500 });
  }
  // null = the question bank is empty: nothing to publish, not a failure.
  return NextResponse.json({ ok: true, date: (data as string | null) ?? null });
}
