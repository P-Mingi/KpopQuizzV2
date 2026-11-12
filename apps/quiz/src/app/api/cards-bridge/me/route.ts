// Bunnyverse Cards, lane B: the read of the bridge islands (lib/cards-bridge/me.ts). 404 while NET_CARDS_BRIDGES is off.
import { handleMe } from '@/lib/cards-bridge/me';

import type { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  return handleMe(request);
}
