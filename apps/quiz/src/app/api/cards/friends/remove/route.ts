// KpopCards: POST /api/cards/friends/remove { nickname } -> FriendsState.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true }, (c, i) =>
    typeof i.body.nickname === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(i.body.nickname) ? srv.friendRemove(c, i.body.nickname) : { error: 'bad_request' as const });
