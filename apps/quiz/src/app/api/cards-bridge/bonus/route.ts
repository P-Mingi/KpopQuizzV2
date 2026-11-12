// Bunnyverse Cards (review 1 finding 1): the server records the bonus pack of a Kpopdle win (lib/cards-bridge/bonus.ts). 404 while the
// bridges are off.
import { handleBonus } from '@/lib/cards-bridge/bonus';

import type { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  return handleBonus(request);
}
