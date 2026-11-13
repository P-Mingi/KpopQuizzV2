// KpopCards: POST /api/cards/missions/claim { key, target: set id | 'week' } -> ClaimResponse. The packs go straight into the stack, once (the key and the claim row).
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TARGET = /^(week|solo|holo|gold|year:[0-9]{4}|group:[A-Za-z0-9_.-]{1,80})$/;

export const POST = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: true, key: true }, (c, i) => {
    const t = i.body.target;
    return typeof t === 'string' && TARGET.test(t) ? srv.claim(c, i.key!, t) : { error: 'bad_request' as const };
  });
