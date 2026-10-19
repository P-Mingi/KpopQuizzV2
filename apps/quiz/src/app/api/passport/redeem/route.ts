// Run O1, lot (c) part 2 (B3). POST /api/passport/redeem: state and PKCE checked, the session made (apis.md 2.5).
// The logic is shared by the three builds in lib/passport/handoff.ts (rule 18, never a copy). With the
// PASSPORT_JUMP flag off it answers 404.
import { handleRedeem } from '@/lib/passport/handoff';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleRedeem(request);
}
