// Run O1, lot (e), lane B7. GET /api/cron/passport-deletions (hub, 50 3 * * *): runs the due deletion requests, apis.md 5. Bearer
// CRON_SECRET else 401; a site other than the hub answers 200 {skipped: true}. The work is in lib/passport/deletion/account.ts,
// which checks the secret again before it touches anything.
import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { handleCronDeletions } from '@/lib/passport/deletion/account';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<Response> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return handleCronDeletions(req);
}
