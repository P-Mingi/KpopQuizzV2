// Run O1, lot (c), lane B6. POST /api/n/b (apis.md 4.2): the funnel beacon of the cross-site links. The logic is shared by the
// three builds in lib/network/beacon.ts (rule 18, never a copy).
import { handleBeacon } from '@/lib/network/beacon';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleBeacon(request);
}
