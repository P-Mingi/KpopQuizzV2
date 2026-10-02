import { NextResponse } from 'next/server';

import { pairsLimiter } from '@/lib/duel/rate-limit';
import { createDuelStore } from '@/lib/duel/server';
import { issuePairs } from '@/lib/duel/service';
import { duelKey } from '@/lib/duel/token';
import { isUxV12 } from '@/lib/ux-v12';

import { NO_STORE, resolveVoter } from '../voter';

import type { PairsResponse } from '@/lib/duel/types';
import type { NextRequest } from 'next/server';

// GET /api/duel/pairs?group=<slug> - read only (V12 G7, SYSTEM.md 5.3).
// Up to 5 pairs of the group's songs for the This or that bonus card, each signed
// for this voter. No pair (store not live, no song question, no voter id, every
// pair already answered today) = `pairs: []` and the card does not render.
// Flag off: 404.

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const group = req.nextUrl.searchParams.get('group') ?? '';
  const empty: PairsResponse = { pairs: [], group: null, ranked: false };
  if (!SLUG.test(group)) return NextResponse.json(empty, { headers: NO_STORE });
  try {
    const body = await issuePairs({ store: createDuelStore(), key: duelKey(), voter: await resolveVoter(req), groupSlug: group, now: Date.now(), limiter: pairsLimiter });
    return NextResponse.json(body, { headers: NO_STORE });
  } catch {
    return NextResponse.json(empty, { headers: NO_STORE });
  }
}
