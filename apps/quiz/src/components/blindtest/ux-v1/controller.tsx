'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { refreshUxMe } from '@/components/ux-v1/use-ux-me';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { useShellMode } from '@/components/ux-v1/use-shell-mode';
import { hasPlayedDaily } from '@/lib/daily-played';
import { challengeOutcome, CODE_RE } from '@/lib/ux-v1/p6/challenge';
import { ALL_PICK, groupPick } from '@/lib/ux-v1/p6/playlists';

import { BtChallengeLink } from './challenge-link';
import { BtGame } from './game';
import { HubCtx } from './hub-context';
import { BtResults } from './results';
import { useBlindtestRun } from './use-run';

import type { HubApi } from './hub-context';
import type { BoardResponse } from '@/lib/ux-v1/p6/board-types';
import type { ChallengeView } from '@/lib/ux-v1/p6/challenge';
import type { BtGroup, BtPick } from '@/lib/ux-v1/p6/playlists';

interface Props {
  groups: BtGroup[];
  songs: number;
  /** The server-rendered hub (hero, ways to play, board, play by group, FAQ). */
  children: React.ReactNode;
}

const IN_GAME = new Set(['tap', 'loading', 'playing', 'reveal']);

// "Played today" in this browser (lib/daily-played.ts, localStorage), as an
// external store: re-read on storage events and after a daily is saved here.
const PLAYED_EVT = 'p6:daily-played';
function subscribePlayed(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  window.addEventListener(PLAYED_EVT, cb);
  return () => { window.removeEventListener('storage', cb); window.removeEventListener(PLAYED_EVT, cb); };
}

async function fetchBoard(): Promise<BoardResponse | null> {
  try {
    const res = await fetch('/api/ux-v1/p6/board', { credentials: 'include', cache: 'no-store' });
    return res.ok ? ((await res.json()) as BoardResponse) : null;
  } catch {
    return null; // the board is a nice-to-have; the hub stands without it
  }
}
const PLAYED_TOAST = 'One try per day. See how you rank on today\'s board.';

/**
 * The v11 blindtest hub's client controller. The hub itself is server-rendered
 * (the SEO page: H1, intro, links, FAQ and JSON-LD are in the HTML); this wraps
 * it, owns the run, and swaps the hub for the game (focus mode, 16.5) and then
 * the results, all on /blindtest like the live game. Deep links: ?daily=true
 * (today's blindtest) and ?c=<code> (a friend's challenge) open the game in the
 * "Tap to play the clip" state, since audio needs a tap.
 */
export function BtHubController({ groups, songs, children }: Props): React.ReactElement {
  const announce = useAnnounce();
  const toast = useUxToast();
  const live = useIsClient();
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [pick, setPick] = useState<BtPick>(ALL_PICK);
  const [rounds, setRounds] = useState(10);
  const [boardTick, setBoardTick] = useState(0);
  const localPlayed = useSyncExternalStore(subscribePlayed, () => hasPlayedDaily('blindtest'), () => false);
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeView | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchBoard().then((b) => { if (alive && b) setBoard(b); });
    return () => { alive = false; };
  }, [boardTick]);

  const onDailySaved = useCallback(() => {
    window.dispatchEvent(new Event(PLAYED_EVT));
    setBoardTick((t) => t + 1);
    // After any daily: the streak pill, popover and greeting read the saved state (16.7).
    refreshUxMe();
  }, []);

  const run = useBlindtestRun({ announce, onDailySaved });
  const inGame = IN_GAME.has(run.phase);
  useShellMode(inGame ? 'focus' : null);

  const playedToday = localPlayed || Boolean(board?.me?.played);

  const showBoard = useCallback((why?: string) => {
    if (run.phase !== 'idle') run.quit();
    setScrollTo('bt-board');
    if (why) toast(why);
  }, [run, toast]);

  const playDaily = useCallback(() => {
    if (playedToday) {
      const me = board?.me;
      showBoard(me?.played && me.score !== null ? `One try per day. Your ${me.score}/10 is on today's board.` : PLAYED_TOAST);
      return;
    }
    setChallenge(null);
    void run.startDaily();
  }, [board, playedToday, run, showBoard]);

  const challengePick = (v: ChallengeView): BtPick => ({ playlist: v.playlist, label: v.label });
  const startChallenge = useCallback((v: ChallengeView) => {
    run.startChallenge(v.questions, { playlist: v.playlist, label: v.label });
  }, [run]);

  // Deep links (once, on mount).
  const deepLinked = useRef(false);
  useEffect(() => {
    // In a timer so the state it sets is not set in the effect body; the ref keeps
    // it to one run (Strict Mode mounts twice, deps change every render).
    const t = window.setTimeout(() => {
      if (deepLinked.current) return;
      deepLinked.current = true;
      openDeepLink();
    }, 0);
    return () => window.clearTimeout(t);
    function openDeepLink(): void {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('c') ?? '').toUpperCase();
    if (code) {
      // Drop ?c= so a refresh after the run does not reopen the challenge.
      window.history.replaceState(null, '', '/blindtest');
      if (!CODE_RE.test(code)) { toast('This challenge link does not exist.'); return; }
      void (async () => {
        try {
          const res = await fetch(`/api/ux-v1/p6/challenge/${code}`, { cache: 'no-store' });
          if (res.status === 404) { toast('This challenge link does not exist.'); return; }
          if (!res.ok) { toast('Could not open this challenge. Try again later.'); return; }
          const v = (await res.json()) as ChallengeView;
          if (v.expired || !v.questions.length) { toast('This challenge link has expired. Play a new run instead.'); return; }
          setChallenge(v);
          run.prepareChallenge(challengePick(v), v.questions.length);
        } catch {
          toast('Could not open this challenge. Try again later.');
        }
      })();
      return;
    }
    if (params.get('daily') !== 'true') return;
    if (hasPlayedDaily('blindtest')) { showBoard(PLAYED_TOAST); return; }
    run.prepareDaily();
    }
  }, [run, showBoard, toast]);

  // A finished challenge run is one attempt (POST .../attempt), recorded once per run.
  const attemptFor = useRef<string | null>(null);
  useEffect(() => {
    if (run.phase !== 'results' || run.mode !== 'challenge' || !challenge) return;
    const key = `${challenge.code}:${run.answers.length}:${run.summary.points}:${run.answers.reduce((s, a) => s + a.time_ms, 0)}`;
    if (attemptFor.current === key) return;
    attemptFor.current = key;
    void fetch(`/api/ux-v1/p6/challenge/${challenge.code}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: run.summary.correct,
        total: run.questions.length,
        points: run.summary.points,
        timeMs: run.answers.reduce((s, a) => s + a.time_ms, 0),
        bestCombo: run.summary.bestStreak,
      }),
    }).catch(() => {});
  }, [challenge, run]);

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

  const api: HubApi = {
    run,
    groups,
    songs,
    pick,
    setPick,
    rounds,
    setRounds,
    board,
    playedToday,
    startSelected: () => { setChallenge(null); void run.startFree(pick, rounds); },
    startGroup: (g: BtGroup) => { const p = groupPick(g); setPick(p); setChallenge(null); void run.startFree(p, 10); },
    playDaily,
  };

  const inChallenge = run.mode === 'challenge' && challenge !== null;
  let body: React.ReactNode;
  if (inGame) {
    body = (
      <BtGame
        run={run}
        chip={inChallenge ? `Beat ${challenge.creatorName}: ${challenge.creatorScore}/${challenge.creatorTotal}` : undefined}
        intro={inChallenge ? { title: `${challenge.creatorName} scored ${challenge.creatorScore}/${challenge.creatorTotal}. Your turn.`, state: `${challenge.label} · ${challenge.questions.length} songs, the same ones` } : undefined}
        onTap={inChallenge ? () => startChallenge(challenge) : undefined}
      />
    );
  } else if (run.phase === 'results') {
    const outcome = inChallenge ? challengeOutcome(run.summary.correct, challenge) : null;
    body = (
      <BtResults
        run={run}
        board={board}
        onAgain={() => { if (inChallenge) startChallenge(challenge); else void run.startFree(run.pick, run.count); }}
        onBoard={() => showBoard()}
        slot={outcome ? <p className="p6-outcome"><b>{outcome.head}</b>{outcome.tail}</p> : undefined}
        challenge={run.mode === 'free' ? <BtChallengeLink run={run} /> : undefined}
      />
    );
  } else body = <div className="ux-wrap ux-pg p6-hub" data-live={live || undefined}>{children}</div>;

  return <HubCtx value={api}>{body}</HubCtx>;
}
