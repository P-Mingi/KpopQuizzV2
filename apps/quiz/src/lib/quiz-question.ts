// Q-B6: the shared question model, in a pure (no-React) module so both the
// editor component and the localStorage draft layer can import it without a
// component <-> lib cycle. Mirrors the per-type polymorphism from the audit:
//   multiple_choice / image / guess_from_clues -> options: string[4], correct: index
//   true_false                                 -> correct: boolean, no options
//   intruder                                   -> options: {label,image_url}[4], correct: index
//   image                                      -> + image_url (question picture)
//   guess_from_clues                           -> + clues: string[3]

export interface IntruderOption {
  label: string;
  image_url: string | null;
}

export interface QuestionData {
  question: string;
  options: string[] | IntruderOption[];
  // number = option index (mc/image/clues/intruder), boolean = true/false,
  // null = not chosen yet (a fresh question in the create funnel).
  correct: number | boolean | null;
  fun_fact?: string;
  image_url?: string | null; // image type: the question picture
  clues?: string[]; // guess_from_clues: 3 clues
}

export const QUIZ_TYPES = ['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'] as const;
export type QuizTypeValue = (typeof QUIZ_TYPES)[number];

export function blankQuestionFor(quizType: string): QuestionData {
  switch (quizType) {
    case 'true_false':
      return { question: '', options: [], correct: null, fun_fact: '' };
    case 'guess_from_clues':
      return { question: '', options: ['', '', '', ''], correct: null, clues: ['', '', ''], fun_fact: '' };
    case 'image':
      return { question: '', options: ['', '', '', ''], correct: null, image_url: null, fun_fact: '' };
    case 'intruder':
      return {
        question: '',
        options: [
          { label: '', image_url: null }, { label: '', image_url: null },
          { label: '', image_url: null }, { label: '', image_url: null },
        ],
        correct: null,
        fun_fact: '',
      };
    case 'multiple_choice':
    default:
      return { question: '', options: ['', '', '', ''], correct: null, fun_fact: '' };
  }
}

/**
 * Convert any persisted question to the current QuestionData shape. Old drafts
 * (all multiple_choice) stored `{ question, answers[4], correctIndex, funFact }`;
 * this migrates them without loss. Already-QuestionData rows pass through.
 */
export function migrateQuestion(raw: unknown): QuestionData {
  const q = (raw ?? {}) as Record<string, unknown>;
  // Legacy MC shape has `answers` + `correctIndex` and no `options`.
  if (Array.isArray(q.answers) && q.options === undefined) {
    return {
      question: typeof q.question === 'string' ? q.question : '',
      options: (q.answers as unknown[]).map((a) => (typeof a === 'string' ? a : '')),
      correct: typeof q.correctIndex === 'number' ? q.correctIndex : null,
      fun_fact: typeof q.funFact === 'string' ? q.funFact : '',
    };
  }
  return {
    question: typeof q.question === 'string' ? q.question : '',
    options: Array.isArray(q.options) ? (q.options as QuestionData['options']) : ['', '', '', ''],
    correct: (typeof q.correct === 'number' || typeof q.correct === 'boolean') ? q.correct : null,
    fun_fact: typeof q.fun_fact === 'string' ? q.fun_fact : '',
    ...(q.image_url !== undefined ? { image_url: q.image_url as string | null } : {}),
    ...(Array.isArray(q.clues) ? { clues: q.clues as string[] } : {}),
  };
}
