// KpopCards: POST /api/cards/open { key, source: 'stock' | 'daily' | 'focus' | 'shards', theme?, focus?, packs?: 1 | 5 } -> OpenResponse.
// One call is one database transaction (cards_open): the wallet is locked, the key makes a retry or a double tap return the same answer.
import { cardNo, run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';
import type { OpenRequest } from '@/lib/kpopcards/contract';

export const dynamic = 'force-dynamic';
void cardNo;

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true, bucket: 'open', key: true }, (c, i) => {
    const b = i.body;
    const r: OpenRequest = { key: i.key!, source: b.source as OpenRequest['source'] };
    if (b.theme !== undefined) r.theme = b.theme as NonNullable<OpenRequest['theme']>;
    if (b.focus !== undefined) r.focus = b.focus as string;
    if (b.packs !== undefined) r.packs = b.packs as 1 | 5;
    return srv.open(c, r);
  });
