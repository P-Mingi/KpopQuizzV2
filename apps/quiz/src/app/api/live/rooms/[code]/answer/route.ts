import { liveBody, liveDeps, liveGate, liveJson, liveToken } from '@/lib/live/server';
import { submitAnswer } from '@/lib/live/service';

import type { NextRequest, NextResponse } from 'next/server';

// POST /api/live/rooms/<code>/answer with `x-live-token` (player). Body { choice: 0..3 }.
// The time is the database's (round start to now), never the phone's. Answers
// 200 { ok, ms, round }. 409 late (after the round's seconds), 409 duplicate (one
// answer per round), 409 not_open (no round is running), 403 removed, 401.
// Nothing here says whether the answer is right: phones learn it at the reveal.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const off = liveGate();
  if (off) return off;
  const { code } = await ctx.params;
  const body = await liveBody(req, 512);
  if (body === null) return liveJson({ status: 400, body: { error: 'bad_request' } });
  return liveJson(await submitAnswer(liveDeps(), code, liveToken(req), body));
}
