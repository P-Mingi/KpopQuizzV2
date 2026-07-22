import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

// GET /api/debate/me -> the viewer's vote for today, so the island can lock the
// buttons for someone who already voted (across devices, not just localStorage).
// { signedIn, voted, side }.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, voted: false, side: null });

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('debate_votes')
    .select('side')
    .eq('date', today)
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    signedIn: true,
    voted: Boolean(data),
    side: (data as { side: 'a' | 'b' } | null)?.side ?? null,
  });
}
