import { liveBody, liveDeps, liveGate, liveJson, liveToken } from '@/lib/live/server';
import { hostAction } from '@/lib/live/service';

import type { NextRequest, NextResponse } from 'next/server';

// POST /api/live/rooms/<code>/host with `x-live-token` (host). Body { action, ... }:
//   start    { round }      lobby -> round 1, leaderboard -> next round (the round clock starts)
//   reveal   { round }      round -> reveal: closes the round and applies the scores once
//   board                   reveal -> leaderboard
//   end                     leaderboard -> podium
//   again    { settings }   podium -> lobby: next game, scores at zero, new questions
//   settings { settings }   lobby only
//   remove   { player_id }  the player's token is refused from then on
//   close                   the room is closed and emptied
// Answers 200 { state } (the host view). After every change a phone must see, the
// server broadcasts the public state on the room's private channel.
// 401 without the host token, 403 with a player token, 409 bad_state.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const off = liveGate();
  if (off) return off;
  const { code } = await ctx.params;
  const body = await liveBody(req);
  if (body === null) return liveJson({ status: 400, body: { error: 'bad_request' } });
  return liveJson(await hostAction(liveDeps(), code, liveToken(req), body));
}
