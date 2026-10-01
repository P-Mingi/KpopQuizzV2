import { NextResponse } from 'next/server';

import { rankedServiceClient, SupabaseRankedStore } from '@/lib/ranked/db';
import { notLive } from '@/lib/ranked/http';
import { RankedNotLiveError, runNightly } from '@/lib/ranked/service';
import { UX_V1 } from '@/lib/ux-v1';

import type { NextRequest } from 'next/server';

// GET /api/ranked/cron/nightly - the ranked nightly job, NOT SCHEDULED. It closes
// expired open runs as quit runs (recorded with the songs answered), then calls
// public.ranked_nightly() (season roll-over + Legend = top 100 Masters).
// To enable after the owner applies docs/pending-migrations/v11-p7-ranked.sql, add
// to apps/quiz/vercel.json crons: { "path": "/api/ranked/cron/nightly", "schedule": "20 0 * * *" }.
// Same auth as the other crons: Vercel's cron header or Bearer CRON_SECRET.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const isManualAuth = !!(cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`);
  if (!isVercelCron && !isManualAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const store = new SupabaseRankedStore(rankedServiceClient());
    await store.seasons(); // read-only probe: not_live before any write
    const result = await runNightly(store, new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof RankedNotLiveError) return notLive(e.reason);
    console.error('[ranked nightly]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'ranked_error' }, { status: 500 });
  }
}
