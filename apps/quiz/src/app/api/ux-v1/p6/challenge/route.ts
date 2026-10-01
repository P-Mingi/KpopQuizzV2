import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { parseChallengeInput } from '@/lib/ux-v1/p6/challenge';
import { createChallenge, viewerName } from '@/lib/ux-v1/p6/challenge-server';

// POST /api/ux-v1/p6/challenge - "Challenge a friend with these exact songs"
// (DESIGN-SPEC 16.7, WIRING-MAP 12, NEW). Body: { playlist, questions (the run's
// rounds, no preview URLs), score, total, points, timeMs, bestCombo }. Every round
// is checked against `songs` (the correct answer must be that song's title or
// artist) before one `challenges` row is inserted with a 48 h expiry. Returns
// { code, path, expiresAt }. Writes nothing else. Flag off: 404.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function POST(req: Request): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { body = null; }
  const input = parseChallengeInput(body);
  if (!input) return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
  try {
    const result = await createChallenge(createServiceRoleClient(), input, await viewerName());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
    return NextResponse.json({ code: result.code, path: result.path, expiresAt: result.expiresAt }, { headers: NO_STORE });
  } catch (e) {
    console.error('[ux-v1/p6/challenge]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
