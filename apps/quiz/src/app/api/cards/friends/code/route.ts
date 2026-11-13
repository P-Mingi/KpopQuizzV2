// KpopCards: POST /api/cards/friends/code -> { code, expiresAt }. A one-time code, valid 24 hours; a new code replaces the old one.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> => run(req, { write: true, bucket: 'friendCode' }, (c) => srv.friendCode(c));
