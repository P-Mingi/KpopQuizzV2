import { NextResponse } from 'next/server';

import { getRecentGames, getPopularGames } from '@/lib/db/queries/games';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') ?? 'popular';
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '10', 10), 1), 50);

  try {
    const games = tab === 'new'
      ? await getRecentGames(offset, limit)
      : await getPopularGames(offset, limit);

    return NextResponse.json({ games });
  } catch (err) {
    console.error('Failed to fetch games:', err);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
