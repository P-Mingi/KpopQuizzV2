// KpopCards: POST /api/cards/ad/grant is RETIRED (launch polish, integrator rule): it gave 25 shards on the browser's word. A rewarded ad now gives a reward only
// through a ticket claimed after Google's "viewed" event (POST /api/cards/ad/claim, or the signed callback /api/cards/ad/ssv). This file stays so an old client
// gets a clean 404, whatever the flags. The SQL function cards_ad_grant stays in the database, unused.
import { closed } from '@/lib/cards/api';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = async (_req: NextRequest): Promise<NextResponse> => closed();
