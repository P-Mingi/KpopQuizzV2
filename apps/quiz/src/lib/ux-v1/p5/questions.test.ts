import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { blankQuestionFor } from '@/lib/quiz-question';

import { addItem, duplicateItem, initialExpanded, moveItem, patchAt, removeItem } from './questions';

import type { QuestionData } from '@/lib/quiz-question';

// The v11 question list keeps the EXISTS editor's list model: this test lifts the
// closures of components/quiz/question-list-editor.tsx (patch, move, duplicate,
// remove, add) out of the source and runs them next to lib/ux-v1/p5/questions.ts.

const here = path.dirname(fileURLToPath(import.meta.url));
const EDITOR = fs.readFileSync(path.resolve(here, '../../../components/quiz/question-list-editor.tsx'), 'utf8');

interface Ops {
  patch: (i: number, u: QuestionData) => void;
  move: (from: number, to: number) => void;
  duplicate: (i: number) => void;
  remove: (i: number) => void;
  add: () => void;
}

/** Runs one legacy operation on (questions, expanded) and returns what it produced. */
function legacy(questions: QuestionData[], expanded: number | null, quizType: string, run: (o: Ops) => void): { questions: QuestionData[]; expanded: number | null; changed: boolean } {
  const a = EDITOR.indexOf('  const patch = (i: number');
  const b = EDITOR.indexOf('  return (\n    <div className="qle">');
  if (a < 0 || b < 0) throw new Error('question-list-editor.tsx layout changed: update the parity test');
  const js = ts.transpileModule(`${EDITOR.slice(a, b)}\nreturn { patch, move, duplicate, remove, add };`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
  let outQs = questions;
  let outExp = expanded;
  let changed = false;
  const onChange = (qs: QuestionData[]): void => { outQs = qs; changed = true; };
  const setExpanded = (v: number | null | ((c: number | null) => number | null)): void => { outExp = typeof v === 'function' ? v(outExp) : v; };
  const ops = new Function('questions', 'quizType', 'onChange', 'setExpanded', 'autoExpandNew', 'blankQuestionFor', js)(questions, quizType, onChange, setExpanded, true, blankQuestionFor) as Ops;
  run(ops);
  return { questions: outQs, expanded: outExp, changed };
}

const q = (s: string): QuestionData => ({ question: s, options: [s, 'b', 'c', 'd'], correct: 0, fun_fact: '' });
const LIST = [q('one'), q('two'), q('three'), q('four')];

describe('question list operations = question-list-editor.tsx', () => {
  it('initial open row', () => {
    expect(EDITOR).toContain('useState<number | null>(questions.length === 1 ? 0 : null)');
    expect(initialExpanded([q('a')])).toBe(0);
    expect(initialExpanded(LIST)).toBeNull();
  });
  it('patch', () => {
    const u = q('changed');
    const l = legacy(LIST, 1, 'multiple_choice', (o) => o.patch(2, u));
    expect(patchAt(LIST, 2, u)).toEqual(l.questions);
  });
  it.each([[0, 1, 0], [0, 3, 0], [3, 0, 3], [2, 1, 1], [1, 2, null], [0, -1, 0], [3, 4, 3], [2, 2, 2]])('move %i -> %i (open %s)', (from, to, open) => {
    const l = legacy(LIST, open, 'multiple_choice', (o) => o.move(from, to));
    const v = moveItem(LIST, open, from, to);
    if (!l.changed) { expect(v).toBeNull(); return; }
    expect(v).toEqual({ questions: l.questions, expanded: l.expanded });
  });
  it.each([0, 2, 3])('duplicate %i', (i) => {
    const l = legacy(LIST, null, 'multiple_choice', (o) => o.duplicate(i));
    const v = duplicateItem(LIST, i);
    expect(v).toEqual({ questions: l.questions, expanded: l.expanded });
    expect(v.questions[i + 1]).not.toBe(LIST[i]);
  });
  it.each([[0, null], [1, 1], [1, 3], [3, 0], [2, 2]])('remove %i (open %s)', (i, open) => {
    const l = legacy(LIST, open, 'multiple_choice', (o) => o.remove(i));
    expect(removeItem(LIST, open, i)).toEqual({ questions: l.questions, expanded: l.expanded });
  });
  it('never removes the last question', () => {
    const l = legacy([q('only')], 0, 'multiple_choice', (o) => o.remove(0));
    expect(l.changed).toBe(false);
    expect(removeItem([q('only')], 0, 0)).toBeNull();
  });
  it.each(['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'])('add (%s)', (t) => {
    const l = legacy(LIST, 1, t, (o) => o.add());
    expect(addItem(LIST, t, 1)).toEqual({ questions: l.questions, expanded: l.expanded });
  });
});
