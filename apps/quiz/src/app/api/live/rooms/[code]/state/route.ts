import { liveDeps, liveGate, liveJson, liveToken } from '@/lib/live/server';
import { getState } from '@/lib/live/service';

import type { NextRequest, NextResponse } from 'next/server';

// GET /api/live/rooms/<code>/state with `x-live-token`.
// Host token: the host view (the clip and the four answer texts of the round).
// Player token: the public state plus the phone's own row. This is how a host
// reload resumes a room and how a phone that dropped comes back with its score.
// 401 without a known token, 403 removed, 404 gone (closed or past two hours).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const off = liveGate();
  if (off) return off;
  const { code } = await ctx.params;
  return liveJson(await getState(liveDeps(), code, liveToken(req)));
}
