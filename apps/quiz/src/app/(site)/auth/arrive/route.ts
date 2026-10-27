// Run O1, lot (c) part 2 (B3). GET /auth/arrive?from&next&t[&via]: the relying party's entry (apis.md 2.2).
// The logic is shared by the three builds in lib/passport/handoff.ts (rule 18, never a copy). With the
// PASSPORT_JUMP flag off it answers a 302 to next.
import { handleArrive } from '@/lib/passport/handoff';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleArrive(request);
}
