import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { getIndexNowStore } from '@/lib/seo/indexnow-outbox';
import { runReconcile } from '@/lib/seo/indexnow-reconcile';

import type { NextRequest } from 'next/server';

// GET /api/cron/indexnow-reconcile (SEO Mission 3, part A point 6). Nightly (vercel.json).
// Auth: Bearer CRON_SECRET.
//
// Reads the live sitemap, fingerprints every page (title, description, H1, main content
// without volatile counters, robots, canonical: lib/seo/indexnow-fingerprint.ts), and puts
// the new, changed and removed URLs in the IndexNow outbox; the hourly flush sends them. A
// time budget keeps the run under 5 minutes: the URLs checked longest ago go first and the
// rest wait for the next night. At most 4 pages are fetched at once.
//
//   wrong or missing secret   401
//   service role not set      503 { error: 'not_configured' }
//   SQL not applied           200 { ok: true, skipped: 'not_live' }, nothing fetched
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const store = getIndexNowStore();
  if (!store) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  try {
    if (!(await store.live())) return NextResponse.json({ ok: true, skipped: 'not_live' });
    const report = await runReconcile(store, { scope: 'all', kind: 'reconcile', budgetMs: 240000 });
    return NextResponse.json(report, { status: report.ok ? 200 : 502 });
  } catch (err) {
    console.error('[cron/indexnow-reconcile] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'reconcile_failed' }, { status: 500 });
  }
}
