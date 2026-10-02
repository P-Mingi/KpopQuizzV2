import { NextResponse } from 'next/server';

import { getTeamIds } from '@/lib/editorial/accounts';
import { createPublicReadClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

// GET /api/ux-v1/p11/team (V12 G9): the usernames of the active editorial (team)
// accounts, for the surfaces that name a person from a link only (notification
// rows). READ ONLY and public: a username and the Team badge are on every editorial
// post. No cookie is read. v12 flag off: 404. SQL not applied: an empty list.
export const dynamic = 'force-dynamic';

const CACHED = { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' };

export async function GET(): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const ids = [...(await getTeamIds())];
    if (!ids.length) return NextResponse.json({ usernames: [] }, { headers: CACHED });
    const { data, error } = await createPublicReadClient().from('profiles').select('username').in('id', ids);
    if (error) throw new Error(error.message);
    const usernames = ((data ?? []) as { username: string | null }[]).map((p) => p.username).filter((u): u is string => !!u);
    return NextResponse.json({ usernames }, { headers: CACHED });
  } catch (e) {
    console.error('[ux-v1/p11/team]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ usernames: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
