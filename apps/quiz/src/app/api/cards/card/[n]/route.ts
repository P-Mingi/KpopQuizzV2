// KpopCards: GET /api/cards/card/<n> -> CardMoment: "The moment" of the card view (the photo's event and date, the player's first copy of the card, the quiz link).
import { cardNo, run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest, ctx: { params: Promise<{ n: string }> }): Promise<NextResponse> =>
  run(req, { write: false }, async (c) => {
    const { n } = await ctx.params;
    const num = /^[0-9]{1,10}$/.test(n) ? cardNo(Number(n)) : null;
    return num === null ? { error: 'card' as const } : srv.card(c, num);
  });
