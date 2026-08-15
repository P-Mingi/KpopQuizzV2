import type { SupabaseClient } from '@supabase/supabase-js';

// E2 - battle question selection from the existing quiz bank. A battle is 7
// four-option multiple-choice questions (the A/B/C/D battle UI), snapshotted onto
// the battle so both players + the ghost see identical questions.

export const BATTLE_QUESTION_COUNT = 7;

export interface BattleQuestion {
  question: string;
  options: string[]; // exactly 4
  correct: number; // 0-3
  fun_fact: string | null;
}

interface QuizRow {
  id: string;
  group_id: number | null;
  questions: unknown[];
}

/** Pull only valid 4-option multiple-choice questions out of a quiz's JSONB. */
function extractMC(questions: unknown[] | null): BattleQuestion[] {
  const out: BattleQuestion[] = [];
  for (const raw of questions ?? []) {
    const q = raw as Record<string, unknown>;
    if (
      typeof q.question === 'string' &&
      q.question.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every((o) => typeof o === 'string' && o.trim().length > 0) &&
      typeof q.correct === 'number' &&
      q.correct >= 0 &&
      q.correct <= 3
    ) {
      out.push({
        question: q.question,
        options: q.options as string[],
        correct: q.correct,
        fun_fact: typeof q.fun_fact === 'string' ? q.fun_fact : null,
      });
    }
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Add unique-by-question-text questions from `more` into `pool` until full. */
function topUp(pool: BattleQuestion[], more: BattleQuestion[]): void {
  const seen = new Set(pool.map((q) => q.question.trim().toLowerCase()));
  for (const q of shuffle(more)) {
    if (pool.length >= BATTLE_QUESTION_COUNT) break;
    const key = q.question.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      pool.push(q);
    }
  }
}

export interface SelectResult {
  questions: BattleQuestion[];
  quizId: string | null;
  groupSlug: string | null;
  groupId: number | null;
}

/**
 * Select 7 battle questions.
 *  - quiz mode: the quiz's own MC questions first; if < 7, top up from OTHER
 *    published quizzes in the same group, then from any published quiz.
 *  - group mode: sample across the group's published quizzes; top up from any
 *    published quiz if the group is thin.
 * Returns < 7 only if the entire bank cannot supply 7 four-option questions.
 */
export async function selectBattleQuestions(
  supabase: SupabaseClient,
  opts: { quizId?: string | null; groupSlug?: string | null; generation?: string | null; difficulty?: string | null },
): Promise<SelectResult> {
  const pool: BattleQuestion[] = [];
  let quizId: string | null = null;
  let groupSlug: string | null = opts.groupSlug ?? null;
  let groupId: number | null = null;
  const generation = opts.generation ?? null;
  const difficulty = opts.difficulty ?? null;

  // W2b B2/B3: a FILTERED request (generation or difficulty) must never be
  // silently widened. If "hard ATEEZ" cannot fill a battle we return what exists
  // and the route says so, rather than quietly serving easy questions from another
  // group and calling it a hard ATEEZ battle.
  const filtered = generation !== null || difficulty !== null;

  // Generation mode: resolve the real groups in that generation. groups.generation
  // holds '2nd Gen'..'5th Gen' (7 groups with quizzes have none, and are excluded
  // rather than guessed at).
  let generationGroupIds: number[] | null = null;
  if (generation) {
    const { data: genGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('generation', generation)
      .gt('quiz_count', 0);
    generationGroupIds = ((genGroups ?? []) as Array<{ id: number }>).map((g) => g.id);
  }

  if (opts.quizId) {
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, group_id, questions, status')
      .eq('id', opts.quizId)
      .maybeSingle();
    if (quiz && quiz.status === 'published') {
      quizId = quiz.id as string;
      groupId = (quiz.group_id as number | null) ?? null;
      topUp(pool, extractMC(quiz.questions as unknown[]));
    }
  } else if (opts.groupSlug) {
    const { data: group } = await supabase
      .from('groups').select('id, slug').eq('slug', opts.groupSlug).maybeSingle();
    groupId = (group?.id as number | undefined) ?? null;
  }

  // Generation mode: sample across every group in that generation.
  if (pool.length < BATTLE_QUESTION_COUNT && generationGroupIds !== null) {
    if (generationGroupIds.length > 0) {
      let genQuery = supabase
        .from('quizzes')
        .select('id, group_id, questions')
        .in('group_id', generationGroupIds)
        .eq('status', 'published')
        .limit(80);
      if (difficulty) genQuery = genQuery.eq('difficulty', difficulty);
      const { data: genQuizzes } = await genQuery;
      for (const q of shuffle((genQuizzes ?? []) as QuizRow[])) {
        topUp(pool, extractMC(q.questions));
        if (pool.length >= BATTLE_QUESTION_COUNT) break;
      }
    }
  }

  // Top up from the same group's other published quizzes.
  if (pool.length < BATTLE_QUESTION_COUNT && groupId !== null) {
    let groupQuery = supabase
      .from('quizzes')
      .select('id, group_id, questions')
      .eq('group_id', groupId)
      .eq('status', 'published')
      .limit(40);
    if (difficulty) groupQuery = groupQuery.eq('difficulty', difficulty);
    const { data: groupQuizzes } = await groupQuery;
    for (const q of (groupQuizzes ?? []) as QuizRow[]) {
      if (q.id === quizId) continue;
      topUp(pool, extractMC(q.questions));
      if (pool.length >= BATTLE_QUESTION_COUNT) break;
    }
  }

  // Last resort: top up from any popular published quiz so a battle always has 7.
  // SKIPPED for a filtered request: widening would break the promise the player
  // picked (see `filtered` above).
  if (pool.length < BATTLE_QUESTION_COUNT && !filtered) {
    const { data: anyQuizzes } = await supabase
      .from('quizzes')
      .select('id, group_id, questions')
      .eq('status', 'published')
      .order('play_count', { ascending: false })
      .limit(60);
    for (const q of (anyQuizzes ?? []) as QuizRow[]) {
      topUp(pool, extractMC(q.questions));
      if (pool.length >= BATTLE_QUESTION_COUNT) break;
    }
  }

  const picked = shuffle(pool).slice(0, BATTLE_QUESTION_COUNT);

  // E6: fan-submitted questions promoted to 'live' are eligible. They are rare,
  // so we splice up to 2 into the set (rewarding the creation loop) rather than
  // letting them flood it.
  if (picked.length === BATTLE_QUESTION_COUNT && (quizId || groupSlug)) {
    let live = supabase
      .from('pending_questions')
      .select('question, options, correct_index')
      .eq('status', 'live')
      .limit(20);
    live = quizId ? live.eq('quiz_id', quizId) : live.eq('group_slug', groupSlug as string);
    const { data: liveRows } = await live;
    const liveQs: BattleQuestion[] = [];
    const seen = new Set(picked.map((q) => q.question.trim().toLowerCase()));
    for (const r of shuffle((liveRows ?? []) as Array<{ question: string; options: string[]; correct_index: number }>)) {
      const key = r.question.trim().toLowerCase();
      if (Array.isArray(r.options) && r.options.length === 4 && !seen.has(key)) {
        seen.add(key);
        liveQs.push({ question: r.question, options: r.options, correct: r.correct_index, fun_fact: null });
      }
      if (liveQs.length >= 2) break;
    }
    for (let i = 0; i < liveQs.length; i++) picked[BATTLE_QUESTION_COUNT - 1 - i] = liveQs[i]!;
  }

  return { questions: shuffle(picked).slice(0, BATTLE_QUESTION_COUNT), quizId, groupSlug, groupId };
}
