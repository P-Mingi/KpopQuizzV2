import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { fetchViewCounts, hasYouTubeKey } from '@/lib/industry/youtube';
import { alertOps } from '@/lib/industry/alert';

import type { NextRequest } from 'next/server';

// Workstream T1.5: daily MV view-count snapshot. For each active tracked MV,
// record its cumulative YouTube view count for today. Idempotent per (mv, day)
// via the UNIQUE upsert. Fail-soft: a missing key is a quiet skip (the expected
// pre-key gap), and a real API/DB failure alerts ops and returns 200 so the
// published page is never broken and Vercel does not retry-storm.
// Auth mirrors /api/qotd/publish and /api/cron/pulse-generate.
export const dynamic = 'force-dynamic';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
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

  const date = todayUtc();

  // Missing key = expected pre-key gap. Quiet skip, no alert (would fire daily).
  if (!hasYouTubeKey()) {
    return NextResponse.json({ ok: true, date, skipped: 'no_youtube_key' });
  }

  const svc = createServiceRoleClient();
  const { data: rows, error } = await svc.from('mv_tracking').select('id, video_id').eq('active', true);
  if (error) {
    await alertOps('mv-snapshot', `mv_tracking read failed: ${error.message}`);
    return NextResponse.json({ ok: false, error: 'read_failed' }, { status: 500 });
  }
  const mvs = (rows ?? []) as Array<{ id: number; video_id: string }>;
  if (mvs.length === 0) {
    return NextResponse.json({ ok: true, date, snapshotted: 0, note: 'no active tracked MVs' });
  }

  // Fail-soft on the external API: alert + 200 skip, never a broken page.
  let result;
  try {
    result = await fetchViewCounts(mvs.map((m) => m.video_id));
  } catch (err) {
    await alertOps('mv-snapshot', `YouTube fetch failed: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, skipped: 'youtube_fetch_failed' });
  }

  const idByVideo = new Map(mvs.map((m) => [m.video_id, m.id]));
  const toUpsert = [...result.views.entries()]
    .map(([videoId, views]) => ({ mv_id: idByVideo.get(videoId), snapshot_date: date, views }))
    .filter((r): r is { mv_id: number; snapshot_date: string; views: number } => r.mv_id != null);

  if (toUpsert.length > 0) {
    const { error: upErr } = await svc.from('mv_snapshots').upsert(toUpsert, { onConflict: 'mv_id,snapshot_date' });
    if (upErr) {
      await alertOps('mv-snapshot', `mv_snapshots upsert failed: ${upErr.message}`);
      return NextResponse.json({ ok: false, error: 'upsert_failed' }, { status: 500 });
    }
  }

  // A whole-batch miss is systemic (bad key/quota) -> alert. Partial misses are
  // just individual dead videos; report the count without alarming.
  if (result.missing.length > 0 && result.missing.length === mvs.length) {
    await alertOps('mv-snapshot', `all ${mvs.length} tracked videos returned no stats (quota or key issue?)`);
  }

  return NextResponse.json({ ok: true, date, snapshotted: toUpsert.length, missing: result.missing.length });
}
