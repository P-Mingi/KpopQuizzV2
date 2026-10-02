import { liveDeps, liveGate, liveJson } from '@/lib/live/server';
import { peekRoom } from '@/lib/live/service';

import type { NextRequest, NextResponse } from 'next/server';

// GET /api/live/rooms/<code>: what the join page may know before a phone has a
// token: the room exists, its playlist name, how many players are in. 404 for an
// unknown, closed or expired code.
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const off = liveGate();
  if (off) return off;
  const { code } = await ctx.params;
  return liveJson(await peekRoom(liveDeps(), code));
}
