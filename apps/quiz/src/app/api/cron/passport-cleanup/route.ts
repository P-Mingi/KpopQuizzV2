// Run O1, lane L1. GET /api/cron/passport-cleanup (hub, 55 3 * * *): passport_cleanup() of SQL 006, apis.md 5. Bearer CRON_SECRET else
// 401; a site other than the hub answers 200 {skipped: true}. The work is in lib/passport/cleanup.ts, which checks the secret again.
import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { handleCronCleanup } from '@/lib/passport/cleanup';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<Response> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return handleCronCleanup(req);
}
