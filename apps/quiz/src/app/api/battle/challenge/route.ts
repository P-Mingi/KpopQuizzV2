import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';

import type { NextRequest } from 'next/server';
import type { BattleQuestion } from '@/lib/battle/select-questions';

// W2 PART A - POST /api/battle/challenge
// Creates a battle FROM A QUIZ RUN THAT WAS JUST PLAYED, so the opponent faces the
// SAME quiz, the SAME questions, and a real score to beat.
//
// Why this is not /api/battle/start: that route calls selectBattleQuestions() and
// mints a FRESH random 7, which is exactly the bug this workstream exists to fix
// (the player's run carried no stake into the battle). selectBattleQuestions has no
// "use exactly these questions" mode, so a separate creator is the honest fix.
//
// No DDL: battles already has quiz_id / question_ids / questions / challenger_hash /
// challenger_score, and battle_results holds one row per player run.
//
// Trust model: the client sends the ORDER it played, never the content. Every
// submitted question is matched against the quiz's own stored questions and the
// SERVER's copy is what gets persisted, so a forged body cannot inject text or move
// the correct answer. Score is client-reported, exactly as the rest of the battle
// and quiz system already works (see battle-game.tsx, which scores client-side).
export const dynamic = 'force-dynamic';

// One challenger can open at most this many battles per hour. The pool is a public
// surface: without a cap one client could flood every opponent's "random" draw.
const CHALLENGES_PER_HOUR = 20;

type QuizRow = { id: string; status: string; group_id: number | null; questions: unknown };
type IncomingQuestion = { question?: unknown; options?: unknown };

/**
 * Stable identity for a question: its text plus its option SET.
 *
 * Order-insensitive on the options by design. Quizzes with `settings.shuffle` (the
 * common case) serve both the questions AND each question's options in a random
 * order, so a genuine run legitimately differs from the stored row. Sorting lets
 * the real run match while still rejecting altered text or a swapped option set,
 * and the correct answer is never taken from the client: the server persists its
 * own question object.
 */
function questionKey(q: { question: string; options: string[] }): string {
  return `${q.question.trim()} ${[...q.options].sort().join('|')}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: {
    quizId?: unknown;
    questions?: unknown;
    score?: unknown;
    per_question?: unknown;
    time_ms?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const quizId = body.quizId;
  const played = body.questions;
  const score = body.score;
  const perQuestion = body.per_question;
  const timeMs = body.time_ms;

  if (
    typeof quizId !== 'string' || quizId.length === 0 ||
    !Array.isArray(played) || played.length === 0 || played.length > 50 ||
    typeof score !== 'number' || !Number.isFinite(score) || score < 0 ||
    !Array.isArray(perQuestion) || !perQuestion.every((b) => typeof b === 'boolean') ||
    perQuestion.length !== played.length ||
    typeof timeMs !== 'number' || !Number.isFinite(timeMs) || timeMs < 0
  ) {
    return NextResponse.json({ error: 'Invalid challenge payload' }, { status: 400 });
  }
  if (score > played.length) {
    return NextResponse.json({ error: 'Score exceeds the questions played' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, status, group_id, questions')
    .eq('id', quizId)
    .maybeSingle<QuizRow>();

  if (!quiz || quiz.status !== 'published') {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  // Canonical questions, straight off the quiz row. quizzes.questions and
  // battles.questions are the same shape ({question, options, correct, fun_fact}),
  // so the snapshot needs no mapping.
  const canonical = Array.isArray(quiz.questions) ? (quiz.questions as BattleQuestion[]) : [];
  if (canonical.length === 0) {
    return NextResponse.json({ error: 'Quiz has no questions' }, { status: 400 });
  }
  const byKey = new Map<string, BattleQuestion>();
  for (const q of canonical) {
    if (q && typeof q.question === 'string' && Array.isArray(q.options)) byKey.set(questionKey(q), q);
  }

  // Resolve each played question back to the server's own copy. Anything we cannot
  // match is a forged or stale payload, and we refuse rather than persist it.
  const snapshot: BattleQuestion[] = [];
  for (const raw of played as IncomingQuestion[]) {
    if (!raw || typeof raw.question !== 'string' || !Array.isArray(raw.options)) {
      return NextResponse.json({ error: 'Invalid challenge payload' }, { status: 400 });
    }
    const match = byKey.get(questionKey({ question: raw.question, options: raw.options as string[] }));
    if (!match) {
      return NextResponse.json({ error: 'Questions do not match this quiz' }, { status: 400 });
    }
    snapshot.push(match);
  }

  const challengerHash = anonHash(req);

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count: recent } = await supabase
    .from('battles')
    .select('id', { count: 'exact', head: true })
    .eq('challenger_hash', challengerHash)
    .gte('created_at', since);
  if ((recent ?? 0) >= CHALLENGES_PER_HOUR) {
    return NextResponse.json(
      { error: 'rate_limited', max_per_hour: CHALLENGES_PER_HOUR },
      { status: 429 },
    );
  }

  // group_slug is stored alongside quiz_id (the /start path leaves it null on the
  // quiz route). PART B's "prefer the same group" draw reads it, and the ghost
  // route already prefers quiz_id when both are present, so nothing regresses.
  let groupSlug: string | null = null;
  if (quiz.group_id !== null) {
    const { data: group } = await supabase
      .from('groups')
      .select('slug')
      .eq('id', quiz.group_id)
      .maybeSingle<{ slug: string }>();
    groupSlug = group?.slug ?? null;
  }

  // challenger_score is set at insert: GET /api/battle/[id] returns challenger:null
  // while it is null, and the accepting client then silently falls back to a ghost.
  // A challenge is only a challenge once the score is on the row.
  const { data: battle, error } = await supabase
    .from('battles')
    .insert({
      quiz_id: quiz.id,
      group_slug: groupSlug,
      // question_ids is uuid[] NOT NULL and is never read anywhere in the app; the
      // /start route fills it with throwaway ids for the same reason. Matching that
      // rather than inventing a meaning for it.
      question_ids: snapshot.map(() => crypto.randomUUID()),
      questions: snapshot,
      challenger_hash: challengerHash,
      challenger_score: score,
    })
    .select('id')
    .single();

  if (error || !battle) {
    console.error('Failed to create challenge:', error?.message);
    return NextResponse.json({ error: 'Could not create challenge' }, { status: 500 });
  }

  // The challenger's own run, recorded as a real battle_results row. This is what
  // makes a completed challenge hold TWO result rows (challenger + accepter), the
  // shape the passport trigger and GET /api/battle/[id] were already written for.
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();

  const { error: resultError } = await supabase.from('battle_results').insert({
    battle_id: battle.id,
    player_hash: challengerHash,
    user_id: user?.id ?? null,
    score,
    per_question: perQuestion,
    time_ms: Math.round(timeMs),
  });
  if (resultError) {
    // The battle itself is valid and playable, so this is not fatal: challenger_score
    // still carries the stake. Logged loudly because the per-question breakdown the
    // opponent sees comes from this row.
    console.error('Challenge created but challenger result row failed:', resultError.message);
  }

  return NextResponse.json({ battleId: battle.id, questionCount: snapshot.length });
}
