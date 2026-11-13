// KpopCards: POST /api/cards/friends/redeem { key, code } -> FriendRedeemResponse. The code works once; wrong tries are counted.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true, bucket: 'friendRedeem', key: true }, (c, i) =>
    typeof i.body.code === 'string' && i.body.code.length <= 20 ? srv.friendRedeem(c, i.key!, i.body.code) : { error: 'code_invalid' as const });
