'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ResultLoop } from '@/components/result/result-loop';
import { isConfiguredImageHost } from '@/lib/image-hosts';
import { useSignedIn } from '@/lib/use-signed-in';
import { completeDaily } from '@/lib/daily-played';
import { analytics, isDailyLaunch } from '@/lib/analytics';
import type { SortItItem, SortItPlaylist } from '@/lib/games/sort-it';

// Workstream V1 - the "Sort It" engine. Binary classification: a shuffled stack
// of real items, two buckets, tap a side / swipe / arrow-key to sort. Speed-run
// feel: the timer counts UP and the finish time is a stat, no countdown pressure.
//
// House contract: results are pure client state (no submitPlay, no DB write) -
// the only write is completeDaily('game') on a daily launch. Analytics fire
// game_start on start and game_complete from a phase->result effect (mirrors the
// name-all stale-`found` fix). ResultLoop owns "what happens next" + share.

type Phase = 'start' | 'playing' | 'result';
type Side = 'left' | 'right';

interface WrongPick {
  label: string;
  correct: Side;
  chosen: Side;
}

const SWIPE_THRESHOLD = 55; // px of horizontal travel that counts as a swipe

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function fmtTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SortItPlayer({
  playlist,
  items,
}: {
  playlist: SortItPlaylist;
  items: SortItItem[];
}): React.ReactElement {
  const signedIn = useSignedIn();
  const total = items.length;

  const [phase, setPhase] = useState<Phase>('start');
  const [deck, setDeck] = useState<SortItItem[]>(() => shuffle(items));
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState<WrongPick[]>([]);
  const [flash, setFlash] = useState<null | 'right' | 'wrong'>(null);
  const [elapsed, setElapsed] = useState(0);
  const [dragX, setDragX] = useState(0);

  const startedAt = useRef(0);
  const dragStart = useRef<number | null>(null);
  const busy = useRef(false); // guards double-fire between swipe-end and click
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Tick the count-up timer once per second while playing.
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Fire game_complete from the phase change, not the choose() handler, so the
  // final score is read after state settles (same reason as name-all).
  useEffect(() => {
    if (phase === 'result') analytics.gameComplete('sort-it', correct, total, isDailyLaunch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const begin = useCallback(() => {
    setDeck(shuffle(items));
    setIdx(0);
    setCorrect(0);
    setWrong([]);
    setFlash(null);
    setElapsed(0);
    setDragX(0);
    busy.current = false;
    startedAt.current = Date.now();
    analytics.gameStart('sort-it', isDailyLaunch());
    setPhase('playing');
  }, [items]);

  const endGame = useCallback(() => {
    setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daily') === 'game') {
      void completeDaily('game');
    }
    setPhase('result');
  }, []);

  const choose = useCallback(
    (side: Side) => {
      if (busy.current || phase !== 'playing') return;
      const card = deck[idx];
      if (!card) return;
      busy.current = true;

      const isRight = card.bucket === side;
      if (isRight) setCorrect((c) => c + 1);
      else setWrong((w) => [...w, { label: card.label, correct: card.bucket, chosen: side }]);

      setFlash(isRight ? 'right' : 'wrong');
      setDragX(0);
      dragStart.current = null;

      const advance = () => {
        setFlash(null);
        const next = idx + 1;
        if (next >= deck.length) endGame();
        else setIdx(next);
        busy.current = false;
      };
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(advance, reducedMotion ? 90 : 260);
    },
    [busy, phase, deck, idx, endGame, reducedMotion],
  );

  // Keyboard: left/right arrows sort, for players who cannot swipe or tap.
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); choose('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); choose('right'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, choose]);

  // Pointer-based swipe (unifies mouse + touch). Tap buttons remain the primary,
  // fully accessible path; swipe is an enhancement.
  const onPointerDown = (e: React.PointerEvent) => {
    if (busy.current) return;
    dragStart.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragX(e.clientX - dragStart.current);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    // Read the delta from the event itself, not the dragX state: state updates
    // batch, so dragX can still be 0 in this handler at release time.
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    setDragX(0);
    if (dx <= -SWIPE_THRESHOLD) choose('left');
    else if (dx >= SWIPE_THRESHOLD) choose('right');
  };

  const card = deck[idx];
  // next/image throws at render for an unconfigured host, which no onError can
  // catch, so guard with the shared host allowlist and fall back to the monogram.
  const cardImg = card && isConfiguredImageHost(card.imageUrl) ? card.imageUrl : null;
  const done = correct + wrong.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const progressPct = total > 0 ? (done / total) * 100 : 0;

  // ---- START ----
  if (phase === 'start') {
    return (
      <div className="si-wrap">
        <Link href="/games" className="si-back">{'←'} Back to Games</Link>
        <div className="si-intro">
          <span className="si-eyebrow">Sort It</span>
          <h2 className="si-title">{playlist.title}</h2>
          <p className="si-blurb">{playlist.blurb}</p>
          <div className="si-meta">{total} to sort {'·'} tap, swipe, or arrow keys</div>
          <div className="si-bucket-preview" aria-hidden="true">
            <span className="si-chip">{playlist.buckets[0]}</span>
            <span className="si-vs">vs</span>
            <span className="si-chip">{playlist.buckets[1]}</span>
          </div>
          <button type="button" className="btn-primary si-start" onClick={begin}>Start sorting</button>
        </div>
      </div>
    );
  }

  // ---- RESULT ----
  if (phase === 'result') {
    return (
      <div className="si-wrap">
        <div className="si-result">
          <span className="si-eyebrow">{playlist.title}</span>
          <div className="si-score">{correct}<span className="si-score-sub">/{total}</span></div>
          <div className="si-result-stats">
            <div><strong>{accuracy}%</strong><span>accuracy</span></div>
            <div><strong>{fmtTime(elapsed)}</strong><span>time</span></div>
            <div><strong>{wrong.length}</strong><span>missed</span></div>
          </div>

          {wrong.length > 0 && (
            <div className="si-review">
              <p className="si-review-h">What you missed</p>
              <ul className="si-review-list">
                {wrong.map((w, i) => (
                  <li key={`${w.label}-${i}`}>
                    <span className="si-review-name">{w.label}</span>
                    <span className="si-review-fix">
                      is a {playlist.buckets[w.correct === 'left' ? 0 : 1]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ResultLoop
            game="sort-it"
            score={correct}
            max={total}
            scoreLabel={`${accuracy}% accuracy`}
            shareText={`I sorted ${correct}/${total} K-pop acts right in ${fmtTime(elapsed)} on "${playlist.title}". Can you beat that?`}
            shareUrl={`/games/sort-it/${playlist.slug}`}
            onPlayAgain={begin}
            playAgainLabel="Sort again"
            isSignedIn={signedIn !== false}
          />
        </div>
      </div>
    );
  }

  // ---- PLAYING ----
  const tilt = reducedMotion ? 0 : Math.max(-12, Math.min(12, dragX / 8));
  return (
    <div className="si-wrap">
      <div className="si-hud">
        <span className="si-hud-count">{done + 1 > total ? total : done + 1}<span>/{total}</span></span>
        <span className="si-hud-time" aria-live="off">{fmtTime(elapsed)}</span>
        <span className="si-hud-score">{correct} right</span>
      </div>
      <div className="si-progress"><span style={{ width: `${progressPct}%` }} /></div>

      <p className="si-question">{playlist.question}</p>

      {/* Screen-reader game state: announces each new card + running score. */}
      <div className="sr-only" aria-live="polite" role="status">
        {card ? `Card ${done + 1} of ${total}: ${card.label}. Score ${correct}.` : ''}
      </div>

      <div className="si-stage">
        {card && (
          <div
            className={`si-card${flash ? ` si-flash-${flash}` : ''}`}
            style={{
              transform: `translateX(${reducedMotion ? 0 : dragX}px) rotate(${tilt}deg)`,
              transition: dragStart.current !== null ? 'none' : undefined,
              touchAction: 'pan-y',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {cardImg ? (
              <Image src={cardImg} alt="" width={72} height={72} className="si-card-img" />
            ) : (
              <span className="si-card-mono" aria-hidden="true">{card.label.charAt(0)}</span>
            )}
            <span className="si-card-label">{card.label}</span>
          </div>
        )}
      </div>

      <div className="si-buckets">
        <button type="button" className="si-bucket" onClick={() => choose('left')} aria-label={`Sort ${card?.label ?? 'item'} as ${playlist.buckets[0]}`}>
          <span className="si-bucket-arrow" aria-hidden="true">{'←'}</span>
          {playlist.buckets[0]}
        </button>
        <button type="button" className="si-bucket" onClick={() => choose('right')} aria-label={`Sort ${card?.label ?? 'item'} as ${playlist.buckets[1]}`}>
          {playlist.buckets[1]}
          <span className="si-bucket-arrow" aria-hidden="true">{'→'}</span>
        </button>
      </div>
    </div>
  );
}
