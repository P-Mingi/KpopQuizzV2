import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// N2.2 - POST /api/daily/blindtest/submit { score, time_ms }
// Records the signed-in user's score for today's Blindtest of the Day and
// returns their leaderboard rank. One play per user per day (enforced by the
// unique constraint + ON CONFLICT DO NOTHING in submit_daily_bt_score).
//
// Must run on the USER's session client, not service role: the RPC reads
// auth.uid() to attribute the row, so a service-role call would resolve to NULL
// and return not_authenticated. The daily streak is awarded separately by the
// client via completeDaily('blindtest') (N6) - kept out of here so the two
// concerns stay independent and the streak stays idempotent.
export const dynamic = 'force-dynamic';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { score?: unknown; time_ms?: unknown };
  try { body = (await req.json()) as typeof body; } catch { body = {}; }

  const score = typeof body.score === 'number' ? Math.round(body.score) : NaN;
  const timeMs = typeof body.time_ms === 'number' ? Math.round(body.time_ms) : NaN;
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: 'score must be 0..10' }, { status: 400 });
  }
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    return NextResponse.json({ error: 'time_ms must be >= 0' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Anon plays are valid but unranked (same philosophy as the free blindtest).
    return NextResponse.json({ signed_in: false }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('submit_daily_bt_score', {
    p_date: todayUtc(),
    p_score: score,
    p_time_ms: timeMs,
  });
  if (error) {
    return NextResponse.json({ error: 'could not submit score' }, { status: 500 });
  }
  const result = (data ?? {}) as Record<string, unknown>;
  if (result.error) {
    return NextResponse.json({ signed_in: false }, { status: 401 });
  }

  return NextResponse.json({ signed_in: true, ...result });
}
