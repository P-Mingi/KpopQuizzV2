import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import { IndustryAdmin } from './industry-admin';

export const dynamic = 'force-dynamic';

export interface MvRow {
  id: number;
  video_id: string;
  title: string;
  artist: string;
  group_id: number | null;
  category: 'comeback' | 'evergreen';
  active: boolean;
  latestDate: string | null;
  latestViews: number | null;
}

export interface ComebackRow {
  id: number;
  group_id: number | null;
  artist: string;
  title: string;
  release_date: string;
  kind: string;
  active: boolean;
}

export interface GroupOption { id: number; name: string; hasSpotify: boolean }

export default async function IndustryAdminPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();
  const [{ data: mvRows }, { data: cbRows }, { data: groupRows }, { data: snapRows }] = await Promise.all([
    svc.from('mv_tracking').select('id, video_id, title, artist, group_id, category, active').order('created_at', { ascending: false }),
    svc.from('comebacks').select('id, group_id, artist, title, release_date, kind, active').order('release_date', { ascending: false }),
    svc.from('groups').select('id, name, spotify_artist_id').order('name'),
    // Recent snapshots so the admin can confirm the daily cron is landing data.
    svc.from('mv_snapshots').select('mv_id, snapshot_date, views').order('snapshot_date', { ascending: false }).limit(300),
  ]);

  // Latest snapshot per MV (rows are date-desc, so first seen per mv wins).
  const latest = new Map<number, { date: string; views: number }>();
  for (const s of (snapRows ?? []) as Array<{ mv_id: number; snapshot_date: string; views: number }>) {
    if (!latest.has(s.mv_id)) latest.set(s.mv_id, { date: s.snapshot_date, views: s.views });
  }

  const mvs: MvRow[] = ((mvRows ?? []) as Array<Omit<MvRow, 'latestDate' | 'latestViews'>>).map((m) => ({
    ...m,
    latestDate: latest.get(m.id)?.date ?? null,
    latestViews: latest.get(m.id)?.views ?? null,
  }));
  const comebacks = (cbRows ?? []) as ComebackRow[];
  const groups: GroupOption[] = ((groupRows ?? []) as Array<{ id: number; name: string; spotify_artist_id: string | null }>).map((g) => ({
    id: g.id,
    name: g.name,
    hasSpotify: !!g.spotify_artist_id,
  }));
  const spotifyTracked = groups.filter((g) => g.hasSpotify).length;

  return <IndustryAdmin mvs={mvs} comebacks={comebacks} groups={groups} spotifyTracked={spotifyTracked} />;
}
