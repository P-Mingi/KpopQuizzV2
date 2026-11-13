// KpopCards: GET /api/cards/missions -> MissionsState (the sets, the week, what is ready to claim).
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest): Promise<NextResponse> => run(req, { write: false }, (c) => srv.missions(c));
