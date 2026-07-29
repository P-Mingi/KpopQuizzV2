import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getSpaceXp } from '@/lib/verse/reputation';

import type { NextRequest } from 'next/server';

// W4.4 - the caller's per-space XP + rank, for the Quest Board progress header/footer.
// Client-fetched so the board page stays ISR.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, xp: 0, role: 'visitor', tier: 'Rookie', nextTier: 'Regular', xpToNext: 100 });
  const xp = await getSpaceXp(user.id, groupId);
  return NextResponse.json({ signedIn: true, ...xp });
}
