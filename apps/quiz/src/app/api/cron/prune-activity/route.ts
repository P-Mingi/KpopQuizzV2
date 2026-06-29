import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Nightly prune of the activity stream (Workstream M, M1.7). activity_events is a
// live DISPLAY feed with 30-day retention, not analytics. Reuses the existing
// /api/cron + CRON_SECRET pattern. The created_at index (migration 091) keeps the
// delete scan cheap.
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('activity_events').delete().lt('created_at', cutoff);
  if (error) {
    console.error('[cron/prune-activity] failed:', error.message);
    return NextResponse.json({ error: 'Prune failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, cutoff });
}
