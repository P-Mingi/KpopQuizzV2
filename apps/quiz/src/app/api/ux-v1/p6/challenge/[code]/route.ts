import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { CODE_RE } from '@/lib/ux-v1/p6/challenge';
import { challengeView, findChallenge } from '@/lib/ux-v1/p6/challenge-server';

// GET /api/ux-v1/p6/challenge/<code> - a challenge link opened on /blindtest?c=<code>:
// who sent it, their score, the playlist, the expiry, and (while valid) the frozen
// rounds with fresh Deezer preview URLs. READ ONLY. Flag off: 404.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { code } = await ctx.params;
  const c = String(code ?? '').toUpperCase();
  if (!CODE_RE.test(c)) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
  try {
    const svc = createServiceRoleClient();
    const row = await findChallenge(svc, c);
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
    return NextResponse.json(await challengeView(svc, row), { headers: NO_STORE });
  } catch (e) {
    console.error('[ux-v1/p6/challenge/code]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
