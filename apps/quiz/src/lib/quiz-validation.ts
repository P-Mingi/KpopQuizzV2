// Q-B3: single source of truth for quiz-question validation. Used by the API
// routes (POST /api/quiz/create, PUT /api/quiz/[id]) for authoritative
// server-side validation AND by the question list editor for inline per-row
// validity badges. Keeping one implementation means the badges a creator sees
// can never drift from what the server actually enforces.

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 20;

/**
 * Authoritative validator: returns a flat list of human-readable errors for the
 * whole question set. Empty array means the set is publishable. Moved verbatim
 * from the create/edit routes so both call the exact same rules.
 */
export function validateQuestions(questions: unknown[], quizType: string): string[] {
  const errors: string[] = [];
  if (questions.length < MIN_QUESTIONS) errors.push(`Minimum ${MIN_QUESTIONS} questions required`);
  if (questions.length > MAX_QUESTIONS) errors.push(`Maximum ${MAX_QUESTIONS} questions allowed`);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>;
    if (!q || typeof q.question !== 'string' || q.question.trim().length === 0) {
      errors.push(`Question ${i + 1}: question text is required`);
      continue;
    }
    if (q.question.length > 500) {
      errors.push(`Question ${i + 1}: question text must be 500 characters or less`);
    }

    if (quizType === 'multiple_choice' || quizType === 'guess_from_clues' || quizType === 'image') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Question ${i + 1}: must have 4 options`);
      } else {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          if (typeof opt !== 'string' || opt.trim().length === 0) {
            errors.push(`Question ${i + 1}: option ${j + 1} is required`);
          } else if (opt.length > 200) {
            errors.push(`Question ${i + 1}: option ${j + 1} must be 200 characters or less`);
          }
        }
      }
      if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
        errors.push(`Question ${i + 1}: correct answer index must be 0-3`);
      }
      if (quizType === 'image' && (typeof q.image_url !== 'string' || q.image_url.trim().length === 0)) {
        errors.push(`Question ${i + 1}: image_url is required`);
      }
    }

    if (quizType === 'intruder') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Question ${i + 1}: must have 4 options`);
      } else {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j] as Record<string, unknown>;
          if (!opt || typeof opt.label !== 'string' || opt.label.trim().length === 0) {
            errors.push(`Question ${i + 1}: option ${j + 1} label is required`);
          }
          if (!opt || typeof opt.image_url !== 'string' || opt.image_url.trim().length === 0) {
            errors.push(`Question ${i + 1}: option ${j + 1} image_url is required`);
          }
        }
      }
      if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
        errors.push(`Question ${i + 1}: correct answer index must be 0-3`);
      }
    }

    if (quizType === 'true_false') {
      if (typeof q.correct !== 'boolean') {
        errors.push(`Question ${i + 1}: correct must be true or false`);
      }
    }

    if (quizType === 'guess_from_clues') {
      if (!Array.isArray(q.clues) || q.clues.length !== 3) {
        errors.push(`Question ${i + 1}: must have 3 clues`);
      } else {
        for (let j = 0; j < q.clues.length; j++) {
          const clue = q.clues[j];
          if (typeof clue !== 'string' || clue.trim().length === 0) {
            errors.push(`Question ${i + 1}: clue ${j + 1} is required`);
          }
        }
      }
    }

    if (q.fun_fact !== undefined && typeof q.fun_fact === 'string' && q.fun_fact.length > 280) {
      errors.push(`Question ${i + 1}: fun fact must be 280 characters or less`);
    }
  }

  return errors;
}

export interface QuestionIssue {
  code: 'empty-question' | 'empty-option' | 'dup-option' | 'no-correct' | 'missing-clue' | 'missing-image';
  label: string;
}

interface EditorQuestionLike {
  question?: string;
  options?: unknown;
  correct?: unknown;
  clues?: unknown;
  image_url?: unknown;
  fun_fact?: string;
}

/**
 * Per-question issues for the editor's inline validity badges. Same rules as
 * validateQuestions but scoped to one question and returned as short labels.
 * A question with zero issues is publishable.
 */
export function questionIssues(q: EditorQuestionLike, quizType: string): QuestionIssue[] {
  const issues: QuestionIssue[] = [];
  const text = typeof q.question === 'string' ? q.question.trim() : '';
  if (!text) issues.push({ code: 'empty-question', label: 'Missing question' });

  if (quizType === 'multiple_choice' || quizType === 'guess_from_clues' || quizType === 'image') {
    const opts = Array.isArray(q.options) ? (q.options as unknown[]).map((o) => (typeof o === 'string' ? o.trim() : '')) : [];
    if (opts.length !== 4 || opts.some((o) => !o)) {
      issues.push({ code: 'empty-option', label: 'Empty answer' });
    }
    const filled = opts.filter(Boolean).map((o) => o.toLowerCase());
    if (new Set(filled).size !== filled.length) {
      issues.push({ code: 'dup-option', label: 'Duplicate answers' });
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
      issues.push({ code: 'no-correct', label: 'No correct answer' });
    }
    if (quizType === 'guess_from_clues') {
      const clues = Array.isArray(q.clues) ? (q.clues as unknown[]) : [];
      if (clues.length !== 3 || clues.some((c) => typeof c !== 'string' || !c.trim())) {
        issues.push({ code: 'missing-clue', label: 'Needs 3 clues' });
      }
    }
    if (quizType === 'image' && (typeof q.image_url !== 'string' || !q.image_url.trim())) {
      issues.push({ code: 'missing-image', label: 'Missing image' });
    }
  }

  if (quizType === 'true_false' && typeof q.correct !== 'boolean') {
    issues.push({ code: 'no-correct', label: 'Pick true or false' });
  }

  if (quizType === 'intruder') {
    const opts = Array.isArray(q.options) ? (q.options as Record<string, unknown>[]) : [];
    if (opts.length !== 4 || opts.some((o) => !o || typeof o.label !== 'string' || !o.label.trim())) {
      issues.push({ code: 'empty-option', label: 'Empty label' });
    }
    if (opts.length !== 4 || opts.some((o) => !o || typeof o.image_url !== 'string' || !o.image_url.trim())) {
      issues.push({ code: 'missing-image', label: 'Missing image' });
    }
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
      issues.push({ code: 'no-correct', label: 'No intruder set' });
    }
  }

  return issues;
}

export function isQuestionValid(q: EditorQuestionLike, quizType: string): boolean {
  return questionIssues(q, quizType).length === 0;
}
