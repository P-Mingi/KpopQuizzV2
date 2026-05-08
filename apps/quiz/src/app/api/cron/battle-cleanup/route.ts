import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * Cleans up stale battle rooms:
 * - Rooms inactive for > 2 hours get closed
 * - Ended rooms older than 24 hours get closed
 * - Expired moderation tokens get deleted
 *
 * Triggered by Vercel Cron or manually with CRON_SECRET.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Close rooms inactive for > 2 hours (lobby or active)
  const { data: staleData } = await supabase
    .from('battle_rooms')
    .update({ status: 'closed' })
    .in('status', ['lobby', 'active'])
    .lt('last_activity_at', twoHoursAgo)
    .select('id');

  // Close ended rooms older than 24 hours
  const { data: endedData } = await supabase
    .from('battle_rooms')
    .update({ status: 'closed' })
    .eq('status', 'ended')
    .lt('ended_at', oneDayAgo)
    .select('id');

  // Delete expired moderation tokens
  const { data: tokenData } = await supabase
    .from('battle_moderation_tokens')
    .delete()
    .lt('expires_at', now)
    .select('token');

  return NextResponse.json({
    ok: true,
    cleaned: {
      stale_rooms: staleData?.length ?? 0,
      ended_rooms: endedData?.length ?? 0,
      expired_tokens: tokenData?.length ?? 0,
    },
  });
}
