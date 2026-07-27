import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { fetchFollowers, hasSpotifyCreds } from '@/lib/industry/spotify';
import { alertOps } from '@/lib/industry/alert';

import type { NextRequest } from 'next/server';

// Workstream T1.5: weekly Spotify follower snapshot. For each group with a
// spotify_artist_id, record its follower total for today. Idempotent per
// (group, day). Fail-soft: missing creds are a quiet skip (the expected pre-key
// gap); a real API/DB failure alerts ops and returns 200. Auth mirrors the
// other crons.
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

  if (!hasSpotifyCreds()) {
    return NextResponse.json({ ok: true, date, skipped: 'no_spotify_creds' });
  }

  const svc = createServiceRoleClient();
  const { data: rows, error } = await svc
    .from('groups')
    .select('id, spotify_artist_id')
    .not('spotify_artist_id', 'is', null);
  if (error) {
    await alertOps('spotify-snapshot', `groups read failed: ${error.message}`);
    return NextResponse.json({ ok: false, error: 'read_failed' }, { status: 500 });
  }
  const tracked = (rows ?? []) as Array<{ id: number; spotify_artist_id: string }>;
  if (tracked.length === 0) {
    return NextResponse.json({ ok: true, date, snapshotted: 0, note: 'no groups with a spotify_artist_id' });
  }

  let result;
  try {
    result = await fetchFollowers(tracked.map((g) => g.spotify_artist_id));
  } catch (err) {
    await alertOps('spotify-snapshot', `Spotify fetch failed: ${(err as Error).message}`);
    return NextResponse.json({ ok: false, skipped: 'spotify_fetch_failed' });
  }

  const groupByArtist = new Map(tracked.map((g) => [g.spotify_artist_id, g.id]));
  const toUpsert = [...result.followers.entries()]
    .map(([artistId, followers]) => ({ group_id: groupByArtist.get(artistId), snapshot_date: date, followers }))
    .filter((r): r is { group_id: number; snapshot_date: string; followers: number } => r.group_id != null);

  if (toUpsert.length > 0) {
    const { error: upErr } = await svc.from('spotify_snapshots').upsert(toUpsert, { onConflict: 'group_id,snapshot_date' });
    if (upErr) {
      await alertOps('spotify-snapshot', `spotify_snapshots upsert failed: ${upErr.message}`);
      return NextResponse.json({ ok: false, error: 'upsert_failed' }, { status: 500 });
    }
  }

  if (result.missing.length > 0 && result.missing.length === tracked.length) {
    await alertOps('spotify-snapshot', `all ${tracked.length} artist ids returned nothing (bad creds or ids?)`);
  }

  return NextResponse.json({ ok: true, date, snapshotted: toUpsert.length, missing: result.missing.length });
}
