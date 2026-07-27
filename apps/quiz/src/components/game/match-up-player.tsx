'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ResultLoop } from '@/components/result/result-loop';
import { useSignedIn } from '@/lib/use-signed-in';
import { completeDaily } from '@/lib/daily-played';
import { analytics, isDailyLaunch } from '@/lib/analytics';
import type { MatchUpPair, MatchUpPlaylist } from '@/lib/games/match-up';

// Workstream V2 - the "Match-Up" engine. Two columns of tiles; tap one from each
// side to pair them. Correct locks both green; wrong shakes both and adds a small
// time penalty. The timer counts UP and the finish time (real seconds + penalty)
// is the score. Each run samples `round` pairs from the baked pool, so the board
// is different every time.
//
// House contract: pure client state (no submitPlay / DB write); the only write is
// completeDaily('game') on a ?daily=game launch. analytics game_start on start,
// game_complete from a phase->result effect. ResultLoop owns what-happens-next.

type Phase = 'start' | 'playing' | 'result';
type Side = 'left' | 'right';
interface Tile { id: string; label: string; }

const PENALTY_SECONDS = 3; // added to the finish time per wrong pair

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MatchUpPlayer({
  playlist,
  pool,
}: {
  playlist: MatchUpPlaylist;
  pool: MatchUpPair[];
}): React.ReactElement {
  const signedIn = useSignedIn();
  const roundSize = Math.min(playlist.round, pool.length);

  const [phase, setPhase] = useState<Phase>('start');
  const [round, setRound] = useState<MatchUpPair[]>([]);
  const [leftTiles, setLeftTiles] = useState<Tile[]>([]);
  const [rightTiles, setRightTiles] = useState<Tile[]>([]);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [selRight, setSelRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const startedAt = useRef(0);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'result') {
      // Score = pairs matched (all of them); finish time is the real measure.
      analytics.gameComplete('match-up', matched.size, round.length, isDailyLaunch());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => () => { if (wrongTimer.current) clearTimeout(wrongTimer.current); }, []);

  const finishTime = elapsed + penalty;
  const total = round.length; // actual pairs this round (after distinct sampling)

  const begin = useCallback(() => {
    // Sample distinct pairs: no repeated tile label on either side within a
    // round. Keeps matching unambiguous when a pool can share fragments (title
    // halves) or map many entries to one target (idols -> group).
    const picked: MatchUpPair[] = [];
    const usedL = new Set<string>();
    const usedR = new Set<string>();
    for (const p of shuffle(pool)) {
      if (usedL.has(p.left) || usedR.has(p.right)) continue;
      picked.push(p);
      usedL.add(p.left);
      usedR.add(p.right);
      if (picked.length === roundSize) break;
    }
    setRound(picked);
    setLeftTiles(shuffle(picked.map((p) => ({ id: p.id, label: p.left }))));
    setRightTiles(shuffle(picked.map((p) => ({ id: p.id, label: p.right }))));
    setMatched(new Set());
    setSelLeft(null);
    setSelRight(null);
    setWrong(null);
    setMistakes(0);
    setPenalty(0);
    setElapsed(0);
    startedAt.current = Date.now();
    analytics.gameStart('match-up', isDailyLaunch());
    setPhase('playing');
  }, [pool, roundSize]);

  const endGame = useCallback(() => {
    // Snap the final time to the wall clock so the score is exact, not up to a
    // second stale from the last display tick. Wall-clock timing also makes the
    // result device-independent (no reliance on interval/frame cadence).
    setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daily') === 'game') {
      void completeDaily('game');
    }
    setPhase('result');
  }, []);

  const evaluate = useCallback(
    (l: string, r: string) => {
      if (l === r) {
        const next = new Set(matched);
        next.add(l);
        setMatched(next);
        setSelLeft(null);
        setSelRight(null);
        if (next.size === round.length) setTimeout(() => endGame(), 250);
      } else {
        setMistakes((m) => m + 1);
        setPenalty((p) => p + PENALTY_SECONDS);
        setWrong({ left: l, right: r });
        if (wrongTimer.current) clearTimeout(wrongTimer.current);
        wrongTimer.current = setTimeout(() => {
          setWrong(null);
          setSelLeft(null);
          setSelRight(null);
        }, reducedMotion ? 220 : 480);
      }
    },
    [matched, round.length, endGame, reducedMotion],
  );

  const pick = useCallback(
    (side: Side, id: string) => {
      if (matched.has(id) || wrong) return;
      if (side === 'left') {
        if (selRight != null) evaluate(id, selRight);
        else setSelLeft((cur) => (cur === id ? null : id));
      } else {
        if (selLeft != null) evaluate(selLeft, id);
        else setSelRight((cur) => (cur === id ? null : id));
      }
    },
    [matched, wrong, selLeft, selRight, evaluate],
  );

  const tileClass = (side: Side, id: string): string => {
    const sel = side === 'left' ? selLeft === id : selRight === id;
    const isWrong = wrong && (side === 'left' ? wrong.left === id : wrong.right === id);
    return [
      'mu-tile',
      matched.has(id) ? 'mu-matched' : '',
      sel ? 'mu-sel' : '',
      isWrong ? 'mu-wrong' : '',
      reducedMotion ? 'mu-rm' : '',
    ].filter(Boolean).join(' ');
  };

  // ---- START ----
  if (phase === 'start') {
    return (
      <div className="mu-wrap">
        <Link href="/games" className="mu-back">{'←'} Back to Games</Link>
        <div className="mu-intro">
          <span className="mu-eyebrow">Match-Up</span>
          <h2 className="mu-title">{playlist.title}</h2>
          <p className="mu-blurb">{playlist.blurb}</p>
          <div className="mu-meta">{roundSize} pairs {'·'} tap one from each side {'·'} beat the clock</div>
          <button type="button" className="btn-primary mu-start" onClick={begin}>Start matching</button>
        </div>
      </div>
    );
  }

  // ---- RESULT ----
  if (phase === 'result') {
    return (
      <div className="mu-wrap">
        <div className="mu-result">
          <span className="mu-eyebrow">{playlist.title}</span>
          <div className="mu-score">{fmtTime(finishTime)}</div>
          <div className="mu-result-stats">
            <div><strong>{total}</strong><span>matched</span></div>
            <div><strong>{mistakes}</strong><span>mistakes</span></div>
            <div><strong>{penalty}s</strong><span>penalty</span></div>
          </div>

          <div className="mu-review">
            <p className="mu-review-h">The pairs</p>
            <ul className="mu-review-list">
              {round.map((p) => (
                <li key={p.id}>
                  <span className="mu-review-l">{p.left}</span>
                  <span className="mu-review-arrow" aria-hidden="true">{'→'}</span>
                  <span className="mu-review-r">{p.right}</span>
                </li>
              ))}
            </ul>
          </div>

          <ResultLoop
            game="match-up"
            scoreLabel={`${fmtTime(finishTime)} with ${mistakes} mistakes`}
            shareText={`I matched ${total} K-pop pairs in ${fmtTime(finishTime)} (${mistakes} mistakes) on "${playlist.title}". Beat me?`}
            shareUrl={`/games/match-up/${playlist.slug}`}
            onPlayAgain={begin}
            playAgainLabel="Match again"
            isSignedIn={signedIn !== false}
          />
        </div>
      </div>
    );
  }

  // ---- PLAYING ----
  return (
    <div className="mu-wrap">
      <div className="mu-hud">
        <span className="mu-hud-count">{matched.size}<span>/{total}</span></span>
        <span className="mu-hud-time">{fmtTime(finishTime)}</span>
        <span className="mu-hud-miss">{mistakes} miss</span>
      </div>
      <div className="sr-only" aria-live="polite" role="status">
        {`${matched.size} of ${total} matched, ${mistakes} mistakes.`}
      </div>

      <div className="mu-board">
        <div className="mu-col">
          <p className="mu-col-h">{playlist.leftLabel}</p>
          {leftTiles.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tileClass('left', t.id)}
              onClick={() => pick('left', t.id)}
              disabled={matched.has(t.id)}
              aria-pressed={selLeft === t.id}
              aria-label={`${playlist.leftLabel}: ${t.label}${matched.has(t.id) ? ', matched' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mu-col">
          <p className="mu-col-h">{playlist.rightLabel}</p>
          {rightTiles.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tileClass('right', t.id)}
              onClick={() => pick('right', t.id)}
              disabled={matched.has(t.id)}
              aria-pressed={selRight === t.id}
              aria-label={`${playlist.rightLabel}: ${t.label}${matched.has(t.id) ? ', matched' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
