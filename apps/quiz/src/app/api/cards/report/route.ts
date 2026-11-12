// Bunnyverse Cards: POST /api/cards/report { photoId?, n?, role, message, contact? } -> { ok }. No sign-in; hub build with NET_CARDS only;
// rate-limited by IP hash (lib/cards/report.ts). The contact is optional.
import { handleReport } from '@/lib/cards/report';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleReport(req);
}
