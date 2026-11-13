// KpopCards: POST /api/cards/still-there -> { ok, state }. The quiet check of the timer: it only restarts a paused timer and never costs a pack.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> => run(req, { write: true }, (c) => srv.stillThere(c));
