import { NextResponse } from 'next/server';

import { getFansPicked } from '@/lib/duel/server';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// GET /api/duel/fans-picked?group=<slug> - read only (V12 G7, SYSTEM.md 5.3).
// The group's top 10 songs from the This or that votes: rank, counted votes, weekly
// movement. `ranked: false` (too few votes, no ranking computed yet, store not
// live) means the section is hidden. Shape: lib/duel/types.ts FansPickedResponse.
// A server component can call getFansPicked(slug) directly instead. Flag off: 404.

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const group = req.nextUrl.searchParams.get('group') ?? '';
  if (!SLUG.test(group)) return NextResponse.json({ error: 'group_required' }, { status: 400 });
  const body = await getFansPicked(group);
  // the ranking changes once a night
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } });
}
