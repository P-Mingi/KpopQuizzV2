// Run O1, lot (c) part 2 (B3). GET /auth/land: the tiny page that posts the code of the URL fragment (apis.md 2.4).
// The logic is shared by the three builds in lib/passport/handoff.ts (rule 18, never a copy). With the
// PASSPORT_JUMP flag off it answers 404.
import { handleLand } from '@/lib/passport/handoff';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleLand(request);
}
