import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';
import { fetchFinishedGroupBattles, playersByBattle, isOpenRun } from '@/lib/db/queries/open-runs';

import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// W2 PART B (pull side) - GET /api/battle/random?groupSlug=&score=
// Serves ONE existing OPEN challenge left by another real player.
//
// COVENANT: the opponent is always a real recorded human run. This route only ever
// returns a battles row that a human actually created and finished. It never
// fabricates an opponent, never pads the pool, and never serves a player their own
// run (filtered by challenger_hash AND by any prior result row from this player).
//
// "Open" = the challenger finished it (challenger_score is set) and nobody OTHER
// than the challenger has recorded a run against it yet.
//
// Ranking: same group first, then the closest challenger_score to the caller's own
// score, then most recent.
//
// NOTE on /api/battle/pending: the mission asked whether to reuse it. It is NOT an
// opponent queue and it is NOT unused: it serves `pending_questions` for the E6
// crowd-confirm hook and battle-game.tsx calls it on every reveal. Reusing it would
// mean overloading an unrelated endpoint, so this is a new route. See the REPORT.
export const dynamic = 'force-dynamic';

// Bounded candidate scan. PostgREST caps .select() at 1000 rows, so an unbounded
// read would silently truncate and skew the draw. We take a recent window and say
// so, rather than pretending to sample the whole table.
const CANDIDATE_WINDOW = 200;

type BattleRow = {
  id: string;
  quiz_id: string | null;
  group_slug: string | null;
  challenger_hash: string;
  challenger_score: number | null;
  created_at: string;
  questions: unknown;
};

async function fetchCandidates(
  db: SupabaseClient,
  groupSlug: string | null,
  quizId?: string | null,
): Promise<BattleRow[]> {
  let q = db
    .from('battles')
    .select('id, quiz_id, group_slug, challenger_hash, challenger_score, created_at, questions')
    .not('challenger_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(CANDIDATE_WINDOW);
  if (quizId) q = q.eq('quiz_id', quizId);
  else if (groupSlug) q = q.eq('group_slug', groupSlug);
  const { data } = await q;
  return (data ?? []) as BattleRow[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const groupSlug = url.searchParams.get('groupSlug');
  // W2b B1: "same quiz, new opponent" narrows the draw to one quiz first.
  const quizId = url.searchParams.get('quizId');
  const scoreParam = url.searchParams.get('score');
  const myScore = scoreParam && /^\d+$/.test(scoreParam) ? Number(scoreParam) : null;

  const db = createServiceRoleClient();
  const playerHash = anonHash(req);

  // C1-FIX: the group path uses THE shared definition (group_slug OR the battle's
  // quiz resolving to that group). The old `.eq('group_slug', ...)` here is what made
  // 455 of 870 open runs unreachable, not merely uncounted: they are exactly the
  // quiz-anchored battles the result-screen challenge creates.
  const sameQuiz = quizId ? await fetchCandidates(db, null, quizId) : [];
  const grouped = groupSlug ? ((await fetchFinishedGroupBattles(db, groupSlug)) as BattleRow[]) : [];
  const global = await fetchCandidates(db, null);
  const seen = new Set<string>();
  const candidates = [...sameQuiz, ...grouped, ...global].filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });

  if (candidates.length === 0) {
    return NextResponse.json({ battle: null, reason: 'empty_pool' });
  }

  // One read for every candidate's results, so "open" is decided on real rows.
  // Chunked + paginated by the shared helper, so a big candidate set cannot silently
  // truncate and mark a played battle as open.
  const players = await playersByBattle(db, candidates.map((b) => b.id));

  const open = candidates.filter((b) => {
    if (b.challenger_hash === playerHash) return false; // never your own run
    if (players.get(b.id)?.has(playerHash)) return false; // you already answered this one
    return isOpenRun(b, players); // same definition the count uses
  });

  if (open.length === 0) {
    return NextResponse.json({ battle: null, reason: 'no_open_runs' });
  }

  const groupMembers = new Set(grouped.map((b) => b.id));
  open.sort((a, b) => {
    if (groupSlug) {
      // "same group" now means the shared definition, not just the slug column.
      const ga = groupMembers.has(a.id) ? 0 : 1;
      const gb = groupMembers.has(b.id) ? 0 : 1;
      if (ga !== gb) return ga - gb;
    }
    if (myScore !== null) {
      const da = Math.abs((a.challenger_score ?? 0) - myScore);
      const dbs = Math.abs((b.challenger_score ?? 0) - myScore);
      if (da !== dbs) return da - dbs;
    }
    return b.created_at.localeCompare(a.created_at);
  });

  // The ranking is deterministic, so taking open[0] handed EVERY player with the
  // same score the identical run while hundreds sat idle, and a player who did not
  // finish it would be served it again forever. Sample uniformly from the top band
  // instead: still the best-matched runs, spread across them. This picks among REAL
  // rows, it does not invent or reorder anything else.
  const BAND = 10;
  const band = open.slice(0, Math.min(BAND, open.length));
  const pick = band[Math.floor(Math.random() * band.length)]!;

  // Honest stake copy: the real quiz title when the run came from one.
  let quizTitle: string | null = null;
  if (pick.quiz_id) {
    const { data: quiz } = await db
      .from('quizzes')
      .select('title')
      .eq('id', pick.quiz_id)
      .maybeSingle<{ title: string }>();
    quizTitle = quiz?.title ?? null;
  }

  return NextResponse.json({
    battle: {
      battleId: pick.id,
      challengerScore: pick.challenger_score,
      questionCount: Array.isArray(pick.questions) ? pick.questions.length : null,
      quizTitle,
      groupSlug: pick.group_slug,
      // Same synthesized handle shape the challenge loader and ghost route use.
      handle: `@fan_${pick.challenger_hash.slice(-4)}`,
    },
    poolSize: open.length,
  });
}
