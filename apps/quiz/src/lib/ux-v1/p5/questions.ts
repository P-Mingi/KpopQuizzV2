// P5: the list operations of the EXISTS question editor
// (components/quiz/question-list-editor.tsx), as pure functions over the funnel's
// QuestionData[] and the one open row. Same results as the legacy closures
// (patch, move, duplicate, remove, add); questions.test.ts pins them.

import { blankQuestionFor } from '@/lib/quiz-question';

import type { QuestionData } from '@/lib/quiz-question';

export interface ListEdit { questions: QuestionData[]; expanded: number | null }

/** First render: the only question starts open (legacy `questions.length === 1 ? 0 : null`). */
export function initialExpanded(questions: QuestionData[]): number | null {
  return questions.length === 1 ? 0 : null;
}

export function patchAt(questions: QuestionData[], i: number, updated: QuestionData): QuestionData[] {
  return questions.map((q, idx) => (idx === i ? updated : q));
}

/** Reorder; the open row follows its content. Out of range or same index = no change (null). */
export function moveItem(questions: QuestionData[], expanded: number | null, from: number, to: number): ListEdit | null {
  if (to < 0 || to >= questions.length || from === to) return null;
  const next = [...questions];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return { questions: next, expanded: expanded === from ? to : expanded };
}

/** Deep copy right after the row; the copy opens. */
export function duplicateItem(questions: QuestionData[], i: number): ListEdit {
  const copy: QuestionData = JSON.parse(JSON.stringify(questions[i])) as QuestionData;
  return { questions: [...questions.slice(0, i + 1), copy, ...questions.slice(i + 1)], expanded: i + 1 };
}

/** Delete (never the last question); the open row index is kept on its content. */
export function removeItem(questions: QuestionData[], expanded: number | null, i: number): ListEdit | null {
  if (questions.length <= 1) return null;
  return {
    questions: questions.filter((_, idx) => idx !== i),
    expanded: expanded === i ? null : expanded !== null && expanded > i ? expanded - 1 : expanded,
  };
}

/** Append a blank question of the quiz type; it opens (autoExpandNew, the create flow). */
export function addItem(questions: QuestionData[], quizType: string, expanded: number | null, autoExpandNew = true): ListEdit {
  const next = [...questions, blankQuestionFor(quizType)];
  return { questions: next, expanded: autoExpandNew ? next.length - 1 : expanded };
}
