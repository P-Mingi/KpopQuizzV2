// Run O1, lot (e), lane B7. POST /api/passport/revalidate (every site): purges this site's /u/{username} page, apis.md 3.3, signed with
// PASSPORT_REVALIDATE_SECRET. The logic is shared by the three builds in lib/passport/revalidate.ts (rule 18, never a copy).
import { handleRevalidate } from '@/lib/passport/revalidate';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleRevalidate(request);
}
