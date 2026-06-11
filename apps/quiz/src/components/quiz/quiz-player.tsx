'use client';

import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { useToast } from '@/components/ui/toast-provider';
import { QuizReactions } from '@/components/quiz/quiz-reactions';
import { QuizComments } from '@/components/quiz/quiz-comments';
import { LevelUpOverlay } from '@/components/quiz/level-up-overlay';
import { RollingNumber } from '@/components/ui/rolling-number';
import { ReportForm } from '@/components/quiz/report-form';
import { getTitleForLevel } from '@/lib/level-titles';
import { getResultLabel } from '@/lib/korean-moments';
import {
  playTap,
  playCorrect,
  playWrong,
  playPerfect,
  playShare,
} from '@/lib/sounds';
import { IntruderQuestionView } from '@/components/quiz/intruder-question';
import { TimeComparison } from '@/components/quiz/time-comparison';
import { GroupPill } from '@/components/ui/group-pill';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { QuizTypeIcon } from '@/components/quiz/quiz-type-icon';
import { GroupLogo } from '@/components/ui/group-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LikeQuizButton } from '@/components/ui/like-quiz-button';
import { RedditShareButton } from '@/components/share/reddit-share-button';
import { shareToReddit, copyShareLink } from '@/lib/share';
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [barReady, setBarReady] = useState(false);
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

  // §14e - estimated time: ~15s/question, rounded to the nearest half minute.
  const estHalfMin = Math.max(0.5, Math.round((quiz.questionCount * 15 / 60) * 2) / 2);
  const estMinutesLabel = estHalfMin % 1 === 0 ? `${estHalfMin}` : estHalfMin.toFixed(1);

  // Honour reduced-motion: show the score instantly + skip the bar fill anim.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // §10i - fill the score bar shortly after the result mounts (CSS transitions it).
  useEffect(() => {
    if (state.phase !== 'result') { setBarReady(false); return; }
    if (reduceMotion) { setBarReady(true); return; }
    const t = setTimeout(() => setBarReady(true), 100);
    return () => clearTimeout(t);
  }, [state.phase, reduceMotion]);

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
    const timeStr = state.timeTaken > 0 ? ` in ${state.timeTaken}s` : '';
    const shareText = `I scored ${state.score}/${maxScore}${timeStr} on "${quiz.title}" Can you beat me?`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      // Use tracked link for native share
      const shareUrl = await copyShareLink(quiz.id, quiz.slug).then(() =>
        `${window.location.origin}/q/${quiz.slug}`
      );
      try {
        await navigator.share({ title: quiz.title, text: shareText, url: shareUrl });
      } catch {
        // User cancelled share
      }
    } else {
      const copied = await copyShareLink(quiz.id, quiz.slug);
      showToast(copied ? 'Link copied!' : 'Could not copy link', copied ? 'success' : 'error');
    }
  }, [state, quiz.id, quiz.slug, quiz.title, showToast]);

  // ============================================
  // INTRO STATE
  // ============================================
  if (state.phase === 'intro') {
    return (
      <div className="max-w-[440px] mx-auto px-1">
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
              <QuizTypeIcon type={quiz.quizType} size={20} />
              <QuizTypeBadge type={quiz.quizType} size="sm" />
            </div>

            <h1 className="text-[22px] font-semibold leading-tight text-primary">{quiz.title}</h1>

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

        {/* §14e format strip - quiz format at a glance. Replaces the pre-play
            avg-score / pass-rate stats (§4a - those live on the result screen);
            play count kept as a trust signal (§4b). */}
        <div className="format-strip mt-3">
          <div className="format-item">
            <span className="format-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="format-val">{formatCount(quiz.playCount)} plays</span>
          </div>
          <div className="format-item">
            <span className="format-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
            </span>
            <span className="format-val">{quiz.questionCount} questions</span>
          </div>
          <div className="format-item">
            <span className="format-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </span>
            <span className="format-val">~{estMinutesLabel} min</span>
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
            title={quiz.title}
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

    const total = state.questions.length;
    const qNum = state.questionIndex + 1;
    const progressPct = Math.round((qNum / total) * 100);
    const hasTimer = 'settings' in state && state.settings.timer;
    const timerTotal = hasTimer ? state.settings.timer_seconds : 0;
    const timeLeft = state.phase === 'playing' ? Math.max(0, state.timeRemaining) : 0;
    const frac = hasTimer && timerTotal > 0 ? timeLeft / timerTotal : 1;
    const warn = hasTimer && timeLeft <= 8 && timeLeft > 5;
    const danger = hasTimer && timeLeft <= 5;
    const RING_CIRC = 172.8; // 2π × 27.5 (§10k)
    const selectedIdx = isAnswered ? state.selectedAnswer : null;

    // Current trailing correct streak (for the fire indicator).
    let streak = 0;
    for (let i = progressResults.length - 1; i >= 0; i -= 1) {
      const r = progressResults[i];
      if (r === null) continue;
      if (r === true) streak += 1;
      else break;
    }

    const opts = getEffectiveOptions(question);
    const correctIdx = getCorrectIndex(question);
    const correctText = opts[correctIdx] ?? '';
    const factText =
      question.fun_fact && question.fun_fact.trim()
        ? question.fun_fact
        : `The answer is ${correctText}.`;

    function answerClass(i: number): string {
      let c = 'ans-btn';
      if (isAnswered) {
        c += ' disabled';
        if (i === correctIdx) c += ' correct';
        else if (i === selectedIdx) c += ' wrong';
        else c += ' dimmed';
      }
      return c;
    }

    return (
      <div className="quiz-screen">
        {/* Quit */}
        <div className="flex justify-end mb-1">
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="text-[11px] text-ghost hover:text-secondary transition-colors cursor-pointer"
            aria-label="Quit quiz"
          >
            Quit
          </button>
        </div>

        {/* §10k top bar */}
        <div className="top-bar">
          <span className="group-tag">{quiz.groupName}</span>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="q-counter">{qNum} / {total}</span>
          <div className="score-pill">
            <span className="score-pip" />
            <span aria-live="polite">{state.score}</span> {isClues ? 'pts' : 'correct'}
          </div>
        </div>

        {/* §10k streak bar */}
        <div className="streak-bar">
          {progressResults.map((r, i) => (
            <span key={i} className={`streak-dot${r === true ? ' correct' : r === false ? ' wrong' : ''}`} />
          ))}
          <span className="streak-label">streak</span>
          <span className={`streak-fire${streak >= 2 ? ' show' : ''}`}>
            {streak >= 2 ? (
              <>
                {streak}{' '}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <path d="M12 2c1.5 3-1 5-1.5 6.5C12 8 13 6.5 13.5 5.5c1.5 1.8 2.5 3.8 2.5 6a4 4 0 0 1-8 0c0-1.2.5-2.4 1.3-3.3C9.2 9.7 9.6 11 11 11c-.3-2.5-1-6 1-9z" />
                </svg>
              </>
            ) : null}
          </span>
        </div>

        {/* §10k timer ring (counts during the playing phase) */}
        {hasTimer && state.phase === 'playing' && (
          <div className="timer-ring-wrap">
            <div className="timer-ring">
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle className="ring-bg" cx="32" cy="32" r="27.5" />
                <circle
                  className={`ring-fg${danger ? ' danger' : warn ? ' warn' : ''}`}
                  cx="32"
                  cy="32"
                  r="27.5"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={RING_CIRC * (1 - frac)}
                />
              </svg>
              <div
                className={`timer-num${danger ? ' danger' : warn ? ' warn' : ''}`}
                aria-live="polite"
                aria-label="seconds remaining"
              >
                {Math.ceil(timeLeft)}
              </div>
            </div>
          </div>
        )}

        <div key={state.questionIndex} className="animate-question-in">

          {/* Clue list (guess_from_clues) */}
          {isClues && (
            <div className="space-y-1.5 mb-4 bg-surface border border-default rounded-xl p-4">
              {question.clues!.slice(0, state.cluesRevealed).map((clue, i) => (
                <p key={i} className="text-sm animate-question-in">
                  <span className="text-ghost font-semibold text-[11px] uppercase tracking-wider">Clue {i + 1}</span>{' '}
                  <span className="text-primary">{clue}</span>
                </p>
              ))}
            </div>
          )}

          {/* Image (image type) - shown above the question */}
          {isImageQuiz && 'image_url' in question && (
            <div className="w-full max-h-[280px] rounded-[14px] overflow-hidden mb-4 bg-surface-alt flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(question as { image_url: string }).image_url}
                alt={question.question}
                className="w-full h-full object-contain max-h-[280px]"
                loading="eager"
              />
            </div>
          )}

          {/* §10k question text (intruder view renders its own header) */}
          {!isIntruderQuiz && <p className="q-text">{question.question}</p>}

          {/* Answers - §10k A/B/C/D chips for text options; image grid for intruder */}
          {isIntruderQuiz ? (
            <IntruderQuestionView
              question={question as unknown as { question: string; options: Array<{ label: string; image_url: string }> }}
              correctIndex={correctIdx}
              selectedAnswer={selectedIdx}
              isAnswered={isAnswered}
              onAnswer={handleAnswer}
            />
          ) : (
            <div className="answers">
              {opts.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  className={answerClass(i)}
                  disabled={isAnswered}
                  aria-pressed={selectedIdx === i}
                  onClick={() => (isClues ? handleClueAnswer(i, state.cluesRevealed) : handleAnswer(i))}
                >
                  <span className="ans-letter">{LABELS[i] ?? ''}</span>
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Clue controls (pre-answer) */}
          {isClues && !isAnswered && (
            <div className="flex items-center justify-between mt-3 mb-1">
              <span className="text-[11px] text-ghost">
                {Math.max(1, 4 - state.cluesRevealed)} pt{Math.max(1, 4 - state.cluesRevealed) === 1 ? '' : 's'} if you answer now
              </span>
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

          {/* §10k fun-fact reveal - after every answer (correct, wrong, or timeout) */}
          {isAnswered && (
            <div className="fact-reveal show">
              <div className="fact-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M12 2a7 7 0 0 0-4 12.6c.6.5 1 1.2 1 2.4h6c0-1.2.4-1.9 1-2.4A7 7 0 0 0 12 2z" />
                </svg>
              </div>
              <div className="fact-body">
                <p className="fact-label">Fun fact</p>
                <p className="fact-text">{factText}</p>
              </div>
            </div>
          )}

          {/* §10k next */}
          {isAnswered && (
            <button type="button" className="next-btn show" onClick={handleNext}>
              {isLast ? 'See results' : 'Next question →'}
            </button>
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

        {/* §10i + §12b - single branded result hero: count-up score, bar,
            beat-%, label, and share actions (no duplicate score block). */}
        <div className="result-share-card">
          <div className="result-share-header">
            <p className="result-share-group">{quiz.groupName} quiz</p>
            <p className="result-share-title">{quiz.title}</p>
          </div>
          <div className="result-share-body">
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="20" height="20" viewBox="0 0 14 14" fill={i < starCount ? 'var(--combo)' : 'var(--bg-elevated)'}>
                  <polygon points="7,1 9,5 13,5.5 10,8.5 10.8,13 7,11 3.2,13 4,8.5 1,5.5 5,5" />
                </svg>
              ))}
            </div>

            {/* Animated count-up score (instant under reduced-motion) */}
            <p className="result-share-score" aria-live="polite" aria-label={`You scored ${state.score} out of ${maxScore}`}>
              {reduceMotion ? state.score : <RollingNumber value={state.score} duration={Math.max(400, state.score * 80)} />}
              <span style={{ fontSize: '0.42em', color: 'var(--txt3)', fontWeight: 700 }}>/{maxScore}</span>
            </p>
            <p className="result-share-total">{isClues ? `${maxScore} points max` : `out of ${maxScore} questions`}</p>

            {/* §10i bar + beat-% */}
            <div className="result-bar-wrap">
              <div className="result-bar" style={{ width: `${barReady ? scorePct : 0}%` }} />
            </div>
            {state.percentile !== null && (
              <p className="text-[13px] text-secondary" style={{ marginBottom: 14 }}>
                You beat <strong className="text-accent">{state.percentile}%</strong> of players
              </p>
            )}

            {/* Hangul + English label */}
            <p className="text-[15px] font-bold text-accent tracking-wide">
              <span>{resultLabel.kr}</span>{' '}
              <span className="uppercase">{resultLabel.en}</span>
            </p>
            <p className="text-[12px] text-secondary mt-0.5" style={{ marginBottom: 12 }}>{labelSub}</p>

            <div className="flex items-center justify-center gap-1" style={{ marginBottom: 16 }}>
              <QuizTypeIcon type={state.quizType} size={16} />
              <QuizTypeBadge type={state.quizType} size="xs" />
            </div>

            <p className="result-share-url">kpopquiz.org</p>
          </div>
          <div className="result-share-actions">
            <button type="button" className="btn-primary" onClick={handleShare} aria-label="Share your result">
              Share result
            </button>
            <Link href="/quizzes" className="btn-outline" aria-label="Play another quiz">
              Play another
            </Link>
          </div>
        </div>

        {/* Like - placed high, right under the result */}
        <div className="mt-3">
          <LikeQuizButton quizId={quiz.id} initialLiked={false} initialCount={quiz.likeCount} />
        </div>

        {/* Stats row - Score / Avg / Rank (+ Pass rate when available) */}
        <div className={`mt-5 grid ${state.passRate !== null ? 'grid-cols-4' : 'grid-cols-3'} gap-px bg-default rounded-xl overflow-hidden border border-default`}>
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
          {state.passRate !== null && (
            <div className="bg-surface p-3 text-center">
              <p className="text-[17px] font-semibold text-primary tabular-nums">{state.passRate}%</p>
              <p className="text-[9px] uppercase tracking-wider text-ghost mt-0.5">Pass rate</p>
            </div>
          )}
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


        <div className="mt-2">
          <button
            onClick={() => shareToReddit(quiz.id, quiz.slug, quiz.title)}
            className="w-full py-2.5 rounded-xl border border-default text-[13px] font-medium bg-surface cursor-pointer hover:border-[#FF4500] hover:text-[#FF4500] transition-colors flex items-center justify-center gap-2 text-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.709 1.648 4.626 4.626 0 0 1 .01.175c0 .002 0 .005-.001.007a1.19 1.19 0 0 1-.594-.978zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277zm-.11-1.063a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0z" />
            </svg>
            Share on Reddit
          </button>
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
