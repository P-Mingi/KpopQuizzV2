import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { computePulse } from '@/lib/pulse/compute';
import { announcePulse } from '@/lib/pulse/announce';

import type { AnnounceResult } from '@/lib/pulse/announce';
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
  // Distribution control: '1' force a Discord post, '0' suppress it, 'preview'
  // build the message without sending, null = auto (post only on first run).
  const announceMode = req.nextUrl.searchParams.get('announce');

  const svc = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  try {
    // Detect the first-ever generation for this month so the scheduled 1st-of-
    // month run announces exactly once; re-runs (manual regenerate) stay silent
    // unless forced. This is the idempotent "post once" guard, no extra column.
    const { data: existing } = await svc.from('pulse_reports').select('month').eq('month', month).maybeSingle();
    const isFirstGeneration = !existing;

    const payload = await computePulse(svc, month, nowIso);
    const { error } = await svc
      .from('pulse_reports')
      .upsert({ month, payload, updated_at: nowIso }, { onConflict: 'month' });
    if (error) {
      console.error('[pulse-generate] upsert failed:', error.message);
      return NextResponse.json({ error: 'Failed to store report' }, { status: 500 });
    }

    // Announce to Discord (which carries the Reddit draft as a spoiler). A
    // failed post never fails generation, since the row is already written.
    let announced: AnnounceResult | null = null;
    const shouldAnnounce = announceMode === '1' || announceMode === 'preview' || (announceMode !== '0' && isFirstGeneration);
    if (shouldAnnounce) {
      announced = await announcePulse(payload, { preview: announceMode === 'preview' });
    }

    return NextResponse.json({
      ok: true,
      month,
      firstGeneration: isFirstGeneration,
      headline: {
        fandom: payload.fandom?.name ?? null,
        plays: payload.community.plays,
        newFans: payload.community.newFans,
      },
      announced: announced
        ? {
            ok: announced.ok,
            skipped: announced.skipped ?? null,
            status: announced.status ?? null,
            ...(announced.message ? { preview: announced.message } : {}),
          }
        : null,
    });
  } catch (err) {
    console.error('[pulse-generate]', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
