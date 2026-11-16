// KpopCards: POST /api/cards/wish { n, on } -> { n, on, count }: adds a MISSING card to the wishlist or removes one (at most 50 cards).
import { cardNo, run } from '@/lib/kpopcards/route';
import { errorOf, fail } from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true }, async (c, i) => {
    const n = cardNo(i.body.n);
    if (n === null || typeof i.body.on !== 'boolean') return fail('bad_request');
    const { data, error } = await c.db.rpc('cards_wish', { p_user: c.userId, p_card_no: n, p_on: i.body.on, p_now: new Date(c.now).toISOString() });
    if (error || !data) return fail(errorOf(error?.message) ?? 'server');
    const r = data as { on: boolean; count: number };
    return { n, on: r.on === true, count: Number(r.count) };
  });
