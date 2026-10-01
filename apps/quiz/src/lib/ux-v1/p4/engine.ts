// Quiz run engine for the v11 quiz game (P4). Pure: no React, no fetch.
//
// This is the EXISTS player's logic (components/quiz/quiz-player.tsx), moved out so
// the v11 skin can call it: the answer rules (true/false mapping, clue points), the
// state machine (START / ANSWER / CLUE_ANSWER / REVEAL_CLUE / TIMEOUT / NEXT_QUESTION
// / SHOW_RESULT / TICK / RESET) and the save payload of POST /api/quiz/[id]/play are
// copied rule for rule. quiz-player.tsx is not owned by P4 (v11 OWNERSHIP.json), so it
// still carries its own inline copy; requests/P4.md asks ORCH to make it import this
// module so there is one copy. engine.test.ts pins every rule with table cases.
//
// Additions, none of which change a score:
//   - RESUME: restore a run saved by "Leave" (Continue playing), same state shape.
//   - relaxed runs are the legacy "timer off" path (settings.timer = false), and
//     their save payload sends time_taken_seconds = null so the existing endpoint
//     keeps them out of quiz_time_stats (it only updates stats for a time > 0).

import type { QuizSettings, QuizType } from '@/lib/db/types';

export interface QuestionData {
  question: string;
  options?: string[];
  correct: number | boolean;
  fun_fact?: string;
  clues?: string[];
  /** image quizzes: shown above the question */
  image_url?: string;
}

export interface ClueResult {
  cluesUsed: number;
  correct: boolean;
  pointsEarned: number;
}

// ---------------------------------------------------------------------------
// Answer rules (verbatim from quiz-player.tsx)
// ---------------------------------------------------------------------------

export const TRUE_FALSE_OPTIONS = ['True', 'False'];

export function getEffectiveOptions(question: QuestionData): string[] {
  return question.options && question.options.length > 0 ? question.options : TRUE_FALSE_OPTIONS;
}

export function getCorrectIndex(question: QuestionData): number {
  if (typeof question.correct === 'boolean') {
    if (question.options && question.options.length > 0) {
      const correctText = question.correct ? 'true' : 'false';
      return question.options.findIndex((opt) => opt.toLowerCase() === correctText);
    }
    return question.correct ? 0 : 1;
  }
  return question.correct;
}

export function isAnswerCorrect(question: QuestionData, selectedIndex: number): boolean {
  if (typeof question.correct === 'boolean') {
    if (question.options && question.options.length > 0) {
      const selectedOption = question.options[selectedIndex];
      return selectedOption !== undefined && (selectedOption.toLowerCase() === 'true') === question.correct;
    }
    return selectedIndex === 0 ? question.correct : !question.correct;
  }
  return selectedIndex === question.correct;
}

/** guess_from_clues scores up to 3 points per question, every other type 1. */
export function maxScoreFor(quizType: QuizType, questionCount: number): number {
  return quizType === 'guess_from_clues' ? questionCount * 3 : questionCount;
}

/** Clue quizzes: 3 points on the first clue, 2 on the second, 1 on the third. */
export function cluePoints(cluesUsed: number): number {
  return 4 - cluesUsed;
}

// ---------------------------------------------------------------------------
// State machine (verbatim from quiz-player.tsx, plus RESUME)
// ---------------------------------------------------------------------------

interface RunBase {
  questionIndex: number;
  score: number;
  answers: (number | null)[];
  questions: QuestionData[];
  settings: QuizSettings;
  quizType: QuizType;
  startTime: number;
  cluesRevealed: number;
  clueResults: ClueResult[];
}

export type RunState =
  | { phase: 'intro' }
  | (RunBase & { phase: 'playing'; timeRemaining: number })
  | (RunBase & { phase: 'answered'; selectedAnswer: number | null; isCorrect: boolean; pointsEarned: number })
  | {
      phase: 'result';
      score: number;
      totalQuestions: number;
      questions: QuestionData[];
      answers: (number | null)[];
      quizType: QuizType;
      percentile: number | null;
      passRate: number | null;
      timeTaken: number;
      xpEarned: number;
      leveledUp: boolean;
      newLevel: number | null;
      newLevelName: string | null;
      clueResults: ClueResult[];
    };

export interface SavedRun {
  questionIndex: number;
  score: number;
  answers: (number | null)[];
  questions: QuestionData[];
  settings: QuizSettings;
  quizType: QuizType;
  clueResults: ClueResult[];
  /** ms already spent before the run was left */
  elapsedMs: number;
}

export type RunAction =
  | { type: 'START'; questions: QuestionData[]; settings: QuizSettings; quizType: QuizType }
  | { type: 'RESUME'; run: SavedRun; now: number }
  | { type: 'ANSWER'; selectedAnswer: number }
  | { type: 'CLUE_ANSWER'; selectedAnswer: number; cluesUsed: number }
  | { type: 'REVEAL_CLUE' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'TIMEOUT' }
  | {
      type: 'SHOW_RESULT';
      percentile: number | null;
      passRate: number | null;
      timeTaken: number;
      xpEarned: number;
      leveledUp: boolean;
      newLevel: number | null;
      newLevelName: string | null;
    }
  | { type: 'TICK' }
  | { type: 'RESET' };

function startTimer(settings: QuizSettings): number {
  return settings.timer ? settings.timer_seconds : 999;
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'START':
      return {
        phase: 'playing',
        questionIndex: 0,
        score: 0,
        answers: [],
        timeRemaining: startTimer(action.settings),
        questions: action.questions,
        settings: action.settings,
        quizType: action.quizType,
        startTime: Date.now(),
        cluesRevealed: 1,
        clueResults: [],
      };

    case 'RESUME': {
      const r = action.run;
      if (r.questionIndex < 0 || r.questionIndex >= r.questions.length) return state;
      return {
        phase: 'playing',
        questionIndex: r.questionIndex,
        score: r.score,
        answers: r.answers.slice(0, r.questionIndex),
        timeRemaining: startTimer(r.settings),
        questions: r.questions,
        settings: r.settings,
        quizType: r.quizType,
        startTime: action.now - Math.max(0, r.elapsedMs),
        cluesRevealed: 1,
        clueResults: r.clueResults,
      };
    }

    case 'REVEAL_CLUE': {
      if (state.phase !== 'playing') return state;
      const question = state.questions[state.questionIndex];
      if (!question?.clues) return state;
      const maxClues = question.clues.length;
      if (state.cluesRevealed >= maxClues) return state;
      return { ...state, cluesRevealed: state.cluesRevealed + 1 };
    }

    case 'CLUE_ANSWER': {
      if (state.phase !== 'playing') return state;
      const question = state.questions[state.questionIndex];
      if (!question) return state;
      const isCorrect = isAnswerCorrect(question, action.selectedAnswer);
      const pointsEarned = isCorrect ? cluePoints(action.cluesUsed) : 0;
      const clueResult: ClueResult = { cluesUsed: action.cluesUsed, correct: isCorrect, pointsEarned };
      return {
        phase: 'answered',
        questionIndex: state.questionIndex,
        score: state.score + pointsEarned,
        answers: [...state.answers, action.selectedAnswer],
        selectedAnswer: action.selectedAnswer,
        isCorrect,
        pointsEarned,
        questions: state.questions,
        settings: state.settings,
        quizType: state.quizType,
        startTime: state.startTime,
        cluesRevealed: state.cluesRevealed,
        clueResults: [...state.clueResults, clueResult],
      };
    }

    case 'ANSWER': {
      if (state.phase !== 'playing') return state;
      const question = state.questions[state.questionIndex];
      if (!question) return state;
      const isCorrect = isAnswerCorrect(question, action.selectedAnswer);
      return {
        phase: 'answered',
        questionIndex: state.questionIndex,
        score: state.score + (isCorrect ? 1 : 0),
        answers: [...state.answers, action.selectedAnswer],
        selectedAnswer: action.selectedAnswer,
        isCorrect,
        pointsEarned: isCorrect ? 1 : 0,
        questions: state.questions,
        settings: state.settings,
        quizType: state.quizType,
        startTime: state.startTime,
        cluesRevealed: state.cluesRevealed,
        clueResults: state.clueResults,
      };
    }

    case 'TIMEOUT': {
      if (state.phase !== 'playing') return state;
      const isClues = state.quizType === 'guess_from_clues';
      const clueResult: ClueResult | null = isClues ? { cluesUsed: 3, correct: false, pointsEarned: 0 } : null;
      return {
        phase: 'answered',
        questionIndex: state.questionIndex,
        score: state.score,
        answers: [...state.answers, null],
        selectedAnswer: null,
        isCorrect: false,
        pointsEarned: 0,
        questions: state.questions,
        settings: state.settings,
        quizType: state.quizType,
        startTime: state.startTime,
        cluesRevealed: state.cluesRevealed,
        clueResults: clueResult ? [...state.clueResults, clueResult] : state.clueResults,
      };
    }

    case 'NEXT_QUESTION': {
      if (state.phase !== 'answered') return state;
      const nextIndex = state.questionIndex + 1;
      if (nextIndex >= state.questions.length) return state;
      return {
        phase: 'playing',
        questionIndex: nextIndex,
        score: state.score,
        answers: state.answers,
        timeRemaining: startTimer(state.settings),
        questions: state.questions,
        settings: state.settings,
        quizType: state.quizType,
        startTime: state.startTime,
        cluesRevealed: 1,
        clueResults: state.clueResults,
      };
    }

    case 'SHOW_RESULT': {
      if (state.phase !== 'answered') return state;
      return {
        phase: 'result',
        score: state.score,
        totalQuestions: state.questions.length,
        questions: state.questions,
        answers: state.answers,
        quizType: state.quizType,
        percentile: action.percentile,
        passRate: action.passRate,
        timeTaken: action.timeTaken,
        xpEarned: action.xpEarned,
        leveledUp: action.leveledUp,
        newLevel: action.newLevel,
        newLevelName: action.newLevelName,
        clueResults: state.clueResults,
      };
    }

    case 'TICK': {
      if (state.phase !== 'playing') return state;
      return { ...state, timeRemaining: state.timeRemaining - 1 };
    }

    case 'RESET':
      return { phase: 'intro' };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Save payload (POST /api/quiz/[id]/play), same keys and values as quiz-player.tsx
// ---------------------------------------------------------------------------

export interface PlayPayload {
  score: number;
  total_questions: number;
  time_taken_seconds: number | null;
  max_score: number;
  per_question_times: number[];
  anon_id: string | null;
}

export function playPayload(input: {
  score: number;
  questionCount: number;
  quizType: QuizType;
  startTime: number;
  now: number;
  perQuestionTimes: number[];
  anonId: string | null;
  relaxed: boolean;
}): PlayPayload {
  const timeTaken = Math.round((input.now - input.startTime) / 1000);
  return {
    score: input.score,
    total_questions: input.questionCount,
    // relaxed runs: no time, so the endpoint leaves quiz_time_stats alone
    time_taken_seconds: input.relaxed ? null : timeTaken,
    max_score: maxScoreFor(input.quizType, input.questionCount),
    per_question_times: input.perQuestionTimes,
    anon_id: input.anonId,
  };
}

/** Per-question answer time in seconds with one decimal (quiz-player handleAnswer). */
export function questionSeconds(questionStart: number, now: number): number {
  return Math.round((now - questionStart) / 100) / 10;
}

/** Trailing run of right answers (the "3 in a row" pill). */
export function trailingStreak(questions: QuestionData[], answers: (number | null)[]): number {
  let streak = 0;
  for (let i = answers.length - 1; i >= 0; i -= 1) {
    const a = answers[i];
    const q = questions[i];
    if (a === null || a === undefined || !q) break;
    if (isAnswerCorrect(q, a)) streak += 1;
    else break;
  }
  return streak;
}

/** ok / no / null (not answered) per question, for the segmented progress. */
export function progressMarks(questions: QuestionData[], answers: (number | null)[]): ('ok' | 'no' | null)[] {
  return questions.map((q, i) => {
    if (i >= answers.length) return null;
    const a = answers[i];
    if (a === null || a === undefined) return 'no';
    return isAnswerCorrect(q, a) ? 'ok' : 'no';
  });
}

/** m:ss (the Time cell and the hall of fame). */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** The quiz average in percent from the quizzes row, as the player computes it. */
export function averagePct(totalScoreSum: number, totalCompletions: number, questionCount: number, quizType: QuizType): number | null {
  const maxPerQ = quizType === 'guess_from_clues' ? 3 : 1;
  if (totalCompletions <= 0 || questionCount <= 0) return null;
  return Math.round((totalScoreSum / totalCompletions) / (questionCount * maxPerQ) * 100);
}
