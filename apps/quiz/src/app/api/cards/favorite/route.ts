// KpopCards: POST /api/cards/favorite { n, on } -> { n, fav }: the star on an owned card (the showcase of the ranking is made of starred cards).
import { cardNo, run } from '@/lib/kpopcards/route';
import { fail } from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true }, async (c, i) => {
    const n = cardNo(i.body.n);
    if (n === null || typeof i.body.on !== 'boolean') return fail('bad_request');
    const { data, error } = await c.db.rpc('cards_favorite', { p_user: c.userId, p_card_no: n, p_on: i.body.on });
    if (error) return fail('server');
    return data === true ? { n, fav: i.body.on } : fail('not_owned');
  });
