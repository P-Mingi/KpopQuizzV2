'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { challengeChip } from '@/lib/ux-v1/p4/challenge';
import { getCorrectIndex, getEffectiveOptions, progressMarks, trailingStreak } from '@/lib/ux-v1/p4/engine';

import type { RunState } from '@/lib/ux-v1/p4/engine';
import type { LoadedChallenge, P4RunQuiz } from './run-context';

type GameState = Extract<RunState, { phase: 'playing' | 'answered' }>;

const LETTERS = ['A', 'B', 'C', 'D'] as const;
/** Ring geometry of the prototype (viewBox 72, r 31), drawn at 76px (17.4). */
const R = 31;
const CIRC = 2 * Math.PI * R;

interface GameProps {
  quiz: P4RunQuiz;
  state: GameState;
  challenge: LoadedChallenge | null;
  relaxed: boolean;
  saving: boolean;
  onAnswer: (i: number) => void;
  onRevealClue: () => void;
  onNext: () => void;
  onQuit: () => void;
}

/**
 * The quiz game (DESIGN-SPEC 16.7 "Quiz game", 17.4, prototype #play): game bar
 * (quit, title or the challenge chip, segmented progress, "3 in a row" from 3, score,
 * sound), timer ring 76 with the number alone (warn 8, danger 5; frozen green / red
 * after the answer), question, answers with 1-4 keys (A-D on touch), Correct / Your
 * pick labels, the "Did you know" fact, Next + Enter. Focus moves to the question on
 * each question and to Next after an answer; results are announced by the run.
 */
export function P4Game({ quiz, state, challenge, relaxed, saving, onAnswer, onRevealClue, onNext, onQuit }: GameProps): React.ReactElement {
  const q = state.questions[state.questionIndex];
  const total = state.questions.length;
  const answered = state.phase === 'answered';
  const isLast = state.questionIndex >= total - 1;
  const isClues = state.quizType === 'guess_from_clues' && Boolean(q?.clues?.length);
  const isIntruder = state.quizType === 'intruder';
  const hasTimer = state.settings.timer && !relaxed;
  const timerTotal = state.settings.timer_seconds;

  const [sound, setSound] = useState(true);
  useEffect(() => { setSound(isSoundEnabled()); }, []);
  const toggleSound = (): void => { const on = !sound; setSoundEnabled(on); setSound(on); };

  // the ring keeps the last second it showed after the answer (frozen, no layout shift)
  const lastLeft = useRef(timerTotal);
  if (state.phase === 'playing') lastLeft.current = Math.max(0, state.timeRemaining);
  const left = lastLeft.current;

  const h1 = useRef<HTMLHeadingElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state.phase === 'playing') h1.current?.focus({ preventScroll: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex]);
  useEffect(() => {
    if (!answered) return;
    const t = window.setTimeout(() => {
      nextBtn.current?.focus({ preventScroll: true });
      nextBtn.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 60);
    return () => window.clearTimeout(t);
  }, [answered, state.questionIndex]);

  // keyboard: 1-4 answer, Enter next (16.7)
  const optCount = q ? getEffectiveOptions(q).length : 0;
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('.ux-sheet')) return;
      if (!answered && /^[1-4]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < optCount) { e.preventDefault(); onAnswer(i); }
        return;
      }
      if (answered && e.key === 'Enter' && t?.tagName !== 'BUTTON' && t?.tagName !== 'A') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, optCount, onAnswer, onNext]);

  if (!q) return <div className="ux-stage p4-loading" role="status">Loading your quiz...</div>;

  const marks = progressMarks(state.questions, state.answers);
  const streak = trailingStreak(state.questions, state.answers);
  const correctIdx = getCorrectIndex(q);
  const options = getEffectiveOptions(q);
  const selected = answered ? state.selectedAnswer : null;
  const correctText = typeof options[correctIdx] === 'string' ? options[correctIdx] : (options[correctIdx] as unknown as { label?: string } | undefined)?.label ?? '';
  const fact = q.fun_fact && q.fun_fact.trim() ? q.fun_fact : `The answer is ${correctText}.`;

  let ringCls = 'p4-tring';
  let ringLabel = hasTimer ? `${left} seconds left` : 'No timer';
  if (answered) { ringCls += state.isCorrect ? ' is-ok' : ' is-no'; ringLabel = state.isCorrect ? 'Right answer' : 'Wrong answer'; }
  else if (hasTimer && left <= 5) ringCls += ' is-danger';
  else if (hasTimer && left <= 8) ringCls += ' is-warn';
  const offset = hasTimer && timerTotal > 0 ? CIRC * (1 - left / timerTotal) : 0;

  const stateOf = (i: number): string => {
    if (!answered) return '';
    if (i === correctIdx) return ' is-ok';
    if (i === selected) return ' is-no';
    return ' is-rest';
  };
  const labelOf = (i: number): React.ReactNode => {
    if (!answered) return null;
    if (i === correctIdx) return <><Icon name="check" size="sm" />Correct</>;
    if (i === selected) return <><Icon name="x" size="sm" />Your pick</>;
    return null;
  };

  return (
    <>
      <div className="p4-gbar">
        <div className="ux-stage p4-gbar-in">
          <button type="button" className="ux-ib" onClick={onQuit} aria-label="Quit quiz"><Icon name="x" /></button>
          {challenge
            ? <span className="p4-gch" data-testid="p4-challenge-chip">{challengeChip(challenge)}</span>
            : <span className="p4-gt">{quiz.title}</span>}
          <div className="p4-segs" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={state.questionIndex + 1}>
            {marks.map((m, i) => (
              <span key={i} className={m === 'ok' ? 'is-ok' : m === 'no' ? 'is-no' : (!answered && i === state.questionIndex ? 'is-cur' : '')} />
            ))}
          </div>
          {streak >= 3 ? <span className="p4-inrow" key={streak}><Icon name="flame" />{streak} in a row</span> : null}
          <span className="p4-gscore"><span>{state.score}</span> <small>{state.quizType === 'guess_from_clues' ? 'pts' : 'correct'}</small></span>
          <button type="button" className="ux-ib" onClick={toggleSound} aria-label={sound ? 'Sound on' : 'Sound off'} aria-pressed={!sound}>
            <Icon name={sound ? 'vol' : 'mute'} />
          </button>
        </div>
      </div>

      <div className="ux-stage p4-play-in">
        <div className={ringCls} role="timer" aria-label={ringLabel} data-testid="p4-ring">
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle className="p4-bg" cx="36" cy="36" r={R} />
            <circle key={state.questionIndex} className="p4-fg" cx="36" cy="36" r={R} strokeDasharray={CIRC.toFixed(1)} strokeDashoffset={offset.toFixed(1)} />
          </svg>
          <div className="p4-n" aria-hidden="true">
            {answered
              ? <Icon name={state.isCorrect ? 'check' : 'x'} style={{ strokeWidth: 2.5 }} />
              : hasTimer ? left : <Icon name="clock" style={{ strokeWidth: 2 }} />}
          </div>
        </div>

        <div key={state.questionIndex}>
          <p className="p4-qn">Question {state.questionIndex + 1} of {total}</p>
          {state.quizType === 'image' && q.image_url ? (
            <div className="p4-qimg">
              {/* eslint-disable-next-line @next/next/no-img-element -- creator-supplied question image, any host, shown as is */}
              <img src={q.image_url} alt={q.question} loading="eager" />
            </div>
          ) : null}
          {isClues ? (
            <ul className="p4-clues" aria-label="Clues">
              {q.clues!.slice(0, state.cluesRevealed).map((c, i) => <li key={i}><b>Clue {i + 1}</b>{c}</li>)}
            </ul>
          ) : null}
          <h1 className="p4-qq" tabIndex={-1} ref={h1}>{q.question}</h1>

          {isIntruder ? (
            <div className="p4-igrid" role="group" aria-label="Answers">
              {(q.options as unknown as Array<{ label: string; image_url: string }>).map((o, i) => (
                <button key={i} type="button" className={`p4-ians${stateOf(i)}`} disabled={answered} aria-keyshortcuts={String(i + 1)} onClick={() => onAnswer(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- creator-supplied option image */}
                  <img src={o.image_url} alt="" loading="eager" />
                  <span className="p4-il">
                    <span className="p4-k" aria-hidden="true"><span className="p4-d">{i + 1}</span><span className="p4-t">{LETTERS[i]}</span></span>
                    <span>{o.label}</span>
                    <span className="p4-lab">{labelOf(i)}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p4-answers" role="group" aria-label="Answers">
              {options.map((o, i) => (
                <button key={i} type="button" className={`p4-ans${stateOf(i)}`} disabled={answered} aria-keyshortcuts={String(i + 1)} onClick={() => onAnswer(i)}>
                  <span className="p4-k" aria-hidden="true"><span className="p4-d">{i + 1}</span><span className="p4-t">{LETTERS[i]}</span></span>
                  <span>{o}</span>
                  <span className="p4-lab">{labelOf(i)}</span>
                </button>
              ))}
            </div>
          )}

          {isClues && !answered && state.phase === 'playing' ? (
            <div className="p4-cluebar">
              <span>{Math.max(1, 4 - state.cluesRevealed)} {Math.max(1, 4 - state.cluesRevealed) === 1 ? 'point' : 'points'} if you answer now</span>
              {state.cluesRevealed < (q.clues?.length ?? 0) && state.cluesRevealed < 3
                ? <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={onRevealClue}>{state.cluesRevealed === 1 ? 'Get a clue (-1 point)' : 'Last clue (-1 point)'}</button>
                : <span>No more clues</span>}
            </div>
          ) : null}

          {answered ? (
            <>
              <div className="p4-fact">
                <Icon name="bulb" />
                <div><b>{state.selectedAnswer === null ? 'Time is up. ' : ''}Did you know</b><p>{fact}</p></div>
              </div>
              <div className="p4-nextrow">
                <button type="button" ref={nextBtn} className="ux-btn ux-btn-primary ux-btn-lg" onClick={onNext} disabled={saving} aria-keyshortcuts="Enter">
                  {saving ? 'Saving your score...' : isLast ? 'See your result' : 'Next question'}
                  <kbd className="ux-kbd" aria-hidden="true">Enter</kbd>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
