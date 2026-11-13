// KpopCards: GET /api/cards/player/<nickname> -> PlayerPage. The wishlist is there only for the player himself and his friends.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest, ctx: { params: Promise<{ nickname: string }> }): Promise<NextResponse> =>
  run(req, { write: false }, async (c) => {
    const { nickname } = await ctx.params;
    return /^[A-Za-z0-9_]{3,20}$/.test(nickname) ? srv.player(c, nickname) : { error: 'player_unknown' as const };
  });
