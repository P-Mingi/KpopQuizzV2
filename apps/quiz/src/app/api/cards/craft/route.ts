// KpopCards: POST /api/cards/craft { key, n } -> CraftResponse. Spends the shards of the card's edition once (the key), never makes a Full Art.
import { cardNo, errorResponse, run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true, bucket: 'craft', key: true }, (c, i) => {
    const n = cardNo(i.body.n);
    return n === null ? { error: 'bad_request' as const } : srv.craft(c, i.key!, n);
  });
void errorResponse;
