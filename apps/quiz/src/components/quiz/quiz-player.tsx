'use client';

import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { useToast } from '@/components/ui/toast-provider';
import { analytics } from '@/lib/analytics';
import { QuizComments } from '@/components/quiz/quiz-comments';
import { ResultChallenge, canChallenge } from '@/components/quiz/result-challenge';
import { getAnonId } from '@/lib/anon-id';
import { ClaimRun } from '@/components/quiz/claim-run';
import { StreakBackup } from '@/components/quiz/streak-backup';
import { recordGuestDaily } from '@/lib/guest-streak';
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
import { haptic } from '@/lib/haptics';
import { celebrate } from '@/lib/celebrate';
import { IntruderQuestionView } from '@/components/quiz/intruder-question';
import { QuizMyRank } from '@/components/quiz/quiz-my-rank';
import { GroupPill } from '@/components/ui/group-pill';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { QuizTypeIcon } from '@/components/quiz/quiz-type-icon';
import { GroupLogo } from '@/components/ui/group-logo';
import { Mascot } from '@/components/ui/mascot';
import { DiscordResultsLine } from '@/components/discord/discord-results-line';
import { BragButton } from '@/components/discord/brag-button';
import { completeDaily } from '@/lib/daily-played';
import { PersonCard } from '@/components/profile/person-card';
import { LikeQuizButton } from '@/components/ui/like-quiz-button';
import { QuizShareRow } from '@/components/share/quiz-share-row';
import { copyShareLink } from '@/lib/share';
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
  creatorId: string | null;
  creatorUsername: string;
  creatorXp?: number | null;
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
      // W2: the run itself survives into the result. It used to be dropped here,
      // which is why the old battle CTA could only start a fresh, unrelated set of
      // questions. The challenge block needs the exact questions the player saw
      // (post-shuffle order) and what they answered.
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

// ============================================
// Component
// ============================================

const LABELS = ['A', 'B', 'C', 'D'] as const;

/** m:ss for the Time stat cell. */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// UI-1 zone 1 - the human label printed on the photocard serial strip, one per
// quiz type. Kept here (not invented per render) so the strip reads the same on
// every card of a given kind.
const SERIAL_KIND: Record<QuizType, string> = {
  multiple_choice: 'Quiz',
  true_false: 'True / False',
  guess_from_clues: 'Clue Quiz',
  image: 'Image Quiz',
  intruder: 'Odd One Out',
};

export function QuizPlayer({ quiz }: QuizPlayerProps): React.ReactElement {
  const [state, dispatch] = useReducer(quizReducer, { phase: 'intro' });
  const [loading, setLoading] = useState(false);
  const [relatedQuizzes, setRelatedQuizzes] = useState<RelatedQuiz[]>([]);
  const [levelUpDismissed, setLevelUpDismissed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [barReady, setBarReady] = useState(false);
  // Total XP after this round, read once when the result shows so the XP bar
  // can draw the slice this round added. null = signed out / not loaded.
  const [profileXp, setProfileXp] = useState<number | null>(null);
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

  // The bottom tab bar lives in the ROOT LAYOUT and only knows the pathname, while the
  // result screen is client state on the same /q/[slug] route. Publishing the phase on
  // <body> is what lets the layout-level nav tell "still playing" from "finished", so the
  // player can hide it and the result screen can bring it back. Cleared on unmount, so a
  // client-side navigation away from a finished quiz cannot leave the flag behind.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.quizPhase = state.phase;
    // UI-1 zone 5: the same signal that shows the tab bar again also tells the
    // server-rendered "About this quiz" drawer, lower on the page, to collapse.
    // Only the result phase fires it, so a cold visitor's drawer stays open.
    if (state.phase === 'result') {
      window.dispatchEvent(new CustomEvent('quiz:played'));
    }
    return () => { delete document.body.dataset.quizPhase; };
  }, [state.phase]);

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
      // F6 + L4: if this was today's daily quiz (linked with ?daily=quiz),
      // record it locally (sleep card) AND, if signed in, award the streak XP.
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daily') === 'quiz') {
        // W3b: the guest's own streak count for this browser, recorded alongside the
        // signed-in server streak. Same day never double counts (see nextStreak).
        recordGuestDaily();
        void completeDaily('quiz');
      }
      router.refresh();
      fetch('/api/auth/me', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { profile: { xp?: number } | null } | null) => {
          setProfileXp(typeof d?.profile?.xp === 'number' ? d.profile.xp : null);
        })
        .catch(() => {});
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
        haptic('correct');
      } else {
        playWrong();
        haptic('wrong');
      }
    } else if (state.phase === 'result') {
      const maxScore =
        state.quizType === 'guess_from_clues' ? state.totalQuestions * 3 : state.totalQuestions;
      const isPerfect = state.score === maxScore && maxScore > 0;
      if (isPerfect && !state.leveledUp) {
        // Slight delay so the result screen has time to start animating in.
        // celebrate() = dynamic-imported confetti + haptic, both reduced-motion gated.
        const t = setTimeout(() => { playPerfect(); celebrate('perfect'); }, 300);
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
          // W3 A1: this browser's id, so the run can later carry a name. Null in
          // private mode, and the play succeeds either way.
          anon_id: getAnonId(),
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
    // Workstream LOOP B2 - the only analytics addition in this file. The quiz
    // result screen is the reference model and is otherwise untouched.
    analytics.gameComplete('quiz', state.score, maxScore);
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
    // F4: pre-play wait while questions are fetched after START. think mascot.
    if (loading) {
      return (
        <div className="max-w-[440px] mx-auto px-1">
          <div className="quiz-loading" role="status" aria-live="polite">
            <Mascot variant="think" animate="tilt" size={104} alt="" />
            <p className="quiz-loading-msg">Loading your quiz...</p>
          </div>
        </div>
      );
    }
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

            {/* Creator card (M1.12 single-source PersonCard) */}
            <div className="mt-4">
              <PersonCard
                person={{
                  username: quiz.creatorUsername,
                  avatarUrl: quiz.creatorAvatarUrl,
                  avatarBg: quiz.creatorAvatarBg,
                  avatarText: quiz.creatorAvatarText,
                  xp: quiz.creatorXp ?? 0,
                  followerCount: 0,
                }}
                compact
              />
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
          className="w-full mt-4 py-4 rounded-2xl bg-btn text-white text-[17px] font-bold tracking-wide active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </span>
          ) : (
            'START QUIZ'
          )}
        </button>

        {/* E7 - battle entry point: play this quiz head-to-head vs a real fan. */}
        <Link
          href={`/battle?quiz=${quiz.id}`}
          className="w-full mt-2.5 py-3 rounded-2xl border border-default text-primary text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3l14 14M14 5l5-2-2 5M5 19l5 2-2-5" /><path d="M16 16l3 3M8 8L5 5" /></svg>
          Battle a fan
        </Link>

        <div className="mt-4">
          <QuizShareRow quizId={quiz.id} slug={quiz.slug} quizTitle={quiz.title} creatorId={quiz.creatorId} />
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
                  className="px-4 py-2 rounded-full bg-accent-bg border border-accent text-accent text-[12px] font-semibold hover:bg-btn hover:text-white transition-colors cursor-pointer"
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

    // F3: celebrate mascot only on a good result (pass threshold = 50%).
    // A poor/failed result stays mascot-less here; the sad variant is F5.
    const isGoodResult = scorePct >= 50;

    const resultLabel = getResultLabel(state.score, maxScore);

    const showLevelUp = state.leveledUp && state.newLevel !== null && !levelUpDismissed;

    // Zone 3 - the run ledger cells. A comparison row, deliberately in the same
    // unit across cells: your score as a percent sits next to the field average
    // and the pass rate, so "You 25% / Avg 53% / Pass 32%" reads at a glance.
    // The raw score (2/8) and the percentile live on the photocard, so no fact
    // is repeated. The XP the round earned is a cell here, not its own card.
    const ledgerCells: Array<{ value: string; label: string; tone?: string }> = [
      { value: `${scorePct}%`, label: 'You', tone: 'text-accent' },
      avgScorePct !== null
        ? { value: `${avgScorePct}%`, label: 'Avg' }
        : { value: '-', label: 'Avg', tone: 'text-tertiary' },
    ];
    if (state.passRate !== null) ledgerCells.push({ value: `${state.passRate}%`, label: 'Pass' });
    if (state.xpEarned > 0) ledgerCells.push({ value: `+${state.xpEarned}`, label: 'XP', tone: 'text-accent' });
    if (state.timeTaken > 0) ledgerCells.push({ value: formatDuration(state.timeTaken), label: 'Time' });
    const ledgerCols = Math.min(ledgerCells.length, 5);

    // Zone 1 - the photocard serial strip. Real data only: the run's play
    // number is this quiz's recorded play count plus this run (which is not in
    // the ISR-baked count yet), and the mint month is now. The result phase
    // only ever renders client-side after a play, so new Date() cannot cause a
    // server/client hydration mismatch.
    const serialNo = quiz.playCount + 1;
    const serialMonth = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const serialKind = SERIAL_KIND[state.quizType] ?? 'Quiz';

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

        {/* ZONE 1 - the photocard hero. The result IS the share image: a
            branded gradient top with the score, the mascot as a sticker on the
            seam, a verdict stamp, share/replay actions, and a real serial strip.
            Count-up score, fill bar and share handler are all kept from the
            previous hero, only recomposed. */}
        <div className="photocard">
          <div className="photocard-top">
            <div className="photocard-group">{quiz.groupName} quiz</div>
            <div className="photocard-quiz-title">{quiz.title}</div>
            <div className="photocard-score" aria-live="polite" aria-label={`You scored ${state.score} out of ${maxScore}`}>
              {reduceMotion ? state.score : <RollingNumber value={state.score} duration={Math.max(400, state.score * 80)} />}
              <small>/{maxScore}</small>
            </div>
            <div className="photocard-bar">
              <i style={{ width: `${barReady ? scorePct : 0}%` }} />
            </div>
            {state.percentile !== null && (
              <div className="photocard-beat">
                You beat <strong>{state.percentile}%</strong> of players
              </div>
            )}
            {/* The real mascot as the sticker, overlapping the seam. Celebrate
                on a pass, sad on a miss (sad never animates by design). */}
            <div className="photocard-sticker">
              {isGoodResult
                ? <Mascot variant="celebrate" animate="bob" size={72} />
                : <Mascot variant="sad" size={72} />}
            </div>
          </div>
          <div className="photocard-body">
            <span className="verdict-stamp">
              <span>{resultLabel.kr}</span>{' '}
              <span className="uppercase">{resultLabel.en}</span>
            </span>
          </div>
          <div className="photocard-actions">
            <button type="button" className="btn-primary" onClick={handleShare} aria-label="Share your result card">
              Share this card
            </button>
            <Link href="/quizzes" className="btn-outline" aria-label="Play another quiz">
              Play again
            </Link>
          </div>
          {/* K2 - one-line Discord link near the share row. */}
          <div className="text-center" style={{ marginTop: 2, marginBottom: 4 }}>
            <DiscordResultsLine surface="quiz-result" text="Compare with the community on Discord" />
          </div>
          {/* K7 - Brag in the Discord on a GOOD result (>=70%). */}
          {scorePct >= 70 && (
            <div className="text-center" style={{ marginBottom: 4 }}>
              <BragButton payload={{ kind: 'quiz', title: quiz.title, score: state.score, total: maxScore, quizSlug: quiz.slug }} />
            </div>
          )}
          <div className="photocard-serial">
            <span>KpopQuiz &middot; {serialKind}</span>
            <span>Play No. {serialNo.toLocaleString('en-US')} &middot; {serialMonth}</span>
          </div>
        </div>

        {/* W2 PART A - the challenge trigger, at the emotional peak: directly under
            the score card, above everything else on this screen. Hidden when the
            run cannot be replayed faithfully as a battle (clue quizzes, boolean
            answers) rather than shipping a battle that does not match the run. */}
        {canChallenge(state.questions) && (
          <ResultChallenge
            quizId={quiz.id}
            quizTitle={quiz.title}
            groupSlug={quiz.groupSlug}
            score={state.score}
            maxScore={maxScore}
            timeTakenSec={state.timeTaken}
            questions={state.questions}
            answers={state.answers}
          />
        )}

        {/* W3b - streak backup, daily plays only, at 3/7/14, once each. An
            occasional nudge, kept at the emotional peak just under the battle. */}
        <StreakBackup signedIn={profileXp !== null} />

        {/* ZONE 3 - the run ledger. One card absorbs the old stat row, the XP
            card, your-best/rank, the like pill and the claim card into a single
            summary. Every fact appears once, and the components (QuizMyRank,
            LikeQuizButton, ClaimRun) keep their internals; only placement and
            the claim block's shell change. */}
        <div className="run-ledger mt-3" style={{ '--ledger-cols': ledgerCols } as React.CSSProperties}>
          <div className="run-ledger-cells">
            {ledgerCells.map((cell) => (
              <div key={cell.label}>
                <p className={`v ${cell.tone ?? 'text-primary'}`}>{cell.value}</p>
                <p className="k">{cell.label}</p>
              </div>
            ))}
          </div>
          <div className="run-ledger-body">
            {/* Your standing on this quiz's board (signed-in island). */}
            <QuizMyRank quizId={quiz.id} isClues={quiz.quizType === 'guess_from_clues'} />
            <LikeQuizButton quizId={quiz.id} initialLiked={false} initialCount={quiz.likeCount} />
          </div>
          {/* W3 A4 - claim this run. After the score, never before. Flush shell
              so it reads as the ledger's last section; copy and logic unchanged. */}
          <ClaimRun signedIn={profileXp !== null} surface="quiz-result" flush />
        </div>

        {/* Clue breakdown - belongs with the ledger (zone 3). */}
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

        {/* ZONE 4 - keep playing. Related quizzes plus the blindtest cross-link
            as the last row, in one list card. Play again lives in the photocard,
            so it is not repeated here. */}
        <div className="mt-6">
          <div className="keep-playing-head">
            <span className="h">Keep playing</span>
            <Link href={`/${quiz.groupSlug}-quiz`} className="a">All {quiz.groupName} quizzes</Link>
          </div>
          <div className="keep-playing-list" style={{ marginTop: 7 }}>
            {relatedQuizzes.map((rq) => (
              <Link key={rq.id} href={`/q/${rq.slug}`} className="keep-playing-row">
                <span className="t">{rq.title}</span>
                <span className="m">{formatCount(rq.play_count)} plays</span>
              </Link>
            ))}
            <Link href="/blindtest" className="keep-playing-row">
              <span className="t" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
                K-pop blind test
              </span>
              <span className="m">audio</span>
            </Link>
          </div>
        </div>

        {/* Per-network share (Reddit / Discord / X), kept below the zones. */}
        <div className="mt-4">
          <QuizShareRow quizId={quiz.id} slug={quiz.slug} quizTitle={quiz.title} creatorId={quiz.creatorId} />
        </div>

        {/* Comments */}
        <QuizComments quizId={quiz.id} isClues={quiz.quizType === 'guess_from_clues'} />

        <ReportForm quizId={quiz.id} />
      </div>
    );
  }

  return <div />;
}
