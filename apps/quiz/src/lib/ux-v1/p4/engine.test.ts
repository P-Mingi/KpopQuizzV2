import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  averagePct, cluePoints, formatDuration, getCorrectIndex, getEffectiveOptions, isAnswerCorrect, maxScoreFor,
  playPayload, progressMarks, questionSeconds, runReducer, trailingStreak,
} from './engine';
import { challengeChip, challengeHref, challengeOutcome, isExpired, orderStoredQuestions, parseChallengeParam, CHALLENGE_TTL_MS } from './challenge';
import { aboutMinutes, cardAverage, relativeTime, stampWords } from './format';

import type { QuestionData, RunAction, RunState } from './engine';
import type { QuizSettings, QuizType } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// "Never fork the scoring": the EXISTS player (components/quiz/quiz-player.tsx)
// keeps its rules inline and does not export them. This test lifts its answer rules
// and its reducer out of the source text, runs them, and checks that the v11 engine
// gives the same result on every case. If anyone changes the legacy rules, this fails.
// ---------------------------------------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url));
const PLAYER = fs.readFileSync(path.resolve(here, '../../../components/quiz/quiz-player.tsx'), 'utf8');

interface Legacy {
  getEffectiveOptions: (q: QuestionData) => string[];
  getCorrectIndex: (q: QuestionData) => number;
  isAnswerCorrect: (q: QuestionData, i: number) => boolean;
  quizReducer: (s: unknown, a: unknown) => unknown;
}

function loadLegacy(): Legacy {
  const start = PLAYER.indexOf('const TRUE_FALSE_OPTIONS');
  const end = PLAYER.indexOf('// Component\n// ============================================');
  if (start < 0 || end < 0) throw new Error('quiz-player.tsx layout changed: update the parity test');
  const src = `${PLAYER.slice(start, end)}\nreturn { getEffectiveOptions, getCorrectIndex, isAnswerCorrect, quizReducer };`;
  const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
  return new Function(js)() as Legacy;
}
const legacy = loadLegacy();

const SETTINGS: QuizSettings = { timer: true, timer_seconds: 15, shuffle: false, show_answers: true };
const MC: QuestionData = { question: 'Which year?', options: ['2018', '2019', '2020', '2021'], correct: 2, fun_fact: 'Fact' };
const TF_BARE_TRUE: QuestionData = { question: 'True or false: A', correct: true };
const TF_BARE_FALSE: QuestionData = { question: 'True or false: B', correct: false };
const TF_OPTS: QuestionData = { question: 'True or false: C', options: ['True', 'False'], correct: false };
const TF_OPTS_REV: QuestionData = { question: 'True or false: D', options: ['False', 'True'], correct: true };
const CLUE: QuestionData = { question: 'Who is it?', options: ['RM', 'Jin', 'Suga', 'J-Hope'], correct: 1, clues: ['c1', 'c2', 'c3'] };
const ALL = [MC, TF_BARE_TRUE, TF_BARE_FALSE, TF_OPTS, TF_OPTS_REV, CLUE];

describe('answer rules = quiz-player.tsx', () => {
  it.each(ALL.map((q) => [q.question, q] as const))('%s', (_n, q) => {
    expect(getEffectiveOptions(q)).toEqual(legacy.getEffectiveOptions(q));
    expect(getCorrectIndex(q)).toBe(legacy.getCorrectIndex(q));
    for (let i = 0; i < 4; i++) expect(isAnswerCorrect(q, i)).toBe(legacy.isAnswerCorrect(q, i));
  });
  it('table', () => {
    expect(getCorrectIndex(TF_BARE_TRUE)).toBe(0);
    expect(getCorrectIndex(TF_BARE_FALSE)).toBe(1);
    expect(getCorrectIndex(TF_OPTS)).toBe(1);
    expect(getCorrectIndex(TF_OPTS_REV)).toBe(1);
    expect(isAnswerCorrect(MC, 2)).toBe(true);
    expect(isAnswerCorrect(MC, 1)).toBe(false);
    expect(isAnswerCorrect(TF_OPTS_REV, 1)).toBe(true);
    expect(isAnswerCorrect(TF_OPTS_REV, 0)).toBe(false);
    expect(maxScoreFor('guess_from_clues', 8)).toBe(24);
    expect(maxScoreFor('multiple_choice', 8)).toBe(8);
    expect([1, 2, 3].map(cluePoints)).toEqual([3, 2, 1]);
  });
});

describe('state machine = quiz-player.tsx quizReducer', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-25T20:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  const run = (reducer: (s: RunState, a: RunAction) => RunState, actions: RunAction[]): RunState[] => {
    let s: RunState = { phase: 'intro' };
    const out: RunState[] = [];
    for (const a of actions) { s = reducer(s, a); out.push(s); }
    return out;
  };
  const result = { type: 'SHOW_RESULT', percentile: 84, passRate: 61, timeTaken: 72, xpEarned: 25, leveledUp: false, newLevel: null, newLevelName: null } as const;

  const cases: Array<[string, QuizType, QuestionData[], RunAction[], QuizSettings]> = [
    ['classic, right / wrong / timeout / result', 'multiple_choice', [MC, TF_OPTS, TF_BARE_TRUE], [
      { type: 'START', questions: [MC, TF_OPTS, TF_BARE_TRUE], settings: SETTINGS, quizType: 'multiple_choice' },
      { type: 'TICK' }, { type: 'TICK' }, { type: 'ANSWER', selectedAnswer: 2 }, { type: 'NEXT_QUESTION' },
      { type: 'ANSWER', selectedAnswer: 0 }, { type: 'NEXT_QUESTION' }, { type: 'TIMEOUT' }, { type: 'NEXT_QUESTION' }, result,
    ], SETTINGS],
    ['untimed (relaxed = timer off)', 'true_false', [TF_BARE_TRUE, TF_BARE_FALSE], [
      { type: 'START', questions: [TF_BARE_TRUE, TF_BARE_FALSE], settings: { ...SETTINGS, timer: false }, quizType: 'true_false' },
      { type: 'ANSWER', selectedAnswer: 0 }, { type: 'NEXT_QUESTION' }, { type: 'ANSWER', selectedAnswer: 1 }, result,
    ], { ...SETTINGS, timer: false }],
    ['clues: reveal, clue answer, timeout', 'guess_from_clues', [CLUE, CLUE, CLUE], [
      { type: 'START', questions: [CLUE, CLUE, CLUE], settings: SETTINGS, quizType: 'guess_from_clues' },
      { type: 'CLUE_ANSWER', selectedAnswer: 1, cluesUsed: 1 }, { type: 'NEXT_QUESTION' },
      { type: 'REVEAL_CLUE' }, { type: 'REVEAL_CLUE' }, { type: 'REVEAL_CLUE' }, { type: 'CLUE_ANSWER', selectedAnswer: 1, cluesUsed: 3 }, { type: 'NEXT_QUESTION' },
      { type: 'TIMEOUT' }, result, { type: 'RESET' },
    ], SETTINGS],
    ['ignored actions', 'multiple_choice', [MC], [
      { type: 'NEXT_QUESTION' }, { type: 'TICK' }, { type: 'START', questions: [MC], settings: SETTINGS, quizType: 'multiple_choice' },
      result, { type: 'ANSWER', selectedAnswer: 1 }, { type: 'ANSWER', selectedAnswer: 2 }, { type: 'NEXT_QUESTION' }, { type: 'TICK' },
    ], SETTINGS],
  ];

  it.each(cases)('%s', (_name, _type, _qs, actions) => {
    const mine = run(runReducer, actions);
    const theirs = run(legacy.quizReducer as (s: RunState, a: RunAction) => RunState, actions);
    expect(mine).toEqual(theirs);
  });

  it('scores', () => {
    const s = run(runReducer, cases[2]![3]).at(-2) as Extract<RunState, { phase: 'result' }>;
    expect(s.score).toBe(3 + 1 + 0);
    expect(s.clueResults.map((c) => c.pointsEarned)).toEqual([3, 1, 0]);
  });

  it('RESUME restores a saved run where it was left', () => {
    const s = runReducer({ phase: 'intro' }, {
      type: 'RESUME',
      now: Date.now(),
      run: { questionIndex: 2, score: 1, answers: [2, 1], questions: [MC, TF_OPTS, TF_BARE_TRUE], settings: SETTINGS, quizType: 'multiple_choice', clueResults: [], elapsedMs: 30_000 },
    });
    expect(s).toMatchObject({ phase: 'playing', questionIndex: 2, score: 1, answers: [2, 1], timeRemaining: 15, cluesRevealed: 1 });
    expect((s as { startTime: number }).startTime).toBe(Date.now() - 30_000);
    expect(runReducer({ phase: 'intro' }, { type: 'RESUME', now: 0, run: { questionIndex: 3, score: 0, answers: [], questions: [MC], settings: SETTINGS, quizType: 'multiple_choice', clueResults: [], elapsedMs: 0 } })).toEqual({ phase: 'intro' });
  });
});

describe('save payload = quiz-player.tsx POST /api/quiz/[id]/play', () => {
  it('same keys, same order as the legacy body', () => {
    const m = /JSON\.stringify\(\{\s*score: state\.score,[\s\S]*?anon_id: getAnonId\(\),\s*\}\)/.exec(PLAYER);
    expect(m, 'legacy play body not found').not.toBeNull();
    const legacyKeys = [...m![0].matchAll(/^\s*([a-z_]+):/gm)].map((x) => x[1]);
    const mine = Object.keys(playPayload({ score: 1, questionCount: 2, quizType: 'multiple_choice', startTime: 0, now: 1000, perQuestionTimes: [], anonId: null, relaxed: false }));
    expect(mine).toEqual(legacyKeys);
  });
  it('timed run: same values as the legacy handleNext', () => {
    expect(playPayload({ score: 7, questionCount: 8, quizType: 'multiple_choice', startTime: 1_000, now: 73_400, perQuestionTimes: [3.2, 4.1], anonId: 'a', relaxed: false }))
      .toEqual({ score: 7, total_questions: 8, time_taken_seconds: 72, max_score: 8, per_question_times: [3.2, 4.1], anon_id: 'a' });
    expect(playPayload({ score: 20, questionCount: 8, quizType: 'guess_from_clues', startTime: 0, now: 60_499, perQuestionTimes: [], anonId: null, relaxed: false }).max_score).toBe(24);
  });
  it('relaxed run: no time, so quiz_time_stats is left alone', () => {
    expect(playPayload({ score: 5, questionCount: 8, quizType: 'multiple_choice', startTime: 0, now: 99_000, perQuestionTimes: [], anonId: null, relaxed: true }).time_taken_seconds).toBeNull();
  });
  it('per-question seconds like handleAnswer', () => {
    expect(questionSeconds(1_000, 4_260)).toBe(3.3);
  });
});

describe('display helpers', () => {
  it('progress marks and streak (timeouts count as wrong, prototype)', () => {
    const qs = [MC, MC, MC, MC, MC];
    expect(progressMarks(qs, [2, 1, null])).toEqual(['ok', 'no', 'no', null, null]);
    expect(trailingStreak(qs, [1, 2, 2, 2])).toBe(3);
    expect(trailingStreak(qs, [2, 2, null])).toBe(0);
  });
  it('durations and averages', () => {
    expect(formatDuration(72)).toBe('1:12');
    expect(formatDuration(17)).toBe('0:17');
    expect(averagePct(1000, 250, 8, 'multiple_choice')).toBe(50);
    expect(averagePct(0, 0, 8, 'multiple_choice')).toBeNull();
    expect(averagePct(3000, 250, 8, 'guess_from_clues')).toBe(50);
  });
  it('format', () => {
    const now = Date.parse('2026-09-25T20:00:00Z');
    expect(relativeTime('2026-09-25T14:00:00Z', now)).toBe('6 hours ago');
    expect(relativeTime('2026-09-25T19:59:30Z', now)).toBe('just now');
    expect(relativeTime('2026-09-23T20:00:00Z', now)).toBe('2 days ago');
    expect(relativeTime('2026-09-25T19:59:00Z', now)).toBe('1 minute ago');
    expect(aboutMinutes(8, true, 15)).toBe('About 2 min');
    expect(aboutMinutes(10, true, 10)).toBe('About 2 min');
    expect(aboutMinutes(3, false, 0)).toBe('About 1 min');
    expect(stampWords({ kr: '올킬!', en: 'PERFECT!' })).toEqual({ kr: '올킬!', en: 'PERFECT' });
    expect(cardAverage({ quiz_type: 'multiple_choice', play_count: 100, total_score_sum: 400, total_completions: 100, question_count: 8 })).toBe(50);
    expect(cardAverage({ quiz_type: 'multiple_choice', play_count: 5, total_score_sum: 20, total_completions: 5, question_count: 8 })).toBeNull();
    expect(cardAverage({ quiz_type: 'guess_from_clues', play_count: 100, total_score_sum: 400, total_completions: 100, question_count: 8 })).toBeNull();
  });
});

describe('challenges', () => {
  const stored: QuestionData[] = [MC, TF_OPTS, CLUE];
  it('snapshot is rebuilt from the stored questions, in played order', () => {
    expect(orderStoredQuestions(stored, [CLUE.question, MC.question])).toEqual([CLUE, MC]);
    expect(orderStoredQuestions(stored, ['planted question'])).toBeNull();
    expect(orderStoredQuestions(stored, [MC.question, MC.question])).toBeNull();
    expect(orderStoredQuestions(stored, [])).toBeNull();
  });
  it('link round trip', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    const href = challengeHref('my-quiz', id, 'a1b2c3d4e5f60718');
    expect(href).toBe(`/q/my-quiz?c=${id}.a1b2c3d4e5f60718`);
    expect(parseChallengeParam(`${id}.a1b2c3d4e5f60718`)).toEqual({ id, sig: 'a1b2c3d4e5f60718' });
    expect(parseChallengeParam(id)).toBeNull();
    expect(parseChallengeParam('x.y')).toBeNull();
  });
  it('win / lose (ties go to the player) and the chip', () => {
    const c = { challenger: { name: 'mingi', accent: null, font: null }, score: 7, maxScore: 8 };
    expect(challengeOutcome(7, c)).toMatchObject({ won: true, line: 'You beat mingi (7/8). Reply with your score.' });
    expect(challengeOutcome(6, c)).toMatchObject({ won: false, line: 'mingi wins this one (7/8). Try again?' });
    expect(challengeChip(c)).toBe('Beat mingi: 7/8');
    expect(challengeChip({ ...c, challenger: null })).toBe('Beat your friend: 7/8');
  });
  it('48 hours', () => {
    const t = Date.parse('2026-09-25T20:00:00Z');
    expect(isExpired('2026-09-25T00:00:00Z', t)).toBe(false);
    expect(isExpired(new Date(t - CHALLENGE_TTL_MS - 1).toISOString(), t)).toBe(true);
    expect(isExpired('not a date', t)).toBe(true);
  });
});

describe('copy', () => {
  it('no em or en dash in P4 sources', () => {
    const roots = [here, path.resolve(here, '../../../components/quiz/ux-v1'), path.resolve(here, '../../../app/api/ux-v1/p4')];
    const files: string[] = [];
    const walk = (d: string): void => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else files.push(p); } };
    roots.forEach(walk);
    files.push(path.resolve(here, '../../../styles/ux-v1/p4.css'));
    const bad = files.filter((f) => /[\u2013\u2014]/.test(fs.readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
});
