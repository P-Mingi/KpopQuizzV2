'use client';

import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { useToast } from '@/components/ui/toast-provider';
import { AnswerButton } from '@/components/quiz/answer-button';
import { TimerCircle } from '@/components/quiz/timer-circle';
import { ProgressDots } from '@/components/quiz/progress-dots';
import { FeedbackBox } from '@/components/quiz/feedback-box';
import { QuizReactions } from '@/components/quiz/quiz-reactions';
import { QuizComments } from '@/components/quiz/quiz-comments';
import { LevelUpOverlay } from '@/components/quiz/level-up-overlay';
import { LightstickMascot, type MascotMood } from '@/components/ui/lightstick-mascot';
import { RollingNumber } from '@/components/ui/rolling-number';
import { ReportForm } from '@/components/quiz/report-form';
import { getTitleForLevel } from '@/lib/level-titles';
import { KOREAN, getResultLabel } from '@/lib/korean-moments';
import {
  playTap,
  playCorrect,
  playWrong,
  playPerfect,
  playShare,
} from '@/lib/sounds';
import { ImageQuestionView } from '@/components/quiz/image-question';
import { IntruderQuestionView } from '@/components/quiz/intruder-question';
import { RunningTimer } from '@/components/quiz/running-timer';
import { TimeComparison } from '@/components/quiz/time-comparison';
import { GroupPill } from '@/components/ui/group-pill';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { GroupLogo } from '@/components/ui/group-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LikeQuizButton } from '@/components/ui/like-quiz-button';
import { RedditShareButton } from '@/components/share/reddit-share-button';
import { formatCount } from '@/lib/utils';

import type { Difficulty, QuizSettings, QuizType } from '@/lib/db/types';

// ============================================
// Types
// ============================================

interface QuestionData {
  question: string;
  options?: string[];
  correct: number | boolean;
  fun_fact?: string;
  clues?: string[];
}

interface RelatedQuiz {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  play_count: number;
  quiz_type: string;
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
  coverImageUrl: string | null;
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

const TRUE_FALSE_OPTIONS = ['True', 'False'];

function getEffectiveOptions(question: QuestionData): string[] {
  return question.options && question.options.length > 0 ? question.options : TRUE_FALSE_OPTIONS;
}

function getCorrectIndex(question: QuestionData): number {
  if (typeof question.correct === 'boolean') {
    if (question.options && question.options.length > 0) {
      const correctText = question.correct ? 'true' : 'false';
      return question.options.findIndex((opt) => opt.toLowerCase() === correctText);
    }
    return question.correct ? 0 : 1;
  }
  return question.correct;
}

function isAnswerCorrect(question: QuestionData, selectedIndex: number): boolean {
  if (typeof question.correct === 'boolean') {
    if (question.options && question.options.length > 0) {
      const selectedOption = question.options[selectedIndex];
      return selectedOption !== undefined && (selectedOption.toLowerCase() === 'true') === question.correct;
    }
    return selectedIndex === 0 ? question.correct : !question.correct;
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
      leveledUp: boolean;
      newLevel: number | null;
      newLevelName: string | null;
      clueResults: ClueResult[];
    };

type QuizAction =
  | { type: 'START'; questions: QuestionData[]; settings: QuizSettings; quizType: QuizType }
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

// ============================================
// Component
// ============================================

const LABELS = ['A', 'B', 'C', 'D'] as const;

export function QuizPlayer({ quiz }: QuizPlayerProps): React.ReactElement {
  const [state, dispatch] = useReducer(quizReducer, { phase: 'intro' });
  const [loading, setLoading] = useState(false);
  const [relatedQuizzes, setRelatedQuizzes] = useState<RelatedQuiz[]>([]);
  const [levelUpDismissed, setLevelUpDismissed] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const timeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(Date.now());
  const perQuestionTimesRef = useRef<number[]>([]);

  const isCluesQuiz = quiz.quizType === 'guess_from_clues';
  const maxPerQ = isCluesQuiz ? 3 : 1;
  const avgScorePct = quiz.totalCompletions > 0 && quiz.questionCount > 0
    ? Math.round((quiz.totalScoreSum / quiz.totalCompletions) / (quiz.questionCount * maxPerQ) * 100)
    : null;

  // Refresh server components (navbar XP) and fetch related quizzes when result shows
  useEffect(() => {
    if (state.phase === 'result') {
      router.refresh();
      fetch(`/api/quiz/${quiz.id}/related`)
        .then(res => res.json())
        .then((data: { quizzes: RelatedQuiz[] }) => setRelatedQuizzes(data.quizzes))
        .catch(() => {});
    } else {
      setRelatedQuizzes([]);
      setLevelUpDismissed(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, router, quiz.id]);

  // Answer-state sound effects. Plays correct/wrong when transitioning from
  // playing -> answered, and perfect when transitioning to result (unless a
  // level-up overlay is about to claim the chime slot instead).
  useEffect(() => {
    if (state.phase === 'answered') {
      if (state.isCorrect) {
        playCorrect();
      } else {
        playWrong();
      }
    } else if (state.phase === 'result') {
      const maxScore =
        state.quizType === 'guess_from_clues' ? state.totalQuestions * 3 : state.totalQuestions;
      const isPerfect = state.score === maxScore && maxScore > 0;
      if (isPerfect && !state.leveledUp) {
        // Slight delay so the result screen has time to start animating in
        const t = setTimeout(() => playPerfect(), 300);
        return () => clearTimeout(t);
      }
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

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
    playTap();
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/questions`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data: { questions: QuestionData[]; settings: QuizSettings; quiz_type: string } = await res.json();
      questionStartRef.current = Date.now();
      perQuestionTimesRef.current = [];
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
    const qTime = Math.round((Date.now() - questionStartRef.current) / 100) / 10;
    perQuestionTimesRef.current.push(qTime);
    dispatch({ type: 'ANSWER', selectedAnswer: index });
  }, []);

  const handleClueAnswer = useCallback((index: number, cluesUsed: number) => {
    dispatch({ type: 'CLUE_ANSWER', selectedAnswer: index, cluesUsed });
  }, []);

  const handleRevealClue = useCallback(() => {
    dispatch({ type: 'REVEAL_CLUE' });
  }, []);

  const handleNext = useCallback(async () => {
    if (state.phase !== 'answered') return;
    playTap();

    const isLast = state.questionIndex >= state.questions.length - 1;
    if (!isLast) {
      questionStartRef.current = Date.now();
      dispatch({ type: 'NEXT_QUESTION' });
      return;
    }

    // Record play and show results
    const timeTaken = Math.round((Date.now() - state.startTime) / 1000);
    let percentile: number | null = null;
    let passRate: number | null = null;
    let xpEarned = 0;
    let leveledUp = false;
    let newLevel: number | null = null;
    let newLevelName: string | null = null;

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
          per_question_times: perQuestionTimesRef.current,
        }),
      });
      if (res.ok) {
        const data: {
          percentile: number;
          xp_earned?: number;
          pass_rate?: number | null;
          leveled_up?: boolean;
          new_level?: number | null;
          new_level_name?: string | null;
        } = await res.json();
        percentile = data.percentile;
        xpEarned = data.xp_earned ?? 0;
        passRate = data.pass_rate ?? null;
        leveledUp = data.leveled_up ?? false;
        newLevel = data.new_level ?? null;
        newLevelName = data.new_level_name ?? null;
      }
    } catch {
      showToast("Couldn't save your score. Your result is still valid!", 'info');
    }

    dispatch({
      type: 'SHOW_RESULT',
      percentile,
      passRate,
      timeTaken,
      xpEarned,
      leveledUp,
      newLevel,
      newLevelName,
    });
  }, [state, quiz.id, showToast]);

  const handleShare = useCallback(async () => {
    if (state.phase !== 'result') return;
    playShare();

    const maxScore = state.quizType === 'guess_from_clues' ? state.totalQuestions * 3 : state.totalQuestions;
    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/q/${quiz.slug}?utm_source=native_share&utm_medium=social&utm_campaign=quiz_share&s=${state.score}&t=${maxScore}`;
    const timeStr = state.timeTaken > 0 ? ` in ${state.timeTaken}s` : '';
    const shareText = `I scored ${state.score}/${maxScore}${timeStr} on "${quiz.title}" Can you beat me?`;

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
  // Mascot mood derived from game state
  // ============================================
  let mascotMood: MascotMood = 'idle';
  if (state.phase === 'answered') {
    if (!state.isCorrect) {
      mascotMood = 'wrong';
    } else {
      // Count trailing consecutive correct answers
      let streak = 0;
      for (let i = state.answers.length - 1; i >= 0; i -= 1) {
        const ans = state.answers[i];
        const q = state.questions[i];
        if (ans !== null && ans !== undefined && q && isAnswerCorrect(q, ans)) {
          streak += 1;
        } else {
          break;
        }
      }
      mascotMood = streak >= 3 ? 'combo' : 'correct';
    }
  } else if (state.phase === 'result') {
    const maxScoreForMood =
      state.quizType === 'guess_from_clues' ? state.totalQuestions * 3 : state.totalQuestions;
    const pct = maxScoreForMood > 0 ? state.score / maxScoreForMood : 0;
    if (pct === 1) mascotMood = 'combo';
    else if (pct >= 0.7) mascotMood = 'correct';
    else if (pct < 0.5) mascotMood = 'wrong';
    else mascotMood = 'idle';
  }

  // ============================================
  // INTRO STATE
  // ============================================
  if (state.phase === 'intro') {
    return (
      <div className="max-w-[440px] mx-auto px-1">
        <LightstickMascot mood={mascotMood} />

        {/* Hero banner: cover image if available, otherwise group gradient */}
        <div
          className="rounded-2xl border border-default overflow-hidden bg-surface"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div
            className="relative h-[140px] flex items-center justify-center overflow-hidden"
            style={
              quiz.coverImageUrl
                ? undefined
                : { background: `linear-gradient(135deg, ${quiz.displayColor}, var(--bg-accent-subtle))` }
            }
          >
            {quiz.coverImageUrl && (
              <>
                <Image
                  src={quiz.coverImageUrl}
                  alt={`${quiz.title} - ${quiz.groupName || 'K-pop'} quiz`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 440px) 100vw, 440px"
                />
                {/* Dark overlay so the group logo + future overlays stay readable */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0.05) 55%)' }}
                />
              </>
            )}
            <div className="relative">
              <GroupLogo
                groupName={quiz.groupName}
                logoUrl={quiz.logoUrl}
                displayColor={quiz.displayColor}
                textColor={quiz.textColor}
                size={72}
              />
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <Link href={`/${quiz.groupSlug}-quiz`}>
                <GroupPill name={quiz.groupName} displayColor={quiz.displayColor} textColor={quiz.textColor} />
              </Link>
              <DifficultyBadge difficulty={quiz.difficulty} />
              <QuizTypeBadge type={quiz.quizType} size="sm" />
            </div>

            <h1 className="text-[22px] font-semibold leading-tight text-primary">{quiz.title}</h1>
            <p className="text-[11px] text-ghost mt-1">{quiz.questionCount} questions</p>

            <div className="flex items-center gap-2 mt-4">
              <UserAvatar
                username={quiz.creatorUsername}
                avatarUrl={quiz.creatorAvatarUrl}
                bgColor={quiz.creatorAvatarBg}
                textColor={quiz.creatorAvatarText}
                size={24}
              />
              <p className="text-xs text-secondary">
                by{' '}
                <Link
                  href={`/u/${quiz.creatorUsername}`}
                  className="font-medium text-primary hover:text-accent transition-colors"
                >
                  {quiz.creatorUsername}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Stats row - 3 equal cells */}
        <div className="mt-3 grid grid-cols-3 gap-px bg-default rounded-xl overflow-hidden border border-default">
          <div className="bg-surface p-3 text-center">
            <p className="text-[16px] font-semibold text-primary tabular-nums">{formatCount(quiz.playCount)}</p>
            <p className="text-[9px] uppercase tracking-wider text-ghost mt-0.5">Plays</p>
          </div>
          <div className="bg-surface p-3 text-center">
            <p className={`text-[16px] font-semibold tabular-nums ${avgScorePct !== null ? 'text-combo' : 'text-tertiary'}`}>
              {avgScorePct !== null ? `${avgScorePct}%` : 'new'}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-ghost mt-0.5">Avg score</p>
          </div>
          <div className="bg-surface p-3 text-center">
            <p className={`text-[16px] font-semibold tabular-nums ${quiz.passRate !== null ? 'text-primary' : 'text-tertiary'}`}>
              {quiz.passRate !== null ? `${quiz.passRate}%` : '-'}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-ghost mt-0.5">Pass rate</p>
          </div>
        </div>

        {/* Big START button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full mt-4 py-4 rounded-2xl bg-accent text-white text-[17px] font-bold tracking-wide active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            'START QUIZ'
          )}
        </button>

        <div className="flex items-center justify-center gap-4 mt-4">
          <RedditShareButton
            url={`${process.env.NEXT_PUBLIC_SITE_URL}/q/${quiz.slug}?utm_source=reddit&utm_medium=social&utm_campaign=quiz_share`}
            title={`${quiz.title} - free K-pop quiz on kpopquiz.org`}
            compact
          />
        </div>
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
    const isImageQuiz = state.quizType === 'image' && 'image_url' in question;
    const isIntruderQuiz = state.quizType === 'intruder';

    // Build per-question result dots
    const progressResults: (boolean | null)[] = state.questions.map((q, i) => {
      const ans = state.answers[i];
      if (ans === undefined || ans === null) return null;
      return isAnswerCorrect(q, ans);
    });

    return (
      <div className="max-w-[440px] mx-auto">
        <LightstickMascot mood={mascotMood} />

        {/* Top bar */}
        <div className="flex items-center justify-between px-1 py-2">
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="text-[11px] text-ghost hover:text-secondary transition-colors cursor-pointer"
            aria-label="Quit quiz"
          >
            Quit
          </button>
          <span className="text-xs text-ghost tabular-nums">
            {state.questionIndex + 1}/{state.questions.length}
          </span>
          <div className="flex items-center gap-2 min-w-[44px] justify-end">
            {state.phase === 'playing' && 'settings' in state && state.settings.timer ? (
              <TimerCircle
                seconds={state.timeRemaining}
                total={state.settings.timer_seconds}
                isUrgent={state.timeRemaining <= 5}
              />
            ) : (
              <RunningTimer isRunning={state.phase === 'playing' || state.phase === 'answered'} />
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div className="pt-1 pb-4">
          <ProgressDots results={progressResults} current={state.questionIndex} />
        </div>

        {/* "Aigo~" flash on wrong answer - absolute so it doesn't shift layout */}
        {isAnswered && !state.isCorrect && (
          <div className="relative">
            <p
              key={`aigo-${state.questionIndex}`}
              className="absolute inset-x-0 -top-1 text-center text-sm font-semibold text-wrong animate-fade-out-up pointer-events-none"
            >
              {KOREAN.wrong}
            </p>
          </div>
        )}

        <div key={state.questionIndex} className="animate-question-in">
          {/* Type badge above question */}
          <div className="flex justify-center mb-3">
            <QuizTypeBadge type={state.quizType} size="sm" />
          </div>

          {/* ======================== */}
          {/* GUESS FROM CLUES */}
          {/* ======================== */}
          {isClues && (
            <>
              {/* Clues */}
              <div className="space-y-1.5 mb-4 bg-surface border border-default rounded-xl p-4">
                {question.clues!.slice(0, state.cluesRevealed).map((clue, i) => (
                  <p key={i} className="text-sm animate-question-in">
                    <span className="text-ghost font-semibold text-[11px] uppercase tracking-wider">Clue {i + 1}</span>{' '}
                    <span className="text-primary">{clue}</span>
                  </p>
                ))}
              </div>

              {/* Prompt */}
              <p className="text-[17px] font-semibold leading-snug text-primary text-center mb-5 px-2">
                {question.question}
              </p>

              <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
                {getEffectiveOptions(question).map((option, i) => {
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

              {/* Points indicator + clue button */}
              {!isAnswered && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.max(1, 4 - state.cluesRevealed) }).map((_, i) => (
                      <svg key={`filled-${i}`} width="13" height="13" viewBox="0 0 14 14" fill="var(--combo)">
                        <polygon points="7,1 9,5 13,5.5 10,8.5 10.8,13 7,11 3.2,13 4,8.5 1,5.5 5,5" />
                      </svg>
                    ))}
                    {Array.from({ length: 3 - Math.max(1, 4 - state.cluesRevealed) }).map((_, i) => (
                      <svg key={`empty-${i}`} width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="var(--text-ghost)" strokeWidth="1">
                        <polygon points="7,1 9,5 13,5.5 10,8.5 10.8,13 7,11 3.2,13 4,8.5 1,5.5 5,5" />
                      </svg>
                    ))}
                    <span className="text-[11px] text-ghost ml-1">
                      {Math.max(1, 4 - state.cluesRevealed)} pt{Math.max(1, 4 - state.cluesRevealed) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {state.cluesRevealed < 3 ? (
                    <button
                      onClick={handleRevealClue}
                      className="px-4 py-2 rounded-full bg-accent-bg border border-accent text-accent text-[12px] font-semibold hover:bg-accent hover:text-white transition-colors cursor-pointer"
                    >
                      {state.cluesRevealed === 1 ? 'Get a clue (-1pt)' : 'Last clue (-1pt)'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-ghost">No more clues</span>
                  )}
                </div>
              )}
            </>
          )}

          {/* ======================== */}
          {/* IMAGE QUIZ */}
          {/* ======================== */}
          {isImageQuiz && (
            <ImageQuestionView
              question={question as { question: string; image_url: string; options: string[] }}
              correctIndex={getCorrectIndex(question)}
              selectedAnswer={isAnswered ? state.selectedAnswer : null}
              isAnswered={isAnswered}
              onAnswer={handleAnswer}
            />
          )}

          {/* ======================== */}
          {/* INTRUDER */}
          {/* ======================== */}
          {isIntruderQuiz && (
            <IntruderQuestionView
              question={question as unknown as { question: string; options: Array<{ label: string; image_url: string }> }}
              correctIndex={getCorrectIndex(question)}
              selectedAnswer={isAnswered ? state.selectedAnswer : null}
              isAnswered={isAnswered}
              onAnswer={handleAnswer}
            />
          )}

          {/* ======================== */}
          {/* STANDARD (MC / TF) */}
          {/* ======================== */}
          {!isClues && !isImageQuiz && !isIntruderQuiz && (
            <>
              <p className="text-[17px] font-semibold leading-snug text-primary text-center mb-5 px-2">
                {question.question}
              </p>

              <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
                {getEffectiveOptions(question).map((option, i) => {
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
              <div className="mt-4 animate-fade-in">
                {state.selectedAnswer === null ? (
                  <FeedbackBox
                    type="timeout"
                    title="Time's up!"
                    text={typeof question.correct === 'boolean'
                      ? `The answer is ${getEffectiveOptions(question)[getCorrectIndex(question)] ?? ''}.`
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
                      ? `The answer is ${getEffectiveOptions(question)[getCorrectIndex(question)] ?? ''}.${question.fun_fact ? ` ${question.fun_fact}` : ''}`
                      : `The correct answer was ${LABELS[getCorrectIndex(question)] ?? ''}.${question.fun_fact ? ` ${question.fun_fact}` : ''}`}
                  />
                )}
              </div>

              <div className="mt-4">
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 rounded-xl bg-accent text-white text-[15px] font-bold active:scale-[0.98] transition-transform cursor-pointer"
                >
                  {isLast ? 'See results' : 'Next question'}
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
    const scorePct = Math.round((state.score / maxScore) * 100);

    // Stars derived from score percentage: 5 at 100%, 4 at 90+, 3 at 70+, 2 at 50+, else 1
    const starCount =
      scorePct >= 100 ? 5 : scorePct >= 90 ? 4 : scorePct >= 70 ? 3 : scorePct >= 50 ? 2 : 1;

    // Hangul + English label pulled from the shared korean-moments helper
    const resultLabel = getResultLabel(state.score, maxScore);
    const labelSub =
      scorePct >= 100 ? `True ${quiz.fandomName}` : resultLabel.sub;

    const showLevelUp = state.leveledUp && state.newLevel !== null && !levelUpDismissed;

    return (
      <div className="max-w-[440px] mx-auto px-1 py-2 animate-result-in">
        <LightstickMascot mood={mascotMood} />

        {/* Level up celebration overlay */}
        {showLevelUp && (() => {
          const levelTitle = getTitleForLevel(state.newLevel!);
          return (
            <LevelUpOverlay
              newLevel={state.newLevel!}
              title={levelTitle.en}
              titleKr={levelTitle.kr}
              onDismiss={() => setLevelUpDismissed(true)}
            />
          );
        })()}

        {/* Stars */}
        <div className="flex justify-center gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              width="22"
              height="22"
              viewBox="0 0 14 14"
              fill={i < starCount ? 'var(--combo)' : 'var(--bg-elevated)'}
            >
              <polygon points="7,1 9,5 13,5.5 10,8.5 10.8,13 7,11 3.2,13 4,8.5 1,5.5 5,5" />
            </svg>
          ))}
        </div>

        {/* Big score */}
        <p className="text-center text-5xl font-bold text-primary tabular-nums leading-none">
          {state.score}
          <span className="text-ghost text-3xl">/{maxScore}</span>
        </p>

        {/* Label: Hangul + English side by side */}
        <div className="text-center mt-3">
          <p className="text-[15px] font-bold text-accent tracking-wide">
            <span>{resultLabel.kr}</span>{' '}
            <span className="uppercase">{resultLabel.en}</span>
          </p>
          <p className="text-[12px] text-secondary mt-0.5">{labelSub}</p>
        </div>

        {/* Stats row - 3 cells */}
        <div className="mt-5 grid grid-cols-3 gap-px bg-default rounded-xl overflow-hidden border border-default">
          <div className="bg-surface p-3 text-center">
            <p className="text-[17px] font-semibold text-primary tabular-nums">{scorePct}%</p>
            <p className="text-[9px] uppercase tracking-wider text-ghost mt-0.5">Score</p>
          </div>
          <div className="bg-surface p-3 text-center">
            <p className={`text-[17px] font-semibold tabular-nums ${avgScorePct !== null ? 'text-primary' : 'text-tertiary'}`}>
              {avgScorePct !== null ? `${avgScorePct}%` : '-'}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-ghost mt-0.5">Avg</p>
          </div>
          <div className="bg-surface p-3 text-center">
            <p className={`text-[17px] font-semibold tabular-nums ${state.percentile !== null ? 'text-combo' : 'text-tertiary'}`}>
              {state.percentile !== null ? `Top ${Math.max(100 - state.percentile, 1)}%` : '-'}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-ghost mt-0.5">Rank</p>
          </div>
        </div>

        {/* XP card */}
        {state.xpEarned > 0 && (
          <div className="mt-3 bg-surface border border-default rounded-xl p-4 animate-fade-in">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-accent">
                +<RollingNumber value={state.xpEarned} duration={1200} /> XP
              </span>
              <span className="text-[10px] text-ghost">earned this round</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-elevated overflow-hidden">
              <div
                className="h-1 rounded-full bg-accent"
                style={{
                  width: `${Math.min(100, scorePct)}%`,
                  transition: 'width 1500ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
          </div>
        )}

        {/* Time comparison (keeps its own layout) */}
        {state.timeTaken > 0 && (
          <div className="mt-3">
            <TimeComparison
              quizId={quiz.id}
              userTime={state.timeTaken}
              score={state.score}
              totalQuestions={state.totalQuestions}
            />
          </div>
        )}

        {/* Clue breakdown */}
        {isClues && state.clueResults.length > 0 && (
          <div className="bg-surface border border-default rounded-xl p-4 mt-3 animate-fade-in">
            <p className="text-[10px] uppercase tracking-wider text-ghost mb-2">How you scored</p>
            <div className="flex flex-col gap-1.5">
              {[
                { clues: 1, label: 'guessed on first clue', stars: 3 },
                { clues: 2, label: 'needed 2 clues', stars: 2 },
                { clues: 3, label: 'needed all 3 clues', stars: 1 },
              ].map(({ clues, label: clueLabel, stars }) => {
                const count = state.clueResults.filter((r) => r.correct && r.cluesUsed === clues).length;
                if (count === 0) return null;
                return (
                  <div key={clues} className="flex items-center gap-2 text-[13px]">
                    <span className="text-combo w-10 flex-shrink-0">{'*'.repeat(stars)}</span>
                    <span className="text-primary font-semibold">{count}</span>
                    <span className="text-secondary">{clueLabel}</span>
                  </div>
                );
              })}
              {(() => {
                const wrongCount = state.clueResults.filter((r) => !r.correct).length;
                if (wrongCount === 0) return null;
                return (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="text-wrong w-10 flex-shrink-0">x</span>
                    <span className="text-primary font-semibold">{wrongCount}</span>
                    <span className="text-secondary">wrong</span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Reactions */}
        <QuizReactions quizId={quiz.id} />

        {/* Like + action buttons */}
        <div className="mt-4">
          <LikeQuizButton quizId={quiz.id} initialLiked={false} initialCount={quiz.likeCount} />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              playTap();
              dispatch({ type: 'RESET' });
            }}
            className="flex-1 py-3 rounded-xl bg-surface border border-default text-secondary text-[13px] font-semibold hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            {KOREAN.playAgain}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-xl bg-accent text-white text-[14px] font-bold active:scale-[0.98] transition-transform cursor-pointer"
          >
            Share
          </button>
        </div>

        <div className="mt-2">
          <RedditShareButton
            url={`${process.env.NEXT_PUBLIC_SITE_URL}/q/${quiz.slug}?utm_source=reddit&utm_medium=social&utm_campaign=quiz_share`}
            title={`I scored ${state.score}/${maxScore} on "${quiz.title}" - can you beat me?`}
            className="w-full py-2.5 rounded-xl border border-default text-[13px] font-medium bg-surface cursor-pointer hover:border-[#FF4500] hover:text-[#FF4500] transition-colors flex items-center justify-center gap-2 text-secondary"
          />
        </div>

        {/* Comments */}
        <QuizComments quizId={quiz.id} />

        <ReportForm quizId={quiz.id} />

        {/* Related quizzes */}
        {relatedQuizzes.length >= 2 && (
          <div className="mt-6 pt-5 border-t border-default animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider text-ghost">
                More {quiz.groupName} quizzes
              </p>
              <Link
                href={`/${quiz.groupSlug}-quiz`}
                className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
              >
                See all
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {relatedQuizzes.map((rq) => (
                <Link key={rq.id} href={`/q/${rq.slug}`} className="block">
                  <div className="bg-surface border border-default rounded-xl p-3 hover:border-accent transition-colors">
                    <p className="text-[13px] font-semibold text-primary truncate">{rq.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-ghost capitalize">{rq.difficulty}</span>
                      <span className="text-[10px] text-ghost">&middot;</span>
                      <span className="text-[10px] text-ghost">{formatCount(rq.play_count)} plays</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return <div />;
}
