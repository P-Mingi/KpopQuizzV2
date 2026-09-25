'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { ConfirmSheet } from '@/components/ux-v1/confirm-sheet';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { useShellMode } from '@/components/ux-v1/use-shell-mode';
import { refreshUxMe, useUxMe } from '@/components/ux-v1/use-ux-me';
import { analytics } from '@/lib/analytics';
import { getAnonId } from '@/lib/anon-id';
import { completeDaily } from '@/lib/daily-played';
import { recordGuestDaily } from '@/lib/guest-streak';
import { haptic } from '@/lib/haptics';
import { playCorrect, playShare, playTap, playWrong } from '@/lib/sounds';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';
import { challengeOutcome, parseChallengeParam } from '@/lib/ux-v1/p4/challenge';
import { clearContinueRun, peekContinueRun, saveContinueRun } from '@/lib/ux-v1/p4/continue';
import {
  getCorrectIndex, getEffectiveOptions, isAnswerCorrect, maxScoreFor, playPayload, questionSeconds, runReducer,
} from '@/lib/ux-v1/p4/engine';

import { P4Game } from './game';
import { P4Results } from './results';
import { P4RunContext } from './run-context';
import { storyFile, downloadStory } from './story';

import type { ChallengeOutcome, ChallengePublic } from '@/lib/ux-v1/p4/challenge';
import type { QuestionData, RunState } from '@/lib/ux-v1/p4/engine';
import type { QuizSettings, QuizType } from '@/lib/db/types';
import type { LoadedChallenge, P4RunApi, P4RunQuiz } from './run-context';

/** What the results screen knows beyond the reducer's result phase. */
export interface RunExtras {
  playId: string | null;
  relaxed: boolean;
  saved: boolean;
  /** outcome of a challenge run */
  outcome: ChallengeOutcome | null;
}

interface LastRun {
  quizId: string;
  at: number;
  state: Extract<RunState, { phase: 'result' }>;
  extras: RunExtras;
}

const LAST_RUN_KEY = 'ux:p4:last-run';
const LAST_RUN_TTL = 30 * 60 * 1000;

function saveLastRun(r: LastRun): void {
  try { localStorage.setItem(LAST_RUN_KEY, JSON.stringify(r)); } catch { /* blocked */ }
}
function readLastRun(quizId: string): LastRun | null {
  try {
    const raw = localStorage.getItem(LAST_RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as LastRun;
    if (!r || r.quizId !== quizId || Date.now() - r.at > LAST_RUN_TTL || r.state?.phase !== 'result') return null;
    return r;
  } catch { return null; }
}

type ShareKind = { kind: 'quiz' } | { kind: 'best'; score: number; total: number } | { kind: 'result' };

/**
 * The quiz run (DESIGN-SPEC 16.7 quiz page -> game -> results, 17.4). Client
 * provider around the server-rendered quiz page: while no run is on, it renders the
 * page (children, all server HTML, crawlable); a run replaces it with the game
 * (focus shell: no nav, tab bar or footer) and then the results. The scoring and the
 * save call are the EXISTS player's (lib/ux-v1/p4/engine.ts, same payload to
 * POST /api/quiz/[id]/play).
 */
export function P4Run({ quiz, children }: { quiz: P4RunQuiz; children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(runReducer, { phase: 'intro' } as RunState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [relaxed, setRelaxedState] = useState(false);
  const [challenge, setChallenge] = useState<LoadedChallenge | null>(null);
  const [extras, setExtras] = useState<RunExtras>({ playId: null, relaxed: false, saved: false, outcome: null });
  const [share, setShare] = useState<ShareKind | null>(null);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>(() => `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org'}/q/${quiz.slug}`);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  const toast = useUxToast();
  const announce = useAnnounce();
  const me = useUxMe();
  const signedIn = me === null ? null : Boolean(me.profile);

  const questionStart = useRef(Date.now());
  const perQ = useRef<number[]>([]);
  const runRelaxed = useRef(false);
  const runChallenge = useRef<LoadedChallenge | null>(null);
  // Restoring a finished run after sign-in: the reducer has no "load result" action on
  // purpose (the result phase only follows a real run), so the restored result lives
  // beside it until the next run starts.
  const restoreResult = useRef<Extract<RunState, { phase: 'result' }> | null>(null);
  const [restoreTick, setRestoreTick] = useState(0);
  const pendingComment = useRef<string | null>(null);
  const pendingClaim = useRef(false);

  const inGame = state.phase === 'playing' || state.phase === 'answered';
  useShellMode(inGame ? 'focus' : null);

  // ---- entry: ?c= challenge link, ?resume=1 (Continue playing), sign-in continuation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = parseChallengeParam(params.get('c'));
    if (c) {
      fetch(`/api/ux-v1/p4/challenge/${c.id}?s=${c.sig}`)
        .then((r) => (r.ok ? (r.json() as Promise<ChallengePublic>) : null))
        .then((d) => {
          if (!d || d.quizId !== quiz.id) return;
          setChallenge({ ...d, sig: c.sig });
          if (d.expired) toast('This challenge has expired. You can still play the quiz.');
        })
        .catch(() => {});
    }
    // sign-in continued (16.6): the results come back and the action completes
    const save = takePendingAction('p4-save');
    const comment = save ? null : takePendingAction('p4-comment');
    if (save || comment) {
      const last = readLastRun(quiz.id);
      if (last) {
        setExtras(last.extras);
        restoreResult.current = last.state;
        setRestoreTick((n) => n + 1);
        if (comment) pendingComment.current = (comment.payload as { text?: string } | undefined)?.text ?? '';
        if (save) pendingClaim.current = true;
      }
      return;
    }
    if (params.get('resume') === '1') {
      const saved = peekContinueRun(quiz.id);
      params.delete('resume');
      const q = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
      if (saved) {
        perQ.current = saved.perQuestionTimes ?? [];
        runRelaxed.current = saved.relaxed;
        setRelaxedState(saved.relaxed);
        questionStart.current = Date.now();
        dispatch({ type: 'RESUME', run: saved.run, now: Date.now() });
        toast(`Back at question ${saved.run.questionIndex + 1}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id]);

  const result: Extract<RunState, { phase: 'result' }> | null = state.phase === 'result'
    ? state
    : (state.phase === 'intro' && restoreTick > 0 ? restoreResult.current : null);
  const phase: 'intro' | 'play' | 'result' = inGame ? 'play' : result ? 'result' : 'intro';

  // guest "Sign in to save" came back signed in: put this browser's runs on the account
  // through the existing claim flow (POST /api/claim-runs, same payload as ClaimRun).
  useEffect(() => {
    if (!pendingClaim.current || signedIn !== true) return;
    pendingClaim.current = false;
    void (async () => {
      try {
        const res = await fetch('/api/claim-runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anonId: getAnonId() }),
        });
        if (res.ok) {
          setClaimed(true);
          toast(`Signed in. Your ${result ? `${result.score}/${maxScoreFor(result.quizType, result.totalQuestions)}` : 'run'} is saved`);
          refreshUxMe();
        } else {
          toast('Could not attach this run right now.');
        }
      } catch { toast('Could not attach this run right now.'); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, restoreTick]);

  // ---- timer (quiz-player: one tick a second while playing with a timer)
  const playingIndex = state.phase === 'playing' ? state.questionIndex : -1;
  const timerOn = state.phase === 'playing' && state.settings.timer;
  useEffect(() => {
    if (!timerOn) return;
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(t);
  }, [timerOn, playingIndex]);
  const timeLeft = state.phase === 'playing' ? state.timeRemaining : null;
  useEffect(() => {
    if (!timerOn || timeLeft === null) return;
    if (timeLeft === 5) announce('5 seconds left');
    if (timeLeft <= 0) dispatch({ type: 'TIMEOUT' });
  }, [timerOn, timeLeft, announce]);

  // ---- answer feedback: sounds + haptics (quiz-player) + the live region (16.7)
  const answeredKey = state.phase === 'answered' ? state.questionIndex : -1;
  useEffect(() => {
    if (state.phase !== 'answered') return;
    const q = state.questions[state.questionIndex];
    if (!q) return;
    if (state.isCorrect) { playCorrect(); haptic('correct'); } else { playWrong(); haptic('wrong'); }
    const right = getEffectiveOptions(q)[getCorrectIndex(q)] ?? '';
    const lead = state.isCorrect ? 'Correct.' : state.selectedAnswer === null ? 'Time is up.' : 'Not quite.';
    const sofar = state.quizType === 'guess_from_clues' ? `${state.score} points so far.` : `${state.score} of ${state.questionIndex + 1} so far.`;
    announce(`${lead} The answer is ${right}. ${sofar}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredKey]);

  // ---- actions
  const start = useCallback(async () => {
    if (loading) return;
    playTap();
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/questions`);
      if (!res.ok) throw new Error('questions');
      const data = (await res.json()) as { questions: QuestionData[]; settings: QuizSettings; quiz_type: string };
      const ch = challenge && !challenge.expired ? challenge : null;
      const useRelaxed = relaxed && !ch && quiz.relaxedLive;
      const settings: QuizSettings = useRelaxed ? { ...data.settings, timer: false } : data.settings;
      runRelaxed.current = useRelaxed;
      runChallenge.current = ch;
      perQ.current = [];
      questionStart.current = Date.now();
      restoreResult.current = null;
      setExtras({ playId: null, relaxed: useRelaxed, saved: false, outcome: null });
      setClaimed(false);
      setRank(null);
      clearContinueRun(quiz.id);
      dispatch({ type: 'START', questions: ch ? ch.questions : data.questions, settings, quizType: ((data.quiz_type as QuizType) ?? quiz.quizType) });
      window.scrollTo(0, 0);
    } catch {
      toast("Couldn't load the questions. Try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, quiz.id, quiz.quizType, quiz.relaxedLive, challenge, relaxed, toast]);

  const answer = useCallback((i: number) => {
    if (state.phase !== 'playing') return;
    if (state.quizType === 'guess_from_clues' && state.questions[state.questionIndex]?.clues?.length) {
      dispatch({ type: 'CLUE_ANSWER', selectedAnswer: i, cluesUsed: state.cluesRevealed });
      return;
    }
    perQ.current.push(questionSeconds(questionStart.current, Date.now()));
    dispatch({ type: 'ANSWER', selectedAnswer: i });
  }, [state]);

  const revealClue = useCallback(() => dispatch({ type: 'REVEAL_CLUE' }), []);

  const finish = useCallback(async () => {
    if (state.phase !== 'answered' || saving) return;
    setSaving(true);
    const now = Date.now();
    const relaxedRun = runRelaxed.current;
    const payload = playPayload({
      score: state.score,
      questionCount: state.questions.length,
      quizType: state.quizType,
      startTime: state.startTime,
      now,
      perQuestionTimes: perQ.current,
      anonId: getAnonId(),
      relaxed: relaxedRun,
    });
    let percentile: number | null = null;
    let passRate: number | null = null;
    let xpEarned = 0;
    let leveledUp = false;
    let newLevel: number | null = null;
    let newLevelName: string | null = null;
    let playId: string | null = null;
    let saved = false;
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = (await res.json()) as { play_id?: string | null; percentile?: number; xp_earned?: number; pass_rate?: number | null; leveled_up?: boolean; new_level?: number | null; new_level_name?: string | null };
        saved = true;
        playId = d.play_id ?? null;
        percentile = typeof d.percentile === 'number' ? d.percentile : null;
        xpEarned = d.xp_earned ?? 0;
        passRate = d.pass_rate ?? null;
        leveledUp = d.leveled_up ?? false;
        newLevel = d.new_level ?? null;
        newLevelName = d.new_level_name ?? null;
      }
    } catch {
      toast("Couldn't save your score. Your result is still valid!");
    }
    const timeTaken = Math.round((now - state.startTime) / 1000);
    const max = maxScoreFor(state.quizType, state.questions.length);
    const ch = runChallenge.current;
    const outcome = ch ? challengeOutcome(state.score, ch) : null;
    const ex: RunExtras = { playId, relaxed: relaxedRun, saved, outcome };
    setExtras(ex);
    dispatch({ type: 'SHOW_RESULT', percentile, passRate, timeTaken, xpEarned, leveledUp, newLevel, newLevelName });
    setSaving(false);
    analytics.gameComplete('quiz', state.score, max);
    window.scrollTo(0, 0);
    clearContinueRun(quiz.id);
    announce(`Quiz finished. ${state.score} out of ${max}.${percentile !== null ? ` You beat ${percentile} percent of players.` : ''}${outcome ? ` ${outcome.line}` : ''}`);
    saveLastRun({
      quizId: quiz.id,
      at: Date.now(),
      state: {
        phase: 'result', score: state.score, totalQuestions: state.questions.length, questions: state.questions, answers: state.answers,
        quizType: state.quizType, percentile, passRate, timeTaken, xpEarned, leveledUp, newLevel, newLevelName, clueResults: state.clueResults,
      },
      extras: ex,
    });

    // quiz-player side effects kept: the daily quiz (?daily=quiz) streak + guest streak
    if (new URLSearchParams(window.location.search).get('daily') === 'quiz') {
      recordGuestDaily();
      void completeDaily('quiz');
    }
    // relaxed run: mark the play (v11-p4-relaxed-runs.sql) so the hall of fame leaves it out
    if (relaxedRun && playId) {
      void fetch('/api/ux-v1/p4/relaxed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playId }) }).catch(() => {});
    }
    // challenge run: record the attempt (battle_results) and report win / lose
    if (ch) {
      const perQuestion = state.questions.map((q, i) => {
        const a = state.answers[i];
        return a !== null && a !== undefined && isAnswerCorrect(q, a);
      });
      void fetch(`/api/ux-v1/p4/challenge/${ch.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sig: ch.sig, score: state.score, perQuestion, timeMs: now - state.startTime }),
      }).catch(() => {});
    }
    refreshUxMe();
  }, [state, saving, quiz.id, toast, announce]);

  const next = useCallback(() => {
    if (state.phase !== 'answered') return;
    playTap();
    if (state.questionIndex >= state.questions.length - 1) { void finish(); return; }
    questionStart.current = Date.now();
    dispatch({ type: 'NEXT_QUESTION' });
    window.scrollTo(0, 0);
  }, [state, finish]);

  const answeredCount = inGame ? (state as { answers: unknown[] }).answers.length : 0;
  const quit = useCallback(() => {
    if (!inGame) return;
    if (answeredCount === 0) { dispatch({ type: 'RESET' }); return; }
    setConfirmOpen(true);
  }, [inGame, answeredCount]);

  const leave = useCallback(() => {
    setConfirmOpen(false);
    if (state.phase !== 'playing' && state.phase !== 'answered') return;
    const nextIndex = state.phase === 'answered' ? state.questionIndex + 1 : state.questionIndex;
    if (nextIndex < state.questions.length) {
      saveContinueRun({
        quizId: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        groupName: quiz.groupName,
        groupSlug: quiz.groupSlug,
        quizType: state.quizType,
        difficulty: quiz.difficulty,
        total: state.questions.length,
        answered: state.answers.length,
        savedAt: Date.now(),
        perQuestionTimes: perQ.current,
        relaxed: runRelaxed.current,
        run: {
          questionIndex: nextIndex,
          score: state.score,
          answers: state.answers,
          questions: state.questions,
          settings: state.settings,
          quizType: state.quizType,
          clueResults: state.clueResults,
          elapsedMs: Date.now() - state.startTime,
        },
      });
      toast('Saved to Continue playing');
    }
    dispatch({ type: 'RESET' });
    window.scrollTo(0, 0);
  }, [state, quiz, toast]);

  const playAgain = useCallback(() => {
    restoreResult.current = null;
    dispatch({ type: 'RESET' });
    void start();
  }, [start]);

  const setRelaxed = useCallback((on: boolean) => {
    setRelaxedState(on);
    toast(on ? 'Timer off for your next run' : 'Timer on');
  }, [toast]);

  // ---- share sheet (quiz page, your best, the result)
  const openShare = useCallback((kind: 'quiz' | 'best', opts?: { score: number; total: number }) => {
    setChallengeUrl(null);
    setShare(kind === 'best' && opts ? { kind: 'best', score: opts.score, total: opts.total } : { kind: 'quiz' });
  }, []);
  const openResultShare = useCallback(() => {
    playShare();
    setChallengeUrl(null);
    setShare({ kind: 'result' });
  }, []);

  // A challenge link is minted when the sheet opens (never for a relaxed run).
  useEffect(() => {
    if (!share || share.kind === 'quiz') return;
    let cancelled = false;
    void (async () => {
      let texts: string[] | null = null;
      let score = 0;
      if (share.kind === 'result' && result && !extras.relaxed) {
        texts = result.questions.map((q) => q.question);
        score = result.score;
      } else if (share.kind === 'best') {
        try {
          const r = await fetch(`/api/quiz/${quiz.id}/questions`);
          if (r.ok) texts = ((await r.json()) as { questions: QuestionData[] }).questions.map((q) => q.question);
        } catch { /* no link */ }
        score = share.score;
      }
      if (!texts) return;
      try {
        const r = await fetch('/api/ux-v1/p4/challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id, questions: texts, score }),
        });
        const d = r.ok ? ((await r.json()) as { url?: string }) : null;
        if (!cancelled && d?.url) setChallengeUrl(d.url);
      } catch { /* the sheet simply has no challenge block */ }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [share]);

  // Tracked short link for signed-in sharers (lib/share.ts getShareUrl: same
  // POST /api/share/generate payload), else the page URL with the same UTM fallback.
  useEffect(() => {
    if (!share) return;
    const base = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org'}/q/${quiz.slug}`;
    setShareUrl(`${base}?utm_source=link&utm_medium=social&utm_campaign=quiz_share`);
    if (signedIn !== true) return;
    let cancelled = false;
    fetch('/api/share/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizId: quiz.id, platform: 'link' }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { shareCode?: string } | null) => { if (!cancelled && d?.shareCode) setShareUrl(`${window.location.origin}/s/${d.shareCode}`); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [share, signedIn, quiz.id, quiz.slug]);

  const api: P4RunApi = useMemo(() => ({
    quiz,
    start: () => { void start(); },
    loading,
    relaxed,
    setRelaxed,
    challenge,
    openShare,
  }), [quiz, start, loading, relaxed, setRelaxed, challenge, openShare]);

  const shareProps = (() => {
    if (!share) return null;
    const avg = quiz.averagePct;
    if (share.kind === 'result' && result) {
      const max = maxScoreFor(result.quizType, result.totalQuestions);
      const beat = [
        result.percentile !== null ? `You beat ${result.percentile}% of players` : null,
        rank ? `#${rank.rank.toLocaleString('en-US')} of ${rank.total.toLocaleString('en-US')}` : null,
      ].filter(Boolean).join(' · ') || null;
      const story = { photo: quiz.groupPhoto, groupName: quiz.groupName, title: quiz.title, score: result.score, maxScore: max, beatPct: result.percentile, stamp: 'KpopQuiz' };
      return {
        title: 'Share your score',
        preview: { image: quiz.photo, line1: `${result.score}/${max} on ${quiz.title}`, line2: beat ?? `${quiz.groupName} quiz` },
        text: `I scored ${result.score}/${max} on "${quiz.title}". Can you beat me?`,
        onStoryImage: async () => { toast((await downloadStory(story)) ? 'Story image saved' : 'Could not make the story image'); },
        storyFile: () => storyFile(story),
        challenge: challengeUrl ? { url: challengeUrl } : undefined,
      };
    }
    if (share.kind === 'best') {
      return {
        title: 'Challenge a friend',
        preview: { image: quiz.photo, line1: `Beat my ${share.score}/${share.total} on ${quiz.title}`, line2: `They get the same ${quiz.questionCount} questions and see your score at the end.` },
        text: `Beat my ${share.score}/${share.total} on "${quiz.title}"`,
        challenge: challengeUrl ? { url: challengeUrl } : undefined,
      };
    }
    return {
      title: 'Share this quiz',
      preview: { image: quiz.photo, line1: quiz.title, line2: `${quiz.playCount.toLocaleString('en-US')} plays${avg !== null ? ` · average ${avg}%` : ''}` },
      text: quiz.title,
    };
  })();

  return (
    <P4RunContext value={api}>
      <div className="p4-run" data-phase={phase} data-p4-quiz={quiz.id}>
        {phase === 'intro' ? children : null}
        {phase === 'play' && (state.phase === 'playing' || state.phase === 'answered') ? (
          <P4Game
            quiz={quiz}
            state={state}
            challenge={runChallenge.current}
            relaxed={runRelaxed.current}
            saving={saving}
            onAnswer={answer}
            onRevealClue={revealClue}
            onNext={next}
            onQuit={quit}
          />
        ) : null}
        {phase === 'result' && result ? (
          <P4Results
            quiz={quiz}
            result={result}
            extras={extras}
            signedIn={signedIn}
            claimed={claimed}
            onShare={openResultShare}
            onPlayAgain={playAgain}
            onRank={setRank}
            pendingComment={pendingComment}
          />
        ) : null}
      </div>
      <ConfirmSheet
        open={confirmOpen}
        title="Leave this quiz?"
        body={`You answered ${answeredCount} of ${inGame ? (state as { questions: unknown[] }).questions.length : quiz.questionCount}. You can pick it up later from Continue playing.`}
        confirmLabel="Leave"
        cancelLabel="Keep playing"
        onConfirm={leave}
        onCancel={() => setConfirmOpen(false)}
      />
      {shareProps ? (
        <ShareSheet
          open={share !== null}
          onClose={() => setShare(null)}
          title={shareProps.title}
          preview={shareProps.preview}
          url={shareUrl}
          text={shareProps.text}
          {...('onStoryImage' in shareProps ? { onStoryImage: shareProps.onStoryImage, storyFile: shareProps.storyFile } : {})}
          {...(shareProps.challenge ? { challenge: shareProps.challenge } : {})}
        />
      ) : null}
    </P4RunContext>
  );
}
