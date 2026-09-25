import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { readBoard } from '@/lib/ux-v1/p6/board';

// GET /api/ux-v1/p6/board - today's Blindtest of the day board for the v11 hub:
// top 5 with identity flair, players today, time to the next daily, and for a
// signed-in viewer their own row (played today = one try used), best daily score
// and rank title. READ ONLY (selects and head counts). Flag off: 404, so the
// flag-off site has no new endpoint.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await readBoard(createServiceRoleClient(), user?.id ?? null);
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (e) {
    console.error('[ux-v1/p6/board]', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'board_unavailable' }, { status: 503, headers: NO_STORE });
  }
}
