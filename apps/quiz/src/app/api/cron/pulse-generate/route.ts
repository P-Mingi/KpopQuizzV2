import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { computePulse } from '@/lib/pulse/compute';

import type { NextRequest } from 'next/server';

// Workstream T0: monthly K-pop Pulse generator. Vercel cron (1st of month
// 06:00 UTC) computes the just-ended month's numbers and upserts one
// pulse_reports row. Idempotent: re-running a month recomputes the same row.
// Auth mirrors /api/qotd/publish (x-vercel-cron OR Bearer CRON_SECRET OR admin).
export const dynamic = 'force-dynamic';

/** The previous UTC month as 'YYYY-MM' (what a 1st-of-month run reports on). */
function previousUtcMonth(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isVercelCron && !isManualAuth) {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const monthParam = req.nextUrl.searchParams.get('month');
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? '') ? monthParam! : previousUtcMonth();

  const svc = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  try {
    const payload = await computePulse(svc, month, nowIso);
    const { error } = await svc
      .from('pulse_reports')
      .upsert({ month, payload, updated_at: nowIso }, { onConflict: 'month' });
    if (error) {
      console.error('[pulse-generate] upsert failed:', error.message);
      return NextResponse.json({ error: 'Failed to store report' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      month,
      headline: {
        fandom: payload.fandom?.name ?? null,
        plays: payload.community.plays,
        newFans: payload.community.newFans,
      },
    });
  } catch (err) {
    console.error('[pulse-generate]', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
