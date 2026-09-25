import { NextResponse } from 'next/server';

import { UX_V1 } from '@/lib/ux-v1';
import { isUuid } from '@/lib/anon-claim';
import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// GET /api/ux-v1/p4/standing?quiz=<id>[&score=<n>] - read only.
// Signed in: your standing on this quiz's board, from the same get_quiz_rank RPC as
// the legacy /api/quiz/[id]/my-rank (migration 098), plus when your best was set
// ("Your best 2/8 · 6 hours ago"). The user id is the session's, never client input.
// Guest with a score: where that score lands on the same board, through
// get_quiz_rank_for_score (docs/pending-migrations/v11-p4-rank-for-score.sql); while
// that function is not applied the answer is rank null and the results screen shows
// no rank line (fail soft, nothing fabricated). Flag off: 404.

export const dynamic = 'force-dynamic';

interface RankRow { best_score: number | null; total_questions: number | null; rank: number | null; total_players: number | null }

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const quizId = req.nextUrl.searchParams.get('quiz');
  if (!isUuid(quizId)) return NextResponse.json({ error: 'quiz_required' }, { status: 400 });
  const scoreParam = req.nextUrl.searchParams.get('score');
  const score = scoreParam !== null && /^\d{1,4}$/.test(scoreParam) ? Number(scoreParam) : null;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase.rpc('get_quiz_rank', { p_quiz_id: quizId, p_user_id: user.id });
    const row = (Array.isArray(data) ? data[0] : data) as RankRow | null;
    if (!row || row.best_score === null) return NextResponse.json({ signedIn: true, played: false, totalPlayers: row?.total_players ?? null });
    const { data: best } = await supabase
      .from('plays')
      .select('created_at')
      .eq('quiz_id', quizId)
      .eq('player_id', user.id)
      .eq('score', row.best_score)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({
      signedIn: true,
      played: true,
      bestScore: row.best_score,
      total: row.total_questions,
      rank: row.rank,
      totalPlayers: row.total_players,
      bestAt: (best?.created_at as string | undefined) ?? null,
    });
  }

  if (score === null) return NextResponse.json({ signedIn: false, rank: null, totalPlayers: null });
  const { data, error } = await supabase.rpc('get_quiz_rank_for_score', { p_quiz_id: quizId, p_score: score });
  if (error) return NextResponse.json({ signedIn: false, rank: null, totalPlayers: null });
  const row = (Array.isArray(data) ? data[0] : data) as { rank: number | null; total_players: number | null } | null;
  return NextResponse.json({ signedIn: false, rank: row?.rank ?? null, totalPlayers: row?.total_players ?? null });
}
