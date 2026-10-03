import { NextResponse } from 'next/server';

import { isCronAuthorized } from '@/lib/cron-auth';
import { liveDeps, liveJson } from '@/lib/live/server';
import { expireRooms } from '@/lib/live/service';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// GET /api/cron/live-expire (Vercel cron, `Authorization: Bearer <CRON_SECRET>`).
// Rooms past their two hours: test rooms are deleted with their players and
// answers, real rooms keep one closed row with no question, token or player.
// The two hours are enforced on every read and write anyway (an expired room is
// "gone" for every route), so this only cleans up: a late or missed run changes
// nothing a player sees. With the v12 flag off it answers 404 before anything
// else, like the other v12 crons; with the flag on, 401 without the cron secret;
// before the SQL is applied it answers 503 not_live.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return liveJson(await expireRooms(liveDeps()));
}
