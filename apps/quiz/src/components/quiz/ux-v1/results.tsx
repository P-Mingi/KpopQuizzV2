'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { LevelUpOverlay } from '@/components/quiz/level-up-overlay';
import { StreakBackup } from '@/components/quiz/streak-backup';
import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxStatsRow } from '@/components/ux-v1/panel';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { haptic } from '@/lib/haptics';
import { getResultLabel } from '@/lib/korean-moments';
import { getTitleForLevel } from '@/lib/level-titles';
import { playPerfect } from '@/lib/sounds';
import { formatCount } from '@/lib/utils';
import { streakView } from '@/lib/ux-v1/a0/streak';
import { QUIZ_TYPE_ICON, QUIZ_TYPE_LABEL } from '@/lib/ux-v1/a0/icons';
import { formatDuration, maxScoreFor } from '@/lib/ux-v1/p4/engine';
import { stampWords } from '@/lib/ux-v1/p4/format';

import { P4Comments } from './comments';
import { P4ReportButton } from './report';

import type { RunState } from '@/lib/ux-v1/p4/engine';
import type { RunExtras } from './quiz-run';
import type { P4RunQuiz } from './run-context';

type Result = Extract<RunState, { phase: 'result' }>;

const CONFETTI = ['#E8457A', '#FF9DBC', '#C99A1E', '#4FC07F', '#7A50DC', '#3FA3A3'];
const LEVEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

function useCountUp(to: number, ms: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return; }
    const t0 = performance.now();
    let raf = 0;
    const f = (now: number): void => {
      const p = Math.min(1, (now - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

interface Standing { signedIn: boolean; played?: boolean; bestScore?: number; total?: number; rank: number | null; totalPlayers: number | null }

/**
 * Quiz results (DESIGN-SPEC 16.7 "Results (600)", 17.4, prototype #end): photocard
 * kept exactly (count-up score, verdict stamp from getResultLabel, mascot on the seam,
 * confetti on a pass), XP + streak line (guest: "Save your 7/8" -> sign-in sheet),
 * You / Average / Time in one bordered row, the rank line (challenge runs: win or
 * lose), primary button by score (Share above the quiz average, Play again below),
 * Like, Keep playing, comments folded, Report. Every number comes from the finished
 * run and the quiz played.
 */
export function P4Results({ quiz, result, extras, signedIn, claimed, onShare, onPlayAgain, pendingComment }: {
  quiz: P4RunQuiz;
  result: Result;
  extras: RunExtras;
  signedIn: boolean | null;
  claimed: boolean;
  onShare: () => void;
  onPlayAgain: () => void;
  pendingComment: React.RefObject<string | null>;
}): React.ReactElement {
  const max = maxScoreFor(result.quizType, result.totalQuestions);
  const pct = max > 0 ? Math.round((result.score / max) * 100) : 0;
  const shown = useCountUp(result.score, 900);
  const stamp = stampWords(getResultLabel(result.score, max));
  const good = quiz.averagePct === null ? pct >= 50 : pct >= quiz.averagePct;
  const signIn = useSignIn();
  const me = useUxMe();
  const [levelUpDone, setLevelUpDone] = useState(false);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [pieces] = useState(() => Array.from({ length: 40 }, (_, k) => ({ left: Math.random() * 100, delay: Math.random() * 0.5, rot: Math.random() * 180, color: CONFETTI[k % CONFETTI.length] })));
  const [pendingText] = useState<string | null>(() => { const t = pendingComment.current; pendingComment.current = null; return t; });
  const h1 = useRef<HTMLHeadingElement>(null);

  useEffect(() => { h1.current?.focus({ preventScroll: true }); }, []);

  // quiz-player: the perfect-run chime (the level-up overlay takes the slot when it shows)
  useEffect(() => {
    if (result.score === max && max > 0 && !result.leveledUp) {
      const t = window.setTimeout(() => { playPerfect(); haptic('levelUp'); }, 300);
      return () => window.clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // rank line: your standing on this quiz's board (read only; guests only once the
  // get_quiz_rank_for_score migration is applied, else no line)
  useEffect(() => {
    if (extras.outcome || signedIn === null) return;
    let cancelled = false;
    fetch(`/api/ux-v1/p4/standing?quiz=${quiz.id}&score=${result.score}`, { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<Standing>) : null))
      .then((d) => { if (!cancelled && d) setStanding(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [quiz.id, result.score, signedIn, extras.outcome, claimed]);

  const passed = pct >= 60;
  const streak = me?.profile ? streakView(me.profile.daily_streak, me.profile.last_daily_date) : null;
  const streakSaved = streak && streak.state === 'played_today' ? streak.days : null;
  const levelTitle = result.leveledUp && result.newLevel !== null ? getTitleForLevel(result.newLevel) : null;
  const [first, ...rest] = quiz.keepPlaying;
  const chipScore = standing?.signedIn && typeof standing.bestScore === 'number' ? `${standing.bestScore}/${maxScoreFor(result.quizType, standing.total ?? result.totalQuestions)}` : `${result.score}/${max}`;

  const shareBtn = <UxButton key="share" variant={good ? 'primary' : 'ghost'} size="lg" icon="share" onClick={onShare}>Share</UxButton>;
  const againBtn = <UxButton key="again" variant={good ? 'ghost' : 'primary'} size="lg" icon="redo" onClick={onPlayAgain}>Play again</UxButton>;

  return (
    <div className="ux-stage p4-res-in">
      {levelTitle && !levelUpDone ? (
        <LevelUpOverlay newLevel={result.newLevel!} title={levelTitle.en} titleKr={levelTitle.kr} onDismiss={() => setLevelUpDone(true)} />
      ) : null}
      <h1 className="ux-sr" tabIndex={-1} ref={h1}>{result.score}/{max} on {quiz.title}</h1>

      <div className="p4-pcwrap">
        {passed ? (
          <div className="p4-confetti" aria-hidden="true">
            {pieces.map((p, k) => <i key={k} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }} />)}
          </div>
        ) : null}
        <div className="p4-pcard" data-testid="p4-photocard">
          {/* eslint-disable-next-line @next/next/no-img-element -- the quiz's own cover or group photo, full bleed */}
          {quiz.photo ? <img className="p4-pcard-img" src={quiz.photo} alt="" /> : null}
          <div className="p4-pc-top"><span>KpopQuiz</span><span className="ux-num">Play no. {(quiz.playCount + 1).toLocaleString('en-US')}</span></div>
          <span className="p4-stamp"><span lang="ko">{stamp.kr}</span> {stamp.en}</span>
          <div className="p4-pc-b">
            <div className="p4-k">{quiz.groupName} quiz</div>
            <div className="p4-t">{quiz.title}</div>
            <div className="p4-s" aria-hidden="true">{shown}<small>/{max}</small></div>
            {result.percentile !== null ? <div className="p4-beat">You beat <b>{result.percentile}%</b> of players</div> : null}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- the site mascot sticker */}
        <img className={`p4-msc${pct >= 50 ? ' is-bob' : ''}`} src={pct >= 50 ? '/mascot/mascot-celebrate.png' : '/mascot/mascot-sad.png'} alt="" width={68} height={68} />
      </div>

      <div className="p4-xpline" data-testid="p4-xpline">
        {signedIn === true || claimed ? (
          extras.saved || claimed ? (
            <><Icon name="check" /><span>{result.xpEarned > 0 ? <b>+{result.xpEarned} XP</b> : <b>Saved to your passport</b>}{streakSaved ? ` · streak day ${streakSaved} saved` : ''}</span></>
          ) : <span className="ux-muted">Your score could not be saved this time.</span>
        ) : signedIn === false ? (
          <>
            <span>Save your <b>{result.score}/{max}</b> and start a streak.</span>{' '}
            <button type="button" className="ux-lnk" onClick={() => signIn({ title: `Save your ${result.score}/${max}`, sub: 'Sign in to keep this score, start a streak and join the hall of fame. No password needed.', action: { id: 'p4-save', payload: { quizId: quiz.id } } })}>Sign in to save</button>
          </>
        ) : null}
      </div>
      <StreakBackup signedIn={signedIn === true} />

      <UxStatsRow items={[
        { value: `${pct}%`, label: 'You' },
        { value: quiz.averagePct !== null ? `${quiz.averagePct}%` : '-', label: 'Average' },
        { value: formatDuration(result.timeTaken), label: 'Time' },
      ]} />

      {extras.outcome ? (
        <p className="p4-rankline" data-testid="p4-rankline"><b>{extras.outcome.head}</b>{extras.outcome.tail}</p>
      ) : standing && standing.rank !== null && standing.totalPlayers ? (
        <p className="p4-rankline" data-testid="p4-rankline">
          <b>#{standing.rank.toLocaleString('en-US')}</b> of {standing.totalPlayers.toLocaleString('en-US')} players
          {standing.signedIn && typeof standing.bestScore === 'number' ? <> · your best <b>{standing.bestScore}/{maxScoreFor(result.quizType, standing.total ?? result.totalQuestions)}</b></> : null}
        </p>
      ) : null}

      <div className="p4-resact">
        {good ? [shareBtn, againBtn] : [againBtn, shareBtn]}
        <P4LikePill quizId={quiz.id} initial={quiz.likeCount} />
      </div>

      <section className="ux-sec p4-keep" aria-labelledby="p4-keep-h">
        <SectionHeader id="p4-keep-h" title="Keep playing" icon="play" action={{ href: `/${quiz.groupSlug}-quiz`, label: `All ${quiz.groupName} quizzes` }} />
        {first ? (
          <Link className="p4-nextq" href={`/q/${first.slug}`}>
            <span className="ux-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element -- group photo thumb */}
              {first.photo ? <img src={first.photo} alt="" loading="lazy" /> : <Icon name={QUIZ_TYPE_ICON[first.quizType] ?? 't-classic'} />}
            </span>
            <span className="ux-row-grow">
              <span className="p4-lbl">Next quiz</span>
              <span className="ux-rt">{first.title}</span>
              <span className="ux-rs">{QUIZ_TYPE_LABEL[first.quizType] ?? 'Classic'} · {LEVEL[first.difficulty] ?? first.difficulty} · {formatCount(first.plays)} plays</span>
            </span>
            <span className="p4-go" aria-hidden="true"><Icon name="play" /></span>
          </Link>
        ) : null}
        <div className="ux-rows">
          {rest.map((q) => (
            <Link key={q.slug} className="ux-row" href={`/q/${q.slug}`}>
              <span className="ux-thumb is-glyph"><Icon name={QUIZ_TYPE_ICON[q.quizType] ?? 't-classic'} /></span>
              <span className="ux-row-grow">
                <span className="ux-rt">{q.title}</span>
                <span className="ux-rs">{QUIZ_TYPE_LABEL[q.quizType] ?? 'Classic'} · {LEVEL[q.difficulty] ?? q.difficulty} · {formatCount(q.plays)} plays</span>
              </span>
            </Link>
          ))}
          <Link className="ux-row" href={quiz.playlist ? `/blindtest/group-${quiz.groupSlug}` : '/blindtest'}>
            <span className="ux-thumb is-bt"><Icon name="music" /></span>
            <span className="ux-row-grow">
              <span className="ux-rt">{quiz.playlist ? `${quiz.groupName} blindtest` : 'K-pop blindtest'}</span>
              <span className="ux-rs">{quiz.playlist ? `${quiz.playlist.songs} songs · guess from a ten-second clip` : 'Guess the song from a ten-second clip'}</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="ux-sec">
        <P4Comments quizId={quiz.id} isClues={result.quizType === 'guess_from_clues'} count={quiz.commentCount} chip={`Your score ${chipScore} is shown`} pendingText={pendingText} />
        <div className="p4-report-c"><P4ReportButton quizId={quiz.id} /></div>
      </section>
    </div>
  );
}

const ANON_LIKES_KEY = 'anon_liked_quizzes';
function anonLikes(): string[] {
  try { return JSON.parse(localStorage.getItem(ANON_LIKES_KEY) ?? '[]') as string[]; } catch { return []; }
}
function setAnonLiked(quizId: string, liked: boolean): void {
  try {
    const l = anonLikes().filter((x) => x !== quizId);
    if (liked) l.push(quizId);
    localStorage.setItem(ANON_LIKES_KEY, JSON.stringify(l));
  } catch { /* blocked */ }
}

/** Heart + count. Same GET / POST /api/quiz/[id]/like { action } and the same guest
 *  localStorage key as the EXISTS like-quiz-button.tsx; only the skin is new. */
function P4LikePill({ quizId, initial }: { quizId: string; initial: number }): React.ReactElement {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (anonLikes().includes(quizId)) setLiked(true);
    let cancelled = false;
    fetch(`/api/quiz/${quizId}/like`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { liked: boolean; like_count: number } | null) => {
        if (cancelled || !d) return;
        setCount(d.like_count);
        if (d.liked) setLiked(true);
        else if (!anonLikes().includes(quizId)) setLiked(false);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [quizId]);
  const toggle = async (): Promise<void> => {
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: next ? 'like' : 'unlike' }) });
      const d = res.ok ? ((await res.json()) as { liked?: boolean; like_count?: number }) : null;
      if (!d || typeof d.liked !== 'boolean') {
        if (!res.ok) { setLiked(!next); setCount((c) => Math.max(0, c + (next ? -1 : 1))); }
        else setAnonLiked(quizId, next);
        return;
      }
      setLiked(d.liked);
      if (typeof d.like_count === 'number') setCount(d.like_count);
      setAnonLiked(quizId, d.liked);
    } catch {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="p4-likeb" aria-pressed={liked} aria-label={`Like this quiz, ${count} ${count === 1 ? 'like' : 'likes'}`} onClick={() => { void toggle(); }}>
      <Icon name="heart" /><span className="ux-num">{count.toLocaleString('en-US')}</span>
    </button>
  );
}
