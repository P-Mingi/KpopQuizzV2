'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { UxIconButton } from '@/components/ux-v1/button';
import { comboLabel, comma } from '@/lib/ux-v1/p6/points';

import { AUTO_NEXT_MS, TIMER_S } from './use-run';

import type { RunApi } from './use-run';

// The blindtest game in day mode (DESIGN-SPEC 16.7, 17.5; prototype #btplay):
// focus mode, a slim game bar (quit, playlist, one segment per song, points +
// combo, replay, sound), the orb (timer ring + equaliser + seconds) that turns
// into the album art in the same space so the answers never move, the round chip,
// the question, four answers with 1-4 keys, then the reveal with the points pop,
// a 3 s auto-next line and Next + Enter. Results are announced in the live region.

const R = 80;
const CIRC = 2 * Math.PI * R;
const KEYS = ['A', 'B', 'C', 'D'] as const;

function useReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setRm(mq.matches);
    const on = (): void => setRm(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return rm;
}

interface BtGameProps {
  run: RunApi;
  /** Challenge runs: "Beat blink_edits: 9/10" instead of the playlist name (16.7). */
  chip?: string | undefined;
  /** Tap-to-play screen (no user gesture yet): the heading and the state line. */
  intro?: { title: string; state: string } | undefined;
  /** What the tap starts (defaults to today's Blindtest of the day). */
  onTap?: (() => void) | undefined;
}

export function BtGame({ run, chip, intro, onTap }: BtGameProps): React.ReactElement {
  const reduced = useReducedMotion();
  const qRef = useRef<HTMLHeadingElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const { phase, questions, index, answers, selected, timeLeft, isPlaying, blocked, muted, summary } = run;
  const q = questions[index];
  const total = questions.length || run.count;
  const answered = phase === 'reveal';
  const last = index >= questions.length - 1;
  const answer = answered ? answers[index] : undefined;
  const correctIdx = q ? q.choices.findIndex((c) => c === q.correct_answer) : -1;
  const round = summary.rounds[index];
  const streakTenths = summary.rounds.length ? summary.rounds[summary.rounds.length - 1]!.tenths : 0;

  // Keys 1-4 answer, Enter goes on (16.7). Buttons keep their own Enter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (phase === 'playing' && /^[1-4]$/.test(e.key)) { e.preventDefault(); run.pickAnswer(Number(e.key) - 1); return; }
      if (phase === 'reveal' && e.key === 'Enter' && t?.tagName !== 'BUTTON' && t?.tagName !== 'A') { e.preventDefault(); run.next(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, run]);

  // Focus: Next after an answer (16.7 "focus to Next"), the question on a new song.
  useEffect(() => {
    if (phase === 'reveal') {
      const t = window.setTimeout(() => nextRef.current?.focus({ preventScroll: true }), 60);
      return () => window.clearTimeout(t);
    }
    if (phase === 'playing') qRef.current?.focus({ preventScroll: true });
    return undefined;
  }, [phase, index]);

  const seconds = Math.max(0, Math.ceil(timeLeft));
  const frac = Math.max(0, timeLeft) / TIMER_S;
  const danger = phase === 'playing' && timeLeft <= 3;
  const artist = q?.question_type === 'artist';

  let stateText = '';
  if (phase === 'tap') stateText = intro?.state ?? 'Blindtest of the day · one try';
  else if (phase === 'loading') stateText = 'Picking your songs';
  else if (answered) stateText = `Song ${index + 1} of ${total}`;
  else stateText = `Song ${index + 1} of ${total} · ${isPlaying ? 'listening' : blocked ? 'tap to play' : 'loading clip'}`;

  const choiceCls = (i: number): string => {
    if (!answered) return 'p6-ans';
    if (i === correctIdx) return 'p6-ans is-ok';
    if (i === selected) return 'p6-ans is-no';
    return 'p6-ans is-rest';
  };

  return (
    <div className="p6-play" data-phase={phase} data-live="1">
      <div className="p6-gbar">
        <div className="ux-stage p6-gbar-in">
          <UxIconButton icon="x" label="Quit blindtest" onClick={run.quit} />
          {chip ? <span className="p6-gt p6-gch">{chip}</span> : <span className="p6-gt">{run.pick.label}</span>}
          <div className="p6-segs" role="img" aria-label={`Song ${Math.min(index + 1, total)} of ${total}, ${summary.correct} right`}>
            {Array.from({ length: total }, (_, i) => {
              const a = answers[i];
              const cls = a ? (a.correct ? 'is-ok' : 'is-no') : !answered && i === index && phase === 'playing' ? 'is-cur' : '';
              return <span key={i} className={cls} />;
            })}
          </div>
          <span className="p6-gscore"><span className="ux-num">{comma(summary.points)}</span> <small>pts</small>{streakTenths > 10 ? <span className="p6-combo ux-num">{comboLabel(streakTenths)}</span> : null}</span>
          <UxIconButton icon="redo" label="Replay the clip" onClick={run.replay} disabled={phase !== 'playing' && phase !== 'reveal'} />
          <UxIconButton icon={muted ? 'mute' : 'vol'} label="Mute the clip" aria-pressed={muted} onClick={run.toggleMute} />
        </div>
      </div>

      <div className="ux-stage p6-play-in">
        <div className="p6-orbw">
          {answered && q ? (
            <div className="p6-reveal" key={`r${index}`}>
              {q.reveal.cover
                // eslint-disable-next-line @next/next/no-img-element -- Deezer album art from the run (any size, any host)
                ? <img className="p6-cv" src={q.reveal.cover} alt={`${q.reveal.title} by ${q.reveal.artist}, cover art`} width={140} height={140} decoding="async" />
                : <span className="p6-cv" role="img" aria-label={`${q.reveal.title} by ${q.reveal.artist}`} />}
              <div className={`p6-vd ${answer?.correct ? 'is-ok' : 'is-no'}`}>
                <Icon name={answer?.correct ? 'check' : 'x'} size="sm" />
                {answer?.correct ? 'Correct' : answer?.picked === null ? 'Time is up' : 'Missed'}
              </div>
              <div className="p6-rv-t">{q.reveal.title}</div>
              <div className="p6-sa">{q.reveal.artist}{q.reveal.album ? ` · ${q.reveal.album}` : ''}</div>
            </div>
          ) : (
            <div className={`p6-orb${danger ? ' is-danger' : ''}`}>
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <circle className="p6-orb-bg" cx="100" cy="100" r={R} />
                <circle className="p6-orb-fg" cx="100" cy="100" r={R} strokeDasharray={CIRC.toFixed(1)} strokeDashoffset={(CIRC * (1 - (phase === 'playing' ? frac : 1))).toFixed(1)} />
              </svg>
              {phase === 'tap' || blocked ? (
                <button type="button" className="p6-tap" onClick={() => { if (phase !== 'tap') run.resume(); else if (onTap) onTap(); else void run.startDaily(); }}>
                  <Icon name="play" size="lg" />
                  <span>Tap to play the clip</span>
                </button>
              ) : (
                <div>
                  <div className={`p6-eq${isPlaying && phase === 'playing' ? ' is-on' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></div>
                  <div className="p6-sec ux-num" role="timer" aria-label={`${seconds} seconds left`}>{phase === 'playing' ? seconds : TIMER_S}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p6-lstate"><i hidden={answered || phase === 'tap' || phase === 'loading'} />{stateText}</div>

        {q && phase !== 'tap' && phase !== 'loading' ? (
          <>
            <div className="p6-rlab"><span className={artist ? 'is-artist' : ''}>{artist ? 'Artist round' : 'Song round'}</span></div>
            <h1 className="p6-btq" tabIndex={-1} ref={qRef}>{artist ? 'Who sings this?' : 'Which song is this?'}</h1>
            <div className="p6-answers" role="group" aria-label="Answers" key={`a${index}`}>
              {q.choices.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={choiceCls(i)}
                  disabled={answered}
                  aria-keyshortcuts={String(i + 1)}
                  onClick={() => run.pickAnswer(i)}
                >
                  <span className="p6-k" aria-hidden="true"><span className="p6-kd">{i + 1}</span><span className="p6-kt">{KEYS[i]}</span></span>
                  <span className="p6-at">{c}</span>
                  <span className="p6-lab">
                    {answered && i === correctIdx ? <><Icon name="check" size="sm" />Correct</> : null}
                    {answered && i === selected && i !== correctIdx ? <><Icon name="x" size="sm" />Your pick</> : null}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <h1 className="p6-btq" tabIndex={-1} ref={qRef}>{phase === 'tap' ? (intro?.title ?? 'Ten songs, the same for everyone.') : 'Getting your songs ready'}</h1>
        )}

        {run.error ? <p className="p6-err" role="alert">{run.error}</p> : null}

        {answered ? (
          <div className="p6-after">
            <div className="p6-autonext" aria-hidden="true"><i key={index} style={{ animationDuration: `${AUTO_NEXT_MS}ms` }} /></div>
            <div className="p6-nxt">
              <span>{last ? 'Results' : 'Next song'} in {Math.round(AUTO_NEXT_MS / 1000)} seconds</span>
              <button type="button" ref={nextRef} className="ux-btn ux-btn-sm p6-next" onClick={run.next}>
                {last ? 'See results' : 'Next'} <kbd className="ux-kbd">Enter</kbd>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {answered && answer?.correct && round && !reduced ? (
        <div className="p6-ptsp" aria-hidden="true" key={`p${index}`}>
          +{round.points}
          <small>speed +{round.speed}{round.tenths > 10 ? ` · ${comboLabel(round.tenths)}` : ''}</small>
        </div>
      ) : null}
    </div>
  );
}
