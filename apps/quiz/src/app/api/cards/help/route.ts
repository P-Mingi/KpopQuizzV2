// KpopCards: GET /api/cards/help -> HelpData.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest): Promise<NextResponse> => run(req, { write: false }, async () => srv.help());
