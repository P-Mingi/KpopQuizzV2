import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { rankedServiceClient, SupabaseRankedStore } from '@/lib/ranked/db';
import { RankedNotLiveError, runNightly } from '@/lib/ranked/service';
import { UX_V1 } from '@/lib/ux-v1';

import type { NextRequest } from 'next/server';

// GET /api/ranked/cron/nightly - the ranked nightly job, scheduled at 00:20 UTC in
// vercel.json (R1, F10). It closes expired open runs as quit runs (recorded with
// the songs answered), then calls public.ranked_nightly() (season roll-over +
// Legend = top 100 Masters).
//
// It answers 200 and does nothing while ranked cannot run: the redesign flag is
// off (the ranked page does not exist), docs/pending-migrations/v11-p7-ranked.sql
// is not applied, or no season exists yet (the owner inserts season 1 the day the
// flag goes on: r1-ranked-season1.sql). ranked_nightly() never creates season 1.
// Auth: Bearer CRON_SECRET. With the flag off an unauthorized caller gets the 404
// every v11 route answers.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authorized = isCronAuthorized(req);
  if (!UX_V1) {
    return authorized
      ? NextResponse.json({ ok: true, skipped: 'flag_off' })
      : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const store = new SupabaseRankedStore(rankedServiceClient());
    const seasons = await store.seasons(); // read-only probe: throws migration_missing before any write
    if (seasons.length === 0) return NextResponse.json({ ok: true, skipped: 'no_season' });
    const result = await runNightly(store, new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof RankedNotLiveError) return NextResponse.json({ ok: true, skipped: e.reason });
    console.error('[ranked nightly]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'ranked_error' }, { status: 500 });
  }
}
