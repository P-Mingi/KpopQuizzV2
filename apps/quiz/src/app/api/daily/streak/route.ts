import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// L4 - GET /api/daily/streak. Returns the signed-in user's current streak so the
// home daily card can show "Day N streak". Anon -> streak 0.
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ streak: 0, last_daily_date: null, signed_in: false });
  const { data } = await supabase
    .from('profiles')
    .select('daily_streak, last_daily_date')
    .eq('id', user.id)
    .maybeSingle();
  return NextResponse.json({
    streak: (data?.daily_streak as number | null) ?? 0,
    last_daily_date: (data?.last_daily_date as string | null) ?? null,
    signed_in: true,
  });
}
