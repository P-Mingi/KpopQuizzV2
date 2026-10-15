import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/admin';
import { isCronAuthorized } from '@/lib/cron-auth';
import { computeRefreshQueue, getRefreshStore } from '@/lib/seo/refresh-queue-server';
import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// SEO Mission 3, part E point 1: the weekly SEO refresh queue, every Monday. Computes the
// queue (lib/seo/refresh-queue.ts) and stores it as that week's snapshot in
// seo_refresh_queue. Before docs/pending-migrations/seo-refresh-queue.sql is applied it
// returns the queue without storing it. Auth: Bearer CRON_SECRET (Vercel Cron) or a
// signed-in admin. Returns paths, scores and reasons only.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let result: Awaited<ReturnType<typeof computeRefreshQueue>>;
  try {
    result = await computeRefreshQueue();
  } catch (err) {
    console.error('[seo-refresh-queue] compute failed:', err);
    return NextResponse.json({ ok: false, error: 'compute_failed' }, { status: 500 });
  }

  let stored: boolean | 'not_applied' | 'no_store' = 'no_store';
  const store = getRefreshStore();
  if (store) {
    try {
      if (await store.live()) {
        await store.saveWeek(result.weekOf, result.items);
        stored = true;
      } else {
        stored = 'not_applied';
      }
    } catch (err) {
      console.error('[seo-refresh-queue] store failed:', err);
      stored = false;
    }
  }

  return NextResponse.json({
    ok: true,
    weekOf: result.weekOf,
    stored,
    search: result.search,
    count: result.items.length,
    top: result.items.slice(0, 10).map((it) => ({ rank: it.rank, path: it.path, score: it.score, reasons: it.reasons.map((r) => r.text) })),
  });
}
