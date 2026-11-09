'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { analytics } from '@/lib/analytics';
import { hasPlayedDaily } from '@/lib/daily-played';
import { dailyShareText, streakWords, timeToNextDaily } from '@/lib/daily-ui';
import { guestLiveStreak } from '@/lib/guest-streak';
import { SITE } from '@/lib/site/registry';
import { streakView } from '@/lib/ux-v1/a0/streak';
import { progressMarks } from '@/lib/ux-v1/p4/engine';

import { QuizEndBridge } from './quiz-end-bridge';
import { useDailyToday } from './use-daily-today';

import type { QuestionData } from '@/lib/ux-v1/p4/engine';
import type { P4RunQuiz } from './run-context';

/** The minute clock of the countdown (no 1 s timer: it only changes once a minute). */
function useNextIn(): string {
  const [t, setT] = useState(() => timeToNextDaily());
  useEffect(() => {
    const id = window.setInterval(() => setT(timeToNextDaily()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

/**
 * Audit 01 P1-5: the ending of a daily quiz run. "Quiz of the day done", the streak, the next quiz in, a spoiler-free share
 * (numbers and marks only, lib/daily-ui.ts), then "Also today" (the daily blindtest with its played state, Kpopdle through the
 * bridge) and yesterday's quiz, labelled as not counting. Calm copy: no loss threat, no guilt.
 */
export function DailyDone({ quiz, questions, answers, score, max }: {
  quiz: P4RunQuiz;
  questions: QuestionData[];
  answers: (number | null)[];
  score: number;
  max: number;
}): React.ReactElement {
  const me = useUxMe();
  const daily = useDailyToday();
  const nextIn = useNextIn();
  const [copied, setCopied] = useState(false);
  const [bt, setBt] = useState(false);
  useEffect(() => { setBt(hasPlayedDaily('blindtest')); }, []);

  const account = me?.profile ? streakView(me.profile.daily_streak, me.profile.last_daily_date) : null;
  const days = account ? account.days : guestLiveStreak().count;
  const words = streakWords(days);

  const share = async (): Promise<void> => {
    const text = dailyShareText({
      brand: SITE.brand.name,
      number: daily?.number ?? null,
      score,
      max,
      marks: progressMarks(questions, answers),
      url: `${window.location.origin}/daily?from=share`,
    });
    analytics.shareClick('result', 'quiz');
    try {
      if (typeof navigator.share === 'function') { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // a closed share sheet or a blocked clipboard: nothing to say
    }
  };

  return (
    <section className="p4-daily" data-testid="p4-daily-done" aria-labelledby="p4-daily-h">
      <h2 id="p4-daily-h" className="p4-daily-h"><Icon name="check" />Quiz of the day done</h2>
      <p className="p4-daily-l" data-testid="p4-daily-line">
        {words ? <b>{words}. </b> : null}
        Next quiz in <b className="ux-num">{nextIn}</b>.
      </p>
      <div className="p4-daily-acts">
        <UxButton variant="primary" icon="share" onClick={() => { void share(); }}>{copied ? 'Copied' : 'Share your result'}</UxButton>
      </div>
      <p className="p4-daily-sub">Also today</p>
      <div className="ux-rows">
        {SITE.features.dailyBlindTest ? (
          <Link className="ux-row" href={bt ? '/blindtest/leaderboard' : '/blindtest?daily=true&from=result'}>
            <span className="ux-thumb is-bt"><Icon name="music" /></span>
            <span className="ux-row-grow">
              <span className="ux-rt">Daily blindtest</span>
              <span className="ux-rs">{bt ? 'Done today. See the board.' : 'Guess the song from a ten-second clip'}</span>
            </span>
          </Link>
        ) : null}
        {quiz.bridge ? <QuizEndBridge bridge={quiz.bridge} /> : null}
        {daily?.yesterday ? (
          <Link className="ux-row" href={`/q/${daily.yesterday.slug}`} data-testid="p4-daily-yesterday">
            <span className="ux-thumb is-glyph"><Icon name="redo" /></span>
            <span className="ux-row-grow">
              <span className="ux-rt">Missed yesterday? {daily.yesterday.title}</span>
              <span className="ux-rs">Does not count for your streak.</span>
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Audit 01 P0-3: the first row of "Keep playing" on any other result: today's quiz of the day with its countdown, until it
 * is played on this browser; after that, the daily blindtest. Hidden when there is no daily (or none left to offer).
 */
export function DailyKeepRow(): React.ReactElement | null {
  const daily = useDailyToday();
  const nextIn = useNextIn();
  const [played, setPlayed] = useState<{ quiz: boolean; bt: boolean } | null>(null);
  useEffect(() => { setPlayed({ quiz: hasPlayedDaily('quiz'), bt: hasPlayedDaily('blindtest') }); }, []);
  if (!daily || !played) return null;
  if (!played.quiz) {
    return (
      <Link className="p4-nextq" href={`/q/${daily.slug}?daily=quiz&from=result`} data-testid="p4-daily-row">
        <span className="ux-thumb is-glyph"><Icon name="zap" /></span>
        <span className="ux-row-grow">
          <span className="p4-lbl">Quiz of the day</span>
          <span className="ux-rt">{daily.title}</span>
          <span className="ux-rs">New quiz in {nextIn}</span>
        </span>
        <span className="p4-go" aria-hidden="true"><Icon name="play" /></span>
      </Link>
    );
  }
  if (SITE.features.dailyBlindTest && !played.bt) {
    return (
      <Link className="p4-nextq" href="/blindtest?daily=true&from=result" data-testid="p4-daily-bt-row">
        <span className="ux-thumb is-bt"><Icon name="music" /></span>
        <span className="ux-row-grow">
          <span className="p4-lbl">Daily blindtest</span>
          <span className="ux-rt">Guess the song from a ten-second clip</span>
          <span className="ux-rs">New blindtest in {nextIn}</span>
        </span>
        <span className="p4-go" aria-hidden="true"><Icon name="play" /></span>
      </Link>
    );
  }
  return null;
}

/** Audit 01 P1-5: on a blindtest result, "Also today": the quiz of the day, until it is played on this browser. */
export function DailyQuizAlsoRow(): React.ReactElement | null {
  const daily = useDailyToday();
  const nextIn = useNextIn();
  const [played, setPlayed] = useState<boolean | null>(null);
  useEffect(() => { setPlayed(hasPlayedDaily('quiz')); }, []);
  if (!daily || played !== false) return null;
  return (
    <Link className="p4-nextq" href={`/q/${daily.slug}?daily=quiz&from=result`} data-testid="bt-daily-quiz-row" style={{ margin: '20px auto 0', maxWidth: 560 }}>
      <span className="ux-thumb is-glyph"><Icon name="zap" /></span>
      <span className="ux-row-grow">
        <span className="p4-lbl">Quiz of the day</span>
        <span className="ux-rt">{daily.title}</span>
        <span className="ux-rs">New quiz in {nextIn}</span>
      </span>
      <span className="p4-go" aria-hidden="true"><Icon name="play" /></span>
    </Link>
  );
}
