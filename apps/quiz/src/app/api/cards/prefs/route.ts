// KpopCards: POST /api/cards/prefs { sound?, vibration?, theme? } -> { prefs }. Sound and vibration are two separate switches.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest): Promise<NextResponse> => run(req, { write: true }, (c, i) => srv.prefs(c, i.body));
