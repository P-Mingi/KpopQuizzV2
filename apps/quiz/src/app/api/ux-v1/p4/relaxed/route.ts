import { NextResponse } from 'next/server';

import { UX_V1 } from '@/lib/ux-v1';
import { isUuid, readAnonCookie } from '@/lib/anon-claim';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p4/relaxed { playId } - marks the caller's own, just-saved play as a
// relaxed run (played without the timer), so the v11 hall of fame leaves it out
// (DESIGN-SPEC 16.7). The play itself was saved by the EXISTING POST
// /api/quiz/[id]/play with the same payload (time_taken_seconds null, so
// quiz_time_stats already ignores it); this route only sets one new column.
//
// Needs docs/pending-migrations/v11-p4-relaxed-runs.sql. Until the owner applies it,
// the column does not exist and this answers 503 not_live (the game never shows the
// relaxed control in that state anyway). Flag off: 404, like every v11 route.
//
// Ownership: signed in = the row's player_id is the session user; guest = the row has
// no player and its anon_id is the id this browser proved with the httpOnly cookie
// (the claim-runs rule, lib/anon-claim.ts). Only rows created in the last 15 minutes.
// A relaxed mark can only REMOVE a run from a board, never add or change a score.

export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: { playId?: unknown };
  try { body = (await req.json()) as typeof body; } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!isUuid(body.playId)) return NextResponse.json({ error: 'play_id_required' }, { status: 400 });
  const playId = body.playId;

  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  const proven = readAnonCookie(req);
  if (!user && !proven) return NextResponse.json({ error: 'not_yours' }, { status: 403 });

  const db = createServiceRoleClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  let q = db.from('plays').update({ relaxed: true }).eq('id', playId).gte('created_at', since);
  q = user ? q.eq('player_id', user.id) : q.is('player_id', null).eq('anon_id', proven as string);
  const { data, error } = await q.select('id');

  if (error) {
    // 42703 = undefined column: the migration is not applied yet.
    if (error.code === '42703' || /relaxed/i.test(error.message)) return NextResponse.json({ error: 'not_live' }, { status: 503 });
    console.error('[ux-v1/p4/relaxed] update failed:', error.message);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'not_yours' }, { status: 403 });
  return NextResponse.json({ relaxed: true });
}
