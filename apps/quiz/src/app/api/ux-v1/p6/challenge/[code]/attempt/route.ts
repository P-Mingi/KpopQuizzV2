import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { CODE_RE, parseAttemptInput } from '@/lib/ux-v1/p6/challenge';
import { findChallenge, viewerName } from '@/lib/ux-v1/p6/challenge-server';

// POST /api/ux-v1/p6/challenge/<code>/attempt - one play of a challenge link:
// { score, total, points, timeMs, bestCombo } -> one `challenge_attempts` row
// (mig 046; anonymous allowed, the name is the signed-in player's public name).
// Refused once the link expired (410). Writes nothing else. Flag off: 404.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { code } = await ctx.params;
  const c = String(code ?? '').toUpperCase();
  if (!CODE_RE.test(c)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  let body: unknown;
  try { body = await req.json(); } catch { body = null; }
  try {
    const svc = createServiceRoleClient();
    const row = await findChallenge(svc, c);
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
    if (Date.parse(row.expires_at) <= Date.now()) return NextResponse.json({ error: 'expired' }, { status: 410, headers: NO_STORE });
    const input = parseAttemptInput(body, row.questions.length);
    if (!input) return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
    const { error } = await svc.from('challenge_attempts').insert({
      challenge_id: row.id,
      player_id: null,
      player_name: (await viewerName()) ?? 'Anonymous',
      score: input.points,
      correct_count: input.score,
      total_songs: input.total,
      best_combo: input.bestCombo,
      time_taken: Math.round(input.timeMs / 100) / 10,
    });
    if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
    return NextResponse.json({ ok: true, won: input.score >= row.creator_correct }, { headers: NO_STORE });
  } catch (e) {
    console.error('[ux-v1/p6/challenge/attempt]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
