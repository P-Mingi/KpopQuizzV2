import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// O1 item 7: notification retention. Delete READ notifications older than 60
// days, then cap each user at 200 rows (deleting only the oldest READ ones
// beyond the cap; unread is never pruned). Mirrors the prune-activity cron auth
// + service-role delete. Small table today, so the cap folds in JS; a GROUP BY
// RPC / window delete becomes worthwhile once a user can exceed 200.
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 60;
const PER_USER_CAP = 200;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);
  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceRoleClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();

  // 1. Read notifications older than 60 days.
  const { error: e1, count: deletedOld } = await svc
    .from('creator_notifications')
    .delete({ count: 'exact' })
    .eq('is_read', true)
    .lt('created_at', cutoff);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  // 2. Per-user cap (oldest read first).
  const { data: rows } = await svc
    .from('creator_notifications')
    .select('id, user_id, is_read')
    .order('created_at', { ascending: false })
    .limit(50000);
  const perUser = new Map<string, Array<{ id: string; is_read: boolean }>>();
  for (const r of (rows ?? []) as Array<{ id: string; user_id: string; is_read: boolean }>) {
    const arr = perUser.get(r.user_id) ?? [];
    arr.push({ id: r.id, is_read: r.is_read });
    perUser.set(r.user_id, arr);
  }
  const toDelete: string[] = [];
  for (const arr of perUser.values()) {
    if (arr.length <= PER_USER_CAP) continue;
    // arr is newest-first; the tail beyond the cap is oldest. Prune only reads.
    for (const r of arr.slice(PER_USER_CAP)) if (r.is_read) toDelete.push(r.id);
  }
  let deletedCap = 0;
  for (let i = 0; i < toDelete.length; i += 500) {
    const { error, count } = await svc.from('creator_notifications').delete({ count: 'exact' }).in('id', toDelete.slice(i, i + 500));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    deletedCap += count ?? 0;
  }

  return NextResponse.json({ ok: true, cutoff, deletedOld: deletedOld ?? 0, deletedCap });
}
