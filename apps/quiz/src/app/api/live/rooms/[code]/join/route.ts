import { liveBody, liveDeps, liveGate, liveJson } from '@/lib/live/server';
import { joinRoom } from '@/lib/live/service';

import type { NextRequest, NextResponse } from 'next/server';

// POST /api/live/rooms/<code>/join: a phone enters. Body { nickname, colour }.
// No account. The nickname goes through the site's moderation word list; a name
// already in the room gets a number. Answers 201 { token, state }: the player
// token is shown once, the phone keeps it and sends it in `x-live-token`.
// 400 nickname_empty / nickname_too_long / nickname_blocked, 404 not_found,
// 409 full (50 players).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const off = liveGate();
  if (off) return off;
  const { code } = await ctx.params;
  const body = await liveBody(req, 2048);
  if (body === null) return liveJson({ status: 400, body: { error: 'bad_request' } });
  return liveJson(await joinRoom(liveDeps(), code, body));
}
