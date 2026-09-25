'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { refreshUxMe } from '@/components/ux-v1/use-ux-me';
import { useShellMode } from '@/components/ux-v1/use-shell-mode';
import { hasPlayedDaily } from '@/lib/daily-played';
import { ALL_PICK, groupPick } from '@/lib/ux-v1/p6/playlists';

import { BtGame } from './game';
import { HubCtx } from './hub-context';
import { BtResults } from './results';
import { useBlindtestRun } from './use-run';

import type { HubApi } from './hub-context';
import type { BoardResponse } from '@/lib/ux-v1/p6/board-types';
import type { BtGroup, BtPick } from '@/lib/ux-v1/p6/playlists';

interface Props {
  groups: BtGroup[];
  songs: number;
  /** The server-rendered hub (hero, ways to play, board, play by group, FAQ). */
  children: React.ReactNode;
}

const IN_GAME = new Set(['tap', 'loading', 'playing', 'reveal']);

/**
 * The v11 blindtest hub's client controller. The hub itself is server-rendered
 * (the SEO page: H1, intro, links, FAQ and JSON-LD are in the HTML); this wraps
 * it, owns the run, and swaps the hub for the game (focus mode, 16.5) and then
 * the results, all on /blindtest like the live game.
 */
export function BtHubController({ groups, songs, children }: Props): React.ReactElement {
  const announce = useAnnounce();
  const toast = useUxToast();
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [pick, setPick] = useState<BtPick>(ALL_PICK);
  const [rounds, setRounds] = useState(10);
  const [localPlayed, setLocalPlayed] = useState(false);
  const [scrollTo, setScrollTo] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/ux-v1/p6/board', { credentials: 'include', cache: 'no-store' });
      if (res.ok) setBoard((await res.json()) as BoardResponse);
    } catch {
      // the board is a nice-to-have; the hub stands without it
    }
  }, []);

  const onDailySaved = useCallback(() => {
    setLocalPlayed(true);
    void loadBoard();
    // After any daily: the streak pill, popover and greeting read the saved state (16.7).
    refreshUxMe();
  }, [loadBoard]);

  const run = useBlindtestRun({ announce, onDailySaved });
  const inGame = IN_GAME.has(run.phase);
  useShellMode(inGame ? 'focus' : null);

  useEffect(() => { void loadBoard(); }, [loadBoard]);
  useEffect(() => { setLocalPlayed(hasPlayedDaily('blindtest')); }, [run.phase]);

  const playedToday = localPlayed || Boolean(board?.me?.played);

  const showBoard = useCallback((why?: string) => {
    if (run.phase !== 'idle') run.quit();
    setScrollTo('bt-board');
    if (why) toast(why);
  }, [run, toast]);

  const playDaily = useCallback(() => {
    if (playedToday) {
      const me = board?.me;
      showBoard(me?.played && me.score !== null
        ? `One try per day. Your ${me.score}/10 is on today's board.`
        : 'One try per day. See how you rank on today\'s board.');
      return;
    }
    void run.startDaily();
  }, [board, playedToday, run, showBoard]);

  // Deep link from home and the leaderboard: /blindtest?daily=true (no user gesture
  // yet, so the game opens in the "Tap to play the clip" state).
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current) return;
    deepLinked.current = true;
    if (new URLSearchParams(window.location.search).get('daily') !== 'true') return;
    if (hasPlayedDaily('blindtest')) { showBoard('One try per day. See how you rank on today\'s board.'); return; }
    run.prepareDaily();
  }, [run, showBoard]);

  // Back on the hub: scroll to what the action asked for (today's board).
  useEffect(() => {
    if (!scrollTo || run.phase !== 'idle') return;
    const t = window.setTimeout(() => {
      document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollTo(null);
    }, 60);
    return () => window.clearTimeout(t);
  }, [scrollTo, run.phase]);

  // Leaving the game or the results returns to the top of the hub.
  const lastPhase = useRef(run.phase);
  useEffect(() => {
    if (lastPhase.current !== run.phase && (run.phase === 'results' || (run.phase === 'idle' && !scrollTo))) window.scrollTo({ top: 0 });
    lastPhase.current = run.phase;
  }, [run.phase, scrollTo]);

  const api = useMemo<HubApi>(() => ({
    run,
    groups,
    songs,
    pick,
    setPick,
    rounds,
    setRounds,
    board,
    playedToday,
    startSelected: () => { void run.startFree(pick, rounds); },
    startGroup: (g: BtGroup) => { const p = groupPick(g); setPick(p); void run.startFree(p, 10); },
    playDaily,
  }), [board, groups, pick, playDaily, playedToday, rounds, run, songs]);

  let body: React.ReactNode;
  if (inGame) body = <BtGame run={run} />;
  else if (run.phase === 'results') {
    body = (
      <BtResults
        run={run}
        board={board}
        onAgain={() => { void run.startFree(run.pick, run.count); }}
        onBoard={() => showBoard()}
      />
    );
  } else body = <div className="ux-wrap ux-pg p6-hub">{children}</div>;

  return <HubCtx value={api}>{body}</HubCtx>;
}
