// Run O1, lot (b), lane P1. GET /auth/confirm: the landing of every email link of anime and hub (apis.md 3.2). The logic is
// shared by the three builds in lib/passport/signin.ts (rule 18, never a copy); kpop answers 404 and keeps /auth/callback.
import { handleConfirm } from '@/lib/passport/signin';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleConfirm(request);
}
