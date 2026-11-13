// KpopCards: GET /api/cards/recycle -> RecyclePreview; POST /api/cards/recycle { key, confirm: true, n? } -> RecycleResponse.
// Bulk: one copy of each card stays, locked cards and Gold and Full Art extras are never recycled. With n: one extra copy of that card, never a locked one.
import { cardNo, run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest): Promise<NextResponse> => run(req, { write: false }, (c) => srv.recyclePreviewOf(c));

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true, bucket: 'recycle', key: true }, (c, i) => {
    const n = i.body.n === undefined ? undefined : cardNo(i.body.n);
    if (n === null) return { error: 'bad_request' as const };
    return srv.recycle(c, i.key!, i.body.confirm === true, n);
  });
