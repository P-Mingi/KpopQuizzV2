import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';
import { BATTLE_QUESTION_COUNT } from '@/lib/battle/select-questions';

import type { NextRequest } from 'next/server';

// E3 - GET /api/battle/[id]/ghost?score=N
// An HONEST async opponent: a recent battle_results row for the same quiz (or
// group), preferring a comparable score, else random recent. NEVER a fake "live"
// player. If the pool is cold, returns a difficulty-based benchmark ("Par"),
// flagged cold so the UI frames it honestly ("be the first - here's par").
export const dynamic = 'force-dynamic';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

interface GhostRow {
  score: number;
  per_question: boolean[];
  time_ms: number;
  player_hash: string;
  created_at: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const scoreParam = new URL(req.url).searchParams.get('score');
  const playerScore = scoreParam !== null && /^\d+$/.test(scoreParam) ? parseInt(scoreParam, 10) : null;

  const supabase = createServiceRoleClient();

  const { data: battle } = await supabase
    .from('battles')
    .select('id, quiz_id, group_slug')
    .eq('id', id)
    .maybeSingle();
  if (!battle) {
    return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  }

  const playerHash = anonHash(req);

  // Candidate ghosts: recent results for the same quiz (or group), excluding this
  // battle's own results and the current player's own runs.
  let query = supabase
    .from('battle_results')
    .select('score, per_question, time_ms, player_hash, created_at, battles!inner(quiz_id, group_slug)')
    .neq('battle_id', id)
    .neq('player_hash', playerHash)
    .order('created_at', { ascending: false })
    .limit(50);
  if (battle.quiz_id) query = query.eq('battles.quiz_id', battle.quiz_id);
  else if (battle.group_slug) query = query.eq('battles.group_slug', battle.group_slug);

  const { data } = await query;
  const pool = (data ?? []) as unknown as GhostRow[];

  if (pool.length > 0) {
    let pick: GhostRow;
    if (playerScore !== null) {
      // Closest score wins; pick randomly among the closest few for variety.
      const sorted = [...pool].sort(
        (a, b) => Math.abs(a.score - playerScore) - Math.abs(b.score - playerScore),
      );
      const closest = sorted.slice(0, Math.min(5, sorted.length));
      pick = closest[Math.floor(Math.random() * closest.length)]!;
    } else {
      pick = pool[Math.floor(Math.random() * pool.length)]!;
    }
    return NextResponse.json({
      ghost: {
        score: pick.score,
        per_question: pick.per_question,
        handle: `@fan_${pick.player_hash.slice(-4)}`,
        played_ago: relativeTime(pick.created_at),
        cold: false,
      },
    });
  }

  // Cold pool: an honest difficulty-based benchmark, not a fake player.
  let difficulty = 'medium';
  if (battle.quiz_id) {
    const { data: quiz } = await supabase.from('quizzes').select('difficulty').eq('id', battle.quiz_id).maybeSingle();
    if (quiz?.difficulty) difficulty = quiz.difficulty as string;
  }
  const par = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 4 : 5;
  const perQuestion = Array.from({ length: BATTLE_QUESTION_COUNT }, (_, i) => i < par);
  for (let i = perQuestion.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perQuestion[i], perQuestion[j]] = [perQuestion[j]!, perQuestion[i]!];
  }
  return NextResponse.json({
    ghost: {
      score: par,
      per_question: perQuestion,
      handle: 'Par',
      played_ago: null,
      cold: true,
    },
  });
}
