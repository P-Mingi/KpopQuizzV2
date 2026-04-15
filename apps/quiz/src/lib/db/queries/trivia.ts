import { createServerClient } from '@/lib/supabase/server';

const TRIVIA_MIN_FACTS = 12;

/**
 * Check whether a group has enough unique fun_facts to render
 * a trivia page (>=12 unique facts with length > 20 chars).
 * Used to conditionally show the trivia link on quiz pages.
 */
export async function hasTriviaPage(groupId: number): Promise<boolean> {
  const supabase = await createServerClient();

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('questions')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(200);

  if (!quizzes || quizzes.length === 0) return false;

  const seen = new Set<string>();
  let count = 0;

  for (const quiz of quizzes) {
    const questions = quiz.questions as Array<{ fun_fact?: string }>;
    for (const q of questions) {
      if (q.fun_fact && q.fun_fact.trim().length > 20) {
        const normalized = q.fun_fact.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const key = normalized.slice(0, 60);
        if (!seen.has(key)) {
          seen.add(key);
          count++;
          if (count >= TRIVIA_MIN_FACTS) return true;
        }
      }
    }
  }

  return false;
}
