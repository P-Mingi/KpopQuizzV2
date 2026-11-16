// KpopCards: GET /api/cards/almost?limit -> AlmostState (the groups one to four cards from complete, the idols with one edition left).
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: false }, (c, i) => {
    const l = Number(i.url.searchParams.get('limit'));
    return srv.almost(c, Number.isInteger(l) && l >= 1 && l <= 12 ? l : 4);
  });
