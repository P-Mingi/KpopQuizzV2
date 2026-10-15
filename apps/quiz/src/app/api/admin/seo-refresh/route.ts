import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/admin';
import { monthOf, parseApproval } from '@/lib/seo/refresh-queue';
import { computeRefreshQueue, getRefreshStore } from '@/lib/seo/refresh-queue-server';
import { createServerClient } from '@/lib/supabase/server';

// SEO Mission 3, part E point 1: the owner approves up to 5 pages of the refresh queue once
// a month (/admin/seo). Admin only. The server recomputes the queue and accepts only pages
// of its current top 5; the month is the server's, never the request's. Before
// docs/pending-migrations/seo-refresh-queue.sql is applied it answers 503 not_applied.
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const store = getRefreshStore();
  if (!store) return NextResponse.json({ error: 'not_applied' }, { status: 503 });
  try {
    if (!(await store.live())) return NextResponse.json({ error: 'not_applied' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'store_unreadable' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  let queue: Awaited<ReturnType<typeof computeRefreshQueue>>;
  try {
    queue = await computeRefreshQueue();
  } catch {
    return NextResponse.json({ error: 'compute_failed' }, { status: 500 });
  }
  const parsed = parseApproval(body, queue.items.map((it) => it.path));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const month = monthOf(queue.today);
  try {
    const existing = await store.approvals(month);
    if (existing.length > 0) return NextResponse.json({ error: 'already_approved', month }, { status: 409 });
    const chosen = queue.items.filter((it) => parsed.paths.includes(it.path));
    await store.approve(month, chosen);
    return NextResponse.json({ ok: true, month, paths: chosen.map((it) => it.path) });
  } catch (err) {
    console.error('[seo-refresh] approve failed:', err);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
