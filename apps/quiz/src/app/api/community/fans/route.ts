import { NextResponse } from 'next/server';

import { getActiveFansByGroup } from '@/lib/db/queries/community';

import type { NextRequest } from 'next/server';

// Active fans of a group (Workstream M, M1.21). Backs the by-fandom client island
// so the chip switch stays interactive without making /leaderboard dynamic. Cheap
// group-filtered read. Public, cached briefly.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const group = req.nextUrl.searchParams.get('group') ?? '';
  if (!group) return NextResponse.json({ fans: [] });
  const fans = await getActiveFansByGroup(group, 8);
  return NextResponse.json(
    { fans },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300' } },
  );
}
