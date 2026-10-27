import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { flushOutbox, getIndexNowStore } from '@/lib/seo/indexnow-outbox';

import type { NextRequest } from 'next/server';

// GET /api/cron/indexnow-flush (SEO Mission 3, part A point 4). Hourly (vercel.json; the
// project's plan runs crons down to once a minute). Auth: Bearer CRON_SECRET, like every cron.
//
// Sends the IndexNow outbox: dedupe, nothing sent again within 5 minutes of its last
// submission, batches of at most 10,000 URLs to api.indexnow.org (host, key, keyLocation),
// every answer recorded; waits out a 429 (1 h, doubled on each 429 in a row, at most 24 h);
// alert row and error log on 400, 403 or 422. INDEXNOW_DRY_RUN=1: plans and logs, sends nothing.
//
// ?url=<a kpopquiz.org URL> sends that one URL only (the owner's single real test).
//
//   wrong or missing secret   401
//   service role not set      503 { error: 'not_configured' }
//   SQL not applied           200 { ok: true, skipped: 'not_live' }, nothing sent
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const store = getIndexNowStore();
  if (!store) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  try {
    if (!(await store.live())) return NextResponse.json({ ok: true, skipped: 'not_live' });
    const only = req.nextUrl.searchParams.get('url');
    const report = await flushOutbox(store, only ? { onlyUrl: only } : {});
    return NextResponse.json(report);
  } catch (err) {
    console.error('[cron/indexnow-flush] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'flush_failed' }, { status: 500 });
  }
}
