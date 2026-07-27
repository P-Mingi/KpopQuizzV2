'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ResultLoop } from '@/components/result/result-loop';
import { useSignedIn } from '@/lib/use-signed-in';
import { completeDaily } from '@/lib/daily-played';
import { analytics, isDailyLaunch } from '@/lib/analytics';
import { findMatch, formatTimer, getScoreLabel } from '@/lib/name-all-utils';
import type { NameAllMember } from '@/lib/db/types';
import type { NameThemAllItem, NameThemAllPlaylist } from '@/lib/games/name-them-all';

// Workstream V3 - "Name Them All". Type-with-timer over any real dataset, built
// on the SHARED name-all core (findMatch / formatTimer / getScoreLabel in
// lib/name-all-utils.ts). The member game keeps its own player untouched; this
// reuses the matching brain and adds a blank-grid reveal for the group datasets.
//
// House contract: pure client state (no submitPlay / DB write); completeDaily
// ('game') on ?daily=game is the only write. analytics game_start on start,
// game_complete from a phase->result effect. ResultLoop owns what-happens-next.

type Phase = 'start' | 'playing' | 'result';

export function NameThemAllPlayer({
  playlist,
  items,
}: {
  playlist: NameThemAllPlaylist;
  items: NameThemAllItem[];
}): React.ReactElement {
  const signedIn = useSignedIn();
  const total = items.length;

  // Stable alphabetical cell order so a found answer fills a fixed slot.
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  const [phase, setPhase] = useState<Phase>('start');
  const [found, setFound] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false); // give-up shows all
  const [timeLeft, setTimeLeft] = useState(playlist.timerSeconds);
  const [inputValue, setInputValue] = useState('');
  const [lastFound, setLastFound] = useState<string | null>(null);

  const foundRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('daily') === 'game') {
      void completeDaily('game');
    }
    setPhase('result');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => endGame(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, endGame]);

  // Fire game_complete from the phase change (found is settled by then).
  useEffect(() => {
    if (phase === 'result') analytics.gameComplete('name-them-all', found.size, total, isDailyLaunch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = useCallback(() => {
    setFound(new Set());
    foundRef.current = new Set();
    setRevealed(false);
    setTimeLeft(playlist.timerSeconds);
    setInputValue('');
    setLastFound(null);
    analytics.gameStart('name-them-all', isDailyLaunch());
    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [playlist.timerSeconds]);

  const onChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (value.trim().length < 2) return;
      // Reuse the shared matcher exactly as the member game does.
      const match = findMatch(value, items as unknown as NameAllMember[], foundRef.current);
      if (match) {
        const next = new Set([...foundRef.current, match.name]);
        setFound(next);
        foundRef.current = next;
        setInputValue('');
        setLastFound(match.name);
        setTimeout(() => setLastFound(null), 1200);
        if (next.size === total) setTimeout(() => endGame(), 400);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
    },
    [items, total, endGame],
  );

  const giveUp = useCallback(() => {
    setRevealed(true);
    endGame();
  }, [endGame]);

  const pct = total > 0 ? Math.round((found.size / total) * 100) : 0;

  // ---- START ----
  if (phase === 'start') {
    return (
      <div className="nta-wrap">
        <Link href="/games" className="nta-back">{'←'} Back to Games</Link>
        <div className="nta-intro">
          <span className="nta-eyebrow">Name Them All</span>
          <h2 className="nta-title">{playlist.title}</h2>
          <p className="nta-blurb">{playlist.blurb}</p>
          <div className="nta-meta">{total} {playlist.itemNoun} {'·'} {formatTimer(playlist.timerSeconds)} on the clock</div>
          <button type="button" className="btn-primary nta-start" onClick={start}>Start naming</button>
        </div>
      </div>
    );
  }

  const playing = phase === 'playing';
  const showAll = phase === 'result';

  return (
    <div className="nta-wrap">
      {playing && (
        <>
          <div className="nta-hud">
            <span className="nta-hud-count">{found.size}<span>/{total}</span></span>
            <span className="nta-hud-time">{formatTimer(timeLeft)}</span>
            <span className="nta-hud-pct">{pct}%</span>
          </div>
          <div className="nta-progress"><span style={{ width: `${pct}%` }} /></div>
          <input
            ref={inputRef}
            type="text"
            className="nta-input"
            value={inputValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Type a ${playlist.categoryHint} name...`}
            aria-label={`Type a ${playlist.categoryHint} name`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <div className="sr-only" aria-live="polite" role="status">
            {lastFound ? `Correct: ${lastFound}. ${found.size} of ${total}.` : ''}
          </div>
          <button type="button" className="nta-giveup" onClick={giveUp}>Give up and reveal</button>
        </>
      )}

      {showAll && (
        <div className="nta-result-head">
          <span className="nta-eyebrow">{playlist.title}</span>
          <div className="nta-score">{found.size}<span className="nta-score-sub">/{total}</span></div>
          <div className="nta-verdict">{getScoreLabel(found.size, total).label} {'·'} {pct}%</div>
        </div>
      )}

      <div className="nta-grid" aria-label={`${playlist.itemNoun} grid`}>
        {sorted.map((item) => {
          const isFound = found.has(item.name);
          const show = isFound || (showAll && revealed) || showAll;
          const missed = showAll && !isFound;
          return (
            <div
              key={item.name}
              className={`nta-cell${isFound ? ' nta-cell-found' : ''}${missed ? ' nta-cell-missed' : ''}${lastFound === item.name && !reducedMotion ? ' nta-cell-pop' : ''}`}
            >
              {show ? item.name : <span className="nta-cell-hint">{playlist.categoryHint}</span>}
            </div>
          );
        })}
      </div>

      {showAll && (
        <ResultLoop
          game="name-them-all"
          score={found.size}
          max={total}
          scoreLabel={`${pct}% named`}
          shareText={`I named ${found.size}/${total} on "${playlist.title}". Can you beat that?`}
          shareUrl={`/games/name-them-all/${playlist.slug}`}
          onPlayAgain={start}
          playAgainLabel="Play again"
          isSignedIn={signedIn !== false}
        />
      )}
    </div>
  );
}
