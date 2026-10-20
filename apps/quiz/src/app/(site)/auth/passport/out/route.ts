// Run O1, lot (c) part 2 (B3). GET /auth/passport/out?to&next&via: the click endpoint of a signed-in cross-site link (apis.md 2.1).
// The logic is shared by the three builds in lib/passport/handoff.ts (rule 18, never a copy). With the
// PASSPORT_JUMP flag off it sends the visitor to the target page signed out.
import { handleOut } from '@/lib/passport/handoff';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleOut(request);
}
