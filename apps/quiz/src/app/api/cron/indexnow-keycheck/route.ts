import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { getIndexNowStore } from '@/lib/seo/indexnow-outbox';
import { runKeyCheck } from '@/lib/seo/indexnow-reconcile';

import type { NextRequest } from 'next/server';

// GET /api/cron/indexnow-keycheck (SEO Mission 3, part A point 8). Nightly (vercel.json).
// Auth: Bearer CRON_SECRET.
//
// The IndexNow key file must answer 200, as text/plain, with the key as its body: without it
// every submission is refused (403) and Bing, the first search referrer, stops hearing about
// changes. A failure is an error log and, once the SQL is applied, an alert row shown on
// /admin/seo/indexnow. The check runs even before the SQL is applied (log only).
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const store = getIndexNowStore();
    const live = store ? await store.live().catch(() => false) : false;
    const result = await runKeyCheck(live ? store : null);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    console.error('[cron/indexnow-keycheck] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'keycheck_failed' }, { status: 500 });
  }
}
