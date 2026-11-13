// KpopCards: POST /api/cards/lock { n, on } -> { n, locked, locks }. A locked card is never recycled.
import { cardNo, run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true }, (c, i) => {
    const n = cardNo(i.body.n);
    return n === null || typeof i.body.on !== 'boolean' ? { error: 'bad_request' as const } : srv.lock(c, n, i.body.on);
  });
