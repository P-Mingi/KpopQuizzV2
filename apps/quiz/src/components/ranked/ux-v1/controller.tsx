'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { BtGame } from '@/components/blindtest/ux-v1/game';
import { BtResults } from '@/components/blindtest/ux-v1/results';
import { BtChallengeLink } from '@/components/blindtest/ux-v1/challenge-link';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { useShellMode } from '@/components/ux-v1/use-shell-mode';
import { UxButton } from '@/components/ux-v1/button';
import { ALL_PICK } from '@/lib/ux-v1/p6/playlists';

import { RankedApiError, rankedApi } from './api';
import { RankedImpact } from './impact';
import { useRankedRun } from './use-ranked-run';

import type { RankedRunApi } from './use-ranked-run';
import type { SeasonCard } from '@/lib/ranked/service';
import type { LadderScope, LadderView } from '@/lib/ranked/view';

// The ranked page's client controller (prototype #ranked, #btplay, #btend-ranked).
// The page itself is server-rendered around it (crumb, tiers, how ranked works,
// rewards); this reads the real engine through /api/ranked/me and
// /api/ranked/ladder, owns the ranked run, and swaps the page for P6's game view
// (focus mode) and then P6's results with the season impact block in its slot.
// While the pending migration is not applied every call answers 503 not_live and
// the card says so; nothing is invented.

export type RankedStatus = 'loading' | 'not_live' | 'error' | 'live';

export interface LadderState {
  status: 'loading' | 'ready' | 'error';
  view: LadderView | null;
}

export interface RankedApi {
  status: RankedStatus;
  card: SeasonCard | null;
  scope: LadderScope;
  setScope: (s: LadderScope) => void;
  ladder: LadderState;
  /** Start a ranked run (inside the tap), or ask a guest to sign in. */
  play: () => void;
  /** A start is in flight (the button shows busy). */
  starting: boolean;
  signIn: () => void;
  retry: () => void;
}

export const RankedCtx = createContext<RankedApi | null>(null);

export function useRanked(): RankedApi | null {
  return useContext(RankedCtx);
}

const IN_GAME = new Set(['tap', 'loading', 'playing', 'reveal']);

const REFUSED: Record<string, string> = {
  daily_limit: 'No ranked runs left today. They come back at midnight UTC.',
  run_in_progress: 'A ranked run is already open. Finish it or wait a minute.',
};

export function RankedController({ children }: { children: React.ReactNode }): React.ReactElement {
  const toast = useUxToast();
  const announce = useAnnounce();
  const askSignIn = useSignIn();
  const [status, setStatus] = useState<RankedStatus>('loading');
  const [card, setCard] = useState<SeasonCard | null>(null);
  const [scope, setScopeState] = useState<LadderScope>('global');
  const [ladders, setLadders] = useState<Partial<Record<LadderScope, LadderState>>>({});
  const [tick, setTick] = useState(0);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // The season card (and whether ranked is live at all).
  useEffect(() => {
    let on = true;
    rankedApi.me()
      .then((c) => { if (on) { setCard(c); setStatus('live'); } })
      .catch((e: unknown) => { if (on) setStatus(e instanceof RankedApiError && e.code === 'not_live' ? 'not_live' : 'error'); });
    return () => { on = false; };
  }, [tick]);

  // The ladder of the selected scope (once ranked is live). A scope with no answer
  // yet reads as loading; a refresh keeps the rows on screen until the new answer.
  useEffect(() => {
    if (status !== 'live') return;
    let on = true;
    rankedApi.ladder(scope)
      .then((v) => { if (on) setLadders((m) => ({ ...m, [scope]: { status: 'ready', view: v } })); })
      .catch(() => { if (on) setLadders((m) => ({ ...m, [scope]: { status: 'error', view: m[scope]?.view ?? null } })); });
    return () => { on = false; };
  }, [status, scope, tick]);

  const refresh = useCallback(() => { if (alive.current) setTick((t) => t + 1); }, []);

  const signIn = useCallback(() => {
    askSignIn({
      title: 'Sign in to play ranked',
      sub: 'Your runs, your tier and your place on the ladder are saved to your account. No password needed.',
      returnTo: '/blindtest/ranked',
    });
  }, [askSignIn]);

  const onRefused = useCallback((e: RankedApiError) => {
    if (e.code === 'sign_in_required') { signIn(); return; }
    if (e.code === 'not_live') { setStatus('not_live'); return; }
    toast(REFUSED[e.code] ?? 'Could not start a ranked run. Try again.');
    refresh();
  }, [refresh, signIn, toast]);

  const onClosedEarly = useCallback((message: string) => { toast(message); }, [toast]);

  const run: RankedRunApi = useRankedRun({ announce, onClosedEarly, onRecorded: refresh, onRefused });
  const inGame = IN_GAME.has(run.phase);
  useShellMode(inGame ? 'focus' : null);

  const [starting, setStarting] = useState(false);
  const play = useCallback(() => {
    if (status !== 'live' || !card) return;
    if (!card.signedIn) { signIn(); return; }
    if (starting) return;
    setStarting(true);
    void run.startRanked().finally(() => { if (alive.current) setStarting(false); });
  }, [card, run, signIn, starting, status]);

  const setScope = useCallback((s: LadderScope) => {
    if (s !== 'global' && card && !card.signedIn) { signIn(); return; }
    setScopeState(s);
  }, [card, signIn]);

  // Leaving the game or the results goes back to the top of the page.
  const lastPhase = useRef(run.phase);
  useEffect(() => {
    if (lastPhase.current !== run.phase && (run.phase === 'results' || run.phase === 'idle')) window.scrollTo({ top: 0 });
    lastPhase.current = run.phase;
  }, [run.phase]);

  const api = useMemo<RankedApi>(() => ({
    status,
    card,
    scope,
    setScope,
    ladder: ladders[scope] ?? { status: 'loading', view: null },
    play,
    starting,
    signIn,
    retry: () => { setStatus('loading'); refresh(); },
  }), [card, ladders, play, refresh, scope, setScope, signIn, starting, status]);

  let body: React.ReactNode;
  if (inGame) {
    body = <BtGame run={run} />;
  } else if (run.phase === 'results') {
    const season = run.issued?.season.id ?? card?.season.id ?? null;
    // Runs left after this one (the issue response counted it).
    const runsLeft = run.issued?.runsLeft ?? null;
    body = (
      <BtResults
        run={run}
        board={null}
        onAgain={play}
        onBoard={() => run.quit()}
        kicker={season !== null ? `Ranked run · Season ${season}` : 'Ranked run'}
        slot={<RankedImpact submit={run.submit} />}
        primary={runsLeft === 0
          ? <UxButton size="lg" icon="arrow" onClick={() => run.quit()}>Back to ranked</UxButton>
          : <UxButton size="lg" icon="play" onClick={play} disabled={starting} aria-busy={starting || undefined}>Play another ranked run</UxButton>}
        challenge={<BtChallengeLink run={{ ...run, pick: ALL_PICK }} />}
      />
    );
  } else {
    body = <div className="ux-col ux-pg p7-body" data-live={status}>{children}</div>;
  }

  return <RankedCtx value={api}>{body}</RankedCtx>;
}
