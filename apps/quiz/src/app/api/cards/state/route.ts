// KpopCards: GET /api/cards/state -> LobbyState (lib/kpopcards/contract.ts). Hub build with NET_CARDS only (else 404), signed in, not a Team account.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest): Promise<NextResponse> => run(req, { write: false }, (c) => srv.state(c));
