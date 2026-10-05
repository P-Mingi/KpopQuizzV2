import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

import { createRateLimiter } from '@/lib/duel/rate-limit';
import { getBridgeGroups, getWmaData } from '@/lib/personality/data';
import { saveResult } from '@/lib/personality/save';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

import type { SaveStore } from '@/lib/personality/save';
import type { NextRequest } from 'next/server';

// POST /api/personality/result { quiz: 'wma' | 'kpdh', group?: slug, picks: number[] }
// (V12 G5, SYSTEM.md 5.2). Logs one completed personality run in the existing
// personality_results table, which powers the real "N% of STAY got Felix" share
// and the distribution. The result is recomputed here from the answer sheet.
//
// Same write rules as the route removed with REFONTE P1: a signed-in fan writes
// through the session client (RLS: only their own user_id) and the unique index
// keeps one row per fan, group and UTC day (a repeat is a silent no-op); a guest
// row has no user_id and the page sends at most one per device, quiz and day.
// Fail soft everywhere: the page never waits for this call. Flag off: 404.

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** 12 saves a minute per caller: a person finishes a quiz in a minute or two. */
const limiter = createRateLimiter({ limit: 12, windowMs: 60_000 });

/** The limiter key: a hash of the caller's address, kept in memory only, never stored. */
function callerKey(req: NextRequest): string {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  return createHash('sha256').update(`g5:${ip}`).digest('hex').slice(0, 24);
}

function store(): SaveStore {
  return {
    wma: (slug) => getWmaData(slug),
    async bridgeGroupId(slug) {
      return (await getBridgeGroups()).find((g) => g.slug === slug)?.id ?? null;
    },
    async insert({ groupId, memberName }) {
      try {
        const session = await createServerClient();
        const { data: { user } } = await session.auth.getUser();
        if (user) {
          const { error } = await session.from('personality_results').insert({ group_id: groupId, member_name: memberName, user_id: user.id });
          if (!error) return 'saved';
          return error.code === '23505' ? 'already' : 'failed';
        }
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 'failed';
        const { error } = await createServiceRoleClient().from('personality_results').insert({ group_id: groupId, member_name: memberName, user_id: null });
        return error ? 'failed' : 'saved';
      } catch {
        return 'failed';
      }
    },
  };
}

/** No GET here. With the flag off the route does not exist at all (404, as before this file). */
export function GET(): NextResponse {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isUxV12()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown = null;
  try {
    const raw = await req.text();
    if (raw.length > 2000) throw new Error('too long');
    body = JSON.parse(raw);
  } catch { body = null; }
  try {
    const out = await saveResult({ body, store: store(), allow: () => limiter.hit(callerKey(req)) });
    return NextResponse.json(out.body, { status: out.http, headers: NO_STORE });
  } catch {
    return NextResponse.json({ saved: false, status: 'failed' }, { status: 200, headers: NO_STORE });
  }
}
