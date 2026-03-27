import { NextResponse } from 'next/server';

import { getGamesByCreator } from '@/lib/db/queries/games';

import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('creatorId');
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  if (!creatorId) {
    return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
  }

  try {
    const games = await getGamesByCreator(creatorId, offset, 20);
    return NextResponse.json({ games });
  } catch (err) {
    console.error('Failed to fetch user games:', err);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}
