// KpopCards: POST /api/cards/seen { ns } -> { newCards }. Clears the New badge of cards the player has looked at.
import { cardNo, run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true }, (c, i) => {
    const ns = Array.isArray(i.body.ns) ? i.body.ns.map(cardNo) : null;
    return ns === null || ns.length > 500 || ns.some((x) => x === null) ? { error: 'bad_request' as const } : srv.seen(c, ns as number[]);
  });
