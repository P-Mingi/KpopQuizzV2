import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { readAnonCookie, isUuid } from '@/lib/anon-claim';

import type { NextRequest } from 'next/server';

// W3 PART A2 - CLAIM THE RUNS THIS BROWSER MADE.
//
// Attaches unowned rows carrying THIS browser's anon_id to the signed-in caller.
// The account does not unlock the score, it only puts a name on it: the run already
// existed and still exists if the person never signs in.
//
// SECURITY, which is the whole point of this endpoint:
//   1. The anon_id is taken from the httpOnly `nq_anon` cookie, which only this
//      server sets, and only after seeing that id on a real write from this browser.
//      A body value is a claim; the cookie is proof of possession.
//   2. If the body names a DIFFERENT id than the cookie, the request is REFUSED
//      outright rather than silently falling back to the cookie. A client trying to
//      claim a stranger's id must fail loudly, not quietly succeed on its own.
//   3. Only rows whose owner column is still NULL are touched, so a run that already
//      belongs to somebody can never be re-owned.
//   4. `player_hash` is never consulted. It is sha256(ip + day): 199 hashes cover
//      more than one run, the largest covers 15, so claiming by it would hand over
//      strangers' runs made behind the same IP on the same day.
//
// Idempotent by construction: the second run finds no NULL-owner rows left for that
// id and moves nothing.
export const dynamic = 'force-dynamic';

// A browser has no legitimate reason to claim repeatedly. Cheap guard against a
// client hammering the endpoint after a successful claim.
const CLAIM_WINDOW_MS = 60_000;
const CLAIM_MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function underRateLimit(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < CLAIM_WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear(); // bounded; this is a guard, not accounting
  return hits.length <= CLAIM_MAX_PER_WINDOW;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  }

  if (!underRateLimit(user.id)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const proven = readAnonCookie(req);
  if (!proven) {
    // Nothing to claim: this browser has never written a run with an id.
    return NextResponse.json({ claimed: { plays: 0, battles: 0 }, reason: 'no_browser_id' });
  }

  let body: { anonId?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  // THE REFUSAL. A caller naming an id that is not the one this browser proved is
  // trying to claim someone else's runs.
  if (body.anonId !== undefined && (!isUuid(body.anonId) || body.anonId.toLowerCase() !== proven.toLowerCase())) {
    return NextResponse.json(
      { error: 'anon_id_mismatch', detail: 'The browser id supplied does not match this browser.' },
      { status: 403 },
    );
  }

  const db = createServiceRoleClient();

  const { data: playRows, error: playErr } = await db
    .from('plays')
    .update({ player_id: user.id })
    .eq('anon_id', proven)
    .is('player_id', null)
    .select('id');

  const { data: battleRows, error: battleErr } = await db
    .from('battle_results')
    .update({ user_id: user.id })
    .eq('anon_id', proven)
    .is('user_id', null)
    .select('id');

  // W3b PART 3 A2: game runs, under the SAME contract. game_plays is the largest
  // remaining claim surface: 1,517 rows, 1,390 of them guest (92%), which is far more
  // anonymous than the quiz side. Same cookie-only trust, same NULL-owner filter, so
  // an owned game run can never be re-owned either.
  const { data: gameRows, error: gameErr } = await db
    .from('game_plays')
    .update({ player_id: user.id })
    .eq('anon_id', proven)
    .is('player_id', null)
    .select('id');

  if (playErr || battleErr || gameErr) {
    console.error('claim-runs failed:', playErr?.message ?? battleErr?.message ?? gameErr?.message);
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }

  return NextResponse.json({
    claimed: {
      plays: playRows?.length ?? 0,
      battles: battleRows?.length ?? 0,
      games: gameRows?.length ?? 0,
    },
  });
}
