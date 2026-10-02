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
// nothing a player sees. 401 without the cron secret; with the v12 flag off it
// does nothing; before the SQL is applied it answers 503 not_live.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUxV12()) return NextResponse.json({ ok: true, skipped: 'ux_v12_off' });
  return liveJson(await expireRooms(liveDeps()));
}
