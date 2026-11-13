// KpopCards: GET /api/cards/ranking?scope=friends|all -> RankingState. By completion only, nicknames only.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: false }, (c, i) => srv.ranking(c, i.url.searchParams.get('scope') === 'all' ? 'all' : 'friends'));
