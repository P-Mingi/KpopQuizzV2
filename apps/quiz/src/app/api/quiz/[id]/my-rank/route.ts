import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// Your standing ON THIS quiz (Workstream M, M1.19). Backs the per-quiz rank client
// island so /q/[slug] stays static/ISR. A concrete, bounded per-quiz rank is
// allowed (unlike a global percentile). user_id is the validated session user,
// never client input.
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, played: false });

  const { data } = await supabase.rpc('get_quiz_rank', { p_quiz_id: id, p_user_id: user.id });
  const row = (Array.isArray(data) ? data[0] : data) as { best_score: number | null; total_questions: number | null; rank: number | null; total_players: number | null } | null;
  if (!row || row.best_score === null) return NextResponse.json({ signedIn: true, played: false });

  return NextResponse.json({
    signedIn: true,
    played: true,
    bestScore: row.best_score,
    total: row.total_questions,
    rank: row.rank,
    totalPlayers: row.total_players,
  });
}
