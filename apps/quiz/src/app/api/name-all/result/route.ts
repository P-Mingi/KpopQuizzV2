import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { createRateLimiter } from '@/lib/duel/rate-limit';
import { getNameAllSet, saveRound } from '@/lib/name-all/server';
import { submitRound } from '@/lib/name-all/submit';
import { isUxV12 } from '@/lib/ux-v12';

import type { NextRequest } from 'next/server';

// POST /api/name-all/result { group, found: string[], seconds, gaveUp } (V12 G6,
// SYSTEM.md 5.1). One finished round of Name them all: one row per member of the
// group's real roster in name_all_member_results, no user link. The names are
// checked against the database roster, the round id is made here. The rules and
// their order are in lib/name-all/submit.ts. Flag off: 404.

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;
/** 12 finished rounds a minute per browser: a round lasts up to 60 seconds. */
const limiter = createRateLimiter({ limit: 12, windowMs: 60_000 });

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown = null;
  try {
    const raw = await req.text();
    if (raw.length > 4000) throw new Error('too long');
    body = JSON.parse(raw);
  } catch { body = null; }
  if (!body || typeof body !== 'object') return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400, headers: NO_STORE });
  const out = await submitRound(body, req.headers.get('x-nta-anon'), {
    getSet: getNameAllSet,
    save: saveRound,
    hit: (key) => limiter.hit(key),
    newId: randomUUID,
  });
  return NextResponse.json(out.body, { status: out.http, headers: NO_STORE });
}
