'use client';

import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useToast } from '@/components/ui/toast-provider';
import { AnswerButton } from '@/components/quiz/answer-button';
import { TimerCircle } from '@/components/quiz/timer-circle';
import { ProgressBar } from '@/components/quiz/progress-bar';
import { FeedbackBox } from '@/components/quiz/feedback-box';
import { ResultCard } from '@/components/quiz/result-card';
import { ReportForm } from '@/components/quiz/report-form';
import { GroupPill } from '@/components/ui/group-pill';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { GroupLogo } from '@/components/ui/group-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LikeQuizButton } from '@/components/ui/like-quiz-button';
import { formatCount } from '@/lib/utils';

import type { Difficulty, QuizSettings, QuizType } from '@/lib/db/types';

// ============================================
// Types
// ============================================

interface QuestionData {
  question: string;
  options: string[];
  correct: number | boolean;
  fun_fact?: string;
  clues?: string[];
}

interface ClueResult {
  cluesUsed: number;
  correct: boolean;
  pointsEarned: number;
}

interface QuizIntroData {
  id: string;
  title: string;
  slug: string;
  quizType: QuizType;
  difficulty: Difficulty;
  playCount: number;
  totalCompletions: number;
  totalScoreSum: number;
  questionCount: number;
  groupName: string;
  groupSlug: string;
  displayColor: string;
  textColor: string;
  logoUrl: string | null;
  fandomName: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  creatorAvatarBg: string;
  creatorAvatarText: string;
  passRate: number | null;
  likeCount: number;
}

interface QuizPlayerProps {
  quiz: QuizIntroData;
}

// ============================================
// True/false helpers
// ============================================

function getCorrectIndex(question: QuestionData): number {
  if (typeof question.correct === 'boolean') {
    const correctText = question.correct ? 'true' : 'false';
    return question.options.findIndex((opt) => opt.toLowerCase() === correctText);
  }
  return question.correct;
}

function isAnswerCorrect(question: QuestionData, selectedIndex: number): boolean {
  if (typeof question.correct === 'boolean') {
    const selectedOption = question.options[selectedIndex];
    return selectedOption !== undefined && (selectedOption.toLowerCase() === 'true') === question.correct;
  }
  return selectedIndex === question.correct;
}

// ============================================
// State machine
// ============================================

type QuizState =
  | { phase: 'intro' }
  | {
      phase: 'playing';
      questionIndex: number;
      score: number;
      answers: (number | null)[];
      timeRemaining: number;
      questions: QuestionData[];
      settings: QuizSettings;
      quizType: QuizType;
      startTime: number;
      // Guess-from-clues sub-state
      cluesRevealed: number;
      clueResults: ClueResult[];
    }
  | {
      phase: 'answered';
      questionIndex: number;
      score: number;
      answers: (number | null)[];
      selectedAnswer: number | null;
      isCorrect: boolean;
      pointsEarned: number;
      questions: QuestionData[];
      settings: QuizSettings;
      quizType: QuizType;
      startTime: number;
      cluesRevealed: number;
      clueResults: ClueResult[];
    }
  | {
      phase: 'result';
      score: number;
      totalQuestions: number;
      quizType: QuizType;
      percentile: number | null;
      passRate: number | null;
      timeTaken: number;
      xpEarned: number;
      clueResults: ClueResult[];
    };

type QuizAction =
  | { type: 'START'; questions: QuestionData[]; settings: QuizSettings; quizType: QuizType }
  | { type: 'ANSWER'; selectedAnswer: number }
  | { type: 'CLUE_ANSWER'; selectedAnswer: number; cluesUsed: number }
  | { type: 'REVEAL_CLUE' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'TIMEOUT' }
  | { type: 'SHOW_RESULT'; percentile: number | null; passRate: number | null; timeTaken: number; xpEarned: number }
  | { type: 'TICK' }
  | { type: 'RESET' };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'START':
      return {
        phase: 'playing',
        questionIndex: 0,
        score: 0,
        answers: [],
        timeRemaining: action.settings.timer ? action.settings.timer_seconds : 999,
        questions: action.questions,
        settings: action.settings,
        quizType: action.quizType,
        startTime: Date.now(),
        cluesRevealed: 1,
        clueResults: [],
      };

    case 'REVEAL_CLUE': {
      if (state.phase !== 'playing') return state;
      const question = state.questions[state.questionIndex];
      if (!question?.clues) return state;
      const maxClues = question.clues.length;
      if (state.cluesRevealed >= maxClues) return state;
      return { ...state, cluesRevealed: state.cluesRevealed + 1 };
    }

    case 'START_GUESSING': {
      if (state.phase !== 'playing') return state;
      return { ...state, isGuessing: true };
    }

    case 'CLUE_ANSWER': {
      if (state.phase !== 'playing') return state;
      const question = state.questions[state.questionIndex];
      if (!question) return state;
      const isCorrect = isAnswerCorrect(question, action.selectedAnswer);
      const pointsEarned = isCorrect ? (4 - action.cluesUsed) : 0;
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
      const clueResult: ClueResult | null = isClues
        ? { cluesUsed: 3, correct: false, pointsEarned: 0 }
        : null;
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
      const isClues = state.quizType === 'guess_from_clues';
      return {
        phase: 'playing',
        questionIndex: nextIndex,
        score: state.score,
        answers: state.answers,
        timeRemaining: state.settings.timer ? state.settings.timer_seconds : 999,
        questions: state.questions,
        settings: state.settings,
        quizType: state.quizType,
        startTime: state.startTime,
        cluesRevealed: 1,
        isGuessing: !isClues,
        clueResults: state.clueResults,
      };
    }

    case 'SHOW_RESULT': {
      if (state.phase !== 'answered') return state;
      return {
        phase: 'result',
        score: state.score,
        totalQuestions: state.questions.length,
        quizType: state.quizType,
        percentile: action.percentile,
        passRate: action.passRate,
        timeTaken: action.timeTaken,
        xpEarned: action.xpEarned,
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

// ============================================
// Component
// ============================================

const LABELS = ['A', 'B', 'C', 'D'] as const;

export function QuizPlayer({ quiz }: QuizPlayerProps): React.ReactElement {
  const [state, dispatch] = useReducer(quizReducer, { phase: 'intro' });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const timeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCluesQuiz = quiz.quizType === 'guess_from_clues';
  const maxPerQ = isCluesQuiz ? 3 : 1;
  const avgScorePct = quiz.totalCompletions > 0 && quiz.questionCount > 0
    ? Math.round((quiz.totalScoreSum / quiz.totalCompletions) / (quiz.questionCount * maxPerQ) * 100)
    : null;

  // Refresh server components (navbar XP) when result screen shows
  useEffect(() => {
    if (state.phase === 'result') {
      router.refresh();
    }
  }, [state.phase, router]);

  // Timer logic
  useEffect(() => {
    if (state.phase !== 'playing') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    timeRef.current = state.timeRemaining;

    if (!('settings' in state) || !state.settings.timer) return;

    intervalRef.current = setInterval(() => {
      timeRef.current -= 1;
      dispatch({ type: 'TICK' });
      if (timeRef.current <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        dispatch({ type: 'TIMEOUT' });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.phase, state.phase === 'playing' ? state.questionIndex : null, state.phase === 'playing' ? state.settings.timer : null, state.phase === 'playing' ? state.timeRemaining : null]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/questions`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data: { questions: QuestionData[]; settings: QuizSettings; quiz_type: string } = await res.json();
      dispatch({
        type: 'START',
        questions: data.questions,
        settings: data.settings,
        quizType: (data.quiz_type as QuizType) ?? quiz.quizType,
      });
    } catch (err) {
      console.error('Failed to start quiz:', err);
    } finally {
      setLoading(false);
    }
  }, [quiz.id, quiz.quizType]);

  const handleAnswer = useCallback((index: number) => {
    dispatch({ type: 'ANSWER', selectedAnswer: index });
  }, []);

  const handleClueAnswer = useCallback((index: number, cluesUsed: number) => {
    dispatch({ type: 'CLUE_ANSWER', selectedAnswer: index, cluesUsed });
  }, []);

  const handleRevealClue = useCallback(() => {
    dispatch({ type: 'REVEAL_CLUE' });
  }, []);

  const handleStartGuessing = useCallback(() => {
    dispatch({ type: 'START_GUESSING' });
  }, []);

  const handleNext = useCallback(async () => {
    if (state.phase !== 'answered') return;

    const isLast = state.questionIndex >= state.questions.length - 1;
    if (!isLast) {
      dispatch({ type: 'NEXT_QUESTION' });
      return;
    }

    // Record play and show results
    const timeTaken = Math.round((Date.now() - state.startTime) / 1000);
    let percentile: number | null = null;
    let passRate: number | null = null;
    let xpEarned = 0;

    const isClues = state.quizType === 'guess_from_clues';
    const maxScore = isClues ? state.questions.length * 3 : state.questions.length;

    try {
      const res = await fetch(`/api/quiz/${quiz.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: state.score,
          total_questions: state.questions.length,
          time_taken_seconds: timeTaken,
          max_score: maxScore,
        }),
      });
      if (res.ok) {
        const data: { percentile: number; xp_earned?: number; pass_rate?: number | null } = await res.json();
        percentile = data.percentile;
        xpEarned = data.xp_earned ?? 0;
        passRate = data.pass_rate ?? null;
      }
    } catch {
      showToast("Couldn't save your score. Your result is still valid!", 'info');
    }

    dispatch({ type: 'SHOW_RESULT', percentile, passRate, timeTaken, xpEarned });
  }, [state, quiz.id, showToast]);

  const handleShare = useCallback(async () => {
    if (state.phase !== 'result') return;

    const maxScore = state.quizType === 'guess_from_clues' ? state.totalQuestions * 3 : state.totalQuestions;
    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/q/${quiz.slug}?ref=share&s=${state.score}&t=${maxScore}`;
    const shareText = `I scored ${state.score}/${maxScore} on "${quiz.title}" Can you beat me?`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: quiz.title, text: shareText, url: shareUrl });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied!', 'success');
    }
  }, [state, quiz.slug, quiz.title, showToast]);

  // ============================================
  // INTRO STATE
  // ============================================
  if (state.phase === 'intro') {
    return (
      <div className="bg-surface-secondary rounded-lg p-5">
        <div className="bg-surface-primary rounded-lg border border-border-light p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/group/${quiz.groupSlug}`}>
                  <GroupPill name={quiz.groupName} displayColor={quiz.displayColor} textColor={quiz.textColor} />
                </Link>
                <DifficultyBadge difficulty={quiz.difficulty} />
              </div>
              <h1 className="text-2xl font-medium mt-3 leading-snug text-txt-primary">{quiz.title}</h1>
              <p className="text-xs text-txt-secondary mt-1">{quiz.questionCount} questions</p>
            </div>
            <GroupLogo
              groupName={quiz.groupName}
              logoUrl={quiz.logoUrl}
              displayColor={quiz.displayColor}
              textColor={quiz.textColor}
              size={64}
            />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <UserAvatar
              username={quiz.creatorUsername}
              avatarUrl={quiz.creatorAvatarUrl}
              bgColor={quiz.creatorAvatarBg}
              textColor={quiz.creatorAvatarText}
              size={22}
            />
            <p className="text-sm text-txt-secondary">
              by <Link href={`/u/${quiz.creatorUsername}`} className="font-medium text-txt-primary hover:underline">{quiz.creatorUsername}</Link>
            </p>
          </div>

          <div className="flex gap-6 mt-4">
            <div>
              <p className="text-xs text-txt-secondary">plays</p>
              <p className="text-base font-medium text-txt-primary">{formatCount(quiz.playCount)}</p>
            </div>
            <div>
              <p className="text-xs text-txt-secondary">avg score</p>
              <p className={`text-base font-medium ${avgScorePct !== null ? 'text-txt-primary' : 'text-txt-tertiary'}`}>{avgScorePct !== null ? `${avgScorePct}%` : 'new'}</p>
            </div>
            <div>
              <p className="text-xs text-txt-secondary">pass rate</p>
              <p className="text-base font-medium text-txt-primary">{quiz.passRate !== null ? `${quiz.passRate}%` : '-'}</p>
            </div>
          </div>
        </div>

        <div id="ad-intro" className="w-full min-h-[90px] flex items-center justify-center text-xs text-txt-tertiary mt-4">
          Ad
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 rounded-full bg-txt-primary text-white text-base font-medium mt-4 cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            'Start quiz'
          )}
        </button>
      </div>
    );
  }

  // ============================================
  // PLAYING / ANSWERED STATE
  // ============================================
  if (state.phase === 'playing' || state.phase === 'answered') {
    const question = state.questions[state.questionIndex];
    if (!question) return <div />;

    const isAnswered = state.phase === 'answered';
    const isLast = state.questionIndex >= state.questions.length - 1;
    const isClues = state.quizType === 'guess_from_clues' && question.clues && question.clues.length > 0;

    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-txt-secondary">
            {state.questionIndex + 1} of {state.questions.length}
          </span>
          {state.phase === 'playing' && 'settings' in state && state.settings.timer && (
            <TimerCircle seconds={state.timeRemaining} isUrgent={state.timeRemaining <= 5} />
          )}
          {state.phase === 'answered' && isClues && (
            <span className="text-sm font-medium text-accent-pink">
              +{state.pointsEarned}pt{state.pointsEarned !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <ProgressBar current={state.questionIndex + (isAnswered ? 1 : 0)} total={state.questions.length} />

        <div key={state.questionIndex} className="animate-question-in mt-6">

          {/* ======================== */}
          {/* GUESS FROM CLUES - CLUE REVEAL PHASE */}
          {/* ======================== */}
          {isClues && state.phase === 'playing' && !state.isGuessing && (
            <>
              <div className="flex flex-col gap-2 mb-5">
                {question.clues!.map((clue, i) => (
                  <div
                    key={i}
                    className={`text-sm transition-all duration-300 ${
                      i < state.cluesRevealed
                        ? 'opacity-100 animate-clue-reveal'
                        : 'opacity-0 h-0 overflow-hidden'
                    }`}
                  >
                    <span className="font-medium text-txt-secondary">Clue {i + 1}:</span>{' '}
                    <span className={i === 0 ? 'text-txt-primary' : 'text-txt-secondary'}>{clue}</span>
                  </div>
                ))}
              </div>

              {/* Clue dots */}
              <div className="flex items-center gap-1.5 mb-5">
                {question.clues!.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < state.cluesRevealed ? 'bg-accent-pink' : 'bg-border-light'
                    }`}
                  />
                ))}
                <span className="text-xs text-txt-tertiary ml-2">
                  {state.cluesRevealed} of {question.clues!.length} clues
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleStartGuessing}
                  className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium cursor-pointer"
                >
                  Guess now ({4 - state.cluesRevealed}pt{4 - state.cluesRevealed !== 1 ? 's' : ''})
                </button>
                {state.cluesRevealed < question.clues!.length && (
                  <button
                    onClick={handleRevealClue}
                    className="flex-1 py-3 rounded-full border border-border-light text-sm font-medium text-txt-secondary cursor-pointer hover:border-border-medium transition-colors"
                  >
                    {state.cluesRevealed < question.clues!.length - 1 ? 'Need another clue' : 'Last clue'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ======================== */}
          {/* GUESS FROM CLUES - GUESSING PHASE (or answered) */}
          {/* ======================== */}
          {isClues && ((state.phase === 'playing' && state.isGuessing) || isAnswered) && (
            <>
              {/* Show revealed clues */}
              <div className="flex flex-col gap-1.5 mb-4">
                {question.clues!.slice(0, state.cluesRevealed).map((clue, i) => (
                  <p key={i} className="text-sm text-txt-secondary">
                    <span className="font-medium">Clue {i + 1}:</span> {clue}
                  </p>
                ))}
              </div>

              <p className="text-base font-medium leading-relaxed mb-5 text-txt-primary">
                {question.question}
              </p>

              <div className="flex flex-col gap-2.5">
                {question.options.map((option, i) => {
                  let buttonState: 'default' | 'correct' | 'wrong' | 'dimmed' = 'default';
                  if (isAnswered) {
                    if (i === getCorrectIndex(question)) {
                      buttonState = 'correct';
                    } else if (i === state.selectedAnswer) {
                      buttonState = 'wrong';
                    } else {
                      buttonState = 'dimmed';
                    }
                  }
                  return (
                    <AnswerButton
                      key={i}
                      label={LABELS[i] ?? ''}
                      text={option}
                      state={buttonState}
                      disabled={isAnswered}
                      onClick={() => handleClueAnswer(i, state.cluesRevealed)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* ======================== */}
          {/* STANDARD (MC / TF) - PLAYING + ANSWERED */}
          {/* ======================== */}
          {!isClues && (
            <>
              <p className="text-base font-medium leading-relaxed mb-5 text-txt-primary">
                {question.question}
              </p>

              <div className="flex flex-col gap-2.5">
                {question.options.map((option, i) => {
                  let buttonState: 'default' | 'correct' | 'wrong' | 'dimmed' = 'default';
                  if (isAnswered) {
                    if (i === getCorrectIndex(question)) {
                      buttonState = 'correct';
                    } else if (i === state.selectedAnswer) {
                      buttonState = 'wrong';
                    } else {
                      buttonState = 'dimmed';
                    }
                  }
                  return (
                    <AnswerButton
                      key={i}
                      label={LABELS[i] ?? ''}
                      text={option}
                      state={buttonState}
                      disabled={isAnswered}
                      onClick={() => handleAnswer(i)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* ======================== */}
          {/* FEEDBACK (all quiz types) */}
          {/* ======================== */}
          {isAnswered && (
            <>
              <div className="mt-4">
                {state.selectedAnswer === null ? (
                  <FeedbackBox
                    type="timeout"
                    title="Time's up!"
                    text={typeof question.correct === 'boolean'
                      ? `The answer is ${question.options[getCorrectIndex(question)] ?? ''}.`
                      : `The correct answer was ${LABELS[getCorrectIndex(question)] ?? ''}.`}
                  />
                ) : state.isCorrect ? (
                  <FeedbackBox
                    type="correct"
                    title="Correct!"
                    text={question.fun_fact ?? ''}
                  />
                ) : (
                  <FeedbackBox
                    type="wrong"
                    title="Wrong!"
                    text={typeof question.correct === 'boolean'
                      ? `The answer is ${question.options[getCorrectIndex(question)] ?? ''}.${question.fun_fact ? ` ${question.fun_fact}` : ''}`
                      : `The correct answer was ${LABELS[getCorrectIndex(question)] ?? ''}.${question.fun_fact ? ` ${question.fun_fact}` : ''}`}
                  />
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-full bg-txt-primary text-white text-sm font-medium cursor-pointer"
                >
                  {isLast ? 'See results' : 'Next'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // RESULT STATE
  // ============================================
  if (state.phase === 'result') {
    const isClues = state.quizType === 'guess_from_clues';
    const maxScore = isClues ? state.totalQuestions * 3 : state.totalQuestions;

    return (
      <div>
        <ResultCard
          score={state.score}
          maxScore={maxScore}
          percentile={state.percentile}
          avgScorePct={avgScorePct}
          fandomName={quiz.fandomName}
          groupName={quiz.groupName}
          displayColor={quiz.displayColor}
          textColor={quiz.textColor}
          logoUrl={quiz.logoUrl}
          difficulty={quiz.difficulty}
          passRate={state.passRate ?? quiz.passRate}
        />

        {/* Clue breakdown for guess_from_clues */}
        {isClues && state.clueResults.length > 0 && (
          <div className="bg-surface-primary border border-border-light rounded-lg p-5 mt-3 animate-fade-in">
            <p className="text-sm font-medium text-txt-primary mb-3">How you scored</p>
            <div className="flex flex-col gap-1.5">
              {[
                { clues: 1, label: 'guessed on first clue', stars: 3 },
                { clues: 2, label: 'needed 2 clues', stars: 2 },
                { clues: 3, label: 'needed all 3 clues', stars: 1 },
              ].map(({ clues, label, stars }) => {
                const count = state.clueResults.filter(r => r.correct && r.cluesUsed === clues).length;
                if (count === 0) return null;
                return (
                  <div key={clues} className="flex items-center gap-2 text-sm">
                    <span className="text-amber-500 w-12 flex-shrink-0">
                      {'★'.repeat(stars)}
                    </span>
                    <span className="text-txt-primary font-medium">{count}</span>
                    <span className="text-txt-secondary">- {label}</span>
                  </div>
                );
              })}
              {(() => {
                const wrongCount = state.clueResults.filter(r => !r.correct).length;
                if (wrongCount === 0) return null;
                return (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-wrong-text w-12 flex-shrink-0">&#10005;</span>
                    <span className="text-txt-primary font-medium">{wrongCount}</span>
                    <span className="text-txt-secondary">- wrong</span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {state.xpEarned > 0 && (
          <p className="text-center text-xs text-accent-pink font-medium mt-3 animate-fade-in">
            +{state.xpEarned} XP earned
          </p>
        )}

        <div className="mt-4">
          <LikeQuizButton quizId={quiz.id} initialLiked={false} initialCount={quiz.likeCount} />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex-1 py-3 rounded-full border border-border-light text-sm font-medium bg-surface-primary cursor-pointer hover:border-border-medium transition-colors"
          >
            Try again
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium cursor-pointer"
          >
            Share result
          </button>
        </div>

        <ReportForm quizId={quiz.id} />

        <div id="ad-result" className="w-full min-h-[90px] flex items-center justify-center text-xs text-txt-tertiary mt-4">
          Ad
        </div>
      </div>
    );
  }

  return <div />;
}
