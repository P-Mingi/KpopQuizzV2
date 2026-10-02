import { liveBody, liveDeps, liveGate, liveIpHash, liveJson } from '@/lib/live/server';
import { createRoom } from '@/lib/live/service';

import type { NextRequest, NextResponse } from 'next/server';

// POST /api/live/rooms: the host screen opens a room.
// Body { playlist, label, rounds, seconds, questions } where `questions` is what
// /api/blind-test/generate returned. Answers 201 { code, host_token, state }. The
// host token is shown once: the host tab keeps it and sends it in `x-live-token`.
// 400 bad_request, 429 rate_limited (rooms per hashed address), 503 not_live.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = liveGate();
  if (off) return off;
  const body = await liveBody(req);
  if (body === null) return liveJson({ status: 400, body: { error: 'bad_request' } });
  return liveJson(await createRoom(liveDeps(), { body, ipHash: liveIpHash(req) }));
}
