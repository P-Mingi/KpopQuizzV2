import { NextResponse } from 'next/server';

import { UX_V1 } from '@/lib/ux-v1';
import { isUuid } from '@/lib/anon-claim';
import { createServerClient } from '@/lib/supabase/server';
import { quizRankForScore, quizRankForUser } from '@/lib/editorial/surfaces/quiz-rank';

import type { P4Standing } from '@/lib/ux-v1/p4/standing';
import type { NextRequest } from 'next/server';

// GET /api/ux-v1/p4/standing?quiz=<id>[&score=<n>] - read only.
// Signed in: your standing on this quiz's board, from the same get_quiz_rank RPC as
// the legacy /api/quiz/[id]/my-rank (migration 098), plus when your best was set
// ("Your best 2/8 · 6 hours ago"). The user id is the session's, never client input.
// Guest with a score: where that score lands on the same board, through
// get_quiz_rank_for_score (docs/pending-migrations/v11-p4-rank-for-score.sql); while
// that function is not applied the answer is rank null and the results screen shows
// no rank line (fail soft, nothing fabricated). Flag off: 404.
// Every answer carries every key of P4Standing (C2-008: a signed-in fan with no stored
// play got no `rank` key, and the results tested `rank !== null`).

export const dynamic = 'force-dynamic';

interface RankRow { best_score: number | null; total_questions: number | null; rank: number | null; total_players: number | null }

const NONE = { played: false, bestScore: null, total: null, rank: null, totalPlayers: null, bestAt: null } as const;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const quizId = req.nextUrl.searchParams.get('quiz');
  if (!isUuid(quizId)) return NextResponse.json({ error: 'quiz_required' }, { status: 400 });
  const scoreParam = req.nextUrl.searchParams.get('score');
  const score = scoreParam !== null && /^\d{1,4}$/.test(scoreParam) ? Number(scoreParam) : null;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data } = await quizRankForUser(supabase, quizId, user.id);
    const row = (Array.isArray(data) ? data[0] : data) as RankRow | null;
    if (!row || row.best_score === null) return NextResponse.json({ ...NONE, signedIn: true, totalPlayers: row?.total_players ?? null } satisfies P4Standing);
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
    } satisfies P4Standing);
  }

  if (score === null) return NextResponse.json({ ...NONE, signedIn: false } satisfies P4Standing);
  const { data, error } = await quizRankForScore(supabase, quizId, score);
  if (error) return NextResponse.json({ ...NONE, signedIn: false } satisfies P4Standing);
  const row = (Array.isArray(data) ? data[0] : data) as { rank: number | null; total_players: number | null } | null;
  return NextResponse.json({ ...NONE, signedIn: false, rank: row?.rank ?? null, totalPlayers: row?.total_players ?? null } satisfies P4Standing);
}
