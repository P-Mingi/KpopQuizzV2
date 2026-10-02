import { NextResponse } from 'next/server';

import { voteLimiter } from '@/lib/duel/rate-limit';
import { createDuelStore } from '@/lib/duel/server';
import { castVote } from '@/lib/duel/service';
import { duelKey } from '@/lib/duel/token';
import { isUxV12 } from '@/lib/ux-v12';

import { NO_STORE, resolveVoter } from '../voter';

import type { VoteError } from '@/lib/duel/types';
import type { NextRequest } from 'next/server';

// POST /api/duel/vote { token, winner: 'a' | 'b' } (V12 G7, SYSTEM.md 5.3).
// One row in duel_votes through duel_cast_song_vote (pending SQL): the pair must be
// one this server issued to this voter, one vote per pair per voter per day, voter
// hash only. The rules and their order are in lib/duel/service.ts. Flag off: 404.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: { token?: unknown; winner?: unknown } | null = null;
  try {
    const raw = await req.text();
    if (raw.length > 2000) throw new Error('too long');
    const parsed: unknown = JSON.parse(raw);
    body = parsed && typeof parsed === 'object' ? (parsed as { token?: unknown; winner?: unknown }) : null;
  } catch { body = null; }
  if (!body) return NextResponse.json({ error: 'bad_request' } satisfies VoteError, { status: 400, headers: NO_STORE });
  try {
    const out = await castVote({ store: createDuelStore(), key: duelKey(), voter: await resolveVoter(req), token: body.token, winner: body.winner, now: Date.now(), limiter: voteLimiter });
    return NextResponse.json(out.body, { status: out.http, headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'failed' } satisfies VoteError, { status: 503, headers: NO_STORE });
  }
}
