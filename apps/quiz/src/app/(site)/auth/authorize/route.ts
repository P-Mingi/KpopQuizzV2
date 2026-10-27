// Run O1, lot (c) part 2 (B3). GET /auth/authorize: the identity site issues a one-time code (apis.md 2.3).
// The logic is shared by the three builds in lib/passport/handoff.ts (rule 18, never a copy). With the
// PASSPORT_JUMP flag off it answers 404.
import { handleAuthorize } from '@/lib/passport/handoff';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleAuthorize(request);
}
