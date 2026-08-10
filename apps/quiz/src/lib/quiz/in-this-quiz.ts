import type { QuizType, QuizWithGroup } from '@/lib/db/types';

/**
 * SEO indexguard PART 3 - the cold-start "In this quiz" block.
 *
 * New quizzes (0 plays) render thin pages: no stats, no reviews, no comments.
 * This derives a small, crawlable, UNIQUE-BY-CONSTRUCTION summary from the quiz's
 * OWN data only (never fabricated, never guessed): the question format + count,
 * the group/difficulty context, and 1-2 sample question PROMPTS. Prompts only,
 * never options / correct answers / clues - spoiler-safe by construction.
 */
export interface InThisQuizData {
  /** e.g. "12 multiple-choice questions" - format present, derived from quiz_type + count. */
  topicsLine: string;
  /** e.g. "BTS · Hard · 12 questions" - all three already on the row. */
  contextLine: string;
  /** 1-2 question prompts, trimmed, spoiler-safe (prompt text only). */
  sampleQuestions: string[];
}

const TYPE_LABELS: Record<QuizType, string> = {
  multiple_choice: 'multiple-choice',
  true_false: 'true-or-false',
  guess_from_clues: 'guess-from-clues',
  image: 'image-based',
  intruder: 'odd-one-out',
};

const MAX_PROMPT = 160;
const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

type QuizLike = Pick<QuizWithGroup, 'quiz_type' | 'questions' | 'group_name' | 'difficulty'>;

export function buildInThisQuiz(quiz: QuizLike): InThisQuizData | null {
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const count = questions.length;
  if (count === 0) return null;

  const label = TYPE_LABELS[quiz.quiz_type] ?? 'kpop';
  const topicsLine = `${count} ${label} question${count === 1 ? '' : 's'}`;
  const contextLine = `${quiz.group_name} · ${cap(quiz.difficulty)} · ${count} question${count === 1 ? '' : 's'}`;

  // Spoiler-safe: read ONLY the `question` prompt off each item, never options/correct.
  const sampleQuestions = questions
    .map((q) => (q && typeof q === 'object' && 'question' in q && typeof (q as { question: unknown }).question === 'string'
      ? (q as { question: string }).question.trim() : ''))
    .filter((s): s is string => s.length > 0)
    .slice(0, 2)
    .map((s) => (s.length > MAX_PROMPT ? `${s.slice(0, MAX_PROMPT - 1).trimEnd()}…` : s));

  return { topicsLine, contextLine, sampleQuestions };
}
